"use client";

import Link from "next/link";
import { useState } from "react";
import type { SavedLink } from "../types";

interface Props {
  initialLinks: SavedLink[];
  isOwner: boolean;
}

async function apiJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
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

export default function UserLinksClient({ initialLinks, isOwner }: Props) {
  const [links, setLinks] = useState<SavedLink[]>(initialLinks);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  const startEditTitle = (link: SavedLink) => {
    if (!isOwner) return;
    setEditingTitleId(link.id);
    setEditingTitleValue(link.title || "");
  };

  const cancelEditTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue("");
  };

  const saveTitle = async (link: SavedLink) => {
    if (!isOwner) return;
    const title = editingTitleValue.trim();
    try {
      await apiJson(`/api/links/${link.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id
            ? {
                ...l,
                title,
              }
            : l
        )
      );
      setEditingTitleId(null);
      setEditingTitleValue("");
    } catch (err: any) {
      alert(err.message || "Failed to update title.");
    }
  };

  const handleDelete = async (link: SavedLink) => {
    if (!isOwner) return;
    if (!confirm("Remove this link?")) return;
    try {
      await apiJson(`/api/links/${link.id}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch (err: any) {
      alert(err.message || "Failed to remove link.");
    }
  };

  if (links.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li
          key={link.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] group"
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <div className="text-[0.7rem] uppercase tracking-wide text-[var(--muted)]">
                {editingTitleId === link.id ? (
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
                  {editingTitleId === link.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveTitle(link)}
                        className="text-[0.7rem] text-[var(--accent)] hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditTitle}
                        className="text-[0.7rem] text-[var(--muted)] hover:underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditTitle(link)}
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
            {isOwner && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {link.isPrivate ? "Private link" : "Public link"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {(isOwner ? link.tags : link.tags.filter((t) => !t.isPrivate)).map(
              (tag) => (
                <Link
                  key={tag.name}
                  href={`/tags/${encodeURIComponent(tag.name)}`}
                  className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--tag-bg)] text-[var(--accent)] hover:underline"
                >
                  {tag.name}
                  {isOwner && tag.isPrivate && (
                    <span className="ml-1 text-[0.7rem] text-[var(--muted)]">
                      (private)
                    </span>
                  )}
                </Link>
              )
            )}
            {isOwner && (
              <button
                type="button"
                onClick={() => handleDelete(link)}
                className="opacity-60 hover:opacity-100 p-0.5 rounded hover:bg-[var(--accent)] hover:text-white transition-opacity text-xs"
                aria-label="Delete link"
              >
                ×
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

