import { $ } from "../util/dom.js";
import { SEMILLA_CONCEPCION } from "../dominio/semilla-concepcion.js";
import { obtenerConfiguracion, guardarConfiguracion } from "../datos/repo-configuracion.js";
import { subirArchivo } from "../datos/repo-storage.js";
import { importarPadron } from "../datos/repo-padron.js";
import { protegerVista } from "../auth.js";

export async function iniciar(distrito) {
  await protegerVista();
  $("#vistaParticipante").classList.add("oculto");
  $("#vistaConfig").classList.remove("oculto");
  $("#tituloConfigDistrito").textContent = `Configurar simulador — ${distrito}`;

  let cfg = { intendentes: [], listas: {} };
  let listaExpandida = null;
  let fotoIntendenteIdx = null;
  let fotoConcejal = null;

  function normalizar(c) {
    c.intendentes.forEach(x => { if (x.foto === undefined) x.foto = ""; });
    Object.values(c.listas).forEach(l => { if (!l.fotos) l.fotos = l.candidatos.map(() => ""); });
    return c;
  }

  obtenerConfiguracion(distrito).then(async doc => {
    if (doc.exists) {
      cfg = normalizar(doc.data());
      pintarTablas();
    } else if (distrito === "CONCEPCION" || distrito === "0-CONCEPCION") {
      cfg = normalizar(JSON.parse(JSON.stringify(SEMILLA_CONCEPCION)));
      pintarTablas();
      await guardar("Simulador de Concepción cargado automáticamente");
    } else {
      pintarTablas();
    }
  });

  async function guardar(msg) {
    await guardarConfiguracion(distrito, cfg);
    $("#estadoConfig").className = "aviso bien"; $("#estadoConfig").textContent = msg + " · guardado.";
  }

  function pintarTablas() {
    $("#tablaIntendentes").querySelector("tbody").innerHTML = cfg.intendentes.length
      ? `<tr><th>Lista</th><th>Candidato</th><th>Foto</th><th></th></tr>` + cfg.intendentes.map((c, i) =>
          `<tr><td><span class="swatch" style="background:${c.color}"></span>${c.lista}</td>
               <td><b>${c.nombre}</b><br><small>${c.partido}</small></td>
               <td>${c.foto ? `<img class="miniatura" src="${c.foto}">` : "—"}
                   <button class="mini chico foto-int" data-i="${i}" title="Subir foto" type="button">📷</button></td>
               <td class="x" data-i="${i}">×</td></tr>`).join("")
      : `<tr><td class="centro" colspan="4">Sin candidatos.</td></tr>`;

    const ks = Object.keys(cfg.listas);
    $("#tablaListas").querySelector("tbody").innerHTML = ks.length
      ? `<tr><th>Lista</th><th>Agrupación</th><th>Conc.</th><th></th><th></th></tr>` + ks.map(n => {
          const filas = [`<tr><td><span class="swatch" style="background:${cfg.listas[n].color}"></span>${n}</td>
               <td>${cfg.listas[n].nombre}</td><td>${cfg.listas[n].candidatos.length}</td>
               <td><button class="mini chico ver" data-n="${n}" type="button">${listaExpandida === n ? "▾" : "▸"} Ver</button></td>
               <td class="x" data-n="${n}">×</td></tr>`];
          if (listaExpandida === n) {
            const cands = cfg.listas[n].candidatos.map((c, i) =>
              `<tr><td>Opción ${i + 1}</td><td>${c}</td>
                   <td>${cfg.listas[n].fotos[i] ? `<img class="miniatura" src="${cfg.listas[n].fotos[i]}">` : "—"}
                       <button class="mini chico foto-conc" data-n="${n}" data-idx="${i}" title="Subir foto" type="button">📷</button></td></tr>`).join("");
            filas.push(`<tr><td colspan="5" style="padding:0"><table class="tabla anidada"><tbody>${cands}</tbody></table></td></tr>`);
          }
          return filas.join("");
        }).join("")
      : `<tr><td class="centro" colspan="5">Sin listas.</td></tr>`;
  }

  $("#addIntendente").addEventListener("click", async () => {
    const lista = +$("#cfLista").value, nombre = $("#cfNombre").value.trim().toUpperCase(), partido = $("#cfPartido").value.trim().toUpperCase();
    if (!lista || !nombre || !partido) return alert("Completá lista, agrupación y candidato.");
    let foto = "";
    const archivo = $("#cfFoto").files[0];
    if (archivo) foto = await subirArchivo(`${distrito}/intendentes/${lista}.jpg`, archivo);
    cfg.intendentes.push({ lista, partido, nombre, color: $("#cfColor").value, foto });
    cfg.intendentes.sort((a, b) => a.lista - b.lista);
    ["#cfLista", "#cfNombre", "#cfPartido", "#cfFoto"].forEach(s => $(s).value = "");
    pintarTablas(); guardar("Candidato agregado");
  });
  $("#tablaIntendentes").addEventListener("click", e => {
    if (e.target.classList.contains("x")) {
      cfg.intendentes.splice(+e.target.dataset.i, 1); pintarTablas(); guardar("Candidato eliminado"); return;
    }
    if (e.target.classList.contains("foto-int")) {
      fotoIntendenteIdx = +e.target.dataset.i;
      $("#cfFotoExistente").click();
    }
  });
  $("#cfFotoExistente").addEventListener("change", async e => {
    const archivo = e.target.files[0]; if (!archivo || fotoIntendenteIdx === null) return;
    const c = cfg.intendentes[fotoIntendenteIdx];
    c.foto = await subirArchivo(`${distrito}/intendentes/${c.lista}.jpg`, archivo);
    e.target.value = "";
    pintarTablas(); guardar("Foto actualizada");
  });

  $("#addLista").addEventListener("click", async () => {
    const n = +$("#cjLista").value, nombre = $("#cjNombre").value.trim().toUpperCase();
    const cands = $("#cjCandidatos").value.split("\n").map(x => x.trim().toUpperCase()).filter(Boolean);
    if (!n || !nombre) return alert("Completá número de lista y agrupación.");
    if (!cands.length) return alert("Pegá al menos un candidato a concejal.");
    const archivos = [...$("#cjFotos").files];
    const fotos = [];
    for (let i = 0; i < cands.length; i++) {
      if (archivos[i]) fotos.push(await subirArchivo(`${distrito}/listas/${n}/${i + 1}.jpg`, archivos[i]));
      else fotos.push("");
    }
    cfg.listas[n] = { nombre, color: $("#cjColor").value, candidatos: cands, fotos };
    ["#cjLista", "#cjNombre", "#cjCandidatos"].forEach(s => $(s).value = "");
    pintarTablas(); guardar("Lista agregada");
  });
  $("#tablaListas").addEventListener("click", e => {
    if (e.target.classList.contains("x")) {
      delete cfg.listas[e.target.dataset.n]; pintarTablas(); guardar("Lista eliminada"); return;
    }
    if (e.target.classList.contains("ver")) {
      const n = e.target.dataset.n;
      listaExpandida = listaExpandida === n ? null : n;
      pintarTablas(); return;
    }
    if (e.target.classList.contains("foto-conc")) {
      fotoConcejal = { n: e.target.dataset.n, idx: +e.target.dataset.idx };
      $("#cjFotoExistente").click();
    }
  });
  $("#cjFotoExistente").addEventListener("change", async e => {
    const archivo = e.target.files[0]; if (!archivo || !fotoConcejal) return;
    const { n, idx } = fotoConcejal;
    cfg.listas[n].fotos[idx] = await subirArchivo(`${distrito}/listas/${n}/${idx + 1}.jpg`, archivo);
    e.target.value = "";
    pintarTablas(); guardar("Foto actualizada");
  });

  let registrosPendientes = null;

  $("#padronArchivo").addEventListener("change", () => {
    registrosPendientes = null;
    $("#padronImportar").textContent = "Leer archivo";
    $("#padronEstado").className = "aviso"; $("#padronEstado").textContent = "";
  });

  $("#padronImportar").addEventListener("click", async () => {
    if (!registrosPendientes) registrosPendientes = await analizarPadron();
    else await confirmarImportacionPadron(registrosPendientes, () => { registrosPendientes = null; });
  });
}

