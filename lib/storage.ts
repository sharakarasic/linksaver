import crypto from "crypto";
import type { User, SavedLink } from "@/app/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * NOTE:
 * This implementation preserves your existing API:
 * - readUsers() returns User[]
 * - writeUsers(users) replaces ALL users (like writing users.json)
 * - readLinks() returns SavedLink[]
 * - writeLinks(links) replaces ALL links (like writing links.json)
 *
 * This is "launch-ready" for persistence with minimal refactor.
 */

export async function readUsers(): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("data")
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Each row stores the whole User object in data
  const users = (data ?? []).map((row: any) => row.data) as User[];
  return Array.isArray(users) ? users : [];
}

export async function writeUsers(users: User[]): Promise<void> {
  // Replace-all semantics, matching your JSON file behavior
  const del = await supabaseAdmin.from("users").delete().neq("id", "");
  if (del.error) throw del.error;

  if (!users.length) return;

  const rows = users.map((u: any) => ({
    id: String(u.id),
    data: u,
  }));

  const ins = await supabaseAdmin.from("users").insert(rows);
  if (ins.error) throw ins.error;
}

export async function readLinks(): Promise<SavedLink[]> {
  const { data, error } = await supabaseAdmin
    .from("links")
    .select("data")
    // If your SavedLink has createdAt as a number, we can’t sort by that reliably in SQL.
    // We'll sort in memory after returning (same as you did before).
    .order("created_at", { ascending: true });

  if (error) throw error;

  const links = (data ?? []).map((row: any) => row.data) as SavedLink[];
  return Array.isArray(links) ? links : [];
}

export async function writeLinks(links: SavedLink[]): Promise<void> {
  // Replace-all semantics, matching your JSON file behavior
  const del = await supabaseAdmin.from("links").delete().neq("id", "");
  if (del.error) throw del.error;

  if (!links.length) return;

  const rows = links.map((l: any) => ({
    id: String(l.id),
    owner_id: l.ownerId ?? null,
    is_private: !!l.isPrivate,
    // Store the entire object
    data: l,
    // Keep a useful timestamp for querying (fallback to now)
    created_at: l.createdAt ? new Date(l.createdAt) : new Date(),
  }));

  const ins = await supabaseAdmin.from("links").insert(rows);
  if (ins.error) throw ins.error;
}

export function createId(): string {
  return crypto.randomUUID();
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}