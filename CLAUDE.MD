# Project Context

## Mục tiêu
POC ứng dụng web AI đồng hành cho người cao tuổi, có tính năng trò chuyện
bằng giọng nói (tiếng Việt) và cảnh báo dấu hiệu lừa đảo.

## Tech Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Firebase: Authentication (email/password) + Firestore (data storage)
- Vapi AI: voice assistant, hội thoại tiếng Việt
- Google Gemini: xử lý ngôn ngữ / phân tích nội dung

## Cấu trúc thư mục (giữ nguyên, không tự ý đổi)
```
app/
  layout.tsx                  # layout tổng, metadata, font
  globals.css                 # stylesheet toàn cục
  (root)/page.tsx             # trang chủ
  (auth)/layout.tsx           # layout route auth
  (auth)/sign-in/page.tsx
  (auth)/sign-up/page.tsx
  api/                        # Route Handlers (server-side logic)
components/
  AuthForms.tsx                # form dùng chung sign-in/sign-up
  ui/                           # button, input, toast, ...
lib/
  utils.ts                      # helper merge className
  firebase/                     # client.ts, admin.ts
  actions/                      # server actions / CRUD Firestore
constants/                      # hằng số dùng chung
types/                          # type & interface
public/                         # tài nguyên tĩnh
```

## Quy ước code
- Dùng App Router conventions (server components mặc định, "use client"
  chỉ khi cần state/event).
- Toàn bộ gọi Firebase Admin, Gemini API, Vapi server-side key phải nằm
  trong Route Handler hoặc Server Action — KHÔNG được lộ ra client bundle.
- Biến `NEXT_PUBLIC_*` mới được dùng ở client component.
- Validate form bằng zod + react-hook-form.
- Toast/error hiển thị qua components/ui/toast có sẵn, không tạo mới.
- Giữ nguyên style Tailwind hiện có (không đổi theme/config nếu không
  được yêu cầu).

## Biến môi trường (.env)
```
NEXT_PUBLIC_VAPI_WEB_TOKEN=
NEXT_PUBLIC_VAPI_WORKFLOW_ID=
GOOGLE_GENERATIVE_AI_API_KEY=
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

## Quy tắc làm việc với AI
- Khi thêm tính năng mới, chỉ sửa/tạo file liên quan trực tiếp, liệt kê
  rõ danh sách file đã đụng tới.
- Không tự ý cài thêm package ngoài những gì đã có trong package.json
  trừ khi được yêu cầu rõ.
- Nếu cần cấu hình bên ngoài code (vd: Vapi dashboard, Firebase console),
  nêu rõ bước cấu hình đó thay vì cố giả lập bằng code.