import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Box,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Layers3,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Search,
  Settings2,
  Sun,
  Truck,
  X,
} from "lucide-react";
import { tasks } from "./fixtures";
import { Badge, Modal, Panel } from "./primitives";
import { Kit } from "./KitStudio";
import { Packing } from "./PackingPreview";
import "./precision.css";

type View = "work" | "kit" | "packing" | "foundation";
const views: { id: View; label: string; icon: typeof Box; group: string }[] = [
  { id: "work", label: "My work", icon: LayoutDashboard, group: "WORKSPACE" },
  { id: "kit", label: "Kit Studio", icon: Layers3, group: "PLAN & BUILD" },
  {
    id: "packing",
    label: "Packing & QC",
    icon: ClipboardCheck,
    group: "OPERATIONS",
  },
  {
    id: "foundation",
    label: "Foundations",
    icon: Settings2,
    group: "DESIGN REVIEW",
  },
];
function readView(): View {
  const id = window.location.hash.slice(1);
  return views.some((view) => view.id === id) ? (id as View) : "work";
}

export default function PrecisionPreview() {
  const [view, setView] = useState<View>(readView);
  const [theme, setTheme] = useState("light");
  const [compact, setCompact] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const navigationFocus = useRef(false);
  const focusAfterNavigation = () => {
    if (!navigationFocus.current) return null;
    navigationFocus.current = false;
    return heading.current;
  };
  const navigate = (next: View) => {
    navigationFocus.current = command || navOpen;
    window.location.hash = next;
    setView(next);
    setNavOpen(false);
    setCommand(false);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  };
  useEffect(() => {
    const hash = () => setView(readView());
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommand((open) => !open);
      }
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("keydown", shortcut);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("keydown", shortcut);
    };
  }, []);
  const nav = (
    <>
      <div className="p-brand">
        <span className="p-brand-mark">
          <Layers3 size={22} />
        </span>
        <span>
          experimind<span className="p-brand-sub">OPERATIONS</span>
        </span>
      </div>
      <div className="p-org">
        <span className="p-avatar">EL</span>
        <span>
          Experimind Labs<small>Design review workspace</small>
        </span>
      </div>
      <nav aria-label="Prototype navigation">
        {views.map(({ id, label, icon: Icon, group }) => (
          <div key={id}>
            <p className="p-nav-group">{group}</p>
            <a
              href={`#${id}`}
              aria-current={view === id ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate(id);
              }}
            >
              <Icon size={18} />
              {label}
              {id === "work" && <span className="p-nav-count">3</span>}
            </a>
            {id === "kit" && (
              <>
                <button
                  disabled
                  title="Proposed navigation; outside this prototype"
                >
                  <BookOpen size={18} />
                  Projects & schools
                </button>
                {[
                  ["Inventory", Box],
                  ["Purchasing", Package],
                  ["Production", Settings2],
                ].map(([label, Icon]) => {
                  const ItemIcon = Icon as typeof Box;
                  return (
                    <button
                      key={label as string}
                      disabled
                      title="Proposed navigation; outside this prototype"
                    >
                      <ItemIcon size={18} />
                      {label as string}
                    </button>
                  );
                })}
              </>
            )}
            {id === "packing" && (
              <>
                {[
                  ["Delivery & installation", Truck],
                  ["Administration", Settings2],
                ].map(([label, Icon]) => {
                  const ItemIcon = Icon as typeof Box;
                  return (
                    <button
                      key={label as string}
                      disabled
                      title="Proposed navigation; outside this prototype"
                    >
                      <ItemIcon size={18} />
                      {label as string}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        ))}
      </nav>
      <div className="p-sidebar-foot">
        <span className="p-dot" /> Synthetic workspace
        <a href="/">
          Open existing ERP <ArrowUpRight size={14} />
        </a>
      </div>
    </>
  );
  return (
    <div
      className={`precision p-shell ${compact ? "p-compact" : ""}`}
      data-theme={theme}
    >
      <a className="p-skip" href="#preview-main">
        Skip to workspace
      </a>
      <aside className="p-sidebar">{nav}</aside>
      <div className="p-stage">
        <header className="p-topbar">
          <div className="p-inline">
            <button
              className="p-icon p-mobile"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="p-top-context">
              Workspace <ChevronRight size={14} />{" "}
              <strong>{views.find((item) => item.id === view)?.label}</strong>
            </span>
          </div>
          <div className="p-inline">
            <button
              className="p-search"
              onClick={() => {
                setQuery("");
                setCommand(true);
              }}
            >
              <Search size={16} />
              <span>Jump to a workspace…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="p-icon"
              aria-label={
                theme === "light"
                  ? "Switch to dark theme"
                  : "Switch to light theme"
              }
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="p-icon"
              aria-label="Notification sample"
              onClick={() =>
                setNotice(
                  "You are reviewing synthetic tasks. No live notifications are connected.",
                )
              }
            >
              <Bell size={18} />
            </button>
            <span className="p-avatar">AK</span>
          </div>
        </header>
        <div className="p-preview-label" role="region" aria-label="Design preview notice">
          <span>
            <span className="p-dot" /> 13C · INTERACTIVE DESIGN PREVIEW
          </span>
          <span>Synthetic data · memory only · refresh resets changes</span>
        </div>
        <main id="preview-main" tabIndex={-1}>
          <div className="p-breadcrumb" role="navigation" aria-label="Breadcrumb">
            Experimind Labs <ChevronRight size={12} />{" "}
            {views.find((item) => item.id === view)?.label}
            {view === "kit" && (
              <>
                <ChevronRight size={12} /> Classroom collection
              </>
            )}
          </div>
          <div className="p-page-heading">
            <div>
              <p className="p-eyebrow">
                {view === "work"
                  ? "THURSDAY, 15 OCTOBER · SAMPLE DAY"
                  : view === "kit"
                    ? "TEMPLATE / DEMO-KIT-042"
                    : view === "packing"
                      ? "FLOOR WORKSPACE / QC SAMPLE"
                      : "PRECISION OPERATIONS / V0.1"}
              </p>
              <h1 tabIndex={-1} ref={heading}>
                {view === "work"
                  ? "A clear view of what’s next."
                  : view === "kit"
                    ? "Classroom collection"
                    : view === "packing"
                      ? "One package. Every detail."
                      : "Built for everyday precision."}
              </h1>
              <p>
                {view === "work"
                  ? "Your decisions, handoffs and checks, brought together."
                  : view === "kit"
                    ? "Connect learning activities to a packable, traceable kit."
                    : view === "packing"
                      ? "A focused packing and quality check, designed for touch."
                      : "A small, accessible foundation for a working ERP."}
              </p>
            </div>
            <Badge tone="neutral">
              {view === "work"
                ? "Kit coordinator · sample role"
                : "Design review"}
            </Badge>
          </div>
          <div hidden={view !== "work"}>
            <Work onNavigate={navigate} />
          </div>
          <div hidden={view !== "kit"}>
            <Kit theme={theme} notify={setNotice} />
          </div>
          <div hidden={view !== "packing"}>
            <Packing notify={setNotice} />
          </div>
          <div hidden={view !== "foundation"}>
            <Foundation
              compact={compact}
              setCompact={setCompact}
              theme={theme}
            />
          </div>
          <footer className="p-page-footer">
            <span>Precision Operations · Milestone 13C</span>
            <span>Prototype only. No operational records are changed.</span>
          </footer>
        </main>
      </div>
      <Modal
        theme={theme}
        title="Jump to a workspace"
        description="Search the four available prototype views. Ctrl K opens this dialog."
        open={command}
        onOpenChange={setCommand}
        focusAfterClose={focusAfterNavigation}
      >
        <label className="p-field">
          Search workspaces
          <input
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try Kit Studio"
          />
        </label>
        <div className="p-command-results">
          {views
            .filter((item) =>
              item.label.toLowerCase().includes(query.toLowerCase()),
            )
            .map((item) => (
              <button key={item.id} onClick={() => navigate(item.id)}>
                <item.icon size={18} />
                <span>{item.label}</span>
                <ArrowRight size={16} />
              </button>
            ))}
          {!views.some((item) =>
            item.label.toLowerCase().includes(query.toLowerCase()),
          ) && <p>No workspace found. Try “packing”.</p>}
        </div>
      </Modal>
      <Modal
        theme={theme}
        drawer
        title="Workspace navigation"
        description="Available prototype views and proposed ERP navigation."
        open={navOpen}
        onOpenChange={setNavOpen}
        focusAfterClose={focusAfterNavigation}
      >
        {nav}
      </Modal>
      <div className="p-notice-area" role="status" aria-live="polite">
        {notice && (
          <div className="p-notice">
            <Check size={18} />
            <span>{notice}</span>
            <button
              className="p-icon"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Work({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [filter, setFilter] = useState("");
  const [role, setRole] = useState("coordinator");
  const [selected, setSelected] = useState<string[]>([]);
  const shown = tasks.filter(
    (task) =>
      (role !== "packer" || task.view === "packing") &&
      `${task.title} ${task.id}`.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <>
      <div className="p-stats">
        <Stat
          label="Needs your attention"
          value="02"
          detail="Mapping and revision decisions"
          tone="warn"
        />
        <Stat
          label="Ready for the next step"
          value="01"
          detail="Package queued for QC"
        />
        <Stat
          label="Approved baseline"
          value="v1"
          detail="Available for comparison"
        />
      </div>
      <div className="p-work-grid">
        <Panel title="Your work queue" aside={<Badge>3 sample tasks</Badge>}>
          <div className="p-toolbar">
            <label className="p-search-field">
              <Search size={17} />
              <input
                aria-label="Filter tasks"
                placeholder="Filter tasks or reference…"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </label>
            <label className="p-field p-inline-field">
              View as
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                  setSelected([]);
                }}
              >
                <option value="coordinator">Kit coordinator</option>
                <option value="packer">Packing operator</option>
              </select>
            </label>
          </div>
          {selected.length > 0 && (
            <p className="p-selection" role="status">
              {selected.length} selected for review{" "}
              <button onClick={() => setSelected([])}>Clear selection</button>
            </p>
          )}
          <div className="p-table-scroll">
            <table>
              <caption className="p-sr">
                Synthetic work queue; choose a task to open its prototype
                workspace
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="p-sr">Select</span>
                  </th>
                  <th scope="col">TASK / REFERENCE</th>
                  <th scope="col">WORKSPACE</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">
                    <span className="p-sr">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <label className="p-select-target">
                        <input
                          type="checkbox"
                          aria-label={`Select ${task.id}`}
                          checked={selected.includes(task.id)}
                          onChange={(event) =>
                            setSelected(
                              event.target.checked
                                ? [...selected, task.id]
                                : selected.filter((id) => id !== task.id),
                            )
                          }
                        />
                      </label>
                    </td>
                    <td>
                      <button
                        className="p-text-button p-task"
                        onClick={() => onNavigate(task.view)}
                      >
                        {task.title}
                      </button>
                      <small className="p-muted">
                        {task.id} · {task.detail}
                      </small>
                    </td>
                    <td>{task.owner}</td>
                    <td>
                      <Badge
                        tone={
                          task.status === "Needs attention"
                            ? "warn"
                            : task.status === "Ready to check"
                              ? "good"
                              : "neutral"
                        }
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="p-icon"
                        aria-label={`Open ${task.id}`}
                        onClick={() => onNavigate(task.view)}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!shown.length && (
            <div className="p-empty">
              <Search size={28} />
              <h3>No tasks match this view</h3>
              <p>Try a different reference or switch the sample role.</p>
              <button
                className="p-button"
                onClick={() => {
                  setFilter("");
                  setRole("coordinator");
                }}
              >
                Reset filters
              </button>
            </div>
          )}
          <div className="p-panel-foot">
            {shown.length} of 3 sample tasks
            <span>All dates and references are illustrative</span>
          </div>
        </Panel>
        <div className="p-stack">
          <section className="p-feature">
            <span className="p-feature-icon">
              <Layers3 size={24} />
            </span>
            <p className="p-eyebrow">PICK UP WHERE YOU LEFT OFF</p>
            <h2>
              A kit that makes sense.
              <br />
              Before it becomes a box.
            </h2>
            <p>
              Review activities, shared materials and their physical locations
              in one workspace.
            </p>
            <button
              className="p-button p-primary"
              onClick={() => onNavigate("kit")}
            >
              Open Kit Studio <ArrowRight size={16} />
            </button>
            <div className="p-feature-bottom">
              SCIENCE 8–10 <span>Draft v2</span>
            </div>
          </section>
          <Panel title="Review notes">
            <div className="p-padded p-note">
              <CircleHelp size={19} />
              <p>
                Start with the educational structure. Package locations describe
                where materials go; they do not create additional demand.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <section className="p-stat">
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <small>
        <span className={`p-dot ${tone === "warn" ? "p-dot-warn" : ""}`} />
        {detail}
      </small>
    </section>
  );
}

function Foundation({
  compact,
  setCompact,
  theme,
}: {
  compact: boolean;
  setCompact: (value: boolean) => void;
  theme: string;
}) {
  const [state, setState] = useState("ready");
  const [drawer, setDrawer] = useState(false);
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <div className="p-foundation-grid">
        <Panel
          title="Type with purpose"
          aside={<Badge>System fonts · local</Badge>}
        >
          <div className="p-padded p-type-specimen">
            <p className="p-eyebrow">EYEBROW / 11 / SEMIBOLD / TRACKED</p>
            <h2>Clarity at every level.</h2>
            <h3>A workspace, not a wall of widgets.</h3>
            <p>
              Body text supports decisions. Secondary text explains context.
            </p>
            <code>DEMO-PKG-018 · 24 each</code>
            <small>14px body · 12px metadata · 32px page title</small>
          </div>
        </Panel>
        <Panel title="Semantic color">
          <div className="p-padded p-swatches">
            {[
              ["Canvas", "var(--p-bg)"],
              ["Surface", "var(--p-surface)"],
              ["Accent", "var(--p-accent)"],
              ["Positive", "var(--p-good)"],
              ["Attention", "var(--p-warn)"],
              ["Critical", "var(--p-bad)"],
            ].map(([label, color]) => (
              <div key={label}>
                <span style={{ background: color }} />
                <strong>{label}</strong>
              </div>
            ))}
          </div>
          <div className="p-padded p-inline">
            <Badge>Draft</Badge>
            <Badge tone="good">Approved</Badge>
            <Badge tone="warn">Needs attention</Badge>
            <Badge tone="bad">Rejected</Badge>
          </div>
        </Panel>
        <Panel title="Controls & validation">
          <form
            className="p-padded"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              setInvalid(!value.trim());
            }}
          >
            <label className="p-field">
              Package label{" "}
              <span className="p-muted">Required · sample validation</span>
              <input
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setInvalid(false);
                }}
                aria-invalid={invalid}
                aria-describedby={invalid ? "label-error" : undefined}
                placeholder="e.g. Science 8 · Box 01"
              />
            </label>
            {invalid && (
              <p id="label-error" role="alert" className="p-error-text">
                Enter a package label.
              </p>
            )}
            <div className="p-inline">
              <button className="p-button p-primary" type="submit">
                Validate sample
              </button>
              <button
                className="p-button"
                type="button"
                onClick={() => setDrawer(true)}
              >
                Open detail drawer
              </button>
            </div>
            {value.trim() && !invalid && (
              <p className="p-helper">
                Local input only. Submit validates the required field.
              </p>
            )}
          </form>
        </Panel>
        <Panel title="Density & rhythm">
          <div className="p-padded">
            <label className="p-check-row">
              <input
                type="checkbox"
                checked={compact}
                onChange={(event) => setCompact(event.target.checked)}
              />
              Compact data-table rows
            </label>
            <p className="p-helper">
              4px spacing scale · 44px minimum controls · 56px floor targets.
              Density affects tables; touch controls retain their size.
            </p>
            <div className="p-spacing">
              {[4, 8, 12, 16, 24, 32].map((size) => (
                <span key={size}>
                  <i style={{ height: size }} />
                  {size}
                </span>
              ))}
            </div>
          </div>
        </Panel>
        <Panel
          title="State patterns"
          className="p-state-panel"
          aside={
            <label className="p-field p-inline-field">
              Example
              <select
                value={state}
                onChange={(event) => setState(event.target.value)}
              >
                <option value="ready">Ready</option>
                <option value="loading">Loading</option>
                <option value="empty">Empty</option>
                <option value="error">Error</option>
                <option value="conflict">Conflict</option>
              </select>
            </label>
          }
        >
          <div className="p-state-demo">
            {state === "loading" ? (
              <div
                role="status"
                aria-label="Loading sample requirements"
                className="p-skeleton"
              >
                <span />
                <span />
                <span />
                <p>Loading sample requirements…</p>
              </div>
            ) : state === "empty" ? (
              <div className="p-empty">
                <Box size={28} />
                <h3>No package locations yet</h3>
                <p>Start with a box, then add partitions and pouches.</p>
              </div>
            ) : state === "error" || state === "conflict" ? (
              <div className="p-callout p-error" role="alert">
                <strong>
                  {state === "conflict"
                    ? "A newer revision is available"
                    : "The sample could not be loaded"}
                </strong>
                <p>
                  {state === "conflict"
                    ? "Keep your local draft and review the latest approved revision before continuing."
                    : "Your context is retained. Retry when the connection is available."}
                </p>
                <button className="p-button" onClick={() => setState("ready")}>
                  {state === "conflict"
                    ? "Resolve sample conflict"
                    : "Retry sample"}
                </button>
              </div>
            ) : (
              <div className="p-callout">
                <Check size={20} />
                <strong>Ready for review</strong>
                <p>Every state has a clear message and a useful next action.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>
      <Modal
        theme={theme}
        drawer
        title="Context without losing your place"
        description="A contextual detail panel. Escape closes it and returns focus to the opener."
        open={drawer}
        onOpenChange={setDrawer}
      >
        <p>
          Use drawers for supporting context and dialogs for bounded decisions.
        </p>
        <dl className="p-definition">
          <dt>Reference</dt>
          <dd>DEMO-PKG-018</dd>
          <dt>Storage</dt>
          <dd>In-memory fixture</dd>
          <dt>Interaction</dt>
          <dd>Focus contained · Escape to dismiss</dd>
        </dl>
      </Modal>
    </>
  );
}
