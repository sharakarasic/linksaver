"use client";

import { useState } from "react";

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

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      await apiJson<{ ok: boolean }>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-sm">
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
        disabled={loading || !currentPassword || !newPassword}
      >
        {loading ? "Updating…" : "Update password"}
      </button>
      {message && (
        <p className="text-sm mt-1 text-[var(--muted)]">{message}</p>
      )}
    </form>
  );
}

