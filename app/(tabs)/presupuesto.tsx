import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, SafeAreaView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useGrupoStore } from '@/store/grupoStore';
import { useCategoriaStore } from '@/store/categoriaStore';
import { usePresupuestos, type PresupuestoConGasto } from '@/hooks/usePresupuestos';
import { useGastos } from '@/hooks/useGastos';
import {
  crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto, type Presupuesto,
} from '@/lib/presupuestos';
import { formatearFechaRelativa } from '@/lib/gastos';
import { useMoneda } from '@/hooks/useMoneda';
import { getCategoriaEmoji, getCategoriaVisibles, getCategoriaColor } from '@/lib/categorias';
import type { Categoria, Database } from '@/types/database';
import { useTheme, type Theme } from '@/constants/theme';
import { useT } from '@/hooks/useT';

type Gasto = Database['public']['Tables']['expenses']['Row'];

// ─── helpers ───────────────────────────────────────────────────────────────

function colorEstado(porcentaje: number, primary: string) {
  if (porcentaje >= 100) return '#EF4444';
  if (porcentaje >= 80)  return '#F59E0B';
  return primary;
}

function badgeEstado(porcentaje: number, primary: string) {
  if (porcentaje >= 100) return { label: 'Superado', bg: '#FEE2E2', text: '#DC2626' };
  if (porcentaje >= 80)  return { label: `${Math.round(porcentaje)}%`, bg: '#FEF3C7', text: '#D97706' };
  return { label: `${Math.round(porcentaje)}%`, bg: primary + '18', text: primary };
}

// ─── Modal de detalle ───────────────────────────────────────────────────────

const TOP_CATEGORIAS = 4;

