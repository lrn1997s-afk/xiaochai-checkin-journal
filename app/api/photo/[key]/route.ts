import { getPhoto } from "@/app/lib/blob";

// 按 key 读取一张图并返回。key 是上传时随机生成的、猜不到的名字，
// 所以这个接口不做登录校验（图片本身不是敏感信息，靠 key 不可枚举来保护）。
// 加上长缓存：同一张图的 key 永远对应同一份内容，浏览器和边缘节点都能缓存，重复查看很快。
export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!key) {
    return new Response("Not Found", { status: 404 });
  }

  const data = await getPhoto(key);
  if (!data) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
