import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Enquiry Form",
  robots: { index: false, follow: false, noarchive: true },
};

export default function EnquiryFormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
