import { supabase } from './supabase';

export async function crearGrupo(nombre: string, userId: string) {
  // Insertar sin select para evitar que la policy de SELECT bloquee antes de agregar al miembro
  const { error: errGrupo } = await supabase
    .from('groups')
    .insert({ name: nombre, created_by: userId, currency: 'ARS' });

  if (errGrupo) throw errGrupo;

  // Buscar el grupo recién creado por created_by (único dueño)
  const { data: grupo, error: errBuscar } = await supabase
    .from('groups')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (errBuscar || !grupo) throw new Error('No se pudo obtener el grupo creado.');

  const { error: errMiembro } = await supabase
    .from('group_members')
    .insert({ group_id: grupo.id, user_id: userId, role: 'admin' });

  if (errMiembro) throw errMiembro;
  return grupo;
}

export async function unirseAGrupo(codigo: string, userId: string) {
  // Usamos una función con security definer para buscar el grupo sin ser miembro todavía
  const { data: grupos, error: errBuscar } = await supabase
    .rpc('buscar_grupo_por_codigo', { p_codigo: codigo.trim() });

  const grupo = grupos?.[0] ?? null;
  if (errBuscar || !grupo) throw new Error('Código inválido. Verificá que sea correcto.');

  const { data: yaEsMiembro } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', grupo.id)
    .eq('user_id', userId)
    .single();

  if (yaEsMiembro) throw new Error('Ya sos miembro de este grupo.');

  const { error: errUnirse } = await supabase
    .from('group_members')
    .insert({ group_id: grupo.id, user_id: userId, role: 'member' });

  if (errUnirse) throw errUnirse;
  return grupo;
}

export async function obtenerMisGrupos(userId: string) {
  const { data } = await supabase
    .from('group_members')
    .select('group_id, role, joined_at, groups(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });

  return data ?? [];
}

export async function migrarGastosAlGrupo(grupoId: string, userId: string) {
  const { error, count } = await supabase
    .from('expenses')
    .update({ group_id: grupoId })
    .eq('user_id', userId)
    .is('group_id', null);

  if (error) throw error;
  return count ?? 0;
}

export async function salirDeGrupo(grupoId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', grupoId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function cerrarGrupo(grupoId: string, userId: string) {
  // Verificar que el usuario sea admin
  const { data: miembro } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', grupoId)
    .eq('user_id', userId)
    .single();

  if (miembro?.role !== 'admin') throw new Error('Solo el admin puede cerrar el grupo.');

  // Eliminar todos los miembros — la RLS deja de dar acceso al grupo
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', grupoId);

  if (error) throw error;
}

export async function obtenerMiembros(groupId: string) {
  const { data, error } = await supabase
    .rpc('obtener_miembros_grupo', { p_group_id: groupId });

  if (error) throw error;

  // Normalizar al mismo shape que espera la UI: { role, joined_at, users: { id, name, email, avatar_url } }
  return (data ?? []).map((m: any) => ({
    role: m.role,
    joined_at: m.joined_at,
    users: { id: m.user_id, name: m.name, email: m.email, avatar_url: m.avatar_url },
  }));
}
