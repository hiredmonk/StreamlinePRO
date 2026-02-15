export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          role?: 'admin' | 'member';
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          privacy: 'workspace_visible' | 'private';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          privacy?: 'workspace_visible' | 'private';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          privacy?: 'workspace_visible' | 'private';
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: 'editor' | 'viewer';
          created_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: 'editor' | 'viewer';
          created_at?: string;
        };
        Update: {
          role?: 'editor' | 'viewer';
        };
        Relationships: [];
      };
      project_sections: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      project_statuses: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string;
          sort_order: number;
          is_done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          sort_order: number;
          is_done?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          sort_order?: number;
          is_done?: boolean;
        };
        Relationships: [];
      };
      recurrences: {
        Row: {
          id: string;
          workspace_id: string;
          pattern_json: Json;
          mode: 'create_on_complete' | 'create_on_schedule';
          next_run_at: string | null;
          is_paused: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          pattern_json: Json;
          mode?: 'create_on_complete' | 'create_on_schedule';
          next_run_at?: string | null;
          is_paused?: boolean;
          created_by: string;
          created_at?: string;
        };
        Update: {
          pattern_json?: Json;
          mode?: 'create_on_complete' | 'create_on_schedule';
          next_run_at?: string | null;
          is_paused?: boolean;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          section_id: string | null;
          status_id: string;
          title: string;
          description: string | null;
          assignee_id: string | null;
          creator_id: string;
          due_at: string | null;
          due_timezone: string | null;
          priority: 'low' | 'medium' | 'high' | null;
          parent_task_id: string | null;
          recurrence_id: string | null;
          is_today: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          section_id?: string | null;
          status_id: string;
          title: string;
          description?: string | null;
          assignee_id?: string | null;
          creator_id: string;
          due_at?: string | null;
          due_timezone?: string | null;
          priority?: 'low' | 'medium' | 'high' | null;
          parent_task_id?: string | null;
          recurrence_id?: string | null;
          is_today?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          section_id?: string | null;
          status_id?: string;
          title?: string;
          description?: string | null;
          assignee_id?: string | null;
          due_at?: string | null;
          due_timezone?: string | null;
          priority?: 'low' | 'medium' | 'high' | null;
          is_today?: boolean;
          sort_order?: number;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          channel: 'in_app' | 'email';
          type:
            | 'assignment'
            | 'mention'
            | 'due_soon'
            | 'overdue'
            | 'comment'
            | 'system';
          entity_type: 'task' | 'project' | 'comment' | 'workspace';
          entity_id: string;
          payload_json: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          channel?: 'in_app' | 'email';
          type:
            | 'assignment'
            | 'mention'
            | 'due_soon'
            | 'overdue'
            | 'comment'
            | 'system';
          entity_type: 'task' | 'project' | 'comment' | 'workspace';
          entity_id: string;
          payload_json?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
          payload_json?: Json;
        };
        Relationships: [];
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size: number;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size: number;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          file_name?: string;
        };
        Relationships: [];
      };
      task_activity: {
        Row: {
          id: string;
          task_id: string;
          actor_id: string;
          event_type: string;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          actor_id: string;
          event_type: string;
          payload_json?: Json;
          created_at?: string;
        };
        Update: {
          payload_json?: Json;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
