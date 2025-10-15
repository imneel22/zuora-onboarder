export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string
          after_json: Json | null
          before_json: Json | null
          created_at: string
          customer_id: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          customer_id: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          customer_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_field_config: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          field_label: string
          field_name: string
          field_type: string
          id: string
          include_in_llm: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          include_in_llm?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          include_in_llm?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_field_config_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          assigned_user_ids: string[]
          created_at: string
          go_live_target_date: string | null
          id: string
          industry: string | null
          name: string
          phase: string
          status: string
          updated_at: string
          zuora_account_id: string
        }
        Insert: {
          assigned_user_ids?: string[]
          created_at?: string
          go_live_target_date?: string | null
          id?: string
          industry?: string | null
          name: string
          phase?: string
          status?: string
          updated_at?: string
          zuora_account_id: string
        }
        Update: {
          assigned_user_ids?: string[]
          created_at?: string
          go_live_target_date?: string | null
          id?: string
          industry?: string | null
          name?: string
          phase?: string
          status?: string
          updated_at?: string
          zuora_account_id?: string
        }
        Relationships: []
      }
      product_category_catalog: {
        Row: {
          active: boolean
          category_name: string
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          pob_name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          active?: boolean
          category_name: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          pob_name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          active?: boolean
          category_name?: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          pob_name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_category_catalog_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prpc_inferences: {
        Row: {
          charge_name: string
          confidence: number | null
          conflict_flags: string[] | null
          created_at: string
          customer_id: string
          evidence_refs: Json | null
          explanation_vector: Json | null
          id: string
          inferred_pob: string | null
          inferred_product_category: string | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          needs_review: boolean | null
          product_name: string
          prpc_id: string
          rate_plan_name: string
          rationale: string | null
          source_agent: string | null
          status: string
          updated_at: string
        }
        Insert: {
          charge_name: string
          confidence?: number | null
          conflict_flags?: string[] | null
          created_at?: string
          customer_id: string
          evidence_refs?: Json | null
          explanation_vector?: Json | null
          id?: string
          inferred_pob?: string | null
          inferred_product_category?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          needs_review?: boolean | null
          product_name: string
          prpc_id: string
          rate_plan_name: string
          rationale?: string | null
          source_agent?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          charge_name?: string
          confidence?: number | null
          conflict_flags?: string[] | null
          created_at?: string
          customer_id?: string
          evidence_refs?: Json | null
          explanation_vector?: Json | null
          id?: string
          inferred_pob?: string | null
          inferred_product_category?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          needs_review?: boolean | null
          product_name?: string
          prpc_id?: string
          rate_plan_name?: string
          rationale?: string | null
          source_agent?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prpc_inferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prpc_inferences_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_runs: {
        Row: {
          created_at: string
          customer_id: string
          delta_summary: Json | null
          finished_at: string | null
          id: string
          mismatch_counts: Json | null
          sample_links: Json | null
          scope: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delta_summary?: Json | null
          finished_at?: string | null
          id?: string
          mismatch_counts?: Json | null
          sample_links?: Json | null
          scope: string
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delta_summary?: Json | null
          finished_at?: string | null
          id?: string
          mismatch_counts?: Json | null
          sample_links?: Json | null
          scope?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_runs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_coverage_candidates: {
        Row: {
          confidence: number | null
          covers_attributes: string[]
          covers_product_categories: string[]
          created_at: string
          customer_id: string
          id: string
          is_in_minimal_set: boolean
          rationale: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          covers_attributes?: string[]
          covers_product_categories?: string[]
          created_at?: string
          customer_id: string
          id?: string
          is_in_minimal_set?: boolean
          rationale?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          covers_attributes?: string[]
          covers_product_categories?: string[]
          created_at?: string
          customer_id?: string
          id?: string
          is_in_minimal_set?: boolean
          rationale?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_coverage_candidates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_coverage_candidates_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          audited: boolean
          audited_at: string | null
          audited_by: string | null
          billing_period: string
          confidence: number | null
          conflict_flags: string[] | null
          created_at: string
          currency: string
          customer_id: string
          derivation_trace: Json | null
          end_date: string | null
          evergreen: boolean
          has_cancellation: boolean
          has_discounts: boolean
          has_ramps: boolean
          id: string
          sot_snapshot_hash: string | null
          start_date: string
          status: string
          subscription_id: string
          termed: boolean
          updated_at: string
        }
        Insert: {
          audited?: boolean
          audited_at?: string | null
          audited_by?: string | null
          billing_period: string
          confidence?: number | null
          conflict_flags?: string[] | null
          created_at?: string
          currency?: string
          customer_id: string
          derivation_trace?: Json | null
          end_date?: string | null
          evergreen?: boolean
          has_cancellation?: boolean
          has_discounts?: boolean
          has_ramps?: boolean
          id?: string
          sot_snapshot_hash?: string | null
          start_date: string
          status?: string
          subscription_id: string
          termed?: boolean
          updated_at?: string
        }
        Update: {
          audited?: boolean
          audited_at?: string | null
          audited_by?: string | null
          billing_period?: string
          confidence?: number | null
          conflict_flags?: string[] | null
          created_at?: string
          currency?: string
          customer_id?: string
          derivation_trace?: Json | null
          end_date?: string | null
          evergreen?: boolean
          has_cancellation?: boolean
          has_discounts?: boolean
          has_ramps?: boolean
          id?: string
          sot_snapshot_hash?: string | null
          start_date?: string
          status?: string
          subscription_id?: string
          termed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      use_cases: {
        Row: {
          category: string
          comments: string | null
          created_at: string
          customer_id: string
          description: string | null
          has_waterfall: boolean
          id: string
          metadata: Json | null
          scenarios: number | null
          status: string
          timing: string | null
          triggering: string | null
          updated_at: string
          use_case_name: string
          waterfall_file_name: string | null
          waterfall_file_url: string | null
        }
        Insert: {
          category: string
          comments?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          has_waterfall?: boolean
          id?: string
          metadata?: Json | null
          scenarios?: number | null
          status?: string
          timing?: string | null
          triggering?: string | null
          updated_at?: string
          use_case_name: string
          waterfall_file_name?: string | null
          waterfall_file_url?: string | null
        }
        Update: {
          category?: string
          comments?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          has_waterfall?: boolean
          id?: string
          metadata?: Json | null
          scenarios?: number | null
          status?: string
          timing?: string | null
          triggering?: string | null
          updated_at?: string
          use_case_name?: string
          waterfall_file_name?: string | null
          waterfall_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "use_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_category_stats: {
        Args: { p_customer_id: string }
        Returns: {
          approval_rate: number
          avg_confidence: number
          category: string
          high_confidence_count: number
          low_confidence_count: number
          medium_confidence_count: number
          needs_review_count: number
          prpc_count: number
          subscription_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "standard"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "standard"],
    },
  },
} as const
