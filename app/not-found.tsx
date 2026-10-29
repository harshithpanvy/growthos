import Link from "next/link";
import { Compass } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/Navigation";

export default function NotFoundPage() {
  return (
    <div className="container">
      <PublicHeader />
      <div className="card" style={{ maxWidth: 540, margin: "56px auto", textAlign: "center" }}>
        <Compass size={32} style={{ color: "var(--cyan)", marginBottom: 10 }} />
        <h1>404 — Page Not Found</h1>
        <p className="small" style={{ marginBottom: 18 }}>
          The GrowthOS route you requested does not exist or may have moved.
        </p>
        <div className="inline-actions" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn cyan">
            Return to Home
          </Link>
          <Link href="/dashboard" className="btn secondary">
            Student Dashboard
          </Link>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

