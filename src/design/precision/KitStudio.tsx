import { useState } from "react";
import { ArrowRight, BookOpen, Box, ChevronRight, Layers3 } from "lucide-react";
import {
  approvedMapping,
  initialCounts,
  quantityPreview,
  subjects,
  type Counts,
  type Location,
} from "./fixtures";
import { Badge, Modal, Panel } from "./primitives";

const countLabels: Record<keyof Counts, string> = {
  s8: "Science 8",
  s9: "Science 9",
  s10: "Science 10",
  m8: "Mathematics 8",
};
export function Kit({
  theme,
  notify,
}: {
  theme: string;
  notify: (message: string) => void;
}) {
  const [subject, setSubject] = useState("science");
  const [grade, setGrade] = useState("s8");
  const [activity, setActivity] = useState(0);
  const [revision, setRevision] = useState("draft");
  const [mapping, setMapping] = useState(approvedMapping);
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [completeSets, setCompleteSets] = useState(1);
  const [commonRate, setCommonRate] = useState(1);
  const [view, setView] = useState("materials");
  const [inspector, setInspector] = useState("packing");
  const [query, setQuery] = useState("");
  const [stress, setStress] = useState(false);
  const [compare, setCompare] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [recovery, setRecovery] = useState("");
  const readonly = revision === "approved";
  const locked = readonly || conflict;
  const activeMap = readonly ? approvedMapping : mapping;
  const activeCounts = readonly ? initialCounts : counts;
  const complete = readonly ? 1 : completeSets;
  const rate = readonly ? 1 : commonRate;
  const activeSubject = subjects.find((s) => s.id === subject)!;
  const activeGrade =
    activeSubject.grades.find((g) => g.id === grade) ?? activeSubject.grades[0];
  const key = activity % 2 ? "light" : "cells";
  const editableLocation =
    subject === "science" && grade === "s8" && activity < 2;
  const items = stress
    ? Array.from({ length: 24 }, (_, i) => ({
        id: `stress-${i}`,
        name: `${i + 1}. ${activeGrade.activities[i % activeGrade.activities.length].name} — investigation, observation and collaborative classroom assessment`,
        code: `STRESS-${String(i + 1).padStart(2, "0")}`,
      }))
    : activeGrade.activities;
  const selected = items[activity] ?? items[0];
  const missing = !activeMap.cells || !activeMap.light;
  let calculation: ReturnType<typeof quantityPreview> | undefined;
  let calculationError = "";
  try {
    calculation = quantityPreview(activeCounts, complete, rate);
  } catch (error) {
    calculationError =
      error instanceof Error ? error.message : "Review quantity inputs.";
  }
  const rows: { label: string; before: string; after: string }[] = [
    {
      label: "Science 8 · plant cells location",
      before: approvedMapping.cells,
      after: mapping.cells || "Unassigned",
    },
    {
      label: "Science 8 · light location",
      before: approvedMapping.light,
      after: mapping.light || "Unassigned",
    },
    ...Object.entries(counts).map(([k, v]) => ({
      label: `${countLabels[k as keyof Counts]} sets`,
      before: String(initialCounts[k as keyof Counts]),
      after: String(v),
    })),
    {
      label: "Explicit complete Science 8–10 sets",
      before: "1",
      after: String(completeSets),
    },
    {
      label: "Science 8 common crates / set",
      before: "1",
      after: String(commonRate),
    },
  ];
  const changed = rows.filter((row) => row.before !== row.after);
  const field = (label: string, value: number, update: (n: number) => void) => (
    <label className="p-field">
      {label}
      <input
        type="number"
        min={0}
        max={1000000}
        step={1}
        value={Number.isNaN(value) ? "" : value}
        disabled={locked}
        aria-invalid={
          !Number.isSafeInteger(value) ||
          value < 0 ||
          value > 1000000 ||
          (label === "Explicit complete Science sets" &&
            value >
              Math.min(activeCounts.s8, activeCounts.s9, activeCounts.s10))
        }
        aria-describedby={
          calculationError ? "kit-validation" : "allocation-help"
        }
        onChange={(e) =>
          update(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
    </label>
  );
  const reset = () => {
    setMapping(approvedMapping);
    setCounts(initialCounts);
    setCompleteSets(1);
    setCommonRate(1);
    setConflict(false);
    setDiscard(false);
  };
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
          <Badge tone={readonly ? "good" : changed.length ? "warn" : "neutral"}>
            {readonly
              ? "Approved v1 · immutable"
              : `Draft v2 · ${changed.length} changes`}
          </Badge>
        </div>
        <div className="p-inline">
          <label className="p-sr" htmlFor="revision">
            Revision view
          </label>
          <select
            id="revision"
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
          >
            <option value="draft">Draft v2</option>
            <option value="approved">Approved v1</option>
          </select>
          <button className="p-button" onClick={() => setCompare(true)}>
            Compare revisions
          </button>
        </div>
      </div>
      {conflict && (
        <div className="p-callout p-error" role="alert">
          <strong>Revision conflict · draft editing paused</strong>
          <p>
            Simulated server v3 differs from your v2 baseline. Your{" "}
            {changed.length} local changes remain available in the comparison.
            Reloading a live revision would require explicit reconciliation.
          </p>
          <div className="p-actions">
            <button className="p-button" onClick={() => setCompare(true)}>
              Inspect retained changes
            </button>
            <button
              className="p-button"
              onClick={() => {
                setConflict(false);
                setRecovery(
                  "Conflict simulation ended. Local changes retained; no merge or save occurred.",
                );
              }}
            >
              End simulation · retain draft
            </button>
          </div>
        </div>
      )}
      {recovery && (
        <p role="status" className="p-callout">
          {recovery}
        </p>
      )}
      <div className="p-studio-context">
        <span>
          <BookOpen size={16} /> {activeSubject.name} / {activeGrade.name} /
          Activity {activity + 1}
        </span>
        <label className="p-inline">
          <input
            type="checkbox"
            checked={stress}
            onChange={(e) => {
              setStress(e.target.checked);
              setActivity(0);
              setQuery("");
            }}
          />
          Dense fixture · 24 activities
        </label>
      </div>
      <div className="p-studio-grid">
        <Panel
          title="1 · Education"
          aside={<Badge>{items.length}</Badge>}
          className="p-studio-outline"
        >
          <div className="p-padded p-context-fields">
            <label className="p-field">
              Subject
              <select
                aria-label="Subject"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setGrade(e.target.value === "science" ? "s8" : "m8");
                  setActivity(0);
                  setQuery("");
                }}
              >
                <option value="science">Science</option>
                <option value="maths">Mathematics</option>
              </select>
            </label>
            <label className="p-field">
              Grade
              <select
                aria-label="Grade"
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value);
                  setActivity(0);
                }}
              >
                {activeSubject.grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="p-field">
              Find activity
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or code"
              />
            </label>
          </div>
          <nav className="p-activity-list" aria-label="Educational activities">
            {items.map((item, index) =>
              item.name.toLowerCase().includes(query.toLowerCase()) ||
              item.code?.toLowerCase().includes(query.toLowerCase()) ? (
                <button
                  key={item.id}
                  className={`p-outline-item ${activity === index ? "is-active" : ""}`}
                  aria-current={activity === index ? "true" : undefined}
                  onClick={() => setActivity(index)}
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
              ) : null,
            )}
            {!items.some((item) =>
              `${item.name} ${item.code}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && (
              <div className="p-padded">
                <strong>No activities match</strong>
                <p className="p-helper">Try a shorter name or code.</p>
                <button className="p-button" onClick={() => setQuery("")}>
                  Clear activity search
                </button>
              </div>
            )}
          </nav>
          <p className="p-outline-note">
            Selection stays visible while you inspect quantities or packaging.{" "}
            {stress &&
              "Stress rows are repeated references for layout testing; no extra BOM demand is added."}
          </p>
        </Panel>
        <Panel
          title="2 · Activity & BOM"
          className="p-studio-editor"
          aside={<Badge>{activeGrade.name}</Badge>}
        >
          <div className="p-tablist" role="group" aria-label="Kit detail views">
            {[
              ["materials", "Materials & mapping"],
              ["quantities", "Set allocations"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {view === "materials" ? (
            <>
              <div className="p-padded">
                <p className="p-eyebrow">SELECTED ACTIVITY · {selected.code}</p>
                <h3 className="p-selected-title">{selected.name}</h3>
                <div className="p-material-row">
                  <Box size={24} />
                  <div>
                    <strong>
                      {subject === "maths"
                        ? "Geometric solids set"
                        : key === "cells"
                          ? "Prepared slide"
                          : "Glass prism"}
                    </strong>
                    <small>
                      Owner: {activeGrade.name} activity BOM ·{" "}
                      {subject === "science" && key === "cells" ? 2 : 1} each /
                      grade set
                    </small>
                  </div>
                  <Badge>Owned</Badge>
                </div>
                {subject === "science" ? (
                  <div className="p-owner-card">
                    <Layers3 size={20} />
                    <div>
                      <strong>Student microscope · reference only</strong>
                      <p>
                        Owner: Science {grade.slice(1)} common crate →
                        microscope BOM line.
                      </p>
                      <small>
                        Both activities reference one owner. Quantity is
                        calculated once per crate, never per reference.
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="p-owner-card">
                    <BookOpen size={20} />
                    <p>
                      Mathematics has its own selections and materials. Science
                      common and universal crates do not create Mathematics
                      demand.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-mapping">
                <div>
                  <p className="p-eyebrow">PHYSICAL HOME · NO ADDITIONAL BOM</p>
                  <h3>
                    {subject === "maths"
                      ? "Mathematics box"
                      : `Science ${grade.slice(1)} · Box 01`}{" "}
                    → Partition 01
                  </h3>
                  <p>
                    Select a pouch to reveal its linked activity in the
                    inspector.
                  </p>
                </div>
                {editableLocation ? (
                  <label className="p-field">
                    Activity location
                    <select
                      aria-label="Activity location"
                      value={activeMap[key]}
                      disabled={locked}
                      aria-invalid={!activeMap[key]}
                      aria-describedby={
                        !activeMap[key] ? "location-error" : undefined
                      }
                      onChange={(e) => {
                        setMapping({
                          ...mapping,
                          [key]: e.target.value as Location,
                        });
                        setInspector("packing");
                      }}
                    >
                      <option value="">Unassigned</option>
                      <option>Pouch A</option>
                      <option>Pouch B</option>
                    </select>
                    {!activeMap[key] && (
                      <small id="location-error" className="p-scan-error">
                        Assign this activity before review.
                      </small>
                    )}
                  </label>
                ) : (
                  <p className="p-helper">
                    Fixture location: Pouch {activity % 2 ? "B" : "A"}. Editing
                    is demonstrated on the two Science 8 source activities.
                  </p>
                )}
              </div>
              <div className="p-padded">
                <button
                  className="p-button"
                  onClick={() => setView("quantities")}
                >
                  Trace quantity inputs <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="p-padded">
              <p id="allocation-help" className="p-helper">
                Each subject is selected independently. Universal Science crates
                use your explicit complete Grade 8–10 allocation, capped by the
                smallest Science grade count.
              </p>
              <div className="p-rule-grid">
                {Object.entries(activeCounts).map(([id, value]) => (
                  <div key={id}>
                    {field(
                      `${countLabels[id as keyof Counts]} sets`,
                      value as number,
                      (n) => setCounts({ ...counts, [id]: n }),
                    )}
                  </div>
                ))}
              </div>
              <div className="p-allocation-card">
                <h3>Complete Science Grades 8–10 allocation</h3>
                {field(
                  "Explicit complete Science sets",
                  complete,
                  setCompleteSets,
                )}
                <p>
                  {complete} × Grade 8 + {complete} × Grade 9 + {complete} ×
                  Grade 10
                </p>
                <p className="p-helper">
                  Capacity: min({activeCounts.s8}, {activeCounts.s9},{" "}
                  {activeCounts.s10}) ={" "}
                  {Math.min(activeCounts.s8, activeCounts.s9, activeCounts.s10)}
                  . This is a limit, never an automatic allocation.
                </p>
                <p className="p-helper">
                  Remaining grade sets: 8 → {activeCounts.s8 - complete}; 9 →{" "}
                  {activeCounts.s9 - complete}; 10 →{" "}
                  {activeCounts.s10 - complete}. Mathematics {activeCounts.m8}{" "}
                  stays independent.
                </p>
              </div>
              {field("Science 8 common crates / set", rate, setCommonRate)}
              {calculationError && (
                <div
                  role="alert"
                  id="kit-validation"
                  className="p-callout p-error"
                >
                  <strong>Quantity preview unavailable</strong>
                  <p>{calculationError}</p>
                  <p>
                    Use non-negative whole counts and a complete allocation
                    within all three Science grades.
                  </p>
                  <button
                    className="p-button"
                    disabled={locked}
                    onClick={() => {
                      setCounts(initialCounts);
                      setCompleteSets(1);
                      setCommonRate(1);
                    }}
                  >
                    Reset quantity inputs
                  </button>
                </div>
              )}
            </div>
          )}
        </Panel>
        <Panel title="3 · Inspector" className="p-studio-inspector">
          <div className="p-tablist" role="group" aria-label="Inspector views">
            {[
              ["packing", "Packing"],
              ["quantities", "Quantities"],
              ["review", "Review"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={inspector === id}
                onClick={() => setInspector(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {inspector === "packing" ? (
            <div className="p-padded">
              <p className="p-eyebrow">
                {activeSubject.name} · {activeGrade.name}
              </p>
              <p className="p-helper">
                Activity selection and physical location are linked. Packaging
                contains references; BOM ownership stays separate.
              </p>
              <div
                className="p-package-tree"
                aria-label="Physical package tree"
                role="group"
              >
                <strong>
                  <Box size={17} /> Box 01
                </strong>
                <div>
                  <strong>Partition 01</strong>
                  {(subject === "maths"
                    ? ["Pouch A"]
                    : ["Pouch A", "Pouch B"]
                  ).map((pouch, index) => (
                    <button
                      className={`p-tree-location ${(editableLocation ? activeMap[key] : activity % 2 ? "Pouch B" : "Pouch A") === pouch ? "is-active" : ""}`}
                      aria-pressed={
                        (editableLocation
                          ? activeMap[key]
                          : activity % 2
                            ? "Pouch B"
                            : "Pouch A") === pouch
                      }
                      key={pouch}
                      onClick={() => {
                        const linked = editableLocation
                          ? (["cells", "light"] as const).findIndex(
                              (k) => activeMap[k] === pouch,
                            )
                          : index;
                        if (linked >= 0) {
                          setActivity(linked);
                          setView("materials");
                        }
                      }}
                    >
                      <strong>{pouch}</strong>
                      <small>
                        {subject === "science" && grade === "s8"
                          ? (["cells", "light"] as const)
                              .filter((k) => activeMap[k] === pouch)
                              .map((k) =>
                                k === "cells" ? "Plant cells" : "Light",
                              )
                              .join(" · ") || "Empty · no activity mapped"
                          : index
                            ? "Light / second activity reference"
                            : selected.name}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
              {missing && (
                <p role="status" className="p-callout p-error">
                  Science 8 has an unassigned activity, even when another grade
                  is selected.
                </p>
              )}
              {stress && (
                <details className="p-dense-tree">
                  <summary>Inspect 12 additional partitions</summary>
                  {Array.from({ length: 12 }, (_, i) => (
                    <details key={i}>
                      <summary>
                        Partition {String(i + 2).padStart(2, "0")} ·
                        demonstration accessories and protective materials
                      </summary>
                      <p>Pouch A · activity reference {i + 3}</p>
                      <p>Pouch B · activity reference {i + 4}</p>
                    </details>
                  ))}
                </details>
              )}
              <div className="p-owner-card">
                <Layers3 size={18} />
                <p>
                  {subject === "science"
                    ? `Common crate · Science ${grade.slice(1)} owns the shared microscope. Universal crate · Science Grades 8–10 owns the balance.`
                    : "Mathematics has no Science shared-crate ownership."}
                </p>
              </div>
            </div>
          ) : inspector === "quantities" ? (
            <div className="p-padded">
              <h3>Traceable crate demand</h3>
              <p className="p-helper">
                Fixture calculator output; packaging references add zero demand.
              </p>
              {calculationError ? (
                <p className="p-callout p-error" role="status">
                  Fix set allocations to restore the preview.
                </p>
              ) : (
                <>
                  <div className="p-trace-row">
                    <strong>Science 8 common</strong>
                    <span>
                      {activeCounts.s8} grade sets × {rate} crates / set ={" "}
                      {activeCounts.s8 * rate}
                    </span>
                    <small>
                      1 microscope / crate → {activeCounts.s8 * rate} each
                    </small>
                  </div>
                  <div className="p-trace-row">
                    <strong>Science 9 / 10 common</strong>
                    <span>
                      {activeCounts.s9} × 1 = {activeCounts.s9} ·{" "}
                      {activeCounts.s10} × 1 = {activeCounts.s10}
                    </span>
                  </div>
                  <div className="p-trace-row">
                    <strong>Science universal</strong>
                    <span>
                      {complete} explicitly allocated complete sets × 1 ={" "}
                      {complete}
                    </span>
                    <small>1 balance / crate → {complete} each</small>
                  </div>
                  <div
                    className="p-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Calculated requirements"
                  >
                    <table>
                      <caption>Calculated shared crate lines</caption>
                      <thead>
                        <tr>
                          <th scope="col">Owner</th>
                          <th scope="col">Crates</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculation?.lines
                          .filter((line) => !line.material_id)
                          .map((line, index) => (
                            <tr key={index}>
                              <th scope="row">{line.owner_name}</th>
                              <td>{line.quantity}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <button
                className="p-button"
                onClick={() => setView("quantities")}
              >
                Edit set allocations
              </button>
            </div>
          ) : (
            <div className="p-padded p-review-stack">
              <Badge
                tone={conflict || missing || calculationError ? "warn" : "good"}
              >
                {conflict
                  ? "Conflict · blocked"
                  : missing || calculationError
                    ? "Needs attention"
                    : "Ready for local review"}
              </Badge>
              <p>
                Shared material ownership is explicit. Mathematics demand
                remains independent.
              </p>
              <p>
                {missing
                  ? "Science 8: assign both activity locations."
                  : "Both Science 8 activity locations mapped."}
              </p>
              <p className="p-helper">
                {readonly
                  ? "Approved v1 is immutable. Switch to the draft to edit."
                  : `${changed.length} local changes. Refreshing clears this unsaved draft.`}
              </p>
              <button
                className="p-button p-primary"
                disabled={locked || missing || !!calculationError}
                onClick={() =>
                  notify(
                    "Draft reviewed locally. No ERP save or approval occurred.",
                  )
                }
              >
                Review in memory
              </button>
              <button
                className="p-button"
                disabled={locked}
                onClick={() => {
                  setConflict(true);
                  setRecovery("");
                }}
              >
                Show revision conflict example
              </button>
              <button
                className="p-text-button"
                disabled={locked || !changed.length}
                onClick={() => setDiscard(true)}
              >
                Discard local draft changes
              </button>
            </div>
          )}
        </Panel>
      </div>
      <Modal
        theme={theme}
        drawer
        title="Revision comparison"
        description="Approved v1 is a fixed fixture. Draft v2 changes are retained in memory, including during a simulated conflict."
        open={compare}
        onOpenChange={setCompare}
      >
        <p className="p-callout">
          {changed.length
            ? `${changed.length} changed fields highlighted. No saved or approved record is modified.`
            : "No differences. The draft matches the approved baseline."}
        </p>
        <div
          className="p-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Revision differences"
        >
          <table>
            <caption>Approved baseline → local draft</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Approved v1</th>
                <th scope="col">Draft v2</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={row.before !== row.after ? "p-diff-changed" : ""}
                >
                  <th scope="row">
                    {row.label}
                    {row.before !== row.after && <small>Changed</small>}
                  </th>
                  <td>{row.before}</td>
                  <td>{row.after === "NaN" ? "Invalid / empty" : row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
      <Modal
        theme={theme}
        title="Discard local changes?"
        description="Reset the synthetic draft to its approved baseline. No ERP records are involved."
        open={discard}
        onOpenChange={setDiscard}
      >
        <div className="p-actions">
          <button className="p-button" onClick={() => setDiscard(false)}>
            Keep editing
          </button>
          <button
            className="p-button p-danger"
            onClick={() => {
              reset();
              notify("Local draft reset to sample baseline.");
            }}
          >
            Discard local changes
          </button>
        </div>
      </Modal>
    </>
  );
}
