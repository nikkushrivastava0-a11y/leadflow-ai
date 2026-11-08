/**
 * Founder Agent Studio: role definitions and public GitHub issue status.
 *
 * These are AI-assisted responsibilities, not autonomous workers. The
 * GitHub issue tracker is the sole source of task progress shown here.
 * Never show customer PII, credentials, or unverified revenue figures.
 */
export type AgentId = "CEO" | "CTO" | "CMO" | "SALES" | "PRODUCT" | "CFO";
export type IssuePriority = "P0" | "P1" | "P2";
export type IssueState = "open" | "closed";

export type AgentDefinition = {
  id: AgentId;
  title: string;
  subtitle: string;
  mission: string;
  deliverable: string;
  responsibilities: readonly string[];
  number: string;
  initials: string;
};

export type StudioTask = {
  id: number;
  title: string;
  role: AgentId;
  priority: IssuePriority;
  state: IssueState;
  url: string;
  updatedAt: string;
};

export type StudioTasksResult = {
  tasks: StudioTask[];
  source: "github" | "unavailable";
};

export const GITHUB_REPO_URL =
  "https://github.com/nikkushrivastava0-a11y/leadflow-ai";

export const AGENTS: readonly AgentDefinition[] = [
  {
    id: "CEO",
    number: "01",
    initials: "CE",
    title: "CEO",
    subtitle: "Direction & decisions",
    mission: "Keep the entire team focused on one buyer, one promise, and the next measurable milestone.",
    deliverable: "Weekly priorities and launch decisions",
    responsibilities: ["Positioning", "Prioritisation", "Launch gates"],
  },
  {
    id: "CTO",
    number: "02",
    initials: "CT",
    title: "CTO",
    subtitle: "Engineering & security",
    mission: "Turn the repository into a dependable product with real tests, clean data ownership, and safe releases.",
    deliverable: "Reviewed fixes and release checks",
    responsibilities: ["Code reviews", "Security", "Deployment readiness"],
  },
  {
    id: "CMO",
    number: "03",
    initials: "CM",
    title: "Marketing",
    subtitle: "Story & demand",
    mission: "Explain the problem clearly to coaching centre owners and build a steady stream of relevant conversations.",
    deliverable: "Landing page, demos and outreach content",
    responsibilities: ["Positioning", "Content", "Lead generation"],
  },
  {
    id: "SALES",
    number: "04",
    initials: "SA",
    title: "Sales",
    subtitle: "Conversations & conversion",
    mission: "Find the right businesses, prepare personalised outreach, and move genuine interest towards pilot demos.",
    deliverable: "Qualified prospects and booked demos",
    responsibilities: ["Prospecting", "Demo flow", "Follow-ups"],
  },
  {
    id: "PRODUCT",
    number: "05",
    initials: "PM",
    title: "Product",
    subtitle: "Experience & scope",
    mission: "Make the enquiry-to-follow-up workflow simple enough that a busy owner can use it every day.",
    deliverable: "Small MVP iterations driven by feedback",
    responsibilities: ["MVP scope", "User feedback", "Quality of experience"],
  },
  {
    id: "CFO",
    number: "06",
    initials: "CF",
    title: "Finance",
    subtitle: "Pricing & unit economics",
    mission: "Keep costs below budget and report real collections, recurring revenue, and customer economics.",
    deliverable: "Weekly cash and conversion scorecard",
    responsibilities: ["Pricing", "Budget", "Margin tracking"],
  },
];

/**
 * Public, read-only issues only. No GitHub token is required or used.
 * GitHub pull requests also appear in the issues endpoint, so exclude them.
 */
export async function loadStudioTasks(): Promise<StudioTasksResult> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/nikkushrivastava0-a11y/leadflow-ai/issues?state=all&per_page=100",
      {
        next: { revalidate: 120 },
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "LeadFlowAI-FounderStudio",
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!response.ok) return { tasks: [], source: "unavailable" };

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return { tasks: [], source: "unavailable" };

    const tasks: StudioTask[] = [];
    for (const issue of payload) {
      if (!issue || typeof issue !== "object") continue;
      const data = issue as Record<string, unknown>;
      if (data.pull_request) continue;
      if (
        typeof data.title !== "string" ||
        typeof data.number !== "number" ||
        typeof data.html_url !== "string" ||
        typeof data.updated_at !== "string" ||
        (data.state !== "open" && data.state !== "closed")
      ) continue;

      const match = data.title.match(
        /^\[(CEO|CTO|CMO|SALES|PRODUCT|CFO)\]\s+\[(P0|P1|P2)\]\s+(.+)$/
      );
      if (!match) continue;

      tasks.push({
        id: data.number,
        role: match[1] as AgentId,
        priority: match[2] as IssuePriority,
        title: match[3],
        state: data.state,
        url: data.html_url,
        updatedAt: data.updated_at,
      });
    }

    return {
      tasks: tasks.sort((a, b) =>
        a.state === b.state
          ? a.priority.localeCompare(b.priority) || a.id - b.id
          : a.state === "open" ? -1 : 1
      ),
      source: "github",
    };
  } catch {
    return { tasks: [], source: "unavailable" };
  }
}
