import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { registrarPushToken } from '@/lib/notificaciones';
import type { User } from '@supabase/supabase-js';

async function sincronizarUsuario(user: User) {
  await supabase.from('users').upsert({
    id: user.id,
    email: user.email ?? '',
    name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
    avatar_url: user.user_metadata?.avatar_url ?? null,
  }, { onConflict: 'id' });
  registrarPushToken(user.id);
}

export function useSession() {
  const { session, cargando, setSession, setCargando } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) sincronizarUsuario(session.user);
      setCargando(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) sincronizarUsuario(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, cargando };
}
