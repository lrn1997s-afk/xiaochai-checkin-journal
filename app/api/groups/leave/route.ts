import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";
import { ensureGroupsReady } from "@/app/lib/groups";

// 自己退出某个群
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { groupId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!groupId || groupId === "personal") {
    return NextResponse.json({ error: "个人手帐不能退出" }, { status: 400 });
  }
  try {
    await ensureGroupsReady();
    await sql`delete from group_memberships where user_id = ${user.id} and group_id = ${groupId}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("leave group failed", error);
    return NextResponse.json({ error: "服务器出错了" }, { status: 500 });
  }
}
