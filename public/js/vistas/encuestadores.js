import { $ } from "../util/dom.js";
import { protegerVista } from "../auth.js";
import {
  listarBarrios, crearBarrio, listarEncuestadores, crearEncuestador, actualizarEncuestador
} from "../datos/repo-insitu.js";

export async function iniciar(distrito) {
  await protegerVista();
  $("#vistaParticipante").classList.add("oculto");
  $("#vistaEncuestadores").classList.remove("oculto");
  $("#encTituloDistrito").textContent = distrito;

  let barrios = [], encuestadores = [];

  async function recargar() {
    [barrios, encuestadores] = await Promise.all([listarBarrios(distrito), listarEncuestadores(distrito)]);
    pintarBarrios();
    pintarSelectBarrio();
    pintarTabla();
  }

  function pintarBarrios() {
    $("#encTablaBarrios").querySelector("tbody").innerHTML = barrios.length
      ? barrios.map(b => {
          const realizadas = encuestadores.filter(e => e.barrio_id === b.id).reduce((s, e) => s + e.encuestas, 0);
          const enc = encuestadores.find(e => e.barrio_id === b.id);
          return `<tr>
            <td>${b.nombre}</td><td>${enc ? enc.nombre + " " + enc.apellido : "—"}</td>
            <td>${b.meta}</td><td>${realizadas}</td><td>${Math.max(0, b.meta - realizadas)}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" class="centro">Todavía no hay barrios cargados.</td></tr>`;
  }

  function pintarSelectBarrio() {
    const sel = $("#encFormBarrio");
    sel.innerHTML = `<option value="">Sin asignar</option>` + barrios.map(b => `<option value="${b.id}">${b.nombre}</option>`).join("");
  }

  function pintarTabla() {
    $("#encTabla").querySelector("tbody").innerHTML = encuestadores.length
      ? encuestadores.map(e => {
          const link = `${location.origin}${location.pathname}?vista=insitu&encuestador=${e.token}`;
          return `<tr>
            <td>${e.nombre}</td><td>${e.apellido}</td><td>${e.cedula}</td>
            <td>
              <select data-accion="cambiar-barrio" data-id="${e.id}">
                <option value="">Sin asignar</option>
                ${barrios.map(b => `<option value="${b.id}" ${b.id === e.barrio_id ? "selected" : ""}>${b.nombre}</option>`).join("")}
              </select>
            </td>
            <td>${e.activo ? '<span class="aviso bien" style="margin:0">Activo</span>' : '<span class="aviso malo" style="margin:0">Inactivo</span>'}</td>
            <td class="num">${e.encuestas}</td>
            <td><code style="font-size:10px;word-break:break-all">${link}</code></td>
            <td>
              <button class="mini chico" data-accion="copiar" data-link="${link}">Copiar link</button>
              <button class="mini chico" data-accion="toggle" data-id="${e.id}" data-activo="${e.activo}">${e.activo ? "Desactivar" : "Activar"}</button>
              <a class="mini chico" href="${location.pathname}?vista=dashboardinsitu&distrito=${encodeURIComponent(distrito)}&encuestador=${e.id}" target="_blank">Ver estadísticas</a>
            </td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="8" class="centro">Todavía no hay encuestadores cargados.</td></tr>`;
  }

  $("#encTabla").addEventListener("click", async e => {
    const btn = e.target.closest("[data-accion]"); if (!btn) return;
    if (btn.dataset.accion === "copiar") {
      await navigator.clipboard.writeText(btn.dataset.link);
      btn.textContent = "¡Copiado!"; setTimeout(() => { btn.textContent = "Copiar link"; }, 1500);
    }
    if (btn.dataset.accion === "toggle") {
      await actualizarEncuestador(btn.dataset.id, { activo: btn.dataset.activo !== "true" });
      recargar();
    }
  });
  $("#encTabla").addEventListener("change", async e => {
    const sel = e.target.closest("[data-accion='cambiar-barrio']"); if (!sel) return;
    await actualizarEncuestador(sel.dataset.id, { barrio_id: sel.value || null });
    recargar();
  });

  $("#encFormAgregar").addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = $("#encFormNombre").value.trim();
    const apellido = $("#encFormApellido").value.trim();
    const cedula = $("#encFormCedula").value.trim();
    const barrio_id = $("#encFormBarrio").value || null;
    if (!nombre || !apellido || !cedula) return;
    await crearEncuestador({ distrito, nombre, apellido, cedula, barrio_id });
    e.target.reset();
    recargar();
  });

  $("#encFormBarrioAgregar").addEventListener("submit", async e => {
    e.preventDefault();
    const nombre = $("#encBarrioNombre").value.trim();
    const meta = +$("#encBarrioMeta").value || 0;
    if (!nombre) return;
    await crearBarrio(distrito, nombre, meta);
    e.target.reset();
    recargar();
  });

  $("#encAsignarAleatorio").addEventListener("click", async () => {
    const sinBarrio = encuestadores.filter(e => !e.barrio_id);
    if (!sinBarrio.length || !barrios.length) return;
    const mezclados = [...barrios].sort(() => Math.random() - 0.5);
    for (let i = 0; i < sinBarrio.length; i++) {
      await actualizarEncuestador(sinBarrio[i].id, { barrio_id: mezclados[i % mezclados.length].id });
    }
    recargar();
  });

  recargar();
}
