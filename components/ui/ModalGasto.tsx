import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useState } from 'react';
import { SelectorFecha } from './SelectorFecha';
import { supabase } from '@/lib/supabase';
import { formatearPeso } from '@/lib/gastos';
import { getCategoriaColor, getCategoriaEmoji, getCategoriaVisibles } from '@/lib/categorias';
import { useCategoriaStore } from '@/store/categoriaStore';
import type { Categoria, TipoMovimiento, Database } from '@/types/database';

type Gasto = Database['public']['Tables']['expenses']['Row'];

const CONFIG_TIPO: Record<TipoMovimiento, { emoji: string; color: string; label: string }> = {
  gasto:     { emoji: '',   color: '',        label: 'Gasto' },
  ingreso:   { emoji: '💰', color: '#10B981', label: 'Ingreso' },
  ahorro:    { emoji: '🏦', color: '#3B82F6', label: 'Ahorro' },
  inversion: { emoji: '📈', color: '#F59E0B', label: 'Inversión' },
};

const FUENTES: { id: string; emoji: string; label: string }[] = [
  { id: 'sueldo',    emoji: '💼', label: 'Sueldo' },
  { id: 'freelance', emoji: '💻', label: 'Freelance' },
  { id: 'alquiler',  emoji: '🏠', label: 'Alquiler' },
  { id: 'otro',      emoji: '💵', label: 'Otro' },
];

interface Props {
  gasto: Gasto | null;
  visible: boolean;
  onCerrar: () => void;
  onCambio: () => void;
}

