import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // NEVER return full secrets—just presence + lengths.
  const session = process.env.SESSION_SECRET ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return NextResponse.json({
    ok: true,
    env: {
      SESSION_SECRET: { exists: !!session, len: session.length },
      NEXT_PUBLIC_SUPABASE_URL: { exists: !!url, value: url || null },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: { exists: !!anon, starts: anon.slice(0, 3), len: anon.length },
      SUPABASE_SERVICE_ROLE_KEY: { exists: !!service, starts: service.slice(0, 3), len: service.length },
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}