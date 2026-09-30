import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";

// 把当前登录账号升级为管理员。密码只保存在服务端环境变量 ADMIN_PASSWORD 里，
// 前端永远拿不到密码，也无法直接把自己标记成管理员。
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "服务器还没配置管理员密码（缺少 ADMIN_PASSWORD 环境变量）" },
      { status: 500 }
    );
  }

  const provided = body.password ?? "";
  // 定长比较，避免用普通 === 带来的计时侧信道。
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    return NextResponse.json({ error: "管理员密码不对。" }, { status: 403 });
  }

  try {
    await sql`update users set is_admin = true where id = ${user.id}`;
    return NextResponse.json({ ok: true, isAdmin: true });
  } catch (error) {
    console.error("promote admin failed", error);
    return NextResponse.json({ error: "服务器出错了" }, { status: 500 });
  }
}
