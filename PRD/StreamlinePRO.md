# Work Management App (Asana-like) — PRD (Web MVP)
_Last updated: 2026-02-15_

## 0) One-line summary
A fast, intuitive web app for general teams to plan work, assign responsibility, track due dates, reduce “forgotten tasks,” and standardize repeating workflows—without the heaviness of traditional project tools.

---

## 1) Goals
### Product goals
- Make **work visible**: who owns what, by when, and what’s blocked.
- Make **updates effortless**: common actions (complete/assign/due/status/comment) in **≤ 2 clicks**.
- Replace “WhatsApp progress tracking” with a single source of truth: **My Tasks + Project Views + Notifications**.
- Provide a “rich” experience while staying **simple by default** (advanced features discoverable, not forced).

### MVP success metrics (targets)
- Median time to create a task: **< 5 seconds**
- Median time to update/complete a task: **< 10 seconds**
- % tasks with owner + due date (within 2 weeks of team usage): **> 70%**
- Weekly active days per active user: **≥ 3**
- Overdue tasks trend: **decreasing week-over-week** after 30 days

---

## 2) Target users & key use cases
### Primary personas
1. **Team Member**: wants a clean list of what to do today.
2. **Team Lead / Manager**: wants visibility across a project without micromanaging.
3. **Admin/Owner**: sets up workspace, members, and simple workflows.

### Core use cases
- Create tasks quickly, assign owners, set due dates.
- Organize tasks into projects and sections.
- Track progress via simple statuses.
- Handle blockers (“waiting on someone”) without losing the task.
- Repeat workflows with templates and recurring tasks.
- Collaborate via comments + files inside tasks.
- Clients/external collaborators can log in and participate (MVP supports login; granular guest permissions can be V2).

---

## 3) Product principles (UI/UX)
### “Simple but rich” rules
- **Default-first design**: most users should succeed without customizing anything.
- **Inline editing everywhere**: edit owner/due/status directly in lists and boards.
- **One home screen**: “My Tasks” is the work cockpit.
- **Context stays visible**: task details open in a **side panel** (not a full page jump) to reduce “lost place.”
- **Progress clarity**: status + due date + owner always visible.
- **No heavy jargon**: use everyday labels like “Waiting”, “Blocked”, “Done”.

### Performance & feel
- Must feel instantaneous: optimistic UI for common changes (complete/status/assign).
- Keyboard-friendly: quick add, navigate tasks, complete, set due date.

---

## 4) MVP scope
### Included in MVP
1. **Authentication (Supabase Google Auth)**
2. **Workspace + Members**
3. **Projects + Sections**
4. **Tasks**
   - owner, due date, status, priority
   - subtasks
   - comments + @mentions
   - attachments (Supabase Storage)
   - activity log (basic)
5. **Views**
   - My Tasks (Today / Upcoming / Overdue)
   - Project List view
   - Project Board (Kanban)
6. **Templates + Recurring Tasks**
   - project templates (clone structure)
   - recurring tasks (daily/weekly/monthly/custom)
7. **Notifications**
   - assignment, mention, due soon, overdue
   - in-app inbox (email optional if easy)
8. **Search**
   - global task search (title + project)
9. **Basic permissions**
   - workspace members can access workspace
   - project can be “private” (members-only) or “workspace-visible”

### Explicitly out of scope for MVP (V2+)
- Mobile apps
- WhatsApp integration
- Advanced compliance features
- Complex automation rule builder
- Timeline/Gantt
- Advanced workload/capacity planning
- Guest-only restricted access model (beyond basic project membership)

---

## 5) Functional requirements (MVP)

### 5.1 Workspace & membership
**User stories**
- As an admin, I can create a workspace and invite members.
- As a user, I can see all workspaces I belong to and switch between them.

**Requirements**
- Workspace name, icon (optional).
- Roles: **Admin**, **Member** (MVP).
- Invite flow: email invite (or share link) → join workspace.

**Acceptance criteria**
- Admin can add/remove members.
- Removed member loses access immediately.

---

### 5.2 Projects
**User stories**
- As a manager, I can create a project to organize work.
- As a user, I can join a project and see tasks.

**Requirements**
- Project fields: name, description (optional), privacy (private / workspace-visible).
- Project membership: list of users.
- Sections: “To do”, “Doing”, “Done” default (editable).

