import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import { useGrupo } from '@/hooks/useGrupo';
import { useCategorias } from '@/hooks/useCategorias';
import { configurarHandlerForeground } from '@/lib/notificaciones';

configurarHandlerForeground();

function extraerParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parte = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
  parte.split('&').forEach((par) => {
    const [clave, valor] = par.split('=');
    if (clave && valor) params[clave] = decodeURIComponent(valor);
  });
  return params;
}

async function procesarMagicLink(url: string) {
  const params = extraerParams(url);
  if (params.token_hash && params.type) {
    await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type as 'email' | 'magiclink',
    });
    return;
  }
  if (params.access_token && params.refresh_token) {
    await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
  }
}

function Inicializador() {
  useGrupo();
  useCategorias();
  return null;
}

export default function RootLayout() {
  const { session, cargando } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) procesarMagicLink(url);
    });
    const suscripcion = Linking.addEventListener('url', ({ url }) => procesarMagicLink(url));
    return () => suscripcion.remove();
  }, []);

  useEffect(() => {
    if (cargando) return;
    const enGrupoAuth = segments[0] === '(auth)';
    if (!session && !enGrupoAuth) {
      router.replace('/(auth)/login');
    } else if (session && enGrupoAuth) {
      router.replace('/(tabs)');
    }
  }, [session, cargando, segments]);

  return (
    <>
      <StatusBar style="auto" />
      {session && <Inicializador />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="categorias" />
        <Stack.Screen name="notificaciones" />
      </Stack>
    </>
  );
}
