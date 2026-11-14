import { describe, expect, it } from "vitest";
import { initialQC, sampleTransition, type SampleQC } from "../packingWorkflow";

const ready = (): SampleQC => ({
  ...initialQC,
  stage: "Ready for review",
  checked: [0, 1, 2],
});
describe("synthetic QC responsibility and exception lifecycle", () => {
  it("requires all operator checks before handover", () => {
    expect(sampleTransition(initialQC, "operator", { type: "submit" })).toBe(
      initialQC,
    );
    let state = initialQC;
    for (const index of [0, 1, 2])
      state = sampleTransition(state, "operator", { type: "check", index });
    expect(sampleTransition(state, "operator", { type: "submit" }).stage).toBe(
      "Ready for review",
    );
    expect(initialQC.checked).toEqual([]);
  });
  it("does not let operators approve or reviewers perform packing checks", () => {
    const state = ready();
    expect(sampleTransition(state, "operator", { type: "approve" })).toBe(
      state,
    );
    expect(
      sampleTransition(initialQC, "reviewer", { type: "check", index: 0 }),
    ).toBe(initialQC);
  });
  it("retains rejection and correction through separate reinspection and approval", () => {
    const rejected = sampleTransition(ready(), "reviewer", {
      type: "reject",
      reason: "  Broken seal  ",
    });
    expect(rejected).toMatchObject({
      stage: "Rejected",
      exception: "Broken seal",
    });
    expect(sampleTransition(rejected, "reviewer", { type: "approve" })).toBe(
      rejected,
    );
    const corrected = sampleTransition(rejected, "operator", {
      type: "correct",
      reason: "Replaced pouch",
    });
    expect(corrected.stage).toBe("Corrected");
    let reinspection = sampleTransition(corrected, "reviewer", {
      type: "reinspect",
    });
    expect(reinspection).toMatchObject({
      stage: "Reinspection",
      checked: [],
      exception: "Broken seal",
      correction: "Replaced pouch",
    });
    expect(sampleTransition(reinspection, "operator", { type: "submit" })).toBe(
      reinspection,
    );
    for (const index of [0, 1, 2])
      reinspection = sampleTransition(reinspection, "operator", {
        type: "check",
        index,
      });
    const approved = sampleTransition(
      sampleTransition(reinspection, "operator", { type: "submit" }),
      "reviewer",
      { type: "approve" },
    );
    expect(approved).toMatchObject({
      stage: "Approved",
      exception: "Broken seal",
      correction: "Replaced pouch",
    });
    expect(
      sampleTransition(approved, "operator", { type: "check", index: 0 }),
    ).toBe(approved);
  });
  it("requires rejection and correction notes and rejects wrong-role transitions", () => {
    const state = ready();
    expect(
      sampleTransition(state, "reviewer", { type: "reject", reason: "  " }),
    ).toBe(state);
    const rejected = sampleTransition(state, "reviewer", {
      type: "reject",
      reason: "Missing label",
    });
    expect(
      sampleTransition(rejected, "operator", { type: "correct", reason: "" }),
    ).toBe(rejected);
    expect(
      sampleTransition(rejected, "reviewer", {
        type: "correct",
        reason: "Bypassed",
      }),
    ).toBe(rejected);
    expect(sampleTransition(rejected, "operator", { type: "reinspect" })).toBe(
      rejected,
    );
  });
  it.each([-1, 3, 0.5, NaN])("ignores invalid check index %s", (index) => {
    expect(
      sampleTransition(initialQC, "operator", { type: "check", index }),
    ).toBe(initialQC);
  });
  it("toggles checks without duplicates", () => {
    const checked = sampleTransition(initialQC, "operator", {
      type: "check",
      index: 0,
    });
    expect(
      sampleTransition(checked, "operator", { type: "check", index: 0 })
        .checked,
    ).toEqual([]);
  });
});
