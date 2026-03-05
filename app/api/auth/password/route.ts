import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readUsers, writeUsers, hashPassword } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required." },
      { status: 400 }
    );
  }

  if (newPassword.length < 4) {
    return NextResponse.json(
      { error: "New password must be at least 4 characters." },
      { status: 400 }
    );
  }

  const users = await readUsers();
  const found = users.find((u) => u.id === user.id);
  if (!found) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const currentHash = hashPassword(currentPassword);
  if (found.passwordHash !== currentHash) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  found.passwordHash = hashPassword(newPassword);
  await writeUsers(users);

  return NextResponse.json({ ok: true });
}

