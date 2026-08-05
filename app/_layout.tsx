import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import { useGrupo } from '@/hooks/useGrupo';
import { useCategorias } from '@/hooks/useCategorias';
import { configurarHandlerForeground } from '@/lib/notificaciones';
import { ModalConfirmarGrupo } from '@/components/ui/ModalConfirmarGrupo';

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

// Extracts invite code from wallit://join?codigo=... or wallit://join/ABC123
function extraerCodigoInvite(url: string): string | null {
  if (!url) return null;
  const params = extraerParams(url);
  if (params.codigo) return params.codigo;
  // Fallback: path /join/ABC123
  const match = url.match(/\/join\/([^?#&/]+)/);
  return match?.[1] ?? null;
}

async function procesarURL(url: string): Promise<string | null> {
  // Auth magic links
  const params = extraerParams(url);
  if (params.token_hash && params.type) {
    await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type as 'email' | 'magiclink',
    });
    return null;
  }
  if (params.access_token && params.refresh_token) {
    await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    return null;
  }
  // Group invite
  if (url.includes('/join') || url.includes('join?')) {
    return extraerCodigoInvite(url);
  }
  return null;
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
  const [codigoInvite, setCodigoInvite] = useState<string | null>(null);

  useEffect(() => {
    Linking.getInitialURL().then(async (url) => {
      if (!url) return;
      const codigo = await procesarURL(url);
      if (codigo) setCodigoInvite(codigo);
    });
    const suscripcion = Linking.addEventListener('url', async ({ url }) => {
      const codigo = await procesarURL(url);
      if (codigo) setCodigoInvite(codigo);
    });
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
        <Stack.Screen name="grupo/[id]" />
        <Stack.Screen name="categorias" />
        <Stack.Screen name="notificaciones" />
      </Stack>
      <ModalConfirmarGrupo
        codigo={codigoInvite}
        onCerrar={() => setCodigoInvite(null)}
      />
    </>
  );
}
