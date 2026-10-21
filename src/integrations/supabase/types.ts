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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor: string | null
          actor_email: string | null
          at: string
          details: Json | null
          id: number
          reservation_id: string | null
          table_id: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_email?: string | null
          at?: string
          details?: Json | null
          id?: never
          reservation_id?: string | null
          table_id?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_email?: string | null
          at?: string
          details?: Json | null
          id?: never
          reservation_id?: string | null
          table_id?: string | null
        }
        Relationships: []
      }
      availability_pulse: {
        Row: {
          bumped_at: string
          id: number
        }
        Insert: {
          bumped_at?: string
          id?: number
        }
        Update: {
          bumped_at?: string
          id?: number
        }
        Relationships: []
      }
      closures: {
        Row: {
          closed_on: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          closed_on: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          closed_on?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      dining_tables: {
        Row: {
          active: boolean
          area: string
          capacity: number
          id: string
          label: string
          min_party: number
          pos_x: number
          pos_y: number
          shape: string
          sort: number
          status: Database["public"]["Enums"]["table_status"]
          status_changed_at: string
        }
        Insert: {
          active?: boolean
          area?: string
          capacity: number
          id?: string
          label: string
          min_party?: number
          pos_x?: number
          pos_y?: number
          shape?: string
          sort?: number
          status?: Database["public"]["Enums"]["table_status"]
          status_changed_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          capacity?: number
          id?: string
          label?: string
          min_party?: number
          pos_x?: number
          pos_y?: number
          shape?: string
          sort?: number
          status?: Database["public"]["Enums"]["table_status"]
          status_changed_at?: string
        }
        Relationships: []
      }
      reservation_tables: {
        Row: {
          active: boolean
          block: unknown
          reservation_id: string
          table_id: string
        }
        Insert: {
          active?: boolean
          block: unknown
          reservation_id: string
          table_id: string
        }
        Update: {
          active?: boolean
          block?: unknown
          reservation_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_tables_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dining_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          departed_at: string | null
          email: string | null
          ends_at: string
          guest_name: string | null
          hold_expires_at: string | null
          id: string
          idempotency_key: string | null
          manage_token: string
          notes: string | null
          party_size: number
          phone: string | null
          ref: string
          seated_at: string | null
          source: string
          staff_notes: string | null
          starts_at: string
          status: Database["public"]["Enums"]["res_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          departed_at?: string | null
          email?: string | null
          ends_at: string
          guest_name?: string | null
          hold_expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          manage_token?: string
          notes?: string | null
          party_size: number
          phone?: string | null
          ref?: string
          seated_at?: string | null
          source?: string
          staff_notes?: string | null
          starts_at: string
          status: Database["public"]["Enums"]["res_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          departed_at?: string | null
          email?: string | null
          ends_at?: string
          guest_name?: string | null
          hold_expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          manage_token?: string
          notes?: string | null
          party_size?: number
          phone?: string | null
          ref?: string
          seated_at?: string | null
          source?: string
          staff_notes?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["res_status"]
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_settings: {
        Row: {
          address: string | null
          advance_days: number
          allow_table_choice: boolean
          arrival_policy: string
          buffer_min: number
          cancellation_policy: string
          close_time: string
          default_country_code: string
          dining_min: number
          email: string | null
          grace_min: number
          hold_min: number
          id: number
          is_demo: boolean
          location_name: string
          logo_url: string | null
          map_url: string | null
          name: string
          open_time: string
          phone: string | null
          slot_interval_min: number
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          advance_days?: number
          allow_table_choice?: boolean
          arrival_policy?: string
          buffer_min?: number
          cancellation_policy?: string
          close_time?: string
          default_country_code?: string
          dining_min?: number
          email?: string | null
          grace_min?: number
          hold_min?: number
          id?: number
          is_demo?: boolean
          location_name?: string
          logo_url?: string | null
          map_url?: string | null
          name?: string
          open_time?: string
          phone?: string | null
          slot_interval_min?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          advance_days?: number
          allow_table_choice?: boolean
          arrival_policy?: string
          buffer_min?: number
          cancellation_policy?: string
          close_time?: string
          default_country_code?: string
          dining_min?: number
          email?: string | null
          grace_min?: number
          hold_min?: number
          id?: number
          is_demo?: boolean
          location_name?: string
          logo_url?: string | null
          map_url?: string | null
          name?: string
          open_time?: string
          phone?: string | null
          slot_interval_min?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      table_combos: {
        Row: {
          capacity: number
          id: string
          min_party: number
          name: string
          table_ids: string[]
        }
        Insert: {
          capacity: number
          id?: string
          min_party?: number
          name: string
          table_ids: string[]
        }
        Update: {
          capacity?: number
          id?: string
          min_party?: number
          name?: string
          table_ids?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          desired_date: string
          earliest: string
          email: string | null
          guest_name: string
          id: string
          latest: string
          notes: string | null
          offered_until: string | null
          party_size: number
          phone: string
          status: string
        }
        Insert: {
          created_at?: string
          desired_date: string
          earliest: string
          email?: string | null
          guest_name: string
          id?: string
          latest: string
          notes?: string | null
          offered_until?: string | null
          party_size: number
          phone: string
          status?: string
        }
        Update: {
          created_at?: string
          desired_date?: string
          earliest?: string
          email?: string | null
          guest_name?: string
          id?: string
          latest?: string
          notes?: string | null
          offered_until?: string | null
          party_size?: number
          phone?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _alternatives: { Args: { _party: number; _s: string }; Returns: Json }
      _audit: {
        Args: { _action: string; _details: Json; _res: string; _table: string }
        Returns: undefined
      }
      _booking_json: { Args: { _id: string }; Returns: Json }
      _count_free: {
        Args: { _ignore_holds: boolean; _party: number; _s: string }
        Returns: number
      }
      _find_option: {
        Args: {
          _exclude: string
          _ignore_holds: boolean
          _party: number
          _pref: string
          _s: string
        }
        Returns: string[]
      }
      _release_expired: { Args: never; Returns: undefined }
      _require_staff: { Args: never; Returns: undefined }
      _service_bounds: {
        Args: { _d: string }
        Returns: {
          close_at: string
          last_start: string
          open_at: string
        }[]
      }
      _slot_reason: { Args: { _s: string }; Returns: string }
      _table_free: {
        Args: {
          _e: string
          _exclude: string
          _ignore_holds: boolean
          _s: string
          _table: string
        }
        Returns: boolean
      }
      admin_grant_staff: {
        Args: {
          _email: string
          _role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      admin_revoke_staff: { Args: { _role_id: string }; Returns: Json }
      cancel_booking: { Args: { _token: string }; Returns: Json }
      confirm_booking: {
        Args: {
          _email?: string
          _name: string
          _notes?: string
          _phone: string
          _token: string
        }
        Returns: Json
      }
      create_hold: {
        Args: {
          _idem?: string
          _party: number
          _start: string
          _table?: string
        }
        Returns: Json
      }
      get_booking: { Args: { _token: string }; Returns: Json }
      get_public_tables: {
        Args: { _party?: number; _start?: string }
        Returns: {
          area: string
          capacity: number
          fits: boolean
          free_for_visit: boolean
          held: boolean
          id: string
          label: string
          min_party: number
          next_reserved_at: string
          pos_x: number
          pos_y: number
          shape: string
          status: Database["public"]["Enums"]["table_status"]
          status_changed_at: string
        }[]
      }
      get_slots: {
        Args: { _date: string; _party: number }
        Returns: {
          free_count: number
          slot_start: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      join_waitlist: {
        Args: {
          _date: string
          _email: string
          _from: string
          _name: string
          _party: number
          _phone: string
          _to: string
        }
        Returns: Json
      }
      reschedule_booking: {
        Args: { _party: number; _start: string; _token: string }
        Returns: Json
      }
      staff_create_reservation: {
        Args: {
          _name: string
          _notes?: string
          _party: number
          _phone: string
          _source?: string
          _start: string
          _table?: string
        }
        Returns: Json
      }
      staff_move_reservation: {
        Args: { _id: string; _party: number; _start: string; _table?: string }
        Returns: Json
      }
      staff_set_table_status: {
        Args: {
          _status: Database["public"]["Enums"]["table_status"]
          _table: string
        }
        Returns: Json
      }
      staff_update_reservation: {
        Args: { _action: string; _id: string; _table?: string }
        Returns: Json
      }
      staff_walk_in: {
        Args: { _name?: string; _party: number; _table?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      res_status:
        | "held"
        | "confirmed"
        | "arrived"
        | "seated"
        | "completed"
        | "cancelled"
        | "no_show"
        | "expired"
      table_status: "empty" | "occupied" | "cleaning" | "unavailable"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
      res_status: [
        "held",
        "confirmed",
        "arrived",
        "seated",
        "completed",
        "cancelled",
        "no_show",
        "expired",
      ],
      table_status: ["empty", "occupied", "cleaning", "unavailable"],
    },
  },
} as const
