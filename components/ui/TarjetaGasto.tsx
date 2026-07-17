import { View, Text, StyleSheet } from 'react-native';
import { formatearPeso } from '@/lib/gastos';
import { getCategoriaColor, getCategoriaEmoji } from '@/lib/categorias';
import { useCategoriaStore } from '@/store/categoriaStore';
import type { TipoMovimiento } from '@/types/database';

const CONFIG_TIPO = {
  ingreso:   { emoji: '💰', color: '#10B981', etiqueta: 'Ingreso' },
  ahorro:    { emoji: '🏦', color: '#3B82F6', etiqueta: 'Ahorro' },
  inversion: { emoji: '📈', color: '#F59E0B', etiqueta: 'Inversión' },
  gasto:     { emoji: null, color: null, etiqueta: null },
};

interface Props {
  descripcion: string;
  categoria: string;
  monto: number;
  fecha: string;
  tipo?: TipoMovimiento;
  fuente?: string | null;
  esPrivado?: boolean;
  esGrupal?: boolean;
  autor?: string;
}

export function TarjetaGasto({ descripcion, categoria, monto, fecha, tipo = 'gasto', fuente, esPrivado, esGrupal, autor }: Props) {
  const config = useCategoriaStore((s) => s.config);
  const esGasto = tipo === 'gasto';
  const cfg = CONFIG_TIPO[tipo];
  const emoji = esGasto ? getCategoriaEmoji(categoria, config) : cfg.emoji!;
  const color = esGasto ? getCategoriaColor(categoria, config) : cfg.color!;

  const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });

  const subtitulo = esGasto
    ? `${categoria} · ${fechaFormateada}${autor ? ` · ${autor}` : ''}`
    : `${cfg.etiqueta}${fuente ? ` · ${fuente}` : ''} · ${fechaFormateada}${autor ? ` · ${autor}` : ''}`;

  return (
    <View style={estilos.contenedor}>
      <View style={[estilos.iconoContenedor, { backgroundColor: color + '20' }]}>
        <Text style={estilos.emoji}>{emoji}</Text>
      </View>
      <View style={estilos.info}>
        <View style={estilos.fila}>
          <Text style={estilos.descripcion} numberOfLines={1}>
            {descripcion || (esGasto ? categoria : cfg.etiqueta)}
          </Text>
          {esPrivado && <Text style={estilos.privado}>🔒</Text>}
          {esGrupal && (
            <View style={estilos.badgeGrupo}>
              <Text style={estilos.badgeGrupoTexto}>👥 Compartido</Text>
            </View>
          )}
        </View>
        <Text style={estilos.categoria}>{subtitulo}</Text>
      </View>
      <Text style={[estilos.monto, { color }]}>
        {!esGasto && '+'}
        {formatearPeso(monto)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  iconoContenedor: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  descripcion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  privado: {
    fontSize: 12,
  },
  badgeGrupo: {
    backgroundColor: '#EDE9FE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeGrupoTexto: {
    fontSize: 10,
    color: '#6C47FF',
    fontWeight: '700',
  },
  categoria: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  monto: {
    fontSize: 15,
    fontWeight: '700',
  },
});
