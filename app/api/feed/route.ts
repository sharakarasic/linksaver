export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { readLinks, readUsers } from "@/lib/storage";
import type { FeedLink, SavedLink, TagEntry, User } from "@/app/types";

export async function GET() {
  try {
    const [allLinks, users] = await Promise.all([readLinks(), readUsers()]);

    const userById = new Map<string, User>();
    for (const u of users) {
      userById.set(u.id, u);
    }

    const visible: FeedLink[] = [];

    for (const link of allLinks) {
      const owner = userById.get(link.ownerId);
      if (!owner) continue;

      if (link.isPrivate) continue;

      const tags: TagEntry[] = link.tags.filter((t) => !t.isPrivate);

      visible.push({
        ...link,
        tags,
        ownerUsername: owner.username,
      });
    }

    visible.sort((a: SavedLink, b: SavedLink) => b.createdAt - a.createdAt);

    return NextResponse.json({ links: visible });
  } catch (err: any) {
    console.error("FEED ERROR", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

