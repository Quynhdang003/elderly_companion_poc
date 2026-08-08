// components/VoiceChat.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";

// Trạng thái cuộc gọi, map từ status của Dograh Widget
enum CallStatus {
  INACTIVE = "INACTIVE", // chưa gọi
  CONNECTING = "CONNECTING", // đang kết nối
  CONNECTED = "CONNECTED", // đang trong cuộc gọi (2 chiều, Dograh tự xử lý nghe/nói)
  FAILED = "FAILED", // kết nối lỗi
}

// URL script widget lấy từ Dograh Dashboard > Agent Settings > Add to Website
// Nên đưa vào biến môi trường để không hardcode
const DOGRAH_WIDGET_SRC = process.env.NEXT_PUBLIC_DOGRAH_WIDGET_SRC ?? "";

declare global {
  interface Window {
    DograhWidget?: {
      start: () => void;
      end: () => void;
      setContext: (vars: Record<string, unknown>) => void;
      onCallConnected: (cb: (payload: { agentId: string; workflowRunId: string }) => void) => void;
      onCallDisconnected: (cb: (payload: { workflowRunId: string; durationSeconds: number }) => void) => void;
      onCallEnd: (cb: () => void) => void;
      onStatusChange: (cb: (status: string, text?: string, subtext?: string) => void) => void;
      onError: (cb: (err: Error) => void) => void;
    };
  }
}

const VoiceChat = () => {
  const { userId, loading: authLoading } = useAuth();

  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [statusText, setStatusText] = useState<string>("");
  const [supported, setSupported] = useState(true);
  const [widgetReady, setWidgetReady] = useState(false);

  const scriptAppendedRef = useRef(false);
  const starting = useRef(false); // chống double-click khi đang fetch profile + start()

  // 1. Kiểm tra trình duyệt có hỗ trợ mic/WebRTC không
  useEffect(() => {
    const isSecure = window.isSecureContext; // https hoặc localhost
    const hasMic = !!navigator.mediaDevices?.getUserMedia;
    setSupported(isSecure && hasMic);
  }, []);

  // 2. Nạp script widget của Dograh (1 lần duy nhất)
  useEffect(() => {
    if (!DOGRAH_WIDGET_SRC || scriptAppendedRef.current) return;
    if (document.getElementById("dograh-widget")) {
      scriptAppendedRef.current = true;
      return;
    }

    const js = document.createElement("script");
    js.id = "dograh-widget";
    js.src = DOGRAH_WIDGET_SRC;
    js.async = true;
    document.body.appendChild(js);
    scriptAppendedRef.current = true;
  }, []);

  // 3. Chờ window.DograhWidget sẵn sàng rồi đăng ký các callback
  useEffect(() => {
    let retries = 0;
    const wait = setInterval(() => {
      if (window.DograhWidget) {
        clearInterval(wait);
        setWidgetReady(true);

        window.DograhWidget.onStatusChange((status, text) => {
          switch (status) {
            case "connecting":
              setCallStatus(CallStatus.CONNECTING);
              break;
            case "connected":
              setCallStatus(CallStatus.CONNECTED);
              break;
            case "failed":
              setCallStatus(CallStatus.FAILED);
              break;
            default:
              setCallStatus(CallStatus.INACTIVE);
          }
          if (text) setStatusText(text);
        });

        window.DograhWidget.onError((err) => {
          console.error("[Dograh] error:", err.message);
          toast.error("Không kết nối được cuộc gọi, thử lại nhé.");
          setCallStatus(CallStatus.INACTIVE);
          starting.current = false;
        });

        window.DograhWidget.onCallEnd(() => {
          setCallStatus(CallStatus.INACTIVE);
          setStatusText("");
          starting.current = false;
        });
      } else if (retries++ > 50) {
        clearInterval(wait);
      }
    }, 100);

    return () => clearInterval(wait);
  }, []);

  // Reset khi đổi user (đăng xuất/đăng nhập tài khoản khác)
  useEffect(() => {
    if (callStatus !== CallStatus.INACTIVE) {
      window.DograhWidget?.end();
    }
    setCallStatus(CallStatus.INACTIVE);
    setStatusText("");
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bắt đầu cuộc gọi: fetch hồ sơ người già -> nạp context -> start()
  const handleStartCall = async () => {
    if (!userId || starting.current || !widgetReady) return;
    starting.current = true;

    try {
      const res = await fetch(`/api/vapi/generate?userId=${userId}`);
      const { success, data, error } = await res.json();

      if (!success) {
        toast.error(error ?? "Không lấy được hồ sơ, thử lại nhé.");
        starting.current = false;
        return;
      }

      window.DograhWidget?.setContext({
        userId,
        name: data.name,
        age: data.age,
        personality: data.personality,
        mood: data.mood,
        healthNotes: data.healthNotes,
        familyMembers: data.familyMembers,
        notes: data.notes,
        hobbies: (data.hobbies ?? []).join(", "),
        favoriteTopics: (data.favoriteTopics ?? []).join(", "),
      });

      window.DograhWidget?.start();
    } catch (err) {
      console.error(err);
      toast.error("Không kết nối được, thử lại nhé.");
      starting.current = false;
    }
  };

  const handleEndCall = () => {
    window.DograhWidget?.end();
  };

  if (authLoading) return <p className="text-center">Đang tải...</p>;
  if (!userId) return <p className="text-center">Vui lòng đăng nhập để trò chuyện.</p>;
  if (!supported) {
    return (
      <p className="text-center text-destructive">
        Trình duyệt hoặc kết nối này chưa hỗ trợ gọi thoại (cần HTTPS và quyền micro).
      </p>
    );
  }

  const isConnected = callStatus === CallStatus.CONNECTED;
  const isConnecting = callStatus === CallStatus.CONNECTING;

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image src="/ai-avatar.png" alt="AI đồng hành" width={65} height={54} className="object-cover" />
            {isConnected && <span className="animate-speak" />}
          </div>
          <h3>Bạn đồng hành AI</h3>
        </div>

        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="Người dùng"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
          </div>
        </div>
      </div>

      {(isConnecting || isConnected) && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={statusText}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {isConnecting ? "Đang kết nối..." : statusText || "Đang trò chuyện..."}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center mt-4">
        {callStatus === CallStatus.INACTIVE && (
          <Button size="lg" onClick={handleStartCall} disabled={!widgetReady}>
            {widgetReady ? "Bắt đầu cuộc trò chuyện" : "Đang tải..."}
          </Button>
        )}

        {isConnecting && (
          <Button size="lg" disabled>
            Đang kết nối...
          </Button>
        )}

        {isConnected && (
          <Button size="lg" variant="destructive" onClick={handleEndCall}>
            Kết thúc cuộc trò chuyện
          </Button>
        )}

        {callStatus === CallStatus.FAILED && (
          <Button size="lg" variant="destructive" onClick={handleStartCall}>
            Thử lại
          </Button>
        )}
      </div>
    </>
  );
};

export default VoiceChat;