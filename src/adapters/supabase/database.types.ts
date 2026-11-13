export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          bonus_goal: number;
          id: number;
        };
        ComputedFields: never;
        Insert: {
          bonus_goal?: number;
          id?: number;
        };
        Update: {
          bonus_goal?: number;
          id?: number;
        };
        Relationships: [];
      };
      copy: {
        Row: {
          agreed_price: number | null;
          colportor_price_snapshot: number;
          created_at: string;
          customer_id: string | null;
          deleted_at: string | null;
          id: string;
          number: number;
          owner_id: string;
          public_price_snapshot: number | null;
          received_at: string;
          sold_at: string | null;
          status: Database['public']['Enums']['copy_status'];
          title_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agreed_price?: number | null;
          colportor_price_snapshot: number;
          created_at?: string;
          customer_id?: string | null;
          deleted_at?: string | null;
          id: string;
          number: number;
          owner_id?: string;
          public_price_snapshot?: number | null;
          received_at?: string;
          sold_at?: string | null;
          status?: Database['public']['Enums']['copy_status'];
          title_id: string;
          updated_at?: string;
        };
        Update: {
          agreed_price?: number | null;
          colportor_price_snapshot?: number;
          created_at?: string;
          customer_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          number?: number;
          owner_id?: string;
          public_price_snapshot?: number | null;
          received_at?: string;
          sold_at?: string | null;
          status?: Database['public']['Enums']['copy_status'];
          title_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'copy_customer_same_owner';
            columns: ['customer_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'customer';
            referencedColumns: ['id', 'owner_id'];
          },
          {
            foreignKeyName: 'copy_title_id_fkey';
            columns: ['title_id'];
            isOneToOne: false;
            referencedRelation: 'title';
            referencedColumns: ['id'];
          },
        ];
      };
      copy_counter: {
        Row: {
          last_number: number;
          owner_id: string;
          title_id: string;
        };
        ComputedFields: never;
        Insert: {
          last_number?: number;
          owner_id: string;
          title_id: string;
        };
        Update: {
          last_number?: number;
          owner_id?: string;
          title_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'copy_counter_title_id_fkey';
            columns: ['title_id'];
            isOneToOne: false;
            referencedRelation: 'title';
            referencedColumns: ['id'];
          },
        ];
      };
      copy_event: {
        Row: {
          at: string;
          copy_id: string;
          data: NonNullable<Json>;
          id: string;
          note: string | null;
          owner_id: string;
          seq: number;
          type: Database['public']['Enums']['copy_event_type'];
        };
        ComputedFields: never;
        Insert: {
          at?: string;
          copy_id: string;
          data?: NonNullable<Json>;
          id?: string;
          note?: string | null;
          owner_id: string;
          seq?: never;
          type: Database['public']['Enums']['copy_event_type'];
        };
        Update: {
          at?: string;
          copy_id?: string;
          data?: NonNullable<Json>;
          id?: string;
          note?: string | null;
          owner_id?: string;
          seq?: never;
          type?: Database['public']['Enums']['copy_event_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'copy_event_copy_same_owner';
            columns: ['copy_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'copy';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      copy_issue: {
        Row: {
          copy_id: string;
          created_at: string;
          id: string;
          note: string;
          owner_id: string;
          resolution: Database['public']['Enums']['issue_resolution'] | null;
          resolution_note: string | null;
          resolved_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          copy_id: string;
          created_at?: string;
          id: string;
          note: string;
          owner_id?: string;
          resolution?: Database['public']['Enums']['issue_resolution'] | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Update: {
          copy_id?: string;
          created_at?: string;
          id?: string;
          note?: string;
          owner_id?: string;
          resolution?: Database['public']['Enums']['issue_resolution'] | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'copy_issue_copy_same_owner';
            columns: ['copy_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'copy';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      customer: {
        Row: {
          address: string | null;
          archived_at: string | null;
          avatar_emoji: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          info: string | null;
          latitude: number | null;
          location_accuracy_m: number | null;
          longitude: number | null;
          maps_url: string | null;
          name: string;
          owner_id: string;
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          archived_at?: string | null;
          avatar_emoji?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id: string;
          info?: string | null;
          latitude?: number | null;
          location_accuracy_m?: number | null;
          longitude?: number | null;
          maps_url?: string | null;
          name: string;
          owner_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          archived_at?: string | null;
          avatar_emoji?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          info?: string | null;
          latitude?: number | null;
          location_accuracy_m?: number | null;
          longitude?: number | null;
          maps_url?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      leader_deposit: {
        Row: {
          cash_amount: number;
          confirmed_at: string | null;
          created_at: string;
          deleted_at: string | null;
          deposit_date: string;
          deposit_number: number | null;
          id: string;
          note: string | null;
          owner_id: string;
          status: Database['public']['Enums']['deposit_status'];
          title: string | null;
          transfer_amount: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cash_amount?: number;
          confirmed_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          deposit_date?: string;
          deposit_number?: number | null;
          id: string;
          note?: string | null;
          owner_id?: string;
          status?: Database['public']['Enums']['deposit_status'];
          title?: string | null;
          transfer_amount?: number;
          updated_at?: string;
        };
        Update: {
          cash_amount?: number;
          confirmed_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          deposit_date?: string;
          deposit_number?: number | null;
          id?: string;
          note?: string | null;
          owner_id?: string;
          status?: Database['public']['Enums']['deposit_status'];
          title?: string | null;
          transfer_amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      leader_deposit_counter: {
        Row: {
          last_number: number;
          owner_id: string;
        };
        ComputedFields: never;
        Insert: {
          last_number?: number;
          owner_id: string;
        };
        Update: {
          last_number?: number;
          owner_id?: string;
        };
        Relationships: [];
      };
      leader_deposit_event: {
        Row: {
          at: string;
          id: string;
          leader_deposit_id: string;
          owner_id: string;
          reason: string | null;
          seq: number;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          at?: string;
          id?: string;
          leader_deposit_id: string;
          owner_id: string;
          reason?: string | null;
          seq?: never;
          type: string;
        };
        Update: {
          at?: string;
          id?: string;
          leader_deposit_id?: string;
          owner_id?: string;
          reason?: string | null;
          seq?: never;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leader_deposit_event_deposit_same_owner';
            columns: ['leader_deposit_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'leader_deposit';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      payment: {
        Row: {
          agreed_amount: number | null;
          cancel_reason: Database['public']['Enums']['cancel_reason'] | null;
          canceled_at: string | null;
          created_at: string;
          customer_id: string;
          deleted_at: string | null;
          due_date: string | null;
          id: string;
          kind: Database['public']['Enums']['payment_kind'];
          leader_deposit_id: string | null;
          method: Database['public']['Enums']['pay_method'] | null;
          original_due_date: string | null;
          owner_id: string;
          paid_amount: number | null;
          paid_at: string | null;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          agreed_amount?: number | null;
          cancel_reason?: Database['public']['Enums']['cancel_reason'] | null;
          canceled_at?: string | null;
          created_at?: string;
          customer_id: string;
          deleted_at?: string | null;
          due_date?: string | null;
          id: string;
          kind: Database['public']['Enums']['payment_kind'];
          leader_deposit_id?: string | null;
          method?: Database['public']['Enums']['pay_method'] | null;
          original_due_date?: string | null;
          owner_id?: string;
          paid_amount?: number | null;
          paid_at?: string | null;
          status: Database['public']['Enums']['payment_status'];
          updated_at?: string;
        };
        Update: {
          agreed_amount?: number | null;
          cancel_reason?: Database['public']['Enums']['cancel_reason'] | null;
          canceled_at?: string | null;
          created_at?: string;
          customer_id?: string;
          deleted_at?: string | null;
          due_date?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['payment_kind'];
          leader_deposit_id?: string | null;
          method?: Database['public']['Enums']['pay_method'] | null;
          original_due_date?: string | null;
          owner_id?: string;
          paid_amount?: number | null;
          paid_at?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_customer_same_owner';
            columns: ['customer_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'customer';
            referencedColumns: ['id', 'owner_id'];
          },
          {
            foreignKeyName: 'payment_deposit_same_owner';
            columns: ['leader_deposit_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'leader_deposit';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      payment_event: {
        Row: {
          at: string;
          data: NonNullable<Json>;
          id: string;
          owner_id: string;
          payment_id: string;
          seq: number;
          type: Database['public']['Enums']['payment_event_type'];
        };
        ComputedFields: never;
        Insert: {
          at?: string;
          data?: NonNullable<Json>;
          id?: string;
          owner_id: string;
          payment_id: string;
          seq?: never;
          type: Database['public']['Enums']['payment_event_type'];
        };
        Update: {
          at?: string;
          data?: NonNullable<Json>;
          id?: string;
          owner_id?: string;
          payment_id?: string;
          seq?: never;
          type?: Database['public']['Enums']['payment_event_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'payment_event_payment_same_owner';
            columns: ['payment_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'payment';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      payment_reschedule: {
        Row: {
          changed_at: string;
          id: string;
          new_due_date: string;
          note: string | null;
          owner_id: string;
          payment_id: string;
          previous_due_date: string;
          seq: number;
        };
        ComputedFields: never;
        Insert: {
          changed_at?: string;
          id?: string;
          new_due_date: string;
          note?: string | null;
          owner_id: string;
          payment_id: string;
          previous_due_date: string;
          seq?: never;
        };
        Update: {
          changed_at?: string;
          id?: string;
          new_due_date?: string;
          note?: string | null;
          owner_id?: string;
          payment_id?: string;
          previous_due_date?: string;
          seq?: never;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_reschedule_payment_same_owner';
            columns: ['payment_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'payment';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      photo: {
        Row: {
          bytes: number;
          created_at: string;
          deleted_at: string | null;
          id: string;
          kind: Database['public']['Enums']['photo_kind'];
          leader_deposit_id: string | null;
          owner_id: string;
          path: string;
          thumb_path: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          bytes: number;
          created_at?: string;
          deleted_at?: string | null;
          id: string;
          kind: Database['public']['Enums']['photo_kind'];
          leader_deposit_id?: string | null;
          owner_id?: string;
          path: string;
          thumb_path?: string | null;
          updated_at?: string;
        };
        Update: {
          bytes?: number;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['photo_kind'];
          leader_deposit_id?: string | null;
          owner_id?: string;
          path?: string;
          thumb_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'photo_deposit_same_owner';
            columns: ['leader_deposit_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'leader_deposit';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      profile: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          time_format: Database['public']['Enums']['time_format'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id: string;
          is_active?: boolean;
          time_format?: Database['public']['Enums']['time_format'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          time_format?: Database['public']['Enums']['time_format'];
          updated_at?: string;
        };
        Relationships: [];
      };
      title: {
        Row: {
          author: string | null;
          category: Database['public']['Enums']['title_category'];
          colportor_price: number;
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          name: string;
          public_price: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author?: string | null;
          category: Database['public']['Enums']['title_category'];
          colportor_price: number;
          created_at?: string;
          description?: string | null;
          id: string;
          image_path?: string | null;
          is_active?: boolean;
          name: string;
          public_price?: number | null;
          updated_at?: string;
        };
        Update: {
          author?: string | null;
          category?: Database['public']['Enums']['title_category'];
          colportor_price?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name?: string;
          public_price?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_role: {
        Row: {
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Update: {
          role?: Database['public']['Enums']['app_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_role_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_copies: {
        Args: { p_batch_id: string; p_lines: Json; p_received_at: string };
        Returns: {
          copy_id: string;
          number: number;
          title_id: string;
        }[];
      };
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      next_copy_number: { Args: { p_owner: string; p_title: string }; Returns: number };
      next_deposit_number: { Args: { p_owner: string }; Returns: number };
      photo_total_bytes: { Args: Record<PropertyKey, never>; Returns: number };
      resolve_schedule_excess: {
        Args: { p_choice: Json; p_customer_id: string; p_trigger: string };
        Returns: undefined;
      };
      today_bogota: { Args: Record<PropertyKey, never>; Returns: string };
    };
    Enums: {
      app_role: 'colportor' | 'admin' | 'leader';
      cancel_reason: 'book_returned' | 'overpaid' | 'manual' | 'customer_archived';
      copy_event_type:
        | 'received'
        | 'sold'
        | 'returned'
        | 'flagged'
        | 'resolved'
        | 'undo_resolved'
        | 'deleted'
        | 'undo_deleted'
        | 'price_changed'
        | 'received_date_changed'
        | 'minibook_sold'
        | 'returned_to_leader'
        | 'undo_returned_to_leader';
      copy_status: 'in_stock' | 'sold' | 'flagged' | 'lost' | 'returned_to_leader';
      deposit_status: 'draft' | 'confirmed';
      issue_resolution: 'found' | 'lost' | 'removed';
      pay_method: 'cash' | 'transfer';
      payment_event_type: 'amount_reduced' | 'canceled' | 'reopened';
      payment_kind: 'down_payment' | 'scheduled' | 'extra';
      payment_status: 'scheduled' | 'collected' | 'delivered' | 'canceled';
      photo_kind: 'customer_info' | 'customer_invoice' | 'deposit_receipt';
      time_format: '12h' | '24h';
      title_category: 'cultural' | 'religious' | 'minibook';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ['colportor', 'admin', 'leader'],
      cancel_reason: ['book_returned', 'overpaid', 'manual', 'customer_archived'],
      copy_event_type: [
        'received',
        'sold',
        'returned',
        'flagged',
        'resolved',
        'undo_resolved',
        'deleted',
        'undo_deleted',
        'price_changed',
        'received_date_changed',
        'minibook_sold',
        'returned_to_leader',
        'undo_returned_to_leader',
      ],
      copy_status: ['in_stock', 'sold', 'flagged', 'lost', 'returned_to_leader'],
      deposit_status: ['draft', 'confirmed'],
      issue_resolution: ['found', 'lost', 'removed'],
      pay_method: ['cash', 'transfer'],
      payment_event_type: ['amount_reduced', 'canceled', 'reopened'],
      payment_kind: ['down_payment', 'scheduled', 'extra'],
      payment_status: ['scheduled', 'collected', 'delivered', 'canceled'],
      photo_kind: ['customer_info', 'customer_invoice', 'deposit_receipt'],
      time_format: ['12h', '24h'],
      title_category: ['cultural', 'religious', 'minibook'],
    },
  },
} as const;