function ModalDetalle({
  presupuesto, gastos, porCategoria, config, visible, onCerrar, onEditar,
}: {
  presupuesto: PresupuestoConGasto | null;
  gastos: Gasto[];
  porCategoria: Record<string, number>;
  config: any;
  visible: boolean;
  onCerrar: () => void;
  onEditar: () => void;
}) {
  const t = useTheme();
  const { formatear } = useMoneda();
  const i18n = useT();
  const [verTodasCat, setVerTodasCat] = useState(false);

  if (!presupuesto) return null;

  const limite = Number(presupuesto.amount_limit);
  const gasto = presupuesto.gastoActual;
  const porcentaje = limite > 0 ? (gasto / limite) * 100 : 0;
  const restante = limite - gasto;
  const color = colorEstado(porcentaje, t.primary);
  const badge = badgeEstado(porcentaje, t.primary);

  const desgloseCompleto = presupuesto.categories
    .map((cat) => ({ cat, monto: porCategoria[cat] ?? 0 }))
    .filter((d) => d.monto > 0)
    .sort((a, b) => b.monto - a.monto);
  const desglose = verTodasCat ? desgloseCompleto : desgloseCompleto.slice(0, TOP_CATEGORIAS);
  const hayMas = desgloseCompleto.length > TOP_CATEGORIAS;

  const catSet = new Set(presupuesto.categories);
  const transacciones = gastos
    .filter((g) => (!g.tipo || g.tipo === 'gasto') && catSet.has(g.category))
    .slice(0, 10);

  const det = makeDetStyles(t);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={det.safe}>
        <View style={det.header}>
          <TouchableOpacity onPress={onCerrar} style={det.headerBtn} activeOpacity={0.7}>
            <Text style={det.headerBtnTexto}>✕</Text>
          </TouchableOpacity>
          <Text style={det.headerTitulo}>{presupuesto.name}</Text>
          <TouchableOpacity onPress={onEditar} style={det.headerBtn} activeOpacity={0.7}>
            <Text style={[det.headerBtnTexto, { color: t.primary }]}>Editar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={det.contenido}>
          <View style={[det.tarjetaProgreso, { backgroundColor: t.badgeGrupoBg }]}>
            <View style={det.montoRow}>
              <Text style={[det.montoGasto, { color }]}>{formatear(gasto)}</Text>
              <View style={[det.badge, { backgroundColor: badge.bg }]}>
                <Text style={[det.badgeTexto, { color: badge.text }]}>
                  {badge.label === 'Superado' ? i18n.superado : badge.label}
                </Text>
              </View>
            </View>
            <Text style={det.montoLimite}>{i18n.dePresupuestados(formatear(limite))}</Text>

            <View style={det.barraFondo}>
              <View style={[det.barraRelleno, { width: `${Math.min(porcentaje, 100)}%`, backgroundColor: color }]} />
            </View>

            <Text style={[det.restanteTexto, { color: restante >= 0 ? t.textSecondary : '#EF4444' }]}>
              {restante >= 0
                ? i18n.teQuedan(formatear(restante))
                : i18n.excedisteLimite(formatear(Math.abs(restante)))}
            </Text>
          </View>

          {desglose.length > 0 && (
            <View style={det.seccion}>
              <Text style={det.seccionTitulo}>Por categoría</Text>
              {desglose.map(({ cat, monto }) => {
                const pct = gasto > 0 ? (monto / gasto) * 100 : 0;
                const catColor = getCategoriaColor(cat, config);
                return (
                  <View key={cat} style={det.categoriaFila}>
                    <View style={det.categoriaEncabezado}>
                      <Text style={det.categoriaLabel}>{getCategoriaEmoji(cat, config)} {cat}</Text>
                      <View style={det.categoriaRight}>
                        <Text style={det.categoriaMonto}>{formatear(monto)}</Text>
                        <Text style={det.categoriaPct}>{Math.round(pct)}%</Text>
                      </View>
                    </View>
                    <View style={det.catBarraFondo}>
                      <View style={[det.catBarraRelleno, { width: `${pct}%`, backgroundColor: catColor }]} />
                    </View>
                  </View>
                );
              })}

              {hayMas && (
                <TouchableOpacity onPress={() => setVerTodasCat((v) => !v)} activeOpacity={0.7} style={det.verMasBtn}>
                  <Text style={[det.verMasTexto, { color: t.primary }]}>
                    {verTodasCat ? 'Ver menos' : `Ver todas (${desgloseCompleto.length})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {desglose.length === 0 && (
            <View style={det.vacioCategorias}>
              <Text style={det.vacioEmoji}>💤</Text>
              <Text style={det.vacioTexto}>Sin gastos en estas categorías este mes.</Text>
            </View>
          )}

          {transacciones.length > 0 && (
            <View style={det.seccion}>
              <Text style={det.seccionTitulo}>Últimas transacciones</Text>
              {transacciones.map((g, i) => (
                <View key={g.id} style={[det.txFila, i > 0 && det.txSeparador]}>
                  <Text style={det.txEmoji}>{getCategoriaEmoji(g.category, config)}</Text>
                  <View style={det.txInfo}>
                    <Text style={det.txDesc} numberOfLines={1}>{g.description || g.category}</Text>
                    <Text style={det.txFecha}>
                      {formatearFechaRelativa(g.date)}
                    </Text>
                  </View>
                  <Text style={det.txMonto}>−{formatear(Number(g.amount))}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal de formulario ────────────────────────────────────────────────────

function mesDesdeFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

function labelFecha(fecha: Date): string {
  return formatearFechaRelativa(fecha.toISOString().split('T')[0]);
}

function ModalForm({
  visible, modo, presupuesto, config, categoriasVisibles,
  onCerrar, onEliminar, onGuardado, contextoId, userId,
}: {
  visible: boolean;
  modo: 'nuevo' | 'editar';
  presupuesto: Presupuesto | null;
  config: any;
  categoriasVisibles: Categoria[];
  onCerrar: () => void;
  onEliminar: () => void;
  onGuardado: () => void;
  contextoId: string;
  userId: string;
}) {
  const t = useTheme();
  const [nombre, setNombre] = useState('');
  const [limite, setLimite] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [calVisible, setCalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const handleOpen = useCallback(() => {
    if (presupuesto && modo === 'editar') {
      setNombre(presupuesto.name);
      setLimite(String(presupuesto.amount_limit));
      setCategorias(presupuesto.categories);
    } else {
      setNombre(''); setLimite(''); setCategorias([...categoriasVisibles]); setFechaInicio(new Date());
    }
  }, [presupuesto, modo, categoriasVisibles]);

  function toggleCat(cat: Categoria) {
    setCategorias((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function guardar() {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) { Alert.alert('Falta el nombre', 'Dale un nombre al presupuesto.'); return; }
    const limiteNum = parseFloat(limite.replace(/\./g, '').replace(',', '.'));
    if (isNaN(limiteNum) || limiteNum <= 0) { Alert.alert('Monto inválido', 'Ingresá un número mayor a cero.'); return; }
    if (categorias.length === 0) { Alert.alert('Sin categorías', 'Seleccioná al menos una categoría.'); return; }

    setGuardando(true);
    try {
      if (modo === 'nuevo') {
        await crearPresupuesto(contextoId, userId, nombreTrim, limiteNum, categorias, mesDesdeFecha(fechaInicio));
      } else if (presupuesto) {
        await actualizarPresupuesto(presupuesto.id, nombreTrim, limiteNum, categorias);
      }
      onGuardado();
    } catch (e: any) {
      if (e?.code === '23505' || e?.message?.includes('unique')) {
        Alert.alert('Ya existe', `Ya tenés un presupuesto llamado "${nombre.trim()}" para ese mes.`);
      } else {
        Alert.alert('Error', e.message ?? 'No se pudo guardar.');
      }
    } finally {
      setGuardando(false);
    }
  }

  const labelCategorias = categorias.length === 0
    ? 'Ninguna seleccionada'
    : `${categorias.length} categoría${categorias.length > 1 ? 's' : ''}`;

  const frm = makeFormStyles(t);
  const pkr = makePickerStyles(t);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={handleOpen}>
      <SafeAreaView style={frm.safe}>
        <View style={frm.header}>
          <TouchableOpacity onPress={onCerrar} style={frm.headerBtn} activeOpacity={0.7}>
            <Text style={frm.headerCerrar}>✕</Text>
          </TouchableOpacity>
          <Text style={frm.headerTitulo}>
            {modo === 'nuevo' ? 'Nuevo presupuesto' : 'Editar presupuesto'}
          </Text>
          {modo === 'editar' ? (
            <TouchableOpacity onPress={onEliminar} style={frm.headerBtn} activeOpacity={0.7}>
              <Text style={frm.headerEliminar}>🗑️</Text>
            </TouchableOpacity>
          ) : (
            <View style={frm.headerBtn} />
          )}
        </View>

        <ScrollView contentContainerStyle={frm.contenido} keyboardShouldPersistTaps="handled">
          <View style={frm.grupo}>
            <View style={frm.fila}>
              <View style={[frm.icono, { backgroundColor: t.badgeGrupoBg }]}>
                <Text style={frm.iconoEmoji}>🏷️</Text>
              </View>
              <View style={frm.filaContenido}>
                <Text style={frm.filaLabel}>Nombre del presupuesto</Text>
                <TextInput
                  style={frm.filaInput}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ej: Hogar, Ocio, Viaje..."
                  placeholderTextColor={t.textMuted}
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          <View style={frm.grupo}>
            <View style={frm.fila}>
              <View style={[frm.icono, { backgroundColor: t.positive + '14' }]}>
                <Text style={frm.iconoEmoji}>💵</Text>
              </View>
              <View style={frm.filaContenido}>
                <Text style={frm.filaLabel}>Límite mensual</Text>
                <View style={frm.filaInputRow}>
                  <TextInput
                    style={[frm.filaInput, { flex: 1 }]}
                    value={limite}
                    onChangeText={setLimite}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={t.textMuted}
                    returnKeyType="done"
                  />
                  <Text style={frm.moneda}>ARS</Text>
                </View>
              </View>
            </View>
          </View>

          {modo === 'nuevo' && (
            <>
              <TouchableOpacity style={frm.grupo} onPress={() => setCalVisible(true)} activeOpacity={0.7}>
                <View style={frm.fila}>
                  <View style={[frm.icono, { backgroundColor: t.negative + '14' }]}>
                    <Text style={frm.iconoEmoji}>📅</Text>
                  </View>
                  <View style={frm.filaContenido}>
                    <Text style={frm.filaLabel}>Fecha de inicio</Text>
                    <Text style={frm.filaValor}>{labelFecha(fechaInicio)}</Text>
                  </View>
                  <Text style={frm.chevron}>›</Text>
                </View>
              </TouchableOpacity>

              {calVisible && Platform.OS === 'android' && (
                <DateTimePicker
                  value={fechaInicio}
                  mode="date"
                  display="default"
                  onChange={(_, d) => { setCalVisible(false); if (d) setFechaInicio(d); }}
                />
              )}
              {calVisible && Platform.OS === 'ios' && (
                <Modal transparent animationType="slide" visible onRequestClose={() => setCalVisible(false)}>
                  <TouchableOpacity style={frm.calFondo} activeOpacity={1} onPress={() => setCalVisible(false)} />
                  <View style={[frm.calPanel, { backgroundColor: t.surface }]}>
                    <View style={[frm.calHeader, { borderBottomColor: t.border }]}>
                      <TouchableOpacity onPress={() => setCalVisible(false)}>
                        <Text style={[frm.calCancelar, { color: t.textMuted }]}>Cancelar</Text>
                      </TouchableOpacity>
                      <Text style={[frm.calTitulo, { color: t.text }]}>Fecha de inicio</Text>
                      <TouchableOpacity onPress={() => setCalVisible(false)}>
                        <Text style={[frm.calListo, { color: t.primary }]}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={fechaInicio}
                      mode="date"
                      display="spinner"
                      onChange={(_, d) => { if (d) setFechaInicio(d); }}
                      locale="es-AR"
                      style={{ width: '100%' }}
                    />
                  </View>
                </Modal>
              )}
            </>
          )}

          <TouchableOpacity style={frm.grupo} onPress={() => setPickerVisible(true)} activeOpacity={0.7}>
            <View style={frm.fila}>
              <View style={[frm.icono, { backgroundColor: t.accentBg }]}>
                <Text style={frm.iconoEmoji}>📋</Text>
              </View>
              <View style={frm.filaContenido}>
                <Text style={frm.filaLabel}>Categorías</Text>
                <Text style={[frm.filaValor, categorias.length === 0 && { color: t.textMuted }]}>
                  {labelCategorias}
                </Text>
              </View>
              <Text style={frm.chevron}>›</Text>
            </View>
            {categorias.length > 0 && (
              <View style={frm.categoriasPills}>
                {categorias.slice(0, 3).map((c) => (
                  <View key={c} style={frm.pill}>
                    <Text style={frm.pillTexto}>{getCategoriaEmoji(c, config)} {c}</Text>
                  </View>
                ))}
                {categorias.length > 3 && (
                  <View style={[frm.pill, { backgroundColor: t.badgeGrupoBg }]}>
                    <Text style={[frm.pillTexto, { color: t.primary, fontWeight: '700' }]}>+{categorias.length - 3} más</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[frm.botonGuardar, guardando && { opacity: 0.6 }]}
            onPress={guardar}
            disabled={guardando}
            activeOpacity={0.8}
          >
            <Text style={frm.botonGuardarTexto}>
              {guardando ? 'Guardando...' : modo === 'nuevo' ? 'Crear presupuesto' : 'Guardar cambios'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={pkr.safe}>
          <View style={pkr.header}>
            <View style={{ width: 60 }} />
            <Text style={pkr.titulo}>Categorías</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)} style={pkr.listo} activeOpacity={0.7}>
              <Text style={[pkr.listoTexto, { color: t.primary }]}>Listo</Text>
            </TouchableOpacity>
          </View>
          <View style={pkr.subtituloRow}>
            <Text style={pkr.subtitulo}>
              {categorias.length === 0 ? 'Seleccioná las categorías que cubre este presupuesto' : `${categorias.length} seleccionada${categorias.length > 1 ? 's' : ''}`}
            </Text>
            <TouchableOpacity
              onPress={() => setCategorias(categorias.length === categoriasVisibles.length ? [] : [...categoriasVisibles])}
              activeOpacity={0.7}
            >
              <Text style={[pkr.botonTodas, { color: t.primary }]}>
                {categorias.length === categoriasVisibles.length ? 'Quitar todas' : 'Seleccionar todas'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={pkr.grid}>
            {categoriasVisibles.map((cat) => {
              const sel = categorias.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[pkr.chip, sel && { borderColor: t.primary, backgroundColor: t.badgeGrupoBg }]}
                  onPress={() => toggleCat(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={pkr.chipEmoji}>{getCategoriaEmoji(cat, config)}</Text>
                  <Text style={[pkr.chipTexto, sel && { color: t.primary, fontWeight: '700' }]}>{cat}</Text>
                  {sel && <Text style={[pkr.check, { color: t.primary }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}

// ─── Pantalla principal ─────────────────────────────────────────────────────

export default function PantallaPresupuesto() {
  const t = useTheme();
  const { formatear } = useMoneda();
  const i18n = useT();
  const usuario = useAuthStore((s) => s.usuario);
  const contextoId = useGrupoStore((s) => s.contextoId);
  const setContexto = useGrupoStore((s) => s.setContexto);
  const grupos = useGrupoStore((s) => s.grupos);
  const config = useCategoriaStore((s) => s.config);

  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detallePresupuesto, setDetallePresupuesto] = useState<PresupuestoConGasto | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formModo, setFormModo] = useState<'nuevo' | 'editar'>('nuevo');
  const [formPresupuesto, setFormPresupuesto] = useState<Presupuesto | null>(null);

  const { gastos, porCategoria } = useGastos(contextoId);
  const { presupuestosConGasto, cargando, recargar } = usePresupuestos(contextoId, 0, porCategoria);

  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));

  const esContextoPersonal = contextoId === 'personal';
  const grupoActivo = grupos.find((g) => g.grupo.id === contextoId)?.grupo ?? null;
  const rolEnGrupo = grupos.find((g) => g.grupo.id === contextoId)?.rol ?? null;
  const puedeEditar = esContextoPersonal || rolEnGrupo === 'admin';
  const categoriasVisibles = getCategoriaVisibles(config) as Categoria[];

  function abrirNuevo() { setFormModo('nuevo'); setFormPresupuesto(null); setFormVisible(true); }
  function abrirEditar(p: Presupuesto) { setDetalleVisible(false); setFormModo('editar'); setFormPresupuesto(p); setFormVisible(true); }
  function abrirDetalle(p: PresupuestoConGasto) { setDetallePresupuesto(p); setDetalleVisible(true); }

  async function handleEliminar(p: Presupuesto) {
    Alert.alert('Eliminar presupuesto', `¿Eliminar "${p.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await eliminarPresupuesto(p.id);
            setFormVisible(false);
            setDetalleVisible(false);
            await recargar();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'No se pudo eliminar.');
          }
        },
      },
    ]);
  }

  const titulo = esContextoPersonal ? 'Presupuestos' : grupoActivo?.name ?? 'Presupuestos';
  const pant = makePantStyles(t);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={pant.scroll} contentContainerStyle={pant.contenido}>
        <View style={pant.encabezado}>
          <View>
            <Text style={pant.titulo}>{titulo}</Text>
            <Text style={pant.subtitulo}>
              {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {grupos.length > 0 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={pant.contextoScroll} contentContainerStyle={pant.contextoContenido}
          >
            <TouchableOpacity
              style={[pant.contextoChip, esContextoPersonal && pant.contextoChipActivo]}
              onPress={() => setContexto('personal')} activeOpacity={0.7}
            >
              <Text style={[pant.contextoChipTexto, esContextoPersonal && pant.contextoChipTextoActivo]}>
                👤 Personal
              </Text>
            </TouchableOpacity>
            {grupos.map(({ grupo }) => (
              <TouchableOpacity
                key={grupo.id}
                style={[pant.contextoChip, contextoId === grupo.id && pant.contextoChipActivo]}
                onPress={() => setContexto(grupo.id)} activeOpacity={0.7}
              >
                <Text style={[pant.contextoChipTexto, contextoId === grupo.id && pant.contextoChipTextoActivo]}>
                  👥 {grupo.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {!puedeEditar && (
          <View style={pant.aviso}>
            <Text style={pant.avisoTexto}>Solo el administrador puede modificar presupuestos.</Text>
          </View>
        )}

        {cargando ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={t.primary} />
        ) : presupuestosConGasto.length === 0 ? (
          <View style={pant.vacio}>
            <Text style={pant.vacioEmoji}>🎯</Text>
            <Text style={pant.vacioTitulo}>Sin presupuestos</Text>
            <Text style={pant.vacioTexto}>
              {puedeEditar
                ? 'Creá un presupuesto para agrupar categorías y controlar cuánto gastás en ellas.'
                : 'No hay presupuestos configurados este mes.'}
            </Text>
            {puedeEditar && (
              <TouchableOpacity style={pant.botonPrimero} onPress={abrirNuevo} activeOpacity={0.8}>
                <Text style={pant.botonPrimeroTexto}>Crear primer presupuesto</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={pant.lista}>
            {presupuestosConGasto.map((p) => {
              const limite = Number(p.amount_limit);
              const pct = limite > 0 ? Math.min((p.gastoActual / limite) * 100, 100) : 0;
              const color = colorEstado(pct, t.primary);
              const badge = badgeEstado(pct, t.primary);
              const restante = limite - p.gastoActual;

              return (
                <TouchableOpacity
                  key={p.id}
                  style={pant.tarjeta}
                  onPress={() => abrirDetalle(p)}
                  activeOpacity={0.85}
                >
                  <View style={pant.tarjetaTop}>
                    <Text style={pant.tarjetaNombre}>{p.name}</Text>
                    <View style={[pant.tarjetaBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[pant.tarjetaBadgeTexto, { color: badge.text }]}>
                        {badge.label === 'Superado' ? i18n.superado : badge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={pant.tarjetaMontos}>
                    <Text style={[pant.tarjetaGasto, { color }]}>{formatear(p.gastoActual)}</Text>
                    <Text style={pant.tarjetaLimite}> / {formatear(limite)}</Text>
                  </View>

                  <View style={pant.barraFondo}>
                    <View style={[pant.barraRelleno, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>

                  <Text style={[pant.tarjetaRestante, { color: restante >= 0 ? t.textMuted : '#EF4444' }]}>
                    {restante >= 0
                      ? i18n.disponibles(formatear(restante))
                      : i18n.sobreLimite(formatear(Math.abs(restante)))}
                  </Text>

                  <View style={pant.chips}>
                    {p.categories.slice(0, 4).map((cat) => (
                      <View key={cat} style={pant.chip}>
                        <Text style={pant.chipTexto}>{getCategoriaEmoji(cat, config)} {cat}</Text>
                      </View>
                    ))}
                    {p.categories.length > 4 && (
                      <View style={pant.chip}>
                        <Text style={pant.chipTexto}>+{p.categories.length - 4}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[pant.verResumen, { color: t.primary }]}>Ver resumen →</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {puedeEditar && presupuestosConGasto.length > 0 && (
        <TouchableOpacity style={[pant.fab, { backgroundColor: t.primary, shadowColor: t.primary }]} onPress={abrirNuevo} activeOpacity={0.85}>
          <Text style={pant.fabTexto}>+</Text>
        </TouchableOpacity>
      )}

      <ModalDetalle
        presupuesto={detallePresupuesto} gastos={gastos} porCategoria={porCategoria}
        config={config} visible={detalleVisible}
        onCerrar={() => setDetalleVisible(false)}
        onEditar={() => puedeEditar && detallePresupuesto && abrirEditar(detallePresupuesto)}
      />

      <ModalForm
        visible={formVisible} modo={formModo} presupuesto={formPresupuesto}
        config={config} categoriasVisibles={categoriasVisibles}
        onCerrar={() => setFormVisible(false)}
        onEliminar={() => formPresupuesto && handleEliminar(formPresupuesto)}
        onGuardado={async () => { setFormVisible(false); await recargar(); }}
        contextoId={contextoId} userId={usuario?.id ?? ''}
      />
    </View>
  );
}

// ─── Estilos por sección ────────────────────────────────────────────────────

function makePantStyles(t: Theme) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: t.bg },
    contenido: { padding: 20, paddingTop: 56, paddingBottom: 110, gap: 20 },
    encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titulo: { fontSize: 26, fontWeight: '800', color: t.text },
    subtitulo: { fontSize: 13, color: t.textMuted, fontWeight: '500', marginTop: 2, textTransform: 'capitalize' },
    fab: {
      position: 'absolute', bottom: 100, right: 20,
      width: 56, height: 56, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    fabTexto: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
    contextoScroll: { marginHorizontal: -20 },
    contextoContenido: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
    contextoChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
    contextoChipActivo: { borderColor: t.primary, backgroundColor: t.primary },
    contextoChipTexto: { fontSize: 13, fontWeight: '600', color: t.textSecondary },
    contextoChipTextoActivo: { color: '#fff' },
    aviso: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12 },
    avisoTexto: { fontSize: 13, color: '#92400E', fontWeight: '500' },
    vacio: { alignItems: 'center', paddingVertical: 56, gap: 10 },
    vacioEmoji: { fontSize: 52 },
    vacioTitulo: { fontSize: 18, fontWeight: '700', color: t.text },
    vacioTexto: { fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 },
    botonPrimero: { backgroundColor: t.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14, marginTop: 8 },
    botonPrimeroTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
    lista: { gap: 14 },
    tarjeta: {
      backgroundColor: t.surface, borderRadius: 20, padding: 20, gap: 10,
      shadowColor: t.primary, shadowOpacity: 0.08, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    tarjetaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tarjetaNombre: { fontSize: 17, fontWeight: '700', color: t.text },
    tarjetaBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    tarjetaBadgeTexto: { fontSize: 12, fontWeight: '700' },
    tarjetaMontos: { flexDirection: 'row', alignItems: 'baseline' },
    tarjetaGasto: { fontSize: 24, fontWeight: '800' },
    tarjetaLimite: { fontSize: 14, color: t.textMuted, fontWeight: '500' },
    barraFondo: { height: 10, backgroundColor: t.border, borderRadius: 5, overflow: 'hidden' },
    barraRelleno: { height: 10, borderRadius: 5 },
    tarjetaRestante: { fontSize: 12, fontWeight: '500' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { backgroundColor: t.surfaceAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    chipTexto: { fontSize: 12, color: t.textSecondary, fontWeight: '500' },
    verResumen: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  });
}

function makeDetStyles(t: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.border, backgroundColor: t.surface },
    headerBtn: { width: 60 },
    headerBtnTexto: { fontSize: 16, color: t.textMuted, fontWeight: '600' },
    headerTitulo: { fontSize: 17, fontWeight: '700', color: t.text },
    contenido: { padding: 20, gap: 20, paddingBottom: 48 },
    tarjetaProgreso: { borderRadius: 20, padding: 20, gap: 12 },
    montoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    montoGasto: { fontSize: 30, fontWeight: '800' },
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    badgeTexto: { fontSize: 13, fontWeight: '700' },
    montoLimite: { fontSize: 14, color: t.textSecondary, fontWeight: '500' },
    barraFondo: { height: 12, backgroundColor: t.border, borderRadius: 6, overflow: 'hidden' },
    barraRelleno: { height: 12, borderRadius: 6 },
    restanteTexto: { fontSize: 13, fontWeight: '600' },
    seccion: { backgroundColor: t.surface, borderRadius: 16, padding: 18, gap: 0, shadowColor: t.primary, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    seccionTitulo: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 14 },
    categoriaFila: { gap: 6, marginBottom: 14 },
    categoriaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    categoriaLabel: { fontSize: 14, color: t.text, fontWeight: '500' },
    categoriaRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    categoriaMonto: { fontSize: 13, fontWeight: '700', color: t.text },
    categoriaPct: { fontSize: 12, color: t.textMuted, fontWeight: '500', width: 32, textAlign: 'right' },
    catBarraFondo: { height: 6, backgroundColor: t.border, borderRadius: 3, overflow: 'hidden' },
    catBarraRelleno: { height: 6, borderRadius: 3 },
    verMasBtn: { marginTop: 4, paddingVertical: 6 },
    verMasTexto: { fontSize: 13, fontWeight: '600' },
    vacioCategorias: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    vacioEmoji: { fontSize: 40 },
    vacioTexto: { fontSize: 14, color: t.textMuted, textAlign: 'center' },
    txFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    txSeparador: { borderTopWidth: 1, borderTopColor: t.border },
    txEmoji: { fontSize: 22, width: 36, textAlign: 'center' },
    txInfo: { flex: 1 },
    txDesc: { fontSize: 14, fontWeight: '600', color: t.text },
    txFecha: { fontSize: 12, color: t.textMuted, marginTop: 2, textTransform: 'capitalize' },
    txMonto: { fontSize: 14, fontWeight: '700', color: t.text },
  });
}

function makeFormStyles(t: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border },
    headerBtn: { width: 60 },
    headerCerrar: { fontSize: 18, color: t.textMuted, fontWeight: '600' },
    headerTitulo: { fontSize: 17, fontWeight: '700', color: t.text, textAlign: 'center' },
    headerEliminar: { fontSize: 20, textAlign: 'right' },
    contenido: { padding: 20, gap: 12, paddingBottom: 48 },
    grupo: {
      backgroundColor: t.surface, borderRadius: 16, overflow: 'hidden',
      shadowColor: t.primary, shadowOpacity: 0.04, shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 }, elevation: 1,
    },
    fila: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 14 },
    icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    iconoEmoji: { fontSize: 20 },
    filaContenido: { flex: 1, gap: 4 },
    filaLabel: { fontSize: 12, fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    filaInput: { fontSize: 16, color: t.text, fontWeight: '500', paddingVertical: 0 },
    filaInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filaValor: { fontSize: 16, color: t.text, fontWeight: '500' },
    moneda: { fontSize: 14, color: t.textMuted, fontWeight: '600' },
    chevron: { fontSize: 22, color: t.textMuted, alignSelf: 'center' },
    categoriasPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
    pill: { backgroundColor: t.surfaceAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    pillTexto: { fontSize: 12, color: t.textSecondary, fontWeight: '500' },
    calFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
    calPanel: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
    calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    calTitulo: { fontSize: 15, fontWeight: '700' },
    calCancelar: { fontSize: 15 },
    calListo: { fontSize: 15, fontWeight: '700' },
    botonGuardar: { backgroundColor: t.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
    botonGuardarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  });
}

function makePickerStyles(t: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.surface },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.border },
    titulo: { fontSize: 17, fontWeight: '700', color: t.text },
    listo: { width: 60, alignItems: 'flex-end' },
    listoTexto: { fontSize: 16, fontWeight: '700' },
    subtituloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
    subtitulo: { fontSize: 13, color: t.textMuted, flex: 1 },
    botonTodas: { fontSize: 13, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10, paddingBottom: 48 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 14, paddingVertical: 9,
      borderRadius: 24, borderWidth: 1.5, borderColor: t.border,
      backgroundColor: t.surfaceAlt,
    },
    chipEmoji: { fontSize: 16 },
    chipTexto: { fontSize: 13, color: t.textSecondary, fontWeight: '500' },
    check: { fontSize: 13, fontWeight: '800', marginLeft: 2 },
  });
}
