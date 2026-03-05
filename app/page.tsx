"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeedLink, PublicUser, TagEntry } from "./types";

type LinksByTag = Record<string, FeedLink[]>;

type LinksByTag = Record<string, FeedLink[]>;

// Accepts TagEntry | string | anything, returns a normalized key or "".
function normalizeTagName(input: any): string {
  const raw =
    typeof input === "string"
      ? input
      : typeof input?.name === "string"
      ? input.name
      : "";

  return raw.trim().toLowerCase();
}

// Ensures link.tags is always TagEntry[] (handles ["news"] and [{name,...}])
function normalizeTags(tags: any[]): TagEntry[] {
  return (Array.isArray(tags) ? tags : [])
    .map((t) =>
      typeof t === "string"
        ? ({ name: t, isPrivate: false } as TagEntry)
        : (t as TagEntry)
    )
    .filter((t) => typeof t?.name === "string" && t.name.trim().length > 0);
}

function groupLinksByTag(links: FeedLink[]): LinksByTag {
  const byTag: LinksByTag = {};
  for (const link of links) {
    const tags = normalizeTags((link as any).tags);
    for (const tag of tags) {
      const key = normalizeTagName(tag);
      if (!key) continue;
      if (!byTag[key]) byTag[key] = [];
      byTag[key].push({
        ...link,
        // keep normalized tags so the UI doesn't crash later
        tags,
      } as FeedLink);
    }
  }
  for (const key of Object.keys(byTag)) {
    byTag[key].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }
  return byTag;
}

function getAllTagsFromLinks(links: FeedLink[]): string[] {
  const set = new Set<string>();
  for (const link of links) {
    const tags = normalizeTags((link as any).tags);
    for (const tag of tags) {
      const key = normalizeTagName(tag);
      if (key) set.add(key);
    }
  }
  return Array.from(set).sort();
}

