import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useGrupoStore } from '@/store/grupoStore';
import { useGastos } from '@/hooks/useGastos';
import { TarjetaGasto } from '@/components/ui/TarjetaGasto';
import { BarraCategoria } from '@/components/ui/BarraCategoria';
import { ModalGasto } from '@/components/ui/ModalGasto';
import { formatearPeso } from '@/lib/gastos';
import type { Categoria, TipoMovimiento, Database } from '@/types/database';

type Gasto = Database['public']['Tables']['expenses']['Row'];
type FiltroTipo = 'todos' | TipoMovimiento;

const FILTROS: { id: FiltroTipo; label: string; emoji: string }[] = [
  { id: 'todos',     label: 'Todos',      emoji: '📋' },
  { id: 'gasto',     label: 'Gastos',     emoji: '💸' },
  { id: 'ingreso',   label: 'Ingresos',   emoji: '💰' },
  { id: 'ahorro',    label: 'Ahorros',    emoji: '🏦' },
  { id: 'inversion', label: 'Inversiones', emoji: '📈' },
];

export default function PantallaDashboard() {
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGrupoStore((s) => s.grupos);
  const contextoId = useGrupoStore((s) => s.contextoId);
  const setContexto = useGrupoStore((s) => s.setContexto);
  const router = useRouter();

  const [periodoOffset, setPeriodoOffset] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const {
    gastos, totalGastos, totalIngresos, totalAhorros, totalInversiones,
    balance, tasaAhorro, porCategoria,
    labelMes, esMesActual, cargando, recargar,
  } = useGastos(contextoId, periodoOffset);

  const esContextoPersonal = contextoId === 'personal';
  const grupoActivo = grupos.find((g) => g.grupo.id === contextoId)?.grupo ?? null;

  const [gastoSeleccionado, setGastoSeleccionado] = useState<Gasto | null>(null);

  useFocusEffect(useCallback(() => {
    recargar();
  }, [recargar]));

  const nombreUsuario = usuario?.user_metadata?.full_name?.split(' ')[0]
    ?? usuario?.email?.split('@')[0]
    ?? 'vos';

  const gastosFiltrados = filtroTipo === 'todos'
    ? gastos
    : gastos.filter(g => (g.tipo ?? 'gasto') === filtroTipo);

  const categoriasSorted = Object.entries(porCategoria)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4) as [Categoria, number][];

  const mostrarCategorias = (filtroTipo === 'todos' || filtroTipo === 'gasto') && categoriasSorted.length > 0;
  const hayMovimientos = totalGastos > 0 || totalIngresos > 0 || totalAhorros > 0 || totalInversiones > 0;
  const hayIngresos = totalIngresos > 0;
  const balancePositivo = balance >= 0;

  const textoVacio = filtroTipo === 'gasto' ? 'Sin gastos en este período.' :
                     filtroTipo === 'ingreso' ? 'Sin ingresos registrados.' :
                     filtroTipo === 'ahorro' ? 'Sin ahorros registrados.' :
                     filtroTipo === 'inversion' ? 'Sin inversiones registradas.' :
                     esMesActual ? 'Todavía no cargaste movimientos este mes.' : 'Sin movimientos en este período.';

  const emojiVacio = filtroTipo === 'ingreso' ? '💰' : filtroTipo === 'ahorro' ? '🏦' : filtroTipo === 'inversion' ? '📈' : '💸';

  return (
    <>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} />}
      >
        {/* Encabezado */}
        <View style={estilos.encabezado}>
          <Text style={estilos.saludo}>
            {esContextoPersonal ? `Hola, ${nombreUsuario} 👋` : grupoActivo?.name ?? 'Grupo'}
          </Text>
          <TouchableOpacity
            style={estilos.botonAgregar}
            onPress={() => router.push('/(tabs)/nuevo')}
            activeOpacity={0.8}
          >
            <Text style={estilos.textoAgregar}>+ Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* Selector de contexto — Personal + grupos */}
        {grupos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={estilos.contextoScroll}
            contentContainerStyle={estilos.contextoContenido}
          >
            <TouchableOpacity
              style={[estilos.contextoChip, esContextoPersonal && estilos.contextoChipActivo]}
              onPress={() => { setContexto('personal'); setPeriodoOffset(0); setFiltroTipo('todos'); }}
              activeOpacity={0.7}
            >
              <Text style={[estilos.contextoChipTexto, esContextoPersonal && estilos.contextoChipTextoActivo]}>
                👤 Personal
              </Text>
            </TouchableOpacity>
            {grupos.map(({ grupo }) => (
              <TouchableOpacity
                key={grupo.id}
                style={[estilos.contextoChip, contextoId === grupo.id && estilos.contextoChipActivo]}
                onPress={() => { setContexto(grupo.id); setPeriodoOffset(0); setFiltroTipo('todos'); }}
                activeOpacity={0.7}
              >
                <Text style={[estilos.contextoChipTexto, contextoId === grupo.id && estilos.contextoChipTextoActivo]}>
                  👥 {grupo.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Tarjeta principal con métricas */}
        <View style={estilos.tarjetaTotal}>
          {/* Navegación de mes */}
          <View style={estilos.navMes}>
            <TouchableOpacity
              style={estilos.navBtn}
              onPress={() => setPeriodoOffset((o) => o - 1)}
              activeOpacity={0.7}
            >
              <Text style={estilos.navFlecha}>‹</Text>
            </TouchableOpacity>
            <Text style={estilos.navLabel}>{labelMes}</Text>
            <TouchableOpacity
              style={estilos.navBtn}
              onPress={() => setPeriodoOffset((o) => Math.min(o + 1, 0))}
              disabled={esMesActual}
              activeOpacity={0.7}
            >
              <Text style={[estilos.navFlecha, esMesActual && estilos.navFlechaDeshabilitada]}>›</Text>
            </TouchableOpacity>
          </View>

          {hayIngresos || totalAhorros > 0 || totalInversiones > 0 ? (
            /* Grid 2×2 cuando hay más de un tipo de movimiento */
            <View style={estilos.grid}>
              {/* Fila 1: Ingresos | Gastos */}
              <View style={estilos.gridFila}>
                <View style={estilos.gridCelda}>
                  <Text style={estilos.gridLabel}>💰 Ingresos</Text>
                  <Text style={estilos.gridMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {formatearPeso(totalIngresos)}
                  </Text>
                </View>
                <View style={estilos.gridDivV} />
                <View style={estilos.gridCelda}>
                  <Text style={estilos.gridLabel}>💸 Gastos</Text>
                  <Text style={estilos.gridMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {formatearPeso(totalGastos)}
                  </Text>
                </View>
              </View>

              {/* Fila 2: Ahorros | Inversiones (solo si hay datos) */}
              {(totalAhorros > 0 || totalInversiones > 0) && (
                <>
                  <View style={estilos.gridDivH} />
                  <View style={estilos.gridFila}>
                    <View style={estilos.gridCelda}>
                      <Text style={estilos.gridLabel}>🏦 Ahorros</Text>
                      <Text style={estilos.gridMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {formatearPeso(totalAhorros)}
                      </Text>
                    </View>
                    <View style={estilos.gridDivV} />
                    <View style={estilos.gridCelda}>
                      <Text style={estilos.gridLabel}>📈 Inversiones</Text>
                      <Text style={estilos.gridMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {formatearPeso(totalInversiones)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          ) : (
            /* Sin ingresos ni ahorros ni inversiones: solo gastos en grande */
            <View>
              <Text style={estilos.metricaLabelSolo}>💸 Lo que gastaste</Text>
              <Text style={estilos.metricaMontoGrande} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatearPeso(totalGastos)}
              </Text>
            </View>
          )}

          {/* Disponible + tasa ahorro — solo cuando hay ingresos */}
          {hayIngresos && (
            <View style={estilos.balanceRow}>
              <View style={estilos.balancePill}>
                <Text style={estilos.balanceLabel}>Disponible</Text>
                <Text style={[estilos.balanceMonto, { color: balancePositivo ? '#4ADE80' : '#FCA5A5' }]}>
                  {balancePositivo ? '+' : ''}{formatearPeso(balance)}
                </Text>
              </View>
              {tasaAhorro > 0 && (
                <View style={estilos.balancePill}>
                  <Text style={estilos.balanceLabel}>Ahorro</Text>
                  <Text style={estilos.balanceMonto}>{tasaAhorro}%</Text>
                </View>
              )}
            </View>
          )}

          {!hayMovimientos && (
            <Text style={estilos.sinDatos}>
              {esMesActual ? 'Sin movimientos este mes' : 'Sin movimientos en este período'}
            </Text>
          )}
        </View>

        {/* Categorías de gastos */}
        {mostrarCategorias && (
          <View style={estilos.seccion}>
            <Text style={estilos.tituloSeccion}>Gastos por categoría</Text>
            {categoriasSorted.map(([cat, monto]) => (
              <BarraCategoria key={cat} categoria={cat} monto={monto} total={totalGastos} />
            ))}
          </View>
        )}

        {/* Historial con filtros */}
        <View style={estilos.seccion}>
          {/* Filtros */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={estilos.filtroScroll}
            contentContainerStyle={estilos.filtroContenido}
          >
            {FILTROS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[estilos.filtroChip, filtroTipo === f.id && estilos.filtroChipActivo]}
                onPress={() => setFiltroTipo(f.id)}
                activeOpacity={0.7}
              >
                <Text style={[estilos.filtroChipTexto, filtroTipo === f.id && estilos.filtroChipTextoActivo]}>
                  {f.emoji} {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {gastosFiltrados.length === 0 && !cargando ? (
            <View style={estilos.vacio}>
              <Text style={estilos.emojiVacio}>{emojiVacio}</Text>
              <Text style={estilos.textoVacio}>{textoVacio}</Text>
              {esMesActual && filtroTipo === 'todos' && (
                <TouchableOpacity
                  style={estilos.botonPrimero}
                  onPress={() => router.push('/(tabs)/nuevo')}
                  activeOpacity={0.8}
                >
                  <Text style={estilos.textoBotonPrimero}>Cargar primer movimiento</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              {gastosFiltrados.map((g, i) => (
                <View key={g.id}>
                  {i > 0 && <View style={estilos.separador} />}
                  <TouchableOpacity onPress={() => setGastoSeleccionado(g)} activeOpacity={0.7}>
                    <TarjetaGasto
                      descripcion={g.description}
                      categoria={g.category as Categoria}
                      monto={Number(g.amount)}
                      fecha={g.date}
                      tipo={g.tipo ?? 'gasto'}
                      fuente={g.fuente}
                      esPrivado={g.is_private}
                      esGrupal={!!g.group_id}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <ModalGasto
        gasto={gastoSeleccionado}
        visible={!!gastoSeleccionado}
        onCerrar={() => setGastoSeleccionado(null)}
        onCambio={() => { recargar(); setGastoSeleccionado(null); }}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F9FAFB' },
  contenido: { padding: 20, paddingTop: 56, gap: 20, paddingBottom: 40 },

  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saludo: { fontSize: 22, fontWeight: '800', color: '#111827' },
  botonAgregar: { backgroundColor: '#6C47FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  textoAgregar: { color: '#fff', fontWeight: '700', fontSize: 14 },

  contextoScroll: { marginHorizontal: -20 },
  contextoContenido: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
  contextoChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  contextoChipActivo: { borderColor: '#6C47FF', backgroundColor: '#6C47FF' },
  contextoChipTexto: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  contextoChipTextoActivo: { color: '#fff' },

  tarjetaTotal: { backgroundColor: '#6C47FF', borderRadius: 20, padding: 20, gap: 16 },
  navMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: 4 },
  navFlecha: { fontSize: 22, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  navFlechaDeshabilitada: { color: 'rgba(255,255,255,0.25)' },
  navLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize', textAlign: 'center' },

  grid: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  gridFila: {
    flexDirection: 'row',
  },
  gridCelda: {
    flex: 1,
    padding: 14,
    gap: 5,
  },
  gridDivV: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 10,
  },
  gridDivH: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 10,
  },
  gridLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  gridMonto: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  metricaLabelSolo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricaMontoGrande: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },

  balanceRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  balanceMonto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  sinDatos: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
  },

  seccion: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 0 },
  tituloSeccion: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  separador: { height: 1, backgroundColor: '#F3F4F6' },

  filtroScroll: { marginHorizontal: -20, marginBottom: 16 },
  filtroContenido: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
  filtroChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filtroChipActivo: { borderColor: '#6C47FF', backgroundColor: '#F5F2FF' },
  filtroChipTexto: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filtroChipTextoActivo: { color: '#6C47FF' },

  vacio: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  emojiVacio: { fontSize: 40 },
  textoVacio: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },
  botonPrimero: { backgroundColor: '#6C47FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  textoBotonPrimero: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
