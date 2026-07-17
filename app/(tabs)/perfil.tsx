import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, TextInput,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';
import { useGrupoStore } from '@/store/grupoStore';
import { supabase } from '@/lib/supabase';
import { calcularRangoDeMes } from '@/lib/gastos';

export default function PantallaPerfil() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGrupoStore((s) => s.grupos);

  const [nombre, setNombre] = useState('');
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [statsMovimientos, setStatsMovimientos] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);

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
      .then(({ count }) => {
        setStatsMovimientos(count ?? 0);
        setCargando(false);
      });
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
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const inicial = (nombre || usuario?.email || '?')[0].toUpperCase();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const proveedorGoogle = usuario?.app_metadata?.provider === 'google';

  return (
    <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido}>

      {/* ── Avatar y nombre ─────────────────────────────────────────────── */}
      <View style={estilos.perfilHeader}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{inicial}</Text>
        </View>

        {editandoNombre ? (
          <View style={estilos.editNombreFila}>
            <TextInput
              style={estilos.inputNombre}
              value={nombre}
              onChangeText={setNombre}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={guardarNombre}
              onBlur={guardarNombre}
            />
            {guardandoNombre
              ? <ActivityIndicator color="#6C47FF" size="small" />
              : <TouchableOpacity onPress={guardarNombre} activeOpacity={0.7}>
                  <Text style={estilos.textoGuardarNombre}>Guardar</Text>
                </TouchableOpacity>
            }
          </View>
        ) : (
          <TouchableOpacity style={estilos.nombreFila} onPress={() => setEditandoNombre(true)} activeOpacity={0.7}>
            <Text style={estilos.nombre}>{nombre}</Text>
            <Text style={estilos.iconoEditar}>✏️</Text>
          </TouchableOpacity>
        )}

        <Text style={estilos.email}>{usuario?.email}</Text>
        {proveedorGoogle && <Text style={estilos.badgeGoogle}>G Cuenta de Google</Text>}
      </View>

      {/* ── Stats del mes ───────────────────────────────────────────────── */}
      <View style={estilos.statsGrid}>
        <View style={estilos.statCard}>
          <Text style={estilos.statNumero}>
            {statsMovimientos === null ? '—' : statsMovimientos}
          </Text>
          <Text style={estilos.statLabel}>movimientos este mes</Text>
        </View>
        <View style={estilos.statCard}>
          <Text style={estilos.statNumero}>{grupos.length}</Text>
          <Text style={estilos.statLabel}>{grupos.length === 1 ? 'grupo' : 'grupos'}</Text>
        </View>
      </View>

      {/* ── Ajustes ─────────────────────────────────────────────────────── */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>⚙️ Ajustes</Text>

        <TouchableOpacity style={estilos.filaAccion} onPress={() => router.push('/notificaciones')} activeOpacity={0.7}>
          <View>
            <Text style={estilos.filaAccionTexto}>🔔 Notificaciones</Text>
            <Text style={estilos.filaAccionDesc}>Activar y configurar alertas</Text>
          </View>
          <Text style={estilos.chevron}>›</Text>
        </TouchableOpacity>

        <View style={estilos.divisor} />

        <TouchableOpacity style={estilos.filaAccion} onPress={() => router.push('/categorias')} activeOpacity={0.7}>
          <View>
            <Text style={estilos.filaAccionTexto}>🏷️ Categorías</Text>
            <Text style={estilos.filaAccionDesc}>Activá, ocultá o creá las tuyas</Text>
          </View>
          <Text style={estilos.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Cuenta ──────────────────────────────────────────────────────── */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>⚙️ Cuenta</Text>

        {!proveedorGoogle && (
          <TouchableOpacity
            style={estilos.filaAccion}
            onPress={() => Alert.alert('Cambiar contraseña', `Te enviamos un email a ${usuario?.email} con el enlace para cambiarla.`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Enviar email', onPress: async () => {
                await supabase.auth.resetPasswordForEmail(usuario?.email ?? '');
                Alert.alert('Enviado', 'Revisá tu bandeja de entrada.');
              }},
            ])}
            activeOpacity={0.7}
          >
            <Text style={estilos.filaAccionTexto}>Cambiar contraseña</Text>
            <Text style={estilos.chevron}>›</Text>
          </TouchableOpacity>
        )}

        <View style={[estilos.divisor, { marginVertical: 4 }]} />

        <TouchableOpacity style={estilos.botonSalir} onPress={cerrarSesion} activeOpacity={0.8}>
          <Text style={estilos.textoSalir}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* ── App info ────────────────────────────────────────────────────── */}
      <Text style={estilos.version}>Wallit v{version}</Text>

    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F9FAFB' },
  contenido: { padding: 20, paddingTop: 56, paddingBottom: 48, gap: 20 },

  perfilHeader: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { fontSize: 32, fontWeight: '800', color: '#6C47FF' },

  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { fontSize: 22, fontWeight: '800', color: '#111827' },
  iconoEditar: { fontSize: 14 },

  editNombreFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputNombre: {
    fontSize: 20, fontWeight: '700', color: '#111827',
    borderBottomWidth: 2, borderBottomColor: '#6C47FF',
    paddingBottom: 2, minWidth: 160, textAlign: 'center',
  },
  textoGuardarNombre: { color: '#6C47FF', fontWeight: '700', fontSize: 14 },

  email: { fontSize: 13, color: '#9CA3AF' },
  badgeGoogle: {
    fontSize: 12, color: '#4285F4', fontWeight: '600',
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },

  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 4,
  },
  statNumero: { fontSize: 32, fontWeight: '800', color: '#6C47FF' },
  statLabel: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },

  seccion: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 4 },
  tituloSeccion: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },

  divisor: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },

  filaAccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  filaAccionTexto: { fontSize: 14, fontWeight: '600', color: '#374151' },
  filaAccionDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  chevron: { fontSize: 20, color: '#9CA3AF' },

  botonSalir: {
    borderWidth: 1.5, borderColor: '#FCA5A5',
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4,
  },
  textoSalir: { color: '#DC2626', fontWeight: '700', fontSize: 14 },

  version: { textAlign: 'center', fontSize: 12, color: '#D1D5DB' },
});
