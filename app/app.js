function extractPathFromUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch (e) {
    return url;
  }
}

function app(configdata = {}, enclosingHtmlDivElement) {
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

  enclosingHtmlDivElement.innerHTML = `
    <div class="container-fluid px-0">
      <h2 class="mb-3">${titel}</h2>

      <!-- KPI-Zeile 1 -->
      <div class="row g-3 mb-2">
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body py-2"><div class="text-muted small">Messtage</div>
          <div class="fs-3 fw-bold" id="kpi-tage">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body py-2"><div class="text-muted small">Ø Temperatur</div>
          <div class="fs-3 fw-bold" id="kpi-temp-avg">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-danger bg-opacity-10">
          <div class="card-body py-2"><div class="text-muted small">Max. Temperatur</div>
          <div class="fs-3 fw-bold text-danger" id="kpi-temp-max">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-primary bg-opacity-10">
          <div class="card-body py-2"><div class="text-muted small">Gesamtregen</div>
          <div class="fs-3 fw-bold text-primary" id="kpi-regen">–</div></div></div></div>
      </div>

      <!-- KPI-Zeile 2 -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-success bg-opacity-10">
          <div class="card-body py-2"><div class="text-muted small">Max. Windböe</div>
          <div class="fs-3 fw-bold text-success" id="kpi-wind-max">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body py-2"><div class="text-muted small">Ø Luftdruck</div>
          <div class="fs-3 fw-bold" id="kpi-druck">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body py-2"><div class="text-muted small">Ø Luftfeuchte</div>
          <div class="fs-3 fw-bold" id="kpi-feuchte">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-warning bg-opacity-10">
          <div class="card-body py-2"><div class="text-muted small">Sonnenschein ges.</div>
          <div class="fs-3 fw-bold text-warning" id="kpi-sonne">–</div></div></div></div>
      </div>

      <!-- Filter -->
      <div class="row g-2 mb-3">
        <div class="col-md-3">
          <select class="form-select" id="filter-monat">
            <option value="">Alle Monate</option>
          </select>
        </div>
        <div class="col-md-2">
          <button class="btn btn-outline-secondary w-100" id="btn-reset">Zurücksetzen</button>
        </div>
        <div class="col-md-7 text-end pt-2">
          <span class="text-muted small" id="status-text"></span>
        </div>
      </div>

      <!-- Chart-Tabs -->
      <div class="card shadow-sm mb-3">
        <div class="card-header p-0">
          <ul class="nav nav-tabs card-header-tabs" id="chart-tabs">
            <li class="nav-item"><button class="nav-link active px-3 py-2" data-bs-toggle="tab" data-bs-target="#tab-temp">🌡️ Temperatur</button></li>
            <li class="nav-item"><button class="nav-link px-3 py-2" data-bs-toggle="tab" data-bs-target="#tab-wind">💨 Wind</button></li>
            <li class="nav-item"><button class="nav-link px-3 py-2" data-bs-toggle="tab" data-bs-target="#tab-regen">🌧️ Niederschlag</button></li>
            <li class="nav-item"><button class="nav-link px-3 py-2" data-bs-toggle="tab" data-bs-target="#tab-klima">📊 Klima</button></li>
          </ul>
        </div>
        <div class="card-body p-3">
          <div class="tab-content">
            <div class="tab-pane fade show active" id="tab-temp">
              <div style="position:relative;height:280px;"><canvas id="chart-temp"></canvas></div>
            </div>
            <div class="tab-pane fade" id="tab-wind">
              <div style="position:relative;height:280px;"><canvas id="chart-wind"></canvas></div>
            </div>
            <div class="tab-pane fade" id="tab-regen">
              <div style="position:relative;height:280px;"><canvas id="chart-regen"></canvas></div>
            </div>
            <div class="tab-pane fade" id="tab-klima">
              <div style="position:relative;height:280px;"><canvas id="chart-klima"></canvas></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabelle -->
      <div class="card shadow-sm">
        <div class="card-header fw-semibold d-flex justify-content-between align-items-center">
          <span>📋 Tagesdaten</span>
          <span class="badge bg-secondary" id="record-count">0 Einträge</span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-striped table-hover table-sm mb-0 small">
              <thead class="table-dark" id="tbl-head"></thead>
              <tbody id="tbl-body"></tbody>
            </table>
          </div>
        </div>
        <div class="card-footer d-flex justify-content-between align-items-center">
          <button class="btn btn-outline-secondary btn-sm" id="btn-prev" disabled>‹ Zurück</button>
          <span id="page-info" class="text-muted small"></span>
          <button class="btn btn-outline-secondary btn-sm" id="btn-next">Weiter ›</button>
        </div>
      </div>
    </div>`;

  // ── State ──────────────────────────────────────────────────────────
  let allRows = [];
  let filtered = [];
  let currentPage = 0;
  const PAGE_SIZE = 25;
  const charts = {};
  const fullPath = window.location.pathname.replace(/\/+$/, "");

  function setStatus(msg) {
    const el = document.getElementById("status-text");
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
    s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
    s.onload = callback;
    document.head.appendChild(s);
  }

  // ── CSV über Proxy laden ───────────────────────────────────────────
  async function fetchCsvText(csvUrl) {
    try {
      const targetUrl = new URL(csvUrl, window.location.href);
      if (targetUrl.origin === window.location.origin) {
        const r = await fetch(targetUrl.toString());
        if (r.ok) return await r.text();
      }
    } catch (e) {}

    const csvPath = extractPathFromUrl(csvUrl);
    const proxyUrls = [
      `${fullPath}/odp-data?path=${encodeURIComponent(csvUrl)}`,
      `${fullPath}/odp-data?path=${encodeURIComponent(csvPath)}`,
    ];

    for (const endpoint of proxyUrls) {
      try {
        const res = await fetch(endpoint, { method: "POST" });
        if (!res.ok) continue;
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("application/json")) {
          const json = await res.json();
          const body = json?.content || json?.data || json?.body || "";
          if (typeof body === "string" && body.trim().length) return body;
        } else {
          const body = await res.text();
          if (body.trim().length) return body;
        }
      } catch (e) {}
    }
    throw new Error("CSV konnte nicht geladen werden (CORS/Proxy).");
  }

  // ── RFC-konformer CSV-Parser (behandelt quoted fields korrekt) ─────
  function parseCsv(csvText) {
    function parseRow(line) {
      const result = [];
      let inQuote = false;
      let current = "";
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuote = !inQuote;
        } else if (c === "," && !inQuote) {
          result.push(current.trim());
          current = "";
        } else {
          current += c;
        }
      }
      result.push(current.trim());
      return result;
    }

    const lines = csvText.trim().split(/\r?\n/);
    const headers = parseRow(lines[0]);

    return lines
      .slice(1)
      .map((line) => {
        if (!line.trim()) return null;
        const vals = parseRow(line);
        const obj = {};
        headers.forEach((h, i) => {
          const num = parseFloat(vals[i]);
          obj[h] = isNaN(num) ? vals[i] || "" : num;
        });
        return obj;
      })
      .filter(Boolean);
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
      allRows = parseCsv(csvText);
      setStatus(allRows.length + " Datensätze geladen");
      buildMonatFilter();
      applyFilter();
    } catch (e) {
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

    const sel = document.getElementById("filter-monat");
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
    const monat = (document.getElementById("filter-monat") || {}).value || "";
    filtered = monat
      ? allRows.filter((r) => String(r[COL.datum] || "").startsWith(monat))
      : allRows.slice();
    const rc = document.getElementById("record-count");
    if (rc) rc.textContent = filtered.length + " Einträge";
    updateKPIs(filtered);
    renderTable(filtered, 0);
    renderCharts(filtered);
  }

  // ── KPIs ───────────────────────────────────────────────────────────
  function updateKPIs(rows) {
    function set(id, val, unit, decimals = 1) {
      const el = document.getElementById(id);
      if (el)
        el.textContent = isNaN(val)
          ? "–"
          : val.toFixed(decimals) + "\u00a0" + unit;
    }
    const elTage = document.getElementById("kpi-tage");
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

    const head = document.getElementById("tbl-head");
    if (head)
      head.innerHTML =
        "<tr>" +
        allCols
          .map((c) => `<th class="text-nowrap">${COL_LABELS[c] || c}</th>`)
          .join("") +
        "</tr>";

    const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const body = document.getElementById("tbl-body");
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
                    return `<td class="text-nowrap">${display}</td>`;
                  })
                  .join("") +
                "</tr>",
            )
            .join("")
        : '<tr><td colspan="13" class="text-center text-muted py-3">Keine Daten</td></tr>';

    const total = Math.ceil(rows.length / PAGE_SIZE);
    const pi = document.getElementById("page-info");
    if (pi) pi.textContent = `Seite ${page + 1} von ${Math.max(1, total)}`;
    const bp = document.getElementById("btn-prev");
    const bn = document.getElementById("btn-next");
    if (bp) bp.disabled = page === 0;
    if (bn) bn.disabled = (page + 1) * PAGE_SIZE >= rows.length;
  }

  // ── Charts ─────────────────────────────────────────────────────────
  function renderCharts(rows) {
    loadChartJs(() => {
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
        const canvas = document.getElementById(id);
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
      document.querySelectorAll('[data-bs-toggle="tab"]').forEach((btn) => {
        btn.addEventListener("shown.bs.tab", () => {
          Object.values(charts).forEach((c) => {
            if (c) c.resize();
          });
        });
      });
    });
  }

  // ── Events ─────────────────────────────────────────────────────────
  const filterEl = document.getElementById("filter-monat");
  if (filterEl) filterEl.addEventListener("change", applyFilter);

  const resetEl = document.getElementById("btn-reset");
  if (resetEl)
    resetEl.addEventListener("click", () => {
      const m = document.getElementById("filter-monat");
      if (m) m.value = "";
      applyFilter();
    });

  const prevEl = document.getElementById("btn-prev");
  if (prevEl)
    prevEl.addEventListener("click", () =>
      renderTable(filtered, currentPage - 1),
    );

  const nextEl = document.getElementById("btn-next");
  if (nextEl)
    nextEl.addEventListener("click", () =>
      renderTable(filtered, currentPage + 1),
    );

  // ── Start ──────────────────────────────────────────────────────────
  loadData();
  return null;
}

function addToHead() {}
