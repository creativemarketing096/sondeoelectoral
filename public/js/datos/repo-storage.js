import { supabase } from "../supabase-init.js";

export async function subirArchivo(ruta, archivo) {
  const { error } = await supabase.storage.from("candidatos").upload(ruta, archivo, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("candidatos").getPublicUrl(ruta);
  return data.publicUrl;
}
