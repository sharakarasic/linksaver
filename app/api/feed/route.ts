import { NextResponse } from "next/server";
import { readLinks, readUsers } from "@/lib/storage";
import type { FeedLink, SavedLink, TagEntry, User } from "@/app/types";

export async function GET() {
  const [allLinks, users] = await Promise.all([readLinks(), readUsers()]);

  const userById = new Map<string, User>();
  for (const u of users) {
    userById.set(u.id, u);
  }

  const visible: FeedLink[] = [];

  for (const link of allLinks) {
    const owner = userById.get(link.ownerId);
    if (!owner) continue;

    // Homepage shows only public links.
    if (link.isPrivate) continue;

    let tags: TagEntry[] = link.tags;
    // Hide private tags from the public feed.
    tags = link.tags.filter((t) => !t.isPrivate);

    const withOwner: FeedLink = {
      ...link,
      tags,
      ownerUsername: owner.username,
    };
    visible.push(withOwner);
  }

  visible.sort(
    (a: SavedLink, b: SavedLink) => b.createdAt - a.createdAt
  );

  return NextResponse.json({ links: visible });
}

