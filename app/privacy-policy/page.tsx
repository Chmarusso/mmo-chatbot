import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MMOPLAYA",
  description:
    "Learn how MMOPLAYA collects, stores, and protects your information, including our limited use of cookies for session security.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-10 px-6 py-12 lg:px-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold lg:text-4xl">Privacy Policy</h1>
        <p className="text-sm text-text-secondary lg:text-base">
          Last updated: October 13, 2025
        </p>
        <p className="text-sm text-text-secondary lg:text-base">
          We built MMOPLAYA with privacy as a core feature. This policy explains what data we collect,
          why we collect it, and the limited circumstances under which we share it. Questions?
          Email{" "}
          <a
            className="text-accent-cyan transition hover:text-accent-purple"
            href="mailto:artur@mmoplaya.net"
          >
            artur@mmoplaya.net
          </a>
          .
        </p>
      </header>

      <section className="space-y-12 text-sm text-text-secondary lg:text-base">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. What we collect</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Account basics:</strong> Email address for magic-link login and the profile
              details you choose to share.
            </li>
            <li>
              <strong>Matchmaking activity:</strong> Swipes, matches, guild memberships, and badge
              progress so the app can surface relevant teammates.
            </li>
            <li>
              <strong>Messages:</strong> Direct and guild chat history, retained for 30 days before
              we auto-delete it.
            </li>
            <li>
              <strong>Device context:</strong> IP address and user-agent captured briefly to prevent
              abuse and troubleshoot issues (stored for up to 30 days).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. Cookies & storage</h2>
          <p>
            We use a single session cookie to keep you logged in after you authenticate with a magic
            link. It is httpOnly, secure in production, and never used for advertising or cross-site
            tracking. No third-party cookies or analytics pixels run by default.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. How we use your data</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Power matchmaking suggestions, chat, and guild features you request.</li>
            <li>Support guardian approvals, kid safeguards, and automated moderation.</li>
            <li>Monitor aggregate product health metrics so we can improve stability.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4. When we share data</h2>
          <p>
            We only share data with trusted vendors who help run the service—for example, email
            providers that deliver login links or moderation partners who scan limited chat snippets
            for abuse. Each partner signs agreements that restrict data use to providing their
            service and requires comparable security standards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">5. Your choices</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Export your data anytime from settings or by calling the `/api/export` endpoint.</li>
            <li>Delete your account from settings or by emailing{" "}
              <a
                className="text-accent-cyan transition hover:text-accent-purple"
                href="mailto:artur@mmoplaya.net"
              >
                artur@mmoplaya.net
              </a>.
            </li>
            <li>Guardians can remove linked kid accounts or revoke permissions whenever needed.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">6. Security</h2>
          <p>
            We use TLS for every connection, encrypt secrets at rest, and rely on magic-link login so
            we never store passwords. We monitor dependencies for vulnerabilities and welcome
            responsible disclosure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">7. Changes</h2>
          <p>
            If we materially change this policy, we will announce it in-app or via email. Continued
            use after updates take effect means you accept the revised policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">8. More information</h2>
          <p>
            For legal or compliance questions, review our{" "}
            <Link
              href="/terms-of-use"
              className="text-accent-cyan transition hover:text-accent-purple"
            >
              Terms of Use
            </Link>{" "}
            or reach out directly. We appreciate your trust and work hard to keep your data safe.
          </p>
        </section>
      </section>
    </main>
  );
}
