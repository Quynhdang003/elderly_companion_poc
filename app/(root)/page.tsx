// app/(root)/page.tsx
import VoiceChat from "@/components/VoiceChat";

const Page = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <h1 className="text-center">Bạn đồng hành AI</h1>
      <p className="text-center text-muted-foreground max-w-md">
        Bấm nút bên dưới và bắt đầu trò chuyện bằng giọng nói.
      </p>

      <VoiceChat />
    </div>
  );
};

export default Page;