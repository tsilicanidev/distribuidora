export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'manager' | 'seller' | 'warehouse' | 'driver'
          created_at: string
          updated_at: string
          license_number: string | null
          license_category: string | null
          license_expiry: string | null
          driver_status: 'available' | 'on_delivery' | 'off_duty' | 'vacation' | 'sick_leave' | null
        }
        Insert: {
          id: string
          full_name: string
          role: 'admin' | 'manager' | 'seller' | 'warehouse' | 'driver'
          created_at?: string
          updated_at?: string
          license_number?: string | null
          license_category?: string | null
          license_expiry?: string | null
          driver_status?: 'available' | 'on_delivery' | 'off_duty' | 'vacation' | 'sick_leave' | null
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'manager' | 'seller' | 'warehouse' | 'driver'
          created_at?: string
          updated_at?: string
          license_number?: string | null
          license_category?: string | null
          license_expiry?: string | null
          driver_status?: 'available' | 'on_delivery' | 'off_duty' | 'vacation' | 'sick_leave' | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          price: number
          stock_quantity: number
          min_stock: number
          max_stock: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          price: number
          stock_quantity?: number
          min_stock?: number
          max_stock?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          price?: number
          stock_quantity?: number
          min_stock?: number
          max_stock?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          quantity: number
          type: 'IN' | 'OUT'
          reference_id: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          type: 'IN' | 'OUT'
          reference_id?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          type?: 'IN' | 'OUT'
          reference_id?: string | null
          created_by?: string
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          razao_social: string
          fantasia: string | null
          loja: string | null
          cpf_cnpj: string
          ie: string | null
          simples: 'sim' | 'não' | null
          endereco: string | null
          bairro: string | null
          cidade: string | null
          estado: string | null
          cep: string | null
          telefone: string | null
          celular: string | null
          contato: string | null
          email: string
          email_nfe: string | null
          vendedor: string | null
          rede: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          razao_social: string
          fantasia?: string | null
          loja?: string | null
          cpf_cnpj: string
          ie?: string | null
          simples?: 'sim' | 'não' | null
          endereco?: string | null
          bairro?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          telefone?: string | null
          celular?: string | null
          contato?: string | null
          email: string
          email_nfe?: string | null
          vendedor?: string | null
          rede?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          razao_social?: string
          fantasia?: string | null
          loja?: string | null
          cpf_cnpj?: string
          ie?: string | null
          simples?: 'sim' | 'não' | null
          endereco?: string | null
          bairro?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          telefone?: string | null
          celular?: string | null
          contato?: string | null
          email?: string
          email_nfe?: string | null
          vendedor?: string | null
          rede?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          plate: string
          model: string
          brand: string
          year: number
          type: 'truck' | 'van' | 'car'
          capacity_weight: number
          capacity_volume: number
          status: 'available' | 'maintenance' | 'in_use'
          last_maintenance: string | null
          next_maintenance: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plate: string
          model: string
          brand: string
          year: number
          type: 'truck' | 'van' | 'car'
          capacity_weight: number
          capacity_volume: number
          status?: 'available' | 'maintenance' | 'in_use'
          last_maintenance?: string | null
          next_maintenance?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plate?: string
          model?: string
          brand?: string
          year?: number
          type?: 'truck' | 'van' | 'car'
          capacity_weight?: number
          capacity_volume?: number
          status?: 'available' | 'maintenance' | 'in_use'
          last_maintenance?: string | null
          next_maintenance?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicle_maintenance_records: {
        Row: {
          id: string
          vehicle_id: string
          maintenance_date: string
          maintenance_type: string
          description: string | null
          cost: number
          service_provider: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          maintenance_date: string
          maintenance_type: string
          description?: string | null
          cost: number
          service_provider?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          maintenance_date?: string
          maintenance_type?: string
          description?: string | null
          cost?: number
          service_provider?: string | null
          created_by?: string
          created_at?: string
        }
      }
      driver_vehicles: {
        Row: {
          id: string
          driver_id: string
          vehicle_id: string
          start_date: string
          end_date: string | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          vehicle_id: string
          start_date: string
          end_date?: string | null
          status: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          vehicle_id?: string
          start_date?: string
          end_date?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      check_driver_availability: {
        Args: {
          driver_id: string
          check_date: string
        }
        Returns: boolean
      }
      check_vehicle_availability: {
        Args: {
          vehicle_id: string
          check_date: string
        }
        Returns: boolean
      }
      assign_vehicle_to_driver: {
        Args: {
          p_driver_id: string
          p_vehicle_id: string
          p_start_date: string
          p_end_date?: string
        }
        Returns: string
      }
      end_vehicle_assignment: {
        Args: {
          p_assignment_id: string
          p_end_date: string
        }
        Returns: void
      }
      update_driver_status: {
        Args: {
          p_driver_id: string
          p_status: 'available' | 'on_delivery' | 'off_duty' | 'vacation' | 'sick_leave'
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}