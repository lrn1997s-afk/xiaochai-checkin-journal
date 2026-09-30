import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";

// 周冠军统计：直接从每个成员的运动记录里现算，不建新表、不用定时任务。
// 规则：每个群、每一周（周一到周日）运动打卡最多的人拿一次冠军，累计次数就是勋章数字。
// 只统计「已经结束的周」，本周还没结束不算。过去的打卡记录不会再变，所以现算结果是稳定的。

type Entry = { date?: string; leaveReason?: string; photoStatus?: string };
type MemberRow = {
  user_id: number;
  username: string;
  state_json: { exerciseEntries?: Entry[] } | null;
};

// 给一个日期字符串（YYYY-MM-DD），算出它所在这一周的周一（YYYY-MM-DD）。
// 纯日历运算，避免服务端和用户时区不一致导致周边界错乱。
function weekStartOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7; // 周一=1 … 周日=7
  dt.setUTCDate(dt.getUTCDate() - day + 1);
  return dt.toISOString().slice(0, 10);
}

// 今天（按东八区算，用户都在国内），返回 YYYY-MM-DD。
function todayCN(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function GET(_request: Request, context: { params: Promise<{ groupId: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { groupId } = await context.params;
  if (!groupId) {
    return NextResponse.json({ error: "缺少群组 ID" }, { status: 400 });
  }

  try {
    // 拉群成员 + 各自的运动记录
    const rows = await sql<MemberRow[]>`
      select group_memberships.user_id, users.username, user_states.state_json
      from group_memberships
      join users on users.id = group_memberships.user_id
      left join user_states on user_states.user_id = group_memberships.user_id
      where group_memberships.group_id = ${groupId}
    `;

    const currentWeek = weekStartOf(todayCN());

    // 统计：周一日期 -> (username -> 本周有效打卡次数)。只统计已结束的周（本周不算）。
    const weekCounts = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const entries = Array.isArray(row.state_json?.exerciseEntries) ? row.state_json!.exerciseEntries! : [];
      for (const entry of entries) {
        if (!entry || typeof entry.date !== "string") continue;
        if (entry.leaveReason) continue; // 请假不算
        if (entry.photoStatus === "rejected") continue; // 被驳回不算
        const ws = weekStartOf(entry.date);
        if (!ws || ws >= currentWeek) continue; // 本周及以后还没结束，不结算
        let perUser = weekCounts.get(ws);
        if (!perUser) {
          perUser = new Map();
          weekCounts.set(ws, perUser);
        }
        perUser.set(row.username, (perUser.get(row.username) ?? 0) + 1);
      }
    }

    // 逐周决出冠军，累加到每个人头上
    const badges: Record<string, number> = {};
    for (const counts of weekCounts.values()) {
      let champUser: string | null = null;
      let champCount = 0;
      for (const [uname, cnt] of counts) {
        if (cnt <= 0) continue;
        // 次数最多者夺冠；并列时取用户名字典序最小的，保证结果稳定。
        if (cnt > champCount || (cnt === champCount && (champUser === null || uname < champUser))) {
          champCount = cnt;
          champUser = uname;
        }
      }
      if (!champUser) continue;
      badges[champUser] = (badges[champUser] ?? 0) + 1;
    }

    return NextResponse.json({ badges });
  } catch (error) {
    console.error("get champions failed", error);
    return NextResponse.json({ error: "服务器出错了" }, { status: 500 });
  }
}
