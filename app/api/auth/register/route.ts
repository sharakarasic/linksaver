import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { readUsers, writeUsers, createId, hashPassword } from "@/lib/storage";
import type { PublicUser, User } from "@/app/types";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const trimmed = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
    return NextResponse.json(
      { error: "Username must be 3–20 chars, letters/numbers/underscore." },
      { status: 400 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 }
    );
  }

  const users = await readUsers();

  // TEMP debug logging – remove when stable.
  console.log("AUTH register", {
    username: trimmed,
    existingUsersCount: Array.isArray(users) ? users.length : "NOT_ARRAY",
  });

  if (users.some((u) => u.username === trimmed)) {
    return NextResponse.json(
      { error: "Username already taken." },
      { status: 409 }
    );
  }

  const user: User = {
    id: createId(),
    username: trimmed,
    passwordHash: hashPassword(password),
  };
  users.push(user);
  await writeUsers(users);
  await createSession(user.id);

  const publicUser: PublicUser = { id: user.id, username: user.username };
  return NextResponse.json(publicUser, { status: 201 });
}