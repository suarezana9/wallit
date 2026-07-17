import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  fecha: Date;
  visible: boolean;
  onChange: (fecha: Date) => void;
  onCerrar: () => void;
}

export function SelectorFecha({ fecha, visible, onChange, onCerrar }: Props) {
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

  // iOS: modal con spinner y botón Listo
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCerrar}>
      <TouchableOpacity style={estilos.fondo} onPress={onCerrar} activeOpacity={1} />
      <View style={estilos.panel}>
        <View style={estilos.header}>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={estilos.cancelar}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={estilos.titulo}>Fecha del gasto</Text>
          <TouchableOpacity onPress={onCerrar}>
            <Text style={estilos.listo}>Listo</Text>
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
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  titulo: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cancelar: { fontSize: 15, color: '#9CA3AF' },
  listo: { fontSize: 15, color: '#6C47FF', fontWeight: '700' },
  picker: { width: '100%' },
});
