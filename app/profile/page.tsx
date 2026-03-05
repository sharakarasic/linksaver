"use client";

import { useEffect, useState } from "react";
import type { PublicUser, SavedLink } from "../types";

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

export default function ProfilePage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await apiJson<{ user: PublicUser | null }>("/api/me");
        if (!me.user) {
          window.location.href = "/login";
          return;
        }
        setUser(me.user);
        const data = await apiJson<{ links: SavedLink[] }>("/api/links");
        setLinks(data.links);
      } catch (err: any) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordLoading(true);
    try {
      await apiJson<{ ok: boolean }>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordMessage(err.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading profile…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Profile
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Signed in as{" "}
            <span className="font-medium text-[var(--text)]">
              {user.username}
            </span>
            .
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Public links page:{" "}
            <a
              href={`/${user.username}`}
              className="font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--accent)] hover:underline"
            >
              /{user.username}
            </a>
          </p>
        </div>
        <a
          href="/"
          className="self-start px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          Back to home
        </a>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <section className="mb-8 p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
          Update password
        </h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-3 max-w-sm">
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-medium text-[var(--muted)] mb-1.5"
            >
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[#b0b0b8] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-[var(--muted)] mb-1.5"
            >
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[#b0b0b8] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors"
            disabled={passwordLoading || !currentPassword || !newPassword}
          >
            {passwordLoading ? "Updating…" : "Update password"}
          </button>
          {passwordMessage && (
            <p className="text-sm mt-1 text-[var(--muted)]">
              {passwordMessage}
            </p>
          )}
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
          Your links (public and private)
        </h2>
        {links.length === 0 ? (
          <p className="text-[var(--muted)]">No links yet.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
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
                    {link.isPrivate ? "Private link" : "Public link"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {link.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--tag-bg)] text-[var(--accent)]"
                    >
                      {tag.name}{" "}
                      {tag.isPrivate && (
                        <span className="ml-1 text-[0.7rem] text-[var(--muted)]">
                          (private)
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

