import { supabase } from "../supabase-init.js";

/* Único archivo que habla con las tablas/funciones del módulo In Situ.
   Las 3 funciones de acceso público (anon) son el único camino para el
   encuestador — nunca lee is_encuestadores/is_elegibilidad/is_respuestas
   directo. El admin (ya logueado) sí puede leer/escribir las tablas
   directo, protegido por RLS igual que configuracion. */

export async function obtenerEncuestador(token) {
  const { data, error } = await supabase.rpc("is_obtener_encuestador", { p_token: token });
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

export async function verificarElegibilidadInsitu(token, cedula) {
  const { data, error } = await supabase.rpc("is_verificar_elegibilidad", { p_token: token, p_cedula: cedula });
  if (error) throw error;
  return data[0];
}

export async function enviarRespuestaInsitu(v) {
  const { data, error } = await supabase.rpc("is_enviar_respuesta", {
    p_token: v.token, p_cedula: v.cedula,
    p_intendente_lista: v.intendente_lista, p_intendente_nombre: v.intendente_nombre,
    p_junta_lista: v.junta_lista, p_concejal_opcion: v.concejal_opcion, p_concejal_nombre: v.concejal_nombre
  });
  if (error) throw error;
  return data;
}

/* --- Admin (sesión autenticada) --- */

export async function listarBarrios(distrito) {
  const { data, error } = await supabase.from("is_barrios").select("*").eq("distrito", distrito).order("nombre");
  if (error) throw error;
  return data || [];
}

export async function crearBarrio(distrito, nombre, meta) {
  const { error } = await supabase.from("is_barrios").insert({ distrito, nombre, meta: meta || 0 });
  if (error) throw error;
}

export async function actualizarBarrio(id, cambios) {
  const { error } = await supabase.from("is_barrios").update(cambios).eq("id", id);
  if (error) throw error;
}

export async function listarEncuestadores(distrito) {
  const [{ data: encuestadores, error: e1 }, { data: barrios, error: e2 }, { data: respuestas, error: e3 }] = await Promise.all([
    supabase.from("is_encuestadores").select("*").eq("distrito", distrito).order("creado", { ascending: false }),
    supabase.from("is_barrios").select("*").eq("distrito", distrito),
    supabase.from("is_respuestas").select("encuestador_id").eq("distrito", distrito)
  ]);
  if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
  const barriosPorId = Object.fromEntries((barrios || []).map(b => [b.id, b]));
  const conteoPorEncuestador = {};
  (respuestas || []).forEach(r => { conteoPorEncuestador[r.encuestador_id] = (conteoPorEncuestador[r.encuestador_id] || 0) + 1; });
  return (encuestadores || []).map(e => ({
    ...e,
    barrio: e.barrio_id ? barriosPorId[e.barrio_id] : null,
    encuestas: conteoPorEncuestador[e.id] || 0
  }));
}

export async function crearEncuestador({ distrito, nombre, apellido, cedula, barrio_id }) {
  const { data, error } = await supabase.from("is_encuestadores").insert({ distrito, nombre, apellido, cedula, barrio_id: barrio_id || null }).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarEncuestador(id, cambios) {
  const { error } = await supabase.from("is_encuestadores").update({ ...cambios, actualizado: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/* filtros opcionales: { encuestador_id, barrio_id, desde, hasta } (desde/hasta ISO) */
export async function listarRespuestasInsitu(distrito, filtros = {}) {
  let q = supabase.from("is_respuestas").select("*").eq("distrito", distrito);
  if (filtros.encuestador_id) q = q.eq("encuestador_id", filtros.encuestador_id);
  if (filtros.barrio_id) q = q.eq("barrio_id", filtros.barrio_id);
  if (filtros.desde) q = q.gte("ts", filtros.desde);
  if (filtros.hasta) q = q.lte("ts", filtros.hasta);
  const { data, error } = await q.order("ts", { ascending: false });
  if (error) throw error;
  return data || [];
}
