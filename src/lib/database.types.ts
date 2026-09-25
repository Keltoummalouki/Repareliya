export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accessories: {
        Row: {
          category: string
          compare_at_price: number | null
          compatible_with: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          name: string
          price: number | null
          slug: string
          sort_order: number
          stock_status: string
          updated_at: string
        }
        Insert: {
          category?: string
          compare_at_price?: number | null
          compatible_with?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          name: string
          price?: number | null
          slug: string
          sort_order?: number
          stock_status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          compare_at_price?: number | null
          compatible_with?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          name?: string
          price?: number | null
          slug?: string
          sort_order?: number
          stock_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_featured: boolean
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      device_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      device_models: {
        Row: {
          brand_id: string
          category_id: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          is_popular: boolean
          name: string
          release_year: number | null
          slug: string
          sort_order: number
          source: string
        }
        Insert: {
          brand_id: string
          category_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          name: string
          release_year?: number | null
          slug: string
          sort_order?: number
          source?: string
        }
        Update: {
          brand_id?: string
          category_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          name?: string
          release_year?: number | null
          slug?: string
          sort_order?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "category_brands"
            referencedColumns: ["brand_id"]
          },
          {
            foreignKeyName: "device_models_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "device_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          doc_type: string
          last_value: number
          year: number
        }
        Insert: {
          doc_type: string
          last_value?: number
          year: number
        }
        Update: {
          doc_type?: string
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          accepted_at: string | null
          created_at: string
          currency: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_whatsapp: string | null
          device_label: string | null
          due_date: string | null
          id: string
          issue_date: string
          items: Json
          notes: string | null
          number: string | null
          paid_at: string | null
          payment_method: string | null
          preferred_contact: string | null
          prices_include_tax: boolean
          public_token: string
          request_id: string | null
          sent_at: string | null
          sent_via: string | null
          source_document_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          terms: string | null
          total: number
          type: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          device_label?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          items?: Json
          notes?: string | null
          number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          preferred_contact?: string | null
          prices_include_tax?: boolean
          public_token?: string
          request_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          source_document_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          type: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          device_label?: string | null
          due_date?: string | null
          id?: string
          issue_date?: string
          items?: Json
          notes?: string | null
          number?: string | null
          paid_at?: string | null
          payment_method?: string | null
          preferred_contact?: string | null
          prices_include_tax?: boolean
          public_token?: string
          request_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          source_document_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          type?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          data: Json
          id: number
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      realisations: {
        Row: {
          after_image_url: string | null
          before_image_url: string | null
          category_id: string | null
          created_at: string
          description: string | null
          device_label: string | null
          id: string
          images: string[]
          is_featured: boolean
          is_published: boolean
          performed_on: string | null
          repair_label: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          after_image_url?: string | null
          before_image_url?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          device_label?: string | null
          id?: string
          images?: string[]
          is_featured?: boolean
          is_published?: boolean
          performed_on?: string | null
          repair_label?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          after_image_url?: string | null
          before_image_url?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          device_label?: string | null
          id?: string
          images?: string[]
          is_featured?: boolean
          is_published?: boolean
          performed_on?: string | null
          repair_label?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "realisations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "device_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_prices: {
        Row: {
          duration: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          model_id: string
          note: string | null
          price: number | null
          price_is_from: boolean
          quality: string
          repair_type_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          duration?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          model_id: string
          note?: string | null
          price?: number | null
          price_is_from?: boolean
          quality?: string
          repair_type_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          duration?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          model_id?: string
          note?: string | null
          price?: number | null
          price_is_from?: boolean
          quality?: string
          repair_type_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_prices_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "device_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_prices_repair_type_id_fkey"
            columns: ["repair_type_id"]
            isOneToOne: false
            referencedRelation: "repair_types"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_type_categories: {
        Row: {
          category_id: string
          repair_type_id: string
        }
        Insert: {
          category_id: string
          repair_type_id: string
        }
        Update: {
          category_id?: string
          repair_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_type_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "device_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_type_categories_repair_type_id_fkey"
            columns: ["repair_type_id"]
            isOneToOne: false
            referencedRelation: "repair_types"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_types: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      requests: {
        Row: {
          accessory_id: string | null
          admin_notes: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          customer_name: string
          device_label: string | null
          email: string | null
          estimated_price: number | null
          id: string
          ip_hash: string | null
          is_read: boolean
          kind: string
          message: string | null
          model_id: string | null
          number: number
          phone: string | null
          photos: string[]
          preferred_contact: string
          repair_labels: string[]
          repair_type_ids: string[]
          source_page: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          accessory_id?: string | null
          admin_notes?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          customer_name: string
          device_label?: string | null
          email?: string | null
          estimated_price?: number | null
          id?: string
          ip_hash?: string | null
          is_read?: boolean
          kind?: string
          message?: string | null
          model_id?: string | null
          number?: never
          phone?: string | null
          photos?: string[]
          preferred_contact: string
          repair_labels?: string[]
          repair_type_ids?: string[]
          source_page?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          accessory_id?: string | null
          admin_notes?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          customer_name?: string
          device_label?: string | null
          email?: string | null
          estimated_price?: number | null
          id?: string
          ip_hash?: string | null
          is_read?: boolean
          kind?: string
          message?: string | null
          model_id?: string | null
          number?: never
          phone?: string | null
          photos?: string[]
          preferred_contact?: string
          repair_labels?: string[]
          repair_type_ids?: string[]
          source_page?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "accessories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "category_brands"
            referencedColumns: ["brand_id"]
          },
          {
            foreignKeyName: "requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "device_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "device_models"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          device_label: string | null
          id: string
          ip_hash: string | null
          is_featured: boolean
          published_at: string | null
          rating: number
          reply: string | null
          source: string
          status: string
        }
        Insert: {
          author_name: string
          comment: string
          created_at?: string
          device_label?: string | null
          id?: string
          ip_hash?: string | null
          is_featured?: boolean
          published_at?: string | null
          rating: number
          reply?: string | null
          source?: string
          status?: string
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          device_label?: string | null
          id?: string
          ip_hash?: string | null
          is_featured?: boolean
          published_at?: string | null
          rating?: number
          reply?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          data: Json
          id: number
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          handle: string | null
          id: string
          is_visible: boolean
          label: string | null
          platform: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          handle?: string | null
          id?: string
          is_visible?: boolean
          label?: string | null
          platform: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          handle?: string | null
          id?: string
          is_visible?: boolean
          label?: string | null
          platform?: string
          sort_order?: number
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      category_brands: {
        Row: {
          brand_id: string | null
          category_id: string | null
          is_featured: boolean | null
          logo_url: string | null
          model_count: number | null
          name: string | null
          slug: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "device_models_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "device_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      next_document_number: {
        Args: { p_date: string; p_type: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

