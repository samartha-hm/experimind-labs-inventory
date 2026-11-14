# Milestone 13A — design decision brief

2026-10-15 · Direction A and focused Packing/QC approved for bounded 13B.
See [13B implementation](MILESTONE_13B.md); wider integration remains unapproved.

Recommend **Direction A: Precision Operations**, with Direction C's focused execution mode inside Packing/QC. Use a quiet neutral shell, clear indigo selection, dense readable tables and a persistent object/context header. Make the next safe action obvious; keep quantities, revision and provenance beside it. This is a product proposal, not a tested staff preference.

| Direction | Character and strengths | Trade-off |
| --- | --- | --- |
| **A · Precision Operations — recommended** | Neutral surfaces, restrained accent, compact lists, linked inspector; supports planning and execution without changing vocabulary | Requires deliberate hierarchy and strong empty/error states to avoid a spreadsheet feel |
| B · Guided Workbench | Larger cards, stage summaries, explanatory text, more whitespace; approachable for occasional staff | More scrolling and lower information density for repeat operators |
| C · Floor Console | High contrast, large controls, scan-first package detail, one task at a time | Too restrictive for kit design and cross-school planning; use as a workspace mode |

[Visual direction studies](visual-directions.svg) show original schematic treatments, not finished screens. [Workspace concepts](workspace-concepts.svg) clarify linked kit views and focused packing. No proprietary assets were copied.

## Decisions requested

1. Approve A as the shared visual foundation and C as Packing/QC execution mode.
2. Approve the proposed navigation and linked educational/physical Kit Studio model; retain all existing quantity, permission and approval semantics.
3. Approve only the bounded 13B foundation/prototype slice described in the [roadmap](PHASED_IMPLEMENTATION_ROADMAP.md). Later workspace implementation needs its own review.

## Highest priorities

1. **Operational clarity:** separate draft planning, committed execution and historical evidence; retain visible revision and action-specific consequences.
2. **Kit comprehension:** replace one long editor with navigable educational and physical views, explicit shared-pouch associations and traced quantity preview.
3. **Packing focus:** package hierarchy, selected-package checklist and QC, destination always visible, exceptions with reason and provenance.
4. **Context and responsive access:** stage-specific project workspaces, return-to-list state and navigation that does not cover active fields.

Proposed navigation: My work; Kit Studio; Projects & schools; Inventory; Purchasing; Production; Packing & QC; Delivery & installation; Administration. These organize existing capabilities; they do not authorize new modules or permissions.

Retain React 19, TypeScript, Tailwind and existing tokens/components. Evaluate React Aria for accessible interaction primitives; Radix is an alternative, subject to a small compatibility proof. The subsequent bounded 13B evaluation selected Radix Dialog; see [the decision](MILESTONE_13B.md).

Staff validation must establish device/scanner use, shared-pouch terminology, handoff ownership, most costly recovery errors and whether packer/QC separation reflects actual practice. No staff interviews or concept usability tests occurred in 13A.

Start with the [audit](CURRENT_STATE_AUDIT.md), then [workspace specifications](PRIORITY_WORKSPACE_SPECS.md), [quality gates](QUALITY_GATES_AND_TEST_PLAN.md) and [roadmap](PHASED_IMPLEMENTATION_ROADMAP.md). Raw current-screen evidence remains ignored and local; the [evidence register](EVIDENCE_REGISTER.md) explains access and limits. Bounded 13B is implemented for review; wider UI integration awaits approval. Existing physical print/scan and pilot-readiness gates remain pending.

Supporting specifications: [staff journeys](PERSONAS_AND_CRITICAL_JOURNEYS.md), [principles and public references](DESIGN_PRINCIPLES_AND_REFERENCES.md), [information architecture](INFORMATION_ARCHITECTURE.md) and [design system](DESIGN_SYSTEM_SPEC.md).
