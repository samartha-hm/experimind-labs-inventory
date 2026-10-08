# Existing Source Repository — Checkout & Safe Setup

## Source

`https://github.com/samartha-hm/experimind-labs-inventory`

This handover ZIP does not contain a copy of that repository. It could not be downloaded during packaging. Bring it into an IDE separately. If private, authenticate using normal GitHub credentials/SSH; never paste tokens into project docs.

## Windows setup example

```powershell
git clone https://github.com/samartha-hm/experimind-labs-inventory.git
# Extract this handover ZIP elsewhere, e.g. C:\Projects\EXPERIMIND_ERP_HANDOVER
python C:\Projects\EXPERIMIND_ERP_HANDOVER\install_into_repo.py .\experimind-labs-inventory
cd .\experimind-labs-inventory
git status --short --branch
git rev-parse HEAD
python scripts\audit_repo.py .
```

If repo already exists, skip clone and point installer to it. Installer only adds missing handover files and warns about conflicts. Merge conflicts manually rather than deleting previous `AGENTS.md` or work.

## After checkout

Examine actual manifest and environment sample. Do not assume npm command names, DB credentials, port numbers, migrations or existing test status. Get dependencies/build instructions from its `package.json`, README and scripts. Create local `.env` from its sample as appropriate, **never put real credentials in Git or chat**. Check repository license before reusing/distributing its original code.

## Baseline capture

Store in `.agent/PROJECT_STATE.md`:

- git HEAD and branch; staged/untracked changes
- runtime versions and package manager
- package versions from verified manifest
- DB configuration patterns (without secrets)
- actual entity/routes/project/stock paths
- tests/build commands run and results
- P0 audit file path and next action

The source code is the primary evidence for its actual current state, while user-confirmed business requirements define the target.
