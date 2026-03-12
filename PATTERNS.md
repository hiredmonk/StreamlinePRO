# StreamlinePRO Patterns

## Server Page Loader
- Keep route pages and layouts as server components when they primarily assemble authenticated data.
- Move auth, branching, query orchestration, and view-model assembly into `lib/page-loaders/*`.
- Pages should mostly consume typed loader results and render UI branches.

## Behavior Hook
- Use React hooks only for client-owned state, transitions, optimistic UI, drag/drop behavior, or route-derived UI state.
- Hooks should return small render-ready contracts and keep mutation details internal.
- Current examples:
  - `useBoardTasks` for optimistic board movement
  - `useSidebarNavigationState` for sidebar route/workspace selection

## Presenter Helper
- When a component only derives labels, badges, grouping, or ordering from props, prefer a pure helper over a hook.
- Presenter helpers belong in `lib/view-models/*` and should be testable without React rendering.
- Current examples:
  - `getTaskRowMeta`
  - `getInboxItemMeta`
  - workflow status reorder/fallback helpers

## Direct Server-Action Form
- Keep server-action-backed forms declarative when they do not need client-owned draft state.
- Do not wrap simple forms in hooks just to standardize the API.
- Introduce a form hook only when the UI needs client validation, optimistic state, keyboard flow, or progressive enhancement beyond direct form submission.

## Server Profile Enrichment
- Resolve auth-user profile data on the server inside page loaders or domain helpers, not inside presentational components.
- Return sanitized view-model fields such as `displayName`, `email`, `avatarUrl`, and fallback initials instead of leaking raw auth rows to the UI.
- Reuse the same server-side profile mapping for assignee options, member directories, and other people-pickers so access rules and fallback behavior stay consistent.
