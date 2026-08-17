import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const rows = await sql<{ state_json: unknown }[]>`
      select state_json from user_states where user_id = ${user.id} limit 1
    `;
    return NextResponse.json({ state: rows[0]?.state_json ?? null });
  } catch (error) {
    console.error("get state failed", error);
    return NextResponse.json(
      { error: "服务器出错了，可能是数据库还没配置好（DATABASE_URL / 数据表）" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { state?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }

  if (body.state === undefined) {
    return NextResponse.json({ error: "缺少 state 字段" }, { status: 400 });
  }

  try {
    const jsonSafeState = JSON.parse(JSON.stringify(body.state)) as Record<string, unknown>;

    await sql`
      insert into user_states (user_id, state_json, updated_at)
      values (${user.id}, ${sql.json(jsonSafeState as never)}, now())
      on conflict (user_id)
      do update set state_json = excluded.state_json, updated_at = now()
    `;

    // 把这份数据里记录的"我加入了哪些群组"同步到一张单独的群组成员表，
    // 这样查"这个群组里都有谁"的时候不用去扫描每个人的完整数据。
    const groupIds = Array.isArray(jsonSafeState.groupIds)
      ? (jsonSafeState.groupIds as unknown[]).filter((g): g is string => typeof g === "string" && g !== "personal")
      : [];

    await sql`delete from group_memberships where user_id = ${user.id}`;
    if (groupIds.length > 0) {
      const rows = groupIds.map((groupId) => ({ user_id: user.id, group_id: groupId }));
      await sql`insert into group_memberships ${sql(rows, "user_id", "group_id")}`;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("save state failed", error);
    return NextResponse.json(
      { error: "服务器出错了，可能是数据库还没配置好（DATABASE_URL / 数据表）" },
      { status: 500 }
    );
  }
}
