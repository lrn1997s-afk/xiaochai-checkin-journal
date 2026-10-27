import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";
import { ensureGroupsReady, type GroupRow } from "@/app/lib/groups";

// 用邀请码加群：在服务器上按邀请码找群，谁建的群都能找到。
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return NextResponse.json({ error: "先输入邀请码" }, { status: 400 });

  try {
    await ensureGroupsReady();
    const rows = await sql<GroupRow[]>`
      select id, name, code from groups where upper(code) = ${code} limit 1
    `;
    const group = rows[0];
    if (!group) {
      return NextResponse.json({ error: "没有找到这个邀请码，确认一下字母和数字" }, { status: 404 });
    }
    await sql`
      insert into group_memberships (user_id, group_id) values (${user.id}, ${group.id})
      on conflict do nothing
    `;
    return NextResponse.json({ group });
  } catch (error) {
    console.error("join group failed", error);
    return NextResponse.json({ error: "服务器出错了" }, { status: 500 });
  }
}
