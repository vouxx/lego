export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  lego: {
    Tables: {
      concepts: {
        Row: {
          body_md: string;
          related_rule_ids: string[];
          slug: string;
          sort_order: number;
          summary: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          body_md: string;
          related_rule_ids?: string[];
          slug: string;
          sort_order?: number;
          summary: string;
          title: string;
        };
        Update: {
          body_md?: string;
          related_rule_ids?: string[];
          slug?: string;
          sort_order?: number;
          summary?: string;
          title?: string;
        };
        Relationships: [];
      };
      context_file_rules: {
        Row: {
          context_file_id: string;
          created_at: string;
          enabled: boolean;
          id: string;
          item_id: string | null;
          override_content: string | null;
          section: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          context_file_id: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          item_id?: string | null;
          override_content?: string | null;
          section?: string | null;
          user_id: string;
        };
        Update: {
          context_file_id?: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          item_id?: string | null;
          override_content?: string | null;
          section?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "context_file_rules_context_file_id_fkey";
            columns: ["context_file_id"];
            isOneToOne: false;
            referencedRelation: "context_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "context_file_rules_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "rule_pack_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "context_file_rules_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      context_file_versions: {
        Row: {
          based_on_commit: string | null;
          content: string;
          context_file_id: string;
          created_at: string;
          id: string;
          pr_url: string | null;
          source: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          based_on_commit?: string | null;
          content: string;
          context_file_id: string;
          created_at?: string;
          id?: string;
          pr_url?: string | null;
          source: string;
          user_id: string;
        };
        Update: {
          based_on_commit?: string | null;
          content?: string;
          context_file_id?: string;
          created_at?: string;
          id?: string;
          pr_url?: string | null;
          source?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "context_file_versions_context_file_id_fkey";
            columns: ["context_file_id"];
            isOneToOne: false;
            referencedRelation: "context_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "context_file_versions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      context_files: {
        Row: {
          analysis: Json | null;
          analyzed_commit: string | null;
          created_at: string;
          current_version_id: string | null;
          id: string;
          outdated: boolean;
          project_id: string;
          target: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          analysis?: Json | null;
          analyzed_commit?: string | null;
          created_at?: string;
          current_version_id?: string | null;
          id?: string;
          outdated?: boolean;
          project_id: string;
          target: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analysis?: Json | null;
          analyzed_commit?: string | null;
          created_at?: string;
          current_version_id?: string | null;
          id?: string;
          outdated?: boolean;
          project_id?: string;
          target?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "context_files_current_version_fk";
            columns: ["current_version_id"];
            isOneToOne: false;
            referencedRelation: "context_file_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "context_files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "context_files_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
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
        ComputedFields: never;
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
        ComputedFields: never;
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
      live_checks: {
        Row: {
          created_at: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          results: NonNullable<Json>;
          status: string;
          summary: NonNullable<Json>;
          target_id: string;
          trigger: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          results?: NonNullable<Json>;
          status?: string;
          summary?: NonNullable<Json>;
          target_id: string;
          trigger?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          results?: NonNullable<Json>;
          status?: string;
          summary?: NonNullable<Json>;
          target_id?: string;
          trigger?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_checks_target_id_fkey";
            columns: ["target_id"];
            isOneToOne: false;
            referencedRelation: "live_targets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_checks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      live_targets: {
        Row: {
          created_at: string;
          id: string;
          last_checked_at: string | null;
          project_id: string;
          site_url: string;
          user_id: string;
          verified_at: string | null;
          verify_token: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          last_checked_at?: string | null;
          project_id: string;
          site_url: string;
          user_id: string;
          verified_at?: string | null;
          verify_token: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_checked_at?: string | null;
          project_id?: string;
          site_url?: string;
          user_id?: string;
          verified_at?: string | null;
          verify_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_targets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_targets_user_id_fkey";
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
          context_file_id: string | null;
          cost_usd: number;
          created_at: string;
          id: string;
          input_tokens: number;
          latency_ms: number | null;
          model: string;
          output_tokens: number;
          pr_review_id: string | null;
          purpose: string;
          scan_id: string | null;
          spec_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cached?: boolean;
          context_file_id?: string | null;
          cost_usd?: number;
          created_at?: string;
          id?: string;
          input_tokens?: number;
          latency_ms?: number | null;
          model: string;
          output_tokens?: number;
          pr_review_id?: string | null;
          purpose: string;
          scan_id?: string | null;
          spec_id?: string | null;
          user_id: string;
        };
        Update: {
          cached?: boolean;
          context_file_id?: string | null;
          cost_usd?: number;
          created_at?: string;
          id?: string;
          input_tokens?: number;
          latency_ms?: number | null;
          model?: string;
          output_tokens?: number;
          pr_review_id?: string | null;
          purpose?: string;
          scan_id?: string | null;
          spec_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "llm_calls_context_file_id_fkey";
            columns: ["context_file_id"];
            isOneToOne: false;
            referencedRelation: "context_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "llm_calls_pr_review_id_fkey";
            columns: ["pr_review_id"];
            isOneToOne: false;
            referencedRelation: "pr_reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "llm_calls_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "scans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "llm_calls_spec_id_fkey";
            columns: ["spec_id"];
            isOneToOne: false;
            referencedRelation: "specs";
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
      pr_review_findings: {
        Row: {
          ai_verdict: string | null;
          created_at: string;
          explanation: string | null;
          file_path: string;
          fingerprint: string;
          fix_prompt: string | null;
          github_comment_id: number | null;
          id: string;
          ignore_reason: string | null;
          ignored_by: string | null;
          line: number;
          reason: string;
          review_id: string;
          rule_id: string;
          rule_title: string;
          severity: string;
          snippet: string;
          state: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          ai_verdict?: string | null;
          created_at?: string;
          explanation?: string | null;
          file_path: string;
          fingerprint?: string;
          fix_prompt?: string | null;
          github_comment_id?: number | null;
          id?: string;
          ignore_reason?: string | null;
          ignored_by?: string | null;
          line: number;
          reason: string;
          review_id: string;
          rule_id: string;
          rule_title: string;
          severity: string;
          snippet?: string;
          state?: string;
          user_id: string;
        };
        Update: {
          ai_verdict?: string | null;
          created_at?: string;
          explanation?: string | null;
          file_path?: string;
          fingerprint?: string;
          fix_prompt?: string | null;
          github_comment_id?: number | null;
          id?: string;
          ignore_reason?: string | null;
          ignored_by?: string | null;
          line?: number;
          reason?: string;
          review_id?: string;
          rule_id?: string;
          rule_title?: string;
          severity?: string;
          snippet?: string;
          state?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pr_review_findings_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "pr_reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pr_review_findings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pr_reviews: {
        Row: {
          check_run_id: number | null;
          created_at: string;
          error: string | null;
          head_sha: string;
          id: string;
          pr_number: number;
          pr_title: string;
          pr_url: string | null;
          project_id: string;
          status: string;
          summary: NonNullable<Json>;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          check_run_id?: number | null;
          created_at?: string;
          error?: string | null;
          head_sha: string;
          id?: string;
          pr_number: number;
          pr_title?: string;
          pr_url?: string | null;
          project_id: string;
          status?: string;
          summary?: NonNullable<Json>;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          check_run_id?: number | null;
          created_at?: string;
          error?: string | null;
          head_sha?: string;
          id?: string;
          pr_number?: number;
          pr_title?: string;
          pr_url?: string | null;
          project_id?: string;
          status?: string;
          summary?: NonNullable<Json>;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pr_reviews_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pr_reviews_user_id_fkey";
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
        ComputedFields: never;
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
          detected_stack: NonNullable<Json>;
          id: string;
          installation_id: number | null;
          pr_guard_enabled: boolean;
          pr_guard_strictness: string;
          repo_full_name: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_branch: string;
          detected_stack?: NonNullable<Json>;
          id?: string;
          installation_id?: number | null;
          pr_guard_enabled?: boolean;
          pr_guard_strictness?: string;
          repo_full_name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          default_branch?: string;
          detected_stack?: NonNullable<Json>;
          id?: string;
          installation_id?: number | null;
          pr_guard_enabled?: boolean;
          pr_guard_strictness?: string;
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
      prompt_templates: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          owner_id: string | null;
          source: string;
          tags: string[];
          title: string;
          use_count: number;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          owner_id?: string | null;
          source?: string;
          tags?: string[];
          title: string;
          use_count?: number;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          owner_id?: string | null;
          source?: string;
          tags?: string[];
          title?: string;
          use_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_templates_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rule_pack_items: {
        Row: {
          content: string;
          default_enabled: boolean;
          id: string;
          pack_id: string;
          section: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          content: string;
          default_enabled?: boolean;
          id?: string;
          pack_id: string;
          section: string;
          sort_order?: number;
        };
        Update: {
          content?: string;
          default_enabled?: boolean;
          id?: string;
          pack_id?: string;
          section?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rule_pack_items_pack_id_fkey";
            columns: ["pack_id"];
            isOneToOne: false;
            referencedRelation: "rule_packs";
            referencedColumns: ["id"];
          },
        ];
      };
      rule_packs: {
        Row: {
          detect: NonNullable<Json>;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          detect?: NonNullable<Json>;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          version?: number;
        };
        Update: {
          detect?: NonNullable<Json>;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          version?: number;
        };
        Relationships: [];
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
        ComputedFields: never;
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
        ComputedFields: never;
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
        ComputedFields: never;
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
      spec_tasks: {
        Row: {
          acceptance_criteria: NonNullable<Json>;
          depends_on: string[];
          description: string;
          done_commit: string | null;
          id: string;
          key: string;
          prompt: string;
          seq: number;
          spec_id: string;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          acceptance_criteria?: NonNullable<Json>;
          depends_on?: string[];
          description?: string;
          done_commit?: string | null;
          id?: string;
          key: string;
          prompt?: string;
          seq: number;
          spec_id: string;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          acceptance_criteria?: NonNullable<Json>;
          depends_on?: string[];
          description?: string;
          done_commit?: string | null;
          id?: string;
          key?: string;
          prompt?: string;
          seq?: number;
          spec_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spec_tasks_spec_id_fkey";
            columns: ["spec_id"];
            isOneToOne: false;
            referencedRelation: "specs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "spec_tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      specs: {
        Row: {
          answers: NonNullable<Json>;
          context_md: string | null;
          created_at: string;
          data_model: Json | null;
          error: string | null;
          generation_started_at: string | null;
          id: string;
          idea: string;
          overview: string | null;
          prd_md: string | null;
          progress: NonNullable<Json>;
          project_id: string | null;
          questions: NonNullable<Json>;
          screens: Json | null;
          stack_tags: string[];
          status: string;
          title: string | null;
          updated_at: string;
          user_id: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          answers?: NonNullable<Json>;
          context_md?: string | null;
          created_at?: string;
          data_model?: Json | null;
          error?: string | null;
          generation_started_at?: string | null;
          id?: string;
          idea: string;
          overview?: string | null;
          prd_md?: string | null;
          progress?: NonNullable<Json>;
          project_id?: string | null;
          questions?: NonNullable<Json>;
          screens?: Json | null;
          stack_tags?: string[];
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          answers?: NonNullable<Json>;
          context_md?: string | null;
          created_at?: string;
          data_model?: Json | null;
          error?: string | null;
          generation_started_at?: string | null;
          id?: string;
          idea?: string;
          overview?: string | null;
          prd_md?: string | null;
          progress?: NonNullable<Json>;
          project_id?: string | null;
          questions?: NonNullable<Json>;
          screens?: Json | null;
          stack_tags?: string[];
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "specs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "specs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        ComputedFields: never;
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
      kick_scan_worker: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      previous_scan_id: { Args: { p_scan_id: string }; Returns: string };
      read_scan_jobs: {
        Args: { p_qty: number; p_visibility_seconds: number };
        Returns: {
          msg_id: number;
          read_ct: number;
          scan_id: string;
        }[];
      };
      scan_diff: {
        Args: { p_scan_id: string };
        Returns: {
          change: string;
          file_path: string;
          finding_id: string;
          fingerprint: string;
          line_start: number;
          rule_id: string;
          severity: string;
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

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "lego">];

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
