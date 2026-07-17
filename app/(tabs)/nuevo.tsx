import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { SelectorFecha } from '@/components/ui/SelectorFecha';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { parsearTexto, parsearImagen, transcribirAudio } from '@/lib/ia';
import { getCategoriaEmoji, getCategoriaVisibles } from '@/lib/categorias';
import { useGrupoStore } from '@/store/grupoStore';
import { useCategoriaStore } from '@/store/categoriaStore';
import type { Categoria, TipoMovimiento, FuenteIngreso } from '@/types/database';

const OPCION_PERSONAL = '__personal__';

const FUENTES: { id: FuenteIngreso; emoji: string; label: string }[] = [
  { id: 'sueldo',    emoji: '💼', label: 'Sueldo' },
  { id: 'freelance', emoji: '💻', label: 'Freelance' },
  { id: 'alquiler',  emoji: '🏠', label: 'Alquiler' },
  { id: 'otro',      emoji: '💵', label: 'Otro' },
];

const TIPOS: { id: TipoMovimiento; emoji: string; label: string; color: string }[] = [
  { id: 'gasto',     emoji: '💸', label: 'Gasto',     color: '#6C47FF' },
  { id: 'ingreso',   emoji: '💰', label: 'Ingreso',   color: '#10B981' },
  { id: 'ahorro',    emoji: '🏦', label: 'Ahorro',    color: '#3B82F6' },
  { id: 'inversion', emoji: '📈', label: 'Inversión', color: '#F59E0B' },
];

