"use client";

import { useState, useEffect, useMemo } from "react";
import type { SavedLink, LinksByTag } from "./types";

const STORAGE_KEY = "caronpost-links";

function loadLinks(): SavedLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLinks(links: SavedLink[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function normalizeTag(t: string) {
  return t.trim().toLowerCase();
}

function groupLinksByTag(links: SavedLink[]): LinksByTag {
  const byTag: LinksByTag = {};
  for (const link of links) {
    if (link.tags.length === 0) {
      const key = "(no tag)";
      if (!byTag[key]) byTag[key] = [];
      byTag[key].push(link);
    } else {
      for (const tag of link.tags) {
        const key = normalizeTag(tag);
        if (!byTag[key]) byTag[key] = [];
        byTag[key].push(link);
      }
    }
  }
  // Sort links within each tag by addedAt desc
  for (const key of Object.keys(byTag)) {
    byTag[key].sort((a, b) => b.addedAt - a.addedAt);
  }
  return byTag;
}

function getAllTags(links: SavedLink[]): string[] {
  const set = new Set<string>();
  for (const link of links) {
    for (const tag of link.tags) {
      const key = normalizeTag(tag);
      if (key) set.add(key);
    }
  }
  return Array.from(set).sort();
}

export default function Home() {
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [url, setUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [addingTagLinkId, setAddingTagLinkId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState("");

  useEffect(() => {
    setLinks(loadLinks());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveLinks(links);
  }, [links, mounted]);

  const byTag = useMemo(() => groupLinksByTag(links), [links]);
  const allTags = useMemo(() => getAllTags(links), [links]);

  const displayedLinks = selectedTag
    ? byTag[selectedTag] ?? []
    : links.slice().sort((a, b) => b.addedAt - a.addedAt);

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = url.trim();
    if (!rawUrl) return;
    let href = rawUrl;
    if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
    const tagStrings = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const tags = [...new Set(tagStrings.map(normalizeTag))].filter(Boolean);
    const newLink: SavedLink = {
      id: crypto.randomUUID(),
      url: href,
      tags,
      addedAt: Date.now(),
    };
    setLinks((prev) => [newLink, ...prev]);
    setUrl("");
    setTagInput("");
  };

  const removeLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    if (selectedTag && displayedLinks.length <= 1) setSelectedTag(null);
  };

  const removeTag = (linkId: string, tag: string) => {
    if (!confirm(`Remove tag "${tag}" from this link?`)) return;
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId
          ? { ...l, tags: l.tags.filter((t) => t !== tag) }
          : l
      )
    );
  };

  const addTagToLink = (linkId: string) => {
    const raw = newTagValue.trim();
    if (!raw) {
      setAddingTagLinkId(null);
      setNewTagValue("");
      return;
    }
    const tagStrings = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const newTags = [...new Set(tagStrings.map(normalizeTag))].filter(Boolean);
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id !== linkId) return l;
        const combined = [...new Set([...l.tags, ...newTags])];
        return { ...l, tags: combined };
      })
    );
    setAddingTagLinkId(null);
    setNewTagValue("");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <header className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Link Tagging
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Paste a link, add tags, and browse by tag.
        </p>
      </header>

      <form
        onSubmit={addLink}
        className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-10"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-[var(--muted)] mb-1.5">
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
            <label htmlFor="tags" className="block text-sm font-medium text-[var(--muted)] mb-1.5">
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
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors"
          >
            Add link
          </button>
        </div>
      </form>

      <div className="flex flex-col sm:flex-row gap-8">
        <aside className="sm:w-52 shrink-0">
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
              {allTags.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedTag === tag
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <span>{tag}</span>
                    <span className="text-[var(--muted)]">({byTag[tag]?.length ?? 0})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            {selectedTag ? `Tag: ${selectedTag}` : "All links"}
          </h2>
          {displayedLinks.length === 0 ? (
            <p className="text-[var(--muted)] py-8">
              {selectedTag
                ? `No links with tag "${selectedTag}".`
                : "No links yet. Add one above."}
            </p>
          ) : (
            <ul className="space-y-2">
              {displayedLinks.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] group"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 truncate text-[var(--accent)] hover:underline"
                  >
                    {link.url}
                  </a>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {link.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--tag-bg)] text-[var(--accent)] group/tag"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(link.id, tag)}
                          className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-[var(--accent)] hover:text-white transition-opacity"
                          aria-label={`Remove tag ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {addingTagLinkId === link.id ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={newTagValue}
                          onChange={(e) => setNewTagValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addTagToLink(link.id);
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
                          onClick={() => addTagToLink(link.id)}
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
                      onClick={() => removeLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--muted)] hover:text-red-400 transition-opacity"
                      aria-label="Remove link"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
