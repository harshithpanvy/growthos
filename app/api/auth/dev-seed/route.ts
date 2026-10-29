import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      seeded: false,
      error: "Hardcoded demo account seeding is disabled. Create accounts via /register and manage roles in Supabase."
    },
    { status: 410 }
  );
}
