import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useGrupo } from '@/hooks/useGrupo';
import { useGrupoStore } from '@/store/grupoStore';
import { useTheme } from '@/constants/theme';
import { useT } from '@/hooks/useT';
import { useMoneda } from '@/hooks/useMoneda';
import { obtenerMiembros, salirDeGrupo, cerrarGrupo, renombrarGrupo } from '@/lib/grupos';
import { obtenerGastosDelMes, obtenerResumenMesGrupo } from '@/lib/gastos';
import { TarjetaGasto } from '@/components/ui/TarjetaGasto';
import { QRGrupo } from '@/components/ui/QRGrupo';

export default function DetalleGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const i18n = useT();
  const { formatear } = useMoneda();
  const usuario = useAuthStore((s) => s.usuario);
  const { grupos, recargar } = useGrupo();
  const { contextoId, setContexto } = useGrupoStore();

  const entrada = grupos.find((g) => g.grupo.id === id);
  const grupo = entrada?.grupo;
  const rol = entrada?.rol;
  const esAdmin = rol === 'admin';
  const esActivo = id === contextoId;

  const [miembros, setMiembros] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<{ gastos: number; ingresos: number; total: number } | null>(null);
  const [cargando, setCargando] = useState(true);

  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreEditado, setNombreEditado] = useState('');
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    try {
      const [ms, gs, rs] = await Promise.all([
        obtenerMiembros(id),
        obtenerGastosDelMes(usuario!.id, id),
        obtenerResumenMesGrupo(id),
      ]);
      setMiembros(ms ?? []);
      setGastos(gs ?? []);
      setResumen(rs);
    } catch {
      // silencioso
    } finally {
      setCargando(false);
    }
  }, [id, usuario]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleGuardarNombre() {
    if (!nombreEditado.trim() || !usuario || !id) return;
    setGuardandoNombre(true);
    try {
      await renombrarGrupo(id, usuario.id, nombreEditado);
      setEditandoNombre(false);
      await recargar();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function handleSalir() {
    if (!grupo || !usuario) return;
    Alert.alert(i18n.salirGrupo, i18n.alertSalirMsg(grupo.name), [
      { text: i18n.cancelar, style: 'cancel' },
      {
        text: i18n.alertSalir, style: 'destructive',
        onPress: async () => {
          try {
            await salirDeGrupo(id!, usuario.id);
            if (esActivo) setContexto('personal');
            recargar();
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  async function handleCerrar() {
    if (!grupo || !usuario) return;
    Alert.alert(i18n.cerrarGrupo, i18n.alertCerrarMsg(grupo.name), [
      { text: i18n.cancelar, style: 'cancel' },
      {
        text: i18n.cerrarGrupo, style: 'destructive',
        onPress: async () => {
          try {
            await cerrarGrupo(id!, usuario.id);
            if (esActivo) setContexto('personal');
            recargar();
            router.back();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  const s = makeStyles(t);

  if (!grupo || cargando) {
    return (
      <View style={s.centrado}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Barra superior */}
      <View style={s.navbar}>
        <TouchableOpacity style={s.botonVolver} onPress={() => router.back()} hitSlop={12}>
          <Text style={s.textoVolver}>‹</Text>
        </TouchableOpacity>

        {editandoNombre ? (
          <View style={s.filaNombreEdit}>
            <TextInput
              style={s.inputNombre}
              value={nombreEditado}
              onChangeText={setNombreEditado}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleGuardarNombre}
            />
            <TouchableOpacity
              style={[s.botonGuardar, (!nombreEditado.trim() || guardandoNombre) && { opacity: 0.4 }]}
              onPress={handleGuardarNombre}
              disabled={!nombreEditado.trim() || guardandoNombre}
            >
              {guardandoNombre
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={s.botonCancelarEdit} onPress={() => setEditandoNombre(false)}>
              <Ionicons name="close" size={18} color={t.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.filaNombre}>
            <Text style={s.titulo} numberOfLines={1}>{grupo.name}</Text>
            {esAdmin && (
              <TouchableOpacity
                style={s.botonLapiz}
                onPress={() => { setNombreEditado(grupo.name); setEditandoNombre(true); }}
                hitSlop={8}
              >
                <Ionicons name="create-outline" size={18} color={t.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

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
      </View>

      <ScrollView contentContainerStyle={s.contenido}>

        {/* Resumen financiero */}
        {resumen && (
          <View style={s.resumenGrid}>
            <View style={[s.resumenTarjeta, { flex: 1 }]}>
              <Text style={s.resumenLabel}>{i18n.gastos} (mes)</Text>
              <Text style={[s.resumenValorGrande, { color: t.negative }]}>{formatear(resumen.gastos)}</Text>
            </View>
            {resumen.ingresos > 0 && (
              <View style={[s.resumenTarjeta, { flex: 1 }]}>
                <Text style={s.resumenLabel}>{i18n.ingresos} (mes)</Text>
                <Text style={[s.resumenValorGrande, { color: t.positive }]}>{formatear(resumen.ingresos)}</Text>
              </View>
            )}
            <View style={[s.resumenTarjeta, { minWidth: 80 }]}>
              <Text style={s.resumenLabel}>{i18n.movimientos}</Text>
              <Text style={s.resumenValorGrande}>{resumen.total}</Text>
            </View>
          </View>
        )}

        {/* Miembros */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>
            👥 {miembros.length} {miembros.length === 1 ? i18n.miembro : i18n.miembros}
          </Text>
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
        </View>

        {/* Invitación */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>🔗 {i18n.codigoInvitacion}</Text>
          <View style={s.inviteContenido}>
            <Text style={s.codigo}>{grupo.invite_code.toUpperCase()}</Text>
            <QRGrupo nombre={grupo.name} codigo={grupo.invite_code} />
          </View>
        </View>

        {/* Movimientos del mes */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>📋 {i18n.movimientos} ({new Date().toLocaleDateString('es-AR', { month: 'long' })})</Text>
          {gastos.length === 0 ? (
            <Text style={s.vacio}>{i18n.sinMovimientosMes}</Text>
          ) : (
            <View style={s.listaGastos}>
              {gastos.map((g: any) => (
                <TarjetaGasto
                  key={g.id}
                  descripcion={g.description}
                  categoria={g.category}
                  monto={g.amount}
                  fecha={g.date}
                  tipo={g.tipo}
                  fuente={g.fuente}
                  esGrupal
                  autor={g.users?.name ?? g.users?.[0]?.name}
                />
              ))}
            </View>
          )}
        </View>

        {/* Acciones destructivas */}
        <View style={s.accionesFila}>
          <TouchableOpacity style={s.botonSalir} onPress={handleSalir} activeOpacity={0.7}>
            <Text style={s.textoSalir}>{i18n.salirGrupo}</Text>
          </TouchableOpacity>
          {esAdmin && (
            <TouchableOpacity style={s.botonCerrar} onPress={handleCerrar} activeOpacity={0.7}>
              <Text style={s.textoCerrar}>{i18n.cerrarGrupo}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Seleccionar como grupo activo → navega al panel */}
        {!esActivo ? (
          <TouchableOpacity
            style={s.botonActivar}
            onPress={() => { setContexto(id!); router.replace('/(tabs)'); }}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={15} color={t.primary} />
            <Text style={s.textoActivar}>{i18n.verGrupoEnInicio}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.bannerActivo}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={14} color={t.primary} />
            <Text style={s.textoBannerActivo}>{i18n.grupoSeleccionadoEnInicio}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },

    navbar: {
      paddingTop: 56,
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: t.bg,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      gap: 6,
    },
    botonVolver: { marginBottom: 4 },
    textoVolver: { fontSize: 32, color: t.primary, lineHeight: 36, fontWeight: '300' },

    filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titulo: { fontSize: 24, fontWeight: '800', color: t.text, flex: 1 },
    botonLapiz: { padding: 4 },

    filaNombreEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    inputNombre: {
      flex: 1, backgroundColor: t.surfaceAlt,
      borderWidth: 1.5, borderColor: t.primary,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
      fontSize: 18, fontWeight: '700', color: t.text,
    },
    botonGuardar: {
      backgroundColor: t.primary, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    botonCancelarEdit: {
      borderWidth: 1.5, borderColor: t.border, borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 9,
    },

    badgesFila: { flexDirection: 'row', gap: 6 },
    badgeAdmin: { backgroundColor: t.badgeGrupoBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    textoBadge: { fontSize: 11, color: t.badgeGrupoText, fontWeight: '700' },
    badgeActivo: {
      backgroundColor: t.primary + '18', paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 8, borderWidth: 1, borderColor: t.primary + '40',
    },
    textoBadgeActivo: { fontSize: 11, color: t.primary, fontWeight: '700' },

    contenido: { padding: 20, paddingBottom: 60, gap: 20 },

    botonActivar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderWidth: 1, borderColor: t.primary + '50',
      borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    },
    textoActivar: { color: t.primary, fontWeight: '600', fontSize: 14 },
    bannerActivo: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: t.primary + '0e',
      borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    },
    textoBannerActivo: { color: t.primary, fontWeight: '600', fontSize: 14 },

    resumenGrid: { flexDirection: 'row', gap: 10 },
    resumenTarjeta: {
      backgroundColor: t.surface, borderRadius: 14, padding: 14,
      alignItems: 'center', gap: 4,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    resumenLabel: { fontSize: 11, color: t.textMuted, fontWeight: '500' },
    resumenValorGrande: { fontSize: 20, fontWeight: '800', color: t.text },

    seccion: {
      backgroundColor: t.surface, borderRadius: 16, padding: 16, gap: 12,
    },
    seccionTitulo: { fontSize: 14, fontWeight: '700', color: t.textSecondary },

    listaMiembros: { gap: 10 },
    filaMiembro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarMiembro: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: t.badgeGrupoBg, justifyContent: 'center', alignItems: 'center',
    },
    avatarTexto: { fontSize: 13, fontWeight: '700', color: t.primary },
    nombreMiembro: { fontSize: 15, color: t.text, fontWeight: '500', flex: 1 },
    badgeAdminMini: { backgroundColor: t.badgeGrupoBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    textoBadgeAdminMini: { fontSize: 10, color: t.badgeGrupoText, fontWeight: '700' },

    inviteContenido: { gap: 8 },
    codigo: { fontSize: 20, fontWeight: '800', color: t.text, letterSpacing: 4 },

    listaGastos: {
      borderTopWidth: 1, borderTopColor: t.border, paddingTop: 4,
    },
    vacio: { color: t.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 12 },

    accionesFila: { flexDirection: 'row', gap: 10 },
    botonSalir: {
      flex: 1, borderWidth: 1.5, borderColor: t.negative + '50',
      borderRadius: 12, padding: 14, alignItems: 'center',
    },
    textoSalir: { color: t.negative, fontWeight: '700', fontSize: 14 },
    botonCerrar: {
      flex: 1, backgroundColor: t.negative + '14',
      borderRadius: 12, padding: 14, alignItems: 'center',
    },
    textoCerrar: { color: t.negative, fontWeight: '700', fontSize: 14 },
  });
}
