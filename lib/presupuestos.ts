import { supabase } from './supabase';
import type { Categoria, Database } from '@/types/database';

export type Presupuesto = Database['public']['Tables']['budgets']['Row'];

export function labelMes(offset = 0): string {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() + offset);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export async function obtenerPresupuestos(
  contextoId: 'personal' | string,
  userId: string,
  periodoOffset = 0,
): Promise<Presupuesto[]> {
  const mes = labelMes(periodoOffset);
  const esPersonal = contextoId === 'personal';

  let query = supabase.from('budgets').select('*').eq('month', mes);

  if (esPersonal) {
    query = query.eq('user_id', userId).is('group_id', null);
  } else {
    query = query.eq('group_id', contextoId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Presupuesto[];
}

export async function crearPresupuesto(
  contextoId: 'personal' | string,
  userId: string,
  nombre: string,
  limite: number,
  categorias: Categoria[],
  mes: string,
): Promise<void> {
  const esPersonal = contextoId === 'personal';

  const fila = {
    name: nombre.trim(),
    amount_limit: limite,
    categories: categorias,
    month: mes,
    user_id: esPersonal ? userId : null,
    group_id: esPersonal ? null : contextoId,
  };

  const { error } = await supabase.from('budgets').insert(fila);
  if (error) throw error;
}

export async function actualizarPresupuesto(
  id: string,
  nombre: string,
  limite: number,
  categorias: Categoria[],
): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .update({ name: nombre.trim(), amount_limit: limite, categories: categorias })
    .eq('id', id);
  if (error) throw error;
}

export async function eliminarPresupuesto(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

export function calcularGastoPresupuesto(
  presupuesto: Presupuesto,
  porCategoria: Record<string, number>,
): number {
  return presupuesto.categories.reduce((sum, cat) => sum + (porCategoria[cat] ?? 0), 0);
}
