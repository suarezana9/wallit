import { usePreferencesStore } from '@/store/preferencesStore';
import { formatearMoneda, getInfoMoneda } from '@/constants/monedas';

export function useMoneda() {
  const moneda = usePreferencesStore((s) => s.moneda);
  const setMoneda = usePreferencesStore((s) => s.setMoneda);
  const info = getInfoMoneda(moneda);

  return {
    moneda,
    setMoneda,
    info,
    formatear: (monto: number) => formatearMoneda(monto, moneda),
  };
}
