import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lead Dashboard",
  robots: { index: false, follow: false, noarchive: true },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
