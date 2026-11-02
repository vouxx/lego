export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  lego: {
    Tables: {
      findings: {
        Row: {
          ai_verdict: string | null;
          created_at: string;
          explanation: string | null;
          file_path: string;
          fingerprint: string;
          fix_prompt: string | null;
          id: string;
          line_end: number;
          line_start: number;
          rule_id: string;
          scan_id: string;
          severity: string;
          snippet: string;
          status: string;
          user_id: string;
        };
        Insert: {
          ai_verdict?: string | null;
          created_at?: string;
          explanation?: string | null;
          file_path: string;
          fingerprint: string;
          fix_prompt?: string | null;
          id?: string;
          line_end: number;
          line_start: number;
          rule_id: string;
          scan_id: string;
          severity: string;
          snippet: string;
          status?: string;
          user_id: string;
        };
        Update: {
          ai_verdict?: string | null;
          created_at?: string;
          explanation?: string | null;
          file_path?: string;
          fingerprint?: string;
          fix_prompt?: string | null;
          id?: string;
          line_end?: number;
          line_start?: number;
          rule_id?: string;
          scan_id?: string;
          severity?: string;
          snippet?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "findings_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "findings_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "findings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      github_installations: {
        Row: {
          account_login: string;
          created_at: string;
          id: string;
          installation_id: number;
          user_id: string;
        };
        Insert: {
          account_login: string;
          created_at?: string;
          id?: string;
          installation_id: number;
          user_id: string;
        };
        Update: {
          account_login?: string;
          created_at?: string;
          id?: string;
          installation_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "github_installations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      llm_calls: {
        Row: {
          cached: boolean;
          cost_usd: number;
          created_at: string;
          id: string;
          input_tokens: number;
          latency_ms: number | null;
          model: string;
          output_tokens: number;
          purpose: string;
          scan_id: string | null;
          user_id: string;
        };
        Insert: {
          cached?: boolean;
          cost_usd?: number;
          created_at?: string;
          id?: string;
          input_tokens?: number;
          latency_ms?: number | null;
          model: string;
          output_tokens?: number;
          purpose: string;
          scan_id?: string | null;
          user_id: string;
        };
        Update: {
          cached?: boolean;
          cost_usd?: number;
          created_at?: string;
          id?: string;
          input_tokens?: number;
          latency_ms?: number | null;
          model?: string;
          output_tokens?: number;
          purpose?: string;
          scan_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "llm_calls_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "llm_calls_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          github_login: string;
          id: string;
          plan: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          github_login: string;
          id: string;
          plan?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          github_login?: string;
          id?: string;
          plan?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          default_branch: string;
          detected_stack: Json;
          id: string;
          installation_id: number;
          repo_full_name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          default_branch: string;
          detected_stack?: Json;
          id?: string;
          installation_id: number;
          repo_full_name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          default_branch?: string;
          detected_stack?: Json;
          id?: string;
          installation_id?: number;
          repo_full_name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "github_installations";
            referencedColumns: ["installation_id"];
          },
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rules: {
        Row: {
          category: string;
          detector: string;
          enabled: boolean;
          id: string;
          severity: string;
          title: string;
        };
        Insert: {
          category: string;
          detector: string;
          enabled?: boolean;
          id: string;
          severity: string;
          title: string;
        };
        Update: {
          category?: string;
          detector?: string;
          enabled?: boolean;
          id?: string;
          severity?: string;
          title?: string;
        };
        Relationships: [];
      };
      scans: {
        Row: {
          commit_sha: string | null;
          created_at: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          progress: number;
          project_id: string;
          started_at: string | null;
          status: string;
          summary: Json | null;
          user_id: string;
        };
        Insert: {
          commit_sha?: string | null;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          progress?: number;
          project_id: string;
          started_at?: string | null;
          status?: string;
          summary?: Json | null;
          user_id: string;
        };
        Update: {
          commit_sha?: string | null;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          progress?: number;
          project_id?: string;
          started_at?: string | null;
          status?: string;
          summary?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scans_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      schema_migrations: {
        Row: {
          applied_at: string;
          version: string;
        };
        Insert: {
          applied_at?: string;
          version: string;
        };
        Update: {
          applied_at?: string;
          version?: string;
        };
        Relationships: [];
      };
      usage_quotas: {
        Row: {
          period: string;
          scans_limit: number;
          scans_used: number;
          tokens_limit: number;
          tokens_used: number;
          user_id: string;
        };
        Insert: {
          period: string;
          scans_limit?: number;
          scans_used?: number;
          tokens_limit?: number;
          tokens_used?: number;
          user_id: string;
        };
        Update: {
          period?: string;
          scans_limit?: number;
          scans_used?: number;
          tokens_limit?: number;
          tokens_used?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_quotas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ack_scan_job: { Args: { p_msg_id: number }; Returns: boolean };
      add_token_usage: {
        Args: { p_tokens: number; p_user_id: string };
        Returns: boolean;
      };
      archive_scan_job: { Args: { p_msg_id: number }; Returns: boolean };
      consume_scan_quota: { Args: { p_user_id: string }; Returns: boolean };
      enqueue_scan: { Args: { p_scan_id: string }; Returns: number };
      read_scan_jobs: {
        Args: { p_qty: number; p_visibility_seconds: number };
        Returns: {
          msg_id: number;
          read_ct: number;
          scan_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  lego: {
    Enums: {},
  },
} as const;
