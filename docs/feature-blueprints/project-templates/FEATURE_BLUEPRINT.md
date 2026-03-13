# Project Templates - FEATURE_BLUEPRINT

<!-- markdownlint-disable MD013 -->

## Pattern Map

| Concern                                         | Existing Pattern                                                                    | Source File(s)                                                                                                                              | Reuse Decision                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Workspace-level project creation                | The active workspace Projects page is already the creation surface for new projects | `app/(app)/projects/page.tsx`, `lib/page-loaders/projects-page.ts`, `app/components/projects/create-project-form.tsx`                       | Extend the existing Projects page and create-project form instead of adding a separate template landing page  |
| Project detail owns project-specific actions    | Project detail already shows project summary and workflow controls in context       | `app/(app)/projects/[projectId]/page.tsx`, `lib/page-loaders/project-detail-page.ts`, `app/components/projects/workflow-status-manager.tsx` | Add the template authoring entry point to the project detail header instead of inventing a new settings route |
| Declarative server-action forms                 | Project and task mutations already flow through server actions and form wrappers    | `lib/actions/project-actions.ts`, `lib/actions/form-actions.ts`, `PATTERNS.md`                                                              | Keep template save and create-from-template flows as direct form posts                                        |
| Server-side initialization of project structure | Project creation already seeds statuses and sections on the server                  | `lib/actions/project-actions.ts`, `lib/constants/status-colors.ts`                                                                          | Reuse the project initializer path and branch it through a template snapshot when `templateId` is present     |
| Workspace-first access control                  | Workspace membership and project access are resolved on the server                  | `lib/domain/projects/queries.ts`, `db/migrations/202602151300_init.sql`, `architecture.md`                                                  | Keep templates workspace-scoped so visibility matches existing workspace navigation and RLS patterns          |

## Interface

This blueprint defines the lasting MVP contract for project templates.

### Product Scope

- Templates are workspace-shared in MVP.
- Any workspace member can create a new project from a visible template.
- Template authoring is limited to saving an existing workspace-visible project as a template.
- Personal templates, standalone template editing, and template delete management are out of scope.

### Entry Points

- Create from template:
  - on `/projects?workspace=<id>`
  - inside the existing `CreateProjectForm`
- Save as template:
  - in the project detail header on `/projects/[projectId]`
  - visible only when the current project is `workspace_visible`

### Data Contracts

```ts
type ProjectTemplateTaskSnapshot = {
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | null;
  sectionName: string | null;
  statusName: string | null;
};

type ProjectTemplateSnapshot = {
  statuses: Array<{
    name: string;
    color: string;
    isDone: boolean;
    sortOrder: number;
  }>;
  sections: Array<{
    name: string;
    sortOrder: number;
  }>;
  tasks: ProjectTemplateTaskSnapshot[];
};

type ProjectTemplateSummary = {
  id: string;
  workspaceId: string;
  sourceProjectId: string;
  name: string;
  description: string | null;
  includeTasks: boolean;
  taskCount: number;
  createdBy: string;
  createdAt: string;
};
```

### Persistence Contract

- Introduce a single `project_templates` relation with:
  - `id`
  - `workspace_id`
  - `source_project_id`
  - `name`
  - `description`
  - `include_tasks`
  - `snapshot_json`
  - `created_by`
  - `created_at`
  - `updated_at`
- `snapshot_json` stores:
  - ordered statuses
  - ordered sections
  - optional ordered top-level task checklist
- Do not introduce mirrored child template tables in MVP.

### Action Contracts

- `saveProjectTemplateAction(input: { projectId: string; name: string; description?: string; includeTasks: boolean })`
- `createProjectAction` gains optional `templateId?: string | null`
- `loadProjectsPageData` gains workspace-scoped `projectTemplates`

## Behavior Contracts

- `CreateProjectForm` supports two modes:
  - blank project
  - create from template
- When a template is selected:
  - project name remains required and user-supplied
  - project description is prefilled from the template but remains editable
  - privacy stays a user choice at creation time
- Saving a template snapshots the source project's:
  - statuses in current sort order
  - sections in current sort order
  - top-level incomplete tasks only when `includeTasks` is true
- Template task cloning rules:
  - preserve task title, description, priority, section mapping, and status mapping
  - if a saved status is missing or done-only in the new project, fall back to the first non-done status
  - if a saved section is missing, create the task without a section
  - always create tasks as top-level tasks
  - always set `assignee_id`, `due_at`, `due_timezone`, `recurrence_id`, and `completed_at` to `null`
  - always set `is_today` to `false`
  - never clone comments, attachments, activity, or subtasks
- Template save availability:
  - allowed only for users who can edit the source project
  - hidden for private projects in MVP to avoid turning private project data into workspace-wide template content

## Security and Policy Rules

- Template visibility follows workspace membership.
- Creating from a template requires access to the template's workspace.
- Saving a template requires edit access to the source project.
- Private-project-to-workspace-template conversion is out of scope for MVP.

## Edge Cases

- A workspace with no templates must continue to show the existing blank-project flow without dead-end UI.
- A missing or inaccessible `templateId` must fail safely and create nothing.
- Template creation must stay all-or-nothing: if status, section, or task cloning fails, the new project must not remain partially initialized.
- Templates saved without tasks must still clone statuses and sections.
- Renamed statuses or sections in the source project are stored as snapshot values, not live references.
- Template snapshots never preserve assignees because workspace membership and privacy context can differ at creation time.

## Tests-First Map

- `tests/unit/actions/project-actions.test.ts`
  - save template snapshot from a workspace-visible project
  - reject save from a private project
  - create project from template with and without task checklist
  - all-or-nothing rollback on clone failure
- `tests/unit/actions/form-actions.test.ts`
  - create-project form forwarding with `templateId`
  - save-template form forwarding
- `tests/unit/components/create-project-form.test.tsx`
  - blank mode
  - template selection mode
  - editable name, description, and privacy fields
- `tests/unit/components/projects-page.test.tsx`
  - template options render on the active workspace page
  - blank state when no templates exist
- `tests/unit/components/project-detail-page.test.tsx`
  - workspace-visible projects render the save-template entry point
  - private projects do not
- `tests/unit/page-loaders/projects-page.test.ts`
  - workspace-scoped template loading and fallback behavior

## Out of Scope

- Personal template libraries
- Template editing after save
- Template deletion UI
- Saving templates from private projects
- Relative due offsets
- Template cloning of assignees, subtasks, comments, attachments, activity, or recurrence
