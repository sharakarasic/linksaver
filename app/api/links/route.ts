import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { readLinks, writeLinks } from "@/lib/storage";
import type { SavedLink, TagEntry } from "@/app/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await readLinks();
  const mine = links.filter((l) => l.ownerId === user.id);
  return NextResponse.json({ links: mine }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const rawUrl =
      typeof body.url === "string" ? body.url.trim() : "";
    const rawTitle =
      typeof body.title === "string" ? body.title.trim() : "";
    const tagsInput: unknown = body.tags;
    const isPrivate: boolean = Boolean(body.isPrivate);

    if (!rawUrl) {
      return NextResponse.json(
        { error: "URL is required." },
        { status: 400 }
      );
    }

    let url = rawUrl;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const tagNames: string[] = Array.isArray(tagsInput)
      ? Array.from(
          new Set(
            (tagsInput as unknown[])
              .map((t) => (typeof t === "string" ? t.trim() : ""))
              .filter(Boolean)
          )
        )
      : [];

    const tags: TagEntry[] = tagNames.map((name) => ({
      name,
      isPrivate: false,
    }));

    const links = await readLinks();

    const link: SavedLink = {
      id: crypto.randomUUID(),
      ownerId: user.id,
      url,
      title: rawTitle || undefined,
      tags,
      isPrivate, // default false when checkbox is unchecked
      createdAt: Date.now(),
    };

    links.push(link);
    await writeLinks(links);

    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    console.error("LINKS POST ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}