import { supabase } from "../supabase-init.js";

const TAMAÑO_LOTE = 500;

export async function importarPadron(registros, onProgreso) {
  let hechos = 0, errores = 0;
  for (let i = 0; i < registros.length; i += TAMAÑO_LOTE) {
    const trozo = registros.slice(i, i + TAMAÑO_LOTE);
    const { error } = await supabase.from("padron").upsert(trozo);
    if (error) errores += trozo.length; else hechos += trozo.length;
    onProgreso && onProgreso(Math.min(i + TAMAÑO_LOTE, registros.length), registros.length);
  }
  return { hechos, errores };
}
