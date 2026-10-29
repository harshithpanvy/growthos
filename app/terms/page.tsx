import { FileText } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/Navigation";

export default function TermsPage() {
  return (
    <div className="container">
      <PublicHeader />

      <article className="card" style={{ maxWidth: 860, margin: "32px auto" }}>
        <span className="pill">
          <FileText size={13} /> TERMS OF PARTICIPATION
        </span>
        <h1 style={{ font: "700 28px 'Space Grotesk', sans-serif", margin: "12px 0" }}>
          Terms of Use & Ethical Referral Policy
        </h1>
        <p className="small">Last updated: October 2026</p>

        <h3>1. Workshop Registration & Starter Resources</h3>
        <p className="small">
          Registration for <strong>&ldquo;Build Your First AI Project in 60 Minutes&rdquo;</strong> and access to the AI
          Project Starter Kit (0 referrals) are free for eligible students. Participation in the referral program is
          completely optional and never required to attend the workshop.
        </p>

        <h3>2. Referral Qualification & Anti-Abuse Policy</h3>
        <p className="small">
          To keep the referral program fair for all students:
        </p>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--muted)", lineHeight: 1.75 }}>
          <li>Self-referrals (using your own code or duplicate accounts) are automatically blocked.</li>
          <li>Each referred student account can be attributed to at most one referrer.</li>
          <li>Automated signups, disposable bot emails, or velocity bursts are flagged for administrator review.</li>
          <li>Administrators may reject fraudulent referrals with a recorded audit reason.</li>
        </ul>

        <h3>3. Project Submissions & Academic Integrity</h3>
        <p className="small">
          Projects submitted through <code>/dashboard/projects</code> must be your own work. Any automated rubric
          scorecard displayed in GrowthOS is a text-based educational heuristic and does not constitute an official
          code security audit or endorsement.
        </p>
      </article>

      <PublicFooter />
    </div>
  );
}

