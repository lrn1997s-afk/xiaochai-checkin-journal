import { cookies } from "next/headers";
import { sql } from "./db";
import { SESSION_COOKIE_NAME } from "./auth";

export type SessionUser = { id: number; username: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const rows = await sql<{ id: number; username: string }[]>`
      select users.id, users.username
      from sessions
      join users on users.id = sessions.user_id
      where sessions.token = ${token}
        and sessions.expires_at > now()
      limit 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error("getSessionUser failed", error);
    return null;
  }
}
