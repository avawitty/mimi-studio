# Dependency audit triage

## Current summary

- Total vulnerabilities: 12
- Critical: 1 (`jspdf`)
- High: 0

## Findings and triage decisions

### `jspdf` (critical)

- Advisory family: ReDoS/DoS in current `jspdf` range.
- Current status: `npm audit` recommends `jspdf@4.2.1` (semver-major).
- Triage: defer forced major upgrade until compatibility validation is completed for export/PDF flows.
- Follow-up: run a focused migration test pass for all PDF/export features, then upgrade to `jspdf@4.x`.

### `fast-xml-parser` (high, resolved in current lockfile)

- Advisory: repeated `DOCTYPE` declarations can reset entity expansion limits.
- Current status: resolved after applying non-breaking `npm audit fix`.
- Triage: keep normal dependency maintenance cadence and verify XML-consuming flows during dependency updates.

## Ongoing guardrail

The CI workflow now runs an `npm audit --audit-level=high` triage step (non-blocking) to keep high/critical findings visible on every pull request.
