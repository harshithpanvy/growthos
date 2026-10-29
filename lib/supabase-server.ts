import { cookies } from "next/headers";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Profile } from "./types";

export const ACCESS_TOKEN_COOKIE = "gos-access-token";
export const REFRESH_TOKEN_COOKIE = "gos-refresh-token";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("YOUR_PROJECT") &&
    !supabaseAnonKey.includes("YOUR_SUPABASE")
);

/**
 * Creates a request-scoped Supabase client on the server using the user's JWT access token.
 * Respects all PostgreSQL Row Level Security (RLS) policies as that authenticated user.
 */
export function createUserServerClient(accessToken?: string | null): SupabaseClient | null {
  if (!isServerSupabaseConfigured) return null;

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined
  });
}

/**
 * Creates a server-only administrative Supabase client when `SUPABASE_SERVICE_ROLE_KEY` is configured.
 * MUST ONLY be used inside server routes AFTER `requireAdminAuth()` has verified the caller's admin role.
 */
export function createServiceRoleServerClient(): SupabaseClient | null {
  if (
    !isServerSupabaseConfigured ||
    !supabaseServiceRoleKey ||
    supabaseServiceRoleKey.includes("YOUR_SUPABASE")
  ) {
    return null;
  }

  return createClient(supabaseUrl!, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

/**
 * Extracts the bearer token from either the `Authorization` header or the HttpOnly session cookie.
 */
export async function extractRequestAccessToken(request?: Request): Promise<string | null> {
  if (request) {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) return token;
    }
  }

  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(ACCESS_TOKEN_COOKIE);
    if (tokenCookie?.value) {
      return tokenCookie.value;
    }
  } catch {
    // cookies() may throw outside of Next.js request context (e.g. unit tests)
  }

  return null;
}

export interface ServerAuthContext {
  configured: boolean;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  client: SupabaseClient | null;
  accessToken: string | null;
}

/**
 * Verifies the current request's session against Supabase Auth on the server
 * and loads the user's authoritative profile & role from PostgreSQL.
 */
export async function getServerAuthContext(request?: Request): Promise<ServerAuthContext> {
  if (!isServerSupabaseConfigured) {
    return {
      configured: false,
      user: null,
      profile: null,
      isAdmin: false,
      client: null,
      accessToken: null
    };
  }

  const accessToken = await extractRequestAccessToken(request);
  if (!accessToken) {
    return {
      configured: true,
      user: null,
      profile: null,
      isAdmin: false,
      client: createUserServerClient(null),
      accessToken: null
    };
  }

  const client = createUserServerClient(accessToken);
  if (!client) {
    return {
      configured: false,
      user: null,
      profile: null,
      isAdmin: false,
      client: null,
      accessToken: null
    };
  }

  const { data: userData, error: userError } = await client.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return {
      configured: true,
      user: null,
      profile: null,
      isAdmin: false,
      client,
      accessToken: null
    };
  }

  const { data: profileData } = await client
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();

  const appMetaRole =
    userData.user.app_metadata && userData.user.app_metadata.role === "admin"
      ? "admin"
      : "student";

  const rawProfile = (profileData as Profile | null) ?? null;
  const resolvedRole = rawProfile?.role === "admin" || appMetaRole === "admin" ? "admin" : "student";
  const profile: Profile | null = rawProfile
    ? { ...rawProfile, role: resolvedRole }
    : {
        id: userData.user.id,
        full_name:
          (typeof userData.user.user_metadata?.full_name === "string" &&
            userData.user.user_metadata.full_name) ||
          userData.user.email ||
          "User",
        email: userData.user.email || "",
        college:
          (typeof userData.user.user_metadata?.college === "string" &&
            userData.user.user_metadata.college) ||
          null,
        graduation_year:
          (typeof userData.user.user_metadata?.graduation_year === "string" &&
            userData.user.user_metadata.graduation_year) ||
          null,
        role: resolvedRole,
        acquisition_source: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        landing_page: null,
        referral_code: "GROW-USER01",
        referred_by: null,
        email_verified: Boolean(userData.user.email_confirmed_at),
        created_at: userData.user.created_at,
        updated_at: userData.user.updated_at || userData.user.created_at
      };
  const isAdmin = resolvedRole === "admin";

  return {
    configured: true,
    user: userData.user,
    profile,
    isAdmin,
    client,
    accessToken
  };
}

/**
 * Enforces that a request comes from an authenticated student or administrator.
 */
export async function requireStudentAuth(request?: Request): Promise<
  | { authorized: true; context: ServerAuthContext & { user: User; client: SupabaseClient } }
  | { authorized: false; status: 401 | 503; error: string }
> {
  const context = await getServerAuthContext(request);
  if (!context.configured) {
    return {
      authorized: false,
      status: 503,
      error: "Supabase environment variables are not configured on the server."
    };
  }
  if (!context.user || !context.client) {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required. Please sign in to continue."
    };
  }
  return {
    authorized: true,
    context: context as ServerAuthContext & { user: User; client: SupabaseClient }
  };
}

/**
 * Enforces that a request comes from an authenticated user whose authoritative database
 * profile has `role = 'admin'`. Never trusts client-supplied headers or localStorage!
 */
export async function requireAdminAuth(request?: Request): Promise<
  | {
      authorized: true;
      context: ServerAuthContext & { user: User; profile: Profile; client: SupabaseClient };
      db: SupabaseClient;
    }
  | { authorized: false; status: 401 | 403 | 503; error: string }
> {
  const context = await getServerAuthContext(request);
  if (!context.configured) {
    return {
      authorized: false,
      status: 503,
      error: "Supabase environment variables are not configured on the server."
    };
  }
  if (!context.user || !context.client) {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required. Please sign in with an administrator account."
    };
  }
  if (!context.profile || context.profile.role !== "admin" || !context.isAdmin) {
    return {
      authorized: false,
      status: 403,
      error: "Forbidden: Administrator privileges are required for this operation."
    };
  }

  // Prefer service-role client after verifying admin role, or fall back to user's RLS admin client
  const db = createServiceRoleServerClient() ?? context.client;

  return {
    authorized: true,
    context: context as ServerAuthContext & { user: User; profile: Profile; client: SupabaseClient },
    db
  };
}

/**
 * Records an immutable audit log entry for privileged administrator operations.
 */
export async function recordAdminAuditLog(params: {
  db: SupabaseClient;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { db, actorId, actorEmail, action, entityType, entityId = null, metadata = {} } = params;
  await db.from("admin_audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata
  });
}

