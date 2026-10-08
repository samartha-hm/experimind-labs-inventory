# Confirmed Multi-School Prastuti Project Model

**Controlling rules:** `25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md`.

One NGO can have one project with multiple schools. A school is a **ProjectSite/delivery destination**, not an inventory warehouse. Every site may receive a different configuration of Grades 8, 9 and 10 Science and Mathematics.

For each site record the **number of Science grade sets**, **number of Mathematics grade sets**, and the **explicit number of complete three-grade Science sets**.

- Science Grade 8 sets x2 ⇒ 2 Grade 8 Science common crates.
- Science Grade 9 sets x2 ⇒ 2 Grade 9 Science common crates.
- Science Grade 10 sets x2 ⇒ 2 Grade 10 Science common crates.
- Complete Science Grades 8+9+10 sets x2 ⇒ 2 universal Science crates.
- Mathematics (any grade/quantity) ⇒ no mathematics common crate and no universal crate.
- Grade 8-only Science x2 ⇒ 2 Grade 8 common crates and 0 universal crates.
- Science G8=30, G9=20, G10=25 ⇒ 30/20/25 grade-common crates; **universal count must be explicitly stated**, not inferred.

**Multi-school example:** School A has two complete 8+9+10 Science sets; School B has three Grade 8-only Science sets and two Grade 10 Mathematics sets. Procurement may aggregate all compatible material quantities, but packing must retain distinct school destinations: School A receives 6 Science common crates and 2 universal crates, while School B receives 3 Grade 8 Science common crates and no universal crate.

Packing, site survey, delivery, installation and receipt remain per site, while purchasing/production plans may aggregate requirement lines with preserved `siteId`, `subject`, `grade`, `completeSetId`, `templateVersion`, and physical packing destinations. Multiple delivery batches can hold portions of any school's items.

The scanned old sheet and SEP26 workbook are provisional references and **not approved production BOMs**.
