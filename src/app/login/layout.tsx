import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
