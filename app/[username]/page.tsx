import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readUsers, readLinks } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import type { SavedLink } from "../types";
import PasswordForm from "./PasswordForm";
import UserLinksClient from "./UserLinksClient";

interface Params {
  username: string;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const username = params.username.toLowerCase();
  return {
    title: `${username}'s links`,
  };
}

export default async function UserPage({ params }: { params: Params }) {
  const username = params.username.toLowerCase();

  const [users, viewer, links] = await Promise.all([
    readUsers(),
    getCurrentUser(),
    readLinks(),
  ]);

  const user = users.find((u) => u.username === username);
  if (!user) return notFound();

  const isOwner = !!viewer && viewer.id === user.id;

  const allUserLinks: SavedLink[] = links
    .filter((l) => l.ownerId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const visibleLinks = isOwner
    ? allUserLinks
    : allUserLinks.filter((l) => !l.isPrivate);

  const tags = new Map<string, { count: number; hasPrivate: boolean }>();
  for (const link of allUserLinks) {
    for (const tag of link.tags) {
      if (!isOwner && tag.isPrivate) continue;
      const entry = tags.get(tag.name) ?? { count: 0, hasPrivate: false };
      entry.count += 1;
      entry.hasPrivate = entry.hasPrivate || tag.isPrivate;
      tags.set(tag.name, entry);
    }
  }

  const tagList = Array.from(tags.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            {isOwner ? "Your profile" : `${username}'s profile`}
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            {isOwner
              ? "You see your public and private links. Others only see your public links."
              : "Only public links and tags are shown."}
          </p>
          {isOwner && (
            <p className="mt-2 text-xs">
              <Link
                href={`/${username}/password`}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Update password
              </Link>
            </p>
          )}
        </div>
        <a
          href="/"
          className="self-start px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          Back to home
        </a>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
          Tags
        </h2>
        {tagList.length === 0 ? (
          <p className="text-[var(--muted)]">No tags yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagList.map(([name, info]) => (
              <Link
                key={name}
                href={`/tags/${encodeURIComponent(name)}`}
                className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--tag-bg)] text-[var(--accent)]"
              >
                {name}{" "}
                <span className="text-[var(--muted)]">({info.count})</span>
                {isOwner && info.hasPrivate && (
                  <span className="ml-1 text-[0.7rem] text-[var(--muted)]">
                    (some private)
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
          {isOwner ? "Your links" : "Public links"}
        </h2>
        {visibleLinks.length === 0 ? (
          <p className="text-[var(--muted)]">
            {isOwner ? "No links yet." : "No public links yet."}
          </p>
        ) : (
          <UserLinksClient initialLinks={visibleLinks} isOwner={isOwner} />
        )}
      </section>
    </div>
  );
}

