"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2,
  CircleDot, ExternalLink, GitBranch, Search, ShieldCheck,
} from "lucide-react";
import {
  AGENTS, GITHUB_REPO_URL,
  type AgentId, type StudioTasksResult,
} from "@/lib/agent-studio";
import styles from "./agent-studio.module.css";

type Scope = "ALL" | AgentId;
type TaskStatus = "all" | "open" | "closed";
const roleCopy: Record<AgentId, string> = {
  CEO: "Decide what matters.",
  CTO: "Make it work.",
  CMO: "Give it a voice.",
  SALES: "Find the right people.",
  PRODUCT: "Make it worth using.",
  CFO: "Know the numbers.",
};
const roleLabels: Record<AgentId, string> = {
  CEO: "Strategy", CTO: "Engineering", CMO: "Marketing",
  SALES: "Sales", PRODUCT: "Product", CFO: "Finance",
};

export default function AgentStudio({ tasks, source }: StudioTasksResult) {
  const [activeId, setActiveId] = useState<AgentId>("CTO");
  const [scope, setScope] = useState<Scope>("ALL");
  const [status, setStatus] = useState<TaskStatus>("open");
  const [search, setSearch] = useState("");

  const active = AGENTS.find((agent) => agent.id === activeId)!;
  const synced = source === "github";
  const open = synced ? tasks.filter((task) => task.state === "open").length : null;
  const closed = synced ? tasks.filter((task) => task.state === "closed").length : null;
  const donePercent = synced && tasks.length > 0
    ? Math.round(((closed ?? 0) / tasks.length) * 100)
    : null;

  const selectedTasks = tasks.filter((task) =>
    task.role === activeId && task.state === "open"
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((task) =>
      (scope === "ALL" || task.role === scope) &&
      (status === "all" || task.state === status) &&
      (!term || task.title.toLowerCase().includes(term) ||
        task.role.toLowerCase().includes(term))
    );
  }, [tasks, scope, status, search]);

  function selectRole(id: AgentId) {
    setActiveId(id);
    setScope(id);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topLine}>
        <Link href="/" className={styles.wordmark} aria-label="LeadFlow AI home">
          <span className={styles.logoSquare}>L<span>F</span></span>
          <span>leadflow<span className={styles.wordmarkDot}>.ai</span></span>
        </Link>
        <div className={styles.topCenter}>
          <span className={styles.tinyCircle} /> THE FOUNDER&apos;S DESK
          <span className={styles.topDivider}>/</span> WORKSPACE 001
        </div>
        <div className={styles.topRight}>
          <span className={styles.connection}><span className={styles.signal} /> {synced ? "GITHUB SYNCED" : "SYNC UNAVAILABLE"}</span>
          <Link href="/dashboard" className={styles.topLink}>PRODUCT APP <ArrowUpRight size={15} /></Link>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="studio-title">
          <div className={styles.intro}>
            <div className={styles.supra}><span>LEADFLOW / OPERATIONS</span><span>EST. 2026</span></div>
            <h1 id="studio-title">One founder.<br /><span>Six disciplines.</span></h1>
            <p className={styles.heroBody}>
              Engineering, sales, marketing, product, strategy and finance.
              One working board for the jobs that move LeadFlow AI forward.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#work-queue">See the actual work <ArrowUpRight size={19}/></a>
              <span className={styles.heroFootnote}>No pretend agents. No fake revenue.</span>
            </div>
            <div className={styles.indexLine}><span>01 — 06</span><span>SELECT A ROLE ON THE 3D DESK</span></div>
          </div>

          <div className={styles.stage}>
            <div className={styles.stageTop}>
              <span className={styles.stageTag}>THE WORK TABLE / 3D</span>
              <span className={styles.stageControls}><span /> INTERACTIVE OBJECT</span>
            </div>
            <div className={styles.stageGrain} aria-hidden="true"/>
            <div className={styles.perspective}>
              <div className={styles.platform}>
                <div className={styles.platformBase} />
                <div className={styles.platformTop}>
                  <div className={styles.platformGrid}>
                    {AGENTS.map((agent,i) => (
                      <button
                        type="button"
                        key={agent.id}
                        className={activeId === agent.id ? styles.tileSelected : styles.tile}
                        onClick={() => selectRole(agent.id)}
                        aria-label={"Select " + agent.title + " agent role"}
                        aria-pressed={activeId === agent.id}
                      >
                        <span className={styles.tileIndex}>0{i + 1}</span>
                        <span className={styles.tileName}>{agent.title}</span>
                        <span className={styles.tileLine}/>
                        <span className={styles.tileSubtitle}>{roleLabels[agent.id]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.stageBottom}>
              <span><span className={styles.stageMarker}/> YOU CONTROL EVERY ACTION</span>
              <span>FIG. 01 — OPERATING ROLES</span>
            </div>
          </div>
        </section>

        <section className={styles.ticker} aria-label="Verified operating snapshot">
          <div><span className={styles.tickerLabel}>DEFINED ROLES</span><strong>06</strong></div>
          <div><span className={styles.tickerLabel}>OPEN GITHUB TASKS</span><strong>{open === null ? "—" : String(open).padStart(2,"0")}</strong></div>
          <div><span className={styles.tickerLabel}>ISSUES CLOSED</span><strong>{closed === null ? "—" : String(closed).padStart(2,"0")}</strong></div>
          <div><span className={styles.tickerLabel}>REAL REVENUE</span><strong className={styles.unavailable}>NOT CONNECTED</strong></div>
          <div className={styles.tickerAside}><span className={styles.tickerLabel}>WEEK 6 GOAL</span><strong>03 <small>PAYING CUSTOMERS / TARGET</small></strong></div>
        </section>

        <section className={styles.roleSection} id="roles">
          <div className={styles.sectionKicker}>01 / TEAM ARCHITECTURE</div>
          <div className={styles.roleIntro}>
            <h2>Who handles what<span className={styles.dot}>.</span></h2>
            <p>Select any specialist to see responsibilities and GitHub work. These are defined AI assisted roles, not active background bots.</p>
          </div>
          <div className={styles.roleTabs} role="group" aria-label="Select an AI team role">
            {AGENTS.map((agent,i) => (
              <button
                type="button"
                key={agent.id}
                className={activeId === agent.id ? styles.roleTabOn : styles.roleTab}
                onClick={() => selectRole(agent.id)}
                aria-pressed={activeId === agent.id}
              >
                <span className={styles.roleTabIndex}>0{i+1}</span>
                <span>{agent.title}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <div className={styles.roleDetail} aria-live="polite">
            <div className={styles.detailLeft}>
              <span className={styles.detailOverline}>{active.number} / {roleLabels[activeId].toUpperCase()} DEPARTMENT</span>
              <h3>{roleCopy[activeId]}</h3>
              <p>{active.mission}</p>
              <div className={styles.deliverable}><span>THE OUTPUT</span><strong>{active.deliverable}</strong></div>
            </div>
            <div className={styles.detailRight}>
              <div className={styles.detailHeading}>
                <span>ASSIGNED WORK</span>
                <span>{synced ? selectedTasks.length + " OPEN" : "STATUS UNKNOWN"}</span>
              </div>
              {!synced ? (
                <div className={styles.detailEmpty}>GitHub issues cannot be verified at the moment.</div>
              ) : selectedTasks.length ? selectedTasks.slice(0,3).map((task, i) => (
                <a key={task.id} href={task.url} target="_blank" rel="noreferrer" className={styles.detailTask}>
                  <span>0{i+1}</span>
                  <strong>{task.title}</strong>
                  <span className={styles.detailPriority}>{task.priority}</span>
                  <ArrowUpRight size={16}/>
                </a>
              )) : (
                <div className={styles.detailEmpty}>No open tasks are currently assigned to this role.</div>
              )}
              <a className={styles.detailAll} href="#work-queue" onClick={() => setScope(activeId)}>Review the entire work queue <ArrowRight size={16}/></a>
            </div>
          </div>
        </section>

        <section className={styles.workSection} id="work-queue" aria-labelledby="work-queue-title">
          <div className={styles.sectionKicker}>02 / LIVE TASK TRACKER</div>
          <div className={styles.workIntro}>
            <div><h2 id="work-queue-title">The work, not the hype<span className={styles.dot}>.</span></h2>
              <p>Open and completed tasks come from actual GitHub issues. Click any item to read its acceptance criteria.</p></div>
            <a href={GITHUB_REPO_URL + "/issues"} target="_blank" rel="noreferrer" className={styles.githubButton}><GitBranch size={16}/> OPEN GITHUB <ExternalLink size={14}/></a>
          </div>

          <div className={styles.workFilters}>
            <div className={styles.statusSwitch} role="group" aria-label="Filter issue status">
              {([["open","Open"],["all","All"],["closed","Closed"]] as const).map(([value,label]) => (
                <button type="button" key={value} className={status===value?styles.statusOn:styles.statusOff} onClick={() => setStatus(value)}>
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.filterRight}>
              <label className={styles.selectWrap}>
                <span>ROLE</span>
                <select aria-label="Filter by role" value={scope} onChange={(event)=>setScope(event.target.value as Scope)}>
                  <option value="ALL">All roles</option>
                  {AGENTS.map((agent)=><option key={agent.id} value={agent.id}>{agent.title}</option>)}
                </select>
              </label>
              <label className={styles.searchWrap}><Search size={17}/><input aria-label="Search tasks" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Find a task"/></label>
            </div>
          </div>

          <div className={styles.issuePanel}>
            {!synced ? (
              <div className={styles.issueEmpty}>
                <ShieldCheck size={22}/>
                <strong>GitHub cannot be reached.</strong>
                <span>Issue counts are unavailable. We never replace missing data with made up results.</span>
              </div>
            ) : filtered.length ? (
              filtered.map((task) => (
                <a key={task.id} href={task.url} target="_blank" rel="noreferrer" className={styles.issueRow}>
                  <span className={styles.issueNo}>#{task.id.toString().padStart(3,"0")}</span>
                  <span className={styles.issueState}>{task.state === "closed" ? <CheckCircle2 size={18}/> : <CircleDot size={18}/>}</span>
                  <span className={styles.issueMain}><strong>{task.title}</strong><small>{task.role} / UPDATED {task.updatedAt.slice(0,10)}</small></span>
                  <span className={task.priority==="P0"?styles.criticalPriority:styles.normalPriority}>{task.priority}</span>
                  <ArrowUpRight size={18} className={styles.issueArrow}/>
                </a>
              ))
            ) : (
              <div className={styles.issueEmpty}>
                <Search size={22}/>
                <strong>Nothing in this view.</strong>
                <span>Try another role or status filter.</span>
              </div>
            )}
            <div className={styles.issueFooter}>
              <span>{synced ? filtered.length + " SHOWN / " + tasks.length + " TRACKED" : "UNVERIFIED"}</span>
              <span>GITHUB PUBLIC API · CACHED UP TO 2 MIN</span>
            </div>
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.closingNumber}>03 / THE NEXT MILESTONE</div>
          <div className={styles.closingText}>
            <h2>First, make it dependable.<br/>Then, make it <span>worth paying for.</span></h2>
            <p>Stabilise the lead flow. Show a coaching centre a working demo. Validate demand before building more automation.</p>
          </div>
          <div className={styles.closingBox}>
            <span>ISSUES VERIFIED CLOSED</span>
            <strong>{donePercent === null ? "—" : donePercent + "%"}</strong>
            <div className={styles.progressTrack}><span style={{transform: "scaleX(" + (donePercent ?? 0)/100 + ")"}}/></div>
            <small>Based on actual closed GitHub issues, not an AI activity estimate.</small>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span><Activity size={16}/> LEADFLOW AI / FOUNDER OPERATIONS</span>
        <span>PUBLIC READ ONLY PREVIEW · NO AUTONOMOUS ACTIONS</span>
        <Link href="/">BACK TO LEADFLOW <ArrowUpRight size={15}/></Link>
      </footer>
    </div>
  );
}
