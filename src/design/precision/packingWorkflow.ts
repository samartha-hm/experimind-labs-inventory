// Synthetic preview state only. Operational QC remains server-authorized.
export type SampleRole = "operator" | "reviewer";
export type SampleStage =
  | "Packing"
  | "Ready for review"
  | "Rejected"
  | "Corrected"
  | "Reinspection"
  | "Approved";
export interface SampleQC {
  stage: SampleStage;
  checked: number[];
  exception: string;
  correction: string;
}
export const initialQC: SampleQC = {
  stage: "Packing",
  checked: [],
  exception: "",
  correction: "",
};
export type SampleAction =
  | { type: "check"; index: number }
  | { type: "submit" }
  | { type: "reject"; reason: string }
  | { type: "correct"; reason: string }
  | { type: "reinspect" }
  | { type: "approve" };
export function sampleTransition(
  state: SampleQC,
  role: SampleRole,
  action: SampleAction,
): SampleQC {
  const packing = state.stage === "Packing" || state.stage === "Reinspection";
  if (
    action.type === "check" &&
    role === "operator" &&
    packing &&
    Number.isInteger(action.index) &&
    action.index >= 0 &&
    action.index < 3
  ) {
    return {
      ...state,
      checked: state.checked.includes(action.index)
        ? state.checked.filter((i) => i !== action.index)
        : [...state.checked, action.index],
    };
  }
  if (
    action.type === "submit" &&
    role === "operator" &&
    packing &&
    state.checked.length === 3
  )
    return { ...state, stage: "Ready for review" };
  if (
    role === "reviewer" &&
    state.stage === "Ready for review" &&
    state.checked.length === 3
  ) {
    if (action.type === "approve") return { ...state, stage: "Approved" };
    if (action.type === "reject" && action.reason.trim())
      return {
        ...state,
        stage: "Rejected",
        exception: action.reason.trim(),
        correction: "",
      };
  }
  if (
    action.type === "correct" &&
    role === "operator" &&
    state.stage === "Rejected" &&
    action.reason.trim()
  )
    return { ...state, stage: "Corrected", correction: action.reason.trim() };
  if (
    action.type === "reinspect" &&
    role === "reviewer" &&
    state.stage === "Corrected"
  )
    return { ...state, stage: "Reinspection", checked: [] };
  return state;
}
