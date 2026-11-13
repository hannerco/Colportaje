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
      photo: {
        Row: {
          bytes: number;
          created_at: string;
          deleted_at: string | null;
          id: string;
          kind: Database['public']['Enums']['photo_kind'];
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
          owner_id?: string;
          path?: string;
          thumb_path?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      next_copy_number: { Args: { p_owner: string; p_title: string }; Returns: number };
      photo_total_bytes: { Args: Record<PropertyKey, never>; Returns: number };
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
      payment_kind: ['down_payment', 'scheduled', 'extra'],
      payment_status: ['scheduled', 'collected', 'delivered', 'canceled'],
      photo_kind: ['customer_info', 'customer_invoice', 'deposit_receipt'],
      time_format: ['12h', '24h'],
      title_category: ['cultural', 'religious', 'minibook'],
    },
  },
} as const;
