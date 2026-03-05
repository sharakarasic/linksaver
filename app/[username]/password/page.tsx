import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PasswordForm from "../PasswordForm";

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
    title: `Update password – ${username}`,
  };
}

export default async function PasswordPage({ params }: { params: Params }) {
  const username = params.username.toLowerCase();
  const viewer = await getCurrentUser();

  // Only the owner can access their password page.
  if (!viewer || viewer.username !== username) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Update password
          </h1>
          <p className="mt-1 text-[var(--muted)] text-sm">
            Change the password for{" "}
            <span className="font-medium text-[var(--text)]">
              {viewer.username}
            </span>
            .
          </p>
        </div>
        <Link
          href={`/${viewer.username}`}
          className="self-start px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          Back to profile
        </Link>
      </header>

      <section className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] max-w-lg">
        <PasswordForm />
      </section>
    </div>
  );
}

