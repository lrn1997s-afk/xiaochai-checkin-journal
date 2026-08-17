import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/app/lib/db";
import { SESSION_COOKIE_NAME } from "@/app/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      await sql`delete from sessions where token = ${token}`;
    } catch (error) {
      console.error("logout failed", error);
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
