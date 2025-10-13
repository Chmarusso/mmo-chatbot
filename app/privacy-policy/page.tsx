import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MMOPLAYA",
  description: "Read the placeholder privacy policy while the full document is prepared.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12 lg:px-12">
      <h1 className="text-3xl font-semibold lg:text-4xl">Privacy Policy</h1>
      <p className="text-sm text-gray-300 lg:text-base">
        Our full privacy policy is on the way. We keep your data secure and only use it to power your MMOPLAYA experience.
      </p>
    </main>
  );
}