**Acceptance criteria**
- User with access can create/edit project.
- Projects show task counts and overdue counts.

---

### 5.3 Tasks
**User stories**
- As a user, I can create a task in <5 seconds.
- As a manager, I can assign and set due dates quickly.
- As a team, we can keep discussion and files inside the task.

**Task fields**
- Title (required)
- Description (optional)
- Assignee (optional, default: creator)
- Due date/time (optional)
- Status (required; default: “To do”)
- Priority (optional: Low/Med/High)
- Section (optional; default: first section)
- Subtasks (0..n)
- Attachments (0..n)
- Comments with @mentions (0..n)
- Activity log entries (system-generated)

**UX requirements**
- Inline edit for assignee, due date, status in list rows and board cards.
- “Complete” checkbox always visible.
- Task details open in a **side panel** (drawer) with:
  - description, assignee, due, status, priority
  - comments
  - attachments
  - subtasks

**Acceptance criteria**
- Create task from:
  - “Quick Add” (global)
  - inside project section
  - inside board column
- Completing a task removes it from “Today” view immediately.
- Editing due date updates its position in “My Tasks” grouping instantly.

---

### 5.4 Subtasks
**Requirements**
- Subtasks have the same core fields (title, status, assignee, due date).
- Subtasks displayed within parent task detail drawer.
- Option: “Show subtasks in My Tasks” toggle (MVP: default OFF; can add later).

**Acceptance criteria**
- Subtasks can be completed independently.

---

### 5.5 Statuses / workflow (simple)
**Requirements**
- Each project has a set of statuses (default: To do, Doing, Waiting, Done).
- Admin/Project editor can rename/add/remove statuses.
- Board columns map to statuses or sections (choose one for MVP; recommended: **statuses**).

**Acceptance criteria**
- Changing status in list view updates board placement.
- “Waiting” status is visually distinct (chip).

---

### 5.6 Recurring tasks
**User stories**
- As a manager, I can set recurring tasks for weekly/monthly routines.
- As a user, recurring tasks appear automatically without re-creating them.

**Requirements**
- Recurrence patterns: daily, weekly, monthly, custom interval (e.g., every 2 weeks).
- Mode: “create next when completed” (recommended) OR “create on schedule” (optional).
- Recurrence should preserve assignee, title, project, section, status.

**Acceptance criteria**
- Completing a recurring task creates the next instance per rules.
- User can pause/resume recurrence.

---

### 5.7 Templates
**Requirements**
- Project templates:
  - Save a project structure (sections/statuses)
  - Optionally include a set of tasks (checklist)
- Create new project from template.

**Acceptance criteria**
- Template duplication preserves relative due offsets (optional in MVP; can keep due dates empty).

---

### 5.8 Comments, mentions, and notifications
**Requirements**
- Comments per task, newest last (or newest first—pick one).
- @mention triggers notification.
- Assignment triggers notification.
- Due soon: 24h before due (config later).

**In-app Inbox**
- Shows notifications with quick actions:
  - Open task
  - Mark as read
  - Snooze (optional)

**Acceptance criteria**
- Mentioned user receives inbox item immediately.
- Clicking notification opens the task drawer in context.

---

### 5.9 Attachments
**Requirements**
- Upload files into Supabase Storage.
- Attach files to tasks.
- Show file list with upload time and uploader.

**Acceptance criteria**
- Permission check: only members with task access can download attachment.

---

### 5.10 My Tasks (the “home”)
**Requirements**
- Default landing screen after login.
- Tabs:
  - **Today** (due today + manually flagged “Today” optional)
  - **Upcoming** (next 7/14 days)
  - **Overdue**
- Filters:
  - by project
  - by status
- Grouping:
  - Today: grouped by project (or by due time)
  - Upcoming: grouped by date

**Acceptance criteria**
- User can complete tasks without leaving My Tasks.
- Overdue tasks are clearly highlighted.

---

### 5.11 Project views
**Project List View**
- Sections and tasks
- Inline edits

**Project Board View**
- Drag & drop cards between statuses
- Quick add card per column

**Acceptance criteria**
- Dragging a card updates status and logs activity.

---

### 5.12 Search
**Requirements**
- Global search bar (top nav)
- Search tasks by title (MVP) and show results grouped by project.

