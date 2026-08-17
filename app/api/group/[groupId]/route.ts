import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/session";

type MemberRow = {
  username: string;
  state_json: {
    nickname?: string;
    mascot?: string;
    points?: number;
    visibility?: "public" | "private";
    exerciseEntries?: unknown[];
    weeklyExerciseGoal?: number;
  } | null;
};

export async function GET(request: Request, context: { params: Promise<{ groupId: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { groupId } = await context.params;
  if (!groupId) {
    return NextResponse.json({ error: "缺少群组 ID" }, { status: 400 });
  }

  try {
    const rows = await sql<MemberRow[]>`
      select users.username, user_states.state_json
      from group_memberships
      join users on users.id = group_memberships.user_id
      left join user_states on user_states.user_id = group_memberships.user_id
      where group_memberships.group_id = ${groupId}
    `;

    const members = rows
      .map((row) => {
        const state = row.state_json;
        const isSelf = row.username === user.username;
        // 设成"隐藏"的人，除了他自己看自己，其他组员看不到他的具体数据
        if (state?.visibility === "private" && !isSelf) return null;
        return {
          username: row.username,
          isSelf,
          nickname: state?.nickname ?? row.username,
          mascot: state?.mascot ?? "main",
          points: state?.points ?? 0,
          exerciseEntries: state?.exerciseEntries ?? [],
          weeklyExerciseGoal: state?.weeklyExerciseGoal ?? 2,
        };
      })
      .filter((member): member is NonNullable<typeof member> => member !== null);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("get group members failed", error);
    return NextResponse.json(
      { error: "服务器出错了，可能是数据库还没配置好（DATABASE_URL / 数据表）" },
      { status: 500 }
    );
  }
}
