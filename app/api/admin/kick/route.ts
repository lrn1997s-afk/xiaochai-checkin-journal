import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";

// 管理员把某个用户移出某个群组。
// 成员关系有两处记录：group_memberships 这张表，以及该用户 state_json.groupIds 里的群号。
// 两处都要清——否则下次那个用户一保存数据，syncGroupMemberships 又会把他加回 group_memberships。

type StoredState = { groupIds?: unknown; currentGroupId?: unknown; [key: string]: unknown };

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  // 管理员身份以 users 表为准（服务端唯一真源）。
  if (!user.isAdmin) {
    return NextResponse.json({ error: "不是管理员账号" }, { status: 403 });
  }

  let body: { groupId?: string; targetUsername?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }

  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  const targetUsername = typeof body.targetUsername === "string" ? body.targetUsername : "";
  if (!groupId || !targetUsername) {
    return NextResponse.json({ error: "缺少群组或用户名" }, { status: 400 });
  }
  if (groupId === "personal") {
    return NextResponse.json({ error: "个人手帐不能踢人" }, { status: 400 });
  }

  try {
    const targetRows = await sql<{ id: number }[]>`
      select id from users where username = ${targetUsername} limit 1
    `;
    const target = targetRows[0];
    if (!target) {
      return NextResponse.json({ error: "找不到这个用户" }, { status: 404 });
    }

    // 1) 从成员表里删掉这条群关系
    await sql`
      delete from group_memberships
      where user_id = ${target.id} and group_id = ${groupId}
    `;

    // 2) 从该用户自己的数据里把这个群号去掉（并把当前群切回个人手帐，避免他停留在已被踢出的群）
    const stateRows = await sql<{ state_json: StoredState | null }[]>`
      select state_json from user_states where user_id = ${target.id} limit 1
    `;
    const state = stateRows[0]?.state_json;
    if (state) {
      const groupIds = Array.isArray(state.groupIds)
        ? (state.groupIds as unknown[]).filter((g) => typeof g === "string" && g !== groupId)
        : [];
      const nextState = {
        ...state,
        groupIds,
        currentGroupId: state.currentGroupId === groupId ? "personal" : state.currentGroupId,
      };
      await sql`
        update user_states
        set state_json = ${sql.json(JSON.parse(JSON.stringify(nextState)))}, updated_at = now()
        where user_id = ${target.id}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin kick member failed", error);
    return NextResponse.json({ error: "服务器出错了" }, { status: 500 });
  }
}
