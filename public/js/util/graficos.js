import { $, iniciales } from "./dom.js";

export const GRIS = "#5f6368";

/* Evita texto invisible cuando el color del partido es blanco o casi blanco
   (las tarjetas de resultado tienen fondo blanco). */
export function colorVisible(hex) {
  const c = (hex || "").replace("#", "");
  if (c.length !== 6) return hex || GRIS;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 240 ? "#14181d" : hex;
}

/* Fila horizontal: foto + % + votos, una tarjeta por candidato — para
   intendente y para el top de concejales. */
export function filaResultados(id, items) {
  const total = items.reduce((s, i) => s + i.valor, 0);
  if (!total) { $(id).innerHTML = `<p class="aviso centro">Todavía no hay datos.</p>`; return; }
  $(id).innerHTML = `<div class="fila-resultados">` + items.map(i => {
    const pct = Math.round(i.valor / total * 100);
    const color = colorVisible(i.color);
    return `<div class="resultado-candidato" style="border-top-color:${color}">
      <div class="foto-resultado" ${i.foto ? `style="background-image:url('${i.foto.replace(/'/g, "%27")}')"` : ""}>${i.foto ? "" : iniciales(i.etiqueta)}</div>
      <b class="pct-resultado" style="color:${color}">${pct}%</b>
      <span class="nombre-resultado">${i.etiqueta}</span>
      <span class="votos-resultado">${i.valor} voto${i.valor === 1 ? "" : "s"}</span>
    </div>`;
  }).join("") + `</div>`;
}

/* Concejales agrupados por lista, en el orden de la boleta (no por votos).
   A diferencia de filaResultados, esto NO reconstruye el DOM en cada
   actualización: crea las tarjetas una sola vez y después solo les cambia
   el texto del porcentaje/votos in-place. Como el orden nunca cambia y no
   se destruyen nodos, se puede hacer scroll y mirar tranquilo mientras
   entran votos en tiempo real, sin que la pantalla salte o se reordene. */
export function filaConcejales(id, cfg, cc) {
  const cont = $(id);
  if (!cfg || !cfg.listas || !Object.keys(cfg.listas).length) {
    cont.innerHTML = `<p class="aviso centro">Todavía no hay datos.</p>`;
    return;
  }
  const total = Object.values(cc).reduce((s, v) => s + (v.total ?? v.valor ?? 0), 0);

  Object.entries(cfg.listas).forEach(([n, l]) => {
    const color = colorVisible(l.color || GRIS);
    let seccion = cont.querySelector(`[data-lista="${n}"]`);
    if (!seccion) {
      seccion = document.createElement("div");
      seccion.className = "seccion-lista";
      seccion.dataset.lista = n;
      seccion.innerHTML = `<div class="seccion-lista-titulo" style="border-color:${l.color || GRIS};color:${color}">LISTA ${n} — ${l.nombre}</div><div class="grilla-concejales"></div>`;
      cont.appendChild(seccion);
    }
    const grilla = seccion.querySelector(".grilla-concejales");
    l.candidatos.forEach((nombre, i) => {
      const clave = `${n}·${nombre}`;
      const v = cc[clave] || {};
      const valor = v.total ?? v.valor ?? 0;
      const pct = total ? Math.round(valor / total * 100) : 0;
      let tarjeta = grilla.querySelector(`[data-clave="${CSS.escape(clave)}"]`);
      if (!tarjeta) {
        const foto = l.fotos && l.fotos[i];
        tarjeta = document.createElement("div");
        tarjeta.className = "resultado-candidato";
        tarjeta.dataset.clave = clave;
        tarjeta.style.borderTopColor = l.color || GRIS;
        tarjeta.innerHTML = `
          <div class="foto-resultado" ${foto ? `style="background-image:url('${foto.replace(/'/g, "%27")}')"` : ""}>${foto ? "" : iniciales(nombre)}</div>
          <b class="pct-resultado" style="color:${color}"></b>
          <span class="nombre-resultado">${nombre}</span>
          <span class="votos-resultado"></span>`;
        grilla.appendChild(tarjeta);
      }
      tarjeta.querySelector(".pct-resultado").textContent = pct + "%";
      tarjeta.querySelector(".votos-resultado").textContent = `${valor} voto${valor === 1 ? "" : "s"}`;
    });
  });
}

/* Tira compacta de porcentajes en una sola fila — para sexo y edad. */
export function filaStats(id, items) {
  const total = items.reduce((s, i) => s + i.valor, 0) || 1;
  $(id).innerHTML = `<div class="fila-stats">` + items.map(i =>
    `<div class="stat-pill" style="border-color:${colorVisible(i.color)}"><b>${Math.round(i.valor / total * 100)}%</b><span>${i.etiqueta}</span></div>`
  ).join("") + `</div>`;
}

export function barras(id, items) {
  if (!items.some(i => i.valor > 0)) { $(id).innerHTML = `<p class="aviso centro">Todavía no hay datos.</p>`; return; }
  const max = Math.max(...items.map(i => i.valor), 1);
  $(id).innerHTML = items.map(i => `
    <div class="barra-fila">
      <span class="barra-etq">${i.etiqueta}</span>
      <span class="barra-pista"><span class="barra-rel" style="width:${i.valor ? Math.max(4, i.valor / max * 100) : 0}%;background:${i.color || GRIS}"></span></span>
      <span class="barra-val">${i.valor}</span>
    </div>`).join("");
}

export function cuenta(arr, campo) {
  const o = {};
  arr.forEach(f => { const v = f[campo] || "NS/NC"; o[v] = (o[v] || 0) + 1; });
  return o;
}
