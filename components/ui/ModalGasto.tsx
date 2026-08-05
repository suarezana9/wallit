import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useState } from 'react';
import { SelectorFecha } from './SelectorFecha';
import { supabase } from '@/lib/supabase';
import { formatearFechaRelativa } from '@/lib/gastos';
import { useMoneda } from '@/hooks/useMoneda';
import { getCategoriaColor, getCategoriaEmoji, getCategoriaVisibles } from '@/lib/categorias';
import { useCategoriaStore } from '@/store/categoriaStore';
import { useTheme } from '@/constants/theme';
import type { Categoria, TipoMovimiento, Database } from '@/types/database';

type Gasto = Database['public']['Tables']['expenses']['Row'];

const CONFIG_TIPO_EMOJI: Record<TipoMovimiento, { emoji: string; label: string }> = {
  gasto:     { emoji: '',   label: 'Gasto'     },
  ingreso:   { emoji: '💰', label: 'Ingreso'   },
  ahorro:    { emoji: '🏦', label: 'Ahorro'    },
  inversion: { emoji: '📈', label: 'Inversión' },
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
  const t = useTheme();
  const { formatear } = useMoneda();
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
    const labelTipo = CONFIG_TIPO_EMOJI[tipo].label.toLowerCase();
    Alert.alert(
      `Eliminar ${labelTipo}`,
      `¿Eliminás "${gasto.description || gasto.category}" de ${formatear(Number(gasto.amount))}?`,
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
  const cfg = CONFIG_TIPO_EMOJI[tipo];
  const TIPO_COLOR: Record<TipoMovimiento, string> = {
    gasto: t.primary, ingreso: t.tipoIngreso, ahorro: t.tipoAhorro, inversion: t.tipoInversion,
  };
  const color = esGasto ? getCategoriaColor(gasto.category, catConfig) : TIPO_COLOR[tipo];
  const emoji = esGasto ? getCategoriaEmoji(gasto.category, catConfig) : cfg.emoji;
  const fechaGasto = formatearFechaRelativa(gasto.date);

  const s = makeStyles(t);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <View style={s.contenedor}>
        <View style={s.header}>
          <TouchableOpacity onPress={cerrar} style={s.botonCerrar}>
            <Text style={s.textoCerrar}>Cerrar</Text>
          </TouchableOpacity>
          <Text style={s.tituloHeader}>{editando ? `Editar ${cfg.label.toLowerCase()}` : 'Detalle'}</Text>
          {!editando
            ? <TouchableOpacity onPress={abrirEdicion}><Text style={[s.textoAccion, { color: t.primary }]}>Editar</Text></TouchableOpacity>
            : <TouchableOpacity onPress={guardar} disabled={guardando}>
                {guardando
                  ? <ActivityIndicator color={t.primary} />
                  : <Text style={[s.textoAccion, { color: t.primary }]}>Guardar</Text>
                }
              </TouchableOpacity>
          }
        </View>

        <ScrollView contentContainerStyle={s.contenido}>
          {!editando ? (
            <>
              <View style={[s.iconoGrande, { backgroundColor: color + '18' }]}>
                <Text style={s.emojiGrande}>{emoji}</Text>
              </View>
              <Text style={[s.montoGrande, { color: esGasto ? t.text : color }]}>
                {!esGasto && '+'}
                {formatear(Number(gasto.amount))}
              </Text>
              <Text style={s.descripcionDetalle}>{gasto.description || (esGasto ? gasto.category : cfg.label)}</Text>
              <View style={s.pills}>
                {esGasto && (
                  <View style={[s.pill, { backgroundColor: t.surfaceAlt }]}>
                    <Text style={[s.pillTexto, { color: t.textSecondary }]}>{emoji} {gasto.category}</Text>
                  </View>
                )}
                {!esGasto && (
                  <View style={[s.pill, { backgroundColor: color + '14' }]}>
                    <Text style={[s.pillTexto, { color }]}>{cfg.label}</Text>
                  </View>
                )}
                {gasto.fuente && (
                  <View style={[s.pill, { backgroundColor: t.surfaceAlt }]}>
                    <Text style={[s.pillTexto, { color: t.textSecondary }]}>💼 {gasto.fuente}</Text>
                  </View>
                )}
                <View style={[s.pill, { backgroundColor: t.surfaceAlt }]}>
                  <Text style={[s.pillTexto, { color: t.textSecondary }]}>📅 {fechaGasto}</Text>
                </View>
                {gasto.is_private && (
                  <View style={[s.pill, { backgroundColor: t.surfaceAlt }]}>
                    <Text style={[s.pillTexto, { color: t.textSecondary }]}>🔒 Privado</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={[s.botonEliminar, { borderColor: t.negative + '50' }]} onPress={eliminar} activeOpacity={0.8}>
                <Text style={[s.textoEliminar, { color: t.negative }]}>🗑️ Eliminar {cfg.label.toLowerCase()}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.campoMonto}>
                <Text style={[s.simboloPeso, { color: t.textMuted }]}>$</Text>
                <TextInput
                  style={[s.inputMonto, { color: t.text }]}
                  value={monto}
                  onChangeText={setMonto}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={t.textMuted}
                />
              </View>

              <TextInput
                style={[s.inputDescripcion, { color: t.text, borderColor: t.border }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Descripción"
                placeholderTextColor={t.textMuted}
              />

              {esGasto && (
                <>
                  <Text style={[s.etiqueta, { color: t.textSecondary }]}>Categoría</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
                    {categorias.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[s.chip, { borderColor: t.border, backgroundColor: t.surfaceAlt },
                          categoria === cat && { borderColor: t.primary, backgroundColor: t.primary + '12' }]}
                        onPress={() => setCategoria(cat as Categoria)}
                        activeOpacity={0.7}
                      >
                        <Text>{getCategoriaEmoji(cat, catConfig)}</Text>
                        <Text style={[s.chipTexto, { color: t.textSecondary },
                          categoria === cat && { color: t.primary, fontWeight: '700' }]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {tipo === 'ingreso' && (
                <>
                  <Text style={[s.etiqueta, { color: t.textSecondary }]}>Fuente del ingreso</Text>
                  <View style={s.fuenteGrid}>
                    {FUENTES.map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        style={[s.chip, { borderColor: t.border, backgroundColor: t.surfaceAlt },
                          fuente === f.id && { borderColor: t.primaryMid, backgroundColor: t.primaryMid + '14' }]}
                        onPress={() => setFuente(f.id)}
                        activeOpacity={0.7}
                      >
                        <Text>{f.emoji}</Text>
                        <Text style={[s.chipTexto, { color: t.textSecondary },
                          fuente === f.id && { color: t.primaryMid, fontWeight: '700' }]}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[s.etiqueta, { color: t.textSecondary }]}>Fecha</Text>
              <TouchableOpacity
                style={[s.botonFecha, { borderColor: t.border }]}
                onPress={() => setMostrarFecha(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.textoFecha, { color: t.text }]}>
                  📅 {formatearFechaRelativa(fecha.toISOString().split('T')[0])}
                </Text>
              </TouchableOpacity>
              <SelectorFecha
                fecha={fecha}
                visible={mostrarFecha}
                onChange={setFecha}
                onCerrar={() => setMostrarFecha(false)}
              />

              {esGasto && (
                <View style={s.filaSwitch}>
                  <Text style={[s.etiqueta, { color: t.textSecondary }]}>🔒 Gasto privado</Text>
                  <Switch value={esPrivado} onValueChange={setEsPrivado} trackColor={{ true: t.primary }} />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, paddingTop: 16,
      borderBottomWidth: 1, borderBottomColor: t.border,
      backgroundColor: t.surface,
    },
    botonCerrar: { minWidth: 60 },
    textoCerrar: { fontSize: 16, color: t.textMuted },
    tituloHeader: { fontSize: 16, fontWeight: '700', color: t.text },
    textoAccion: { fontSize: 16, fontWeight: '700', minWidth: 60, textAlign: 'right' },
    contenido: { padding: 24, gap: 20, alignItems: 'center' },
    iconoGrande: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    emojiGrande: { fontSize: 36 },
    montoGrande: { fontSize: 42, fontWeight: '800', letterSpacing: -1.5 },
    descripcionDetalle: { fontSize: 18, color: t.textSecondary, fontWeight: '500', textAlign: 'center' },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    pillTexto: { fontSize: 13, fontWeight: '500' },
    botonEliminar: {
      marginTop: 16, borderWidth: 1.5,
      borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    },
    textoEliminar: { fontWeight: '700', fontSize: 15 },
    campoMonto: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
    simboloPeso: { fontSize: 32, fontWeight: '300' },
    inputMonto: { flex: 1, fontSize: 42, fontWeight: '800', padding: 0, letterSpacing: -1.5 },
    inputDescripcion: {
      alignSelf: 'stretch', borderWidth: 1.5,
      borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: t.surface,
    },
    etiqueta: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5,
    },
    chipTexto: { fontSize: 13 },
    botonFecha: {
      alignSelf: 'stretch', borderWidth: 1.5, borderRadius: 12, padding: 14,
    },
    textoFecha: { fontSize: 15, fontWeight: '600' },
    filaSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
    fuenteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  });
}
