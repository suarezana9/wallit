import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { obtenerGastosRecientes, obtenerGastosDelMes, calcularTotalPorCategoria, calcularRangoDeMes } from '@/lib/gastos';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Gasto = Database['public']['Tables']['expenses']['Row'];

export function useGastos(contextoId: 'personal' | string = 'personal', periodoOffset = 0) {
  const usuario = useAuthStore((s) => s.usuario);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [gastosDelMes, setGastosDelMes] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cargandoRef = useRef(false);

  const cargar = useCallback(async () => {
    if (!usuario || cargandoRef.current) return;
    cargandoRef.current = true;
    try {
      setCargando(true);
      setError(null);
      const [recientes, delMes] = await Promise.all([
        obtenerGastosRecientes(usuario.id, contextoId, 20, periodoOffset),
        obtenerGastosDelMes(usuario.id, contextoId, periodoOffset),
      ]);
      setGastos(recientes as Gasto[]);
      setGastosDelMes(delMes);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
      cargandoRef.current = false;
    }
  }, [usuario, contextoId, periodoOffset]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Realtime: solo cuando el contexto es un grupo
  useEffect(() => {
    if (contextoId === 'personal') return;
    const canal = supabase
      .channel(`gastos-grupo-${contextoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${contextoId}` },
        () => cargar()
      )
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [contextoId, cargar]);

  const totalGastos = gastosDelMes.filter(g => !g.tipo || g.tipo === 'gasto').reduce((acc, g) => acc + Number(g.amount), 0);
  const totalIngresos = gastosDelMes.filter(g => g.tipo === 'ingreso').reduce((acc, g) => acc + Number(g.amount), 0);
  const totalAhorros = gastosDelMes.filter(g => g.tipo === 'ahorro').reduce((acc, g) => acc + Number(g.amount), 0);
  const totalInversiones = gastosDelMes.filter(g => g.tipo === 'inversion').reduce((acc, g) => acc + Number(g.amount), 0);
  const balance = totalIngresos - totalGastos - totalAhorros - totalInversiones;
  const tasaAhorro = totalIngresos > 0 ? Math.round(((totalAhorros + totalInversiones) / totalIngresos) * 100) : 0;
  const porCategoria = calcularTotalPorCategoria(gastosDelMes);
  const { label: labelMes, esMesActual } = calcularRangoDeMes(periodoOffset);

  return {
    gastos, gastosDelMes,
    totalMes: totalGastos,
    totalGastos, totalIngresos, totalAhorros, totalInversiones,
    balance, tasaAhorro,
    porCategoria, labelMes, esMesActual,
    cargando, error, recargar: cargar,
  };
}
