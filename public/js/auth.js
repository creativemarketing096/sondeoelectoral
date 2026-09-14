import { $ } from "./util/dom.js";

let estadoInicial = null;

function esperarEstadoInicial() {
  if (!estadoInicial) {
    estadoInicial = new Promise(resolve => {
      const quitar = firebase.auth().onAuthStateChanged(user => { quitar(); resolve(user); });
    });
  }
  return estadoInicial;
}

/* Gate de administración: resuelve con el usuario autenticado.
   Si nadie inició sesión, muestra el overlay de login hasta que entre
   con el único usuario admin creado en Firebase Console → Authentication. */
export async function protegerVista() {
  const user = await esperarEstadoInicial();
  if (user) return user;

  return new Promise(resolve => {
    const overlay = $("#loginAdmin");
    overlay.classList.remove("oculto");

    const entrar = async () => {
      const email = $("#loginEmail").value.trim();
      const pass = $("#loginPass").value;
      $("#loginError").classList.add("oculto");
      $("#loginBtn").disabled = true; $("#loginBtn").textContent = "Ingresando…";
      try {
        const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
        overlay.classList.add("oculto");
        resolve(cred.user);
      } catch (err) {
        $("#loginError").classList.remove("oculto");
        $("#loginError").textContent = "Email o contraseña incorrectos.";
      } finally {
        $("#loginBtn").disabled = false; $("#loginBtn").textContent = "Ingresar";
      }
    };

    $("#loginBtn").addEventListener("click", entrar);
    $("#loginPass").addEventListener("keydown", e => { if (e.key === "Enter") entrar(); });
  });
}
