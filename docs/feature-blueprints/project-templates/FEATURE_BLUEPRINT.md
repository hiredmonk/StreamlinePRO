# Project Templates - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Project bootstrap defaults | Project creation initializes statuses + sections in one flow | `lib/actions/project-actions.ts`, `lib/constants/status-colors.ts` | Reuse initialization contract for template-based creation |
| Project query model | Project list/detail query shape with counts and metadata | `lib/domain/projects/queries.ts` | Reuse read model conventions for template listing |
| Validation style | Input parsing via Zod and explicit invariant checks | `lib/validators/project.ts` | Reuse for template name uniqueness and clone options |
| Schema conventions | UUID keys, ownership, workspace scoping, RLS enforcement | `db/migrations/202602151300_init.sql` | Reuse workspace/project scope and role checks |
| PRD feature intent | Templates can clone structure and optional task checklist | `PRD/StreamlinePRO.md` (sections 5.7, roadmap) | Use as product boundary for template contract |
| Form action wrappers | FormData adapters call server action signatures | `lib/actions/form-actions.ts` | Reuse for create-template and create-from-template submissions |
| Testing style | Action-level unit tests with supabase mock chains | `tests/unit/actions/project-actions.test.ts` | Reuse for template action contract tests |

## Interface (Engineering Drawings)
These interfaces are the engineering drawings for project template creation, update, listing, and project cloning.

## Feature List
- Project templates feature

### Input Types
```ts
export interface TemplateStatusDraft {
  name: string;
  color: string;
  isDone: boolean;
  sortOrder: number;
}

export interface TemplateSectionDraft {
  name: string;
  sortOrder: number;
}

export interface TemplateTaskDraft {
  title: string;
  description?: string;
  statusName?: string;
  sectionName?: string;
  dueOffsetDays?: number;
}

export interface CreateProjectTemplateInput {
  workspaceId: string;
  sourceProjectId: string;
  name: string;
  includeTasks: boolean;
  actorUserId: string;
}

export interface UpdateProjectTemplateInput {
  templateId: string;
  name?: string;
  includeTasks?: boolean;
  actorUserId: string;
}

export interface CreateProjectFromTemplateInput {
  workspaceId: string;
  templateId: string;
  projectName: string;
  dueAnchorDate?: string | null;
  actorUserId: string;
}

export interface ListProjectTemplatesInput {
  workspaceId: string;
  actorUserId: string;
}
```

### Output Types
```ts
export interface ProjectTemplateSummary {
  id: string;
  workspaceId: string;
  name: string;
  includeTasks: boolean;
  statusCount: number;
  sectionCount: number;
  taskCount: number;
  createdBy: string;
  createdAt: string;
}

export interface ProjectTemplateDetail extends ProjectTemplateSummary {
  statuses: TemplateStatusDraft[];
  sections: TemplateSectionDraft[];
  tasks: TemplateTaskDraft[];
}

export interface CreateProjectTemplateOutput {
  template: ProjectTemplateSummary;
}

export interface UpdateProjectTemplateOutput {
  template: ProjectTemplateSummary;
}

export interface CreateProjectFromTemplateOutput {
  projectId: string;
  workspaceId: string;
  templateId: string;
  createdStatusCount: number;
  createdSectionCount: number;
  createdTaskCount: number;
}

export interface ListProjectTemplatesOutput {
  templates: ProjectTemplateSummary[];
}
```

### Function Signatures
```ts
export type CreateProjectTemplateAction = (
  input: CreateProjectTemplateInput
) => Promise<ActionResult<CreateProjectTemplateOutput>>;

export type UpdateProjectTemplateAction = (
  input: UpdateProjectTemplateInput
) => Promise<ActionResult<UpdateProjectTemplateOutput>>;

export type CreateProjectFromTemplateAction = (
  input: CreateProjectFromTemplateInput
) => Promise<ActionResult<CreateProjectFromTemplateOutput>>;

export type ListProjectTemplatesQuery = (
  input: ListProjectTemplatesInput
) => Promise<ListProjectTemplatesOutput>;
```

## Edge Cases
- Template source project has statuses/sections deleted during template creation.
- Template contains task drafts referencing non-existent status or section names.
- Template clone requested by user without workspace/project edit rights.
- Assignee in template is no longer workspace member.
- `dueAnchorDate` null with relative offsets should produce deterministic due behavior.
- Template rename conflict within same workspace.

## Out of Scope (No Logic Yet)
- Database migration/table definitions for templates.
- Clone execution logic and transaction boundaries.
- UI implementation for template gallery and chooser.
