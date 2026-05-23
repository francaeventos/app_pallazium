export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      checklist_items: {
        Row: {
          attachment_url: string | null;
          client_notes: string | null;
          created_at: string;
          description: string | null;
          due_date: string | null;
          event_id: string;
          id: string;
          internal_notes: string | null;
          priority: Database["public"]["Enums"]["priority_level"];
          sort_order: number;
          status: Database["public"]["Enums"]["checklist_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          attachment_url?: string | null;
          client_notes?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          event_id: string;
          id?: string;
          internal_notes?: string | null;
          priority?: Database["public"]["Enums"]["priority_level"];
          sort_order?: number;
          status?: Database["public"]["Enums"]["checklist_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          attachment_url?: string | null;
          client_notes?: string | null;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          event_id?: string;
          id?: string;
          internal_notes?: string | null;
          priority?: Database["public"]["Enums"]["priority_level"];
          sort_order?: number;
          status?: Database["public"]["Enums"]["checklist_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          created_at: string;
          document: string | null;
          email: string;
          full_name: string;
          id: string;
          notes: string | null;
          phone: string | null;
          status: Database["public"]["Enums"]["client_status"];
          updated_at: string;
          user_id: string | null;
          whatsapp: string | null;
        };
        Insert: {
          created_at?: string;
          document?: string | null;
          email: string;
          full_name: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
          user_id?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          created_at?: string;
          document?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
          user_id?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      event_references: {
        Row: {
          category: string;
          created_at: string;
          event_id: string;
          id: string;
          image_url: string | null;
          inspiration_link: string | null;
          notes: string | null;
          title: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          event_id: string;
          id?: string;
          image_url?: string | null;
          inspiration_link?: string | null;
          notes?: string | null;
          title: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          image_url?: string | null;
          inspiration_link?: string | null;
          notes?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_references_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          client_id: string;
          client_notes: string | null;
          contracted_value: number | null;
          created_at: string;
          end_time: string | null;
          estimated_guests: number | null;
          event_date: string | null;
          event_type: string;
          financial_status: string | null;
          id: string;
          internal_notes: string | null;
          location: string | null;
          start_time: string | null;
          status: Database["public"]["Enums"]["event_status"];
          updated_at: string;
        };
        Insert: {
          client_id: string;
          client_notes?: string | null;
          contracted_value?: number | null;
          created_at?: string;
          end_time?: string | null;
          estimated_guests?: number | null;
          event_date?: string | null;
          event_type: string;
          financial_status?: string | null;
          id?: string;
          internal_notes?: string | null;
          location?: string | null;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          client_notes?: string | null;
          contracted_value?: number | null;
          created_at?: string;
          end_time?: string | null;
          estimated_guests?: number | null;
          event_date?: string | null;
          event_type?: string;
          financial_status?: string | null;
          id?: string;
          internal_notes?: string | null;
          location?: string | null;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      event_guests: {
        Row: {
          allowed_companions: number;
          confirmed_companions: number;
          created_at: string;
          dietary_restrictions: string | null;
          email: string | null;
          event_id: string;
          group_name: string | null;
          id: string;
          invitation_id: string | null;
          name: string;
          notes: string | null;
          phone: string | null;
          public_token: string;
          responded_at: string | null;
          rsvp_status: Database["public"]["Enums"]["rsvp_status"];
          updated_at: string;
        };
        Insert: {
          allowed_companions?: number;
          confirmed_companions?: number;
          created_at?: string;
          dietary_restrictions?: string | null;
          email?: string | null;
          event_id: string;
          group_name?: string | null;
          id?: string;
          invitation_id?: string | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          public_token?: string;
          responded_at?: string | null;
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"];
          updated_at?: string;
        };
        Update: {
          allowed_companions?: number;
          confirmed_companions?: number;
          created_at?: string;
          dietary_restrictions?: string | null;
          email?: string | null;
          event_id?: string;
          group_name?: string | null;
          id?: string;
          invitation_id?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          public_token?: string;
          responded_at?: string | null;
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_guests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_guests_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "event_invitations";
            referencedColumns: ["id"];
          },
        ];
      };
      event_invitations: {
        Row: {
          ceremony_location: string | null;
          cover_image_url: string | null;
          created_at: string;
          dress_code: string | null;
          event_id: string;
          id: string;
          map_url: string | null;
          message: string | null;
          public_token: string;
          published_at: string | null;
          reception_location: string | null;
          status: Database["public"]["Enums"]["invitation_status"];
          title: string;
          updated_at: string;
          whatsapp_text: string | null;
        };
        Insert: {
          ceremony_location?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          dress_code?: string | null;
          event_id: string;
          id?: string;
          map_url?: string | null;
          message?: string | null;
          public_token?: string;
          published_at?: string | null;
          reception_location?: string | null;
          status?: Database["public"]["Enums"]["invitation_status"];
          title: string;
          updated_at?: string;
          whatsapp_text?: string | null;
        };
        Update: {
          ceremony_location?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          dress_code?: string | null;
          event_id?: string;
          id?: string;
          map_url?: string | null;
          message?: string | null;
          public_token?: string;
          published_at?: string | null;
          reception_location?: string | null;
          status?: Database["public"]["Enums"]["invitation_status"];
          title?: string;
          updated_at?: string;
          whatsapp_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_party_members: {
        Row: {
          attire: string | null;
          created_at: string;
          email: string | null;
          event_id: string;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          role: string;
          rsvp_status: Database["public"]["Enums"]["rsvp_status"];
          side: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          attire?: string | null;
          created_at?: string;
          email?: string | null;
          event_id: string;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          role: string;
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"];
          side?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          attire?: string | null;
          created_at?: string;
          email?: string | null;
          event_id?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          role?: string;
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"];
          side?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_party_members_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      menus: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          items: string | null;
          name: string;
          notes: string | null;
        };
        Insert: {
          active?: boolean;
          category: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          items?: string | null;
          name: string;
          notes?: string | null;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          items?: string | null;
          name?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      menu_interests: {
        Row: {
          client_id: string;
          created_at: string;
          event_id: string;
          id: string;
          menu_id: string;
          notes: string | null;
          status: Database["public"]["Enums"]["interest_status"];
        };
        Insert: {
          client_id: string;
          created_at?: string;
          event_id: string;
          id?: string;
          menu_id: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["interest_status"];
        };
        Update: {
          client_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          menu_id?: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["interest_status"];
        };
        Relationships: [
          {
            foreignKeyName: "menu_interests_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_interests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_interests_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string | null;
          read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message?: string | null;
          read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string | null;
          read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      partners: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          instagram: string | null;
          name: string;
          phone: string | null;
          whatsapp: string | null;
        };
        Insert: {
          active?: boolean;
          category: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          instagram?: string | null;
          name: string;
          phone?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          instagram?: string | null;
          name?: string;
          phone?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      portfolio_items: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          description: string | null;
          event_name: string;
          event_type: string;
          highlights: string | null;
          id: string;
          images: string[] | null;
        };
        Insert: {
          active?: boolean;
          category: string;
          created_at?: string;
          description?: string | null;
          event_name: string;
          event_type: string;
          highlights?: string | null;
          id?: string;
          images?: string[] | null;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string | null;
          event_name?: string;
          event_type?: string;
          highlights?: string | null;
          id?: string;
          images?: string[] | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          document: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          created_at?: string;
          document?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          created_at?: string;
          document?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      tips: {
        Row: {
          active: boolean;
          category: string;
          content: string;
          created_at: string;
          id: string;
          image_url: string | null;
          title: string;
        };
        Insert: {
          active?: boolean;
          category: string;
          content: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          title: string;
        };
        Update: {
          active?: boolean;
          category?: string;
          content?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      upgrade_interests: {
        Row: {
          client_id: string;
          created_at: string;
          event_id: string;
          id: string;
          notes: string | null;
          status: Database["public"]["Enums"]["interest_status"];
          upgrade_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          event_id: string;
          id?: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["interest_status"];
          upgrade_id: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["interest_status"];
          upgrade_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "upgrade_interests_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "upgrade_interests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "upgrade_interests_upgrade_id_fkey";
            columns: ["upgrade_id"];
            isOneToOne: false;
            referencedRelation: "upgrades";
            referencedColumns: ["id"];
          },
        ];
      };
      upgrades: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          name: string;
          price_text: string | null;
        };
        Insert: {
          active?: boolean;
          category: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          price_text?: string | null;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          price_text?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_invitation_guest_by_token: {
        Args: {
          _guest_token: string;
        };
        Returns: {
          allowed_companions: number;
          ceremony_location: string | null;
          confirmed_companions: number;
          cover_image_url: string | null;
          dietary_restrictions: string | null;
          dress_code: string | null;
          event_date: string | null;
          event_location: string | null;
          event_type: string;
          guest_group_name: string | null;
          guest_id: string;
          guest_name: string;
          invitation_id: string;
          invitation_message: string | null;
          invitation_title: string;
          map_url: string | null;
          reception_location: string | null;
          responded_at: string | null;
          rsvp_status: Database["public"]["Enums"]["rsvp_status"];
          start_time: string | null;
          whatsapp_text: string | null;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      promote_user_to_admin_by_email: {
        Args: {
          _email: string;
        };
        Returns: void;
      };
      respond_invitation_guest: {
        Args: {
          _confirmed_companions?: number;
          _dietary_restrictions?: string | null;
          _guest_token: string;
          _rsvp_status: Database["public"]["Enums"]["rsvp_status"];
        };
        Returns: {
          allowed_companions: number;
          ceremony_location: string | null;
          confirmed_companions: number;
          cover_image_url: string | null;
          dietary_restrictions: string | null;
          dress_code: string | null;
          event_date: string | null;
          event_location: string | null;
          event_type: string;
          guest_group_name: string | null;
          guest_id: string;
          guest_name: string;
          invitation_id: string;
          invitation_message: string | null;
          invitation_title: string;
          map_url: string | null;
          reception_location: string | null;
          responded_at: string | null;
          rsvp_status: Database["public"]["Enums"]["rsvp_status"];
          start_time: string | null;
          whatsapp_text: string | null;
        }[];
      };
    };
    Enums: {
      app_role: "admin" | "client";
      checklist_status: "pendente" | "em_analise" | "concluido";
      client_status: "ativo" | "inativo" | "evento_concluido";
      event_status: "novo" | "em_organizacao" | "proximo" | "concluido" | "cancelado";
      interest_status: "novo" | "em_contato" | "vendido" | "perdido";
      invitation_status: "rascunho" | "publicado" | "pausado";
      priority_level: "baixa" | "media" | "alta";
      rsvp_status: "pendente" | "confirmado" | "recusado";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client"],
      checklist_status: ["pendente", "em_analise", "concluido"],
      client_status: ["ativo", "inativo", "evento_concluido"],
      event_status: ["novo", "em_organizacao", "proximo", "concluido", "cancelado"],
      interest_status: ["novo", "em_contato", "vendido", "perdido"],
      invitation_status: ["rascunho", "publicado", "pausado"],
      priority_level: ["baixa", "media", "alta"],
      rsvp_status: ["pendente", "confirmado", "recusado"],
    },
  },
} as const;
