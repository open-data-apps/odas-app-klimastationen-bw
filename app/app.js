function isOdasProxyEnabled(configdata = {}) {
  return String(configdata.proxyAktiv || "").trim().toLowerCase() === "ja";
}

function extractPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname + parsedUrl.search;
  } catch (_error) {
    return String(url || "");
  }
}

function getOdasAppBasePath(pathname) {
  let appPath =
    pathname === undefined
      ? typeof window !== "undefined"
        ? window.location.pathname
        : "/"
      : String(pathname || "/");

  if (!appPath.endsWith("/")) {
    const lastSlashIndex = appPath.lastIndexOf("/");
    const lastSegment = appPath.substring(lastSlashIndex + 1);
    if (lastSegment.includes(".")) {
      appPath = appPath.substring(0, lastSlashIndex + 1);
    }
  }

  return appPath.replace(/\/+$/, "");
}

function getOdasProxyEndpoint(targetUrl, pathname) {
  const appPath = getOdasAppBasePath(pathname);
  return `${appPath}/odp-data?path=${encodeURIComponent(
    extractPathFromUrl(targetUrl),
  )}`;
}

async function fetchViaOdasProxy(targetUrl) {
  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}`);
  }

  const proxyData = await response.json();
  if (!proxyData || typeof proxyData.content !== "string") {
    throw new Error("ODAS-Proxy-Antwort enthält keinen content-String.");
  }

  return proxyData.content;
}

async function fetchOdasResource(targetUrl, configdata = {}) {
  if (isOdasProxyEnabled(configdata)) {
    return fetchViaOdasProxy(targetUrl);
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } catch (error) {
    throw new Error(
      `Direkter Datenabruf fehlgeschlagen (${error.message}). Bitte prüfen Sie die Daten-URL und die CORS-Freigabe der Datenquelle.`,
    );
  }
}

async function fetchOdasJson(targetUrl, configdata = {}) {
  return JSON.parse(await fetchOdasResource(targetUrl, configdata));
}

// PapaParse (CSV-Parsing) dynamisch aus app/vendor laden; Promise-basiert.
function ensurePapaparse() {
  return new Promise((resolve, reject) => {
    if (window.Papa) {
      resolve();
      return;
    }
    const vorhanden = document.getElementById("papaparse-script");
    if (vorhanden) {
      vorhanden.addEventListener("load", () => resolve());
      vorhanden.addEventListener("error", () =>
        reject(new Error("PapaParse konnte nicht geladen werden.")),
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "papaparse-script";
    script.src = "vendor/papaparse/papaparse.min.js";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("PapaParse konnte nicht geladen werden."));
    document.head.appendChild(script);
  });
}

let klimaInstanzZaehler = 0;

function app(configdata = {}, enclosingHtmlDivElement) {
  const klimaUid = "i" + ++klimaInstanzZaehler;
  const root = enclosingHtmlDivElement;
  const apiurl = configdata.apiurl || "";
  const titel = configdata.titel || "Wetterdaten Karlsruhe";

  // Exakte Spaltennamen aus der CSV
  const COL = {
    datum: "Datum",
    tempAvg: "Mittlere_Temperatur",
    tempMax: "Temp_max",
    tempMin: "Temp_min",
    regen: "Regen_mm",
    strahlung: "Strahlung_ W/m²",
    wind: "Mittlere_Windgeschwindigkeit_km/h",
    windBoe: "Windboen_km/h",
    richtung: "Richtung",
    druck: "Mittlerer_Luftdruck_hPa",
    feuchte: "Mittlere_Luftfeuchte",
    taupunkt: "Taupunkt",
    sonne: "Sonnenscheindauer_Min",
  };

  const COL_LABELS = {
    Datum: "Datum",
    Mittlere_Temperatur: "Ø Temp (°C)",
    Temp_max: "Max (°C)",
    Temp_min: "Min (°C)",
    Regen_mm: "Regen (mm)",
    "Strahlung_ W/m²": "Strahlung (W/m²)",
    "Mittlere_Windgeschwindigkeit_km/h": "Ø Wind (km/h)",
    "Windboen_km/h": "Böen (km/h)",
    Richtung: "Richtung (°)",
    Mittlerer_Luftdruck_hPa: "Luftdruck (hPa)",
    Mittlere_Luftfeuchte: "Luftfeuchte (%)",
    Taupunkt: "Taupunkt (°C)",
    Sonnenscheindauer_Min: "Sonne (Min)",
  };

  const kk = (n) => {
    const t = String(configdata["kpiKontext" + n] || "").trim();
    if (!t) return '';
    return (
      '<button class="klima-kpi-info-toggle collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#klima-kpi-kontext-' + n + '-' + klimaUid + '" aria-expanded="false" aria-controls="klima-kpi-kontext-' + n + '-' + klimaUid + '" aria-label="Erklärung zu diesem Wert"><span class="klima-kpi-info-icon" aria-hidden="true">ⓘ</span></button>' +
      '<div id="klima-kpi-kontext-' + n + '-' + klimaUid + '" class="collapse"><div class="klima-kpi-kontext text-muted small">' + escapeHtml(t) + '</div></div>'
    );
  };

  enclosingHtmlDivElement.innerHTML = `
    <div class="container-fluid px-0">
      <h2 class="mb-3">${escapeHtml(titel)}</h2>
      <div id="klima-datenstand" class="text-muted small mb-3"></div>

      <!-- KPI-Zeile 1 -->
      <div class="row g-3 mb-2">
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body py-2"><div class="text-muted small">Messtage</div>
          <div class="fs-3 fw-bold" id="klima-kpi-tage">–</div>${kk(1)}</div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body py-2"><div class="text-muted small">Ø Temperatur</div>
          <div class="fs-3 fw-bold" id="klima-kpi-temp-avg">–</div>${kk(2)}</div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-danger bg-opacity-10">
          <div class="card-body py-2"><div class="text-muted small">Max. Temperatur</div>
          <div class="fs-3 fw-bold text-danger" id="klima-kpi-temp-max">–</div>${kk(3)}</div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-primary bg-opacity-10">
          <div class="card-body py-2"><div class="text-muted small">Gesamtregen</div>
          <div class="fs-3 fw-bold text-primary" id="klima-kpi-regen">–</div>${kk(4)}</div></div></div>
      </div>

      <!-- KPI-Zeile 2 -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-success bg-opacity-10">
          <div class="card-body py-2"><div class="text-muted small">Max. Windböe</div>
          <div class="fs-3 fw-bold text-success" id="klima-kpi-wind-max">–</div>${kk(5)}</div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body py-2"><div class="text-muted small">Ø Luftdruck</div>
          <div class="fs-3 fw-bold" id="klima-kpi-druck">–</div>${kk(6)}</div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body py-2"><div class="text-muted small">Ø Luftfeuchte</div>
          <div class="fs-3 fw-bold" id="klima-kpi-feuchte">–</div>${kk(7)}</div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-warning bg-opacity-10">
          <div class="card-body py-2"><div class="text-muted small">Sonnenschein ges.</div>
          <div class="fs-3 fw-bold text-warning" id="klima-kpi-sonne">–</div>${kk(8)}</div></div></div>
      </div>

      <!-- Filter -->
      <div class="row g-2 mb-3">
        <div class="col-md-3">
          <select class="form-select" id="klima-filter-monat">
            <option value="">Alle Monate</option>
          </select>
        </div>
        <div class="col-md-2">
          <button class="btn btn-outline-secondary w-100" id="klima-btn-reset">Zurücksetzen</button>
        </div>
        <div class="col-md-7 text-end pt-2">
          <span class="text-muted small" id="klima-status-text"></span>
        </div>
      </div>

      <!-- Chart-Tabs -->
      <div class="card shadow-sm mb-3">
        <div class="card-header p-0">
          <ul class="nav nav-tabs card-header-tabs" id="chart-tabs">
            <li class="nav-item"><button class="nav-link active px-3 py-2" data-bs-toggle="tab" data-bs-target="#klima-tab-temp-${klimaUid}">🌡️ Temperatur</button></li>
            <li class="nav-item"><button class="nav-link px-3 py-2" data-bs-toggle="tab" data-bs-target="#klima-tab-wind-${klimaUid}">💨 Wind</button></li>
            <li class="nav-item"><button class="nav-link px-3 py-2" data-bs-toggle="tab" data-bs-target="#klima-tab-regen-${klimaUid}">🌧️ Niederschlag</button></li>
            <li class="nav-item"><button class="nav-link px-3 py-2" data-bs-toggle="tab" data-bs-target="#klima-tab-klima-${klimaUid}">📊 Klima</button></li>
          </ul>
        </div>
        <div class="card-body p-3">
          <div class="tab-content">
            <div class="tab-pane fade show active" id="klima-tab-temp-${klimaUid}">
              <div style="position:relative;height:280px;"><canvas id="klima-chart-temp"></canvas></div>
            </div>
            <div class="tab-pane fade" id="klima-tab-wind-${klimaUid}">
              <div style="position:relative;height:280px;"><canvas id="klima-chart-wind"></canvas></div>
            </div>
            <div class="tab-pane fade" id="klima-tab-regen-${klimaUid}">
              <div style="position:relative;height:280px;"><canvas id="klima-chart-regen"></canvas></div>
            </div>
            <div class="tab-pane fade" id="klima-tab-klima-${klimaUid}">
              <div style="position:relative;height:280px;"><canvas id="klima-chart-klima"></canvas></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabelle -->
      <div class="card shadow-sm">
        <div class="card-header fw-semibold d-flex justify-content-between align-items-center">
          <span>📋 Tagesdaten</span>
          <span class="badge bg-secondary" id="klima-record-count">0 Einträge</span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-striped table-hover table-sm mb-0 small">
              <thead class="table-dark" id="klima-tbl-head"></thead>
              <tbody id="klima-tbl-body"></tbody>
            </table>
          </div>
        </div>
        <div class="card-footer d-flex justify-content-between align-items-center">
          <button class="btn btn-outline-secondary btn-sm" id="klima-btn-prev" disabled>‹ Zurück</button>
          <span id="klima-page-info" class="text-muted small"></span>
          <button class="btn btn-outline-secondary btn-sm" id="klima-btn-next">Weiter ›</button>
        </div>
      </div>

      ${renderMethodikbox()}
      ${renderWeitereInfos()}
    </div>`;

  // ── State ──────────────────────────────────────────────────────────
  let allRows = [];
  let filtered = [];
  let currentPage = 0;
  const PAGE_SIZE = 25;
  const charts = {};

  // Instanz-Teardown synchron registrieren (VOR jedem Async-Start/loadData):
  // markiert disposed und raeumt alle in `charts` gehaltenen Chart-Instanzen ab.
  let disposed = false;
  klimaCleanups.set(root, () => {
    disposed = true;
    Object.values(charts).forEach((c) => {
      if (c) c.destroy();
    });
    for (const k in charts) delete charts[k];
  });

  // ── Schale-4: Datenfrische, Methodikbox & weiterführende Links ──────
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderDatenstand() {
    const el = root.querySelector("#klima-datenstand");
    if (!el) return;
    let newest = "";
    for (const r of allRows) {
      const d = String(r[COL.datum] || "").substring(0, 10);
      if (d && d > newest) newest = d;
    }
    if (!newest) {
      el.textContent = "";
      return;
    }
    const p = newest.split("-");
    const disp = p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : newest;
    el.textContent = "Letzte Messung: " + disp;
  }

  function renderMethodikbox() {
    const hinweis = String(configdata.datenquelleHinweis || "").trim();
    const stand = String(configdata.datenStand || "").trim();
    if (!hinweis && !stand) return "";
    const standHtml = stand
      ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
      : "";
    return (
      '<div class="card shadow-sm mt-4"><div class="card-body">' +
      '<button class="klima-methodik-toggle btn btn-link text-decoration-none d-flex w-100 justify-content-between align-items-center p-0 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#klima-methodik-body-' + klimaUid + '" aria-expanded="false" aria-controls="klima-methodik-body-' + klimaUid + '">' +
      '<h5 class="card-title mb-0">Methodik &amp; Datenquelle</h5>' +
      '<span class="klima-methodik-chevron" aria-hidden="true">&#9662;</span>' +
      "</button>" +
      '<div id="klima-methodik-body-' + klimaUid + '" class="collapse mt-2">' +
      standHtml +
      hinweis +
      "</div>" +
      "</div></div>"
    );
  }

  function renderWeitereInfos() {
    const links = String(configdata.weiterfuehrendeLinks || "").trim();
    if (!links) return "";
    return (
      '<div class="card shadow-sm mt-4"><div class="card-body">' +
      '<h5 class="card-title">Weitere Informationen</h5>' +
      "<div>" +
      links +
      "</div></div></div>"
    );
  }
  function setStatus(msg) {
    const el = root.querySelector("#klima-status-text");
    if (el) el.textContent = msg;
  }

  function numVal(row, col) {
    return parseFloat(row[col]);
  }

  function avg(rows, col) {
    const vals = rows.map((r) => numVal(r, col)).filter((n) => !isNaN(n));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN;
  }

  function sum(rows, col) {
    return rows
      .map((r) => numVal(r, col))
      .filter((n) => !isNaN(n))
      .reduce((a, b) => a + b, 0);
  }

  function max(rows, col) {
    const vals = rows.map((r) => numVal(r, col)).filter((n) => !isNaN(n));
    return vals.length ? Math.max(...vals) : NaN;
  }

  // ── Chart.js laden ─────────────────────────────────────────────────
  function loadChartJs(callback) {
    if (window.Chart) {
      callback();
      return;
    }
    const s = document.createElement("script");
    s.src = "vendor/chartjs/chart.umd.min.js";
    s.onload = callback;
    document.head.appendChild(s);
  }

  // ── CSV laden: direkt oder ueber den ODAS-Proxy (proxyAktiv) ───────
  async function fetchCsvText(csvUrl) {
    return fetchOdasResource(new URL(csvUrl, window.location.href).toString(), configdata);
  }

  // ── RFC-konformer CSV-Parser (PapaParse, quoted fields korrekt) ──────
  function parseCsv(csvText) {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
    if (result.errors && result.errors.length > 0) {
      const err = result.errors[0];
      throw new Error(
        `CSV-Parsing-Fehler (Zeile ${err.row + 1}): ${err.message}`,
      );
    }
    return result.data.map((row) => {
      const obj = {};
      Object.keys(row).forEach((h) => {
        const raw = String(row[h] ?? "").trim();
        const num = parseFloat(raw);
        obj[h] = !raw || String(num) !== raw ? raw : num;
      });
      return obj;
    });
  }

  // ── Daten laden ────────────────────────────────────────────────────
  async function loadData() {
    if (!apiurl) {
      enclosingHtmlDivElement.innerHTML =
        '<div class="alert alert-warning m-3">Bitte <code>apiurl</code> in <code>config.json</code> konfigurieren.</div>';
      return;
    }
    setStatus("Lade Daten …");
    try {
      const csvText = await fetchCsvText(apiurl);
      if (disposed) return;
      await ensurePapaparse();
      if (disposed) return;
      allRows = parseCsv(csvText);
      renderDatenstand();
      setStatus(allRows.length + " Datensätze geladen");
      buildMonatFilter();
      applyFilter();
    } catch (e) {
      if (disposed) return;
      setStatus("Fehler: " + e.message);
    }
  }

  // ── Monat-Filter ───────────────────────────────────────────────────
  function buildMonatFilter() {
    const monate = [
      ...new Set(
        allRows
          .map((r) => String(r[COL.datum] || "").substring(0, 7))
          .filter((m) => m.length === 7),
      ),
    ].sort();

    const sel = root.querySelector("#klima-filter-monat");
    if (!sel) return;
    sel.innerHTML = '<option value="">Alle Monate</option>';
    const namen = [
      "Jan",
      "Feb",
      "Mär",
      "Apr",
      "Mai",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Dez",
    ];
    monate.forEach((m) => {
      const [y, mo] = m.split("-");
      const o = document.createElement("option");
      o.value = m;
      o.textContent = `${namen[parseInt(mo, 10) - 1]} ${y}`;
      sel.appendChild(o);
    });
  }

  // ── Filter anwenden ────────────────────────────────────────────────
  function applyFilter() {
    const monat = (root.querySelector("#klima-filter-monat") || {}).value || "";
    filtered = monat
      ? allRows.filter((r) => String(r[COL.datum] || "").startsWith(monat))
      : allRows.slice();
    const rc = root.querySelector("#klima-record-count");
    if (rc) rc.textContent = filtered.length + " Einträge";
    updateKPIs(filtered);
    renderTable(filtered, 0);
    renderCharts(filtered);
  }

  // ── KPIs ───────────────────────────────────────────────────────────
  function updateKPIs(rows) {
    function set(id, val, unit, decimals = 1) {
      const el = root.querySelector("#klima-" + id);
      if (el)
        el.textContent = isNaN(val)
          ? "–"
          : val.toFixed(decimals) + "\u00a0" + unit;
    }
    const elTage = root.querySelector("#klima-kpi-tage");
    if (elTage) elTage.textContent = rows.length;

    set("kpi-temp-avg", avg(rows, COL.tempAvg), "°C");
    set("kpi-temp-max", max(rows, COL.tempMax), "°C");
    set("kpi-regen", sum(rows, COL.regen), "mm");
    set("kpi-wind-max", max(rows, COL.windBoe), "km/h");
    set("kpi-druck", avg(rows, COL.druck), "hPa", 0);
    set("kpi-feuchte", avg(rows, COL.feuchte), "%");
    set("kpi-sonne", sum(rows, COL.sonne) / 60, "h", 0);
  }

  // ── Tabelle ────────────────────────────────────────────────────────
  function renderTable(rows, page) {
    currentPage = page;
    const allCols = Object.values(COL);

    const head = root.querySelector("#klima-tbl-head");
    if (head)
      head.innerHTML =
        "<tr>" +
        allCols
          .map((c) => `<th class="text-nowrap">${escapeHtml(COL_LABELS[c] || c)}</th>`)
          .join("") +
        "</tr>";

    const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const body = root.querySelector("#klima-tbl-body");
    if (body)
      body.innerHTML = slice.length
        ? slice
            .map(
              (r) =>
                "<tr>" +
                allCols
                  .map((c) => {
                    const val = r[c];
                    const display =
                      c === COL.datum
                        ? String(val).substring(0, 10)
                        : typeof val === "number"
                          ? val.toFixed(2)
                          : val || "";
                    return `<td class="text-nowrap">${escapeHtml(display)}</td>`;
                  })
                  .join("") +
                "</tr>",
            )
            .join("")
        : '<tr><td colspan="13" class="text-center text-muted py-3">Keine Daten</td></tr>';

    const total = Math.ceil(rows.length / PAGE_SIZE);
    const pi = root.querySelector("#klima-page-info");
    if (pi) pi.textContent = `Seite ${page + 1} von ${Math.max(1, total)}`;
    const bp = root.querySelector("#klima-btn-prev");
    const bn = root.querySelector("#klima-btn-next");
    if (bp) bp.disabled = page === 0;
    if (bn) bn.disabled = (page + 1) * PAGE_SIZE >= rows.length;
  }

  // ── Charts ─────────────────────────────────────────────────────────
  function renderCharts(rows) {
    loadChartJs(() => {
      if (disposed) return;
      const labels = rows.map((r) =>
        String(r[COL.datum] || "").substring(0, 10),
      );

      const baseOpts = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "top" } },
        scales: { x: { ticks: { maxTicksLimit: 10, maxRotation: 45 } } },
      };

      function mkChart(id, config) {
        if (charts[id]) {
          charts[id].destroy();
          delete charts[id];
        }
        const canvas = root.querySelector("#klima-" + id);
        if (!canvas) return;
        charts[id] = new Chart(canvas, config);
      }

      // Tab 1: Temperatur
      mkChart("chart-temp", {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Max (°C)",
              data: rows.map((r) => numVal(r, COL.tempMax)),
              borderColor: "#e74c3c",
              backgroundColor: "rgba(231,76,60,0.08)",
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              borderWidth: 1.5,
            },
            {
              label: "Ø (°C)",
              data: rows.map((r) => numVal(r, COL.tempAvg)),
              borderColor: "#f39c12",
              backgroundColor: "rgba(243,156,18,0.1)",
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              borderWidth: 2,
            },
            {
              label: "Min (°C)",
              data: rows.map((r) => numVal(r, COL.tempMin)),
              borderColor: "#3498db",
              backgroundColor: "rgba(52,152,219,0.08)",
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          ...baseOpts,
          scales: {
            ...baseOpts.scales,
            y: { title: { display: true, text: "°C" } },
          },
        },
      });

      // Tab 2: Wind (Balken Böen + Linie Ø Wind)
      mkChart("chart-wind", {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Böen (km/h)",
              data: rows.map((r) => numVal(r, COL.windBoe)),
              backgroundColor: "rgba(108,117,125,0.45)",
              borderColor: "#6c757d",
              borderWidth: 1,
              order: 2,
            },
            {
              label: "Ø Wind (km/h)",
              data: rows.map((r) => numVal(r, COL.wind)),
              type: "line",
              borderColor: "#0d6efd",
              backgroundColor: "rgba(13,110,253,0.1)",
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              borderWidth: 2,
              order: 1,
            },
          ],
        },
        options: {
          ...baseOpts,
          scales: {
            ...baseOpts.scales,
            y: { title: { display: true, text: "km/h" } },
          },
        },
      });

      // Tab 3: Niederschlag (Balken) + Sonnenschein (Linie, rechte Achse)
      mkChart("chart-regen", {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Regen (mm)",
              data: rows.map((r) => numVal(r, COL.regen)),
              backgroundColor: "rgba(0,123,255,0.55)",
              borderColor: "#007bff",
              borderWidth: 1,
              yAxisID: "y",
              order: 2,
            },
            {
              label: "Sonne (Min)",
              data: rows.map((r) => numVal(r, COL.sonne)),
              type: "line",
              borderColor: "#ffc107",
              backgroundColor: "rgba(255,193,7,0.08)",
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              borderWidth: 2,
              yAxisID: "y1",
              order: 1,
            },
          ],
        },
        options: {
          ...baseOpts,
          scales: {
            x: baseOpts.scales.x,
            y: {
              title: { display: true, text: "Regen (mm)" },
              position: "left",
            },
            y1: {
              title: { display: true, text: "Sonne (Min)" },
              position: "right",
              grid: { drawOnChartArea: false },
            },
          },
        },
      });

      // Tab 4: Luftdruck + Luftfeuchte + Strahlung
      mkChart("chart-klima", {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Luftdruck (hPa)",
              data: rows.map((r) => numVal(r, COL.druck)),
              borderColor: "#6f42c1",
              backgroundColor: "rgba(111,66,193,0.08)",
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              borderWidth: 2,
              yAxisID: "y",
            },
            {
              label: "Luftfeuchte (%)",
              data: rows.map((r) => numVal(r, COL.feuchte)),
              borderColor: "#20c997",
              backgroundColor: "rgba(32,201,151,0.08)",
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              borderWidth: 2,
              yAxisID: "y1",
            },
            {
              label: "Strahlung (W/m²)",
              data: rows.map((r) => numVal(r, COL.strahlung)),
              borderColor: "#fd7e14",
              backgroundColor: "rgba(253,126,20,0.05)",
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              borderWidth: 1.5,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          ...baseOpts,
          scales: {
            x: baseOpts.scales.x,
            y: { title: { display: true, text: "hPa" }, position: "left" },
            y1: {
              title: { display: true, text: "% / W/m²" },
              position: "right",
              grid: { drawOnChartArea: false },
            },
          },
        },
      });

      // Resize wenn versteckter Tab eingeblendet wird
      root.querySelectorAll('[data-bs-toggle="tab"]').forEach((btn) => {
        btn.addEventListener("shown.bs.tab", () => {
          Object.values(charts).forEach((c) => {
            if (c) c.resize();
          });
        });
      });
    });
  }

  // ── Events ─────────────────────────────────────────────────────────
  const filterEl = root.querySelector("#klima-filter-monat");
  if (filterEl) filterEl.addEventListener("change", applyFilter);

  const resetEl = root.querySelector("#klima-btn-reset");
  if (resetEl)
    resetEl.addEventListener("click", () => {
      const m = root.querySelector("#klima-filter-monat");
      if (m) m.value = "";
      applyFilter();
    });

  const prevEl = root.querySelector("#klima-btn-prev");
  if (prevEl)
    prevEl.addEventListener("click", () =>
      renderTable(filtered, currentPage - 1),
    );

  const nextEl = root.querySelector("#klima-btn-next");
  if (nextEl)
    nextEl.addEventListener("click", () =>
      renderTable(filtered, currentPage + 1),
    );

  // ── Start ──────────────────────────────────────────────────────────
  loadData();
  return null;
}

// ── Lifecycle: instanzweises Cleanup-Register ─────────────────────────────
// Top-Level-Registry (je App-Container eine Cleanup-Funktion). Wird von
// onPageLeave (app/app-base.js ruft die Funktion beim Seitenwechsel exakt so
// auf) vollstaendig durchlaufen und geleert.
const klimaCleanups = new Map();

function onPageLeave() {
  klimaCleanups.forEach((cleanup) => {
    try {
      cleanup();
    } catch (e) {
      console.error("Klimastationen-Cleanup fehlgeschlagen:", e);
    }
  });
  klimaCleanups.clear();
}

function addToHead() {}
