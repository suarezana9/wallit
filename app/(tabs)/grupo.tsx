import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Share, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useGrupo } from '@/hooks/useGrupo';
import { crearGrupo, unirseAGrupo, salirDeGrupo, cerrarGrupo, migrarGastosAlGrupo, obtenerMiembros } from '@/lib/grupos';

export default function PantallaGrupos() {
  const usuario = useAuthStore((s) => s.usuario);
  const { grupos, cargando, recargar } = useGrupo();

  const [miembrosPorGrupo, setMiembrosPorGrupo] = useState<Record<string, any[]>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [vistaModal, setVistaModal] = useState<'menu' | 'crear' | 'unirse'>('menu');
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargarMiembros = useCallback(async () => {
    if (grupos.length === 0) return;
    const resultado: Record<string, any[]> = {};
    await Promise.all(
      grupos.map(async ({ grupo }) => {
        try {
          const ms = await obtenerMiembros(grupo.id);
          resultado[grupo.id] = ms ?? [];
        } catch {
          resultado[grupo.id] = [];
        }
      })
    );
    setMiembrosPorGrupo(resultado);
  }, [grupos]);

  useFocusEffect(useCallback(() => {
    recargar();
  }, [recargar]));

  // Cargar miembros cuando cambian los grupos
  useFocusEffect(useCallback(() => {
    cargarMiembros();
  }, [cargarMiembros]));

  function abrirModal(vista: 'menu' | 'crear' | 'unirse' = 'menu') {
    setVistaModal(vista);
    setNombreGrupo('');
    setCodigoIngresado('');
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setVistaModal('menu');
    setNombreGrupo('');
    setCodigoIngresado('');
  }

  function ofrecerMigracion(grupoId: string) {
    Alert.alert(
      'Gastos anteriores',
      '¿Querés mover tus gastos personales anteriores a este grupo?',
      [
        { text: 'No, dejarlos como están', style: 'cancel' },
        {
          text: 'Sí, moverlos',
          onPress: async () => {
            try { await migrarGastosAlGrupo(grupoId, usuario!.id); } catch {}
          },
        },
      ]
    );
  }

  async function handleCrear() {
    if (!nombreGrupo.trim() || !usuario) return;
    setProcesando(true);
    try {
      const grupo = await crearGrupo(nombreGrupo.trim(), usuario.id);
      cerrarModal();
      await recargar();
      ofrecerMigracion(grupo.id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleUnirse() {
    if (!codigoIngresado.trim() || !usuario) return;
    setProcesando(true);
    try {
      const grupo = await unirseAGrupo(codigoIngresado, usuario.id);
      cerrarModal();
      await recargar();
      ofrecerMigracion(grupo.id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleSalir(grupoId: string, nombreG: string) {
    if (!usuario) return;
    Alert.alert(
      'Salir del grupo',
      `¿Salir de "${nombreG}"? Ya no podrás ver sus movimientos compartidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir', style: 'destructive',
          onPress: async () => {
            try { await salirDeGrupo(grupoId, usuario.id); recargar(); }
            catch (e: any) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  }

  async function handleCerrar(grupoId: string, nombreG: string) {
    if (!usuario) return;
    Alert.alert(
      'Cerrar grupo',
      `¿Cerrar "${nombreG}" definitivamente? Todos los miembros perderán acceso.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar grupo', style: 'destructive',
          onPress: async () => {
            try { await cerrarGrupo(grupoId, usuario.id); recargar(); }
            catch (e: any) { Alert.alert('Error', e.message); }
          },
        },
      ]
    );
  }

  async function compartirCodigo(nombre: string, codigo: string) {
    await Share.share({
      message: `Unite a mi grupo "${nombre}" en Wallit 💸\nUsá el código: *${codigo.toUpperCase()}*`,
    });
  }

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </View>
    );
  }

  if (grupos.length === 0) {
    return (
      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido}>
        <Text style={estilos.titulo}>Grupos</Text>
        <Text style={estilos.subtitulo}>Compartí finanzas con tu familia, amigos o compañeros.</Text>
        <View style={estilos.ilustracion}><Text style={{ fontSize: 64 }}>👥</Text></View>
        <View style={estilos.opciones}>
          <TouchableOpacity style={estilos.botonPrincipal} onPress={() => abrirModal('crear')} activeOpacity={0.8}>
            <Text style={estilos.textoBotonPrincipal}>✨ Crear grupo nuevo</Text>
          </TouchableOpacity>
          <View style={estilos.separadorTexto}>
            <View style={estilos.lineaSep} /><Text style={estilos.textoSep}>o</Text><View style={estilos.lineaSep} />
          </View>
          <TouchableOpacity style={estilos.botonSecundario} onPress={() => abrirModal('unirse')} activeOpacity={0.8}>
            <Text style={estilos.textoBotonSecundario}>Tengo un código de invitación</Text>
          </TouchableOpacity>
        </View>
        <ModalNuevoGrupo
          visible={modalVisible} vista={vistaModal}
          nombreGrupo={nombreGrupo} codigoIngresado={codigoIngresado} procesando={procesando}
          onChangeNombre={setNombreGrupo} onChangeCodigo={setCodigoIngresado}
          onCambiarVista={setVistaModal} onCrear={handleCrear} onUnirse={handleUnirse} onCerrar={cerrarModal}
        />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={estilos.scroll} contentContainerStyle={estilos.contenido}>
        <View style={estilos.encabezadoFila}>
          <Text style={estilos.titulo}>Mis grupos</Text>
          <TouchableOpacity style={estilos.botonNuevo} onPress={() => abrirModal()} activeOpacity={0.8}>
            <Text style={estilos.textoBotonNuevo}>+ Nuevo</Text>
          </TouchableOpacity>
        </View>

        <Text style={estilos.ayuda}>
          Cambiá de contexto desde la pantalla Inicio para ver las finanzas de cada grupo.
        </Text>

        {grupos.map(({ grupo, rol }) => {
          const miembros = miembrosPorGrupo[grupo.id] ?? [];
          return (
            <View key={grupo.id} style={estilos.tarjetaGrupo}>
              {/* Nombre y rol */}
              <View style={estilos.tarjetaHeader}>
                <Text style={estilos.nombreGrupo}>{grupo.name}</Text>
                {rol === 'admin' && (
                  <View style={estilos.badgeAdmin}>
                    <Text style={estilos.textoBadge}>Admin</Text>
                  </View>
                )}
              </View>

              {/* Miembros */}
              {miembros.length > 0 && (
                <View style={estilos.miembrosSeccion}>
                  <View style={estilos.avataresFila}>
                    {miembros.slice(0, 6).map((m: any, i: number) => {
                      const user = Array.isArray(m.users) ? m.users[0] : m.users;
                      const inicial = user?.name?.[0]?.toUpperCase() ?? '?';
                      return (
                        <View key={i} style={[estilos.avatar, { marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }]}>
                          <Text style={estilos.avatarTexto}>{inicial}</Text>
                        </View>
                      );
                    })}
                    {miembros.length > 6 && (
                      <View style={[estilos.avatar, { marginLeft: -10, backgroundColor: '#E5E7EB' }]}>
                        <Text style={[estilos.avatarTexto, { color: '#6B7280' }]}>+{miembros.length - 6}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={estilos.cantMiembros}>
                    {miembros.length} {miembros.length === 1 ? 'miembro' : 'miembros'}
                  </Text>
                </View>
              )}

              <View style={estilos.divisor} />

              {/* Código de invitación */}
              <View style={estilos.codigoFila}>
                <View>
                  <Text style={estilos.labelCodigo}>Código de invitación</Text>
                  <Text style={estilos.codigo}>{grupo.invite_code.toUpperCase()}</Text>
                </View>
                <TouchableOpacity
                  style={estilos.botonCompartir}
                  onPress={() => compartirCodigo(grupo.name, grupo.invite_code)}
                  activeOpacity={0.7}
                >
                  <Text style={estilos.textoCompartir}>📤 Compartir</Text>
                </TouchableOpacity>
              </View>

              <View style={estilos.divisor} />

              {/* Acciones */}
              <View style={estilos.accionesFila}>
                <TouchableOpacity
                  style={estilos.botonSalir}
                  onPress={() => handleSalir(grupo.id, grupo.name)}
                  activeOpacity={0.7}
                >
                  <Text style={estilos.textoSalir}>Salir del grupo</Text>
                </TouchableOpacity>
                {rol === 'admin' && (
                  <TouchableOpacity
                    style={estilos.botonCerrar}
                    onPress={() => handleCerrar(grupo.id, grupo.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={estilos.textoCerrar}>Cerrar grupo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <ModalNuevoGrupo
        visible={modalVisible} vista={vistaModal}
        nombreGrupo={nombreGrupo} codigoIngresado={codigoIngresado} procesando={procesando}
        onChangeNombre={setNombreGrupo} onChangeCodigo={setCodigoIngresado}
        onCambiarVista={setVistaModal} onCrear={handleCrear} onUnirse={handleUnirse} onCerrar={cerrarModal}
      />
    </>
  );
}

interface ModalProps {
  visible: boolean;
  vista: 'menu' | 'crear' | 'unirse';
  nombreGrupo: string;
  codigoIngresado: string;
  procesando: boolean;
  onChangeNombre: (v: string) => void;
  onChangeCodigo: (v: string) => void;
  onCambiarVista: (v: 'menu' | 'crear' | 'unirse') => void;
  onCrear: () => void;
  onUnirse: () => void;
  onCerrar: () => void;
}

function ModalNuevoGrupo({
  visible, vista, nombreGrupo, codigoIngresado, procesando,
  onChangeNombre, onChangeCodigo, onCambiarVista, onCrear, onUnirse, onCerrar,
}: ModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={estilos.overlay} activeOpacity={1} onPress={onCerrar} />
        <View style={estilos.sheet}>
          {vista === 'menu' && (
            <>
              <Text style={estilos.sheetTitulo}>Agregar grupo</Text>
              <TouchableOpacity style={estilos.botonPrincipal} onPress={() => onCambiarVista('crear')} activeOpacity={0.8}>
                <Text style={estilos.textoBotonPrincipal}>✨ Crear grupo nuevo</Text>
              </TouchableOpacity>
              <View style={estilos.separadorTexto}>
                <View style={estilos.lineaSep} /><Text style={estilos.textoSep}>o</Text><View style={estilos.lineaSep} />
              </View>
              <TouchableOpacity style={estilos.botonSecundario} onPress={() => onCambiarVista('unirse')} activeOpacity={0.8}>
                <Text style={estilos.textoBotonSecundario}>Tengo un código de invitación</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onCerrar} style={estilos.botonCancelar}>
                <Text style={estilos.textoCancelarModal}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
          {vista === 'crear' && (
            <>
              <Text style={estilos.sheetTitulo}>Nuevo grupo</Text>
              <Text style={estilos.etiqueta}>Nombre del grupo</Text>
              <TextInput
                style={estilos.input} value={nombreGrupo} onChangeText={onChangeNombre}
                placeholder="ej: Casa García, Viaje Bariloche" placeholderTextColor="#9CA3AF" autoFocus
              />
              <TouchableOpacity
                style={[estilos.botonPrincipal, (!nombreGrupo.trim() || procesando) && estilos.botonDeshabilitado]}
                onPress={onCrear} disabled={!nombreGrupo.trim() || procesando} activeOpacity={0.8}
              >
                {procesando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.textoBotonPrincipal}>Crear grupo</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onCambiarVista('menu')} style={estilos.botonCancelar}>
                <Text style={estilos.textoCancelarModal}>Volver</Text>
              </TouchableOpacity>
            </>
          )}
          {vista === 'unirse' && (
            <>
              <Text style={estilos.sheetTitulo}>Unirse a un grupo</Text>
              <Text style={estilos.etiqueta}>Código de invitación</Text>
              <TextInput
                style={estilos.input} value={codigoIngresado} onChangeText={onChangeCodigo}
                placeholder="ej: ab3f9c2d" placeholderTextColor="#9CA3AF"
                autoCapitalize="none" autoCorrect={false} autoFocus
              />
              <TouchableOpacity
                style={[estilos.botonSecundario, (!codigoIngresado.trim() || procesando) && estilos.botonDeshabilitado]}
                onPress={onUnirse} disabled={!codigoIngresado.trim() || procesando} activeOpacity={0.8}
              >
                {procesando ? <ActivityIndicator color="#6C47FF" /> : <Text style={estilos.textoBotonSecundario}>Unirme al grupo</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onCambiarVista('menu')} style={estilos.botonCancelar}>
                <Text style={estilos.textoCancelarModal}>Volver</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F9FAFB' },
  contenido: { padding: 20, paddingTop: 56, paddingBottom: 48, gap: 20 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  titulo: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitulo: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  ayuda: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  ilustracion: { alignItems: 'center', paddingVertical: 16 },
  opciones: { gap: 12 },

  encabezadoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  botonNuevo: { backgroundColor: '#6C47FF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  textoBotonNuevo: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tarjetaGrupo: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tarjetaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombreGrupo: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1 },
  badgeAdmin: { backgroundColor: '#F5F2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  textoBadge: { fontSize: 11, color: '#6C47FF', fontWeight: '700' },

  miembrosSeccion: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avataresFila: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarTexto: { fontSize: 12, fontWeight: '700', color: '#6C47FF' },
  cantMiembros: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  divisor: { height: 1, backgroundColor: '#F3F4F6' },

  codigoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelCodigo: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 3 },
  codigo: { fontSize: 15, fontWeight: '800', color: '#374151', letterSpacing: 2 },
  botonCompartir: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F9FAFB',
  },
  textoCompartir: { fontSize: 13, fontWeight: '600', color: '#374151' },

  accionesFila: { flexDirection: 'row', gap: 10 },
  botonSalir: {
    flex: 1, borderWidth: 1.5, borderColor: '#FCA5A5',
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  textoSalir: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  botonCerrar: {
    flex: 1, backgroundColor: '#FEE2E2',
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  textoCerrar: { color: '#DC2626', fontWeight: '700', fontSize: 13 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 12,
  },
  sheetTitulo: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  etiqueta: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 16, fontSize: 16, color: '#111827',
  },
  botonPrincipal: { backgroundColor: '#6C47FF', borderRadius: 14, padding: 16, alignItems: 'center' },
  textoBotonPrincipal: { color: '#fff', fontWeight: '700', fontSize: 16 },
  botonSecundario: { borderWidth: 1.5, borderColor: '#6C47FF', borderRadius: 14, padding: 16, alignItems: 'center' },
  textoBotonSecundario: { color: '#6C47FF', fontWeight: '700', fontSize: 16 },
  botonDeshabilitado: { opacity: 0.4 },
  botonCancelar: { alignItems: 'center', padding: 8 },
  textoCancelarModal: { color: '#9CA3AF', fontSize: 15 },
  separadorTexto: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineaSep: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  textoSep: { color: '#9CA3AF', fontSize: 13 },
});
