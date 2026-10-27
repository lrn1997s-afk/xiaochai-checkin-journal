import { sql } from "./db";

// 群组的"服务器端真源"。
// 以前群组只存在建群人自己的本地数据里，别人输邀请码根本查不到；
// 现在群组和成员关系都以数据库为准：groups 表存群，group_memberships 表存谁在哪个群。

export type GroupRow = { id: string; name: string; code: string };

const DEFAULT_GROUPS: GroupRow[] = [
  { id: "group-friends", name: "健康搭子群", code: "FIT2026" },
  { id: "group-test-10", name: "十人测试群", code: "TEST10" },
  { id: "group-lean-muscle", name: "薄肌俱乐部", code: "LEAN2026" },
];

let readyPromise: Promise<void> | null = null;

// 第一次用到群组功能时自动建表 + 一次性迁移旧数据，不需要手动去数据库执行 SQL。
export function ensureGroupsReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = setup().catch((error) => {
      readyPromise = null; // 失败了下次再试
      throw error;
    });
  }
  return readyPromise;
}

async function setup() {
  await sql`
    create table if not exists groups (
      id text primary key,
      name text not null,
      code text not null,
      created_by integer references users(id) on delete set null,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create unique index if not exists groups_code_upper_idx on groups (upper(code))`;
  await sql`
    create table if not exists app_migrations (
      name text primary key,
      ran_at timestamptz not null default now()
    )
  `;

  for (const group of DEFAULT_GROUPS) {
    await sql`
      insert into groups (id, name, code) values (${group.id}, ${group.name}, ${group.code})
      on conflict do nothing
    `;
  }

  // 一次性迁移：只有抢到这条记录的那个请求会执行，避免重复跑。
  const claimed = await sql<{ name: string }[]>`
    insert into app_migrations (name) values ('groups_v1')
    on conflict do nothing
    returning name
  `;
  if (claimed.length === 0) return;

  // 1) 把各人本地数据里自建的群（比如管理员建的群）登记到服务器
  await sql`
    insert into groups (id, name, code)
    select distinct on (g->>'id') g->>'id', left(g->>'name', 20), g->>'code'
    from user_states, jsonb_array_elements(
      case when jsonb_typeof(state_json->'groups') = 'array' then state_json->'groups' else '[]'::jsonb end
    ) as g
    where g->>'id' is not null and g->>'id' <> 'personal'
      and coalesce(g->>'name', '') <> '' and coalesce(g->>'code', '') <> ''
    on conflict do nothing
  `;

  // 2) 把各人本地记着的"我加入了哪些群"补进成员表（之前要等数据同步成功才会写进去，经常漏）
  await sql`
    insert into group_memberships (user_id, group_id)
    select user_states.user_id, gid
    from user_states, jsonb_array_elements_text(
      case when jsonb_typeof(state_json->'groupIds') = 'array' then state_json->'groupIds' else '[]'::jsonb end
    ) as gid
    where gid <> 'personal' and exists (select 1 from groups where groups.id = gid)
    on conflict do nothing
  `;
}

export async function getUserGroups(userId: number) {
  await ensureGroupsReady();
  return sql<(GroupRow & { memberCount: number })[]>`
    select groups.id, groups.name, groups.code,
      (select count(*)::int from group_memberships m2 where m2.group_id = groups.id) as "memberCount"
    from group_memberships
    join groups on groups.id = group_memberships.group_id
    where group_memberships.user_id = ${userId}
    order by group_memberships.joined_at
  `;
}

export async function isGroupMember(userId: number, groupId: string) {
  await ensureGroupsReady();
  const rows = await sql<{ ok: number }[]>`
    select 1 as ok from group_memberships where user_id = ${userId} and group_id = ${groupId} limit 1
  `;
  return rows.length > 0;
}

// 这个人当前加入的群（含个人手帐），以成员表为准。
export async function getGroupIdsFor(userId: number): Promise<string[]> {
  await ensureGroupsReady();
  const rows = await sql<{ group_id: string }[]>`
    select group_id from group_memberships where user_id = ${userId} order by joined_at
  `;
  return ["personal", ...rows.map((row) => row.group_id)];
}

// 用服务器上的成员关系覆盖一份数据里的 groupIds / currentGroupId。
export function applyGroupTruth<T extends Record<string, unknown>>(state: T, groupIds: string[]): T {
  const current = typeof state.currentGroupId === "string" ? state.currentGroupId : "personal";
  return { ...state, groupIds, currentGroupId: groupIds.includes(current) ? current : "personal" };
}
