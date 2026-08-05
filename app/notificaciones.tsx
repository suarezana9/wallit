import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { registrarPushToken } from '@/lib/notificaciones';
import { useTheme } from '@/constants/theme';

interface NotifConfig {
  sin_actividad: boolean;
  sin_actividad_prolongada: boolean;
  inicio_mes: boolean;
  cierre_mes: boolean;
  presupuesto_80: boolean;
  gasto_grupo: boolean;
  balance_negativo: boolean;
  racha_positiva: boolean;
}

const CONFIG_DEFAULT: NotifConfig = {
  sin_actividad: true,
  sin_actividad_prolongada: true,
  inicio_mes: true,
  cierre_mes: true,
  presupuesto_80: true,
  gasto_grupo: true,
  balance_negativo: true,
  racha_positiva: true,
};

const OPCIONES: { key: keyof NotifConfig; emoji: string; titulo: string; descripcion: string }[] = [
  { key: 'sin_actividad',           emoji: '💤', titulo: 'Sin actividad',         descripcion: 'Recordatorio si no cargás nada en 3 días' },
  { key: 'sin_actividad_prolongada',emoji: '😴', titulo: 'Inactividad prolongada', descripcion: 'Aviso si llevás 7 días sin registrar nada' },
  { key: 'inicio_mes',              emoji: '🗓️', titulo: 'Inicio de mes',          descripcion: 'Aviso el día 2 para cargar ingresos del mes' },
  { key: 'cierre_mes',              emoji: '📅', titulo: 'Cierre de mes',          descripcion: 'Recordatorio los últimos días para cerrar el mes' },
  { key: 'presupuesto_80',          emoji: '⚠️', titulo: 'Presupuesto al límite',  descripcion: 'Alerta cuando una categoría supera el 80% del presupuesto' },
  { key: 'gasto_grupo',             emoji: '👥', titulo: 'Gastos en grupo',        descripcion: 'Alerta cuando alguien carga un gasto grande en tu grupo' },
  { key: 'balance_negativo',        emoji: '🔴', titulo: 'Balance negativo',       descripcion: 'Aviso cuando los gastos del mes superan los ingresos' },
  { key: 'racha_positiva',          emoji: '🔥', titulo: 'Racha positiva',         descripcion: '¡Celebramos cuando llevás 7 días seguidos registrando!' },
];

export default function PantallaNotificaciones() {
  const t = useTheme();
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

  const s = makeStyles(t);

  return (
    <View style={s.pagina}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.botonVolver}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Notificaciones</Text>
        {guardando
          ? <ActivityIndicator color={t.primary} style={{ width: 60 }} />
          : <View style={{ width: 60 }} />
        }
      </View>

      <ScrollView contentContainerStyle={s.contenido}>
        {!tienePushToken && !cargando && (
          <TouchableOpacity style={s.botonActivar} onPress={activar} activeOpacity={0.8}>
            <Text style={s.textoActivar}>🔔 Activar notificaciones</Text>
          </TouchableOpacity>
        )}

        {tienePushToken && (
          <View style={s.badgeActivo}>
            <Text style={s.textoBadge}>✅ Notificaciones activadas</Text>
          </View>
        )}

        <View style={s.seccion}>
          {cargando ? (
            <ActivityIndicator color={t.primary} style={{ marginVertical: 20 }} />
          ) : (
            OPCIONES.map((op, i) => (
              <View key={op.key}>
                {i > 0 && <View style={s.divisor} />}
                <View style={s.fila}>
                  <Text style={s.filaEmoji}>{op.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.filaTitulo}>{op.titulo}</Text>
                    <Text style={s.filaDesc}>{op.descripcion}</Text>
                  </View>
                  <Switch
                    value={config[op.key]}
                    onValueChange={() => toggle(op.key)}
                    trackColor={{ true: t.primary, false: t.border }}
                    thumbColor={t.surface}
                    disabled={!tienePushToken}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {tienePushToken && (
          <Text style={s.nota}>Las notificaciones se envían a las 9am (hora Argentina).</Text>
        )}
        {!tienePushToken && !cargando && (
          <Text style={s.nota}>Activá las notificaciones para configurar cada alerta.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    pagina: { flex: 1, backgroundColor: t.bg },

    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
      backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    botonVolver: { fontSize: 16, color: t.primary, fontWeight: '600', width: 60 },
    titulo: { fontSize: 17, fontWeight: '700', color: t.text },

    contenido: { padding: 20, paddingBottom: 48, gap: 12 },

    botonActivar: {
      backgroundColor: t.primary, borderRadius: 14,
      padding: 16, alignItems: 'center',
    },
    textoActivar: { color: t.heroText, fontWeight: '700', fontSize: 15 },

    badgeActivo: {
      backgroundColor: t.accentBg, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10,
      alignSelf: 'flex-start',
    },
    textoBadge: { fontSize: 13, color: t.positive, fontWeight: '600' },

    seccion: { backgroundColor: t.surface, borderRadius: 16, padding: 20, gap: 4 },

    divisor: { height: 1, backgroundColor: t.border, marginVertical: 2 },
    fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    filaEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
    filaTitulo: { fontSize: 14, fontWeight: '600', color: t.text },
    filaDesc: { fontSize: 12, color: t.textMuted, marginTop: 2 },

    nota: { fontSize: 12, color: t.textMuted, textAlign: 'center' },
  });
}
