import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Switch, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  CATEGORIAS_BUILTIN, EMOJIS_PICKER, COLORES_PICKER,
  type CategoriaPersonalizada,
} from '@/lib/categorias';
import { useCategorias } from '@/hooks/useCategorias';
import { useTheme } from '@/constants/theme';

const COLOR_DEFAULT = COLORES_PICKER[5];

export default function PantallaCategorias() {
  const t = useTheme();
  const router = useRouter();
  const { config, guardarConfig } = useCategorias();
  const scrollRef = useRef<ScrollView>(null);

  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmoji, setNuevoEmoji] = useState('🏷️');
  const [nuevoColor, setNuevoColor] = useState(COLOR_DEFAULT);

  const ocultas = new Set(config.ocultas);

  async function toggleOculta(nombre: string) {
    const nuevas = new Set(ocultas);
    if (nuevas.has(nombre)) nuevas.delete(nombre);
    else nuevas.add(nombre);
    setGuardando(true);
    await guardarConfig({ ...config, ocultas: [...nuevas] });
    setGuardando(false);
  }

  async function agregarPersonalizada() {
    const nombre = nuevoNombre.trim();
    if (!nombre) { Alert.alert('Falta el nombre', 'Escribí un nombre para la categoría.'); return; }
    if (CATEGORIAS_BUILTIN.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      Alert.alert('Nombre duplicado', 'Ya existe una categoría predeterminada con ese nombre.'); return;
    }
    if (config.personalizadas.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      Alert.alert('Nombre duplicado', 'Ya creaste una categoría con ese nombre.'); return;
    }
    const nueva: CategoriaPersonalizada = {
      id: `custom_${Date.now()}`,
      nombre, emoji: nuevoEmoji, color: nuevoColor,
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
      `¿Eliminás "${cat?.nombre}"? Los movimientos ya registrados no cambian.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            setGuardando(true);
            await guardarConfig({ ...config, personalizadas: config.personalizadas.filter((p) => p.id !== id) });
            setGuardando(false);
          },
        },
      ]
    );
  }

  const s = makeStyles(t);

  return (
    <KeyboardAvoidingView style={s.pagina} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.botonVolver}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>Mis categorías</Text>
        {guardando
          ? <ActivityIndicator color={t.primary} style={{ width: 60 }} />
          : <View style={{ width: 60 }} />
        }
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">

        {/* Predeterminadas */}
        <View style={s.seccion}>
          <View style={s.seccionHeader}>
            <View>
              <Text style={s.tituloSeccion}>Predeterminadas</Text>
              <Text style={s.subtituloSeccion}>Desactivá las que no usás.</Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                const todasVisibles = CATEGORIAS_BUILTIN.every((c) => !ocultas.has(c.nombre));
                setGuardando(true);
                await guardarConfig({
                  ...config,
                  ocultas: todasVisibles ? CATEGORIAS_BUILTIN.map((c) => c.nombre) : [],
                });
                setGuardando(false);
              }}
              activeOpacity={0.7}
              style={s.botonToggleAll}
            >
              <Text style={s.textoToggleAll}>
                {CATEGORIAS_BUILTIN.every((c) => !ocultas.has(c.nombre)) ? 'Ocultar todas' : 'Mostrar todas'}
              </Text>
            </TouchableOpacity>
          </View>
          {CATEGORIAS_BUILTIN.map((cat, i) => {
            const visible = !ocultas.has(cat.nombre);
            return (
              <View key={cat.nombre}>
                {i > 0 && <View style={s.divisor} />}
                <View style={s.filaCategoria}>
                  <View style={[s.iconoCat, { backgroundColor: cat.color + '20' }]}>
                    <Text style={s.emojiCat}>{cat.emoji}</Text>
                  </View>
                  <Text style={[s.nombreCat, !visible && s.nombreCatOculto]}>{cat.nombre}</Text>
                  <Switch
                    value={visible}
                    onValueChange={() => toggleOculta(cat.nombre)}
                    trackColor={{ true: t.primary, false: t.border }}
                    thumbColor={t.surface}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Mis categorías */}
        <View style={s.seccion}>
          <Text style={s.tituloSeccion}>Mis categorías</Text>
          <Text style={s.subtituloSeccion}>Categorías propias que se suman a las predeterminadas.</Text>

          {config.personalizadas.length === 0 && !mostrarForm && (
            <Text style={s.vacio}>Todavía no creaste ninguna.</Text>
          )}

          {config.personalizadas.map((cat, i) => (
            <View key={cat.id}>
              {i > 0 && <View style={s.divisor} />}
              <View style={s.filaCategoria}>
                <View style={[s.iconoCat, { backgroundColor: cat.color + '20' }]}>
                  <Text style={s.emojiCat}>{cat.emoji}</Text>
                </View>
                <Text style={s.nombreCat}>{cat.nombre}</Text>
                <TouchableOpacity onPress={() => eliminarPersonalizada(cat.id)} activeOpacity={0.7} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {mostrarForm ? (
            <View style={s.form}>
              <TextInput
                style={s.inputNombre}
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                placeholder="Nombre de la categoría"
                placeholderTextColor={t.textMuted}
                autoFocus
                maxLength={20}
              />

              <Text style={s.etiquetaForm}>Elegí un emoji</Text>
              <View style={s.emojiGrid}>
                {EMOJIS_PICKER.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[s.emojiOpcion, nuevoEmoji === e && { borderColor: t.primary, backgroundColor: t.accentBg }]}
                    onPress={() => setNuevoEmoji(e)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.etiquetaForm}>Elegí un color</Text>
              <View style={s.colorGrid}>
                {COLORES_PICKER.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorOpcion, { backgroundColor: c }, nuevoColor === c && s.colorOpcionActiva]}
                    onPress={() => setNuevoColor(c)}
                    activeOpacity={0.7}
                  />
                ))}
              </View>

              <View style={s.preview}>
                <View style={[s.iconoCat, { backgroundColor: nuevoColor + '20' }]}>
                  <Text style={s.emojiCat}>{nuevoEmoji}</Text>
                </View>
                <Text style={[s.nombreCat, { color: nuevoColor }]}>
                  {nuevoNombre || 'Mi categoría'}
                </Text>
              </View>

              <View style={s.formBotones}>
                <TouchableOpacity
                  style={s.botonCancelar}
                  onPress={() => { setMostrarForm(false); setNuevoNombre(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.textoCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.botonGuardar}
                  onPress={agregarPersonalizada}
                  disabled={guardando}
                  activeOpacity={0.8}
                >
                  <Text style={s.textoGuardar}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={s.botonAgregar}
              onPress={() => {
                setMostrarForm(true);
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
              }}
              activeOpacity={0.8}
            >
              <Text style={s.textoAgregar}>+ Agregar categoría</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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

    contenido: { padding: 20, gap: 20, paddingBottom: 48 },

    seccion: { backgroundColor: t.surface, borderRadius: 16, padding: 20, gap: 4 },
    seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    tituloSeccion: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 2 },
    subtituloSeccion: { fontSize: 12, color: t.textMuted },
    botonToggleAll: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
      backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
    },
    textoToggleAll: { fontSize: 12, fontWeight: '700', color: t.primary },

    divisor: { height: 1, backgroundColor: t.border, marginVertical: 2 },
    vacio: { fontSize: 14, color: t.textMuted, textAlign: 'center', paddingVertical: 12 },

    filaCategoria: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
    iconoCat: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    emojiCat: { fontSize: 18 },
    nombreCat: { flex: 1, fontSize: 15, fontWeight: '600', color: t.text },
    nombreCatOculto: { color: t.textMuted },

    form: { marginTop: 16, gap: 14, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16 },
    inputNombre: {
      borderWidth: 1.5, borderColor: t.border, borderRadius: 12,
      padding: 14, fontSize: 16, color: t.text, backgroundColor: t.surfaceAlt,
    },
    etiquetaForm: { fontSize: 13, fontWeight: '600', color: t.textSecondary },

    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    emojiOpcion: {
      width: 44, height: 44, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surfaceAlt,
    },

    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorOpcion: { width: 36, height: 36, borderRadius: 18 },
    colorOpcionActiva: {
      borderWidth: 3, borderColor: t.surface,
      shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    },

    preview: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 12, backgroundColor: t.surfaceAlt, borderRadius: 12,
    },

    formBotones: { flexDirection: 'row', gap: 12 },
    botonCancelar: {
      flex: 1, padding: 14, borderRadius: 12,
      borderWidth: 1.5, borderColor: t.border, alignItems: 'center',
    },
    textoCancelar: { color: t.textSecondary, fontWeight: '600', fontSize: 14 },
    botonGuardar: {
      flex: 2, padding: 14, borderRadius: 12,
      backgroundColor: t.primary, alignItems: 'center',
    },
    textoGuardar: { color: t.heroText, fontWeight: '700', fontSize: 14 },

    botonAgregar: {
      marginTop: 12, padding: 14, borderRadius: 12,
      borderWidth: 1.5, borderColor: t.primary, alignItems: 'center',
      borderStyle: 'dashed',
    },
    textoAgregar: { color: t.primary, fontWeight: '700', fontSize: 14 },
  });
}
