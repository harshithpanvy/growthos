import { ShieldCheck } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/Navigation";

export default function PrivacyPolicyPage() {
  return (
    <div className="container">
      <PublicHeader />

      <article className="card" style={{ maxWidth: 860, margin: "32px auto" }}>
        <span className="pill green">
          <ShieldCheck size={13} /> PRIVACY & DATA PROTECTION
        </span>
        <h1 style={{ font: "700 28px 'Space Grotesk', sans-serif", margin: "12px 0" }}>
          GrowthOS Privacy Policy
        </h1>
        <p className="small">Last updated: October 2026</p>

        <h3>1. Data Minimization</h3>
        <p className="small">
          GrowthOS collects only the information necessary to coordinate the{" "}
          <strong>&ldquo;Build Your First AI Project in 60 Minutes&rdquo;</strong> workshop, deliver learning resources,
          and attribute campus referrals:
        </p>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--muted)", lineHeight: 1.75 }}>
          <li>Full name, college/university name, and graduation year.</li>
          <li>Normalized email address (via Supabase Auth).</li>
          <li>Acquisition context (UTM source, medium, campaign, landing page, and optional referral code).</li>
          <li>Workshop attendance status and optional student project submissions.</li>
        </ul>

        <h3>2. Referral Privacy & Row Level Security (RLS)</h3>
        <p className="small">
          When you register using another student&apos;s referral link (<code>?ref=GROW-XXXXXX</code>), the referring
          student is credited toward their milestone count once your account qualifies.{" "}
          <strong>Your email address is never shared with or visible to the referring student.</strong> Referrers can
          only view a privacy-masked display name (first name + last initial), college name, and qualification status.
        </p>

        <h3>3. Access Control & Audit Logging</h3>
        <p className="small">
          PostgreSQL Row Level Security (RLS) policies enforce that students can read and update only their own profile
          records. Authorized administrators can view registration records for workshop operations, and privileged
          administrative actions (such as referral reviews or CSV exports) are recorded in an immutable server audit log.
        </p>

        <h3>4. Contact & Account Deletion</h3>
        <p className="small">
          Students may update their profile details at any time from <code>/dashboard/profile</code> or request account
          removal from the workshop organizers.
        </p>
      </article>

      <PublicFooter />
    </div>
  );
}

