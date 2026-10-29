import { NextResponse } from "next/server";
import { recordAdminAuditLog, requireAdminAuth } from "@/lib/supabase-server";

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Prevent CSV formula injection
  const safeStr = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (safeStr.includes(",") || safeStr.includes('"') || safeStr.includes("\n")) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }
  return safeStr;
}

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db, context } = auth;
  const url = new URL(request.url);

  const search = (url.searchParams.get("search") || "").trim();
  const graduationYear = (url.searchParams.get("graduation_year") || "").trim();
  const college = (url.searchParams.get("college") || "").trim();
  const source = (url.searchParams.get("acquisition_source") || "").trim();
  const dateFrom = (url.searchParams.get("date_from") || "").trim();
  const dateTo = (url.searchParams.get("date_to") || "").trim();
  const exportFormat = url.searchParams.get("export");

  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("page_size") || 20)));

  let query = db
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    const cleanSearch = search.replace(/[,%]/g, "");
    query = query.or(
      `full_name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,college.ilike.%${cleanSearch}%,referral_code.ilike.%${cleanSearch}%`
    );
  }
  if (graduationYear) {
    query = query.eq("graduation_year", graduationYear);
  }
  if (college) {
    query = query.ilike("college", `%${college.replace(/[,%]/g, "")}%`);
  }
  if (source) {
    query = query.eq("acquisition_source", source);
  }
  if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
  }

  if (exportFormat !== "csv") {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  } else {
    query = query.limit(2000);
  }

  const { data: profiles, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = Array.isArray(profiles) ? profiles : [];
  const userIds = rows.map(r => r.id);

  // Fetch qualified referral counts and attendance for the returned page of students
  const referralCountMap = new Map<string, number>();
  const attendanceMap = new Map<string, string>();

  if (userIds.length > 0) {
    const [attrRes, attRes] = await Promise.all([
      db
        .from("referral_attributions")
        .select("referrer_id,status")
        .in("referrer_id", userIds)
        .eq("status", "qualified"),
      db.from("attendance_records").select("user_id,status").in("user_id", userIds)
    ]);

    if (!attrRes.error && Array.isArray(attrRes.data)) {
      for (const a of attrRes.data) {
        referralCountMap.set(a.referrer_id, (referralCountMap.get(a.referrer_id) ?? 0) + 1);
      }
    }
    if (!attRes.error && Array.isArray(attRes.data)) {
      for (const att of attRes.data) {
        attendanceMap.set(att.user_id, att.status);
      }
    }
  }

  const enrichedStudents = rows.map(student => ({
    ...student,
    qualified_referrals_count: referralCountMap.get(student.id) ?? 0,
    attendance_status: attendanceMap.get(student.id) ?? "not_marked"
  }));

  if (exportFormat === "csv") {
    await recordAdminAuditLog({
      db,
      actorId: context.user.id,
      actorEmail: context.profile.email,
      action: "export_students_csv",
      entityType: "profiles",
      metadata: {
        exported_rows: enrichedStudents.length,
        filters: { search, graduationYear, college, source, dateFrom, dateTo }
      }
    });

    const headers = [
      "Student ID",
      "Full Name",
      "Email",
      "College",
      "Graduation Year",
      "Role",
      "Acquisition Source",
      "UTM Source",
      "UTM Campaign",
      "Referral Code",
      "Referred By User ID",
      "Qualified Referrals",
      "Attendance Status",
      "Registered At"
    ];

    const csvLines = [
      headers.join(","),
      ...enrichedStudents.map(s =>
        [
          s.id,
          s.full_name,
          s.email,
          s.college,
          s.graduation_year,
          s.role,
          s.acquisition_source,
          s.utm_source,
          s.utm_campaign,
          s.referral_code,
          s.referred_by,
          s.qualified_referrals_count,
          s.attendance_status,
          s.created_at
        ]
          .map(escapeCsvCell)
          .join(",")
      )
    ];

    return new NextResponse(csvLines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="growthos-students-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  }

  return NextResponse.json({
    students: enrichedStudents,
    pagination: {
      page,
      page_size: pageSize,
      total: count ?? enrichedStudents.length,
      total_pages: Math.max(1, Math.ceil((count ?? enrichedStudents.length) / pageSize))
    }
  });
}

