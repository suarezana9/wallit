import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Alert, ActivityIndicator,
  Switch, Animated, Dimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { SelectorFecha } from './SelectorFecha';
import { TecladoCalculadora } from './TecladoCalculadora';
import { supabase } from '@/lib/supabase';
import { formatearFechaRelativa } from '@/lib/gastos';
import { parsearTexto, parsearImagen, transcribirAudio } from '@/lib/ia';
import { getCategoriaEmoji, getCategoriaVisibles } from '@/lib/categorias';
import { useAuthStore } from '@/store/authStore';
import { useGrupoStore } from '@/store/grupoStore';
import { useCategoriaStore } from '@/store/categoriaStore';
import { useNuevoMovimientoStore } from '@/store/nuevoMovimientoStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useTheme } from '@/constants/theme';
import type { Categoria, TipoMovimiento, FuenteIngreso } from '@/types/database';

const { height: SCREEN_H } = Dimensions.get('window');
const OPCION_PERSONAL = '__personal__';

const TIPOS_DEF: { id: TipoMovimiento; emoji: string; label: string }[] = [
  { id: 'gasto',     emoji: '💸', label: 'Gasto'     },
  { id: 'ingreso',   emoji: '💰', label: 'Ingreso'   },
  { id: 'ahorro',    emoji: '🏦', label: 'Ahorro'    },
  { id: 'inversion', emoji: '📈', label: 'Inversión' },
];

const FUENTES: { id: FuenteIngreso; emoji: string; label: string }[] = [
  { id: 'sueldo',    emoji: '💼', label: 'Sueldo'    },
  { id: 'freelance', emoji: '💻', label: 'Freelance' },
  { id: 'alquiler',  emoji: '🏠', label: 'Alquiler'  },
  { id: 'otro',      emoji: '💵', label: 'Otro'      },
];

