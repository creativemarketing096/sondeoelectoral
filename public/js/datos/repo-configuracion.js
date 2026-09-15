import { supabase } from "../supabase-init.js";

export async function obtenerConfiguracion(distrito) {
  const { data, error } = await supabase.from("configuracion").select("*").eq("distrito", distrito).maybeSingle();
  if (error) throw error;
  return { exists: !!data, data: () => data };
}

export async function guardarConfiguracion(distrito, cfg) {
  const { error } = await supabase.from("configuracion").upsert({ distrito, intendentes: cfg.intendentes, listas: cfg.listas });
  if (error) throw error;
}

export async function listarDistritos() {
  const { data, error } = await supabase.from("configuracion").select("*").order("distrito");
  if (error) throw error;
  return data;
}
