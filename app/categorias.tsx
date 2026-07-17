import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Switch, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  CATEGORIAS_BUILTIN, EMOJIS_PICKER, COLORES_PICKER,
  getCategoriaEmoji,
  type CategoriaConfig, type CategoriaPersonalizada,
} from '@/lib/categorias';
import { useCategorias } from '@/hooks/useCategorias';

const COLOR_DEFAULT = COLORES_PICKER[5]; // #06B6D4

export default function PantallaCategorias() {
  const router = useRouter();
  const { config, guardarConfig } = useCategorias();
  const scrollRef = useRef<ScrollView>(null);

  const [guardando, setGuardando] = useState(false);

  // Estado del form de nueva categoría
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmoji, setNuevoEmoji] = useState('🏷️');
  const [nuevoColor, setNuevoColor] = useState(COLOR_DEFAULT);

  const ocultas = new Set(config.ocultas);

  async function toggleOculta(nombre: string) {
    const nuevas = new Set(ocultas);
    if (nuevas.has(nombre)) {
      nuevas.delete(nombre);
    } else {
      nuevas.add(nombre);
    }
    setGuardando(true);
    await guardarConfig({ ...config, ocultas: [...nuevas] });
    setGuardando(false);
  }

  async function agregarPersonalizada() {
    const nombre = nuevoNombre.trim();
    if (!nombre) { Alert.alert('Falta el nombre', 'Escribí un nombre para la categoría.'); return; }
    if (CATEGORIAS_BUILTIN.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      Alert.alert('Nombre duplicado', 'Ya existe una categoría predeterminada con ese nombre.');
      return;
    }
    if (config.personalizadas.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      Alert.alert('Nombre duplicado', 'Ya creaste una categoría con ese nombre.');
      return;
    }

    const nueva: CategoriaPersonalizada = {
      id: `custom_${Date.now()}`,
      nombre,
      emoji: nuevoEmoji,
      color: nuevoColor,
    };
    setGuardando(true);
    await guardarConfig({ ...config, personalizadas: [...config.personalizadas, nueva] });
    setGuardando(false);
    setMostrarForm(false);
    setNuevoNombre('');
    setNuevoEmoji('🏷️');
    setNuevoColor(COLOR_DEFAULT);
  }

  async function eliminarPersonalizada(id: string) {
    const cat = config.personalizadas.find((p) => p.id === id);
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminás "${cat?.nombre}"? Los movimientos ya registrados en esa categoría no cambian.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            setGuardando(true);
            await guardarConfig({
              ...config,
              personalizadas: config.personalizadas.filter((p) => p.id !== id),
            });
            setGuardando(false);
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={estilos.pagina}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={estilos.botonVolver}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={estilos.titulo}>Mis categorías</Text>
        {guardando
          ? <ActivityIndicator color="#6C47FF" style={{ width: 60 }} />
          : <View style={{ width: 60 }} />
        }
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Predeterminadas ─────────────────────────────────────────────── */}
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Predeterminadas</Text>
          <Text style={estilos.subtituloSeccion}>Desactivá las que no usás para tener una lista más limpia.</Text>

          {CATEGORIAS_BUILTIN.map((cat, i) => {
            const visible = !ocultas.has(cat.nombre);
            return (
              <View key={cat.nombre}>
                {i > 0 && <View style={estilos.divisor} />}
                <View style={estilos.filaCategoria}>
                  <View style={[estilos.iconoCat, { backgroundColor: cat.color + '20' }]}>
                    <Text style={estilos.emojiCat}>{cat.emoji}</Text>
                  </View>
                  <Text style={[estilos.nombreCat, !visible && estilos.nombreCatOculto]}>
                    {cat.nombre}
                  </Text>
                  <Switch
                    value={visible}
                    onValueChange={() => toggleOculta(cat.nombre)}
                    trackColor={{ true: '#6C47FF', false: '#E5E7EB' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Mis categorías ──────────────────────────────────────────────── */}
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Mis categorías</Text>
          <Text style={estilos.subtituloSeccion}>Categorías propias que se suman a las predeterminadas.</Text>

          {config.personalizadas.length === 0 && !mostrarForm && (
            <Text style={estilos.vacio}>Todavía no creaste ninguna.</Text>
          )}

          {config.personalizadas.map((cat, i) => (
            <View key={cat.id}>
              {i > 0 && <View style={estilos.divisor} />}
              <View style={estilos.filaCategoria}>
                <View style={[estilos.iconoCat, { backgroundColor: cat.color + '20' }]}>
                  <Text style={estilos.emojiCat}>{cat.emoji}</Text>
                </View>
                <Text style={estilos.nombreCat}>{cat.nombre}</Text>
                <TouchableOpacity onPress={() => eliminarPersonalizada(cat.id)} activeOpacity={0.7} style={estilos.botonEliminar}>
                  <Text style={estilos.iconoEliminar}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Form nueva categoría */}
          {mostrarForm ? (
            <View style={estilos.form}>
              <TextInput
                style={estilos.inputNombre}
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                placeholder="Nombre de la categoría"
                placeholderTextColor="#9CA3AF"
                autoFocus
                maxLength={20}
              />

              <Text style={estilos.etiquetaForm}>Elegí un emoji</Text>
              <View style={estilos.emojiGrid}>
                {EMOJIS_PICKER.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[estilos.emojiOpcion, nuevoEmoji === e && estilos.emojiOpcionActiva]}
                    onPress={() => setNuevoEmoji(e)}
                    activeOpacity={0.7}
                  >
                    <Text style={estilos.emojiOpcionTexto}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={estilos.etiquetaForm}>Elegí un color</Text>
              <View style={estilos.colorGrid}>
                {COLORES_PICKER.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[estilos.colorOpcion, { backgroundColor: c }, nuevoColor === c && estilos.colorOpcionActiva]}
                    onPress={() => setNuevoColor(c)}
                    activeOpacity={0.7}
                  />
                ))}
              </View>

              {/* Preview */}
              <View style={estilos.preview}>
                <View style={[estilos.iconoCat, { backgroundColor: nuevoColor + '20' }]}>
                  <Text style={estilos.emojiCat}>{nuevoEmoji}</Text>
                </View>
                <Text style={[estilos.nombreCat, { color: nuevoColor }]}>
                  {nuevoNombre || 'Mi categoría'}
                </Text>
              </View>

              <View style={estilos.formBotones}>
                <TouchableOpacity
                  style={estilos.botonCancelar}
                  onPress={() => { setMostrarForm(false); setNuevoNombre(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={estilos.textoCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={estilos.botonGuardar}
                  onPress={agregarPersonalizada}
                  disabled={guardando}
                  activeOpacity={0.8}
                >
                  <Text style={estilos.textoGuardar}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={estilos.botonAgregar}
              onPress={() => {
                setMostrarForm(true);
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
              }}
              activeOpacity={0.8}
            >
              <Text style={estilos.textoAgregar}>+ Agregar categoría</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
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

  contenido: { padding: 20, gap: 20, paddingBottom: 48 },

  seccion: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 4 },
  tituloSeccion: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subtituloSeccion: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },

  divisor: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 2 },
  vacio: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },

  filaCategoria: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, gap: 12,
  },
  iconoCat: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  emojiCat: { fontSize: 18 },
  nombreCat: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  nombreCatOculto: { color: '#9CA3AF' },
  botonEliminar: { padding: 4 },
  iconoEliminar: { fontSize: 18 },

  form: {
    marginTop: 16, gap: 14,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16,
  },
  inputNombre: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#111827',
  },
  etiquetaForm: { fontSize: 13, fontWeight: '600', color: '#374151' },

  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  emojiOpcion: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  emojiOpcionActiva: { borderColor: '#6C47FF', backgroundColor: '#EDE9FE' },
  emojiOpcionTexto: { fontSize: 22 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOpcion: {
    width: 36, height: 36, borderRadius: 18,
  },
  colorOpcionActiva: {
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12,
  },

  formBotones: { flexDirection: 'row', gap: 12 },
  botonCancelar: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  textoCancelar: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  botonGuardar: {
    flex: 2, padding: 14, borderRadius: 12,
    backgroundColor: '#6C47FF', alignItems: 'center',
  },
  textoGuardar: { color: '#fff', fontWeight: '700', fontSize: 14 },

  botonAgregar: {
    marginTop: 12, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#6C47FF', alignItems: 'center',
    borderStyle: 'dashed',
  },
  textoAgregar: { color: '#6C47FF', fontWeight: '700', fontSize: 14 },
});
