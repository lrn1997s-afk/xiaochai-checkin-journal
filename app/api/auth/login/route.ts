import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/app/lib/db";
import {
  verifyPassword,
  generateSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
} from "@/app/lib/auth";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  try {
    const rows = await sql<{ id: number; password_hash: string }[]>`
      select id, password_hash from users where username = ${username} limit 1
    `;
    const user = rows[0];

    const passwordOk = user
      ? verifyPassword(password, user.password_hash)
      : verifyPassword(password, "0000000000000000:00");

    if (!user || !passwordOk) {
      return NextResponse.json({ error: "用户名或密码不对" }, { status: 401 });
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await sql`
      insert into sessions (token, user_id, expires_at)
      values (${token}, ${user.id}, ${expiresAt})
    `;

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return NextResponse.json({ username });
  } catch (error) {
    console.error("login failed", error);
    return NextResponse.json(
      { error: "服务器出错了，可能是数据库还没配置好（DATABASE_URL / 数据表）" },
      { status: 500 }
    );
  }
}
