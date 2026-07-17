// Supabase Edge Function — Deno runtime
// Se ejecuta diariamente vía pg_cron (ver instrucciones en context.md)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const UMBRAL_GASTO_GRANDE = 50_000; // ARS

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fecha actual en Argentina (UTC-3 fijo, sin DST)
  const ahora = new Date();
  const argTs = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  const hoy = argTs.toISOString().split('T')[0];
  const diaDelMes = argTs.getUTCDate();
  const anioMes = `${argTs.getUTCFullYear()}_${String(argTs.getUTCMonth() + 1).padStart(2, '0')}`;
  const mesLabel = argTs.toLocaleDateString('es-AR', { month: 'long' });

  // Solo usuarios con push_token registrado
  const { data: usuarios } = await supabase
    .from('users')
    .select('id, push_token, notif_config, notif_enviadas')
    .not('push_token', 'is', null);

  if (!usuarios?.length) {
    return json({ ok: true, sent: 0 });
  }

  const mensajes: ExpoPushMessage[] = [];
  const actualizaciones: Promise<any>[] = [];

  for (const user of usuarios) {
    const cfg: NotifConfig = { sin_actividad: true, inicio_mes: true, cierre_mes: true, gasto_grupo: true, balance_negativo: true, ...user.notif_config };
    const enviadas: Record<string, string> = user.notif_enviadas ?? {};
    const nuevasEnviadas = { ...enviadas };
    const notifUsuario: ExpoPushMessage[] = [];

    function push(title: string, body: string, tipo: string) {
      notifUsuario.push({ to: user.push_token!, title, body, data: { tipo }, sound: 'default' });
    }

    // ── 1. Sin actividad 3 días ───────────────────────────────────────────
    if (cfg.sin_actividad && enviadas.sin_3d !== hoy) {
      const hace3 = isoFecha(argTs, -3);
      const { count } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', hace3);
      if ((count ?? 0) === 0) {
        push('Wallit 💸', 'Hace 3 días que no registrás movimientos. ¿Seguís al día?', 'sin_actividad');
        nuevasEnviadas.sin_3d = hoy;
      }
    }

    // ── 2. Sin actividad 7 días ───────────────────────────────────────────
    if (cfg.sin_actividad && enviadas.sin_7d !== hoy) {
      const hace7 = isoFecha(argTs, -7);
      const { count } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', hace7);
      if ((count ?? 0) === 0) {
        push('Wallit 💸', 'Llevás una semana sin registrar movimientos. Tu resumen puede estar incompleto.', 'sin_actividad_7d');
        nuevasEnviadas.sin_7d = hoy;
      }
    }

    // ── 3. Inicio de mes (día 2) ──────────────────────────────────────────
    if (cfg.inicio_mes && diaDelMes === 2 && enviadas[`inicio_${anioMes}`] !== hoy) {
      push(`¡Nuevo mes! 🗓️`, `Empezó ${mesLabel}. ¿Ya cargaste tu ingreso?`, 'inicio_mes');
      nuevasEnviadas[`inicio_${anioMes}`] = hoy;
    }

    // ── 4. Cierre de mes (día 28+) ────────────────────────────────────────
    if (cfg.cierre_mes && diaDelMes >= 28 && enviadas[`cierre_${anioMes}`] !== hoy) {
      const ultimoDia = new Date(Date.UTC(argTs.getUTCFullYear(), argTs.getUTCMonth() + 1, 0)).getUTCDate();
      const restantes = ultimoDia - diaDelMes;
      const cuerpo = restantes === 0
        ? 'Hoy es el último día del mes. ¿Tenés todos los movimientos cargados?'
        : `Quedan ${restantes} ${restantes === 1 ? 'día' : 'días'} para cerrar el mes.`;
      push('Cerrando el mes 📅', cuerpo, 'cierre_mes');
      nuevasEnviadas[`cierre_${anioMes}`] = hoy;
    }

    // ── 5. Gasto grande en grupo ──────────────────────────────────────────
    if (cfg.gasto_grupo && enviadas.gasto_grupo !== hoy) {
      const { data: membresias } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membresias?.length) {
        const grupoIds = membresias.map((m: any) => m.group_id);
        const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const { data: gastos } = await supabase
          .from('expenses')
          .select('amount, description, category, users(name), groups(name)')
          .in('group_id', grupoIds)
          .neq('user_id', user.id)
          .in('tipo', ['gasto', null])
          .gte('created_at', hace24h)
          .gte('amount', UMBRAL_GASTO_GRANDE)
          .order('amount', { ascending: false })
          .limit(1);

        if (gastos?.length) {
          const g = gastos[0];
          const autor = nombre(g.users);
          const grupo = nombre(g.groups);
          const monto = formatearARS(Number(g.amount));
          push(`${autor} cargó un gasto 👥`, `${monto} en ${g.description || g.category} — ${grupo}`, 'gasto_grupo');
          nuevasEnviadas.gasto_grupo = hoy;
        }
      }
    }

    // ── 6. Balance negativo del mes ───────────────────────────────────────
    if (cfg.balance_negativo && enviadas[`balance_${anioMes}`] !== hoy) {
      const primerDia = `${argTs.getUTCFullYear()}-${String(argTs.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const { data: movs } = await supabase
        .from('expenses')
        .select('amount, tipo')
        .eq('user_id', user.id)
        .gte('date', primerDia)
        .lte('date', hoy);

      if (movs?.length) {
        const ingresos = sumar(movs, 'ingreso');
        const gastos = sumar(movs, 'gasto');
        if (ingresos > 0 && gastos > ingresos) {
          push('Balance negativo 🔴', `Este mes los gastos superaron los ingresos en ${formatearARS(gastos - ingresos)}.`, 'balance_negativo');
          nuevasEnviadas[`balance_${anioMes}`] = hoy;
        }
      }
    }

    mensajes.push(...notifUsuario);

    if (JSON.stringify(nuevasEnviadas) !== JSON.stringify(enviadas)) {
      actualizaciones.push(
        supabase.from('users').update({ notif_enviadas: nuevasEnviadas }).eq('id', user.id),
      );
    }
  }

  // Enviar a Expo Push API en batches de 100
  let enviados = 0;
  for (let i = 0; i < mensajes.length; i += 100) {
    const batch = mensajes.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) enviados += batch.length;
  }

  await Promise.all(actualizaciones);
  return json({ ok: true, sent: enviados, total: mensajes.length });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default';
}

interface NotifConfig {
  sin_actividad: boolean;
  inicio_mes: boolean;
  cierre_mes: boolean;
  gasto_grupo: boolean;
  balance_negativo: boolean;
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

function isoFecha(base: Date, deltaDias: number): string {
  const d = new Date(base.getTime() + deltaDias * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function nombre(rel: any): string {
  if (Array.isArray(rel)) return rel[0]?.name ?? '?';
  return rel?.name ?? '?';
}

function formatearARS(monto: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto);
}

function sumar(movs: any[], tipo: string): number {
  return movs
    .filter((m) => tipo === 'gasto' ? (!m.tipo || m.tipo === 'gasto') : m.tipo === tipo)
    .reduce((s, m) => s + Number(m.amount), 0);
}
