import { NextRequest, NextResponse } from "next/server";
import { readUsers, hashPassword } from "@/lib/storage";
import { createSession } from "@/lib/auth";
import type { PublicUser } from "@/app/types";

export async function POST(req: NextRequest) {
  const { username, password } = await req
    .json()
    .catch(() => ({} as Record<string, unknown>));

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const trimmed = username.trim().toLowerCase();
  const users = await readUsers();
  const user = users.find((u) => u.username === trimmed);

  // TEMP debug logging – remove when stable.
  console.log("AUTH login", {
    username: trimmed,
    found: !!user,
  });

  if (!user || user.passwordHash !== hashPassword(password)) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  await createSession(user.id);
  const publicUser: PublicUser = { id: user.id, username: user.username };
  return NextResponse.json(publicUser, { status: 200 });
}