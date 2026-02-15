import type { AppSupabaseClient } from "@/lib/supabase/client-types";

export type WorkspaceSummary = {
  id: string;
  name: string;
  icon: string | null;
  role: "admin" | "member";
};

export type ProjectSummary = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  privacy: "workspace_visible" | "private";
  taskCount: number;
  overdueCount: number;
};

function isMissingWorkspaceMembersError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  if (maybeError.code !== "PGRST205") {
    return false;
  }

  const combined = [maybeError.message, maybeError.details, maybeError.hint]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();

  return combined.includes("workspace_members");
}

export async function getWorkspacesForUser(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<WorkspaceSummary[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      role,
      workspace:workspaces (
        id,
        name,
        icon
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingWorkspaceMembersError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((row) => {
    const workspace = Array.isArray(row.workspace)
      ? row.workspace[0]
      : row.workspace;

    return {
      id: workspace.id,
      name: workspace.name,
      icon: workspace.icon,
      role: row.role,
    };
  });
}

export async function getProjectsForWorkspace(
  supabase: AppSupabaseClient,
  workspaceId: string,
): Promise<ProjectSummary[]> {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, workspace_id, name, description, privacy")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const projectIds = (projects ?? []).map((project) => project.id);

  if (!projectIds.length) {
    return [];
  }

  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("project_id, due_at, completed_at")
    .in("project_id", projectIds);

  if (taskError) {
    throw taskError;
  }

  const now = new Date();

  return (projects ?? []).map((project) => {
    const projectTasks = (tasks ?? []).filter(
      (task) => task.project_id === project.id,
    );
    const overdueCount = projectTasks.filter(
      (task) =>
        task.due_at && !task.completed_at && new Date(task.due_at) < now,
    ).length;

    return {
      id: project.id,
      workspaceId: project.workspace_id,
      name: project.name,
      description: project.description,
      privacy: project.privacy,
      taskCount: projectTasks.length,
      overdueCount,
    };
  });
}

export async function getProjectById(
  supabase: AppSupabaseClient,
  projectId: string,
): Promise<ProjectSummary | null> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, workspace_id, name, description, privacy")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!project) {
    return null;
  }

  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("due_at, completed_at")
    .eq("project_id", project.id);

  if (taskError) {
    throw taskError;
  }

  const overdueCount = (tasks ?? []).filter(
    (task) =>
      task.due_at && !task.completed_at && new Date(task.due_at) < new Date(),
  ).length;

  return {
    id: project.id,
    workspaceId: project.workspace_id,
    name: project.name,
    description: project.description,
    privacy: project.privacy,
    taskCount: (tasks ?? []).length,
    overdueCount,
  };
}

export async function getProjectStatuses(
  supabase: AppSupabaseClient,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("project_statuses")
    .select("id, name, color, is_done, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getProjectSections(
  supabase: AppSupabaseClient,
  projectId: string,
) {
  const { data, error } = await supabase
    .from("project_sections")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
