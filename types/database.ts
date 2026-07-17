export type Categoria =
  | 'Supermercado' | 'Servicios' | 'Transporte' | 'Salud' | 'Educación'
  | 'Ocio' | 'Restaurantes' | 'Ropa' | 'Tecnología'
  | 'Hogar' | 'Mascotas' | 'Viajes' | 'Suscripciones' | 'Deporte'
  | 'Belleza' | 'Auto' | 'Farmacia' | 'Regalos' | 'Delivery'
  | 'Bar' | 'Banco' | 'Trabajo' | 'Otros'
  | (string & {}); // categorías personalizadas

export type TipoMovimiento = 'gasto' | 'ingreso' | 'ahorro' | 'inversion';
export type FuenteIngreso = 'sueldo' | 'freelance' | 'alquiler' | 'otro';
export type RolGrupo = 'admin' | 'member';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          currency: string;
          created_by: string;
          invite_code: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['groups']['Insert']>;
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: RolGrupo;
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['group_members']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['group_members']['Insert']>;
      };
      expenses: {
        Row: {
          id: string;
          group_id: string | null;
          user_id: string;
          amount: number;
          category: Categoria;
          description: string;
          date: string;
          is_private: boolean;
          receipt_url: string | null;
          created_at: string;
          tipo: TipoMovimiento;
          fuente: string | null;
        };
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      budgets: {
        Row: {
          id: string;
          group_id: string;
          category: Categoria;
          amount_limit: number;
          month: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          amount: number;
          settled: boolean;
        };
        Insert: Omit<Database['public']['Tables']['expense_splits']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['expense_splits']['Insert']>;
      };
    };
  };
}
