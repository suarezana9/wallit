import { supabase } from './supabase';
import type { Database } from '@/types/database';
export { COLORES_CATEGORIA, EMOJIS_CATEGORIA } from './categorias';

type Gasto = Database['public']['Tables']['expenses']['Row'];

export function calcularRangoDeMes(offset = 0) {
  const ref = new Date();
  const fecha = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  return {
    primerDia: new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().split('T')[0],
    ultimoDia: new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split('T')[0],
    label: fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    esMesActual: offset === 0,
  };
}

export async function obtenerGastosDelMes(userId: string, contextoId: 'personal' | string, periodoOffset = 0) {
  const { primerDia, ultimoDia } = calcularRangoDeMes(periodoOffset);
  const esGrupo = contextoId !== 'personal';

  let query = supabase
    .from('expenses')
    .select(esGrupo ? '*, users(name, avatar_url)' : '*')
    .gte('date', primerDia)
    .lte('date', ultimoDia)
    .order('date', { ascending: false });

  if (esGrupo) {
    query = query.eq('group_id', contextoId);
  } else {
    query = query.eq('user_id', userId).is('group_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Gasto[];
}

export async function obtenerGastosRecientes(userId: string, contextoId: 'personal' | string, limite = 10, periodoOffset = 0) {
  const esGrupo = contextoId !== 'personal';
  let query = supabase
    .from('expenses')
    .select('*, users(name, avatar_url)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);

  if (esGrupo) {
    const { primerDia, ultimoDia } = calcularRangoDeMes(periodoOffset);
    query = query.eq('group_id', contextoId).gte('date', primerDia).lte('date', ultimoDia);
  } else {
    query = query.eq('user_id', userId).is('group_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export function calcularTotalPorCategoria(gastos: Gasto[]) {
  const totales: Record<string, number> = {};
  for (const g of gastos) {
    if (g.tipo && g.tipo !== 'gasto') continue;
    totales[g.category] = (totales[g.category] ?? 0) + Number(g.amount);
  }
  return totales;
}

export function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto);
}

