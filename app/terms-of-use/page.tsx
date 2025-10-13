import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | MMOPLAYA",
  description: "Understand the guidelines that keep the MMOPLAYA community safe, respectful, and fun for everyone.",
};

export default function TermsOfUsePage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-10 px-6 py-12 lg:px-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold lg:text-4xl">Terms of Use</h1>
        <p className="text-sm text-text-secondary lg:text-base">
          Last updated: October 13, 2025
        </p>
        <p className="text-sm text-text-secondary lg:text-base">
          These Terms of Use (“Terms”) explain the rules that apply when you access or use MMOPLAYA. By continuing to browse, create an account, or interact with other players, you agree to follow these Terms and any in-app policies we publish.
        </p>
      </header>

      <section className="space-y-12 text-sm text-text-secondary lg:text-base">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. Eligibility & Accounts</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>You must be at least 13 years old to use MMOPLAYA. Younger players need a linked guardian account with verified consent.</li>
            <li>You promise that the information you provide is accurate and kept up to date.</li>
            <li>Guardians are responsible for any activity performed by accounts they supervise.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. Community Guidelines</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Treat other players with respect—no harassment, hate speech, impersonation, or bullying.</li>
            <li>Do not spam, solicit, or use automated tools to interact with members of the community.</li>
            <li>Respect personal boundaries and only share contact details you are comfortable making public.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. Content You Share</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>You retain ownership of all text, images, and other content you upload.</li>
            <li>You grant MMOPLAYA a non-exclusive license to host, display, and distribute that content solely to operate and improve the service.</li>
            <li>Only post material you have the right to share. We may remove content or suspend accounts that violate these Terms or applicable law.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4. Safety & Acceptable Use</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Keep your device and email secure—our passwordless login links should be treated like a password.</li>
            <li>Do not reverse engineer, scrape, or otherwise misuse our systems or data.</li>
            <li>Use location-based features responsibly and comply with local laws when meeting up or attending events.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">5. Privacy</h2>
          <p>
            Our{" "}
            <Link
              href="/privacy-policy"
              className="text-accent-cyan transition hover:text-accent-purple"
            >
              Privacy Policy
            </Link>{" "}
            explains the data we collect, why we use it, and the choices you have. We minimize tracking, support self-service data export, and honor deletion requests.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">6. Ending or Changing Access</h2>
          <p>
            We may suspend or terminate accounts that break these Terms or put the community at risk. You may delete your account anytime from the in-app settings and request a copy of your data before leaving.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">7. Service Changes & Disclaimers</h2>
          <p>
            MMOPLAYA is provided on an “as is” and “as available” basis. We may update features, change eligibility requirements, or revise these Terms as the service evolves. Material changes will be communicated in-app or via email.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">8. Contact</h2>
          <p>
            Questions about these Terms? Reach us at{" "}
            <a
              href="mailto:artur@mmoplaya.net"
              className="text-accent-cyan transition hover:text-accent-purple"
            >
              artur@mmoplaya.net
            </a>{" "}
            and we&apos;ll be happy to help.
          </p>
        </section>
      </section>
    </main>
  );
}
