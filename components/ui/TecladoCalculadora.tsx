import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '@/constants/theme';

interface Props {
  visible: boolean;
  valor: string;
  color?: string;
  onCambio: (v: string) => void;
  onCerrar: () => void;
}

const FILAS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
];

export function TecladoCalculadora({ visible, valor, color, onCambio, onCerrar }: Props) {
  const t = useTheme();
  const accentColor = color ?? t.primary;

  function presionar(tecla: string) {
    if (tecla === '⌫') { onCambio(valor.slice(0, -1)); return; }
    if (tecla === '.' && valor.includes('.')) return;
    if (tecla === '.' && valor === '') return;
    if (valor.length >= 10) return;
    const parteDecimal = valor.split('.')[1];
    if (parteDecimal !== undefined && parteDecimal.length >= 2) return;
    onCambio(valor + tecla);
  }

  const display = valor ? `$ ${valor}` : '$ 0';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <TouchableWithoutFeedback onPress={onCerrar}>
        <View style={estilos.overlay} />
      </TouchableWithoutFeedback>

      <View style={[estilos.panel, { backgroundColor: t.surface }]}>
        <View style={[estilos.display, { borderBottomColor: t.border }]}>
          <Text style={[estilos.montoDisplay, { color: accentColor }]} numberOfLines={1} adjustsFontSizeToFit>
            {display}
          </Text>
        </View>

        <View style={estilos.teclado}>
          {FILAS.map((fila, i) => (
            <View key={i} style={estilos.fila}>
              {fila.map((tecla) => (
                <TouchableOpacity
                  key={tecla}
                  style={[
                    estilos.tecla,
                    { backgroundColor: t.surfaceAlt },
                    tecla === '⌫' && { backgroundColor: t.negative + '14' },
                  ]}
                  onPress={() => presionar(tecla)}
                  activeOpacity={0.6}
                >
                  <Text style={[
                    estilos.textoTecla,
                    { color: t.text },
                    tecla === '⌫' && { color: t.negative },
                  ]}>
                    {tecla}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[estilos.botonListo, { backgroundColor: accentColor }]}
          onPress={onCerrar}
          activeOpacity={0.8}
        >
          <Text style={estilos.textoListo}>Listo</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 12,
  },
  display: { alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  montoDisplay: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  teclado: { gap: 8 },
  fila: { flexDirection: 'row', gap: 8 },
  tecla: { flex: 1, paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  textoTecla: { fontSize: 22, fontWeight: '600' },
  botonListo: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  textoListo: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
