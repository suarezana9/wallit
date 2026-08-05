import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, TextInput, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '@/store/authStore';
import { useGrupoStore } from '@/store/grupoStore';
import { supabase } from '@/lib/supabase';
import { calcularRangoDeMes } from '@/lib/gastos';
import { useTheme } from '@/constants/theme';
import { usePreferencesStore, type Tema, type Idioma } from '@/store/preferencesStore';
import { useMoneda } from '@/hooks/useMoneda';
import { useT } from '@/hooks/useT';
import { MONEDAS, type InfoMoneda } from '@/constants/monedas';

export default function PantallaPerfil() {
  const t = useTheme();
  const i18n = useT();
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGrupoStore((s) => s.grupos);
  const tema = usePreferencesStore((s) => s.tema);
  const setTema = usePreferencesStore((s) => s.setTema);
  const idioma = usePreferencesStore((s) => s.idioma);
  const setIdioma = usePreferencesStore((s) => s.setIdioma);
  const [mostrarSelectorTema, setMostrarSelectorTema] = useState(false);
  const [mostrarSelectorIdioma, setMostrarSelectorIdioma] = useState(false);

  const { moneda, setMoneda, info: infoMoneda } = useMoneda();
  const [modalMonedaVisible, setModalMonedaVisible] = useState(false);
  const [busquedaMoneda, setBusquedaMoneda] = useState('');

  const TEMAS: { id: Tema; label: string; emoji: string }[] = [
    { id: 'system', label: i18n.temaSystem, emoji: '🌗' },
    { id: 'light',  label: i18n.temaLight,  emoji: '☀️' },
    { id: 'dark',   label: i18n.temaDark,   emoji: '🌙' },
  ];
  const temaActual = TEMAS.find((item) => item.id === tema) ?? TEMAS[0];

  const IDIOMAS: { id: Idioma; label: string; emoji: string }[] = [
    { id: 'es', label: i18n.idiomaEspanol, emoji: '🇪🇸' },
    { id: 'en', label: i18n.idiomaIngles,  emoji: '🇺🇸' },
  ];
  const idiomaActual = IDIOMAS.find((item) => item.id === idioma) ?? IDIOMAS[0];

  const [nombre, setNombre] = useState('');
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [statsMovimientos, setStatsMovimientos] = useState<number | null>(null);

  useEffect(() => {
    if (!usuario) return;

    const nombreActual = usuario.user_metadata?.full_name
      ?? usuario.email?.split('@')[0]
      ?? '';
    setNombre(nombreActual);

    const { primerDia, ultimoDia } = calcularRangoDeMes(0);
    supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', usuario.id)
      .gte('date', primerDia)
      .lte('date', ultimoDia)
      .then(({ count }) => setStatsMovimientos(count ?? 0));
  }, [usuario]);

  async function guardarNombre() {
    if (!nombre.trim() || !usuario) { setEditandoNombre(false); return; }
    setGuardandoNombre(true);
    await supabase.from('users').update({ name: nombre.trim() }).eq('id', usuario.id);
    await supabase.auth.updateUser({ data: { full_name: nombre.trim() } });
    setGuardandoNombre(false);
    setEditandoNombre(false);
  }

  async function cerrarSesion() {
    Alert.alert(i18n.alertCerrarSesion, i18n.alertCerrarSesionMsg, [
      { text: i18n.cancelar, style: 'cancel' },
      { text: i18n.alertSalirCuenta, style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const inicial = (nombre || usuario?.email || '?')[0].toUpperCase();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const proveedorGoogle = usuario?.app_metadata?.provider === 'google';
  const s = makeStyles(t);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.contenido}>

      <View style={s.perfilHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarTexto}>{inicial}</Text>
        </View>

        {editandoNombre ? (
          <View style={s.editNombreFila}>
            <TextInput
              style={s.inputNombre}
              value={nombre}
              onChangeText={setNombre}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={guardarNombre}
              onBlur={guardarNombre}
            />
            {guardandoNombre
              ? <ActivityIndicator color={t.primary} size="small" />
              : <TouchableOpacity onPress={guardarNombre} activeOpacity={0.7}>
                  <Text style={s.textoGuardarNombre}>Guardar</Text>
                </TouchableOpacity>
            }
          </View>
        ) : (
          <TouchableOpacity style={s.nombreFila} onPress={() => setEditandoNombre(true)} activeOpacity={0.7}>
            <Text style={s.nombre}>{nombre}</Text>
            <Text style={s.iconoEditar}>✏️</Text>
          </TouchableOpacity>
        )}

        <Text style={s.email}>{usuario?.email}</Text>
        {proveedorGoogle && <Text style={s.badgeGoogle}>G Cuenta de Google</Text>}
      </View>

      <View style={s.statsGrid}>
        <View style={s.statCard}>
          <Text style={s.statNumero}>{statsMovimientos === null ? '—' : statsMovimientos}</Text>
          <Text style={s.statLabel}>{i18n.movimientosEsteMes}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNumero}>{grupos.length}</Text>
          <Text style={s.statLabel}>{grupos.length === 1 ? i18n.grupo : i18n.grupos}</Text>
        </View>
      </View>

      <View style={s.seccion}>
        <Text style={s.tituloSeccion}>{i18n.ajustes}</Text>

        <TouchableOpacity style={s.filaAccion} onPress={() => router.push('/notificaciones')} activeOpacity={0.7}>
          <View>
            <Text style={s.filaAccionTexto}>{i18n.notificaciones}</Text>
            <Text style={s.filaAccionDesc}>{i18n.notificacionesDesc}</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <View style={s.divisor} />

        <TouchableOpacity style={s.filaAccion} onPress={() => router.push('/categorias')} activeOpacity={0.7}>
          <View>
            <Text style={s.filaAccionTexto}>{i18n.categorias}</Text>
            <Text style={s.filaAccionDesc}>{i18n.categoriasDesc}</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <View style={s.divisor} />

        <TouchableOpacity style={s.filaAccion} onPress={() => setMostrarSelectorTema(!mostrarSelectorTema)} activeOpacity={0.7}>
          <View>
            <Text style={s.filaAccionTexto}>{temaActual.emoji} {i18n.apariencia}</Text>
            <Text style={s.filaAccionDesc}>{temaActual.label}</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        {mostrarSelectorTema && (
          <View style={s.selectorTema}>
            {TEMAS.map((op) => (
              <TouchableOpacity
                key={op.id}
                style={[s.opcionTema, tema === op.id && { borderColor: t.primary, backgroundColor: t.primary + '12' }]}
                onPress={() => { setTema(op.id); setMostrarSelectorTema(false); }}
                activeOpacity={0.7}
              >
                <Text style={s.opcionTemaEmoji}>{op.emoji}</Text>
                <Text style={[s.opcionTemaTexto, tema === op.id && { color: t.primary, fontWeight: '700' }]}>
                  {op.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.divisor} />

        <TouchableOpacity style={s.filaAccion} onPress={() => { setBusquedaMoneda(''); setModalMonedaVisible(true); }} activeOpacity={0.7}>
          <View>
            <Text style={s.filaAccionTexto}>{i18n.moneda}</Text>
            <Text style={s.filaAccionDesc}>{infoMoneda.simbolo} {infoMoneda.nombre} ({infoMoneda.codigo})</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        <View style={s.divisor} />

        <TouchableOpacity style={s.filaAccion} onPress={() => setMostrarSelectorIdioma(!mostrarSelectorIdioma)} activeOpacity={0.7}>
          <View>
            <Text style={s.filaAccionTexto}>{i18n.idioma}</Text>
            <Text style={s.filaAccionDesc}>{idiomaActual.emoji} {idiomaActual.label}</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        {mostrarSelectorIdioma && (
          <View style={s.selectorTema}>
            {IDIOMAS.map((op) => (
              <TouchableOpacity
                key={op.id}
                style={[s.opcionTema, idioma === op.id && { borderColor: t.primary, backgroundColor: t.primary + '12' }]}
                onPress={() => { setIdioma(op.id); setMostrarSelectorIdioma(false); }}
                activeOpacity={0.7}
              >
                <Text style={s.opcionTemaEmoji}>{op.emoji}</Text>
                <Text style={[s.opcionTemaTexto, idioma === op.id && { color: t.primary, fontWeight: '700' }]}>
                  {op.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Modal selector de moneda */}
      <Modal visible={modalMonedaVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalMonedaVisible(false)}>
        <View style={s.modalContenedor}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>Moneda</Text>
            <TouchableOpacity onPress={() => setModalMonedaVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={t.text} />
            </TouchableOpacity>
          </View>

          <View style={s.buscadorContenedor}>
            <Ionicons name="search" size={16} color={t.textMuted} />
            <TextInput
              style={s.buscadorInput}
              placeholder={i18n.buscarMoneda}
              placeholderTextColor={t.textMuted}
              value={busquedaMoneda}
              onChangeText={setBusquedaMoneda}
              autoCorrect={false}
            />
            {busquedaMoneda.length > 0 && (
              <TouchableOpacity onPress={() => setBusquedaMoneda('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={t.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={MONEDAS.filter((m) =>
              busquedaMoneda.length === 0 ||
              m.nombre.toLowerCase().includes(busquedaMoneda.toLowerCase()) ||
              m.codigo.toLowerCase().includes(busquedaMoneda.toLowerCase())
            )}
            keyExtractor={(m) => m.codigo}
            ItemSeparatorComponent={() => <View style={s.modalDivisor} />}
            renderItem={({ item }: { item: InfoMoneda }) => {
              const activa = item.codigo === moneda;
              return (
                <TouchableOpacity
                  style={s.monedaFila}
                  onPress={() => { setMoneda(item.codigo); setModalMonedaVisible(false); }}
                  activeOpacity={0.7}
                >
                  <View style={s.monedaSimboloBox}>
                    <Text style={s.monedaSimbolo}>{item.simbolo}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.monedaNombre, activa && { color: t.primary }]}>{item.nombre}</Text>
                    <Text style={s.monedaCodigo}>{item.codigo}</Text>
                  </View>
                  {activa && <Ionicons name="checkmark-circle" size={20} color={t.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      <View style={s.seccion}>
        <Text style={s.tituloSeccion}>{i18n.cuenta}</Text>

        {!proveedorGoogle && (
          <TouchableOpacity
            style={s.filaAccion}
            onPress={() => Alert.alert(i18n.cambiarContrasena, `Te enviamos un email a ${usuario?.email} con el enlace para cambiarla.`, [
              { text: i18n.cancelar, style: 'cancel' },
              { text: 'Enviar email', onPress: async () => {
                await supabase.auth.resetPasswordForEmail(usuario?.email ?? '');
                Alert.alert('Enviado', 'Revisá tu bandeja de entrada.');
              }},
            ])}
            activeOpacity={0.7}
          >
            <Text style={s.filaAccionTexto}>{i18n.cambiarContrasena}</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        )}

        <View style={[s.divisor, { marginVertical: 4 }]} />

        <TouchableOpacity style={s.botonSalir} onPress={cerrarSesion} activeOpacity={0.8}>
          <Text style={s.textoSalir}>{i18n.cerrarSesion}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.version}>Wallit v{version}</Text>

    </ScrollView>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: t.bg },
    contenido: { padding: 20, paddingTop: 56, paddingBottom: 110, gap: 20 },

    perfilHeader: { alignItems: 'center', gap: 8, paddingVertical: 8 },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: t.badgeGrupoBg, justifyContent: 'center', alignItems: 'center',
    },
    avatarTexto: { fontSize: 32, fontWeight: '800', color: t.primary },

    nombreFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nombre: { fontSize: 22, fontWeight: '800', color: t.text },
    iconoEditar: { fontSize: 14 },

    editNombreFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    inputNombre: {
      fontSize: 20, fontWeight: '700', color: t.text,
      borderBottomWidth: 2, borderBottomColor: t.primary,
      paddingBottom: 2, minWidth: 160, textAlign: 'center',
    },
    textoGuardarNombre: { color: t.primary, fontWeight: '700', fontSize: 14 },

    email: { fontSize: 13, color: t.textMuted },
    badgeGoogle: {
      fontSize: 12, color: '#4285F4', fontWeight: '600',
      backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    },

    statsGrid: { flexDirection: 'row', gap: 12 },
    statCard: {
      flex: 1, backgroundColor: t.surface, borderRadius: 16,
      padding: 20, alignItems: 'center', gap: 4,
    },
    statNumero: { fontSize: 32, fontWeight: '800', color: t.primary },
    statLabel: { fontSize: 12, color: t.textMuted, textAlign: 'center' },

    seccion: { backgroundColor: t.surface, borderRadius: 16, padding: 20, gap: 4 },
    tituloSeccion: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 12 },

    divisor: { height: 1, backgroundColor: t.border, marginVertical: 4 },

    filaAccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    filaAccionTexto: { fontSize: 14, fontWeight: '600', color: t.text },
    filaAccionDesc: { fontSize: 12, color: t.textMuted, marginTop: 2 },
    chevron: { fontSize: 20, color: t.textMuted },

    selectorTema: { flexDirection: 'row', gap: 8, marginTop: 8 },
    opcionTema: {
      flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10,
      borderRadius: 12, borderWidth: 1.5, borderColor: t.border,
    },
    opcionTemaEmoji: { fontSize: 18 },
    opcionTemaTexto: { fontSize: 12, fontWeight: '600', color: t.textSecondary },

    // Modal moneda
    modalContenedor: { flex: 1, backgroundColor: t.bg, paddingTop: 8 },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: t.border,
    },
    modalTitulo: { fontSize: 18, fontWeight: '700', color: t.text },
    buscadorContenedor: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      margin: 16, paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: t.surfaceAlt, borderRadius: 12,
    },
    buscadorInput: { flex: 1, fontSize: 15, color: t.text },
    modalDivisor: { height: 1, backgroundColor: t.border, marginHorizontal: 20 },
    monedaFila: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 20, paddingVertical: 14,
    },
    monedaSimboloBox: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: t.surfaceAlt, justifyContent: 'center', alignItems: 'center',
    },
    monedaSimbolo: { fontSize: 16, fontWeight: '700', color: t.text },
    monedaNombre: { fontSize: 15, fontWeight: '600', color: t.text },
    monedaCodigo: { fontSize: 12, color: t.textMuted, marginTop: 1 },

    botonSalir: {
      borderWidth: 1.5, borderColor: t.negative + '50',
      borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4,
    },
    textoSalir: { color: t.negative, fontWeight: '700', fontSize: 14 },

    version: { textAlign: 'center', fontSize: 12, color: t.textMuted },
  });
}
