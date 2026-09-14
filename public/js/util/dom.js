export const $ = s => document.querySelector(s);

export const claro = hex => {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#14181d" : "#ffffff";
};

export const iniciales = n => n.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join("");

export const retrato = (n, f, ch) =>
  `<div class="retrato${ch ? " chico" : ""}" ${f ? `style="background-image:url('${f}')"` : ""}>${f ? "" : iniciales(n)}</div>`;
