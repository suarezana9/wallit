import { View, Text, StyleSheet } from 'react-native';
import { formatearFechaRelativa } from '@/lib/gastos';
import { getCategoriaColor, getCategoriaEmoji } from '@/lib/categorias';
import { useCategoriaStore } from '@/store/categoriaStore';
import { useTheme } from '@/constants/theme';
import { useMoneda } from '@/hooks/useMoneda';
import type { TipoMovimiento } from '@/types/database';

const CONFIG_TIPO = {
  ingreso:   { emoji: '💰', etiqueta: 'Ingreso'   },
  ahorro:    { emoji: '🏦', etiqueta: 'Ahorro'    },
  inversion: { emoji: '📈', etiqueta: 'Inversión' },
  gasto:     { emoji: null, etiqueta: null         },
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
  const t = useTheme();
  const { formatear } = useMoneda();
  const config = useCategoriaStore((s) => s.config);
  const esGasto = tipo === 'gasto';
  const cfg = CONFIG_TIPO[tipo];
  const TIPO_COLOR: Record<string, string> = {
    gasto: t.text, ingreso: t.tipoIngreso, ahorro: t.tipoAhorro, inversion: t.tipoInversion,
  };
  const emoji = esGasto ? getCategoriaEmoji(categoria, config) : cfg.emoji!;
  const baseColor = esGasto ? getCategoriaColor(categoria, config) : TIPO_COLOR[tipo];

  const fechaFormateada = formatearFechaRelativa(fecha);

  const subtitulo = esGasto
    ? `${categoria} · ${fechaFormateada}`
    : `${cfg.etiqueta}${fuente ? ` · ${fuente}` : ''} · ${fechaFormateada}`;

  const montoColor = TIPO_COLOR[tipo];

  return (
    <View style={styles.contenedor}>
      <View style={[styles.iconoContenedor, { backgroundColor: baseColor + '18' }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.fila}>
          <Text style={[styles.descripcion, { color: t.text }]} numberOfLines={1}>
            {descripcion || (esGasto ? categoria : cfg.etiqueta)}
          </Text>
          {esPrivado && <Text style={styles.privado}>🔒</Text>}
          {esGrupal && (
            <View style={[styles.badgeGrupo, { backgroundColor: t.badgeGrupoBg }]}>
              <Text style={[styles.badgeGrupoTexto, { color: t.badgeGrupoText }]}>
                👥 {autor ?? 'Compartido'}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.categoria, { color: t.textMuted }]}>{subtitulo}</Text>
      </View>
      <Text style={[styles.monto, { color: montoColor }]}>
        {!esGasto && '+'}
        {formatear(monto)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  iconoContenedor: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 20 },
  info: { flex: 1, gap: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  descripcion: { fontSize: 15, fontWeight: '600', flex: 1 },
  privado: { fontSize: 12 },
  badgeGrupo: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGrupoTexto: { fontSize: 10, fontWeight: '700' },
  categoria: { fontSize: 13 },
  monto: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
});
