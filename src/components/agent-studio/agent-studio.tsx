"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CircleDot,
  Code2,
  Compass,
  ExternalLink,
  Github,
  Handshake,
  LayoutGrid,
  ListTodo,
  Megaphone,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import {
  AGENTS,
  GITHUB_REPO_URL,
  type AgentId,
  type StudioTasksResult,
} from "@/lib/agent-studio";
import styles from "./agent-studio.module.css";

const ICONS = {
  CEO: Compass,
  CTO: Code2,
  CMO: Megaphone,
  SALES: Handshake,
  PRODUCT: LayoutGrid,
  CFO: Wallet,
};

const WORKSTREAMS = [
  {
    step: "01",
    title: "Make it reliable",
    note: "Data isolation, forms, access and payments",
    detail: "Launch gate",
  },
  {
    step: "02",
    title: "Show the value",
    note: "One niche, one demo, one clear offer",
    detail: "Customer discovery",
  },
  {
    step: "03",
    title: "Close & learn",
    note: "Pilot conversations into paid adoption",
    detail: "First revenue",
  },
];

type RoleFilter = AgentId | "ALL";
type TaskFilter = "all" | "open" | "closed";

export default function AgentStudio({
  tasks,
  source,
}: StudioTasksResult) {
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [taskStatus, setTaskStatus] = useState<TaskFilter>("all");
  const [query, setQuery] = useState("");

  const hasLiveIssues = source === "github";
  const openCount = tasks.filter((task) => task.state === "open").length;
  const completedCount = tasks.filter((task) => task.state === "closed").length;
  const progress =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const visibleTasks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tasks.filter((task) => {
      return (
        (role === "ALL" || task.role === role) &&
        (taskStatus === "all" || task.state === taskStatus) &&
        (!term ||
          task.title.toLowerCase().includes(term) ||
          task.role.toLowerCase().includes(term))
      );
    });
  }, [tasks, role, taskStatus, query]);

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="LeadFlow AI home">
          <div className={styles.brandMark}><Activity size={19} strokeWidth={2.6} /></div>
          <span>leadflow<span className={styles.brandEmphasis}>.ai</span></span>
        </Link>

        <div className={styles.workspace}>
          <span className={styles.workspaceDot} />
          <span>FOUNDER WORKSPACE</span>
        </div>

        <nav className={styles.nav} aria-label="Agent studio sections">
          <span className={styles.navSection}>WORKSPACE</span>
          <a className={styles.navActive} href="#overview">
            <LayoutGrid size={17} /> Overview
          </a>
          <a href="#agents">
            <Users size={17} /> The team
          </a>
          <a href="#work-queue">
            <ListTodo size={17} /> Work queue
            <span className={styles.navNumber}>{hasLiveIssues ? openCount : "—"}</span>
          </a>
          <a href="#milestones">
            <Target size={17} /> Milestones
          </a>
          <span className={styles.navSection}>YOUR PRODUCT</span>
          <Link href="/dashboard">
            <BarChart3 size={17} /> Lead dashboard
            <ArrowUpRight size={14} className={styles.navArrow} />
          </Link>
          <a href={GITHUB_REPO_URL + "/issues"} target="_blank" rel="noreferrer">
            <Github size={17} /> GitHub issues
            <ArrowUpRight size={14} className={styles.navArrow} />
          </a>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarCaption}>HOW THIS WORKS</div>
          <p>Six specialised roles. One founder in control. Work is tracked in GitHub — not simulated.</p>
          <div className={styles.sidebarFoot}><ShieldCheck size={15} /> Read-only · No autonomous actions</div>
        </div>
      </aside>

      <main className={styles.main} id="overview">
        <div className={styles.utilityBar}>
          <div className={styles.breadcrumb}>
            <span>Workspace</span><span className={styles.slash}>/</span>
            <strong>Agent operations</strong>
          </div>
          <div className={styles.utilityRight}>
            <span className={styles.publicPill}><CircleDot size={13} /> Public read-only preview</span>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className={styles.repoLink}>
              <Github size={16} /> Repository <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.intro}>
            <div>
              <span className={styles.eyebrow}>LEADFLOW / STUDIO 01</span>
              <h1>Agent <span>operations.</span></h1>
              <p>One place to see who owns what, what&apos;s next, and what&apos;s actually moving.</p>
            </div>
            <div className={styles.introMeta}>
              <span className={styles.metaLabel}>OPERATING MODEL</span>
              <strong>Founder-led, agent-assisted</strong>
              <span>Every external action needs your approval.</span>
            </div>
          </div>

          <section className={styles.hero} aria-label="Startup mission">
            <div className={styles.heroMesh} aria-hidden="true" />
            <div className={styles.heroText}>
              <div className={styles.heroKicker}><span className={styles.liveDot} /> 60-DAY OPERATING PLAN</div>
              <h2>Six roles.<br /><em>One clear mission.</em></h2>
              <p>Make LeadFlow AI reliable, valuable to one customer segment, and ready for the first paying businesses.</p>
              <a href="#work-queue" className={styles.heroButton}>
                Explore the work queue <ArrowRight size={17} />
              </a>
            </div>
            <div className={styles.heroGoal}>
              <span className={styles.goalCaption}>WEEK 6 TARGET</span>
              <strong>03<span>/03</span></strong>
              <div>paying customers</div>
              <p>Target only — actual customer numbers are not connected.</p>
              <div className={styles.goalTrack}><span /></div>
              <span className={styles.goalNote}>Target review: 20 Dec 2026</span>
            </div>
          </section>

          <section className={styles.metrics} aria-label="Operational summary">
            <div className={styles.metric}>
              <span className={styles.metricLabel}>TEAM ROLES</span>
              <strong>06 <span>defined</span></strong>
              <div className={styles.metricFoot}><Users size={14} /> Specialist responsibilities</div>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>OPEN TASKS</span>
              <strong>{hasLiveIssues ? String(openCount).padStart(2, "0") : "—"} <span>issues</span></strong>
              <div className={styles.metricFoot}><Github size={14} /> {hasLiveIssues ? "From GitHub" : "GitHub unavailable"}</div>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>COMPLETED</span>
              <strong>{hasLiveIssues ? String(completedCount).padStart(2, "0") : "—"} <span>issues</span></strong>
              <div className={styles.metricFoot}><CheckCircle2 size={14} /> {hasLiveIssues ? "Verified tracker state" : "Status unavailable"}</div>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>MONTHLY REVENUE</span>
              <strong>— <span>not linked</span></strong>
              <div className={styles.metricFoot}><Wallet size={14} /> Never estimated as actual</div>
            </div>
          </section>

          <section className={styles.section} id="agents">
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionOverline}>THE TEAM</div>
                <h2>Meet your six roles<span className={styles.sectionDot}>.</span></h2>
                <p>Each has a defined lane, an expected output, and trackable tasks.</p>
              </div>
              <span className={styles.sectionIndex}>01 / 03</span>
            </div>

            <div className={styles.agentGrid}>
              {AGENTS.map((agent) => {
                const Icon = ICONS[agent.id];
                const count = tasks.filter(
                  (task) => task.role === agent.id && task.state === "open"
                ).length;
                const selected = role === agent.id;
                return (
                  <button
                    type="button"
                    className={selected ? styles.agentCardSelected : styles.agentCard}
                    key={agent.id}
                    onClick={() => {
                      setRole(selected ? "ALL" : agent.id);
                      setTaskStatus("all");
                      document.getElementById("work-queue")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    aria-label={"Filter work queue for " + agent.title}
                  >
                    <div className={styles.agentTop}>
                      <span className={styles.agentNumber}>{agent.number} / ROLE</span>
                      <div className={styles.agentIcon}><Icon size={20} strokeWidth={1.8} /></div>
                    </div>
                    <h3>{agent.title}</h3>
                    <span className={styles.agentSubtitle}>{agent.subtitle}</span>
                    <p className={styles.agentMission}>{agent.mission}</p>
                    <div className={styles.agentTags}>
                      {agent.responsibilities.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                    <div className={styles.agentBottom}>
                      <span><CircleDot size={13} /> {hasLiveIssues ? count + " open task" + (count === 1 ? "" : "s") : "Tracker unavailable"}</span>
                      <ArrowUpRight size={17} />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className={styles.agentDisclaimer}>
              <ShieldCheck size={14} /> Roles describe responsibilities. No autonomous bots have been deployed or claimed to be working in the background.
            </p>
          </section>

          <section className={styles.section} id="work-queue">
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionOverline}>REAL GITHUB TASKS</div>
                <h2>Work in the queue<span className={styles.sectionDot}>.</span></h2>
                <p>Issues are the source of truth. Closing an issue updates the status here after sync.</p>
              </div>
              <div className={styles.queueActions}>
                <button
                  type="button"
                  className={styles.refreshButton}
                  onClick={() => window.location.reload()}
                  title="Reload the latest cached issue data"
                ><RefreshCw size={15} /> Refresh</button>
                <a className={styles.secondaryButton} href={GITHUB_REPO_URL + "/issues"} target="_blank" rel="noreferrer">
                  Open GitHub <ExternalLink size={15} />
                </a>
              </div>
            </div>

            <div className={styles.queueCard}>
              <div className={styles.queueTop}>
                <div className={styles.queueTabs} aria-label="Filter tasks by status">
                  {([
                    ["all", "All tasks"],
                    ["open", "Open"],
                    ["closed", "Completed"],
                  ] as const).map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setTaskStatus(key)}
                      className={taskStatus === key ? styles.queueTabActive : styles.queueTab}
                    >{label}</button>
                  ))}
                </div>
                <div className={styles.searchWrap}>
                  <Search size={16} />
                  <input
                    aria-label="Search tasks"
                    placeholder="Search work..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className={styles.roleFilters}>
                <button
                  type="button"
                  className={role === "ALL" ? styles.roleFilterActive : styles.roleFilter}
                  onClick={() => setRole("ALL")}
                >All roles</button>
                {AGENTS.map((agent) => (
                  <button
                    type="button"
                    key={agent.id}
                    className={role === agent.id ? styles.roleFilterActive : styles.roleFilter}
                    onClick={() => setRole(agent.id)}
                  >{agent.title}</button>
                ))}
              </div>

              {!hasLiveIssues ? (
                <div className={styles.emptyState}>
                  <Github size={25} />
                  <h3>GitHub status isn&apos;t available right now</h3>
                  <p>The six role descriptions are available, but issue counts and completion have not been verified. Check the repository directly.</p>
                  <a href={GITHUB_REPO_URL + "/issues"} target="_blank" rel="noreferrer">See issues <ArrowUpRight size={14} /></a>
                </div>
              ) : visibleTasks.length === 0 ? (
                <div className={styles.emptyState}>
                  <Search size={24} />
                  <h3>No issues match these filters</h3>
                  <p>Try another role, clear the search, or view all issues on GitHub.</p>
                  <button type="button" onClick={() => { setRole("ALL"); setTaskStatus("all"); setQuery(""); }}>Clear filters</button>
                </div>
              ) : (
                <div className={styles.taskList}>
                  {visibleTasks.map((task) => (
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.taskRow}
                      key={task.id}
                    >
                      <span className={task.state === "closed" ? styles.taskDone : styles.taskOpen}>
                        {task.state === "closed" ? <CheckCircle2 size={18} /> : <CircleDot size={18} />}
                      </span>
                      <div className={styles.taskBody}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <div className={styles.taskSub}>
                          <span>#{task.id}</span><span>·</span>
                          <span>{task.role}</span><span>·</span>
                          <span>Updated {task.updatedAt.slice(0, 10)}</span>
                        </div>
                      </div>
                      <span className={task.priority === "P0" ? styles.priorityP0 : styles.priorityP1}>{task.priority}</span>
                      <span className={task.state === "closed" ? styles.statusDone : styles.statusOpen}>
                        {task.state === "closed" ? "Closed" : "Open"}
                      </span>
                      <ArrowUpRight size={16} className={styles.taskLinkIcon} />
                    </a>
                  ))}
                </div>
              )}
              <div className={styles.queueFooter}>
                <span>{hasLiveIssues ? visibleTasks.length + " shown · " + tasks.length + " tracked" : "Issue sync unavailable"}</span>
                <span>Source: public GitHub issues · cached up to 2 min</span>
              </div>
            </div>
          </section>

          <section className={styles.lowerGrid} id="milestones">
            <div className={styles.milestonePanel}>
              <div className={styles.sectionOverline}>THE OPERATING PLAN</div>
              <h2>What happens next.</h2>
              <p className={styles.panelIntro}>One clear sequence. Don&apos;t sell an unverified product, and don&apos;t overbuild before speaking to customers.</p>
              <div className={styles.milestoneList}>
                {WORKSTREAMS.map((work, index) => (
                  <div className={styles.milestone} key={work.step}>
                    <div className={styles.milestoneIndicator}>{work.step}</div>
                    <div className={styles.milestoneCopy}>
                      <strong>{work.title}</strong>
                      <span>{work.note}</span>
                    </div>
                    <span className={styles.milestoneDetail}>{work.detail}</span>
                    {index !== WORKSTREAMS.length - 1 && <span className={styles.milestoneConnector} />}
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.truthPanel}>
              <div className={styles.sectionOverline}>TRACKER HEALTH</div>
              <h2>Progress, not theatre.</h2>
              <p className={styles.panelIntro}>This number represents closed GitHub issues — not AI activity or paying customers.</p>
              <div className={styles.progressHeader}>
                <strong>{hasLiveIssues && tasks.length ? progress + "%" : "—"}</strong>
                <span>tracked issues closed</span>
              </div>
              <div className={styles.progressTrack}><span style={{ width: hasLiveIssues ? progress + "%" : "0%" }} /></div>
              <div className={styles.progressLegend}>
                <span><span className={styles.legendClosed} /> {hasLiveIssues ? completedCount : "—"} closed</span>
                <span><span className={styles.legendOpen} /> {hasLiveIssues ? openCount : "—"} open</span>
              </div>
              <div className={styles.truthDivider} />
              <div className={styles.truthItem}><BadgeCheck size={18} /> Actual agent execution <strong>Manual / assisted</strong></div>
              <div className={styles.truthItem}><Github size={18} /> Task status <strong>{hasLiveIssues ? "GitHub connected" : "Unavailable"}</strong></div>
              <div className={styles.truthItem}><Wallet size={18} /> Revenue telemetry <strong>Not configured</strong></div>
            </div>
          </section>

          <footer className={styles.footer}>
            <div><span className={styles.footerMark}>L.</span> LeadFlow AI <span className={styles.footerSeparator}>/</span> Founder operations</div>
            <p>Built for decisions, not the illusion of autonomous work.</p>
            <a href="#overview">Back to top <ArrowDownRight size={15} className={styles.backToTop} /></a>
          </footer>
        </div>
      </main>
    </div>
  );
}
