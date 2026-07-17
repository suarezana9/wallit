import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { registrarPushToken } from '@/lib/notificaciones';

interface NotifConfig {
  sin_actividad: boolean;
  inicio_mes: boolean;
  cierre_mes: boolean;
  gasto_grupo: boolean;
  balance_negativo: boolean;
}

const CONFIG_DEFAULT: NotifConfig = {
  sin_actividad: true,
  inicio_mes: true,
  cierre_mes: true,
  gasto_grupo: true,
  balance_negativo: true,
};

const OPCIONES: { key: keyof NotifConfig; emoji: string; titulo: string; descripcion: string }[] = [
  { key: 'sin_actividad',    emoji: '💤', titulo: 'Sin actividad',    descripcion: 'Recordatorio si no cargás nada en 3 o 7 días' },
  { key: 'inicio_mes',       emoji: '🗓️', titulo: 'Inicio de mes',    descripcion: 'Aviso el día 2 para cargar ingresos' },
  { key: 'cierre_mes',       emoji: '📅', titulo: 'Cierre de mes',    descripcion: 'Recordatorio los últimos días del mes' },
  { key: 'gasto_grupo',      emoji: '👥', titulo: 'Gastos en grupo',  descripcion: 'Alerta cuando alguien carga un gasto grande' },
  { key: 'balance_negativo', emoji: '🔴', titulo: 'Balance negativo', descripcion: 'Aviso cuando los gastos superan los ingresos' },
];

export default function PantallaNotificaciones() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);

  const [config, setConfig] = useState<NotifConfig>(CONFIG_DEFAULT);
  const [tienePushToken, setTienePushToken] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from('users')
      .select('notif_config, push_token')
      .eq('id', usuario.id)
      .single()
      .then(({ data }) => {
        if (data?.notif_config) setConfig({ ...CONFIG_DEFAULT, ...data.notif_config });
        setTienePushToken(!!data?.push_token);
        setCargando(false);
      });
  }, [usuario]);

  async function toggle(key: keyof NotifConfig) {
    const nueva = { ...config, [key]: !config[key] };
    setConfig(nueva);
    await supabase.from('users').update({ notif_config: nueva }).eq('id', usuario!.id);
  }

  async function activar() {
    setGuardando(true);
    await registrarPushToken(usuario!.id);
    const { data } = await supabase.from('users').select('push_token').eq('id', usuario!.id).single();
    setGuardando(false);
    if (data?.push_token) {
      setTienePushToken(true);
      Alert.alert('¡Listo!', 'Las notificaciones están activadas.');
    } else {
      Alert.alert('Sin permiso', 'Revisá los permisos de notificaciones en la configuración del dispositivo.');
    }
  }

  return (
    <View style={estilos.pagina}>
      {/* Header */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={estilos.botonVolver}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={estilos.titulo}>Notificaciones</Text>
        {guardando
          ? <ActivityIndicator color="#6C47FF" style={{ width: 60 }} />
          : <View style={{ width: 60 }} />
        }
      </View>

      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.seccion}>

          {/* Botón activar (solo si no hay push token) */}
          {!tienePushToken && !cargando && (
            <TouchableOpacity style={estilos.botonActivar} onPress={activar} activeOpacity={0.8}>
              <Text style={estilos.textoActivar}>🔔 Activar notificaciones</Text>
            </TouchableOpacity>
          )}

          {tienePushToken && (
            <View style={estilos.badgeActivo}>
              <Text style={estilos.textoBadge}>✅ Notificaciones activadas</Text>
            </View>
          )}

          {/* Toggles */}
          {cargando ? (
            <ActivityIndicator color="#6C47FF" style={{ marginVertical: 20 }} />
          ) : (
            OPCIONES.map((op, i) => (
              <View key={op.key}>
                {i > 0 && <View style={estilos.divisor} />}
                <View style={estilos.fila}>
                  <Text style={estilos.filaEmoji}>{op.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.filaTitulo}>{op.titulo}</Text>
                    <Text style={estilos.filaDesc}>{op.descripcion}</Text>
                  </View>
                  <Switch
                    value={config[op.key]}
                    onValueChange={() => toggle(op.key)}
                    trackColor={{ true: '#6C47FF', false: '#E5E7EB' }}
                    thumbColor="#fff"
                    disabled={!tienePushToken}
                  />
                </View>
              </View>
            ))
          )}

          {tienePushToken && (
            <Text style={estilos.nota}>Las notificaciones se envían a las 9am hora Argentina.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  botonVolver: { fontSize: 16, color: '#6C47FF', fontWeight: '600', width: 60 },
  titulo: { fontSize: 17, fontWeight: '700', color: '#111827' },

  contenido: { padding: 20, paddingBottom: 48 },

  seccion: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 4 },

  botonActivar: {
    backgroundColor: '#6C47FF', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 16,
  },
  textoActivar: { color: '#fff', fontWeight: '700', fontSize: 14 },

  badgeActivo: {
    backgroundColor: '#F0FDF4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  textoBadge: { fontSize: 13, color: '#10B981', fontWeight: '600' },

  divisor: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  filaEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  filaTitulo: { fontSize: 14, fontWeight: '600', color: '#111827' },
  filaDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  nota: { fontSize: 11, color: '#D1D5DB', textAlign: 'center', marginTop: 12 },
});
