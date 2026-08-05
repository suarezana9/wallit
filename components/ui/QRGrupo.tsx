import { View, Image, Text, TouchableOpacity, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/constants/theme';

interface Props {
  nombre: string;
  codigo: string;
}

function deepLink(codigo: string) {
  return `wallit://join?codigo=${codigo}`;
}

export function QRGrupo({ nombre, codigo }: Props) {
  const t = useTheme();
  const [mostrarQR, setMostrarQR] = useState(false);
  const [imgCargada, setImgCargada] = useState(false);

  const link = deepLink(codigo);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=${t.isDark ? 'ffffff' : '000000'}&bgcolor=${t.isDark ? '1a1a2e' : 'ffffff'}&data=${encodeURIComponent(link)}`;

  async function compartir() {
    await Share.share({
      message: `Unite a "${nombre}" en Wallit 💸\n\nTocá el link o abrí la app y usá el código *${codigo.toUpperCase()}*\n\n${link}`,
    });
  }

  const s = makeStyles(t);

  return (
    <View style={s.contenedor}>
      <View style={s.filaBotones}>
        <TouchableOpacity
          style={[s.btnQR, mostrarQR && { borderColor: t.primary, backgroundColor: t.primary + '12' }]}
          onPress={() => { setMostrarQR(!mostrarQR); setImgCargada(false); }}
          activeOpacity={0.7}
        >
          <Text style={[s.btnQRTexto, mostrarQR && { color: t.primary }]}>
            {mostrarQR ? '🔼 Ocultar QR' : '📲 Ver QR'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btnCompartir} onPress={compartir} activeOpacity={0.7}>
          <Text style={s.btnCompartirTexto}>📤 Compartir link</Text>
        </TouchableOpacity>
      </View>

      {mostrarQR && (
        <View style={s.qrWrapper}>
          {!imgCargada && (
            <View style={s.qrPlaceholder}>
              <ActivityIndicator color={t.primary} />
            </View>
          )}
          <Image
            source={{ uri: qrUrl }}
            style={[s.qrImagen, !imgCargada && { opacity: 0, position: 'absolute' }]}
            onLoad={() => setImgCargada(true)}
            resizeMode="contain"
          />
          <Text style={s.qrHint}>Escaneá con la cámara para unirte</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    contenedor: { gap: 12 },

    filaBotones: { flexDirection: 'row', gap: 10 },

    btnQR: {
      flex: 1, borderWidth: 1.5, borderColor: t.border,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
      alignItems: 'center', backgroundColor: t.surfaceAlt,
    },
    btnQRTexto: { fontSize: 13, fontWeight: '600', color: t.textSecondary },

    btnCompartir: {
      flex: 1, borderWidth: 1.5, borderColor: t.primary,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
      alignItems: 'center', backgroundColor: t.primary + '10',
    },
    btnCompartirTexto: { fontSize: 13, fontWeight: '700', color: t.primary },

    qrWrapper: { alignItems: 'center', gap: 10, paddingVertical: 8 },
    qrPlaceholder: {
      width: 200, height: 200, borderRadius: 16,
      backgroundColor: t.surfaceAlt, justifyContent: 'center', alignItems: 'center',
    },
    qrImagen: {
      width: 200, height: 200, borderRadius: 16,
    },
    qrHint: { fontSize: 12, color: t.textMuted, textAlign: 'center' },
  });
}
