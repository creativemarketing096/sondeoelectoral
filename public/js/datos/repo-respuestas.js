import { supabase } from "../supabase-init.js";

/* Nadie lee padron/respuestas directo — todo pasa por estas dos funciones
   de Postgres (verificar_elegibilidad / enviar_voto). El servidor saca
   nombre/localidad/edad/sexo del padrón oficial, nunca los pide el cliente. */
export async function verificarElegibilidad(cedula, distrito, dispositivo, codigo) {
  const { data, error } = await supabase.rpc("verificar_elegibilidad", { p_cedula: cedula, p_distrito: distrito, p_dispositivo: dispositivo, p_codigo: codigo || null });
  if (error) throw error;
  return data[0];
}

export async function enviarVoto(v) {
  const { data, error } = await supabase.rpc("enviar_voto", {
    p_cedula: v.cedula, p_distrito: v.distrito,
    p_intendente_lista: v.intendente_lista, p_intendente_nombre: v.intendente_nombre,
    p_junta_lista: v.junta_lista, p_concejal_opcion: v.concejal_opcion, p_concejal_nombre: v.concejal_nombre,
    p_dispositivo: v.dispositivo, p_codigo: v.codigo || null
  });
  if (error) throw error;
  return data;
}

/* Código de acceso especial: habilita a un dispositivo puntual (hasta el
   máximo configurado, típicamente 2) a saltarse el límite de 2 cédulas
   por dispositivo, solo dentro del distrito al que está atado el código. */
export async function validarCodigoEspecial(codigo, distrito, dispositivo) {
  const { data, error } = await supabase.rpc("validar_codigo_especial", { p_codigo: codigo, p_distrito: distrito, p_dispositivo: dispositivo });
  if (error) throw error;
  return data;
}

/* Dispositivos autorizados por un código especial en este distrito — se
   excluyen de la revisión de dispositivos del dashboard, porque cargar
   varias cédulas ahí es esperado, no sospechoso. Requiere sesión admin
   (la tabla codigos_especiales no es pública). */
export async function listarDispositivosExentos(distrito) {
  const { data, error } = await supabase.from("codigos_especiales").select("dispositivos").ilike("distrito", distrito);
  if (error) throw error;
  return (data || []).flatMap(r => r.dispositivos || []);
}

/* Solo totales agregados (sin cédula/nombre) — segura para mostrar sin login. */
export async function obtenerResultadosPublicos(distrito) {
  const { data, error } = await supabase.rpc("resultados_publicos", { p_distrito: distrito });
  if (error) throw error;
  return data;
}

/* Supabase/PostgREST corta cada select en 1000 filas por default (db-max-rows).
   Sin paginar, kTotal y todos los gráficos del dashboard quedaban pegados en
   1000 apenas un distrito superaba esa cifra. Se trae todo en páginas de 1000. */
async function traerTodasLasRespuestas(distrito) {
  const TAMANIO = 1000;
  let desde = 0, todas = [];
  while (true) {
    const { data, error } = await supabase.from("respuestas").select("*").eq("distrito", distrito).range(desde, desde + TAMANIO - 1);
    if (error) throw error;
    todas = todas.concat(data);
    if (data.length < TAMANIO) break;
    desde += TAMANIO;
  }
  return todas;
}

export function suscribirRespuestas(distrito, cb) {
  const emitir = async () => {
    const data = await traerTodasLasRespuestas(distrito);
    cb({ docs: data.map(r => ({ id: r.cedula, data: () => r })) });
  };
  emitir();
  const canal = supabase
    .channel(`respuestas-${distrito}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "respuestas", filter: `distrito=eq.${distrito}` }, emitir)
    .subscribe();
  return () => supabase.removeChannel(canal);
}
