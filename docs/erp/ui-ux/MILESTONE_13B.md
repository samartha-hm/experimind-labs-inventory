# Milestone 13B — Precision Operations prototype

2026-10-15. The user approved Direction A and focused Packing/QC for this bounded
foundation proof. Wider integration, Milestone 13C, rollout and deployment remain
unapproved. All records shown here are synthetic and retained in React memory;
refresh resets them. This is not a staff usability study.

## Run and review

Use the existing Node/npm toolchain: `npm ci`, then
`node node_modules/vite/bin/vite.js --host localhost --port 5174 --strictPort`.
No database, account or seed operation is required for the prototype.

| Development URL | Review focus |
| --- | --- |
| `http://localhost:5174/__design/13b#work` | Shell, task filtering/selection, role examples, empty state |
| `http://localhost:5174/__design/13b#kit` | Educational structure, shared BOM references, physical mapping, quantity rules, approved/draft comparison |
| `http://localhost:5174/__design/13b#packing` | Package lookup, large checklist targets, QC/rejection/rework states |
| `http://localhost:5174/__design/13b#foundation` | Tokens, controls, drawer, validation, density, loading/empty/error/conflict examples |

The exact pathname is guarded by `import.meta.env.DEV` in `src/main.tsx` and lazy
loaded. Production retains the original application path. Existing ERP remains
reachable at `/`; unsupported proposed destinations are explicitly disabled.
The preview does not mount AuthProvider, call APIs, persist drafts, request camera
access, update permissions or register its own service worker.

## Foundation and component architecture

`src/design/precision/precision.css` scopes the proof under `.precision` and uses
`data-theme` for portal-safe light/dark tokens. It reuses the existing Inter/system
and monospace stacks, radius and motion variables. No new remote font or global
theme replacement is introduced. Scoped control text overrides existing global
light-form specificity so dark controls remain readable.

| Contract | Implemented subset |
| --- | --- |
| Color | Canvas/surface/line/text/muted/accent; positive, warning and critical foreground/background pairs |
| Typography | 14px body, 12px metadata, 32px page heading; tabular quantities; smaller supporting labels require staff/device review |
| Layout | 4px spacing rhythm; desktop sidebar; drawer below 950px; single-column content below 700px |
| Interaction | Visible keyboard focus, 44px controls, 56px floor action targets, larger checklist labels |
| Density/motion | Compact tables retain control size; reduced-motion media query removes transitions/animation |

`primitives.tsx` provides Badge, Panel and Radix-backed Modal/drawer. Dialogs have
titles/descriptions, focus containment, Escape and focus restoration. Navigation
from a modal moves focus to the destination heading. The shell owns navigation,
theme, density and notices; each bounded workspace owns its sample state.
`fixtures.ts` isolates synthetic data and invokes the unchanged authoritative
quantity calculator. No business-rule implementation is copied into the UI.
Approved fixture mappings are independent of the editable draft.

Native selects, checkboxes, tables and disclosure elements cover these small
fixtures. The command palette filters buttons; it is not presented as an ARIA
combobox. Searchable asynchronous pickers, virtualized collections, reusable
production forms and a full component catalogue are deferred. Before wider use,
split the workspace components into separate modules and reconcile scoped tokens
with the application-wide design system; this proof is not an ERP-wide migration.

## React Aria versus Radix decision

Adopt **@radix-ui/react-dialog 1.3.1** for this prototype's dialogs and drawers.
It composes with React 19, existing CSS and icons without imposing a theme.
React Aria Components 1.22.1 remains a strong candidate for richer accessible
collections, ComboBox and Tree interactions; those are not required by this
small native-control proof. See the official [Radix Dialog contract](https://www.radix-ui.com/primitives/docs/components/dialog),
[React Aria ComboBox](https://react-aria.adobe.com/ComboBox) and
[React Aria Tree](https://react-aria.adobe.com/Tree).

| Equal minimal dialog bundle, React external | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| Radix 1.3.1 | 41,575 | 14,134 |
| React Aria Components 1.22.1 | 85,694 | 28,617 |

Measured with esbuild 0.25.12, ESM/es2022/minify and Node gzip using
`node scripts/measure-design-dialogs.mjs`. To repeat the optional comparison,
install `react-aria-components@1.22.1 --no-save --package-lock=false` in a disposable
checkout, run the script, then `npm ci`. React Aria is not a committed dependency.
These are incremental sample bundles, not total application sizes or runtime
benchmarks. Registry metadata identified MIT for Radix and Apache-2.0 for React
Aria; both declare React 19 support. Only Radix was exercised in this browser
prototype. No claim of equivalent browser auditing of React Aria is made.

## Review checklist and proposed 13C

- [ ] Review desktop/tablet hierarchy, legibility, density and dark appearance.
- [ ] Confirm educational versus physical structure and shared-equipment language.
- [ ] Confirm explicit complete Science sets and independent Mathematics behavior.
- [ ] Review draft/approved comparison, missing mappings and conflict recovery.
- [ ] Have real packers/reviewers validate handoffs, rejection reasons and recovery.
- [ ] Test physical scanner, touch device, keyboard, zoom and assistive technology.
- [ ] Select the next bounded integration slice and explicitly authorize 13C.

Proposed 13C: address review findings, extract the agreed primitives/workspaces,
then integrate one approved Kit Studio read-only surface behind a reversible
flag. Specify actual role checks, server validation, revision conflicts and
loading/error contracts before any write integration. Reassess React Aria only
when an agreed advanced picker requires it. Do not change ledger, calculator,
approved revisions, RBAC or historical records. This is a proposal, not work
authorized by completion of 13B.

See [acceptance and evidence](MILESTONE_13B_ACCEPTANCE.md) for actual verification
and outstanding gates.
