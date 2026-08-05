import { View, Text, StyleSheet } from 'react-native';
import { getCategoriaColor, getCategoriaEmoji } from '@/lib/categorias';
import { useCategoriaStore } from '@/store/categoriaStore';
import { useTheme } from '@/constants/theme';
import { useMoneda } from '@/hooks/useMoneda';

interface Props {
  categoria: string;
  monto: number;
  total: number;
}

export function BarraCategoria({ categoria, monto, total }: Props) {
  const t = useTheme();
  const { formatear } = useMoneda();
  const config = useCategoriaStore((s) => s.config);
  const porcentaje = total > 0 ? (monto / total) * 100 : 0;
  const color = getCategoriaColor(categoria, config);
  const emoji = getCategoriaEmoji(categoria, config);

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={[styles.etiqueta, { color: t.textSecondary }]}>{emoji} {categoria}</Text>
        <Text style={[styles.monto, { color: t.text }]}>{formatear(monto)}</Text>
      </View>
      <View style={[styles.fondoBarra, { backgroundColor: t.border }]}>
        <View style={[styles.barra, { width: `${porcentaje}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: 6, marginBottom: 12 },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between' },
  etiqueta: { fontSize: 14, fontWeight: '500' },
  monto: { fontSize: 14, fontWeight: '600' },
  fondoBarra: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barra: { height: 7, borderRadius: 4 },
});
