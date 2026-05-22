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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      call_briefs: {
        Row: {
          account_context: string | null
          call_id: string
          created_at: string
          id: string
          last_touchpoint: string | null
          talking_points: Json
          updated_at: string
        }
        Insert: {
          account_context?: string | null
          call_id: string
          created_at?: string
          id?: string
          last_touchpoint?: string | null
          talking_points?: Json
          updated_at?: string
        }
        Update: {
          account_context?: string | null
          call_id?: string
          created_at?: string
          id?: string
          last_touchpoint?: string | null
          talking_points?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_briefs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_fields: {
        Row: {
          call_id: string
          confidence: Database["public"]["Enums"]["field_confidence"]
          confirmed: boolean
          created_at: string
          edited: boolean
          field_key: string
          id: string
          label: string
          original_value: string
          position: number
          skipped: boolean
          source_quote: string | null
          source_speaker: string | null
          source_ts: string | null
          updated_at: string
          value: string
        }
        Insert: {
          call_id: string
          confidence?: Database["public"]["Enums"]["field_confidence"]
          confirmed?: boolean
          created_at?: string
          edited?: boolean
          field_key: string
          id?: string
          label: string
          original_value: string
          position?: number
          skipped?: boolean
          source_quote?: string | null
          source_speaker?: string | null
          source_ts?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          call_id?: string
          confidence?: Database["public"]["Enums"]["field_confidence"]
          confirmed?: boolean
          created_at?: string
          edited?: boolean
          field_key?: string
          id?: string
          label?: string
          original_value?: string
          position?: number
          skipped?: boolean
          source_quote?: string | null
          source_speaker?: string | null
          source_ts?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_fields_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_id: string
          connection_lost_at: string | null
          created_at: string
          id: string
          platform: string | null
          started_at: string
          status: Database["public"]["Enums"]["call_session_status"]
          updated_at: string
        }
        Insert: {
          call_id: string
          connection_lost_at?: string | null
          created_at?: string
          id?: string
          platform?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_session_status"]
          updated_at?: string
        }
        Update: {
          call_id?: string
          connection_lost_at?: string | null
          created_at?: string
          id?: string
          platform?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_timeline_items: {
        Row: {
          call_id: string
          created_at: string
          description: string | null
          id: string
          item_type: Database["public"]["Enums"]["timeline_item_type"]
          occurred_at: string
          position: number
          title: string
          when_label: string | null
        }
        Insert: {
          call_id: string
          created_at?: string
          description?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["timeline_item_type"]
          occurred_at?: string
          position?: number
          title: string
          when_label?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string
          description?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["timeline_item_type"]
          occurred_at?: string
          position?: number
          title?: string
          when_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_timeline_items_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          amount_cents: number | null
          call_date: string
          company: string
          contact_name: string
          created_at: string
          duration_seconds: number
          email: string | null
          fields_confirmed: number
          fields_skipped: number
          fields_total: number
          id: string
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          owner_id: string | null
          phone: string | null
          slug: string | null
          status: Database["public"]["Enums"]["call_status"]
          summary: string | null
          synced_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          call_date?: string
          company: string
          contact_name: string
          created_at?: string
          duration_seconds?: number
          email?: string | null
          fields_confirmed?: number
          fields_skipped?: number
          fields_total?: number
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          owner_id?: string | null
          phone?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          summary?: string | null
          synced_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          call_date?: string
          company?: string
          contact_name?: string
          created_at?: string
          duration_seconds?: number
          email?: string | null
          fields_confirmed?: number
          fields_skipped?: number
          fields_total?: number
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          owner_id?: string | null
          phone?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          summary?: string | null
          synced_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          account_name: string | null
          amount_cents: number | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          owner_id: string
          phone: string | null
          stage: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          amount_cents?: number | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          owner_id: string
          phone?: string | null
          stage?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          amount_cents?: number | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          owner_id?: string
          phone?: string | null
          stage?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meeting_integrations: {
        Row: {
          connected_at: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          provider: Database["public"]["Enums"]["meeting_provider"]
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: Database["public"]["Enums"]["meeting_provider"]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: Database["public"]["Enums"]["meeting_provider"]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          initials: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          initials: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          initials?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_metrics: {
        Row: {
          calls_reviewed: number
          created_at: string
          id: string
          pct_unedited: number
          period_start: string
          seconds_saved: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_reviewed?: number
          created_at?: string
          id?: string
          pct_unedited?: number
          period_start: string
          seconds_saved?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_reviewed?: number
          created_at?: string
          id?: string
          pct_unedited?: number
          period_start?: string
          seconds_saved?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      call_outcome:
        | "Qualified"
        | "Booked"
        | "No Answer"
        | "Voicemail"
        | "Discovery"
        | "Lost"
      call_session_status: "live" | "dropped" | "ended"
      call_status: "drafted" | "in_review" | "draft_saved" | "synced" | "failed"
      field_confidence: "high" | "med" | "low"
      integration_status: "connected" | "disconnected"
      meeting_provider: "zoom" | "teams" | "google_meet" | "granola" | "otter"
      timeline_item_type: "call" | "email" | "task" | "note"
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
      call_outcome: [
        "Qualified",
        "Booked",
        "No Answer",
        "Voicemail",
        "Discovery",
        "Lost",
      ],
      call_session_status: ["live", "dropped", "ended"],
      call_status: ["drafted", "in_review", "draft_saved", "synced", "failed"],
      field_confidence: ["high", "med", "low"],
      integration_status: ["connected", "disconnected"],
      meeting_provider: ["zoom", "teams", "google_meet", "granola", "otter"],
      timeline_item_type: ["call", "email", "task", "note"],
    },
  },
} as const
