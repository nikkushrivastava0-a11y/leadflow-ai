import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign-in link expired | LeadFlow AI",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
          LeadFlow AI · Account access
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          This sign-in link could not be verified.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The link may have expired or already been used. No account change was
          confirmed. Return to sign in and start a fresh verification.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white outline-offset-2 hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-indigo-700"
        >
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
