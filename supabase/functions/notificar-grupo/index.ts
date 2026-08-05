// Edge Function — Deno runtime
// Llamada por triggers de DB via pg_net cuando:
//   - Un miembro se une a un grupo (evento: 'nuevo_miembro')
//   - Un miembro carga un gasto/ingreso en el grupo (evento: 'nuevo_gasto')
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Payload {
  evento: 'nuevo_miembro' | 'nuevo_gasto';
  group_id: string;
  actor_id: string;    // quien realizó la acción
  actor_name?: string;
  group_name?: string;
  // solo para nuevo_gasto:
  monto?: number;
  descripcion?: string;
  categoria?: string;
  tipo?: string;
}

Deno.serve(async (req) => {
  try {
    const payload: Payload = await req.json();
    const { evento, group_id, actor_id } = payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Obtener nombre del actor y del grupo si no vienen en el payload
    const [actorRes, grupoRes] = await Promise.all([
      payload.actor_name
        ? Promise.resolve({ data: { name: payload.actor_name } })
        : supabase.from('users').select('name').eq('id', actor_id).single(),
      payload.group_name
        ? Promise.resolve({ data: { name: payload.group_name } })
        : supabase.from('groups').select('name').eq('id', group_id).single(),
    ]);

    const actorName: string = (actorRes.data as any)?.name ?? 'Alguien';
    const grupoName: string = (grupoRes.data as any)?.name ?? 'tu grupo';

    // Obtener tokens de todos los miembros del grupo EXCEPTO el actor
    const { data: miembros } = await supabase
      .from('group_members')
      .select('user_id, users(push_token)')
      .eq('group_id', group_id)
      .neq('user_id', actor_id);

    const tokens: string[] = (miembros ?? [])
      .map((m: any) => {
        const u = Array.isArray(m.users) ? m.users[0] : m.users;
        return u?.push_token as string | undefined;
      })
      .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));

    if (tokens.length === 0) {
      return json({ ok: true, sent: 0, reason: 'no_tokens' });
    }

    // Armar mensaje según el evento
    let title: string;
    let body: string;

    if (evento === 'nuevo_miembro') {
      title = `👥 ${grupoName}`;
      body = `${actorName} se unió al grupo`;
    } else {
      const monto = payload.monto ? formatearARS(payload.monto) : '';
      const concepto = payload.descripcion || payload.categoria || payload.tipo || 'movimiento';
      const esIngreso = payload.tipo && payload.tipo !== 'gasto';
      title = `${esIngreso ? '💰' : '💸'} ${grupoName}`;
      body = `${actorName} cargó ${monto ? `${monto} en ` : ''}${concepto}`;
    }

    // Enviar en batch
    const mensajes = tokens.map((to) => ({ to, title, body, sound: 'default' }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensajes),
    });

    return json({ ok: res.ok, sent: tokens.length });
  } catch (err: any) {
    return json({ ok: false, error: err.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function formatearARS(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(monto);
}
