import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireStudentAuth } from "@/lib/supabase-server";
import { validateProfileUpdateInput } from "@/lib/validation";

export async function PATCH(request: Request) {
  const auth = await requireStudentAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user, client } = auth.context;
  const rate = checkRateLimit({ key: `profile_update:${user.id}`, limit: 15, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many profile update requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateProfileUpdateInput(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, fieldErrors: validation.fieldErrors },
        { status: 400 }
      );
    }

    const { full_name, college, graduation_year } = validation.data;

    // Update strictly the authenticated user's permitted columns
    const { data, error } = await client
      .from("profiles")
      .update({
        full_name,
        college,
        graduation_year
      })
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile: data });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}

