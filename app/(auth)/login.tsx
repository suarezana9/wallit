import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type Modo = 'login' | 'registro';

export default function PantallaLogin() {
  const [modo, setModo] = useState<Modo>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  async function loginConEmail() {
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Completá el email y la contraseña.');
      return;
    }
    setCargando(true);
    try {
      if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) Alert.alert('Error al ingresar', mensajeError(error.message));
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) {
          Alert.alert('Error al registrarte', mensajeError(error.message));
        } else {
          Alert.alert(
            '¡Revisá tu email!',
            `Te mandamos un enlace de confirmación a ${email.trim()}. Abrilo para activar tu cuenta.`,
          );
        }
      }
    } finally {
      setCargando(false);
    }
  }

  async function loginConGoogle() {
    setCargandoGoogle(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        Alert.alert('Error', error?.message ?? 'No se pudo conectar con Google.');
        return;
      }
      const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (resultado.type === 'success' && resultado.url) {
        const params = new URLSearchParams(
          resultado.url.includes('#')
            ? resultado.url.split('#')[1]
            : new URL(resultado.url).searchParams.toString()
        );
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    } catch {
      Alert.alert('Error', 'Algo salió mal. Intentá de nuevo.');
    } finally {
      setCargandoGoogle(false);
    }
  }

  function mensajeError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Confirmá tu email antes de ingresar.';
    if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese email. Iniciá sesión.';
    if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
    return msg;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenedor}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={estilos.encabezado}>
          <Text style={estilos.logo}>💸</Text>
          <Text style={estilos.nombreApp}>Wallit</Text>
          <Text style={estilos.slogan}>Control de gastos del hogar</Text>
        </View>

        {/* Toggle login / registro */}
        <View style={estilos.toggleFila}>
          <TouchableOpacity
            style={[estilos.toggleBtn, modo === 'login' && estilos.toggleActivo]}
            onPress={() => setModo('login')}
            activeOpacity={0.7}
          >
            <Text style={[estilos.toggleTexto, modo === 'login' && estilos.toggleTextoActivo]}>
              Ingresar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.toggleBtn, modo === 'registro' && estilos.toggleActivo]}
            onPress={() => setModo('registro')}
            activeOpacity={0.7}
          >
            <Text style={[estilos.toggleTexto, modo === 'registro' && estilos.toggleTextoActivo]}>
              Crear cuenta
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formulario email + pass */}
        <View style={estilos.formulario}>
          <View style={estilos.campoContenedor}>
            <Text style={estilos.label}>Email</Text>
            <TextInput
              style={estilos.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={estilos.campoContenedor}>
            <Text style={estilos.label}>Contraseña</Text>
            <View style={estilos.inputConIcono}>
              <TextInput
                style={estilos.inputPass}
                value={password}
                onChangeText={setPassword}
                placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!mostrarPass}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setMostrarPass((v) => !v)} activeOpacity={0.7}>
                <Text style={estilos.ojito}>{mostrarPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[estilos.botonPrincipal, cargando && estilos.botonDeshabilitado]}
            onPress={loginConEmail}
            disabled={cargando}
            activeOpacity={0.8}
          >
            {cargando
              ? <ActivityIndicator color="#fff" />
              : <Text style={estilos.textoBotonPrincipal}>
                  {modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        {/* Divisor */}
        <View style={estilos.divisorFila}>
          <View style={estilos.lineaDivisor} />
          <Text style={estilos.textoDivisor}>o</Text>
          <View style={estilos.lineaDivisor} />
        </View>

        {/* Google */}
        <TouchableOpacity
          style={[estilos.botonGoogle, cargandoGoogle && estilos.botonDeshabilitado]}
          onPress={loginConGoogle}
          disabled={cargandoGoogle}
          activeOpacity={0.8}
        >
          {cargandoGoogle
            ? <ActivityIndicator color="#374151" />
            : <>
                <Text style={estilos.iconoGoogle}>G</Text>
                <Text style={estilos.textoBotonGoogle}>Continuar con Google</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={estilos.textoLegal}>
          Al continuar aceptás los términos de uso y la política de privacidad.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F9FAFB' },
  contenedor: { padding: 28, paddingTop: 60, paddingBottom: 40, gap: 20 },

  encabezado: { alignItems: 'center', marginBottom: 8 },
  logo: { fontSize: 64, marginBottom: 8 },
  nombreApp: { fontSize: 38, fontWeight: '800', color: '#111827', letterSpacing: -1 },
  slogan: { fontSize: 15, color: '#6B7280', marginTop: 4 },

  toggleFila: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleActivo: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleTexto: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  toggleTextoActivo: { color: '#111827' },

  formulario: { gap: 14 },
  campoContenedor: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 14, fontSize: 15, color: '#111827',
  },
  inputConIcono: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14,
  },
  inputPass: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 14 },
  ojito: { fontSize: 18, paddingLeft: 8 },

  botonPrincipal: {
    backgroundColor: '#6C47FF', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  botonDeshabilitado: { opacity: 0.6 },
  textoBotonPrincipal: { color: '#fff', fontWeight: '700', fontSize: 16 },

  divisorFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineaDivisor: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  textoDivisor: { fontSize: 13, color: '#9CA3AF' },

  botonGoogle: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  iconoGoogle: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  textoBotonGoogle: { fontSize: 15, fontWeight: '600', color: '#374151' },

  textoLegal: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, lineHeight: 18 },
});