export default function PantallaNuevoMovimiento() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGrupoStore((s) => s.grupos);
  const contextoId = useGrupoStore((s) => s.contextoId);
  const catConfig = useCategoriaStore((s) => s.config);
  const categorias = getCategoriaVisibles(catConfig);
  const pulso = useRef(new Animated.Value(1)).current;

  const defaultDestino = contextoId !== 'personal' ? contextoId : OPCION_PERSONAL;
  const [destinoId, setDestinoId] = useState(defaultDestino);
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento>('gasto');
  const [fuente, setFuente] = useState<FuenteIngreso>('sueldo');

  const [procesando, setProcesando] = useState(false);
  const [procesandoTipo, setProcesandoTipo] = useState<'foto' | 'voz' | 'texto' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [grabacion, setGrabacion] = useState<Audio.Recording | null>(null);

  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Otros');
  const [fecha, setFecha] = useState(new Date());
  const [esPrivado, setEsPrivado] = useState(false);
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [yaGuardado, setYaGuardado] = useState(false);

  function limpiarForm() {
    setMonto('');
    setDescripcion('');
    const cats = getCategoriaVisibles(useCategoriaStore.getState().config);
    setCategoria(cats.includes('Otros') ? 'Otros' : (cats[0] ?? 'Otros') as Categoria);
    setFecha(new Date());
    setEsPrivado(false);
    setMostrarFecha(false);
    setYaGuardado(false);
    setTipoMovimiento('gasto');
    setFuente('sueldo');
    const ctx = useGrupoStore.getState().contextoId;
    setDestinoId(ctx !== 'personal' ? ctx : OPCION_PERSONAL);
  }

  useFocusEffect(useCallback(() => {
    limpiarForm();
  }, []));

  function animarPulso() {
    Animated.sequence([
      Animated.timing(pulso, { toValue: 1.04, duration: 150, useNativeDriver: true }),
      Animated.timing(pulso, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  function normalizarFecha(fechaRaw: string): string {
    const hoy = new Date().toISOString().split('T')[0];
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)) return fechaRaw;
      const dmy = fechaRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
      const d = new Date(fechaRaw);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {}
    return hoy;
  }

  function aplicarParsed(parsed: { monto: number | null; descripcion: string; categoria: Categoria; fecha: string; tipo: TipoMovimiento; fuente: FuenteIngreso | null }) {
    if (parsed.monto) setMonto(String(parsed.monto));
    if (parsed.descripcion) setDescripcion(parsed.descripcion);
    if (parsed.tipo) setTipoMovimiento(parsed.tipo);
    if (parsed.tipo === 'gasto' && parsed.categoria) setCategoria(parsed.categoria);
    if (parsed.tipo === 'ingreso' && parsed.fuente) setFuente(parsed.fuente);
    if (parsed.fecha) {
      const fechaNorm = normalizarFecha(parsed.fecha);
      setFecha(new Date(fechaNorm + 'T12:00:00'));
    }
    setYaGuardado(false);
    animarPulso();
  }

  async function procesarImagen(origen: 'camara' | 'galeria') {
    if (origen === 'camara') {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) { Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara.'); return; }
    } else {
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) { Alert.alert('Permiso necesario', 'Necesitamos acceso a la galería.'); return; }
    }

    const resultado = origen === 'camara'
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (resultado.canceled || !resultado.assets[0].base64) return;

    setProcesandoTipo('foto');
    setProcesando(true);
    try {
      aplicarParsed(await parsearImagen(resultado.assets[0].base64));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcesando(false);
      setProcesandoTipo(null);
    }
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
    setGrabacion(recording);
    setGrabando(true);
  }

  async function detenerGrabacion() {
    if (!grabacion) return;
    setGrabando(false);
    setProcesandoTipo('voz');
    setProcesando(true);
    try {
      await grabacion.stopAndUnloadAsync();
      const uri = grabacion.getURI();
      setGrabacion(null);
      if (!uri) throw new Error('No se obtuvo URI del audio');
      const transcripcion = await transcribirAudio(uri);
      aplicarParsed(await parsearTexto(transcripcion));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcesando(false);
      setProcesandoTipo(null);
    }
  }

  async function guardarMovimiento() {
    if (!monto || Number(monto) <= 0) {
      Alert.alert('Falta el monto', 'Ingresá un monto válido.');
      return;
    }
    if (!usuario) return;

    if (yaGuardado) {
      const labelTipo = TIPOS.find(t => t.id === tipoMovimiento)?.label.toLowerCase() ?? 'movimiento';
      Alert.alert(
        'Posible duplicado',
        `Este ${labelTipo} ya fue guardado. ¿Querés cargarlo de nuevo igual?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Guardar igual', onPress: () => insertarMovimiento() },
        ]
      );
      return;
    }
    insertarMovimiento();
  }

  async function insertarMovimiento() {
    if (!usuario) return;
    setGuardando(true);
    const grupoId = destinoId !== OPCION_PERSONAL ? destinoId : null;
    const { error } = await supabase.from('expenses').insert({
      user_id: usuario.id,
      group_id: grupoId,
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
    router.replace('/(tabs)');
  }

  const hayDatos = monto || descripcion;
  const tipoActivo = TIPOS.find(t => t.id === tipoMovimiento)!;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">

        <Text style={estilos.titulo}>Nuevo movimiento</Text>

        {/* Selector de tipo */}
        <View style={estilos.selectorTipo}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                estilos.pillTipo,
                tipoMovimiento === t.id && { borderColor: t.color, backgroundColor: t.color + '15' },
              ]}
              onPress={() => { setTipoMovimiento(t.id); setEsPrivado(false); }}
              activeOpacity={0.7}
            >
              <Text style={estilos.pillTipoEmoji}>{t.emoji}</Text>
              <Text style={[estilos.pillTipoTexto, tipoMovimiento === t.id && { color: t.color, fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Acciones rápidas de IA */}
        <View style={estilos.accionesIA}>
          <TouchableOpacity
            style={estilos.accionIA}
            onPress={() => Alert.alert('Cargar comprobante', 'Elegí una opción', [
              { text: '📸 Cámara', onPress: () => procesarImagen('camara') },
              { text: '🖼️ Galería', onPress: () => procesarImagen('galeria') },
              { text: 'Cancelar', style: 'cancel' },
            ])}
            disabled={procesando}
            activeOpacity={0.7}
          >
            <View style={[estilos.iconoAccion, { backgroundColor: '#FEF3C7' }]}>
              {procesandoTipo === 'foto'
                ? <ActivityIndicator color="#F59E0B" size="small" />
                : <Text style={estilos.emojiAccion}>📸</Text>
              }
            </View>
            <Text style={estilos.labelAccion}>Ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[estilos.accionIA, grabando && estilos.accionGrabando]}
            onPress={grabando ? detenerGrabacion : iniciarGrabacion}
            disabled={procesando && !grabando}
            activeOpacity={0.7}
          >
            <View style={[estilos.iconoAccion, { backgroundColor: grabando ? '#FEE2E2' : '#EDE9FE' }]}>
              {procesandoTipo === 'voz'
                ? <ActivityIndicator color="#8B5CF6" size="small" />
                : <Text style={estilos.emojiAccion}>{grabando ? '⏹️' : '🎤'}</Text>
              }
            </View>
            <Text style={[estilos.labelAccion, grabando && { color: '#EF4444', fontWeight: '700' }]}>
              {grabando ? 'Detener' : 'Voz'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.accionIA}
            onPress={() => {
              Alert.prompt(
                '¿Qué movimiento fue?',
                'Ej: cobré el sueldo 850000, ahorré 50000, compré nafta 1500',
                async (texto) => {
                  if (!texto?.trim()) return;
                  setProcesandoTipo('texto');
                  setProcesando(true);
                  try {
                    aplicarParsed(await parsearTexto(texto));
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  } finally {
                    setProcesando(false);
                    setProcesandoTipo(null);
                  }
                },
                'plain-text'
              );
            }}
            disabled={procesando}
            activeOpacity={0.7}
          >
            <View style={[estilos.iconoAccion, { backgroundColor: '#DCFCE7' }]}>
              {procesandoTipo === 'texto'
                ? <ActivityIndicator color="#10B981" size="small" />
                : <Text style={estilos.emojiAccion}>✨</Text>
              }
            </View>
            <Text style={estilos.labelAccion}>IA texto</Text>
          </TouchableOpacity>
        </View>

        {/* Formulario */}
        <Animated.View style={[estilos.formulario, { transform: [{ scale: pulso }] }]}>
          {hayDatos && (
            <View style={estilos.badgeIA}>
              <Text style={estilos.textoBadge}>✨ Completado por IA — revisá antes de guardar</Text>
            </View>
          )}

          {/* Monto grande */}
          <View style={estilos.campoMonto}>
            <Text style={[estilos.simboloPeso, { color: tipoActivo.color + '60' }]}>$</Text>
            <TextInput
              style={[estilos.inputMonto, { color: tipoMovimiento === 'gasto' ? '#111827' : tipoActivo.color }]}
              value={monto}
              onChangeText={setMonto}
              placeholder="0"
              placeholderTextColor="#D1D5DB"
              keyboardType="numeric"
            />
          </View>

          <View style={estilos.separador} />

          {/* Descripción */}
          <TextInput
            style={estilos.inputDescripcion}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder={
              tipoMovimiento === 'ingreso' ? 'Ej: sueldo julio, cobro proyecto...' :
              tipoMovimiento === 'ahorro' ? 'Ej: caja de ahorro, fondo de emergencia...' :
              tipoMovimiento === 'inversion' ? 'Ej: plazo fijo, acciones, cripto...' :
              'Descripción (opcional)'
            }
            placeholderTextColor="#9CA3AF"
          />

          {/* Categorías — solo para gastos */}
          {(tipoMovimiento === 'gasto') && (
            <>
              <View style={estilos.separador} />
              <View style={estilos.categoriasWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={estilos.categoriasScroll}
                >
                  {categorias.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[estilos.chip, categoria === cat && estilos.chipActivo]}
                      onPress={() => setCategoria(cat as Categoria)}
                      activeOpacity={0.7}
                    >
                      <Text style={estilos.chipEmoji}>{getCategoriaEmoji(cat, catConfig)}</Text>
                      <Text style={[estilos.chipTexto, categoria === cat && estilos.chipTextoActivo]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          {/* Fuente de ingreso — solo para ingresos */}
          {tipoMovimiento === 'ingreso' && (
            <>
              <View style={estilos.separador} />
              <View>
                <Text style={estilos.etiquetaChica}>Fuente del ingreso</Text>
                <View style={estilos.fuenteGrid}>
                  {FUENTES.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[estilos.pillFuente, fuente === f.id && estilos.pillFuenteActivo]}
                      onPress={() => setFuente(f.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={estilos.pillFuenteEmoji}>{f.emoji}</Text>
                      <Text style={[estilos.pillFuenteTexto, fuente === f.id && estilos.pillFuenteTextoActivo]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={estilos.separador} />

          {/* Destino: Personal o grupo */}
          {grupos.length > 0 && (
            <>
              <View>
                <Text style={estilos.etiquetaChica}>Dónde anotarlo</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={estilos.destinoScroll}
                  style={estilos.destinoContenedor}
                >
                  <TouchableOpacity
                    style={[estilos.pillDestino, destinoId === OPCION_PERSONAL && estilos.pillDestinoActivo]}
                    onPress={() => { setDestinoId(OPCION_PERSONAL); setEsPrivado(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[estilos.pillDestinoTexto, destinoId === OPCION_PERSONAL && estilos.pillDestinoTextoActivo]}>
                      👤 Personal
                    </Text>
                  </TouchableOpacity>
                  {grupos.map(({ grupo }) => (
                    <TouchableOpacity
                      key={grupo.id}
                      style={[estilos.pillDestino, destinoId === grupo.id && estilos.pillDestinoActivo]}
                      onPress={() => setDestinoId(grupo.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[estilos.pillDestinoTexto, destinoId === grupo.id && estilos.pillDestinoTextoActivo]}>
                        👥 {grupo.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={estilos.separador} />
            </>
          )}

          {/* Fecha y privado en fila */}
          <View style={estilos.filaInferior}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.etiquetaChica}>Fecha</Text>
              <TouchableOpacity onPress={() => setMostrarFecha(true)} activeOpacity={0.7}>
                <Text style={estilos.inputFecha}>
                  📅 {fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            </View>
            {tipoMovimiento === 'gasto' && destinoId !== OPCION_PERSONAL && (
              <View style={estilos.switchContenedor}>
                <Text style={estilos.etiquetaChica}>🔒 Solo yo</Text>
                <Switch value={esPrivado} onValueChange={setEsPrivado} trackColor={{ true: '#6C47FF' }} />
              </View>
            )}
          </View>

          <SelectorFecha
            fecha={fecha}
            visible={mostrarFecha}
            onChange={setFecha}
            onCerrar={() => setMostrarFecha(false)}
          />
        </Animated.View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[estilos.botonGuardar, { backgroundColor: tipoActivo.color }, (!monto || guardando) && estilos.botonDeshabilitado]}
          onPress={guardarMovimiento}
          disabled={!monto || guardando}
          activeOpacity={0.8}
        >
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={estilos.textoGuardar}>
                {tipoMovimiento === 'gasto' ? 'Guardar gasto' :
                 tipoMovimiento === 'ingreso' ? 'Registrar ingreso' :
                 tipoMovimiento === 'ahorro' ? 'Registrar ahorro' :
                 'Registrar inversión'}
              </Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F9FAFB' },
  contenido: { padding: 20, paddingTop: 56, paddingBottom: 48, gap: 20 },
  titulo: { fontSize: 28, fontWeight: '800', color: '#111827' },

  selectorTipo: {
    flexDirection: 'row',
    gap: 10,
  },
  pillTipo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pillTipoEmoji: { fontSize: 16 },
  pillTipoTexto: { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  accionesIA: {
    flexDirection: 'row',
    gap: 12,
  },
  accionIA: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#F3F4F6',
  },
  accionGrabando: {
    borderColor: '#EF4444',
  },
  iconoAccion: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  emojiAccion: { fontSize: 22 },
  labelAccion: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  formulario: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 20, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  badgeIA: {
    backgroundColor: '#F5F2FF', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  textoBadge: { fontSize: 12, color: '#6C47FF', fontWeight: '600' },

  campoMonto: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  simboloPeso: { fontSize: 36, fontWeight: '300' },
  inputMonto: {
    flex: 1, fontSize: 48, fontWeight: '800',
    padding: 0,
  },

  inputDescripcion: {
    fontSize: 16, color: '#111827',
    padding: 0, minHeight: 24,
  },

  separador: { height: 1, backgroundColor: '#F3F4F6' },

  categoriasWrapper: {
    marginHorizontal: -20,
  },
  categoriasScroll: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipActivo: { borderColor: '#6C47FF', backgroundColor: '#F5F2FF' },
  chipEmoji: { fontSize: 13 },
  chipTexto: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  chipTextoActivo: { color: '#6C47FF', fontWeight: '700' },

  fuenteGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  pillFuente: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pillFuenteActivo: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  pillFuenteEmoji: { fontSize: 14 },
  pillFuenteTexto: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  pillFuenteTextoActivo: { color: '#10B981' },

  filaInferior: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  etiquetaChica: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 },
  inputFecha: { fontSize: 14, color: '#374151', fontWeight: '600' },
  switchContenedor: { alignItems: 'center', gap: 4 },

  botonGuardar: {
    borderRadius: 16,
    padding: 18, alignItems: 'center',
  },
  botonDeshabilitado: { opacity: 0.4 },
  textoGuardar: { color: '#fff', fontSize: 16, fontWeight: '800' },

  destinoContenedor: { marginHorizontal: -20, marginTop: 6 },
  destinoScroll: { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
  pillDestino: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  pillDestinoActivo: { borderColor: '#6C47FF', backgroundColor: '#F5F2FF' },
  pillDestinoTexto: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  pillDestinoTextoActivo: { color: '#6C47FF' },
});
