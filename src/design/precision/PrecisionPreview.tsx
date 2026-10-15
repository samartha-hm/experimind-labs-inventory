import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Box,
  Check,
  CheckCheck,
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
import {
  approvedMapping,
  initialCounts,
  quantityPreview,
  subjects,
  tasks,
  type Counts,
  type Location,
} from "./fixtures";
import { Badge, Modal, Panel } from "./primitives";
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
        <div className="p-preview-label">
          <span>
            <span className="p-dot" /> 13B · INTERACTIVE DESIGN PREVIEW
          </span>
          <span>Synthetic data · memory only · refresh resets changes</span>
        </div>
        <main id="preview-main" tabIndex={-1}>
          <div className="p-breadcrumb" aria-label="Breadcrumb">
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
            <span>Precision Operations · Milestone 13B</span>
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

function Kit({
  theme,
  notify,
}: {
  theme: string;
  notify: (message: string) => void;
}) {
  const [subject, setSubject] = useState("science");
  const [grade, setGrade] = useState("s8");
  const [activity, setActivity] = useState("cells");
  const [revision, setRevision] = useState("draft");
  const [mapping, setMapping] = useState(approvedMapping);
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [completeSets, setCompleteSets] = useState(1);
  const [commonRate, setCommonRate] = useState(1);
  const [tab, setTab] = useState("activities");
  const [compare, setCompare] = useState(false);
  const [reset, setReset] = useState(false);
  const [conflict, setConflict] = useState(false);
  const readonly = revision === "approved";
  const activeMap = readonly ? approvedMapping : mapping;
  const activeCounts = readonly ? initialCounts : counts;
  const activeSubject = subjects.find((item) => item.id === subject)!;
  const activeGrade =
    activeSubject.grades.find((item) => item.id === grade) ??
    activeSubject.grades[0];
  let calculation: ReturnType<typeof quantityPreview> | undefined;
  let calculationError = "";
  try {
    calculation = quantityPreview(
      activeCounts,
      readonly ? 1 : completeSets,
      readonly ? 1 : commonRate,
    );
  } catch (error) {
    calculationError =
      error instanceof Error ? error.message : "Review the quantity inputs.";
  }
  const missing =
    subject === "science" &&
    grade === "s8" &&
    (!activeMap.cells || !activeMap.light);
  const changed =
    mapping.cells !== approvedMapping.cells ||
    mapping.light !== approvedMapping.light ||
    commonRate !== 1 ||
    completeSets !== 1 ||
    Object.keys(counts).some(
      (key) =>
        counts[key as keyof Counts] !== initialCounts[key as keyof Counts],
    );
  const numberInput = (
    label: string,
    value: number,
    change: (value: number) => void,
  ): ReactNode => (
    <label className="p-field">
      {label}
      <input
        type="number"
        min="0"
        max="1000000"
        step="1"
        value={Number.isNaN(value) ? "" : value}
        disabled={readonly || conflict}
        onChange={(event) =>
          change(event.target.value === "" ? NaN : Number(event.target.value))
        }
      />
    </label>
  );
  return (
    <>
      <div className="p-object-bar">
        <div className="p-inline">
          <span className="p-object-icon">
            <Layers3 size={22} />
          </span>
          <div>
            <strong>Science & Mathematics</strong>
            <small>Classroom collection · synthetic template</small>
          </div>
          <Badge tone={readonly ? "good" : "neutral"}>
            {readonly
              ? "Approved v1 · immutable"
              : changed
                ? "Draft v2 · modified in memory"
                : "Draft v2"}
          </Badge>
        </div>
        <div className="p-inline">
          <label className="p-sr" htmlFor="revision">
            Revision view
          </label>
          <select
            id="revision"
            value={revision}
            onChange={(event) => setRevision(event.target.value)}
          >
            <option value="draft">Draft v2</option>
            <option value="approved">Approved v1</option>
          </select>
          <button className="p-button" onClick={() => setCompare(true)}>
            Compare revisions
          </button>
        </div>
      </div>
      <div className="p-kit-grid">
        <Panel
          title="Educational structure"
          className="p-outline"
          aside={<BookOpen size={17} />}
        >
          <div className="p-padded">
            <label className="p-field">
              Subject
              <select
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value);
                  setGrade(event.target.value === "science" ? "s8" : "m8");
                  setActivity(
                    event.target.value === "science" ? "cells" : "geometry",
                  );
                }}
              >
                <option value="science">Science</option>
                <option value="maths">Mathematics</option>
              </select>
            </label>
            <label className="p-field">
              Grade
              <select
                value={grade}
                onChange={(event) => {
                  setGrade(event.target.value);
                  setActivity(subject === "maths" ? "geometry" : "cells");
                }}
              >
                {activeSubject.grades.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="p-outline-label">
            ACTIVITIES <span>{activeGrade.activities.length}</span>
          </p>
          {activeGrade.activities.map((item, index) => (
            <button
              className={`p-outline-item ${activity === (subject === "maths" ? "geometry" : index ? "light" : "cells") ? "is-active" : ""}`}
              key={item.id}
              onClick={() =>
                setActivity(
                  subject === "maths" ? "geometry" : index ? "light" : "cells",
                )
              }
            >
              <span className="p-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                {item.name}
                <small>{item.code}</small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
          <div className="p-outline-note">
            <Layers3 size={18} />
            <strong>Shared equipment</strong>
            <p>
              {subject === "science"
                ? "One microscope in each grade’s common crate. Referenced by both activities; counted once."
                : "Mathematics has independent activity materials and no Science crate demand."}
            </p>
          </div>
        </Panel>
        <div className="p-stack">
          <Panel
            title={
              activity === "geometry"
                ? "Building geometric solids"
                : activity === "cells"
                  ? "Observing plant cells"
                  : "Exploring light"
            }
            aside={
              <Badge>
                {activeSubject.name} · {activeGrade.name}
              </Badge>
            }
          >
            <div
              className="p-tablist"
              role="group"
              aria-label="Kit detail views"
            >
              {[
                ["activities", "Materials & mapping"],
                ["rules", "Quantity rules"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "activities" ? (
              <>
                <div className="p-padded">
                  <p className="p-eyebrow">ACTIVITY BOM</p>
                  <div className="p-material-row">
                    <span className="p-material-icon">
                      <Box size={22} />
                    </span>
                    <div>
                      <strong>
                        {activity === "geometry"
                          ? "Geometric solids set"
                          : activity === "cells"
                            ? "Prepared slide"
                            : "Glass prism"}
                      </strong>
                      <small>
                        Owned by this activity ·{" "}
                        {activity === "cells" ? "2 each" : "1 each"} / selected
                        grade set
                      </small>
                    </div>
                    <Badge>Reusable</Badge>
                  </div>
                  {subject === "science" && (
                    <div className="p-material-row">
                      <span className="p-material-icon">
                        <Layers3 size={22} />
                      </span>
                      <div>
                        <strong>Student microscope</strong>
                        <small>
                          Reference only → Science {grade.slice(1)} common crate
                        </small>
                      </div>
                      <Badge tone="good">Shared · 1 BOM owner</Badge>
                    </div>
                  )}
                </div>
                <div className="p-mapping">
                  <div>
                    <p className="p-eyebrow">PACKAGE LOCATION</p>
                    <h3>Give this activity a home.</h3>
                    <p>
                      Map an activity to a location without adding another BOM
                      line.
                    </p>
                  </div>
                  {subject === "science" && grade === "s8" ? (
                    <label className="p-field">
                      Activity location
                      <select
                        disabled={readonly || conflict}
                        aria-invalid={
                          !activeMap[activity === "cells" ? "cells" : "light"]
                        }
                        value={
                          activeMap[activity === "cells" ? "cells" : "light"]
                        }
                        onChange={(event) =>
                          setMapping({
                            ...mapping,
                            [activity === "cells" ? "cells" : "light"]: event
                              .target.value as Location,
                          })
                        }
                      >
                        <option value="">Unassigned — needs mapping</option>
                        <option>Pouch A</option>
                        <option>Pouch B</option>
                      </select>
                    </label>
                  ) : (
                    <p>
                      <Badge>Reference fixture</Badge> Box 01 / Partition 01 /
                      Pouch A<br />
                      <small>
                        Mapping editing is scoped to Science 8 in this sample.
                      </small>
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="p-padded">
                <p className="p-helper">
                  Live preview uses the existing requirement calculator with
                  synthetic inputs. Mathematics stays independent.
                </p>
                <div className="p-rule-grid">
                  {(
                    Object.entries(activeCounts) as [keyof Counts, number][]
                  ).map(([key, value]) =>
                    numberInput(
                      key === "m8"
                        ? "Mathematics 8 sets"
                        : `Science ${key.slice(1)} sets`,
                      value,
                      (next) => setCounts({ ...counts, [key]: next }),
                    ),
                  )}
                  {numberInput(
                    "Explicit Science 8–10 complete sets",
                    readonly ? 1 : completeSets,
                    setCompleteSets,
                  )}
                  {numberInput(
                    "Science 8 common crates / set",
                    readonly ? 1 : commonRate,
                    setCommonRate,
                  )}
                </div>
                <p className="p-helper">
                  Universal crates require an explicit complete-set count,
                  supported by all three Science grades. Equal grade quantities
                  do not infer universal crates.
                </p>
              </div>
            )}
          </Panel>
          <Panel
            title="Requirement preview"
            aside={
              <span className="p-muted">
                Authoritative calculator · synthetic inputs
              </span>
            }
          >
            {calculationError ? (
              <div className="p-callout p-error" role="alert">
                <strong>Quantity inputs need attention</strong>
                <p>{calculationError}</p>
                <button
                  className="p-button"
                  disabled={readonly}
                  onClick={() => {
                    setCounts(initialCounts);
                    setCompleteSets(1);
                    setCommonRate(1);
                  }}
                >
                  Reset quantity inputs
                </button>
              </div>
            ) : (
              <div className="p-table-scroll">
                <table>
                  <caption className="p-sr">
                    Calculated common and universal crate requirements
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">CRATE / QUANTITY BASIS</th>
                      <th scope="col">COUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation?.lines
                      .filter((line) => !line.material_id)
                      .map((line) => (
                        <tr key={line.owner_id}>
                          <td>
                            <strong>{line.owner_name}</strong>
                            <small>
                              {line.owner_id === "universal"
                                ? "Explicit complete Science 8–10 sets"
                                : "Selected sets for this Science grade only"}
                            </small>
                          </td>
                          <td className="p-mono">{line.quantity}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="p-panel-foot">
                  Mathematics solids:{" "}
                  {calculation?.totals.find(
                    (item) => item.inventory_item_id === "demo-solids",
                  )?.quantity ?? 0}{" "}
                  each<span>Shared references add zero demand</span>
                </div>
              </div>
            )}
          </Panel>
        </div>
        <div className="p-stack">
          <Panel title="Physical packing" aside={<Package size={17} />}>
            <div className="p-packing-tree">
              <details open>
                <summary>
                  <Box size={17} />
                  Box 01{" "}
                  <Badge>
                    {activeSubject.name} {grade.slice(1)}
                  </Badge>
                </summary>
                <details open>
                  <summary>Partition 01</summary>
                  {["Pouch A", "Pouch B"].map((location) => (
                    <div className="p-pouch" key={location}>
                      <Package size={16} />
                      <span>
                        <strong>{location}</strong>
                        <small>
                          {subject === "science" && grade === "s8"
                            ? Object.entries(activeMap)
                                .filter(([, value]) => value === location)
                                .map(([key]) =>
                                  key === "cells"
                                    ? "Plant cells"
                                    : "Exploring light",
                                )
                                .join(" + ") || "No activity mapped"
                            : location === "Pouch A"
                              ? "Activity materials"
                              : "Available location"}
                        </small>
                      </span>
                    </div>
                  ))}
                </details>
              </details>
            </div>
            <div className="p-panel-foot">
              Educational and physical structures stay separate.
            </div>
          </Panel>
          <Panel
            title="Review readiness"
            aside={
              <Badge
                tone={conflict || missing || calculationError ? "warn" : "good"}
              >
                {conflict
                  ? "Conflict"
                  : missing || calculationError
                    ? "Needs attention"
                    : "Ready to review"}
              </Badge>
            }
          >
            <div className="p-padded p-readiness">
              <p>
                <Check size={16} />
                Shared BOM ownership explicit
              </p>
              <p>
                <Check size={16} />
                Science / Mathematics independent
              </p>
              <p>
                {missing ? <CircleHelp size={16} /> : <Check size={16} />}
                {missing
                  ? "Assign both Science 8 activity locations"
                  : "Sample activity locations mapped"}
              </p>
              <p className="p-helper">
                Design checks only. This is not server validation or approval.
              </p>
              <button
                className="p-button p-primary"
                disabled={readonly || missing || !!calculationError || conflict}
                onClick={() =>
                  notify(
                    "Draft reviewed locally. Nothing was saved or approved in the ERP.",
                  )
                }
              >
                Review in memory <ArrowRight size={16} />
              </button>
              <button
                className="p-text-button"
                disabled={readonly}
                onClick={() => setConflict(true)}
              >
                Show revision conflict example
              </button>
              {conflict && (
                <div className="p-callout p-error" role="alert">
                  <strong>Sample revision conflict</strong>
                  <p>
                    A newer revision would block editing. This scenario is
                    simulated; your local edits are retained.
                  </p>
                  <button
                    className="p-button"
                    onClick={() => setConflict(false)}
                  >
                    Dismiss sample conflict
                  </button>
                </div>
              )}
              <button
                className="p-text-button"
                disabled={readonly || !changed}
                onClick={() => setReset(true)}
              >
                Discard local draft changes
              </button>
            </div>
          </Panel>
        </div>
      </div>
      <Modal
        theme={theme}
        drawer
        title="Revision comparison"
        description="Approved v1 is a fixed fixture. Draft v2 changes exist only in this browser session."
        open={compare}
        onOpenChange={setCompare}
      >
        <table>
          <caption>Approved baseline → local draft</caption>
          <thead>
            <tr>
              <th scope="col">FIELD</th>
              <th scope="col">APPROVED v1</th>
              <th scope="col">DRAFT v2</th>
            </tr>
          </thead>
          <tbody>
            {(["cells", "light"] as const).map((key) => (
              <tr key={key}>
                <th scope="row">
                  {key === "cells" ? "Plant cells location" : "Light location"}
                </th>
                <td>{approvedMapping[key]}</td>
                <td>{mapping[key] || "Unassigned"}</td>
              </tr>
            ))}
            {Object.entries(counts).map(([key, value]) => (
              <tr key={key}>
                <th scope="row">{key} sets</th>
                <td>{initialCounts[key as keyof Counts]}</td>
                <td>{String(value)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Explicit complete sets</th>
              <td>1</td>
              <td>{String(completeSets)}</td>
            </tr>
            <tr>
              <th scope="row">Science 8 common / set</th>
              <td>1</td>
              <td>{String(commonRate)}</td>
            </tr>
          </tbody>
        </table>
        <p className="p-helper">
          No approved record is changed. Refreshing clears the draft.
        </p>
      </Modal>
      <Modal
        theme={theme}
        title="Discard local changes?"
        description="This resets the synthetic draft to its approved baseline. No ERP records are involved."
        open={reset}
        onOpenChange={setReset}
      >
        <div className="p-actions">
          <button className="p-button" onClick={() => setReset(false)}>
            Keep editing
          </button>
          <button
            className="p-button p-danger"
            onClick={() => {
              setMapping(approvedMapping);
              setCounts(initialCounts);
              setCommonRate(1);
              setCompleteSets(1);
              setConflict(false);
              setReset(false);
              notify("Local draft reset to the sample baseline.");
            }}
          >
            Discard local changes
          </button>
        </div>
      </Modal>
    </>
  );
}

function Packing({ notify }: { notify: (message: string) => void }) {
  const [lookup, setLookup] = useState("DEMO-PKG-018");
  const [found, setFound] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [role, setRole] = useState("operator");
  const [state, setState] = useState("Awaiting checks");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const checks = [
    "Slides and prism match the sample BOM",
    "Pouch seals and protective wrap intact",
    "Package label is legible and correctly placed",
  ];
  const transition = (next: string) => {
    if (
      role !== "reviewer" ||
      checked.length !== 3 ||
      state !== "Ready for review"
    )
      return;
    if (next === "Rejected" && !reason.trim()) {
      setError("Add a reason before rejecting this sample.");
      return;
    }
    setError("");
    setState(next);
    notify(`${next} — sample state only; no package or stock records changed.`);
  };
  return (
    <div className="p-floor">
      <div className="p-floor-main">
        <form
          className="p-lookup"
          onSubmit={(event) => {
            event.preventDefault();
            const match = lookup.trim().toUpperCase() === "DEMO-PKG-018";
            setFound(match);
            setLookupError(
              match ? "" : "No sample package found. Use DEMO-PKG-018.",
            );
          }}
        >
          <label className="p-field">
            Scan or enter a sample package reference
            <input
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
              aria-describedby="scan-help"
            />
          </label>
          <button className="p-button p-primary" type="submit">
            <Search size={19} />
            Look up package
          </button>
          <p id="scan-help">
            Keyboard scanner / text entry only. Camera and physical label
            scanning are not connected.
          </p>
        </form>
        {lookupError && (
          <div role="alert" className="p-callout p-error">
            {lookupError}
          </div>
        )}
        {found && (
          <Panel
            title="Science 8 · Box 01"
            aside={
              <Badge
                tone={
                  state === "Approved"
                    ? "good"
                    : state === "Rejected"
                      ? "bad"
                      : "warn"
                }
              >
                {state}
              </Badge>
            }
          >
            <div className="p-package-summary">
              <span className="p-package-visual">
                <Package size={54} strokeWidth={1} />
              </span>
              <div>
                <p className="p-eyebrow">DEMO-PKG-018</p>
                <h2>Classroom collection</h2>
                <p>Box 01 → Partition 01 → Pouches A & B</p>
                <small>Synthetic package · approved fixture v1</small>
              </div>
            </div>
            <div className="p-progress-label">
              <strong>{checked.length} of 3 checks complete</strong>
              <span>{Math.round((checked.length / 3) * 100)}%</span>
            </div>
            <progress
              max={3}
              value={checked.length}
              aria-label="Package checklist progress"
            />
            {checks.map((label, index) => (
              <label className="p-check-row" key={label}>
                <input
                  type="checkbox"
                  checked={checked.includes(label)}
                  disabled={state === "Approved" || state === "Rejected"}
                  onChange={(event) => {
                    setChecked(
                      event.target.checked
                        ? [...checked, label]
                        : checked.filter((item) => item !== label),
                    );
                    if (state === "Ready for review")
                      setState("Awaiting checks");
                  }}
                />
                <span className="p-check-number">0{index + 1}</span>
                <span>{label}</span>
                {checked.includes(label) && <CheckCheck size={22} />}
              </label>
            ))}
            <div className="p-padded">
              <button
                className="p-button p-primary"
                disabled={checked.length !== 3 || state !== "Awaiting checks"}
                onClick={() => setState("Ready for review")}
              >
                Send to sample QC review <ArrowRight size={18} />
              </button>
            </div>
          </Panel>
        )}
      </div>
      <div className="p-stack">
        <Panel title="QC decision" aside={<ClipboardCheck size={18} />}>
          <div className="p-padded">
            <label className="p-field">
              Sample role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="operator">Packing operator</option>
                <option value="reviewer">QC reviewer</option>
              </select>
            </label>
            <p className="p-helper">
              {role === "operator"
                ? "Packing operators complete checks. QC decisions require the sample reviewer role."
                : "Reviewers decide after the completed checklist is handed off."}{" "}
              This selector demonstrates UI states only; real ERP permissions
              are untouched.
            </p>
            <label className="p-field">
              Rejection / rework note
              <textarea
                value={reason}
                disabled={state === "Approved" || state === "Rejected"}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe the issue for the next operator…"
              />
            </label>
            {error && (
              <p role="alert" className="p-error-text">
                {error}
              </p>
            )}
            <div className="p-qc-actions">
              <button
                className="p-button p-primary"
                disabled={
                  !found || role !== "reviewer" || state !== "Ready for review"
                }
                onClick={() => transition("Approved")}
              >
                <Check size={20} />
                Approve sample
              </button>
              <button
                className="p-button p-danger"
                disabled={
                  !found || role !== "reviewer" || state !== "Ready for review"
                }
                onClick={() => transition("Rejected")}
              >
                Reject sample
              </button>
              {state === "Rejected" && (
                <button
                  className="p-button"
                  disabled={role !== "reviewer"}
                  onClick={() => {
                    setState("Awaiting checks");
                    setChecked([]);
                    notify(
                      "Sample returned for rework. Recheck all three items.",
                    );
                  }}
                >
                  Return for rework
                </button>
              )}
              <button
                className="p-text-button"
                onClick={() => {
                  setState("Awaiting checks");
                  setChecked([]);
                  setReason("");
                  setError("");
                }}
              >
                Reset demonstration
              </button>
            </div>
          </div>
        </Panel>
        <div className="p-callout">
          <strong>Deliberately focused.</strong>
          <p>
            One package, a clear checklist and a visible handoff. No stock
            movements, operational approvals or saved results.
          </p>
        </div>
      </div>
    </div>
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
