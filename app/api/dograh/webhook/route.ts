import { db } from "@/firebase/admin";

// Payload Dograh gửi tới sau khi cuộc gọi kết thúc, khớp với payload_template
// đã cấu hình trên Webhook node trong workflow (xem docs.dograh.com/developer/webhooks)
interface DograhWebhookPayload {
    userId?: string;
    name?: string;
    workflow_run_id: string | number;
    call_time?: string; // ISO-8601 UTC
    duration_seconds?: string | number;
    disposition?: string; // vd: user_hangup, voicemail_detected, call_transferred...
    summary?: string; // trích xuất từ gathered_context.call_summary (Variable Extraction)
    mood_during_call?: string; // trích xuất từ gathered_context.mood_during_call
    recording_url?: string | null;
    transcript_url?: string | null;
}

function isAuthorized(request: Request): boolean {
    const expected = process.env.DOGRAH_WEBHOOK_SECRET;
    // Nếu chưa cấu hình secret, bỏ qua kiểm tra (chỉ nên dùng khi test local)
    if (!expected) return true;

    const provided = request.headers.get("x-webhook-secret");
    return provided === expected;
}

export async function POST(request: Request) {
    try {
        if (!isAuthorized(request)) {
            return Response.json(
                { success: false, error: "Không có quyền truy cập" },
                { status: 401 }
            );
        }

        const body: Partial<DograhWebhookPayload> = await request.json();

        if (!body.workflow_run_id) {
            return Response.json(
                { success: false, error: "Thiếu workflow_run_id" },
                { status: 400 }
            );
        }

        if (!body.userId) {
            // Cuộc gọi không có userId trong context (vd: gọi test từ dashboard)
            // -> vẫn trả 200 để Dograh không log là lỗi, nhưng không lưu gì cả
            console.warn("[Dograh webhook] Bỏ qua: thiếu userId trong initial_context");
            return Response.json({ success: true, skipped: true }, { status: 200 });
        }

        const runId = String(body.workflow_run_id);

        const callLog = {
            userId: body.userId,
            name: body.name ?? "",
            callTime: body.call_time ?? new Date().toISOString(),
            durationSeconds: body.duration_seconds ? Number(body.duration_seconds) : 0,
            disposition: body.disposition ?? "",
            summary: body.summary ?? "",
            moodDuringCall: body.mood_during_call ?? "",
            recordingUrl: body.recording_url ?? null,
            transcriptUrl: body.transcript_url ?? null,
            createdAt: new Date().toISOString(),
        };

        // Dùng workflow_run_id làm document ID để chống ghi trùng khi Dograh
        // gửi lại webhook (retry) cho cùng 1 cuộc gọi.
        await db
            .collection("call_logs")
            .doc(runId)
            .set(callLog, { merge: true });

        // Đồng thời cập nhật "lần gọi gần nhất" ngay trên hồ sơ người già,
        // để trang tổng quan (nếu có) không cần join 2 collection.
        await db
            .collection("relative_infomation")
            .doc(body.userId)
            .set(
                {
                    lastCallAt: callLog.callTime,
                    lastCallSummary: callLog.summary,
                    lastCallMood: callLog.moodDuringCall,
                },
                { merge: true }
            );

        return Response.json({ success: true, data: callLog }, { status: 200 });
    } catch (error) {
        console.error("Error handling Dograh webhook:", error);
        // Vẫn trả 200 để Dograh không retry vô hạn nếu lỗi là do dữ liệu, không phải do mạng.
        // Nếu muốn Dograh tự retry khi lỗi, đổi status thành 500.
        return Response.json({ success: false, error: String(error) }, { status: 500 });
    }
}