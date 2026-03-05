import { NextResponse } from "next/server";

export async function POST() {
  // Clear the session cookie. Must match how you set it on login.
  const res = NextResponse.json({ ok: true });

  res.cookies.set("SESSION_COOKIE", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0, // expire immediately
  });

  return res;
}