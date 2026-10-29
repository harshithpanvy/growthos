import { NextResponse } from "next/server";
import { canStudentAccessResource } from "@/lib/referral-engine";
import { createServiceRoleServerClient, requireStudentAuth } from "@/lib/supabase-server";
import type { LearningResource } from "@/lib/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStudentAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const { user, isAdmin, client } = auth.context;

  // 1. Load the requested resource strictly from PostgreSQL
  const { data: dbResource } = await client
    .from("resources")
    .select("*")
    .or(`id.eq.${id},slug.eq.${id}`)
    .maybeSingle();

  const resource = (dbResource as LearningResource | null) ?? null;

  if (!resource) {
    return NextResponse.json({ error: "Resource not found in database." }, { status: 404 });
  }

  // 2. Query authoritative qualified referral count from the database
  let qualifiedReferralCount = 0;
  const { count: attrCount, error: attrErr } = await client
    .from("referral_attributions")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", user.id)
    .eq("status", "qualified");

  if (!attrErr && typeof attrCount === "number") {
    qualifiedReferralCount = attrCount;
  } else {
    const { data: rpcCount } = await client.rpc("my_referral_count");
    if (typeof rpcCount === "number") qualifiedReferralCount = rpcCount;
  }

  // 3. Enforce backend unlock threshold check
  const allowed = canStudentAccessResource(resource, qualifiedReferralCount, isAdmin);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Resource locked. Requires ${resource.unlock_threshold} qualified referral${
          resource.unlock_threshold === 1 ? "" : "s"
        } (you currently have ${qualifiedReferralCount}).`
      },
      { status: 403 }
    );
  }

  // 4. Record resource access event for analytics
  await client
    .from("resource_access_events")
    .insert({
      user_id: user.id,
      resource_id: resource.id,
      action: "download"
    })
    .then(() => null, () => null);

  // 5. Generate short-lived signed URL if stored in a private Supabase Storage bucket
  let signedUrl: string | null = null;
  if (resource.storage_bucket && resource.storage_path) {
    const storageClient = createServiceRoleServerClient() ?? client;
    const { data: signedData } = await storageClient.storage
      .from(resource.storage_bucket)
      .createSignedUrl(resource.storage_path, 300);
    signedUrl = signedData?.signedUrl ?? null;
  }

  return NextResponse.json({
    resource: {
      id: resource.id,
      slug: resource.slug,
      title: resource.title,
      description: resource.description,
      resource_type: resource.resource_type,
      unlock_threshold: resource.unlock_threshold,
      content_markdown: resource.content_markdown,
      external_url: resource.external_url,
      signed_download_url: signedUrl
    }
  });
}
