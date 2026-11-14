# Design principles and public references

Public primary references inspected 2026-10-15. Product observations below describe documented patterns; ERP adaptations are proposals. No copied assets, screenshots or unsupported claims of equivalent product functionality.

| Reference | Documented pattern | Transfer to ERP | Reject / constrain |
| --- | --- | --- | --- |
| [Linear search](https://linear.app/docs/search) | Cross-object search, exact identifiers, recent results and contextual filtering | Existing visible command entry plus exact package/project lookup; show object type, site and permission-safe context | Hidden keyboard chords as the only path; overriding browser find |
| [Linear custom views](https://linear.app/docs/custom-views) | Filtered views, team/project scoping, favorites and view-related notifications | Assigned, blocked and awaiting-review queues; share filter context without granting access | Unbounded notification noise or a shared view treated as authorization |
| [Figma component properties](https://help.figma.com/hc/en-us/articles/5579474826519-Explore-component-properties) | Editable component properties gathered in the properties panel | Selected kit node inspector with labeled editable fields and reuse information | Infinite canvas or drag as the only way to map contents; simplified-instance behavior was deprecated in 2026, so do not cite it as current progressive disclosure |
| [Notion views, filters and sorts](https://www.notion.com/help/views-filters-and-sorts) | View-specific presentation/filtering; side peek can preserve the underlying list | Operational tables with saved view context and a read-only record peek | User-defined schemas, arbitrary status transitions or freeform cards for ledger-sensitive operations |

The linked educational/physical panes are an ERP-specific response to the accepted two-graph model, not a claim that Figma supplies an ERP editor. Similarly, contextual audit and revision handling come from ERP contracts rather than aesthetic inspiration.

## Interaction principles

1. **Object and destination before action.** Every operational surface identifies project/site, package or material, unit, revision and current status. UUID remains copyable secondary evidence; readable names and ancestry lead.
2. **Fast reads, confirmed writes.** Selection, disclosure, filtering and panel changes can feel immediate. Stock, QC acceptance, approval, dispatch and closure show pending until the server confirms. Never use optimistic success for irreversible business facts.
3. **Reveal complexity where it matters.** Basic node properties lead; advanced rules and provenance are inspectable with summaries. Blocking validation and quantity assumptions remain visible even when advanced fields are collapsed.
4. **Preserve working context.** Back from a linked item restores filters, scroll, selected site and package. A changed demand revision is a visible freshness issue, not a silent refresh that discards work.
5. **One clear primary action per task.** Save draft, review approval and execute operations have distinct language and placement. Destructive/reopening actions require the existing authority and reason.
6. **Shortcuts supplement visible controls.** Command search and tree navigation help repeat users; menus expose the same actions. Avoid single-letter shortcuts in text fields and scanner capture.
7. **Collaboration means accountable handoff.** Show owner, status, blocker and latest actor/time when existing data supports them. Do not imply real-time cursors, presence or a notification backend that does not exist.
8. **Density follows the job.** Planners compare rows; packers identify and execute one package safely. Tablet layouts preserve important labels and actions instead of shrinking desktop controls.

## Foundation references

[React Aria](https://react-aria.adobe.com/) documents styleable accessible/adaptive interaction components. It is the preferred candidate for a proof of dialog, combobox and selection behavior with existing Tailwind styling. [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) is an alternative unstyled primitive foundation. Neither guarantees application accessibility, React compatibility for the chosen versions, bundle acceptability or correct domain semantics; prove those before installation. Avoid mixing both for equivalent primitives.

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) is the AA evaluation target. Its [target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) allows 24 CSS px with defined exceptions; proposed 44 px general and 48 px warehouse controls are stronger product targets. [Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) is directly relevant to sticky headers and history overlays. Aim for the entire focused control to remain visible.

No current accessibility conformance, measured productivity improvement, purchased component suitability or staff preference is inferred from these references. Evaluation is defined separately in the [quality plan](QUALITY_GATES_AND_TEST_PLAN.md).