export function ModalGasto({ gasto, visible, onCerrar, onCambio }: Props) {
  const catConfig = useCategoriaStore((s) => s.config);
  const categorias = getCategoriaVisibles(catConfig);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFecha, setMostrarFecha] = useState(false);

  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Otros');
  const [fecha, setFecha] = useState(new Date());
  const [esPrivado, setEsPrivado] = useState(false);
  const [fuente, setFuente] = useState('sueldo');

  function abrirEdicion() {
    if (!gasto) return;
    setMonto(String(gasto.amount));
    setDescripcion(gasto.description);
    setCategoria(gasto.category as Categoria);
    setFecha(new Date(gasto.date + 'T12:00:00'));
    setEsPrivado(gasto.is_private);
    setFuente(gasto.fuente ?? 'sueldo');
    setEditando(true);
  }

  function cerrar() {
    setEditando(false);
    setMostrarFecha(false);
    onCerrar();
  }

  async function guardar() {
    if (!gasto || !monto || Number(monto) <= 0) return;
    setGuardando(true);
    const esGastoEdit = (gasto.tipo ?? 'gasto') === 'gasto';
    const { error } = await supabase.from('expenses').update({
      amount: Number(monto),
      description: descripcion,
      category: esGastoEdit ? categoria : 'Otros',
      date: fecha.toISOString().split('T')[0],
      is_private: esGastoEdit ? esPrivado : false,
      fuente: (gasto.tipo ?? 'gasto') === 'ingreso' ? fuente : null,
    }).eq('id', gasto.id);
    setGuardando(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setEditando(false);
    onCambio();
    cerrar();
  }

  async function eliminar() {
    if (!gasto) return;
    const tipo = gasto.tipo ?? 'gasto';
    const labelTipo = CONFIG_TIPO[tipo].label.toLowerCase();
    Alert.alert(
      `Eliminar ${labelTipo}`,
      `¿Eliminás "${gasto.description || gasto.category}" de ${formatearPeso(Number(gasto.amount))}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('expenses').delete().eq('id', gasto.id);
            if (error) { Alert.alert('Error', error.message); return; }
            onCambio();
            cerrar();
          },
        },
      ]
    );
  }

  if (!gasto) return null;

  const tipo: TipoMovimiento = gasto.tipo ?? 'gasto';
  const esGasto = tipo === 'gasto';
  const cfg = CONFIG_TIPO[tipo];
  const color = esGasto ? getCategoriaColor(gasto.category, catConfig) : cfg.color;
  const emoji = esGasto ? getCategoriaEmoji(gasto.category, catConfig) : cfg.emoji;
  const fechaGasto = new Date(gasto.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <View style={estilos.contenedor}>
        {/* Header */}
        <View style={estilos.header}>
          <TouchableOpacity onPress={cerrar} style={estilos.botonCerrar}>
            <Text style={estilos.textoCerrar}>Cerrar</Text>
          </TouchableOpacity>
          <Text style={estilos.tituloHeader}>{editando ? `Editar ${cfg.label.toLowerCase()}` : 'Detalle'}</Text>
          {!editando
            ? <TouchableOpacity onPress={abrirEdicion}><Text style={estilos.textoEditar}>Editar</Text></TouchableOpacity>
            : <TouchableOpacity onPress={guardar} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#6C47FF" /> : <Text style={estilos.textoEditar}>Guardar</Text>}
              </TouchableOpacity>
          }
        </View>

        <ScrollView contentContainerStyle={estilos.contenido}>
          {!editando ? (
            <>
              <View style={[estilos.iconoGrande, { backgroundColor: color + '20' }]}>
                <Text style={estilos.emojiGrande}>{emoji}</Text>
              </View>
              <Text style={[estilos.montoGrande, { color }]}>
                {!esGasto && '+'}
                {formatearPeso(Number(gasto.amount))}
              </Text>
              <Text style={estilos.descripcionDetalle}>{gasto.description || (esGasto ? gasto.category : cfg.label)}</Text>
              <View style={estilos.pills}>
                {esGasto && <View style={estilos.pill}><Text style={estilos.pillTexto}>{emoji} {gasto.category}</Text></View>}
                {!esGasto && <View style={[estilos.pill, { backgroundColor: color + '15' }]}><Text style={[estilos.pillTexto, { color }]}>{cfg.label}</Text></View>}
                {gasto.fuente && <View style={estilos.pill}><Text style={estilos.pillTexto}>💼 {gasto.fuente}</Text></View>}
                <View style={estilos.pill}><Text style={estilos.pillTexto}>📅 {fechaGasto}</Text></View>
                {gasto.is_private && <View style={estilos.pill}><Text style={estilos.pillTexto}>🔒 Privado</Text></View>}
              </View>
              <TouchableOpacity style={estilos.botonEliminar} onPress={eliminar} activeOpacity={0.8}>
                <Text style={estilos.textoEliminar}>🗑️ Eliminar {cfg.label.toLowerCase()}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={estilos.campoMonto}>
                <Text style={estilos.simboloPeso}>$</Text>
                <TextInput
                  style={estilos.inputMonto}
                  value={monto}
                  onChangeText={setMonto}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#D1D5DB"
                />
              </View>

              <TextInput
                style={estilos.inputDescripcion}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Descripción"
                placeholderTextColor="#9CA3AF"
              />

              {esGasto && (
                <>
                  <Text style={estilos.etiqueta}>Categoría</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
                    {categorias.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[estilos.chip, categoria === cat && estilos.chipActivo]}
                        onPress={() => setCategoria(cat as Categoria)}
                        activeOpacity={0.7}
                      >
                        <Text>{getCategoriaEmoji(cat, catConfig)}</Text>
                        <Text style={[estilos.chipTexto, categoria === cat && estilos.chipTextoActivo]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {tipo === 'ingreso' && (
                <>
                  <Text style={estilos.etiqueta}>Fuente del ingreso</Text>
                  <View style={estilos.fuenteGrid}>
                    {FUENTES.map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        style={[estilos.chip, fuente === f.id && estilos.chipFuenteActivo]}
                        onPress={() => setFuente(f.id)}
                        activeOpacity={0.7}
                      >
                        <Text>{f.emoji}</Text>
                        <Text style={[estilos.chipTexto, fuente === f.id && estilos.chipFuenteTextoActivo]}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={estilos.etiqueta}>Fecha</Text>
              <TouchableOpacity style={estilos.botonFecha} onPress={() => setMostrarFecha(true)} activeOpacity={0.8}>
                <Text style={estilos.textoFecha}>
                  📅 {fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <SelectorFecha
                fecha={fecha}
                visible={mostrarFecha}
                onChange={setFecha}
                onCerrar={() => setMostrarFecha(false)}
              />

              {esGasto && (
                <View style={estilos.filaSwitch}>
                  <Text style={estilos.etiqueta}>🔒 Gasto privado</Text>
                  <Switch value={esPrivado} onValueChange={setEsPrivado} trackColor={{ true: '#6C47FF' }} />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  botonCerrar: { minWidth: 60 },
  textoCerrar: { fontSize: 16, color: '#9CA3AF' },
  tituloHeader: { fontSize: 16, fontWeight: '700', color: '#111827' },
  textoEditar: { fontSize: 16, color: '#6C47FF', fontWeight: '700', minWidth: 60, textAlign: 'right' },
  contenido: { padding: 24, gap: 20, alignItems: 'center' },
  iconoGrande: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  emojiGrande: { fontSize: 36 },
  montoGrande: { fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  descripcionDetalle: { fontSize: 18, color: '#374151', fontWeight: '500', textAlign: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pill: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pillTexto: { fontSize: 13, color: '#374151', fontWeight: '500' },
  botonEliminar: {
    marginTop: 16, borderWidth: 1.5, borderColor: '#FCA5A5',
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  textoEliminar: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  campoMonto: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  simboloPeso: { fontSize: 32, color: '#D1D5DB', fontWeight: '300' },
  inputMonto: { flex: 1, fontSize: 42, fontWeight: '800', color: '#111827', padding: 0 },
  inputDescripcion: {
    alignSelf: 'stretch', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 14, fontSize: 15, color: '#111827',
  },
  etiqueta: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', color: '#374151' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  chipActivo: { borderColor: '#6C47FF', backgroundColor: '#F5F2FF' },
  chipTexto: { fontSize: 13, color: '#6B7280' },
  chipTextoActivo: { color: '#6C47FF', fontWeight: '700' },
  botonFecha: {
    alignSelf: 'stretch', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 14,
  },
  textoFecha: { fontSize: 15, color: '#374151', fontWeight: '600' },
  filaSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
  fuenteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  chipFuenteActivo: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  chipFuenteTextoActivo: { color: '#10B981', fontWeight: '700' },
});
