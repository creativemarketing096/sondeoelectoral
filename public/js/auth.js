import { $ } from "./util/dom.js";
import { supabase } from "./supabase-init.js";

let sesionInicial = null;

function esperarSesionInicial() {
  if (!sesionInicial) {
    sesionInicial = supabase.auth.getSession().then(({ data }) => data.session);
  }
  return sesionInicial;
}

/* Gate de administración: resuelve con la sesión autenticada.
   Si nadie inició sesión, muestra el overlay de login hasta que entre
   con el único usuario admin creado en Supabase. */
export async function protegerVista() {
  const sesion = await esperarSesionInicial();
  if (sesion) return sesion;

  return new Promise(resolve => {
    const overlay = $("#loginAdmin");
    overlay.classList.remove("oculto");

    const entrar = async () => {
      const email = $("#loginEmail").value.trim();
      const pass = $("#loginPass").value;
      $("#loginError").classList.add("oculto");
      $("#loginBtn").disabled = true; $("#loginBtn").textContent = "Ingresando…";
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        $("#loginError").classList.remove("oculto");
        $("#loginError").textContent = "Email o contraseña incorrectos.";
      } else {
        overlay.classList.add("oculto");
        resolve(data.session);
      }
      $("#loginBtn").disabled = false; $("#loginBtn").textContent = "Ingresar";
    };

    $("#loginBtn").addEventListener("click", entrar);
    $("#loginPass").addEventListener("keydown", e => { if (e.key === "Enter") entrar(); });
  });
}
