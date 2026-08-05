import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { obtenerPresupuestos, calcularGastoPresupuesto, type Presupuesto } from '@/lib/presupuestos';

export type PresupuestoConGasto = Presupuesto & { gastoActual: number };

export function usePresupuestos(
  contextoId: 'personal' | string,
  periodoOffset = 0,
  porCategoria: Record<string, number> = {},
) {
  const usuario = useAuthStore((s) => s.usuario);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const data = await obtenerPresupuestos(contextoId, usuario.id, periodoOffset);
      setPresupuestos(data);
    } catch {
      setPresupuestos([]);
    } finally {
      setCargando(false);
    }
  }, [usuario, contextoId, periodoOffset]);

  useEffect(() => { cargar(); }, [cargar]);

  const presupuestosConGasto: PresupuestoConGasto[] = presupuestos.map((p) => ({
    ...p,
    gastoActual: calcularGastoPresupuesto(p, porCategoria),
  }));

  return { presupuestos, presupuestosConGasto, cargando, recargar: cargar };
}
