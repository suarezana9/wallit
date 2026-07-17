import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useCategoriaStore } from '@/store/categoriaStore';
import type { CategoriaConfig } from '@/lib/categorias';

export function useCategorias() {
  const usuario = useAuthStore((s) => s.usuario);
  const config = useCategoriaStore((s) => s.config);
  const setConfig = useCategoriaStore((s) => s.setConfig);

  useEffect(() => {
    if (!usuario || config !== null) return;
    supabase
      .from('users')
      .select('categoria_config')
      .eq('id', usuario.id)
      .single()
      .then(({ data }) => {
        setConfig(data?.categoria_config ?? { ocultas: [], personalizadas: [] });
      });
  }, [usuario]);

  async function guardarConfig(nueva: CategoriaConfig) {
    if (!usuario) return;
    setConfig(nueva);
    await supabase.from('users').update({ categoria_config: nueva }).eq('id', usuario.id);
  }

  return {
    config: config ?? { ocultas: [], personalizadas: [] },
    guardarConfig,
  };
}
