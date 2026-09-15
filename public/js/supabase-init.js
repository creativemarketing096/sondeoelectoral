import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Único archivo que llama a createClient(). El resto de la app importa
   `supabase` desde acá. La publishable key no es secreta — está pensada
   para ir en código público, protegida por RLS, no por ocultarla. */
export const supabase = createClient(
  "https://oltgqlwvnqckypbpilow.supabase.co",
  "sb_publishable_RL3fGQJ5t_VjgG0czBx4Sw_aGU6ARan"
);
