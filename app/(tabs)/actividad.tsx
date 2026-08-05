import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/constants/theme';

export default function PantallaActividad() {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <Ionicons name="pulse-outline" size={52} color={t.textMuted} />
      <Text style={[styles.titulo, { color: t.text }]}>Actividad</Text>
      <Text style={[styles.desc, { color: t.textMuted }]}>
        Próximamente: feed de movimientos de todos tus grupos y alertas en tiempo real.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
  titulo: { fontSize: 22, fontWeight: '800' },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
