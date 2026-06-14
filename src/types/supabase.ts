/**
 * Supabase Database Types
 * Generated from schema. Keep in sync with migrations.
 * Last updated: 2025-06-13 — added api_usage_logs + get_api_usage_stats RPC
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_settings: {
        Row: {
          id: string
          distance_rate: number
          duration_rate: number
          updated_at: string
        }
        Insert: {
          id: string
          distance_rate?: number
          duration_rate?: number
          updated_at?: string
        }
        Update: {
          id?: string
          distance_rate?: number
          duration_rate?: number
          updated_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          user_id: string
          trip_number: string
          origin_address: string
          destination_address: string
          distance: number
          duration: number
          fuel_cost: number | null
          total_price: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trip_number: string
          origin_address: string
          destination_address: string
          distance?: number
          duration?: number
          fuel_cost?: number | null
          total_price?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trip_number?: string
          origin_address?: string
          destination_address?: string
          distance?: number
          duration?: number
          fuel_cost?: number | null
          total_price?: number
          status?: string
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          order_number: string
          status: string
          total_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_number: string
          status?: string
          total_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_number?: string
          status?: string
          total_amount?: number
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          trip_id: string
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          trip_id: string
          price?: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          trip_id?: string
          price?: number
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          order_id: string
          invoice_number: string
          amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          invoice_number: string
          amount?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          invoice_number?: string
          amount?: number
          status?: string
          created_at?: string
        }
      }
      surcharge_factors: {
        Row: {
          id: string
          name: string
          value: number
          type: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          value?: number
          type?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          value?: number
          type?: string
          is_active?: boolean
          created_at?: string
        }
      }
      discounts: {
        Row: {
          id: string
          name: string
          value: number
          type: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          value?: number
          type?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          value?: number
          type?: string
          is_active?: boolean
          created_at?: string
        }
      }
      trip_surcharges: {
        Row: {
          id: string
          trip_id: string
          surcharge_id: string
          amount: number
        }
        Insert: {
          id?: string
          trip_id: string
          surcharge_id: string
          amount?: number
        }
        Update: {
          id?: string
          trip_id?: string
          surcharge_id?: string
          amount?: number
        }
      }
      trip_discounts: {
        Row: {
          id: string
          trip_id: string
          discount_id: string
          amount: number
        }
        Insert: {
          id?: string
          trip_id: string
          discount_id: string
          amount?: number
        }
        Update: {
          id?: string
          trip_id?: string
          discount_id?: string
          amount?: number
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
      api_usage_logs: {
        Row: {
          id: string
          service: 'gm_autocomplete' | 'gm_directions' | 'gm_geocode' | 'gm_places' | 'eia_fuel_price'
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service: 'gm_autocomplete' | 'gm_directions' | 'gm_geocode' | 'gm_places' | 'eia_fuel_price'
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service?: 'gm_autocomplete' | 'gm_directions' | 'gm_geocode' | 'gm_places' | 'eia_fuel_price'
          ip_address?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      get_api_usage_stats: {
        Args: Record<string, never>
        Returns: {
          service: string
          today_count: number
          total_count: number
        }[]
      }
    }
  }
}
