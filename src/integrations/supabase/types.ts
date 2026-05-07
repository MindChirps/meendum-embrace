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
      activity_logs: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          recipient_id: string
          skip_reason: Database["public"]["Enums"]["skip_reason"] | null
          status: Database["public"]["Enums"]["log_status"]
          task_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          recipient_id: string
          skip_reason?: Database["public"]["Enums"]["skip_reason"] | null
          status: Database["public"]["Enums"]["log_status"]
          task_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          recipient_id?: string
          skip_reason?: Database["public"]["Enums"]["skip_reason"] | null
          status?: Database["public"]["Enums"]["log_status"]
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affected_side: Database["public"]["Enums"]["body_side"] | null
          created_at: string
          custom_name: string
          guardian_id: string | null
          id: string
          pairing_code: string | null
          preferred_language: Database["public"]["Enums"]["lang"]
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          affected_side?: Database["public"]["Enums"]["body_side"] | null
          created_at?: string
          custom_name?: string
          guardian_id?: string | null
          id: string
          pairing_code?: string | null
          preferred_language?: Database["public"]["Enums"]["lang"]
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          affected_side?: Database["public"]["Enums"]["body_side"] | null
          created_at?: string
          custom_name?: string
          guardian_id?: string | null
          id?: string
          pairing_code?: string | null
          preferred_language?: Database["public"]["Enums"]["lang"]
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rest_mode: {
        Row: {
          is_resting: boolean
          recipient_id: string
          updated_at: string
        }
        Insert: {
          is_resting?: boolean
          recipient_id: string
          updated_at?: string
        }
        Update: {
          is_resting?: boolean
          recipient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rest_mode_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          is_active: boolean
          name: string
          recipient_id: string
          session_type: Database["public"]["Enums"]["session_type"]
          sort_order: number
          target_reps: number
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          is_active?: boolean
          name: string
          recipient_id: string
          session_type: Database["public"]["Enums"]["session_type"]
          sort_order?: number
          target_reps?: number
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          is_active?: boolean
          name?: string
          recipient_id?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          sort_order?: number
          target_reps?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_guardian_id: { Args: never; Returns: string }
    }
    Enums: {
      body_side: "left" | "right"
      lang: "en" | "ta"
      log_status: "completed" | "skipped"
      session_type: "morning" | "afternoon" | "evening"
      skip_reason: "pain" | "fatigue"
      user_role: "guardian" | "recipient"
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
      body_side: ["left", "right"],
      lang: ["en", "ta"],
      log_status: ["completed", "skipped"],
      session_type: ["morning", "afternoon", "evening"],
      skip_reason: ["pain", "fatigue"],
      user_role: ["guardian", "recipient"],
    },
  },
} as const
