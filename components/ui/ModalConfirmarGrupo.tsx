import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { buscarGrupoPorCodigo, unirseAGrupo } from '@/lib/grupos';
import { useAuthStore } from '@/store/authStore';
import { useGrupo } from '@/hooks/useGrupo';
import { useTheme } from '@/constants/theme';

interface Props {
  codigo: string | null;
  onCerrar: () => void;
}

export function ModalConfirmarGrupo({ codigo, onCerrar }: Props) {
  const t = useTheme();
  const usuario = useAuthStore((s) => s.usuario);
  const { recargar } = useGrupo();

  const [buscando, setBuscando] = useState(false);
  const [uniendose, setUniendose] = useState(false);
  const [grupo, setGrupo] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!codigo) { setGrupo(null); setError(null); return; }
    setBuscando(true);
    setError(null);
    buscarGrupoPorCodigo(codigo)
      .then(setGrupo)
      .catch((e) => setError(e.message))
      .finally(() => setBuscando(false));
  }, [codigo]);

  async function confirmar() {
    if (!usuario || !codigo) return;
    setUniendose(true);
    try {
      await unirseAGrupo(codigo, usuario.id);
      await recargar();
      onCerrar();
      Alert.alert('¡Listo!', `Te uniste a "${grupo?.name}".`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      onCerrar();
    } finally {
      setUniendose(false);
    }
  }

  const s = makeStyles(t);

  return (
    <Modal visible={!!codigo} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={s.overlay}>
        <View style={s.card}>
          {buscando ? (
            <>
              <ActivityIndicator color={t.primary} size="large" />
              <Text style={s.buscandoTexto}>Buscando grupo…</Text>
            </>
          ) : error ? (
            <>
              <Text style={s.emoji}>❌</Text>
              <Text style={s.titulo}>Código inválido</Text>
              <Text style={s.subtitulo}>{error}</Text>
              <TouchableOpacity style={s.btnCancelar} onPress={onCerrar} activeOpacity={0.7}>
                <Text style={s.btnCancelarTexto}>Cerrar</Text>
              </TouchableOpacity>
            </>
          ) : grupo ? (
            <>
              <Text style={s.emoji}>👥</Text>
              <Text style={s.titulo}>¿Unirte al grupo?</Text>
              <Text style={s.nombreGrupo}>{grupo.name}</Text>
              <Text style={s.subtitulo}>Podrás compartir y ver los gastos del grupo.</Text>
              <View style={s.botones}>
                <TouchableOpacity style={s.btnCancelar} onPress={onCerrar} disabled={uniendose} activeOpacity={0.7}>
                  <Text style={s.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnConfirmar, { backgroundColor: t.primary }]}
                  onPress={confirmar}
                  disabled={uniendose}
                  activeOpacity={0.8}
                >
                  {uniendose
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnConfirmarTexto}>Unirme</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)', padding: 24,
    },
    card: {
      width: '100%', maxWidth: 340,
      backgroundColor: t.surface, borderRadius: 24,
      padding: 28, alignItems: 'center', gap: 12,
    },
    emoji: { fontSize: 48 },
    titulo: { fontSize: 20, fontWeight: '800', color: t.text, textAlign: 'center' },
    nombreGrupo: {
      fontSize: 17, fontWeight: '700', color: t.primary,
      backgroundColor: t.primary + '12', paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 12,
    },
    subtitulo: { fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 20 },
    buscandoTexto: { fontSize: 15, color: t.textMuted, marginTop: 8 },
    botones: { flexDirection: 'row', gap: 12, marginTop: 4, width: '100%' },
    btnCancelar: {
      flex: 1, padding: 14, borderRadius: 14,
      borderWidth: 1.5, borderColor: t.border, alignItems: 'center',
    },
    btnCancelarTexto: { fontSize: 15, fontWeight: '600', color: t.textSecondary },
    btnConfirmar: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
    btnConfirmarTexto: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
