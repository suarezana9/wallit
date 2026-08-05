import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registrarPushToken(userId: string): Promise<void> {
  try {
    const { status: existente } = await Notifications.getPermissionsAsync();
    let estado = existente;

    if (existente !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      estado = status;
    }

    if (estado !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('wallit-default', {
        name: 'Wallit',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId
      ?? (Constants as any).easConfig?.projectId;

    const token = (await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )).data;

    await supabase.from('users').update({ push_token: token }).eq('id', userId);
  } catch {
    // Silencioso — no crítico si el dispositivo no soporta push
  }
}

export async function enviarPushExpo(token: string, title: string, body: string): Promise<void> {
  if (!token?.startsWith('ExponentPushToken')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
  } catch {
    // Silencioso — no crítico si la notif no llega
  }
}

export function configurarHandlerForeground() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
