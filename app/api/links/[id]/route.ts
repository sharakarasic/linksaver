import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readLinks, writeLinks } from "@/lib/storage";
import type { SavedLink, TagEntry } from "@/app/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await readLinks();
  let link = links.find((l) => l.id === params.id) as SavedLink | undefined;
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Legacy links might not have an ownerId or proper tag objects yet.
  if (!link.ownerId) {
    link.ownerId = user.id;
  } else if (link.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Normalize legacy string[] tags into TagEntry[]
  if (
    Array.isArray((link as any).tags) &&
    ((link as any).tags.length === 0 ||
      typeof (link as any).tags[0] === "string")
  ) {
    const names = ((link as any).tags as string[]).map((t) => t.trim()).filter(Boolean);
    link.tags = names.map<TagEntry>((name) => ({ name, isPrivate: false }));
  }

  const body = await req.json().catch(() => ({}));

  // Update title if provided
  if (typeof body.title === "string") {
    const trimmed = body.title.trim();
    if (trimmed) {
      (link as any).title = trimmed;
    } else {
      delete (link as any).title;
    }
  }

  // Toggle link privacy
  if (typeof body.isPrivate === "boolean") {
    link.isPrivate = body.isPrivate;
  }

  // Add tags: body.addTags: string[]
  if (Array.isArray(body.addTags)) {
    const newNames: string[] = body.addTags
      .map((t: any) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean);
    for (const name of newNames) {
      if (!link.tags.some((t) => t.name === name)) {
        link.tags.push({ name, isPrivate: false });
      }
    }
  }

  // Remove one tag by name
  if (typeof body.removeTag === "string") {
    link.tags = link.tags.filter((t) => t.name !== body.removeTag);
  }

  // Set tag privacy: { name, isPrivate }
  if (body.setTagPrivacy && typeof body.setTagPrivacy.name === "string") {
    const target = link.tags.find((t) => t.name === body.setTagPrivacy.name);
    if (target && typeof body.setTagPrivacy.isPrivate === "boolean") {
      target.isPrivate = body.setTagPrivacy.isPrivate;
    }
  }

  await writeLinks(links);
  return NextResponse.json({ link });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await readLinks();
  const filtered = links.filter(
    (l) => !(l.id === params.id && l.ownerId === user.id)
  );
  if (filtered.length === links.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeLinks(filtered);
  return NextResponse.json({ ok: true });
}