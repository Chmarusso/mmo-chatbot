import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | MMOPLAYA",
  description: "Review the placeholder terms of use for the MMOPLAYA application.",
};

export default function TermsOfUsePage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12 lg:px-12">
      <h1 className="text-3xl font-semibold lg:text-4xl">Terms of Use</h1>
      <p className="text-sm text-gray-300 lg:text-base">
        A detailed Terms of Use document is coming soon. In the meantime, remember to squad up respectfully and play fair.
      </p>
    </main>
  );
}
