import type { Metadata } from "next";
import AgentStudio from "@/components/agent-studio/agent-studio";
import { loadStudioTasks } from "@/lib/agent-studio";

// Public read-only preview. Deliberately does not access customer tables,
// founder credentials, messages, private KPIs, or payment details.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agent Operations | LeadFlow AI",
  description:
    "A read-only founder operations board for six AI-assisted startup roles, backed by public GitHub issues.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AgentStudioPage() {
  const result = await loadStudioTasks();
  return <AgentStudio {...result} />;
}
