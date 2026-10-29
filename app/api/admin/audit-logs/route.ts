import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db } = auth;
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("page_size") || 30)));
  const entityType = (url.searchParams.get("entity_type") || "").trim();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ logs: [], pagination: { page, page_size: pageSize, total: 0, total_pages: 1 } });
  }

  const total = count ?? (data?.length || 0);
  return NextResponse.json({
    logs: data ?? [],
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.max(1, Math.ceil(total / pageSize))
    }
  });
}