**Acceptance criteria**
- Results return in < 1 second for typical small org datasets.

---

## 6) Information architecture (navigation)
Top navigation:
- **My Tasks**
- **Projects**
- **Inbox**
- **Search**
- Workspace switcher + profile menu

Projects page:
- list of projects with:
  - name
  - privacy
  - member count
  - overdue count

---

## 7) Data model (Supabase Postgres — suggested tables)
> Keep schema flexible and minimal; add advanced entities in V2.

### 7.1 Tables (high level)
- `workspaces` (id, name, created_by, created_at)
- `workspace_members` (workspace_id, user_id, role)
- `projects` (id, workspace_id, name, description, privacy, created_at)
- `project_members` (project_id, user_id, role_optional)
- `project_statuses` (id, project_id, name, order, is_done)
- `tasks` (id, project_id, title, description, status_id, section_optional, assignee_id, creator_id, due_at, priority, parent_task_id, recurrence_id, created_at, updated_at, completed_at)
- `task_comments` (id, task_id, user_id, body, created_at)
- `task_attachments` (id, task_id, storage_path, file_name, mime_type, size, uploaded_by, created_at)
- `notifications` (id, workspace_id, user_id, type, entity_type, entity_id, payload_json, read_at, created_at)
- `recurrences` (id, workspace_id, pattern_json, mode, next_run_at, is_paused)

### 7.2 Security (Row Level Security) principles
- Users can access:
  - workspaces they belong to
  - projects inside those workspaces where:
    - project is workspace-visible OR user is a project member
  - tasks inside projects they can access
- Only project members can create/edit tasks.

---

## 8) Key UI components (build these as reusable patterns)
1. **Task Row** (list)
   - checkbox, title, status chip, assignee avatar, due date pill, priority
   - hover actions: comment, attach, more menu

2. **Task Card** (board)
   - title, assignee, due date, status indicator, comment count

3. **Task Drawer**
   - header: title + status + complete
   - tabs/sections: details, subtasks, comments, attachments, activity

4. **Quick Add**
   - global input: “Add a task…”
   - smart defaults:
     - if inside a project → assign to that project
     - else → ask “Which project?” (typeahead)

5. **Status Chips**
   - readable, consistent, minimal colors

---

## 9) “Intuitive features” checklist (MVP-friendly)
- **Smart defaults** (assignee = you, status = To do, due date empty)
- **Inline edit** everywhere (owner/due/status)
- **Keyboard shortcuts** (at least: new task, complete, open drawer)
- **Command palette** (optional but very “rich” feel): Ctrl/⌘+K for quick navigation/actions
- **Empty states that teach**: first-time project shows “Add your first task” + a 10-second guide
- **One-click filters**: Overdue, Due this week, Waiting, Unassigned
- **“Waiting” state**: encourages moving stuck work out of “Doing”

---

## 10) MVP milestones (suggested build plan)
### Sprint 1: Foundations
- Supabase auth + workspace membership
- Projects list + create project
- Task create + list view + task drawer

### Sprint 2: Daily usability
- My Tasks (Today/Upcoming/Overdue)
- Inline edit + complete flow
- Comments + mentions (basic)

### Sprint 3: “Rich” feel
- Board view + drag/drop
- Notifications inbox
- Attachments via Supabase Storage

### Sprint 4: Repeatability
- Recurring tasks
- Project templates (basic clone)
- Search

---

## 11) Risks & mitigations
- **Risk: becomes “too much like Asana” (complex).**  
  Mitigation: keep MVP feature flags; default UI hides advanced settings behind “Project settings”.

- **Risk: users don’t adopt due dates.**  
  Mitigation: gentle prompts; “My Tasks” emphasizes deadlines; show “Unassigned/No due date” buckets.

- **Risk: performance issues on lists.**  
  Mitigation: pagination/virtual list; optimistic updates.

---

## 12) Open decisions (for later)
1. Should the board be driven by **statuses** or **sections** in MVP? (Recommendation: statuses.)
2. Should due date support time zones/time-of-day in MVP or date-only?
3. Should external clients be first-class members (regular accounts) or “guest” type later?

---

## Appendix A — Status defaults (recommended)
- **To do**
- **Doing**
- **Waiting**
- **Done** (is_done = true)

## Appendix B — Priority defaults
- Low / Medium / High (optional field)
