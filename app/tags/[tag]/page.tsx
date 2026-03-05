import type { Metadata } from "next";
import Link from "next/link";
import { readLinks, readUsers } from "@/lib/storage";
import type { FeedLink, SavedLink, TagEntry, User } from "@/app/types";

interface Params {
  tag: string;
}

function normalizeTagName(t: string) {
  return t.trim().toLowerCase();
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const decoded = decodeURIComponent(params.tag);
  return {
    title: `Links tagged "${decoded}"`,
  };
}

export default async function TagPage({ params }: { params: Params }) {
  const decoded = decodeURIComponent(params.tag);
  const key = normalizeTagName(decoded);

  const [allLinks, users] = await Promise.all([readLinks(), readUsers()]);

  const userById = new Map<string, User>();
  for (const u of users) {
    userById.set(u.id, u);
  }

  const visible: FeedLink[] = [];

  for (const link of allLinks) {
    const owner = userById.get(link.ownerId);
    if (!owner) continue;

    // Only public links appear on tag pages.
    if (link.isPrivate) continue;

    // Require a non-private tag matching this tag (case-insensitive).
    const publicMatchingTag = link.tags.find(
      (t) => !t.isPrivate && normalizeTagName(t.name) === key
    );
    if (!publicMatchingTag) continue;

    const publicTags: TagEntry[] = link.tags.filter((t) => !t.isPrivate);

    const withOwner: FeedLink = {
      ...link,
      tags: publicTags,
      ownerUsername: owner.username,
    };
    visible.push(withOwner);
  }

  visible.sort((a: SavedLink, b: SavedLink) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Links tagged &quot;{decoded}&quot;
          </h1>
          <p className="mt-1 text-[var(--muted)] text-sm">
            Showing public links that use this tag.
          </p>
        </div>
        <Link
          href="/"
          className="self-start px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          Back to home
        </Link>
      </header>

      {visible.length === 0 ? (
        <p className="text-[var(--muted)] py-8">
          No public links found for this tag.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((link) => (
            <li
              key={link.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
            >
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-[var(--accent)] hover:underline"
                >
                  {link.url}
                </a>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Added by{" "}
                  <Link
                    href={`/${link.ownerUsername}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {link.ownerUsername}
                  </Link>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {link.tags.map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/tags/${encodeURIComponent(tag.name)}`}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--tag-bg)] text-[var(--accent)] hover:underline"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

