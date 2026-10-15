# Evidence register

Observed 2026-10-15 using the in-app Browser, read-only interaction with synthetic local fixtures. Screenshots may still reveal authenticated tenant/user metadata and internal IDs, so raw captures are intentionally excluded from Git. They are local review evidence, not portable repository assets. No production dataset, credentials or exports are included in this package.

Local directory: `.local-dev/ux-discovery/` relative to the repository. `git check-ignore` verifies exclusion. Request a fresh authorized synthetic capture when reviewing on another machine; absence of these files does not invalidate the portable diagrams, but prevents independent screenshot inspection there.

| ID | File | Screen and scope |
| --- | --- | --- |
| E1 | `overview-desktop.jpg` | Overview: aggregate cards, navigation and header |
| E2 | `kit-desktop.jpg` | Saved draft Kit Builder: nested educational and packing editor |
| E3 | `kit-phone.jpg` | 390 px narrow viewport: open sidebar obscures form; floating history competes with bottom controls |
| E4 | `packing-desktop.jpg` | Project downstream delivery, installation/closure and private-attachment section; legacy filename retained, not a packing-control screenshot |
| E5 | `packing-tablet.jpg` | 1024 × 768 tablet: production section above packing and persistent shell/history overlay |

DOM checks reported viewport/document width 390/390 in the narrow kit view, 1440/1440 in the desktop project view and 1024/1024 on tablet. These checks establish no document-level horizontal overflow at those instants; they do not prove every control is visible or accessible. Screenshots are viewport captures, not full-page coverage. No timing, task-completion rate or touchscreen/scanner measurement was collected.

AX inspection additionally established the current package list's parent IDs, packed/QC statuses, actor references and the presence of checklist, exception and QC actions. Read-only source inspection established role guards, stale revisions and retry-key reuse; screenshots alone cannot demonstrate those guarantees. The source register in [the audit](CURRENT_STATE_AUDIT.md) and historical [A01–A16 results](../38_BROWSER_ACCEPTANCE_RESULTS.md) provide those separate evidence classes.

Portable `visual-directions.svg` and `workspace-concepts.svg` contain only original schematic, generic labels. They are proposed concepts, not current UI screenshots or user-tested prototypes. They contain no external resources, executable script or actual record IDs.
