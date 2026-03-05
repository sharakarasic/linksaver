import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { readUsers } from "./storage";
import type { User } from "@/app/types";

const SESSION_COOKIE = "session";

function getSecret() {
  return process.env.SESSION_SECRET || "dev-session-secret-change-me";
}

function sign(userId: string): string {
  const secret = getSecret();
  const sig = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const [userId, sig] = token.split(".");
  if (!userId || !sig) return null;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(userId)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}

export async function getCurrentUser(): Promise<User | null> {
  const store = cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifyToken(token);
  if (!userId) return null;
  const users = await readUsers();
  return users.find((u) => u.id === userId) ?? null;
}

export async function createSession(userId: string): Promise<void> {
  const store = cookies();
  const token = sign(userId);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession(): void {
  const store = cookies();
  store.delete(SESSION_COOKIE);
}