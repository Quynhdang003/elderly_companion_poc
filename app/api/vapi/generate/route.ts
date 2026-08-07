import { db } from "@/firebase/admin";

// Các trường thông tin cá nhân của người già, dùng để AI cá nhân hóa hội thoại
interface RelativeInfoPayload {
    userId: string;
    name: string;
    age: number;
    hobbies?: string[]; // ví dụ: ["trồng cây", "nghe cải lương"]
    mood?: string; // trạng thái tâm trạng hiện tại, ví dụ: "vui vẻ", "hay lo lắng"
    personality?: string; // tính cách chung, ví dụ: "hòa đồng", "ít nói"
    healthNotes?: string; // ghi chú sức khỏe cơ bản (không phải chẩn đoán y khoa), ví dụ: "đi lại chậm, cần nhắc uống thuốc"
    familyMembers?: string; // thông tin người thân để AI nhắc tới đúng ngữ cảnh, ví dụ: "con gái tên Lan, cháu nội tên Bo"
    favoriteTopics?: string[]; // chủ đề người già thích trò chuyện, ví dụ: ["thời sự", "món ăn ngày xưa"]
    notes?: string; // ghi chú tự do khác
}

function validatePayload(body: Partial<RelativeInfoPayload>) {
    if (!body.userId || typeof body.userId !== "string") {
        return "Thiếu hoặc sai định dạng: userId";
    }
    if (!body.name || typeof body.name !== "string") {
        return "Thiếu hoặc sai định dạng: name";
    }
    if (
        body.age === undefined ||
        typeof body.age !== "number" ||
        body.age < 0 ||
        body.age > 130
    ) {
        return "Thiếu hoặc sai định dạng: age";
    }
    if (body.hobbies !== undefined && !Array.isArray(body.hobbies)) {
        return "Sai định dạng: hobbies phải là mảng chuỗi";
    }
    if (
        body.favoriteTopics !== undefined &&
        !Array.isArray(body.favoriteTopics)
    ) {
        return "Sai định dạng: favoriteTopics phải là mảng chuỗi";
    }
    return null;
}

export async function POST(request: Request) {
    try {
        const body: Partial<RelativeInfoPayload> = await request.json();

        const validationError = validatePayload(body);
        if (validationError) {
            return Response.json(
                { success: false, error: validationError },
                { status: 400 }
            );
        }

        const {
            userId,
            name,
            age,
            hobbies = [],
            mood = "",
            personality = "",
            healthNotes = "",
            familyMembers = "",
            favoriteTopics = [],
            notes = "",
        } = body as RelativeInfoPayload;

        const relativeInfo = {
            userId,
            name,
            age,
            hobbies,
            mood,
            personality,
            healthNotes,
            familyMembers,
            favoriteTopics,
            notes,
            updatedAt: new Date().toISOString(),
        };

        // Mỗi người già (userId) chỉ có 1 document duy nhất trong collection
        // "relative_infomation" -> dùng userId làm document ID để dễ truy vấn
        // và tự động ghi đè/cập nhật khi người dùng chỉnh sửa thông tin sau này.
        await db
            .collection("relative_infomation")
            .doc(userId)
            .set(relativeInfo, { merge: true });

        return Response.json({ success: true, data: relativeInfo }, { status: 200 });
    } catch (error) {
        console.error("Error saving relative info:", error);
        return Response.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return Response.json(
                { success: false, error: "Thiếu tham số userId" },
                { status: 400 }
            );
        }

        const doc = await db.collection("relative_infomation").doc(userId).get();

        if (!doc.exists) {
            return Response.json(
                { success: false, error: "Không tìm thấy thông tin cho userId này" },
                { status: 404 }
            );
        }

        return Response.json({ success: true, data: doc.data() }, { status: 200 });
    } catch (error) {
        console.error("Error fetching relative info:", error);
        return Response.json({ success: false, error: String(error) }, { status: 500 });
    }
}



