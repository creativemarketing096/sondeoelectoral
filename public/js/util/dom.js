export const $ = s => document.querySelector(s);

export const claro = hex => {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#14181d" : "#ffffff";
};

export const iniciales = n => n.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join("");

/* Un apóstrofe crudo en la URL (ej. distrito YBY YA'U) corta el url('...')
   a la mitad y el navegador descarta todo el style — se escapa a %27. */
export const retrato = (n, f, ch) =>
  `<div class="retrato${ch ? " chico" : ""}" ${f ? `style="background-image:url('${f.replace(/'/g, "%27")}')"` : ""}>${f ? "" : iniciales(n)}</div>`;

/* Identificador persistente del navegador — no es infalible (se pierde si
   borran datos del sitio o usan modo incógnito), pero alcanza para que el
   admin audite cuántas cédulas se cargaron desde un mismo aparato. */
export function idDispositivo() {
  const clave = "sondeo_dispositivo_id";
  let id = localStorage.getItem(clave);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(clave, id); }
  return id;
}
