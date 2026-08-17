import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/app/lib/db";
import {
  hashPassword,
  generateSessionToken,
  isValidUsername,
  isValidPassword,
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

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "用户名需要 3-20 位，只能包含字母、数字、下划线" },
      { status: 400 }
    );
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  try {
    const existing = await sql`select id from users where username = ${username} limit 1`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "这个用户名已经被注册了" }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const [user] = await sql<{ id: number }[]>`
      insert into users (username, password_hash)
      values (${username}, ${passwordHash})
      returning id
    `;

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
    console.error("register failed", error);
    return NextResponse.json(
      { error: "服务器出错了，可能是数据库还没配置好（DATABASE_URL / 数据表）" },
      { status: 500 }
    );
  }
}
