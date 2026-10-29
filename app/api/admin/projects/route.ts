import { NextResponse } from "next/server";
import { recordAdminAuditLog, requireAdminAuth } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db } = auth;
  const { data: submissions, error } = await db
    .from("project_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !submissions) {
    return NextResponse.json({ submissions: [] });
  }

  const userIds = Array.from(new Set(submissions.map(s => s.user_id)));
  const studentMap = new Map<string, { full_name: string; email: string; college: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id,full_name,email,college")
      .in("id", userIds);

    if (Array.isArray(profiles)) {
      for (const p of profiles) {
        studentMap.set(p.id, p);
      }
    }
  }

  const enriched = submissions.map(s => ({
    ...s,
    student: studentMap.get(s.user_id) ?? null
  }));

  return NextResponse.json({ submissions: enriched });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db, context } = auth;
  try {
    const body = (await request.json()) as {
      id?: string;
      review_status?: "submitted" | "under_review" | "approved" | "needs_work";
      reviewer_notes?: string;
    };

    const id = typeof body.id === "string" ? body.id.trim() : "";
    const status = body.review_status;
    if (!id || !status || !["submitted", "under_review", "approved", "needs_work"].includes(status)) {
      return NextResponse.json({ error: "Submission ID and valid review_status are required." }, { status: 400 });
    }

    const reviewerNotes =
      typeof body.reviewer_notes === "string" ? body.reviewer_notes.trim().slice(0, 1500) : null;

    const { data, error } = await db
      .from("project_submissions")
      .update({
        review_status: status,
        reviewer_notes: reviewerNotes,
        reviewed_by: context.user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await recordAdminAuditLog({
      db,
      actorId: context.user.id,
      actorEmail: context.profile.email,
      action: "review_project_submission",
      entityType: "project_submissions",
      entityId: id,
      metadata: {
        review_status: status,
        has_notes: Boolean(reviewerNotes)
      }
    });

    return NextResponse.json({ submission: data });
  } catch {
    return NextResponse.json({ error: "Invalid project review payload." }, { status: 400 });
  }
}

