import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";
import { getUserGroups } from "@/app/lib/groups";

// 我加入了哪些群（以服务器为准）
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const groups = await getUserGroups(user.id);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("list groups failed", error);
    return NextResponse.json({ error: "服务器出错了" }, { status: 500 });
  }
}
