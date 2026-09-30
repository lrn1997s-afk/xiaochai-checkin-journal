import { NextResponse } from "next/server";
import { putPhoto } from "@/app/lib/blob";
import { getSessionUser } from "@/app/lib/session";

// 接收客户端压缩后的照片（base64 的 data URL），存进 Blob 存储，
// 返回一个可访问的图片地址（/api/photo/<key>）。数据库里以后只存这个地址，不再存图片本身。
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { data?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }

  const dataUrl = body.data ?? "";
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:image/") || comma < 0) {
    return NextResponse.json({ error: "不是有效的图片数据" }, { status: 400 });
  }

  // 把 base64 解成二进制（用 atob，兼容边缘运行时，不依赖 Node 的 Buffer）。
  let bytes: Uint8Array;
  try {
    const binary = atob(dataUrl.slice(comma + 1));
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  } catch {
    return NextResponse.json({ error: "图片数据解析失败" }, { status: 400 });
  }

  // 单张上限 3MB（客户端已压到 ~150KB，这里只是兜底防滥用）。
  if (bytes.length === 0 || bytes.length > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "图片过大或为空" }, { status: 400 });
  }

  const key = `${user.id}-${crypto.randomUUID()}.jpg`;
  try {
    await putPhoto(key, bytes.buffer as ArrayBuffer);
    return NextResponse.json({ url: `/api/photo/${key}` });
  } catch (error) {
    console.error("upload photo failed", error);
    return NextResponse.json({ error: "图片上传失败" }, { status: 500 });
  }
}
