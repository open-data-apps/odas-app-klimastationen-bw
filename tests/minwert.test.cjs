// H4: Zeitachse der Diagramme aufsteigend; Tiefstwert 0,00 bei positivem Tagesmittel = fehlend.
// parseCsv/renderCharts liegen im app()-Closure; der Test treibt app() in einer vm-Sandbox
// mit Stub-DOM, gemockten fetch/Chart und liest Diagramm-Konfiguration und Tabelle.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const URL_CSV = "https://fixture.test/wetter.csv";
// Wie die Quelle: absteigend (neueste Zeile zuerst).
const CSV = [
  'Datum,Mittlere_Temperatur,Temp_max,Temp_min,Regen_mm,"Strahlung_ W/m²",Mittlere_Windgeschwindigkeit_km/h,Windboen_km/h,Richtung,Mittlerer_Luftdruck_hPa,Mittlere_Luftfeuchte,Taupunkt,Sonnenscheindauer_Min',
  '"2026-02-13 00:00:00",10.13,12.00,0.00,0.02,96.67,16.16,29.22,210,979.18,78.89,6.84,320',
  '"2026-02-12 00:00:00",-0.50,2.00,0.00,0.00,37.15,15.32,36.90,185,969.06,86.33,-3.10,130',
  '"2026-02-11 00:00:00",9.36,11.20,7.80,10.13,37.15,15.32,36.90,185,969.06,86.33,8.23,130',
].join("\n");

function el() {
  return { innerHTML: "", textContent: "", value: "", disabled: false, classList: { add() {}, remove() {} },
    addEventListener() {}, appendChild() {}, setAttribute() {}, getContext: () => ({}) };
}

async function lade() {
  const Papa = require(path.join(__dirname, "../app/vendor/papaparse/papaparse.min.js"));
  const elemente = new Map();
  const root = {
    innerHTML: "",
    querySelector(sel) { if (!elemente.has(sel)) elemente.set(sel, el()); return elemente.get(sel); },
    querySelectorAll: () => [],
    prepend() {},
  };
  const charts = {};
  class Chart { constructor(canvas, config) { this.config = config; charts[canvas.id] = config; } destroy() {} resize() {} }
  const win = { Papa, Chart, location: { href: "https://fixture.test/app/", pathname: "/app/" }, addEventListener() {} };
  const c = vm.createContext({
    console, Papa, Chart, window: win, URL, URLSearchParams, setTimeout, clearTimeout,
    fetch: async () => ({ ok: true, text: async () => CSV }),
    document: { addEventListener() {}, getElementById: () => null, createElement: el, head: { appendChild() {} }, querySelector: () => null },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8"), c);
  // Diagramm-Canvas bekommen die ID über ihren Selektor.
  const origQs = root.querySelector.bind(root);
  root.querySelector = (sel) => { const e = origQs(sel); if (sel.startsWith("#klima-chart-")) e.id = sel.slice(1); return e; };
  c.app({ apiurls: [{ name: "klimastationen", url: URL_CSV }], proxyAktiv: "nein" }, root);
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  const chartTemp = Object.entries(charts).find(([id]) => id.startsWith("klima-chart-temp"));
  return { chartTemp: chartTemp && chartTemp[1], tabelle: origQs("#klima-tbl-body-i1").innerHTML };
}

test("Diagramm-Zeitachse läuft aufsteigend (ältestes Datum links), Tabelle bleibt neueste zuerst", async () => {
  const { chartTemp, tabelle } = await lade();
  assert.deepEqual(chartTemp.data.labels, ["2026-02-11", "2026-02-12", "2026-02-13"]);
  assert.ok(tabelle.indexOf("2026-02-13") < tabelle.indexOf("2026-02-11"), "Tabelle: neueste zuerst");
});

test("Tiefstwert 0,00 bei positivem Tagesmittel ist fehlend, echter Frost bleibt 0", async () => {
  const { chartTemp } = await lade();
  const min = chartTemp.data.datasets.find((d) => d.label.startsWith("Min")).data;
  assert.equal(min[0], 7.8); // 11.02.
  assert.equal(min[1], 0); // 12.02.: Mittel −0,5, echter Frost, bleibt 0
  assert.ok(Number.isNaN(min[2]), "13.02.: Mittel 10,13 und Min 0,00 gilt als fehlend (NaN)");
});
