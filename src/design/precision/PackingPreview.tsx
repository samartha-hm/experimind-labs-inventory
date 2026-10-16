import { useState } from "react";
import {
  ArrowRight,
  CheckCheck,
  ClipboardCheck,
  Package,
  Search,
} from "lucide-react";
import { Badge, Panel } from "./primitives";
import {
  initialQC,
  sampleTransition,
  type SampleAction,
  type SampleRole,
} from "./packingWorkflow";

const checks = [
  "Slides and prism match the approved sample BOM",
  "Pouch seals and protective wrap intact",
  "Package label and school destination match",
];
export function Packing({ notify }: { notify: (message: string) => void }) {
  const [lookup, setLookup] = useState("DEMO-PKG-018");
  const [found, setFound] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [role, setRole] = useState<SampleRole>("operator");
  const [scenario, setScenario] = useState("ready");
  const [qc, setQC] = useState(initialQC);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const available = scenario === "ready" && found;
  const packing = qc.stage === "Packing" || qc.stage === "Reinspection";
  const act = (action: SampleAction) => {
    if (!available) return;
    if (
      (action.type === "reject" || action.type === "correct") &&
      !action.reason.trim()
    ) {
      setError(
        action.type === "reject"
          ? "Record the failed check before rejecting."
          : "Describe the correction before requesting reinspection.",
      );
      return;
    }
    const next = sampleTransition(qc, role, action);
    if (next === qc) return;
    setQC(next);
    setError("");
    if (action.type !== "check") {
      setNote("");
      notify(`${next.stage} · synthetic demonstration only.`);
    }
  };
  return (
    <>
      <div className="p-scenario-bar">
        <span>
          <strong>Warehouse station</strong> · all changes stay in memory
        </span>
        <label className="p-inline">
          Connection scenario
          <select
            aria-label="Connection scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option value="ready">Available</option>
            <option value="loading">Loading</option>
            <option value="error">Server error</option>
            <option value="offline">Offline</option>
            <option value="denied">Permission denied</option>
          </select>
        </label>
      </div>
      {scenario !== "ready" && (
        <div
          className={`p-callout ${scenario === "loading" ? "" : "p-error"}`}
          role={scenario === "loading" ? "status" : "alert"}
        >
          <strong>
            {
              (
                {
                  loading: "Loading package…",
                  error: "Package service unavailable",
                  offline: "Offline · decisions paused",
                  denied: "Access denied · package actions unavailable",
                } as Record<string, string>
              )[scenario]
            }
          </strong>
          <p>
            {scenario === "denied"
              ? "Ask an authorized supervisor for access. This preview does not grant permissions."
              : "The last sample remains visible for context. No decisions will be queued or saved."}
          </p>
          <button className="p-button" onClick={() => setScenario("ready")}>
            Restore sample connection
          </button>
        </div>
      )}
      <div
        className="p-floor p-floor-refined"
        aria-busy={scenario === "loading"}
      >
        <div className="p-floor-main">
          <form
            className="p-lookup"
            onSubmit={(event) => {
              event.preventDefault();
              if (scenario !== "ready") return;
              const match = lookup.trim().toUpperCase() === "DEMO-PKG-018";
              setFound(match);
              setFeedback(
                match
                  ? "Package found · DEMO-PKG-018 · destination confirmed below."
                  : "No package found. Check the reference or use DEMO-PKG-018.",
              );
            }}
          >
            <label className="p-field">
              Scan or enter a sample package reference
              <input
                value={lookup}
                onChange={(e) => {
                  setLookup(e.target.value);
                  setFeedback("");
                }}
                aria-describedby="scan-help scan-feedback"
                disabled={scenario !== "ready"}
              />
            </label>
            <button
              className="p-button p-primary"
              disabled={scenario !== "ready"}
              type="submit"
            >
              <Search size={19} />
              Look up package
            </button>
            <p id="scan-help">
              Keyboard scanner / text entry only. Camera and physical scanning
              are not connected.
            </p>
            <p
              id="scan-feedback"
              role="status"
              className={found ? "p-scan-success" : "p-scan-error"}
            >
              {feedback}
            </p>
          </form>
          {!found && (
            <Panel title="No matching package">
              <div className="p-padded">
                <p>
                  Check the printed reference before continuing. Checklist and
                  QC actions are locked.
                </p>
                <button
                  className="p-button"
                  onClick={() => {
                    setLookup("DEMO-PKG-018");
                    setFound(true);
                    setFeedback("Sample package restored.");
                  }}
                >
                  Use sample package
                </button>
              </div>
            </Panel>
          )}
          {found && (
            <Panel
              title="Science 8 · Box 01"
              aside={
                <Badge
                  tone={
                    qc.stage === "Approved"
                      ? "good"
                      : qc.exception && qc.stage !== "Approved"
                        ? "bad"
                        : "warn"
                  }
                >
                  {qc.stage}
                </Badge>
              }
            >
              <div className="p-package-summary p-package-identity">
                <Package size={36} />
                <div>
                  <p className="p-eyebrow">
                    DEMO-PKG-018 · APPROVED FIXTURE v1
                  </p>
                  <h2>Classroom collection</h2>
                  <p>
                    <strong>Destination: Demonstration School · Pune</strong>
                  </p>
                  <small>
                    School A · Science Grade 8 · Box 01 → Partition 01 → Pouches
                    A & B
                  </small>
                </div>
              </div>
              <div className="p-qc-steps" role="group" aria-label="Package review stages">
                <span data-active={packing}>1 · Operator checks</span>
                <span data-active={qc.stage === "Ready for review"}>
                  2 · QC decision
                </span>
                <span data-active={qc.stage === "Approved"}>3 · Approved</span>
              </div>
              <div className="p-progress-label">
                <strong>{qc.checked.length} of 3 checks complete</strong>
                <span>Checklist completion ≠ QC approval</span>
              </div>
              <progress
                max={3}
                value={qc.checked.length}
                aria-label="Package checklist progress"
              />
              {checks.map((label, index) => (
                <label className="p-check-row" key={label}>
                  <input
                    type="checkbox"
                    checked={qc.checked.includes(index)}
                    disabled={!available || role !== "operator" || !packing}
                    onChange={() => act({ type: "check", index })}
                  />
                  <span className="p-check-number">0{index + 1}</span>
                  <span>{label}</span>
                  {qc.checked.includes(index) && <CheckCheck size={22} />}
                </label>
              ))}
              <div className="p-padded">
                <p className="p-helper">
                  {role === "reviewer"
                    ? "Reviewer: inspect the package and record a separate decision. Operator checks are read-only."
                    : "Operator: complete all three checks, then hand over to a QC reviewer."}
                </p>
                <button
                  className="p-button p-primary"
                  disabled={
                    !available ||
                    role !== "operator" ||
                    !packing ||
                    qc.checked.length !== 3
                  }
                  onClick={() => act({ type: "submit" })}
                >
                  Send to sample QC review <ArrowRight size={18} />
                </button>
              </div>
            </Panel>
          )}
        </div>
        <div className="p-stack p-qc-inspector">
          <Panel title="Reviewer decision" aside={<ClipboardCheck size={18} />}>
            <div className="p-padded">
              <label className="p-field">
                Sample role
                <select
                  aria-label="Sample role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as SampleRole);
                    setError("");
                  }}
                >
                  <option value="operator">Packing operator</option>
                  <option value="reviewer">QC reviewer</option>
                </select>
              </label>
              <p className="p-helper">
                Role switching demonstrates responsibilities. Live permission
                checks are not connected.
              </p>
              <label className="p-field">
                {qc.stage === "Rejected"
                  ? "Correction performed"
                  : "Rejection reason"}
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setError("");
                  }}
                  disabled={
                    !available ||
                    !(
                      (qc.stage === "Ready for review" &&
                        role === "reviewer") ||
                      (qc.stage === "Rejected" && role === "operator")
                    )
                  }
                  aria-invalid={!!error}
                  aria-describedby={error ? "qc-validation" : undefined}
                />
              </label>
              {error && (
                <p id="qc-validation" role="alert" className="p-scan-error">
                  {error}
                </p>
              )}
              <div className="p-decision-actions">
                <button
                  className="p-button p-primary"
                  disabled={
                    !available ||
                    role !== "reviewer" ||
                    qc.stage !== "Ready for review"
                  }
                  onClick={() => act({ type: "approve" })}
                >
                  Approve sample QC
                </button>
                <button
                  className="p-button p-danger"
                  disabled={
                    !available ||
                    role !== "reviewer" ||
                    qc.stage !== "Ready for review"
                  }
                  onClick={() => act({ type: "reject", reason: note })}
                >
                  Reject with reason
                </button>
                {qc.stage === "Rejected" && (
                  <button
                    className="p-button"
                    disabled={!available || role !== "operator"}
                    onClick={() => act({ type: "correct", reason: note })}
                  >
                    Record correction
                  </button>
                )}
                {qc.stage === "Corrected" && (
                  <button
                    className="p-button"
                    disabled={!available || role !== "reviewer"}
                    onClick={() => act({ type: "reinspect" })}
                  >
                    Open reinspection
                  </button>
                )}
              </div>
              <p className="p-helper">
                Only a reviewer may approve after operator handover. Approval is
                never inferred from ticks.
              </p>
            </div>
          </Panel>
          {qc.exception && (
            <Panel
              title={
                qc.stage === "Approved"
                  ? "Resolved exception · retained history"
                  : "Open exception · approval held"
              }
              aside={
                <Badge tone={qc.stage === "Approved" ? "good" : "bad"}>
                  {qc.stage === "Approved" ? "Resolved" : "Unresolved"}
                </Badge>
              }
            >
              <div className="p-padded p-exception" role="status">
                <strong>Failed inspection</strong>
                <p>{qc.exception}</p>
                <strong>Operator correction</strong>
                <p>{qc.correction || "Not yet recorded"}</p>
                <small>
                  {qc.stage === "Approved"
                    ? "Resolved by a separate QC approval after reinspection."
                    : "Correction does not resolve the exception. Reinspection and a new QC decision are required."}
                </small>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
