import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/constants/theme';

interface Props {
  fecha: Date;
  visible: boolean;
  onChange: (fecha: Date) => void;
  onCerrar: () => void;
}

export function SelectorFecha({ fecha, visible, onChange, onCerrar }: Props) {
  const t = useTheme();

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={fecha}
        mode="date"
        display="default"
        onChange={(_, d) => { if (d) onChange(d); onCerrar(); }}
        maximumDate={new Date()}
      />
    );
  }

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCerrar}>
      <TouchableOpacity style={estilos.fondo} onPress={onCerrar} activeOpacity={1} />
      <View style={[estilos.panel, { backgroundColor: t.surface, borderTopColor: t.border }]}>
        <View style={[estilos.header, { borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={[estilos.cancelar, { color: t.textMuted }]}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[estilos.titulo, { color: t.text }]}>Fecha del gasto</Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={[estilos.listo, { color: t.primary }]}>Listo</Text>
          </TouchableOpacity>
        </View>
        <DateTimePicker
          value={fecha}
          mode="date"
          display="spinner"
          onChange={(_, d) => { if (d) onChange(d); }}
          maximumDate={new Date()}
          locale="es-AR"
          style={estilos.picker}
        />
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  titulo: { fontSize: 15, fontWeight: '700' },
  cancelar: { fontSize: 15 },
  listo: { fontSize: 15, fontWeight: '700' },
  picker: { width: '100%' },
});