export function ModalNuevoMovimiento() {
  const t = useTheme();
  const idioma = usePreferencesStore((s) => s.idioma);
  const moneda = usePreferencesStore((s) => s.moneda);
  const { isOpen, tipoInicial, cerrar } = useNuevoMovimientoStore();
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGrupoStore((s) => s.grupos);
  const catConfig = useCategoriaStore((s) => s.config);
  const categorias = getCategoriaVisibles(catConfig);

  const TIPO_COLOR: Record<TipoMovimiento, string> = {
    gasto: t.primary, ingreso: t.tipoIngreso, ahorro: t.tipoAhorro, inversion: t.tipoInversion,
  };

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (isOpen) {
      resetForm();
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H, duration: 260, useNativeDriver: true,
      }).start();
    }
  }, [isOpen]);

  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>('gasto');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Otros');
  const [fuente, setFuente] = useState<FuenteIngreso>('sueldo');
  const [fecha, setFecha] = useState(new Date());
  const [esPrivado, setEsPrivado] = useState(false);
  const [destinoId, setDestinoId] = useState(OPCION_PERSONAL);
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [mostrarTeclado, setMostrarTeclado] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [procesandoTipo, setProcesandoTipo] = useState<'foto' | 'voz' | 'texto' | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [grabacion, setGrabacion] = useState<Audio.Recording | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [iaDetecto, setIaDetecto] = useState(false);
  const [yaGuardado, setYaGuardado] = useState(false);

  function resetForm() {
    setTipoMovimiento(tipoInicial);
    setMonto('');
    setDescripcion('');
    setCategoria((categorias.includes('Otros') ? 'Otros' : (categorias[0] ?? 'Otros')) as Categoria);
    setFuente('sueldo');
    setFecha(new Date());
    setEsPrivado(false);
    setIaDetecto(false);
    setYaGuardado(false);
    setMostrarFecha(false);
    const ctx = useGrupoStore.getState().contextoId;
    setDestinoId(ctx !== 'personal' ? ctx : OPCION_PERSONAL);
  }

  useEffect(() => {
    if (isOpen) setTipoMovimiento(tipoInicial);
  }, [tipoInicial, isOpen]);

  function normalizarFecha(raw: string): string {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {}
    return new Date().toISOString().split('T')[0];
  }

  function aplicarParsed(parsed: { monto: number | null; descripcion: string; categoria: Categoria; fecha: string; tipo: TipoMovimiento; fuente: FuenteIngreso | null }) {
    if (parsed.monto) setMonto(String(parsed.monto));
    if (parsed.descripcion) setDescripcion(parsed.descripcion);
    if (parsed.tipo) setTipoMovimiento(parsed.tipo);
    if (parsed.tipo === 'gasto' && parsed.categoria) setCategoria(parsed.categoria);
    if (parsed.tipo === 'ingreso' && parsed.fuente) setFuente(parsed.fuente);
    if (parsed.fecha) setFecha(new Date(normalizarFecha(parsed.fecha) + 'T12:00:00'));
    setIaDetecto(true);
  }

  async function procesarImagen(origen: 'camara' | 'galeria') {
    if (origen === 'camara') {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) { Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara.'); return; }
    } else {
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) { Alert.alert('Permiso necesario', 'Necesitamos acceso a la galería.'); return; }
    }
    const res = origen === 'camara'
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (res.canceled || !res.assets[0].base64) return;
    setProcesandoTipo('foto'); setProcesando(true);
    try { aplicarParsed(await parsearImagen(res.assets[0].base64, idioma, moneda)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setProcesando(false); setProcesandoTipo(null); }
  }

  async function iniciarGrabacion() {
    const p = await Audio.requestPermissionsAsync();
    if (!p.granted) { Alert.alert('Permiso necesario', 'Necesitamos acceso al micrófono.'); return; }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync({
      android: { extension: '.wav', outputFormat: Audio.AndroidOutputFormat.DEFAULT, audioEncoder: Audio.AndroidAudioEncoder.DEFAULT, sampleRate: 16000, numberOfChannels: 1, bitRate: 128000 },
      ios: { extension: '.wav', outputFormat: Audio.IOSOutputFormat.LINEARPCM, audioQuality: Audio.IOSAudioQuality.HIGH, sampleRate: 16000, numberOfChannels: 1, bitRate: 128000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
      web: {},
    });
    setGrabacion(recording); setGrabando(true);
  }

  async function detenerGrabacion() {
    if (!grabacion) return;
    setGrabando(false); setProcesandoTipo('voz'); setProcesando(true);
    try {
      await grabacion.stopAndUnloadAsync();
      const uri = grabacion.getURI();
      setGrabacion(null);
      if (!uri) throw new Error('No se obtuvo URI del audio');
      aplicarParsed(await parsearTexto(await transcribirAudio(uri, idioma), idioma, moneda));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setProcesando(false); setProcesandoTipo(null); }
  }

  async function guardar() {
    if (!monto || Number(monto) <= 0) { Alert.alert('Falta el monto', 'Ingresá un monto válido.'); return; }
    if (!usuario) return;
    if (yaGuardado) {
      const label = TIPOS_DEF.find((tp) => tp.id === tipoMovimiento)?.label.toLowerCase() ?? 'movimiento';
      Alert.alert('Posible duplicado', `Este ${label} ya fue guardado. ¿Querés cargarlo de nuevo?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar igual', onPress: insertar },
      ]);
      return;
    }
    insertar();
  }

  async function insertar() {
    if (!usuario) return;
    setGuardando(true);
    const { error } = await supabase.from('expenses').insert({
      user_id: usuario.id,
      group_id: destinoId !== OPCION_PERSONAL ? destinoId : null,
      amount: Number(monto),
      category: tipoMovimiento === 'gasto' ? categoria : 'Otros',
      description: descripcion,
      date: fecha.toISOString().split('T')[0],
      is_private: tipoMovimiento === 'gasto' ? esPrivado : false,
      tipo: tipoMovimiento,
      fuente: tipoMovimiento === 'ingreso' ? fuente : null,
    });
    setGuardando(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setYaGuardado(true);
    cerrar();
  }

  const tipoActivo = TIPO_COLOR[tipoMovimiento];
  const s = makeStyles(t);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={cerrar}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={cerrar} />

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

          <View style={s.handleRow}><View style={s.handle} /></View>

          <View style={s.header}>
            <Text style={s.headerTitulo}>Nuevo movimiento</Text>
            <TouchableOpacity onPress={cerrar} activeOpacity={0.7}>
              <Text style={s.headerCerrar}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {iaDetecto && (
              <View style={[s.badgeIA, { backgroundColor: tipoActivo + '12' }]}>
                <Text style={[s.badgeIATexto, { color: tipoActivo }]}>✨ Completado por IA — revisá antes de guardar</Text>
              </View>
            )}

            {/* Botones IA */}
            <View style={s.iaRow}>
              <TouchableOpacity
                style={[s.iaBtn, grabando && { borderColor: t.negative, backgroundColor: t.negative + '10' }]}
                onPress={grabando ? detenerGrabacion : iniciarGrabacion}
                disabled={procesando && !grabando}
                activeOpacity={0.7}
              >
                {procesandoTipo === 'voz'
                  ? <ActivityIndicator color={t.primary} size="small" />
                  : <Text style={s.iaEmoji}>{grabando ? '⏹️' : '🎤'}</Text>
                }
                <Text style={[s.iaLabel, grabando && { color: t.negative }]}>{grabando ? 'Detener' : 'Voz'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.iaBtn}
                onPress={() => Alert.alert('Cargar comprobante', '', [
                  { text: '📸 Cámara', onPress: () => procesarImagen('camara') },
                  { text: '🖼️ Galería', onPress: () => procesarImagen('galeria') },
                  { text: 'Cancelar', style: 'cancel' },
                ])}
                disabled={procesando}
                activeOpacity={0.7}
              >
                {procesandoTipo === 'foto'
                  ? <ActivityIndicator color={t.primary} size="small" />
                  : <Text style={s.iaEmoji}>📸</Text>
                }
                <Text style={s.iaLabel}>Ticket</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.iaBtn}
                onPress={() => Alert.prompt(
                  '¿Qué movimiento fue?',
                  'Ej: cobré el sueldo 850000, gasté 1500 en nafta',
                  async (texto) => {
                    if (!texto?.trim()) return;
                    setProcesandoTipo('texto'); setProcesando(true);
                    try { aplicarParsed(await parsearTexto(texto, idioma, moneda)); }
                    catch (e: any) { Alert.alert('Error', e.message); }
                    finally { setProcesando(false); setProcesandoTipo(null); }
                  },
                  'plain-text'
                )}
                disabled={procesando}
                activeOpacity={0.7}
              >
                {procesandoTipo === 'texto'
                  ? <ActivityIndicator color={t.primary} size="small" />
                  : <Text style={s.iaEmoji}>✨</Text>
                }
                <Text style={s.iaLabel}>IA texto</Text>
              </TouchableOpacity>
            </View>

            {/* Tipo */}
            <View style={s.tipoRow}>
              {TIPOS_DEF.map((tp) => (
                <TouchableOpacity
                  key={tp.id}
                  style={[s.tipoPill, tipoMovimiento === tp.id && {
                    borderColor: TIPO_COLOR[tp.id],
                    backgroundColor: TIPO_COLOR[tp.id] + '16',
                  }]}
                  onPress={() => { setTipoMovimiento(tp.id); setEsPrivado(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.tipoEmoji}>{tp.emoji}</Text>
                  <Text style={[s.tipoLabel, tipoMovimiento === tp.id && { color: TIPO_COLOR[tp.id], fontWeight: '700' }]}>
                    {tp.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Monto */}
            <View style={s.campo}>
              <Text style={s.campoLabel}>MONTO</Text>
              <TouchableOpacity
                style={[s.montoArea, { borderColor: monto ? tipoActivo : t.border }]}
                onPress={() => setMostrarTeclado(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.montoSimbolo, { color: monto ? tipoActivo + '60' : t.textMuted }]}>$</Text>
                <Text style={[s.montoValor, { color: monto ? tipoActivo : t.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
                  {monto || '0,00'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Descripción */}
            <View style={s.campo}>
              <Text style={s.campoLabel}>DESCRIPCIÓN</Text>
              <TextInput
                style={s.input}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder={
                  tipoMovimiento === 'ingreso' ? 'Ej: sueldo julio, cobro proyecto...' :
                  tipoMovimiento === 'ahorro'  ? 'Ej: caja de ahorro, fondo emergencia...' :
                  tipoMovimiento === 'inversion' ? 'Ej: plazo fijo, acciones CEDEAR...' :
                  'Opcional'
                }
                placeholderTextColor={t.textMuted}
              />
            </View>

            {/* Categoría — solo gastos */}
            {tipoMovimiento === 'gasto' && (
              <View style={s.campo}>
                <Text style={s.campoLabel}>CATEGORÍA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipsScroll} style={s.chipsWrapper}>
                  {categorias.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.chip, categoria === cat && { borderColor: tipoActivo, backgroundColor: tipoActivo + '12' }]}
                      onPress={() => setCategoria(cat as Categoria)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.chipEmoji}>{getCategoriaEmoji(cat, catConfig)}</Text>
                      <Text style={[s.chipTexto, categoria === cat && { color: tipoActivo, fontWeight: '700' }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Fuente — solo ingresos */}
            {tipoMovimiento === 'ingreso' && (
              <View style={s.campo}>
                <Text style={s.campoLabel}>FUENTE</Text>
                <View style={s.fuenteGrid}>
                  {FUENTES.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[s.chip, fuente === f.id && { borderColor: tipoActivo, backgroundColor: tipoActivo + '12' }]}
                      onPress={() => setFuente(f.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.chipEmoji}>{f.emoji}</Text>
                      <Text style={[s.chipTexto, fuente === f.id && { color: tipoActivo, fontWeight: '700' }]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Fecha */}
            <View style={s.campo}>
              <Text style={s.campoLabel}>FECHA</Text>
              <TouchableOpacity style={s.fechaBtn} onPress={() => setMostrarFecha(true)} activeOpacity={0.7}>
                <Text style={s.fechaTexto}>📅  {formatearFechaRelativa(fecha.toISOString().split('T')[0])}</Text>
              </TouchableOpacity>
              <SelectorFecha fecha={fecha} visible={mostrarFecha} onChange={setFecha} onCerrar={() => setMostrarFecha(false)} />
            </View>

            {/* Destino — si hay grupos */}
            {grupos.length > 0 && (
              <View style={s.campo}>
                <Text style={s.campoLabel}>DÓNDE ANOTARLO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipsScroll} style={s.chipsWrapper}>
                  <TouchableOpacity
                    style={[s.chip, destinoId === OPCION_PERSONAL && { borderColor: t.primary, backgroundColor: t.primary + '12' }]}
                    onPress={() => { setDestinoId(OPCION_PERSONAL); setEsPrivado(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipTexto, destinoId === OPCION_PERSONAL && { color: t.primary, fontWeight: '700' }]}>👤 Personal</Text>
                  </TouchableOpacity>
                  {grupos.map(({ grupo }) => (
                    <TouchableOpacity
                      key={grupo.id}
                      style={[s.chip, destinoId === grupo.id && { borderColor: t.primary, backgroundColor: t.primary + '12' }]}
                      onPress={() => setDestinoId(grupo.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.chipTexto, destinoId === grupo.id && { color: t.primary, fontWeight: '700' }]}>👥 {grupo.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Solo yo */}
            {tipoMovimiento === 'gasto' && destinoId !== OPCION_PERSONAL && (
              <View style={s.switchFila}>
                <View>
                  <Text style={s.campoLabel}>🔒 SOLO YO</Text>
                  <Text style={s.switchDesc}>Los demás del grupo no lo ven</Text>
                </View>
                <Switch value={esPrivado} onValueChange={setEsPrivado} trackColor={{ true: t.primary }} thumbColor={t.surface} />
              </View>
            )}

            {/* Guardar */}
            <TouchableOpacity
              style={[s.btnGuardar, { backgroundColor: tipoActivo }, guardando && s.btnDeshabilitado]}
              onPress={guardar}
              disabled={guardando}
              activeOpacity={0.8}
            >
              {guardando
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnGuardarTexto}>
                    {tipoMovimiento === 'gasto' ? 'Guardar gasto' :
                     tipoMovimiento === 'ingreso' ? 'Registrar ingreso' :
                     tipoMovimiento === 'ahorro' ? 'Registrar ahorro' :
                     'Registrar inversión'}
                  </Text>
              }
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      <TecladoCalculadora
        visible={mostrarTeclado}
        valor={monto}
        color={tipoActivo}
        onCambio={setMonto}
        onCerrar={() => setMostrarTeclado(false)}
      />
    </Modal>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    backdrop: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height: SCREEN_H * 0.92,
      backgroundColor: t.bg,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    handleRow: { alignItems: 'center', paddingTop: 10 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.border },

    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: t.border,
    },
    headerTitulo: { fontSize: 17, fontWeight: '700', color: t.text },
    headerCerrar: { fontSize: 18, color: t.textMuted, fontWeight: '600', padding: 4 },

    contenido: { padding: 20, gap: 20, paddingBottom: 40 },

    badgeIA: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    badgeIATexto: { fontSize: 13, fontWeight: '600' },

    iaRow: { flexDirection: 'row', gap: 10 },
    iaBtn: {
      flex: 1, alignItems: 'center', gap: 5,
      backgroundColor: t.surface, borderRadius: 14, paddingVertical: 12,
      borderWidth: 1, borderColor: t.border,
    },
    iaEmoji: { fontSize: 20 },
    iaLabel: { fontSize: 11, fontWeight: '600', color: t.textSecondary },

    tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tipoPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 14, borderWidth: 1.5, borderColor: t.border,
      backgroundColor: t.surface, flex: 1, minWidth: '45%',
    },
    tipoEmoji: { fontSize: 15 },
    tipoLabel: { fontSize: 13, fontWeight: '600', color: t.textSecondary },

    campo: { gap: 8 },
    campoLabel: { fontSize: 11, fontWeight: '700', color: t.textMuted, letterSpacing: 0.5 },

    montoArea: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.surface, borderRadius: 16, padding: 16,
      borderWidth: 1.5, gap: 4,
    },
    montoSimbolo: { fontSize: 28, fontWeight: '300' },
    montoValor: { fontSize: 36, fontWeight: '800', letterSpacing: -1, flex: 1 },

    input: {
      backgroundColor: t.surface, borderRadius: 12,
      padding: 14, fontSize: 15, color: t.text,
      borderWidth: 1, borderColor: t.border,
    },

    chipsWrapper: { marginHorizontal: -20 },
    chipsScroll: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
    fuenteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1.5, borderColor: t.border,
      backgroundColor: t.surfaceAlt,
    },
    chipEmoji: { fontSize: 13 },
    chipTexto: { fontSize: 13, color: t.textSecondary, fontWeight: '500' },

    fechaBtn: {
      backgroundColor: t.surface, borderRadius: 12,
      padding: 14, borderWidth: 1, borderColor: t.border,
    },
    fechaTexto: { fontSize: 14, fontWeight: '600', color: t.text },

    switchFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchDesc: { fontSize: 11, color: t.textMuted, marginTop: 2 },

    btnGuardar: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 4 },
    btnDeshabilitado: { opacity: 0.45 },
    btnGuardarTexto: { color: '#fff', fontSize: 16, fontWeight: '800' },
  });
}
