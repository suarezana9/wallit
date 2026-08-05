import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { ModalNuevoMovimiento } from '@/components/ui/ModalNuevoMovimiento';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from './_layout';
import { useAuthStore } from '@/store/authStore';
import { useGrupoStore } from '@/store/grupoStore';
import { useGastos } from '@/hooks/useGastos';
import { TarjetaGasto } from '@/components/ui/TarjetaGasto';
import { BarraCategoria } from '@/components/ui/BarraCategoria';
import { ModalGasto } from '@/components/ui/ModalGasto';
import { obtenerResumenUltimosMeses, obtenerGastosDelMes } from '@/lib/gastos';
import { useMoneda } from '@/hooks/useMoneda';
import { useT } from '@/hooks/useT';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { getCategoriaEmoji } from '@/lib/categorias';
import { useCategoriaStore } from '@/store/categoriaStore';
import { useTheme } from '@/constants/theme';
import { useNuevoMovimientoStore } from '@/store/nuevoMovimientoStore';
import type { Categoria, TipoMovimiento, Database } from '@/types/database';

type Gasto = Database['public']['Tables']['expenses']['Row'];
type FiltroTipo = 'todos' | TipoMovimiento;


// FILTROS se define dentro del componente para acceder a i18n

export default function PantallaDashboard() {
  const t = useTheme();
  const { formatear } = useMoneda();
  const i18n = useT();
  const insets = useSafeAreaInsets();
  const tabBarBottom = 16 + TAB_BAR_HEIGHT;
  const fabBottom = tabBarBottom + 16;
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGrupoStore((s) => s.grupos);
  const contextoId = useGrupoStore((s) => s.contextoId);
  const setContexto = useGrupoStore((s) => s.setContexto);

  const [periodoOffset, setPeriodoOffset] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const {
    gastos, totalGastos, totalIngresos, totalAhorros, totalInversiones,
    balance, tasaAhorro, porCategoria,
    labelMes, esMesActual, cargando, recargar,
  } = useGastos(contextoId, periodoOffset);

  const { presupuestosConGasto } = usePresupuestos(contextoId, periodoOffset, porCategoria);
  const presupuestosActivos = presupuestosConGasto.filter(
    (p) => p.gastoActual > 0 || Number(p.amount_limit) > 0
  );

  const [totalMesAnterior, setTotalMesAnterior] = useState<number | null>(null);

  useEffect(() => {
    if (!usuario) return;
    obtenerGastosDelMes(usuario.id, contextoId, periodoOffset - 1)
      .then((gastos) => {
        const total = gastos
          .filter((g) => !g.tipo || g.tipo === 'gasto')
          .reduce((acc, g) => acc + Number(g.amount), 0);
        setTotalMesAnterior(total);
      })
      .catch(() => setTotalMesAnterior(null));
  }, [usuario, contextoId, periodoOffset]);

  const esContextoPersonal = contextoId === 'personal';
  const grupoActivo = grupos.find((g) => g.grupo.id === contextoId)?.grupo ?? null;

  const config = useCategoriaStore((s) => s.config);
  const abrirModal = useNuevoMovimientoStore((s) => s.abrir);
  const [gastoSeleccionado, setGastoSeleccionado] = useState<Gasto | null>(null);
  const [fabAbierto, setFabAbierto] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  function toggleFab() {
    const toValue = fabAbierto ? 0 : 1;
    Animated.spring(fabAnim, { toValue, useNativeDriver: true, friction: 6, tension: 80 }).start();
    setFabAbierto(!fabAbierto);
  }

  function cerrarFab() {
    Animated.spring(fabAnim, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
    setFabAbierto(false);
  }

  function irANuevo(tipo: string) {
    cerrarFab();
    abrirModal(tipo as TipoMovimiento);
  }

  useFocusEffect(useCallback(() => {
    recargar();
    return () => cerrarFab();
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

  const diffMesAnterior: { pct: number; sube: boolean } | null =
    totalMesAnterior !== null && totalMesAnterior > 0 && totalGastos > 0
      ? { pct: Math.round(Math.abs((totalGastos - totalMesAnterior) / totalMesAnterior) * 100), sube: totalGastos > totalMesAnterior }
      : null;

  const textoVacio = filtroTipo === 'gasto' ? i18n.sinGastosPeriodo :
                     filtroTipo === 'ingreso' ? i18n.sinIngresos :
                     filtroTipo === 'ahorro' ? i18n.sinAhorros :
                     filtroTipo === 'inversion' ? i18n.sinInversiones :
                     esMesActual ? i18n.sinMovimientosMesActual : i18n.sinMovimientosPeriodo;

  const FAB_ITEMS = [
    { tipo: 'gasto',     label: 'Gasto',     emoji: '💸', color: t.primary        },
    { tipo: 'ingreso',   label: 'Ingreso',   emoji: '💰', color: t.tipoIngreso    },
    { tipo: 'ahorro',    label: 'Ahorro',    emoji: '🏦', color: t.tipoAhorro     },
    { tipo: 'inversion', label: 'Inversión', emoji: '📈', color: t.tipoInversion  },
  ];

  const FILTROS: { id: FiltroTipo; label: string }[] = [
    { id: 'todos',     label: i18n.todos },
    { id: 'gasto',     label: i18n.gastos },
    { id: 'ingreso',   label: i18n.ingresos },
    { id: 'ahorro',    label: i18n.ahorros },
    { id: 'inversion', label: i18n.inversiones },
  ];

  const s = makeStyles(t, fabBottom, tabBarBottom);

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.contenido}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} tintColor={t.primary} />}
      >
        {/* Encabezado */}
        <View style={s.encabezado}>
          <View>
            <Text style={s.saludoLabel}>
              {esContextoPersonal ? i18n.bienDia : i18n.grupo}
            </Text>
            <Text style={s.saludo}>
              {esContextoPersonal ? nombreUsuario : grupoActivo?.name ?? 'Grupo'}
            </Text>
          </View>
        </View>

        {/* Selector de contexto */}
        {grupos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.contextoScroll}
            contentContainerStyle={s.contextoContenido}
          >
            <TouchableOpacity
              style={[s.contextoChip, esContextoPersonal && s.contextoChipActivo]}
              onPress={() => { setContexto('personal'); setPeriodoOffset(0); setFiltroTipo('todos'); }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person"
                size={13}
                color={esContextoPersonal ? t.chipActiveText : t.chipInactiveText}
              />
              <Text style={[s.contextoChipTexto, esContextoPersonal && s.contextoChipTextoActivo]}>
                {i18n.personal}
              </Text>
            </TouchableOpacity>
            {grupos.map(({ grupo }) => (
              <TouchableOpacity
                key={grupo.id}
                style={[s.contextoChip, contextoId === grupo.id && s.contextoChipActivo]}
                onPress={() => { setContexto(grupo.id); setPeriodoOffset(0); setFiltroTipo('todos'); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="people"
                  size={13}
                  color={contextoId === grupo.id ? t.chipActiveText : t.chipInactiveText}
                />
                <Text style={[s.contextoChipTexto, contextoId === grupo.id && s.contextoChipTextoActivo]}>
                  {grupo.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Tarjeta hero */}
        <View style={s.tarjetaHero}>
          <View style={s.navMes}>
            <TouchableOpacity onPress={() => setPeriodoOffset((o) => o - 1)} activeOpacity={0.7} style={s.navBtn}>
              <Ionicons name="chevron-back" size={20} color={t.heroNavArrow} />
            </TouchableOpacity>
            <Text style={s.navLabel}>{labelMes}</Text>
            <TouchableOpacity
              onPress={() => setPeriodoOffset((o) => Math.min(o + 1, 0))}
              disabled={esMesActual}
              activeOpacity={0.7}
              style={s.navBtn}
            >
              <Ionicons name="chevron-forward" size={20} color={esMesActual ? t.heroNavArrowOff : t.heroNavArrow} />
            </TouchableOpacity>
          </View>

          {hayIngresos || totalAhorros > 0 || totalInversiones > 0 ? (
            <View style={s.grid}>
              <View style={s.gridFila}>
                <View style={s.gridCelda}>
                  <Text style={s.gridLabel}>{i18n.ingresos}</Text>
                  <Text style={s.gridMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {formatear(totalIngresos)}
                  </Text>
                </View>
                <View style={s.gridDivV} />
                <View style={s.gridCelda}>
                  <Text style={s.gridLabel}>{i18n.gastos}</Text>
                  <Text style={s.gridMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {formatear(totalGastos)}
                  </Text>
                </View>
              </View>

              {(totalAhorros > 0 || totalInversiones > 0) && (
                <>
                  <View style={s.gridDivH} />
                  <View style={s.gridFila}>
                    <View style={s.gridCelda}>
                      <Text style={s.gridLabel}>{i18n.ahorros}</Text>
                      <Text style={s.gridMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {formatear(totalAhorros)}
                      </Text>
                    </View>
                    <View style={s.gridDivV} />
                    <View style={s.gridCelda}>
                      <Text style={s.gridLabel}>{i18n.inversiones}</Text>
                      <Text style={s.gridMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {formatear(totalInversiones)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          ) : (
            <View>
              <Text style={s.metricaLabelSolo}>{i18n.gastosDelMes}</Text>
              <Text style={s.metricaMontoGrande} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatear(totalGastos)}
              </Text>
            </View>
          )}

          {/* Disponible — siempre visible cuando hay movimientos */}
          {hayMovimientos && (
            <View style={s.balanceRow}>
              <View style={s.balancePill}>
                <View style={[s.balanceDot, { backgroundColor: balancePositivo ? t.heroAccent : '#F87171' }]} />
                <Text style={s.balanceLabel}>{i18n.disponible}</Text>
                <Text style={[s.balanceMonto, { color: balancePositivo ? t.heroAccent : '#F87171' }]}>
                  {balancePositivo ? '+' : ''}{formatear(balance)}
                </Text>
              </View>
              {tasaAhorro > 0 && (
                <View style={s.balancePill}>
                  <View style={[s.balanceDot, { backgroundColor: t.heroAccent }]} />
                  <Text style={s.balanceLabel}>{i18n.ahorro}</Text>
                  <Text style={[s.balanceMonto, { color: t.heroAccent }]}>{tasaAhorro}%</Text>
                </View>
              )}
            </View>
          )}

          {!hayMovimientos && (
            <Text style={s.sinDatos}>
              {esMesActual ? i18n.sinMovimientosMes : i18n.sinMovimientosPeriodo}
            </Text>
          )}

          {diffMesAnterior && (
            <View style={s.comparativaRow}>
              <View style={[s.comparativaPill, { backgroundColor: diffMesAnterior.sube ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }]}>
                <Text style={[s.comparativaTexto, { color: diffMesAnterior.sube ? '#F87171' : '#4ADE80' }]}>
                  {diffMesAnterior.sube ? '▲' : '▼'} {diffMesAnterior.pct}% {i18n.vsMesAnterior}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Evolución mensual */}
        <GraficoEvolucion contextoId={contextoId} userId={usuario?.id ?? ''} />

        {/* Categorías */}
        {mostrarCategorias && (
          <View style={s.seccion}>
            <Text style={s.tituloSeccion}>{i18n.gastosPorCategoria}</Text>
            {categoriasSorted.map(([cat, monto]) => (
              <BarraCategoria key={cat} categoria={cat} monto={monto} total={totalGastos} />
            ))}
          </View>
        )}

        {/* Presupuestos — rediseñados */}
        {presupuestosActivos.length > 0 && (filtroTipo === 'todos' || filtroTipo === 'gasto') && (
          <View style={s.seccion}>
            <Text style={s.tituloSeccion}>{i18n.presupuestos}</Text>
            {presupuestosActivos.map((p) => {
              const limite = Number(p.amount_limit);
              const porcentaje = Math.min((p.gastoActual / limite) * 100, 100);
              const superado = p.gastoActual > limite;
              const cercano = !superado && p.gastoActual / limite >= 0.8;
              const colorBarra = superado ? '#EF4444' : cercano ? '#F59E0B' : t.primary;
              const statusLabel = superado ? i18n.superado : `${Math.round(porcentaje)}%`;
              const statusBg = superado ? '#FEE2E2' : cercano ? '#FEF3C7' : t.accentBg;
              const statusColor = superado ? '#B91C1C' : cercano ? '#92400E' : t.accentText;

              return (
                <View key={p.id} style={s.presupuestoItem}>
                  <View style={s.presupuestoTop}>
                    <Text style={s.presupuestoNombre}>{p.name}</Text>
                    <View style={[s.statusPill, { backgroundColor: statusBg }]}>
                      {superado && <Ionicons name="warning" size={11} color={statusColor} />}
                      <Text style={[s.statusTexto, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>

                  <View style={s.presupuestoMontos}>
                    <Text style={[s.presupuestoGastado, superado && { color: '#EF4444' }]}>
                      {formatear(p.gastoActual)}
                    </Text>
                    <Text style={s.presupuestoLimite}> de {formatear(limite)}</Text>
                  </View>

                  {/* Barra de progreso */}
                  <View style={s.barraTrack}>
                    <View
                      style={[
                        s.barraFill,
                        { width: `${porcentaje}%` as any, backgroundColor: colorBarra },
                      ]}
                    />
                  </View>

                  {/* Categorías compactas */}
                  <View style={s.presupuestoCats}>
                    {p.categories.slice(0, 4).map((cat) => (
                      <View key={cat} style={s.catTag}>
                        <Text style={s.catTagTexto}>{getCategoriaEmoji(cat, config)} {cat}</Text>
                      </View>
                    ))}
                    {p.categories.length > 4 && (
                      <View style={s.catTag}>
                        <Text style={s.catTagTexto}>+{p.categories.length - 4}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Historial */}
        <View style={s.seccion}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.filtroScroll}
            contentContainerStyle={s.filtroContenido}
          >
            {FILTROS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[s.filtroChip, filtroTipo === f.id && s.filtroChipActivo]}
                onPress={() => setFiltroTipo(f.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.filtroChipTexto, filtroTipo === f.id && s.filtroChipTextoActivo]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {gastosFiltrados.length === 0 && !cargando ? (
            <View style={s.vacio}>
              <Ionicons name="receipt-outline" size={40} color={t.textMuted} />
              <Text style={s.textoVacio}>{textoVacio}</Text>
              {esMesActual && filtroTipo === 'todos' && (
                <TouchableOpacity
                  style={s.botonPrimero}
                  onPress={() => abrirModal()}
                  activeOpacity={0.8}
                >
                  <Text style={s.textoBotonPrimero}>{i18n.primerMovimiento}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              {gastosFiltrados.map((g, i) => (
                <View key={g.id}>
                  {i > 0 && <View style={s.separador} />}
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
                      autor={g.group_id ? ((g as any).users?.name ?? undefined) : undefined}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Espacio para FAB */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Backdrop al abrir FAB */}
      {fabAbierto && (
        <Pressable style={s.fabBackdrop} onPress={cerrarFab} />
      )}

      {/* Opciones del FAB */}
      {FAB_ITEMS.map((item, i) => {
        const translateY = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(72 + i * 64)],
        });
        const opacity = fabAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 1],
        });
        const scale = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        });
        return (
          <Animated.View
            key={item.tipo}
            style={[s.fabItem, { transform: [{ translateY }, { scale }], opacity }]}
            pointerEvents={fabAbierto ? 'auto' : 'none'}
          >
            <TouchableOpacity style={s.fabItemLabel} onPress={() => irANuevo(item.tipo)} activeOpacity={0.8}>
              <Text style={s.fabItemTexto}>{item.label}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.fabItemBtn, { backgroundColor: item.color }]}
              onPress={() => irANuevo(item.tipo)}
              activeOpacity={0.8}
            >
              <Text style={s.fabItemEmoji}>{item.emoji}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Botón principal FAB */}
      <TouchableOpacity style={s.fab} onPress={toggleFab} activeOpacity={0.9}>
        <Animated.View style={{
          transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
        }}>
          <Ionicons name="add" size={30} color={t.heroText} />
        </Animated.View>
      </TouchableOpacity>

      <ModalGasto
        gasto={gastoSeleccionado}
        visible={!!gastoSeleccionado}
        onCerrar={() => setGastoSeleccionado(null)}
        onCambio={() => { recargar(); setGastoSeleccionado(null); }}
      />

      <ModalNuevoMovimiento />
    </View>
  );
}

// ─── Gráfico evolución mensual ──────────────────────────────────────────────

type DatoMes = { mes: string; label: string; total: number };

function GraficoEvolucion({ contextoId, userId }: { contextoId: string; userId: string }) {
  const t = useTheme();
  const { formatear } = useMoneda();
  const i18n = useT();
  const [datos, setDatos] = useState<DatoMes[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    obtenerResumenUltimosMeses(userId, contextoId, 6)
      .then(setDatos)
      .catch(() => setDatos([]))
      .finally(() => setCargando(false));
  }, [userId, contextoId]);

  const maxTotal = Math.max(...datos.map((d) => d.total), 1);
  const mesActual = datos[datos.length - 1]?.mes ?? '';
  const g = makeGrafStyles(t);

  return (
    <View style={g.contenedor}>
      <Text style={g.titulo}>{i18n.evolucionGastos}</Text>
      <Text style={g.subtitulo}>{i18n.ultimos6Meses}</Text>

      {cargando ? (
        <ActivityIndicator color={t.primary} style={{ marginTop: 12 }} />
      ) : (
        <View style={g.barras}>
          {datos.map((d) => {
            const pct = d.total / maxTotal;
            const esActual = d.mes === mesActual;
            const color = esActual ? t.primary : t.primary + '55';
            return (
              <View key={d.mes} style={g.barraCol}>
                <Text style={g.barraValor} numberOfLines={1}>
                  {d.total > 0 ? formatear(d.total).replace(/\s/g, '') : ''}
                </Text>
                <View style={g.barraFondo}>
                  <View
                    style={[
                      g.barraRelleno,
                      { height: `${Math.max(pct * 100, d.total > 0 ? 4 : 0)}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={[g.barraLabel, esActual && { color: t.primary, fontWeight: '700' }]}>
                  {d.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function makeGrafStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    contenedor: { backgroundColor: t.surface, borderRadius: 18, padding: 20, gap: 0 },
    titulo: { fontSize: 16, fontWeight: '700', color: t.text },
    subtitulo: { fontSize: 12, color: t.textMuted, marginTop: 2, marginBottom: 16 },
    barras: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 },
    barraCol: { flex: 1, alignItems: 'center', height: '100%', gap: 4 },
    barraValor: { fontSize: 8, color: t.textMuted, fontWeight: '600', textAlign: 'center', height: 16 },
    barraFondo: {
      flex: 1, width: '100%', backgroundColor: t.surfaceAlt,
      borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end',
    },
    barraRelleno: { width: '100%', borderRadius: 6 },
    barraLabel: { fontSize: 11, color: t.textSecondary, fontWeight: '500', textAlign: 'center' },
  });
}

function makeStyles(t: ReturnType<typeof useTheme>, fabBottom: number, tabBarBottom: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    scroll: { flex: 1 },
    contenido: { padding: 20, paddingTop: 56, gap: 16, paddingBottom: tabBarBottom + 24 },

    encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
    saludoLabel: { fontSize: 13, fontWeight: '500', color: t.textMuted, marginBottom: 1 },
    saludo: { fontSize: 28, fontWeight: '800', color: t.text, letterSpacing: -0.8 },

    // Contexto chips
    contextoScroll: { marginHorizontal: -20 },
    contextoContenido: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
    contextoChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: t.chipInactiveBorder,
      backgroundColor: t.chipInactiveBg,
    },
    contextoChipActivo: { borderColor: 'transparent', backgroundColor: t.chipActiveBg },
    contextoChipTexto: { fontSize: 13, fontWeight: '600', color: t.chipInactiveText },
    contextoChipTextoActivo: { color: t.chipActiveText },

    // Hero card
    tarjetaHero: { backgroundColor: t.heroBg, borderRadius: 22, padding: 20, gap: 16 },
    navMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { padding: 4 },
    navLabel: {
      fontSize: 13, fontWeight: '700', color: t.heroTextMuted,
      textTransform: 'capitalize', letterSpacing: 0.3,
    },

    grid: {
      backgroundColor: t.heroSurface, borderRadius: 14,
      borderWidth: 1, borderColor: t.heroSurfaceBorder, overflow: 'hidden',
    },
    gridFila: { flexDirection: 'row' },
    gridCelda: { flex: 1, padding: 14, gap: 4 },
    gridDivV: { width: 1, backgroundColor: t.heroSurfaceBorder, marginVertical: 10 },
    gridDivH: { height: 1, backgroundColor: t.heroSurfaceBorder, marginHorizontal: 10 },
    gridLabel: { fontSize: 11, color: t.heroTextMuted, fontWeight: '600', letterSpacing: 0.2 },
    gridMonto: { fontSize: 17, fontWeight: '800', color: t.heroText, letterSpacing: -0.5 },

    metricaLabelSolo: { fontSize: 12, color: t.heroTextMuted, fontWeight: '600', marginBottom: 4 },
    metricaMontoGrande: { fontSize: 38, fontWeight: '800', color: t.heroText, letterSpacing: -1.5 },

    balanceRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    balancePill: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: t.heroSurface, borderWidth: 1, borderColor: t.heroSurfaceBorder,
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    },
    balanceDot: { width: 6, height: 6, borderRadius: 3 },
    balanceLabel: { fontSize: 12, color: t.heroTextMuted, fontWeight: '600' },
    balanceMonto: { fontSize: 14, fontWeight: '800' },
    sinDatos: { color: t.heroTextMuted, fontSize: 13, textAlign: 'center' },
    comparativaRow: { alignItems: 'flex-start' },
    comparativaPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    comparativaTexto: { fontSize: 12, fontWeight: '700' },

    // Secciones
    seccion: { backgroundColor: t.surface, borderRadius: 18, padding: 20 },
    tituloSeccion: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 16, letterSpacing: -0.3 },
    separador: { height: 1, backgroundColor: t.border },

    // Filtros historial
    filtroScroll: { marginHorizontal: -20, marginBottom: 16 },
    filtroContenido: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
    filtroChip: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1, borderColor: t.chipInactiveBorder,
      backgroundColor: t.chipInactiveBg,
    },
    filtroChipActivo: { borderColor: 'transparent', backgroundColor: t.chipActiveBg },
    filtroChipTexto: { fontSize: 13, fontWeight: '600', color: t.chipInactiveText },
    filtroChipTextoActivo: { color: t.chipActiveText },

    // Presupuestos rediseñados
    presupuestoItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      gap: 8,
    },
    presupuestoTop: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    presupuestoNombre: {
      fontSize: 15, fontWeight: '700', color: t.text, flex: 1,
    },
    statusPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 20,
    },
    statusTexto: { fontSize: 11, fontWeight: '700' },
    presupuestoMontos: { flexDirection: 'row', alignItems: 'baseline', gap: 0 },
    presupuestoGastado: { fontSize: 20, fontWeight: '800', color: t.text, letterSpacing: -0.5 },
    presupuestoLimite: { fontSize: 13, color: t.textMuted, fontWeight: '400' },
    barraTrack: {
      height: 8, backgroundColor: t.border,
      borderRadius: 4, overflow: 'hidden',
    },
    barraFill: { height: 8, borderRadius: 4 },
    presupuestoCats: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2,
    },
    catTag: {
      backgroundColor: t.surfaceAlt,
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    catTagTexto: { fontSize: 11, color: t.textSecondary, fontWeight: '500' },

    // Estado vacío
    vacio: { alignItems: 'center', paddingVertical: 28, gap: 12 },
    textoVacio: { fontSize: 15, color: t.textMuted, textAlign: 'center' },
    botonPrimero: {
      backgroundColor: t.primary,
      paddingHorizontal: 20, paddingVertical: 11,
      borderRadius: 12, marginTop: 4,
    },
    textoBotonPrimero: { color: t.heroText, fontWeight: '700', fontSize: 14 },

    // FAB
    fabBackdrop: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    fab: {
      position: 'absolute',
      bottom: fabBottom, right: TAB_BAR_MARGIN,
      width: 56, height: 56,
      borderRadius: 18,
      backgroundColor: t.primary,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: t.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
      zIndex: 10,
    },
    fabItem: {
      position: 'absolute',
      bottom: fabBottom, right: TAB_BAR_MARGIN,
      flexDirection: 'row', alignItems: 'center', gap: 10,
      zIndex: 10,
    },
    fabItemBtn: {
      width: 48, height: 48, borderRadius: 15,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18, shadowRadius: 6, elevation: 5,
    },
    fabItemEmoji: { fontSize: 20 },
    fabItemLabel: {
      backgroundColor: t.surface,
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10, shadowRadius: 4, elevation: 3,
    },
    fabItemTexto: { fontSize: 13, fontWeight: '700', color: t.text },
  });
}
