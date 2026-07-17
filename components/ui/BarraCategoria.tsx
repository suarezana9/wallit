import { View, Text, StyleSheet } from 'react-native';
import { formatearPeso } from '@/lib/gastos';
import { getCategoriaColor, getCategoriaEmoji } from '@/lib/categorias';
import { useCategoriaStore } from '@/store/categoriaStore';

interface Props {
  categoria: string;
  monto: number;
  total: number;
}

export function BarraCategoria({ categoria, monto, total }: Props) {
  const config = useCategoriaStore((s) => s.config);
  const porcentaje = total > 0 ? (monto / total) * 100 : 0;
  const color = getCategoriaColor(categoria, config);
  const emoji = getCategoriaEmoji(categoria, config);

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <Text style={estilos.etiqueta}>{emoji} {categoria}</Text>
        <Text style={estilos.monto}>{formatearPeso(monto)}</Text>
      </View>
      <View style={estilos.fondoBarra}>
        <View style={[estilos.barra, { width: `${porcentaje}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: 6,
    marginBottom: 12,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  etiqueta: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  monto: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  fondoBarra: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barra: {
    height: 8,
    borderRadius: 4,
  },
});
