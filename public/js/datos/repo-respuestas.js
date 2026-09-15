import { supabase } from "../supabase-init.js";

/* Nadie lee padron/respuestas directo — todo pasa por estas dos funciones
   de Postgres (verificar_elegibilidad / enviar_voto). El servidor saca
   nombre/localidad/edad/sexo del padrón oficial, nunca los pide el cliente. */
export async function verificarElegibilidad(cedula, distrito, dispositivo) {
  const { data, error } = await supabase.rpc("verificar_elegibilidad", { p_cedula: cedula, p_distrito: distrito, p_dispositivo: dispositivo });
  if (error) throw error;
  return data[0];
}

export async function enviarVoto(v) {
  const { data, error } = await supabase.rpc("enviar_voto", {
    p_cedula: v.cedula, p_distrito: v.distrito,
    p_intendente_lista: v.intendente_lista, p_intendente_nombre: v.intendente_nombre,
    p_junta_lista: v.junta_lista, p_concejal_opcion: v.concejal_opcion, p_concejal_nombre: v.concejal_nombre,
    p_dispositivo: v.dispositivo
  });
  if (error) throw error;
  return data;
}

/* Solo totales agregados (sin cédula/nombre) — segura para mostrar sin login. */
export async function obtenerResultadosPublicos(distrito) {
  const { data, error } = await supabase.rpc("resultados_publicos", { p_distrito: distrito });
  if (error) throw error;
  return data;
}

export function suscribirRespuestas(distrito, cb) {
  const emitir = async () => {
    const { data, error } = await supabase.from("respuestas").select("*").eq("distrito", distrito);
    if (!error) cb({ docs: data.map(r => ({ id: r.cedula, data: () => r })) });
  };
  emitir();
  const canal = supabase
    .channel(`respuestas-${distrito}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "respuestas", filter: `distrito=eq.${distrito}` }, emitir)
    .subscribe();
  return () => supabase.removeChannel(canal);
}