function cargarSheetJS() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = resolve; s.onerror = () => reject(new Error("No se pudo cargar el lector de Excel."));
    document.head.appendChild(s);
  });
}

function edadRango(edad) {
  const e = +edad;
  if (!e) return "";
  if (e < 25) return "18-24";
  if (e < 35) return "25-34";
  if (e < 50) return "35-49";
  if (e < 65) return "50-64";
  return "65+";
}

function sexoTexto(valor) {
  const v = String(valor || "").trim().toUpperCase();
  if (v === "M") return "Masculino";
  if (v === "F") return "Femenino";
  return v;
}

async function analizarPadron() {
  const archivo = $("#padronArchivo").files[0];
  if (!archivo) { alert("Elegí primero el archivo del padrón."); return null; }

  const estado = $("#padronEstado");
  estado.className = "aviso"; estado.textContent = "Leyendo archivo…";

  try {
    await cargarSheetJS();
    const buffer = await archivo.arrayBuffer();
    const libro = XLSX.read(buffer, { type: "array" });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: "" });

    const registros = filas.map(f => ({
      cedula: String(f.CEDULA || "").replace(/\D/g, ""),
      distrito: String(f.NOMBRE_DIS || f.DISTRITO || "").trim().toUpperCase(),
      localidad: String(f.DESCRI_LOCAL || f.DESCRI_L || "").trim(),
      edad_rango: edadRango(f.EDAD),
      sexo: sexoTexto(f.SEXO),
      nombre: [f.NOMBRE, f.APELLIDO].filter(Boolean).join(" ").trim().toUpperCase()
    })).filter(r => r.cedula);

    if (!registros.length) {
      estado.className = "aviso malo"; estado.textContent = "No se encontraron cédulas válidas en el archivo.";
      return null;
    }

    const conteo = {};
    registros.forEach(r => { const k = r.distrito || "(sin distrito)"; conteo[k] = (conteo[k] || 0) + 1; });
    const resumen = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d}: ${n}`).join(" · ");

    estado.className = "aviso";
    estado.textContent = `${registros.length} cédulas encontradas — ${resumen}. Tocá "Confirmar importación" para subirlas (puede tardar varios minutos con archivos grandes; no cierres esta pestaña).`;
    $("#padronImportar").textContent = "Confirmar importación";
    return registros;
  } catch (err) {
    estado.className = "aviso malo"; estado.textContent = "No se pudo leer el archivo: " + err.message;
    return null;
  }
}

async function confirmarImportacionPadron(registros, onTerminado) {
  const estado = $("#padronEstado");
  const boton = $("#padronImportar");
  boton.disabled = true;
  try {
    const { hechos, errores } = await importarPadron(registros, (hecho, total) => {
      estado.className = "aviso"; estado.textContent = `Importando… ${hecho}/${total}`;
    });
    estado.className = errores ? "aviso malo" : "aviso bien";
    estado.textContent = `Listo: ${hechos} cédulas cargadas${errores ? `, ${errores} con error` : ""}.`;
  } catch (err) {
    estado.className = "aviso malo"; estado.textContent = "No se pudo importar: " + err.message;
  } finally {
    boton.disabled = false;
    boton.textContent = "Leer archivo";
    onTerminado();
  }
}
