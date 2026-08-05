import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform, LayoutAnimation,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '@/store/authStore';
import { useGrupo } from '@/hooks/useGrupo';
import { useGrupoStore } from '@/store/grupoStore';
import {
  crearGrupo, unirseAGrupo, salirDeGrupo, cerrarGrupo,
  migrarGastosAlGrupo, obtenerMiembros,
} from '@/lib/grupos';
import { obtenerResumenMesGrupo } from '@/lib/gastos';
import { useTheme } from '@/constants/theme';
import { useT } from '@/hooks/useT';
import { useMoneda } from '@/hooks/useMoneda';
import { QRGrupo } from '@/components/ui/QRGrupo';

interface ResumenGrupo { gastos: number; ingresos: number; total: number }

export default function PantallaGrupos() {
  const router = useRouter();
  const t = useTheme();
  const i18n = useT();
  const { formatear } = useMoneda();
  const usuario = useAuthStore((s) => s.usuario);
  const { grupos, cargando, recargar } = useGrupo();
  const contextoId = useGrupoStore((s) => s.contextoId);

  const [miembrosPorGrupo, setMiembrosPorGrupo] = useState<Record<string, any[]>>({});
  const [resumenPorGrupo, setResumenPorGrupo] = useState<Record<string, ResumenGrupo>>({});
  const [expandidosPorGrupo, setExpandidosPorGrupo] = useState<Record<string, boolean>>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [vistaModal, setVistaModal] = useState<'menu' | 'crear' | 'unirse'>('menu');
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargarMiembros = useCallback(async () => {
    if (grupos.length === 0) return;
    const miembros: Record<string, any[]> = {};
    const resumenes: Record<string, ResumenGrupo> = {};
    await Promise.all(
      grupos.map(async ({ grupo }) => {
        try {
          const [ms, res] = await Promise.all([
            obtenerMiembros(grupo.id),
            obtenerResumenMesGrupo(grupo.id),
          ]);
          miembros[grupo.id] = ms ?? [];
          resumenes[grupo.id] = res;
        } catch {
          miembros[grupo.id] = [];
          resumenes[grupo.id] = { gastos: 0, ingresos: 0, total: 0 };
        }
      })
    );
    setMiembrosPorGrupo(miembros);
    setResumenPorGrupo(resumenes);
  }, [grupos]);

  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));
  useFocusEffect(useCallback(() => { cargarMiembros(); }, [cargarMiembros]));

  function toggleExpandir(grupoId: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandidosPorGrupo((prev) => ({ ...prev, [grupoId]: !prev[grupoId] }));
  }

  function abrirModal(vista: 'menu' | 'crear' | 'unirse' = 'menu') {
    setVistaModal(vista);
    setNombreGrupo('');
    setCodigoIngresado('');
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setVistaModal('menu');
    setNombreGrupo('');
    setCodigoIngresado('');
  }

  function ofrecerMigracion(grupoId: string) {
    Alert.alert(
      i18n.alertGastosAnteriores,
      i18n.alertGastosAnterioresMsg,
      [
        { text: i18n.alertNoMover, style: 'cancel' },
        {
          text: i18n.alertSiMover,
          onPress: async () => {
            try { await migrarGastosAlGrupo(grupoId, usuario!.id); } catch {}
          },
        },
      ]
    );
  }

  async function handleCrear() {
    if (!nombreGrupo.trim() || !usuario) return;
    setProcesando(true);
    try {
      const grupo = await crearGrupo(nombreGrupo.trim(), usuario.id);
      cerrarModal();
      await recargar();
      ofrecerMigracion(grupo.id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleUnirse() {
    if (!codigoIngresado.trim() || !usuario) return;
    setProcesando(true);
    try {
      const grupo = await unirseAGrupo(codigoIngresado, usuario.id);
      cerrarModal();
      await recargar();
      ofrecerMigracion(grupo.id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleSalir(grupoId: string, nombreG: string) {
    if (!usuario) return;
    Alert.alert(
      i18n.salirGrupo,
      i18n.alertSalirMsg(nombreG),
      [
        { text: i18n.cancelar, style: 'cancel' },
        {
          text: i18n.alertSalir, style: 'destructive',
          onPress: async () => {
            try { await salirDeGrupo(grupoId, usuario.id); recargar(); }
            catch (e: any) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  }

  async function handleCerrar(grupoId: string, nombreG: string) {
    if (!usuario) return;
    Alert.alert(
      i18n.cerrarGrupo,
      i18n.alertCerrarMsg(nombreG),
      [
        { text: i18n.cancelar, style: 'cancel' },
        {
          text: i18n.cerrarGrupo, style: 'destructive',
          onPress: async () => {
            try { await cerrarGrupo(grupoId, usuario.id); recargar(); }
            catch (e: any) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  }

  const s = makeStyles(t);

  if (cargando) {
    return (
      <View style={s.centrado}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  if (grupos.length === 0) {
    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.contenido}>
        <Text style={s.titulo}>{i18n.grupos}</Text>
        <Text style={s.subtitulo}>{i18n.compartirFinanzas}</Text>
        <View style={s.ilustracion}><Text style={{ fontSize: 64 }}>👥</Text></View>
        <View style={s.opciones}>
          <TouchableOpacity style={s.botonPrincipal} onPress={() => abrirModal('crear')} activeOpacity={0.8}>
            <Text style={s.textoBotonPrincipal}>{i18n.crearGrupoNuevo}</Text>
          </TouchableOpacity>
          <View style={s.separadorTexto}>
            <View style={s.lineaSep} /><Text style={s.textoSep}>o</Text><View style={s.lineaSep} />
          </View>
          <TouchableOpacity style={s.botonSecundario} onPress={() => abrirModal('unirse')} activeOpacity={0.8}>
            <Text style={s.textoBotonSecundario}>{i18n.tengoCodigoInvite}</Text>
          </TouchableOpacity>
        </View>
        <ModalNuevoGrupo
          visible={modalVisible} vista={vistaModal}
          nombreGrupo={nombreGrupo} codigoIngresado={codigoIngresado} procesando={procesando}
          onChangeNombre={setNombreGrupo} onChangeCodigo={setCodigoIngresado}
          onCambiarVista={setVistaModal} onCrear={handleCrear} onUnirse={handleUnirse} onCerrar={cerrarModal}
        />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.scroll} contentContainerStyle={s.contenido}>
        <Text style={s.titulo}>{i18n.misGrupos}</Text>
        <Text style={s.ayuda}>{i18n.cambiarContextoAyuda}</Text>

        {grupos.map(({ grupo, rol }) => {
          const esAdmin = rol === 'admin';
          const esActivo = grupo.id === contextoId;
          const miembros = miembrosPorGrupo[grupo.id] ?? [];
          const resumen = resumenPorGrupo[grupo.id];
          const expandido = expandidosPorGrupo[grupo.id] ?? false;

          return (
            <View key={grupo.id} style={[s.tarjetaGrupo, esActivo && s.tarjetaActiva]}>

              {/* Header → navega al detalle */}
              <TouchableOpacity
                style={s.tarjetaHeader}
                onPress={() => router.push(`/grupo/${grupo.id}`)}
                activeOpacity={0.7}
              >
                <View style={s.headerIzquierda}>
                  <Text style={s.nombreGrupo} numberOfLines={1}>{grupo.name}</Text>
                  {(esActivo || esAdmin) && (
                    <View style={s.badgesFila}>
                      {esActivo && (
                        <View style={s.badgeActivo}>
                          <Text style={s.textoBadgeActivo}>● {i18n.activo}</Text>
                        </View>
                      )}
                      {esAdmin && (
                        <View style={s.badgeAdmin}>
                          <Text style={s.textoBadge}>{i18n.admin}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
              </TouchableOpacity>

              {/* Resumen del mes */}
              {resumen && (
                <View style={s.resumenFila}>
                  <View style={s.resumenItem}>
                    <Text style={s.resumenLabel}>{i18n.gastos} (mes)</Text>
                    <Text style={[s.resumenValor, { color: t.negative }]}>{formatear(resumen.gastos)}</Text>
                  </View>
                  {resumen.ingresos > 0 && (
                    <View style={s.resumenItem}>
                      <Text style={s.resumenLabel}>{i18n.ingresos} (mes)</Text>
                      <Text style={[s.resumenValor, { color: t.positive }]}>{formatear(resumen.ingresos)}</Text>
                    </View>
                  )}
                  <View style={s.resumenItem}>
                    <Text style={s.resumenLabel}>{i18n.movimientos}</Text>
                    <Text style={s.resumenValor}>{resumen.total}</Text>
                  </View>
                </View>
              )}

              <View style={s.divisor} />

              {/* Miembros expandibles */}
              {miembros.length > 0 && (
                <View style={s.miembrosSeccion}>
                  <TouchableOpacity style={s.miembrosHeader} onPress={() => toggleExpandir(grupo.id)} activeOpacity={0.7}>
                    <Text style={s.miembrosLabel}>
                      👥 {miembros.length} {miembros.length === 1 ? i18n.miembro : i18n.miembros}
                    </Text>
                    <Text style={s.iconoExpand}>{expandido ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {/* Avatares compactos cuando está colapsado */}
                  {!expandido && (
                    <View style={s.avataresFila}>
                      {miembros.slice(0, 5).map((m: any, i: number) => {
                        const user = Array.isArray(m.users) ? m.users[0] : m.users;
                        const inicial = user?.name?.[0]?.toUpperCase() ?? '?';
                        return (
                          <View key={i} style={[s.avatar, { marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }]}>
                            <Text style={s.avatarTexto}>{inicial}</Text>
                          </View>
                        );
                      })}
                      {miembros.length > 5 && (
                        <View style={[s.avatar, { marginLeft: -10, backgroundColor: t.border }]}>
                          <Text style={[s.avatarTexto, { color: t.textSecondary }]}>+{miembros.length - 5}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Lista expandida con nombres */}
                  {expandido && (
                    <View style={s.listaMiembros}>
                      {miembros.map((m: any, i: number) => {
                        const user = Array.isArray(m.users) ? m.users[0] : m.users;
                        const nombre = user?.name ?? user?.email ?? '—';
                        const esYo = user?.id === usuario?.id;
                        const esAdminMiembro = m.role === 'admin';
                        return (
                          <View key={i} style={s.filaMiembro}>
                            <View style={s.avatarMiembro}>
                              <Text style={s.avatarTexto}>{nombre[0]?.toUpperCase() ?? '?'}</Text>
                            </View>
                            <Text style={s.nombreMiembro} numberOfLines={1}>
                              {nombre}{esYo ? ` (${i18n.vos})` : ''}
                            </Text>
                            {esAdminMiembro && (
                              <View style={s.badgeAdminMini}>
                                <Text style={s.textoBadgeAdminMini}>{i18n.admin}</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              <View style={s.divisor} />

              {/* Código QR */}
              <View style={s.inviteSeccion}>
                <View>
                  <Text style={s.labelCodigo}>{i18n.codigoInvitacion}</Text>
                  <Text style={s.codigo}>{grupo.invite_code.toUpperCase()}</Text>
                </View>
                <QRGrupo nombre={grupo.name} codigo={grupo.invite_code} />
              </View>

              <View style={s.divisor} />

              {/* Acciones */}
              <View style={s.accionesFila}>
                <TouchableOpacity
                  style={s.botonSalir}
                  onPress={() => handleSalir(grupo.id, grupo.name)}
                  activeOpacity={0.7}
                >
                  <Text style={s.textoSalir}>{i18n.salirGrupo}</Text>
                </TouchableOpacity>
                {esAdmin && (
                  <TouchableOpacity
                    style={s.botonCerrar}
                    onPress={() => handleCerrar(grupo.id, grupo.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.textoCerrar}>{i18n.cerrarGrupo}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[s.fab, { backgroundColor: t.primary, shadowColor: t.primary }]}
        onPress={() => abrirModal()}
        activeOpacity={0.85}
      >
        <Text style={s.fabTexto}>+</Text>
      </TouchableOpacity>

      <ModalNuevoGrupo
        visible={modalVisible} vista={vistaModal}
        nombreGrupo={nombreGrupo} codigoIngresado={codigoIngresado} procesando={procesando}
        onChangeNombre={setNombreGrupo} onChangeCodigo={setCodigoIngresado}
        onCambiarVista={setVistaModal} onCrear={handleCrear} onUnirse={handleUnirse} onCerrar={cerrarModal}
      />
    </View>
  );
}

interface ModalProps {
  visible: boolean;
  vista: 'menu' | 'crear' | 'unirse';
  nombreGrupo: string;
  codigoIngresado: string;
  procesando: boolean;
  onChangeNombre: (v: string) => void;
  onChangeCodigo: (v: string) => void;
  onCambiarVista: (v: 'menu' | 'crear' | 'unirse') => void;
  onCrear: () => void;
  onUnirse: () => void;
  onCerrar: () => void;
}

function ModalNuevoGrupo({
  visible, vista, nombreGrupo, codigoIngresado, procesando,
  onChangeNombre, onChangeCodigo, onCambiarVista, onCrear, onUnirse, onCerrar,
}: ModalProps) {
  const t = useTheme();
  const i18n = useT();
  const s = makeStyles(t);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCerrar} />
        <View style={s.sheet}>
          {vista === 'menu' && (
            <>
              <Text style={s.sheetTitulo}>{i18n.agregarGrupo}</Text>
              <TouchableOpacity style={s.botonPrincipal} onPress={() => onCambiarVista('crear')} activeOpacity={0.8}>
                <Text style={s.textoBotonPrincipal}>{i18n.crearGrupoNuevo}</Text>
              </TouchableOpacity>
              <View style={s.separadorTexto}>
                <View style={s.lineaSep} /><Text style={s.textoSep}>o</Text><View style={s.lineaSep} />
              </View>
              <TouchableOpacity style={s.botonSecundario} onPress={() => onCambiarVista('unirse')} activeOpacity={0.8}>
                <Text style={s.textoBotonSecundario}>{i18n.tengoCodigoInvite}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onCerrar} style={s.botonCancelar}>
                <Text style={s.textoCancelarModal}>{i18n.cancelar}</Text>
              </TouchableOpacity>
            </>
          )}
          {vista === 'crear' && (
            <>
              <Text style={s.sheetTitulo}>{i18n.nuevoGrupo}</Text>
              <Text style={s.etiqueta}>{i18n.nombreGrupo}</Text>
              <TextInput
                style={s.input} value={nombreGrupo} onChangeText={onChangeNombre}
                placeholder="ej: Casa García, Viaje Bariloche"
                placeholderTextColor={t.textMuted} autoFocus
              />
              <TouchableOpacity
                style={[s.botonPrincipal, (!nombreGrupo.trim() || procesando) && s.botonDeshabilitado]}
                onPress={onCrear} disabled={!nombreGrupo.trim() || procesando} activeOpacity={0.8}
              >
                {procesando ? <ActivityIndicator color="#fff" /> : <Text style={s.textoBotonPrincipal}>{i18n.crearGrupo}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onCambiarVista('menu')} style={s.botonCancelar}>
                <Text style={s.textoCancelarModal}>{i18n.volver}</Text>
              </TouchableOpacity>
            </>
          )}
          {vista === 'unirse' && (
            <>
              <Text style={s.sheetTitulo}>{i18n.unirseGrupo}</Text>
              <Text style={s.etiqueta}>{i18n.codigoInvitacion}</Text>
              <TextInput
                style={s.input} value={codigoIngresado} onChangeText={onChangeCodigo}
                placeholder="ej: ab3f9c2d" placeholderTextColor={t.textMuted}
                autoCapitalize="none" autoCorrect={false} autoFocus
              />
              <TouchableOpacity
                style={[s.botonSecundario, (!codigoIngresado.trim() || procesando) && s.botonDeshabilitado]}
                onPress={onUnirse} disabled={!codigoIngresado.trim() || procesando} activeOpacity={0.8}
              >
                {procesando ? <ActivityIndicator color={t.primary} /> : <Text style={s.textoBotonSecundario}>{i18n.unirmeGrupo}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onCambiarVista('menu')} style={s.botonCancelar}>
                <Text style={s.textoCancelarModal}>{i18n.volver}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: t.bg },
    contenido: { padding: 20, paddingTop: 56, paddingBottom: 110, gap: 20 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    titulo: { fontSize: 26, fontWeight: '800', color: t.text },
    subtitulo: { fontSize: 14, color: t.textMuted, marginTop: 4 },
    ayuda: { fontSize: 13, color: t.textMuted, lineHeight: 18 },
    ilustracion: { alignItems: 'center', paddingVertical: 16 },
    opciones: { gap: 12 },

    fab: {
      position: 'absolute', bottom: 100, right: 20,
      width: 56, height: 56, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    fabTexto: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },

    // Tarjeta grupo
    tarjetaGrupo: {
      backgroundColor: t.surface, borderRadius: 20,
      padding: 20, gap: 14,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
      borderWidth: 1.5, borderColor: 'transparent',
    },
    tarjetaActiva: {
      borderColor: t.primary + '60',
      shadowColor: t.primary,
      shadowOpacity: 0.14,
    },

    // Header
    tarjetaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerIzquierda: { flex: 1, gap: 4 },
    nombreGrupo: { fontSize: 17, fontWeight: '800', color: t.text },
    badgesFila: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    badgeAdmin: { backgroundColor: t.badgeGrupoBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    textoBadge: { fontSize: 11, color: t.badgeGrupoText, fontWeight: '700' },
    badgeActivo: {
      backgroundColor: t.primary + '18', paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 8, borderWidth: 1, borderColor: t.primary + '40',
    },
    textoBadgeActivo: { fontSize: 11, color: t.primary, fontWeight: '700' },

    // Resumen
    resumenFila: {
      flexDirection: 'row', gap: 0,
      backgroundColor: t.surfaceAlt, borderRadius: 12, overflow: 'hidden',
    },
    resumenItem: {
      flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    },
    resumenLabel: { fontSize: 10, color: t.textMuted, fontWeight: '500', marginBottom: 2 },
    resumenValor: { fontSize: 14, fontWeight: '800', color: t.text },

    divisor: { height: 1, backgroundColor: t.border },

    // Miembros
    miembrosSeccion: { gap: 8 },
    miembrosHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    miembrosLabel: { fontSize: 13, color: t.textSecondary, fontWeight: '600' },
    iconoExpand: { fontSize: 10, color: t.textMuted },
    avataresFila: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: t.badgeGrupoBg, justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: t.surface,
    },
    avatarTexto: { fontSize: 11, fontWeight: '700', color: t.primary },

    listaMiembros: { gap: 8, paddingTop: 4 },
    filaMiembro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarMiembro: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: t.badgeGrupoBg, justifyContent: 'center', alignItems: 'center',
    },
    nombreMiembro: { fontSize: 14, color: t.text, fontWeight: '500', flex: 1 },
    badgeAdminMini: { backgroundColor: t.badgeGrupoBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    textoBadgeAdminMini: { fontSize: 10, color: t.badgeGrupoText, fontWeight: '700' },

    // Invite
    inviteSeccion: { gap: 10 },
    labelCodigo: { fontSize: 11, color: t.textMuted, fontWeight: '500', marginBottom: 3 },
    codigo: { fontSize: 17, fontWeight: '800', color: t.text, letterSpacing: 3 },

    // Acciones
    accionesFila: { flexDirection: 'row', gap: 10 },
    botonSalir: {
      flex: 1, borderWidth: 1.5, borderColor: t.negative + '50',
      borderRadius: 12, padding: 12, alignItems: 'center',
    },
    textoSalir: { color: t.negative, fontWeight: '700', fontSize: 13 },
    botonCerrar: {
      flex: 1, backgroundColor: t.negative + '14',
      borderRadius: 12, padding: 12, alignItems: 'center',
    },
    textoCerrar: { color: t.negative, fontWeight: '700', fontSize: 13 },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40, gap: 12,
    },
    sheetTitulo: { fontSize: 20, fontWeight: '800', color: t.text, marginBottom: 4 },
    etiqueta: { fontSize: 14, fontWeight: '600', color: t.textSecondary },
    input: {
      backgroundColor: t.surfaceAlt, borderWidth: 1.5, borderColor: t.border,
      borderRadius: 12, padding: 16, fontSize: 16, color: t.text,
    },
    botonPrincipal: { backgroundColor: t.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
    textoBotonPrincipal: { color: '#fff', fontWeight: '700', fontSize: 16 },
    botonSecundario: { borderWidth: 1.5, borderColor: t.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
    textoBotonSecundario: { color: t.primary, fontWeight: '700', fontSize: 16 },
    botonDeshabilitado: { opacity: 0.4 },
    botonCancelar: { alignItems: 'center', padding: 8 },
    textoCancelarModal: { color: t.textMuted, fontSize: 15 },
    separadorTexto: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    lineaSep: { flex: 1, height: 1, backgroundColor: t.border },
    textoSep: { color: t.textMuted, fontSize: 13 },
  });
}
