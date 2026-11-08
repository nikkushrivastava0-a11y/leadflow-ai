import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getSiteOrigin } from "@/lib/site-origin";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "LeadFlow AI | Enquiry Tracking for Local Businesses",
    template: "%s | LeadFlow AI",
  },
  description: "LeadFlow AI is being developed to help local businesses organize enquiries, track lead statuses, and manage customer follow-ups.",
  openGraph: {
    title: "LeadFlow AI",
    description: "LeadFlow AI is being developed to help local businesses organize enquiries, track lead statuses, and manage customer follow-ups.",
    url: "/",
    siteName: "LeadFlow AI",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "LeadFlow AI",
    description: "LeadFlow AI is being developed to help local businesses organize enquiries, track lead statuses, and manage customer follow-ups.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<Toaster /></body>
    </html>
  );
}
