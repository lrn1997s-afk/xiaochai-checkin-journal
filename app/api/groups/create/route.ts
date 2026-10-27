import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";
import { ensureGroupsReady, type GroupRow } from "@/app/lib/groups";

// 去掉了容易看混的 0/O、1/I/L
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

// 建群（目前只有管理员能建）。建群人自动成为成员。
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "建群暂时只有管理员可以操作" }, { status: 403 });

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 10) : "";
  if (!name) return NextResponse.json({ error: "先给群组起一个名字" }, { status: 400 });

  try {
    await ensureGroupsReady();
    const id = `group-${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
    let group: GroupRow | undefined;
    for (let attempt = 0; attempt < 5 && !group; attempt += 1) {
      const inserted = await sql<GroupRow[]>`
        insert into groups (id, name, code, created_by) values (${id}, ${name}, ${makeCode()}, ${user.id})
        on conflict do nothing
        returning id, name, code
      `;
      group = inserted[0];
    }
    if (!group) return NextResponse.json({ error: "生成邀请码失败，再试一次" }, { status: 500 });
    await sql`
      insert into group_memberships (user_id, group_id) values (${user.id}, ${group.id})
      on conflict do nothing
    `;
    return NextResponse.json({ group });
  } catch (error) {
    console.error("create group failed", error);
    return NextResponse.json({ error: "服务器出错了" }, { status: 500 });
  }
}
