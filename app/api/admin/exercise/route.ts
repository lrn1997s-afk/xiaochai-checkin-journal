import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";

const EXERCISE_POINT_REWARD = 10;

type ExerciseEntry = {
  date: string;
  tag: string;
  duration: number;
  intensity: string;
  photo?: string;
  photoStatus?: "pending" | "approved" | "rejected";
};

type StoredState = {
  isAdmin?: boolean;
  points?: number;
  exerciseEntries?: ExerciseEntry[];
  exercisePointDates?: string[];
  [key: string]: unknown;
};

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) } as const;

  const rows = await sql<{ state_json: StoredState | null }[]>`
    select state_json from user_states where user_id = ${user.id} limit 1
  `;
  const isAdmin = rows[0]?.state_json?.isAdmin === true;
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "不是管理员账号" }, { status: 403 }) } as const;
  }
  return { user } as const;
}

export async function POST(request: Request) {
  const check = await requireAdmin();
  if ("error" in check) return check.error;

  let body: {
    targetUsername?: string;
    action?: "review" | "backfill";
    date?: string;
    status?: "approved" | "rejected";
    tag?: string;
    duration?: number;
    intensity?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不对" }, { status: 400 });
  }

  const { targetUsername, action, date } = body;
  if (!targetUsername || !action || !date) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  try {
    const targetRows = await sql<{ id: number }[]>`
      select id from users where username = ${targetUsername} limit 1
    `;
    const targetUser = targetRows[0];
    if (!targetUser) {
      return NextResponse.json({ error: "找不到这个用户名" }, { status: 404 });
    }

    const stateRows = await sql<{ state_json: StoredState | null }[]>`
      select state_json from user_states where user_id = ${targetUser.id} limit 1
    `;
    const targetState: StoredState = stateRows[0]?.state_json ?? {};
    const entries: ExerciseEntry[] = Array.isArray(targetState.exerciseEntries) ? targetState.exerciseEntries : [];
    const rewardedDates: string[] = Array.isArray(targetState.exercisePointDates) ? targetState.exercisePointDates : [];
    let points = typeof targetState.points === "number" ? targetState.points : 0;

    if (action === "review") {
      const status = body.status;
      if (status !== "approved" && status !== "rejected") {
        return NextResponse.json({ error: "status 必须是 approved 或 rejected" }, { status: 400 });
      }
      const existing = entries.find((entry) => entry.date === date);
      if (!existing) {
        return NextResponse.json({ error: "找不到这一天的打卡记录" }, { status: 404 });
      }
      const wasRewarded = rewardedDates.includes(date);
      let newRewardedDates = rewardedDates;
      if (status === "rejected" && wasRewarded) {
        points = Math.max(points - EXERCISE_POINT_REWARD, 0);
        newRewardedDates = rewardedDates.filter((d) => d !== date);
      } else if (status === "approved" && existing.photoStatus === "rejected" && !wasRewarded) {
        points = points + EXERCISE_POINT_REWARD;
        newRewardedDates = [...rewardedDates, date];
      }
      const newEntries = entries.map((entry) => (entry.date === date ? { ...entry, photoStatus: status } : entry));
      const newState = { ...targetState, exerciseEntries: newEntries, exercisePointDates: newRewardedDates, points };
      await sql`
        insert into user_states (user_id, state_json, updated_at)
        values (${targetUser.id}, ${sql.json(JSON.parse(JSON.stringify(newState)))}, now())
        on conflict (user_id) do update set state_json = excluded.state_json, updated_at = now()
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === "backfill") {
      const tag = (body.tag ?? "补卡").slice(0, 8);
      const duration = typeof body.duration === "number" && body.duration > 0 ? Math.min(body.duration, 600) : 30;
      const intensity = body.intensity ?? "正常";
      const alreadyRewarded = rewardedDates.includes(date);
      const newEntries = [
        ...entries.filter((entry) => entry.date !== date),
        { date, tag, duration, intensity, photoStatus: "approved" as const },
      ];
      const newRewardedDates = alreadyRewarded ? rewardedDates : [...rewardedDates, date];
      const newPoints = alreadyRewarded ? points : points + EXERCISE_POINT_REWARD;
      const newState = { ...targetState, exerciseEntries: newEntries, exercisePointDates: newRewardedDates, points: newPoints };
      await sql`
        insert into user_states (user_id, state_json, updated_at)
        values (${targetUser.id}, ${sql.json(JSON.parse(JSON.stringify(newState)))}, now())
        on conflict (user_id) do update set state_json = excluded.state_json, updated_at = now()
      `;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "未知的 action" }, { status: 400 });
  } catch (error) {
    console.error("admin exercise action failed", error);
    return NextResponse.json({ error: "服务器出错了" }, { status: 500 });
  }
}
