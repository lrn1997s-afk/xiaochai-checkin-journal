import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({ user: { username: user.username } });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
