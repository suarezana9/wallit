import { supabase } from './supabase';
import type { Database } from '@/types/database';
export { COLORES_CATEGORIA, EMOJIS_CATEGORIA } from './categorias';

export function formatearFechaRelativa(fechaStr: string): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaStr + 'T00:00:00');
  fecha.setHours(0, 0, 0, 0);
  const diffDias = Math.round((hoy.getTime() - fecha.getTime()) / 86400000);

  if (diffDias === 0) return 'hoy';
  if (diffDias === 1) return 'ayer';
  if (diffDias === -1) return 'mañana';
  if (fecha.getFullYear() === hoy.getFullYear()) {
    return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

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

export async function obtenerResumenUltimosMeses(
  userId: string,
  contextoId: 'personal' | string,
  cantMeses = 6,
): Promise<{ mes: string; label: string; total: number }[]> {
  const esGrupo = contextoId !== 'personal';
  const inicio = calcularRangoDeMes(-(cantMeses - 1)).primerDia;
  const fin = calcularRangoDeMes(0).ultimoDia;

  let query = supabase
    .from('expenses')
    .select('date, amount, tipo')
    .gte('date', inicio)
    .lte('date', fin);

  if (esGrupo) {
    query = query.eq('group_id', contextoId);
  } else {
    query = query.eq('user_id', userId).is('group_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const meses: { mes: string; label: string; total: number }[] = [];
  for (let i = -(cantMeses - 1); i <= 0; i++) {
    const ref = new Date();
    const d = new Date(ref.getFullYear(), ref.getMonth() + i, 1);
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-AR', { month: 'short' });
    meses.push({ mes: mesKey, label, total: 0 });
  }

  for (const g of data ?? []) {
    if (g.tipo && g.tipo !== 'gasto') continue;
    const mesKey = (g.date as string).slice(0, 7);
    const entry = meses.find((m) => m.mes === mesKey);
    if (entry) entry.total += Number(g.amount);
  }

  return meses;
}

export function calcularTotalPorCategoria(gastos: Gasto[]) {
  const totales: Record<string, number> = {};
  for (const g of gastos) {
    if (g.tipo && g.tipo !== 'gasto') continue;
    totales[g.category] = (totales[g.category] ?? 0) + Number(g.amount);
  }
  return totales;
}

export { formatearMoneda } from '@/constants/monedas';

export async function obtenerResumenMesGrupo(grupoId: string) {
  const { primerDia, ultimoDia } = calcularRangoDeMes(0);
  const { data } = await supabase
    .from('expenses')
    .select('amount, tipo')
    .eq('group_id', grupoId)
    .gte('date', primerDia)
    .lte('date', ultimoDia);

  const items = data ?? [];
  const gastos = items
    .filter((g: any) => !g.tipo || g.tipo === 'gasto')
    .reduce((acc: number, g: any) => acc + Number(g.amount), 0);
  const ingresos = items
    .filter((g: any) => g.tipo === 'ingreso')
    .reduce((acc: number, g: any) => acc + Number(g.amount), 0);
  return { gastos, ingresos, total: items.length };
}

/** @deprecated Usar formatearMoneda() con la moneda del store */
export function formatearPeso(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto);
}

