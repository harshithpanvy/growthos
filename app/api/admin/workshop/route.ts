import { NextResponse } from "next/server";
import { recordAdminAuditLog, requireAdminAuth } from "@/lib/supabase-server";
import { isSafeHttpUrl } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db } = auth;
  const [workshopRes, attendanceRes, profilesRes] = await Promise.all([
    db.from("workshops").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("attendance_records").select("*").order("marked_at", { ascending: false }),
    db.from("profiles").select("id,full_name,email,college,graduation_year").order("created_at", { ascending: false }).limit(200)
  ]);

  const workshop = !workshopRes.error && workshopRes.data ? workshopRes.data : null;

  const attendanceRecords =
    !attendanceRes.error && Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

  const students =
    !profilesRes.error && Array.isArray(profilesRes.data) ? profilesRes.data : [];

  return NextResponse.json({
    workshop,
    attendance_records: attendanceRecords,
    students
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db, context } = auth;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 3 || title.length > 160) {
      return NextResponse.json({ error: "Workshop title must be between 3 and 160 characters." }, { status: 400 });
    }

    const joiningUrl =
      typeof body.joining_url === "string" && body.joining_url.trim() ? body.joining_url.trim() : null;
    if (joiningUrl && !isSafeHttpUrl(joiningUrl)) {
      return NextResponse.json({ error: "Joining URL must be a valid http:// or https:// link." }, { status: 400 });
    }

    const scheduledAt =
      typeof body.scheduled_at === "string" && body.scheduled_at.trim() ? body.scheduled_at.trim() : null;

    const slug =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim()
        : "build-first-ai-project-60m";

    const { data, error } = await db
      .from("workshops")
      .upsert(
        {
          slug,
          title,
          subtitle:
            typeof body.subtitle === "string" && body.subtitle.trim()
              ? body.subtitle.trim()
              : "60 Minutes. One AI Project. Your First Step.",
          description:
            typeof body.description === "string" ? body.description.trim() : "",
          scheduled_at: scheduledAt,
          timezone:
            typeof body.timezone === "string" && body.timezone.trim()
              ? body.timezone.trim()
              : "Asia/Kolkata (IST)",
          duration_minutes: Math.max(15, Number(body.duration_minutes || 60)),
          joining_url: joiningUrl,
          agenda: Array.isArray(body.agenda) ? body.agenda : [],
          preparation_checklist: Array.isArray(body.preparation_checklist)
            ? body.preparation_checklist
            : [],
          is_published: Boolean(body.is_published ?? true),
          project_submissions_enabled: Boolean(body.project_submissions_enabled ?? true)
        },
        { onConflict: "slug" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await recordAdminAuditLog({
      db,
      actorId: context.user.id,
      actorEmail: context.profile.email,
      action: "update_workshop_details",
      entityType: "workshops",
      entityId: data.id,
      metadata: {
        title,
        scheduled_at: scheduledAt,
        has_joining_url: Boolean(joiningUrl),
        is_published: Boolean(body.is_published ?? true)
      }
    });

    return NextResponse.json({ workshop: data });
  } catch {
    return NextResponse.json({ error: "Invalid workshop update payload." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db, context } = auth;
  try {
    const body = (await request.json()) as {
      workshop_id?: string;
      user_id?: string;
      status?: "registered" | "attended" | "absent";
      notes?: string;
    };

    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    const status = body.status;
    if (!userId || !status || !["registered", "attended", "absent"].includes(status)) {
      return NextResponse.json({ error: "Valid user_id and attendance status are required." }, { status: 400 });
    }

    let workshopId = typeof body.workshop_id === "string" ? body.workshop_id.trim() : "";
    if (!workshopId) {
      const { data: ws } = await db.from("workshops").select("id").limit(1).maybeSingle();
      workshopId = ws?.id ?? "";
    }

    if (!workshopId) {
      return NextResponse.json(
        { error: "No workshop record found in the database. Save workshop settings in /admin/workshop first." },
        { status: 400 }
      );
    }

    const { data, error } = await db
      .from("attendance_records")
      .upsert(
        {
          workshop_id: workshopId,
          user_id: userId,
          status,
          source: "manual_admin",
          marked_by: context.user.id,
          notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 300) : null,
          marked_at: new Date().toISOString()
        },
        { onConflict: "workshop_id,user_id" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await recordAdminAuditLog({
      db,
      actorId: context.user.id,
      actorEmail: context.profile.email,
      action: "update_attendance_record",
      entityType: "attendance_records",
      entityId: data.id,
      metadata: {
        user_id: userId,
        workshop_id: workshopId,
        status
      }
    });

    return NextResponse.json({ attendance: data });
  } catch {
    return NextResponse.json({ error: "Invalid attendance update payload." }, { status: 400 });
  }
}
