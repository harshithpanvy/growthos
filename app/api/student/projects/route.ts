import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { evaluateProjectSubmissionHeuristic } from "@/lib/referral-engine";
import { requireStudentAuth } from "@/lib/supabase-server";
import { validateProjectSubmissionInput } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireStudentAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user, client } = auth.context;
  const { data, error } = await client
    .from("project_submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ submissions: [], note: error.message });
  }

  return NextResponse.json({ submissions: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireStudentAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user, client } = auth.context;
  const rate = checkRateLimit({ key: `project_submit:${user.id}`, limit: 10, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before submitting again." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateProjectSubmissionInput(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, fieldErrors: validation.fieldErrors },
        { status: 400 }
      );
    }

    const input = validation.data;
    const rubric = evaluateProjectSubmissionHeuristic(input);

    const { data: activeWorkshop } = await client
      .from("workshops")
      .select("id,project_submissions_enabled")
      .eq("is_published", true)
      .limit(1)
      .maybeSingle();

    if (activeWorkshop && activeWorkshop.project_submissions_enabled === false) {
      return NextResponse.json(
        { error: "Project submissions are currently closed for this workshop." },
        { status: 403 }
      );
    }

    const { data, error } = await client
      .from("project_submissions")
      .insert({
        user_id: user.id,
        workshop_id: activeWorkshop?.id ?? null,
        title: input.title,
        problem_statement: input.problem_statement,
        description: input.description,
        tech_stack: input.tech_stack,
        repo_url: input.repo_url,
        demo_url: input.demo_url,
        notes: input.notes,
        ai_rubric_score: rubric.score,
        ai_rubric_breakdown: {
          verdict: rubric.verdict,
          dimensions: rubric.dimensions,
          improvements: rubric.improvements,
          is_automated_heuristic: true
        },
        review_status: "submitted"
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ submission: data, rubric }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid project submission payload." }, { status: 400 });
  }
}

