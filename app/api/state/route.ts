import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";

type StoredState = Record<string, unknown>;

// 判断一份状态里"有没有真正的打卡数据"。
// 用来拦截那种把空白状态写回服务器、直接清空账号的情况
// （比如本地 localStorage 损坏后退回初始状态，紧接着自动保存就触发了覆盖）。
function hasRealData(state: unknown): boolean {
  if (!state || typeof state !== "object") return false;
  const record = state as StoredState;
  const exerciseEntries = record.exerciseEntries;
  if (Array.isArray(exerciseEntries) && exerciseEntries.length > 0) return true;
  const mealHistory = record.mealHistory;
  if (mealHistory && typeof mealHistory === "object" && Object.keys(mealHistory).length > 0) return true;
  return false;
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

const DB_ERROR = "服务器出错了，可能是数据库还没配置好（DATABASE_URL / 数据表）";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const rows = await sql<{ state_json: unknown; updated_at: unknown }[]>`
      select state_json, updated_at from user_states where user_id = ${user.id} limit 1
    `;
    const row = rows[0];
    return NextResponse.json({
      state: row?.state_json ?? null,
      updatedAt: row ? toIso(row.updated_at) : null,
    });
  } catch (error) {
    console.error("get state failed", error);
    return NextResponse.json({ error: DB_ERROR }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { state?: unknown; baseUpdatedAt?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }

  if (body.state === undefined) {
    return NextResponse.json({ error: "缺少 state 字段" }, { status: 400 });
  }

  try {
    const jsonSafeState = JSON.parse(JSON.stringify(body.state)) as StoredState;

    const existingRows = await sql<{ state_json: unknown; updated_at: unknown }[]>`
      select state_json, updated_at from user_states where user_id = ${user.id} limit 1
    `;
    const existing = existingRows[0];

    // 情况一：服务器上还没有这个用户的数据，直接建一条。
    if (!existing) {
      const inserted = await sql<{ updated_at: unknown }[]>`
        insert into user_states (user_id, state_json, updated_at)
        values (${user.id}, ${sql.json(jsonSafeState as never)}, now())
        on conflict (user_id) do nothing
        returning updated_at
      `;
      if (inserted.length === 0) {
        // 极少数情况：刚好有另一个请求同时插入了，让客户端重新拉一次再合并。
        return conflictResponse(user.id);
      }
      await syncGroupMemberships(user.id, jsonSafeState);
      return NextResponse.json({ ok: true, updatedAt: toIso(inserted[0].updated_at) });
    }

    const currentIso = toIso(existing.updated_at);

    // 情况二：防止用空白状态覆盖掉服务器上真实的打卡数据。
    if (!hasRealData(jsonSafeState) && hasRealData(existing.state_json)) {
      return NextResponse.json(
        {
          error: "拒绝用空白数据覆盖已有记录",
          conflict: true,
          state: existing.state_json,
          updatedAt: currentIso,
        },
        { status: 409 }
      );
    }

    // 情况三：乐观锁。客户端必须带上它拿到数据时的版本号，
    // 对不上说明这期间别的设备写过了，让客户端先合并再重试，绝不盲目覆盖。
    if (!body.baseUpdatedAt || body.baseUpdatedAt !== currentIso) {
      return NextResponse.json(
        {
          error: "数据版本不一致，需要先合并",
          conflict: true,
          state: existing.state_json,
          updatedAt: currentIso,
        },
        { status: 409 }
      );
    }

    // 条件更新：把版本号写进 where 条件，避免两个请求同时通过上面的检查。
    const updated = await sql<{ updated_at: unknown }[]>`
      update user_states
      set state_json = ${sql.json(jsonSafeState as never)}, updated_at = now()
      where user_id = ${user.id} and updated_at = ${new Date(body.baseUpdatedAt)}
      returning updated_at
    `;

    if (updated.length === 0) {
      return conflictResponse(user.id);
    }

    await syncGroupMemberships(user.id, jsonSafeState);
    return NextResponse.json({ ok: true, updatedAt: toIso(updated[0].updated_at) });
  } catch (error) {
    console.error("save state failed", error);
    return NextResponse.json({ error: DB_ERROR }, { status: 500 });
  }
}

async function conflictResponse(userId: number) {
  const rows = await sql<{ state_json: unknown; updated_at: unknown }[]>`
    select state_json, updated_at from user_states where user_id = ${userId} limit 1
  `;
  const row = rows[0];
  return NextResponse.json(
    {
      error: "数据版本不一致，需要先合并",
      conflict: true,
      state: row?.state_json ?? null,
      updatedAt: row ? toIso(row.updated_at) : null,
    },
    { status: 409 }
  );
}

// 把这份数据里记录的"我加入了哪些群组"同步到一张单独的群组成员表，
// 这样查"这个群组里都有谁"的时候不用去扫描每个人的完整数据。
async function syncGroupMemberships(userId: number, state: StoredState) {
  const groupIds = Array.isArray(state.groupIds)
    ? (state.groupIds as unknown[]).filter((g): g is string => typeof g === "string" && g !== "personal")
    : [];

  await sql`delete from group_memberships where user_id = ${userId}`;
  if (groupIds.length > 0) {
    const rows = groupIds.map((groupId) => ({ user_id: userId, group_id: groupId }));
    await sql`insert into group_memberships ${sql(rows, "user_id", "group_id")}`;
  }
}
