# Search Benchmark Profile
_Last updated: 2026-02-16_

This profile defines the minimum "realistic data volume" for the MVP search SLA check in `Todo.md`.

## Acceptance Target
- API/UI search response target: `< 1s`.
- Metric used for sign-off: `p95 < 1000ms` over 20+ representative queries.

## Dataset Definition
- Users: `50`
- Workspaces: `2`
- Projects per workspace: `30`
- Tasks total: `20,000`
- Comments total: `60,000`
- Attachments total: `5,000`
- Status mix: includes `To do`, `Doing`, `Waiting`, `Done` with meaningful distribution.
- Due-state mix: includes `today`, `upcoming`, `overdue`, and `no due date`.

## Query Set (minimum)
Run at least 20 queries covering:
1. Exact task title match.
2. Prefix match (`"road"` for `"Roadmap"`).
3. Substring match in longer titles.
4. Common multi-word terms.
5. No-result terms.
6. Repeated hot query to evaluate warm-cache behavior.

## Measurement Procedure
1. Load the benchmark dataset into target environment.
2. Execute queries against `/api/search?q=...` and measure response time.
3. Repeat from the UI search input to confirm perceived responsiveness.
4. Compute p50 and p95 from collected samples.
5. Store raw timings and summary in a dated note.

## Sign-off Rule
Mark `Todo.md` search benchmark item as complete only when:
- Dataset matches this profile (or an explicitly approved revision), and
- p95 is `< 1s`, and
- Evidence log is saved.