function formatCreatedAtPT(createdAt: number | string): string {
  const d =
    typeof createdAt === "number"
      ? new Date(createdAt)
      : new Date(createdAt as string);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

async function apiJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof (data as any).error === "string") {
        message = (data as any).error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [links, setLinks] = useState<FeedLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [linkIsPrivate, setLinkIsPrivate] = useState(false);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [addingTagLinkId, setAddingTagLinkId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState("");
  const [showLoginModule, setShowLoginModule] = useState(false);
  const [editingTitleLinkId, setEditingTitleLinkId] = useState<string | null>(
    null
  );
  const [editingTitleValue, setEditingTitleValue] = useState("");

  useEffect(() => {
    const loadMe = async () => {
      try {
        const data = await apiJson<{ user: PublicUser | null }>("/api/me");
        setCurrentUser(data.user);
      } catch {
        // ignore
      } finally {
        setCheckingUser(false);
      }
    };
    loadMe();
  }, []);

  const loadFeed = async () => {
    setLinksLoading(true);
    setLinksError(null);
    try {
      const data = await apiJson<{ links: FeedLink[] }>("/api/feed");
      setLinks(data.links);
    } catch (err: any) {
      setLinksError(err.message || "Failed to load links.");
    } finally {
      setLinksLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const byTag: LinksByTag = useMemo(
    () => groupLinksByTag(links),
    [links]
  );
  const allTags: string[] = useMemo(
    () => getAllTagsFromLinks(links),
    [links]
  );

  const displayedLinks = useMemo(() => {
    if (!selectedTag) {
      return links.slice().sort((a, b) => b.createdAt - a.createdAt);
    }
    return byTag[selectedTag] ?? [];
  }, [links, byTag, selectedTag]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const user = await apiJson<PublicUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      setCurrentUser(user);
      setLoginPassword("");
      setShowLoginModule(false);
      await loadFeed();
    } catch (err: any) {
      setAuthError(err.message || "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setCurrentUser(null);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const rawUrl = url.trim();
    if (!rawUrl) return;

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await apiJson("/api/links", {
        method: "POST",
        body: JSON.stringify({
          url: rawUrl,
          tags,
          isPrivate: linkIsPrivate,
        }),
      });
      setUrl("");
      setTagInput("");
      setLinkIsPrivate(false);
      await loadFeed();
    } catch (err: any) {
      setLinksError(err.message || "Failed to add link.");
    }
  };

  const updateLink = async (id: string, body: any) => {
    try {
      await apiJson(`/api/links/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await loadFeed();
    } catch (err: any) {
      setLinksError(err.message || "Failed to update link.");
    }
  };

  const handleRemoveLink = async (id: string) => {
    if (!confirm("Remove this link?")) return;
    try {
      await apiJson(`/api/links/${id}`, { method: "DELETE" });
      await loadFeed();
    } catch (err: any) {
      setLinksError(err.message || "Failed to remove link.");
    }
  };

  const handleRemoveTag = async (linkId: string, tagName: string) => {
    if (!confirm(`Remove tag "${tagName}" from this link?`)) return;
    await updateLink(linkId, { removeTag: tagName });
  };

  const handleAddTagToLink = async (linkId: string) => {
    const raw = newTagValue.trim();
    if (!raw) {
      setAddingTagLinkId(null);
      setNewTagValue("");
      return;
    }
    const tags = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await updateLink(linkId, { addTags: tags });
    setAddingTagLinkId(null);
    setNewTagValue("");
  };

  const handleToggleLinkPrivacy = async (link: FeedLink) => {
    await updateLink(link.id, { isPrivate: !link.isPrivate });
  };

  const handleToggleTagPrivacy = async (linkId: string, tag: TagEntry) => {
    await updateLink(linkId, {
      setTagPrivacy: { name: tag.name, isPrivate: !tag.isPrivate },
    });
  };

  const handleStartEditTitle = (link: FeedLink) => {
    setEditingTitleLinkId(link.id);
    setEditingTitleValue(link.title || "");
  };

  const handleSaveTitle = async (link: FeedLink) => {
    const newTitle = editingTitleValue.trim();
    await updateLink(link.id, { title: newTitle });
    setEditingTitleLinkId(null);
    setEditingTitleValue("");
  };

  const handleCancelEditTitle = () => {
    setEditingTitleLinkId(null);
    setEditingTitleValue("");
  };

  if (checkingUser && linksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            LinkSaver
          </h1>
          <p className="mt-1 text-[var(--muted)] text-sm">
            Most recent public links from everyone. Log in to add your own.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <Link
                href={`/${currentUser.username}`}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                Profile: {currentUser.username}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginModule((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              Login / Register
            </button>
          )}
        </div>
      </header>

      {!currentUser && showLoginModule && (
        <section className="mb-8 max-w-md">
          {authError && (
            <p className="mb-3 text-sm text-red-400">{authError}</p>
          )}
          <form
            onSubmit={handleLogin}
            className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          >
            <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
              Login
            </h2>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-sm font-medium text-[var(--muted)] mb-1.5"
                >
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="alice"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[#b0b0b8] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-[var(--muted)] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[#b0b0b8] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors"
                disabled={authLoading}
              >
                {authLoading ? "Signing in…" : "Sign in"}
              </button>
            </div>
            <p className="mt-4 text-xs text-[var(--muted)]">
              Don&apos;t have an account?{" "}
              <Link
                href="/login"
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Register
              </Link>
            </p>
          </form>
        </section>
      )}

      {currentUser && (
        <section className="mb-8 p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <form onSubmit={handleAddLink} className="space-y-4">
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-[var(--muted)] mb-1.5"
              >
                Link URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-[var(--muted)] mb-1.5"
              >
                Tags (comma separated; spaces allowed in a tag)
              </label>
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="work, reading, to read later"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkIsPrivate}
                  onChange={(e) => setLinkIsPrivate(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span>Private link</span>
              </label>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors"
                disabled={linksLoading}
              >
                Add link
              </button>
            </div>
            {linksError && (
              <p className="text-sm text-red-400">{linksError}</p>
            )}
          </form>
        </section>
      )}

      <div className="flex flex-col sm:flex-row gap-8">
        <aside className="sm:w-56 shrink-0">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            Browse by tag
          </h2>
          {allTags.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No tags yet.</p>
          ) : (
            <ul className="flex flex-wrap sm:flex-col gap-2">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTag === null
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]"
                  }`}
                >
                  All links
                </button>
              </li>
              {allTags.map((tagKey) => (
                <li key={tagKey}>
                  <button
                    type="button"
                    onClick={() => setSelectedTag(tagKey)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedTag === tagKey
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <span>{tagKey}</span>
                    <span className="text-[var(--muted)]">
                      ({byTag[tagKey]?.length ?? 0})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            {selectedTag ? `Tag: ${selectedTag}` : "Most recent public links"}
          </h2>
          {linksLoading && (
            <p className="text-[var(--muted)] mb-3 text-sm">
              Loading links…
            </p>
          )}
          {displayedLinks.length === 0 ? (
            <p className="text-[var(--muted)] py-8">
              {selectedTag
                ? `No links with tag "${selectedTag}".`
                : "No links yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {displayedLinks.map((link) => {
                const isOwner =
                  !!currentUser && link.ownerId === currentUser.id;
                return (
                  <li
                    key={link.id}
                    className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] group"
                  >
                    {/* Top: title, URL and meta */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="text-[0.7rem] uppercase tracking-wide text-[var(--muted)]">
                          {editingTitleLinkId === link.id ? (
                            <input
                              type="text"
                              value={editingTitleValue}
                              onChange={(e) => setEditingTitleValue(e.target.value)}
                              className="px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[0.7rem] text-white"
                              placeholder="Title"
                            />
                          ) : (
                            <span>
                              {typeof link.title === "string" && link.title.trim().length > 0
  ? link.title.trim()
  : "Link"}
                            </span>
                          )}
                        </div>
                        {isOwner && (
                          <>
                            {editingTitleLinkId === link.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveTitle(link)}
                                  className="text-[0.7rem] text-[var(--accent)] hover:underline"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditTitle}
                                  className="text-[0.7rem] text-[var(--muted)] hover:underline"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditTitle(link)}
                                className="text-[0.7rem] text-[var(--muted)] hover:underline"
                              >
                                Edit title
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-[var(--accent)] hover:underline"
                      >
                        {link.url}
                      </a>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
                        <span>
                          Added by{" "}
                          <Link
                            href={`/${link.ownerUsername}`}
                            className="font-medium text-[var(--accent)] hover:underline"
                          >
                            {link.ownerUsername}
                          </Link>
                        </span>
                        <span className="text-[0.65rem]">
                          · {formatCreatedAtPT(link.createdAt as any)}
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleToggleLinkPrivacy(link)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                          >
                            {link.isPrivate ? "Private link" : "Public link"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom: tags and actions */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap justify-start">
                      {link.tags.map((tag) => (
                        <span
                          key={tag.name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--tag-bg)] text-[var(--accent)] group/tag"
                        >
                          {tag.name}
                          {isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleTagPrivacy(link.id, tag)
                                }
                                className="px-1 py-0.5 rounded text-[var(--muted)] hover:bg-[var(--accent)] hover:text-white transition-colors text-[0.7rem]"
                                aria-label={
                                  tag.isPrivate
                                    ? `Make tag ${tag.name} public`
                                    : `Make tag ${tag.name} private`
                                }
                              >
                                {tag.isPrivate ? "🔒" : "🌐"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveTag(link.id, tag.name)
                                }
                                className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-[var(--accent)] hover:text-white transition-opacity"
                                aria-label={`Remove tag ${tag.name}`}
                              >
                                ×
                              </button>
                            </>
                          )}
                        </span>
                      ))}
                      {isOwner && (
                        <>
                          {addingTagLinkId === link.id ? (
                            <span className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                value={newTagValue}
                                onChange={(e) => setNewTagValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddTagToLink(link.id);
                                  }
                                  if (e.key === "Escape") {
                                    setAddingTagLinkId(null);
                                    setNewTagValue("");
                                  }
                                }}
                                placeholder="New tag"
                                className="w-24 px-2 py-0.5 rounded text-xs bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleAddTagToLink(link.id)}
                                className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingTagLinkId(null);
                                  setNewTagValue("");
                                }}
                                className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text)]"
                                aria-label="Cancel"
                              >
                                ×
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAddingTagLinkId(link.id);
                                setNewTagValue("");
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                            >
                              + Add tag
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(link.id)}
                            className="opacity-60 hover:opacity-100 px-1.5 py-0.5 rounded text-xs text-[var(--muted)] hover:text-red-400 transition-opacity"
                            aria-label="Remove link"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>

      <footer className="mt-10 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          &copy; 2026{" "}
          <a
            href="https://www.linkedin.com/in/sharakarasic"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline font-medium"
          >
            Shara Karasic
          </a>
        </span>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeedLink, PublicUser, TagEntry } from "./types";

type LinksByTag = Record<string, FeedLink[]>;

function normalizeTagName(t: string) {
  return t.trim().toLowerCase();
}

function groupLinksByTag(links: FeedLink[]): LinksByTag {
  const byTag: LinksByTag = {};
  for (const link of links) {
    for (const tag of link.tags) {
      const key = normalizeTagName(tag.name);
      if (!key) continue;
      if (!byTag[key]) byTag[key] = [];
      byTag[key].push(link);
    }
  }
  for (const key of Object.keys(byTag)) {
    byTag[key].sort((a, b) => b.createdAt - a.createdAt);
  }
  return byTag;
}

function getAllTagsFromLinks(links: FeedLink[]): string[] {
  const set = new Set<string>();
  for (const link of links) {
    for (const tag of link.tags) {
      const key = normalizeTagName(tag.name);
      if (key) set.add(key);
    }
  }
  return Array.from(set).sort();
}

function formatCreatedAtPT(createdAt: number | string): string {
  const d =
    typeof createdAt === "number"
      ? new Date(createdAt)
      : new Date(createdAt as string);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

async function apiJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof (data as any).error === "string") {
        message = (data as any).error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [links, setLinks] = useState<FeedLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [linkIsPrivate, setLinkIsPrivate] = useState(false);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [addingTagLinkId, setAddingTagLinkId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState("");
  const [showLoginModule, setShowLoginModule] = useState(false);
  const [editingTitleLinkId, setEditingTitleLinkId] = useState<string | null>(
    null
  );
  const [editingTitleValue, setEditingTitleValue] = useState("");

  useEffect(() => {
    const loadMe = async () => {
      try {
        const data = await apiJson<{ user: PublicUser | null }>("/api/me");
        setCurrentUser(data.user);
      } catch {
        // ignore
      } finally {
        setCheckingUser(false);
      }
    };
    loadMe();
  }, []);

  const loadFeed = async () => {
    setLinksLoading(true);
    setLinksError(null);
    try {
      const data = await apiJson<{ links: FeedLink[] }>("/api/feed");
      setLinks(data.links);
    } catch (err: any) {
      setLinksError(err.message || "Failed to load links.");
    } finally {
      setLinksLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const byTag: LinksByTag = useMemo(
    () => groupLinksByTag(links),
    [links]
  );
  const allTags: string[] = useMemo(
    () => getAllTagsFromLinks(links),
    [links]
  );

  const displayedLinks = useMemo(() => {
    if (!selectedTag) {
      return links.slice().sort((a, b) => b.createdAt - a.createdAt);
    }
    return byTag[selectedTag] ?? [];
  }, [links, byTag, selectedTag]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const user = await apiJson<PublicUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      setCurrentUser(user);
      setLoginPassword("");
      setShowLoginModule(false);
      await loadFeed();
    } catch (err: any) {
      setAuthError(err.message || "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setCurrentUser(null);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const rawUrl = url.trim();
    if (!rawUrl) return;

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await apiJson("/api/links", {
        method: "POST",
        body: JSON.stringify({
          url: rawUrl,
          tags,
          isPrivate: linkIsPrivate,
        }),
      });
      setUrl("");
      setTagInput("");
      setLinkIsPrivate(false);
      await loadFeed();
    } catch (err: any) {
      setLinksError(err.message || "Failed to add link.");
    }
  };

  const updateLink = async (id: string, body: any) => {
    try {
      await apiJson(`/api/links/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await loadFeed();
    } catch (err: any) {
      setLinksError(err.message || "Failed to update link.");
    }
  };

  const handleRemoveLink = async (id: string) => {
    if (!confirm("Remove this link?")) return;
    try {
      await apiJson(`/api/links/${id}`, { method: "DELETE" });
      await loadFeed();
    } catch (err: any) {
      setLinksError(err.message || "Failed to remove link.");
    }
  };

  const handleRemoveTag = async (linkId: string, tagName: string) => {
    if (!confirm(`Remove tag "${tagName}" from this link?`)) return;
    await updateLink(linkId, { removeTag: tagName });
  };

  const handleAddTagToLink = async (linkId: string) => {
    const raw = newTagValue.trim();
    if (!raw) {
      setAddingTagLinkId(null);
      setNewTagValue("");
      return;
    }
    const tags = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await updateLink(linkId, { addTags: tags });
    setAddingTagLinkId(null);
    setNewTagValue("");
  };

  const handleToggleLinkPrivacy = async (link: FeedLink) => {
    await updateLink(link.id, { isPrivate: !link.isPrivate });
  };

  const handleToggleTagPrivacy = async (linkId: string, tag: TagEntry) => {
    await updateLink(linkId, {
      setTagPrivacy: { name: tag.name, isPrivate: !tag.isPrivate },
    });
  };

  const handleStartEditTitle = (link: FeedLink) => {
    setEditingTitleLinkId(link.id);
    setEditingTitleValue(link.title || "");
  };

  const handleSaveTitle = async (link: FeedLink) => {
    const newTitle = editingTitleValue.trim();
    await updateLink(link.id, { title: newTitle });
    setEditingTitleLinkId(null);
    setEditingTitleValue("");
  };

  const handleCancelEditTitle = () => {
    setEditingTitleLinkId(null);
    setEditingTitleValue("");
  };

  if (checkingUser && linksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            LinkSaver
          </h1>
          <p className="mt-1 text-[var(--muted)] text-sm">
            Most recent public links from everyone. Log in to add your own.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <Link
                href={`/${currentUser.username}`}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                Profile: {currentUser.username}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginModule((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              Login / Register
            </button>
          )}
        </div>
      </header>

      {!currentUser && showLoginModule && (
        <section className="mb-8 max-w-md">
          {authError && (
            <p className="mb-3 text-sm text-red-400">{authError}</p>
          )}
          <form
            onSubmit={handleLogin}
            className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
          >
            <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
              Login
            </h2>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-sm font-medium text-[var(--muted)] mb-1.5"
                >
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="alice"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[#b0b0b8] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-[var(--muted)] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[#b0b0b8] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors"
                disabled={authLoading}
              >
                {authLoading ? "Signing in…" : "Sign in"}
              </button>
            </div>
            <p className="mt-4 text-xs text-[var(--muted)]">
              Don&apos;t have an account?{" "}
              <Link
                href="/login"
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Register
              </Link>
            </p>
          </form>
        </section>
      )}

      {currentUser && (
        <section className="mb-8 p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <form onSubmit={handleAddLink} className="space-y-4">
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-[var(--muted)] mb-1.5"
              >
                Link URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-[var(--muted)] mb-1.5"
              >
                Tags (comma separated; spaces allowed in a tag)
              </label>
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="work, reading, to read later"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkIsPrivate}
                  onChange={(e) => setLinkIsPrivate(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span>Private link</span>
              </label>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors"
                disabled={linksLoading}
              >
                Add link
              </button>
            </div>
            {linksError && (
              <p className="text-sm text-red-400">{linksError}</p>
            )}
          </form>
        </section>
      )}

      <div className="flex flex-col sm:flex-row gap-8">
        <aside className="sm:w-56 shrink-0">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            Browse by tag
          </h2>
          {allTags.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No tags yet.</p>
          ) : (
            <ul className="flex flex-wrap sm:flex-col gap-2">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTag === null
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]"
                  }`}
                >
                  All links
                </button>
              </li>
              {allTags.map((tagKey) => (
                <li key={tagKey}>
                  <button
                    type="button"
                    onClick={() => setSelectedTag(tagKey)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedTag === tagKey
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <span>{tagKey}</span>
                    <span className="text-[var(--muted)]">
                      ({byTag[tagKey]?.length ?? 0})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            {selectedTag ? `Tag: ${selectedTag}` : "Most recent public links"}
          </h2>
          {linksLoading && (
            <p className="text-[var(--muted)] mb-3 text-sm">
              Loading links…
            </p>
          )}
          {displayedLinks.length === 0 ? (
            <p className="text-[var(--muted)] py-8">
              {selectedTag
                ? `No links with tag "${selectedTag}".`
                : "No links yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {displayedLinks.map((link) => {
                const isOwner =
                  !!currentUser && link.ownerId === currentUser.id;
                return (
                  <li
                    key={link.id}
                    className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] group"
                  >
                    {/* Top: title, URL and meta */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="text-[0.7rem] uppercase tracking-wide text-[var(--muted)]">
                          {editingTitleLinkId === link.id ? (
                            <input
                              type="text"
                              value={editingTitleValue}
                              onChange={(e) => setEditingTitleValue(e.target.value)}
                              className="px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[0.7rem] text-white"
                              placeholder="Title"
                            />
                          ) : (
                            <span>
                              {link.title && link.title.trim().length > 0
                                ? link.title
                                : "Link"}
                            </span>
                          )}
                        </div>
                        {isOwner && (
                          <>
                            {editingTitleLinkId === link.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveTitle(link)}
                                  className="text-[0.7rem] text-[var(--accent)] hover:underline"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditTitle}
                                  className="text-[0.7rem] text-[var(--muted)] hover:underline"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditTitle(link)}
                                className="text-[0.7rem] text-[var(--muted)] hover:underline"
                              >
                                Edit title
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-[var(--accent)] hover:underline"
                      >
                        {link.url}
                      </a>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
                        <span>
                          Added by{" "}
                          <Link
                            href={`/${link.ownerUsername}`}
                            className="font-medium text-[var(--accent)] hover:underline"
                          >
                            {link.ownerUsername}
                          </Link>
                        </span>
                        <span className="text-[0.65rem]">
                          · {formatCreatedAtPT(link.createdAt as any)}
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleToggleLinkPrivacy(link)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                          >
                            {link.isPrivate ? "Private link" : "Public link"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom: tags and actions */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap justify-start">
                    {normalizeTags((link as any).tags).map((tag) => (
  <span
    key={tag.name}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--tag-bg)] text-[var(--accent)] group/tag"
  >
    {tag.name}
    {isOwner && (
      <>
        <button
          type="button"
          onClick={() => handleToggleTagPrivacy(link.id, tag)}
          className="px-1 py-0.5 rounded text-[var(--muted)] hover:bg-[var(--accent)] hover:text-white transition-colors text-[0.7rem]"
          aria-label={
            tag.isPrivate
              ? `Make tag ${tag.name} public`
              : `Make tag ${tag.name} private`
          }
        >
          {tag.isPrivate ? "🔒" : "🌐"}
        </button>
        <button
          type="button"
          onClick={() => handleRemoveTag(link.id, tag.name)}
          className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-[var(--accent)] hover:text-white transition-opacity"
          aria-label={`Remove tag ${tag.name}`}
        >
          ×
        </button>
      </>
    )}
  </span>
))}
                      ))}
                      {isOwner && (
                        <>
                          {addingTagLinkId === link.id ? (
                            <span className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                value={newTagValue}
                                onChange={(e) => setNewTagValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddTagToLink(link.id);
                                  }
                                  if (e.key === "Escape") {
                                    setAddingTagLinkId(null);
                                    setNewTagValue("");
                                  }
                                }}
                                placeholder="New tag"
                                className="w-24 px-2 py-0.5 rounded text-xs bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleAddTagToLink(link.id)}
                                className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingTagLinkId(null);
                                  setNewTagValue("");
                                }}
                                className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text)]"
                                aria-label="Cancel"
                              >
                                ×
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAddingTagLinkId(link.id);
                                setNewTagValue("");
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                            >
                              + Add tag
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(link.id)}
                            className="opacity-60 hover:opacity-100 px-1.5 py-0.5 rounded text-xs text-[var(--muted)] hover:text-red-400 transition-opacity"
                            aria-label="Remove link"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>

      <footer className="mt-10 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          &copy; 2026{" "}
          <a
            href="https://www.linkedin.com/in/sharakarasic"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline font-medium"
          >
            Shara Karasic
          </a>
        </span>
      </footer>
    </div>
  );
}

