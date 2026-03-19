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
  const titel = configdata.titel || "Wetterdaten";

  enclosingHtmlDivElement.innerHTML = `
    <div class="container-fluid px-0">
      <h2 class="mb-3">${titel}</h2>

      <!-- KPI-Kacheln -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body"><div class="text-muted small">Messtage</div>
          <div class="fs-3 fw-bold" id="kpi-tage">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm">
          <div class="card-body"><div class="text-muted small">Ø Temperatur</div>
          <div class="fs-3 fw-bold" id="kpi-avg">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-danger bg-opacity-10">
          <div class="card-body"><div class="text-muted small">Max. Temperatur</div>
          <div class="fs-3 fw-bold text-danger" id="kpi-max">–</div></div></div></div>
        <div class="col-6 col-md-3"><div class="card text-center h-100 shadow-sm bg-primary bg-opacity-10">
          <div class="card-body"><div class="text-muted small">Gesamtregen</div>
          <div class="fs-3 fw-bold text-primary" id="kpi-regen">–</div></div></div></div>
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

      <!-- Chart -->
      <div class="card shadow-sm mb-3">
        <div class="card-header fw-semibold">📈 Temperaturverlauf</div>
        <div class="card-body" style="position:relative;height:300px;">
          <canvas id="temp-chart"></canvas>
        </div>
      </div>

      <!-- Tabelle -->
      <div class="card shadow-sm">
        <div class="card-header fw-semibold d-flex justify-content-between align-items-center">
          <span>📋 Tagesdaten</span>
          <div class="d-flex align-items-center gap-2">
            <input
              type="search"
              class="form-control form-control-sm"
              id="tbl-search"
              placeholder="Suchen..."
              aria-label="Tabelle durchsuchen"
              style="max-width: 220px;"
            />
            <span class="badge bg-secondary" id="record-count">0 Einträge</span>
          </div>
        </div>
        <div class="card-body p-0">
          <div>
            <table class="table table-striped table-hover table-sm mb-0">
              <thead class="table-dark">
                <tr id="tbl-head-row"></tr>
              </thead>
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
  const MAX_TABLE_COLUMNS = 6;
  let chartInst = null;
  let sortKey = null;
  let sortDir = "asc";
  let visibleColumns = [];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function prettifyKey(key) {
    const lower = key.toLowerCase();
    if (lower.includes("datum") || lower.includes("date")) return "Datum";
    if (
      lower.includes("mittel") ||
      lower.includes("avg") ||
      lower.includes("mean") ||
      lower.includes("durchschn")
    ) {
      return "Ø Temp (°C)";
    }
    if (lower.includes("max")) return "Max (°C)";
    if (lower.includes("min")) return "Min (°C)";
    if (
      lower.includes("regen") ||
      lower.includes("nieder") ||
      lower.includes("rain") ||
      lower.includes("prec")
    ) {
      return "Regen (mm)";
    }

    const cleaned = key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
    const normalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return normalized.length > 18 ? normalized.slice(0, 17) + "…" : normalized;
  }

  function detectMetricKeys(keys) {
    let avgKey = keys.find(
      (k) =>
        k.toLowerCase().includes("mittel") ||
        k.toLowerCase().includes("avg") ||
        k.toLowerCase().includes("mean") ||
        k.toLowerCase().includes("durchschn") ||
        k.toLowerCase().includes("temp_m") ||
        k.toLowerCase().includes("t_m"),
    );

    if (!avgKey) {
      avgKey = keys.find(
        (k) =>
          (k.toLowerCase().includes("temp") ||
            k.toLowerCase().includes("temperatur") ||
            k.toLowerCase().includes("t_")) &&
          allRows.some((r) => Number.isFinite(parseFloat(r[k]))),
      );
    }

    if (!avgKey) {
      avgKey = keys.find((k) =>
        allRows.some((r) => Number.isFinite(parseFloat(r[k]))),
      );
    }

    return {
      dateKey:
        keys.find(
          (k) =>
            k.toLowerCase().includes("datum") ||
            k.toLowerCase().includes("date") ||
            k.toLowerCase().includes("zeit"),
        ) || keys[0],
      avgKey,
      maxKey: keys.find((k) => k.toLowerCase().includes("max")),
      minKey: keys.find((k) => k.toLowerCase().includes("min")),
      rainKey: keys.find(
        (k) =>
          k.toLowerCase().includes("regen") ||
          k.toLowerCase().includes("nieder") ||
          k.toLowerCase().includes("rain") ||
          k.toLowerCase().includes("prec"),
      ),
    };
  }

  function computeVisibleColumns(rows) {
    const keys = Object.keys(rows[0] || {});
    if (!keys.length) return [];
    const metric = detectMetricKeys(keys);

    const preferred = [
      metric.dateKey,
      metric.avgKey,
      metric.maxKey,
      metric.minKey,
      metric.rainKey,
    ].filter(Boolean);

    const uniquePreferred = [...new Set(preferred)];
    const remaining = keys.filter((k) => !uniquePreferred.includes(k));
    return [...uniquePreferred, ...remaining].slice(0, MAX_TABLE_COLUMNS);
  }

  function formatCell(value) {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (text.length <= 24) return text;
    return text.slice(0, 21) + "...";
  }

  function applySort(rows) {
    if (!sortKey) return rows;
    const direction = sortDir === "asc" ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const av = a?.[sortKey];
      const bv = b?.[sortKey];

      const an = parseFloat(av);
      const bn = parseFloat(bv);
      if (Number.isFinite(an) && Number.isFinite(bn)) {
        return (an - bn) * direction;
      }

      const ad = Date.parse(av);
      const bd = Date.parse(bv);
      if (Number.isFinite(ad) && Number.isFinite(bd)) {
        return (ad - bd) * direction;
      }

      return (
        String(av ?? "").localeCompare(String(bv ?? ""), "de", {
          numeric: true,
          sensitivity: "base",
        }) * direction
      );
    });
  }

  function setStatus(msg) {
    const el = document.getElementById("status-text");
    if (el) el.textContent = msg;
  }

  async function fetchCsvText(csvUrl) {
    // Do a direct request only for same-origin URLs. Cross-origin usually fails due to CORS.
    try {
      const targetUrl = new URL(csvUrl, window.location.href);
      if (targetUrl.origin === window.location.origin) {
        const directRes = await fetch(targetUrl.toString());
        if (directRes.ok) {
          return await directRes.text();
        }
      }
    } catch (_e) {
      // continue with proxy fallback
    }

    async function parseProxyResponse(res) {
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (typeof json?.content === "string" && json.content.length)
          return json.content;
        if (typeof json?.data === "string" && json.data.length)
          return json.data;
        if (typeof json?.body === "string" && json.body.length)
          return json.body;
        return "";
      }
      return await res.text();
    }

    const csvPath = extractPathFromUrl(csvUrl);
    const basePath = window.location.pathname.replace(/\/+$/, "");
    const proxyRequests = [
      `${basePath}/odp-data?path=${encodeURIComponent(csvUrl)}`,
      `${basePath}/odp-data?path=${encodeURIComponent(csvPath)}`,
      `${basePath}/odp-data?url=${encodeURIComponent(csvUrl)}`,
    ];

    for (const proxyEndpoint of proxyRequests) {
      try {
        const res = await fetch(proxyEndpoint, { method: "POST" });
        if (!res.ok) continue;
        const body = await parseProxyResponse(res);
        if (typeof body === "string" && body.trim().length) {
          return body;
        }
      } catch (_e) {
        // try next proxy request
      }
    }

    throw new Error(
      "CSV konnte nicht geladen werden (CORS/Proxy). Bitte pruefe die Proxy-Konfiguration der App-Instanz.",
    );
  }

  // ── Chart.js dynamisch laden ───────────────────────────────────────
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
  async function loadData() {
    if (!apiurl) {
      enclosingHtmlDivElement.innerHTML =
        '<div class="alert alert-warning m-3">Bitte <code>apiurl</code> in <code>config.json</code> konfigurieren.</div>';
      return;
    }
    setStatus("Lade Daten …");

    let csvText = "";
    try {
      csvText = await fetchCsvText(apiurl);
    } catch (e) {
      setStatus("Fehler beim Laden: " + e.message);
      return;
    }

    if (!csvText) {
      setStatus("Keine Daten empfangen.");
      return;
    }

    // CSV parsen – Semikolon als Trennzeichen probieren, sonst Komma
    const delimiter = csvText.indexOf(";") !== -1 ? ";" : ",";
    const lines = csvText.trim().split("\n");
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim().replace(/^"|"$/g, ""));

    allRows = lines
      .slice(1)
      .map((line) => {
        const vals = line
          .split(delimiter)
          .map((v) => v.trim().replace(/^"|"$/g, ""));
        const obj = {};
        headers.forEach((h, i) => {
          const num = parseFloat(vals[i]);
          obj[h] = isNaN(num) ? vals[i] : num;
        });
        return obj;
      })
      .filter((r) => Object.values(r).some((v) => v !== "" && v !== null));

    visibleColumns = computeVisibleColumns(allRows);
    if (!sortKey && visibleColumns.length) sortKey = visibleColumns[0];

    setStatus(allRows.length + " Datensätze geladen");
    buildMonatFilter();
    applyFilter();
  }

  // ── Monat-Dropdown ─────────────────────────────────────────────────
  function buildMonatFilter() {
    const datumKey = Object.keys(allRows[0] || {}).find(
      (k) =>
        k.toLowerCase().includes("datum") || k.toLowerCase().includes("date"),
    );
    if (!datumKey) return;

    const monate = [
      ...new Set(allRows.map((r) => String(r[datumKey] || "").substring(0, 7))),
    ].sort();
    const sel = document.getElementById("filter-monat");
    if (!sel) return;
    sel.innerHTML = '<option value="">Alle Monate</option>';
    monate.forEach((m) => {
      if (!m || m.length < 7) return;
      const [y, mo] = m.split("-");
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
      const o = document.createElement("option");
      o.value = m;
      o.textContent = `${namen[parseInt(mo, 10) - 1]} ${y}`;
      sel.appendChild(o);
    });
    sel._datumKey = datumKey;
  }

  // ── Filter anwenden ────────────────────────────────────────────────
  function applyFilter() {
    const monatSelect = document.getElementById("filter-monat");
    if (!monatSelect) return;
    const monat = monatSelect.value;
    const datumKey = monatSelect._datumKey || "Datum";
    let working = monat
      ? allRows.filter((r) => String(r[datumKey] || "").startsWith(monat))
      : allRows.slice();

    const searchEl = document.getElementById("tbl-search");
    const term = (searchEl?.value || "").trim().toLowerCase();
    if (term) {
      working = working.filter((row) =>
        Object.values(row).some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(term),
        ),
      );
    }

    filtered = applySort(working);
    const recordCount = document.getElementById("record-count");
    if (recordCount) recordCount.textContent = filtered.length + " Einträge";
    updateKPIs(filtered);
    renderTable(filtered, 0);
    renderChart(filtered);
  }

  // ── KPIs ───────────────────────────────────────────────────────────
  function updateKPIs(rows) {
    document.getElementById("kpi-tage").textContent = rows.length;
    if (!rows.length) {
      ["kpi-avg", "kpi-max", "kpi-regen"].forEach(
        (id) => (document.getElementById(id).textContent = "–"),
      );
      return;
    }
    const keys = Object.keys(rows[0]);
    const metric = detectMetricKeys(keys);
    const avgKey = metric.avgKey;
    const maxKey = metric.maxKey;
    const regenKey = metric.rainKey;

    if (avgKey) {
      const avg =
        rows.reduce((s, r) => s + (parseFloat(r[avgKey]) || 0), 0) /
        rows.length;
      document.getElementById("kpi-avg").textContent = avg.toFixed(1) + " °C";
    } else {
      console.warn("avgKey nicht gefunden. Verfuegbare Spalten:", keys);
      document.getElementById("kpi-avg").textContent = "n/a";
    }

    if (maxKey) {
      const max = Math.max(
        ...rows.map((r) => parseFloat(r[maxKey]) || -Infinity),
      );
      document.getElementById("kpi-max").textContent = max.toFixed(1) + " °C";
    } else {
      document.getElementById("kpi-max").textContent = "n/a";
    }

    if (regenKey) {
      const regen = rows.reduce(
        (s, r) => s + (parseFloat(r[regenKey]) || 0),
        0,
      );
      document.getElementById("kpi-regen").textContent =
        regen.toFixed(1) + " mm";
    } else {
      document.getElementById("kpi-regen").textContent = "n/a";
    }
  }

  // ── Tabelle ────────────────────────────────────────────────────────
  function renderTable(rows, page) {
    const keys = visibleColumns.length
      ? visibleColumns
      : computeVisibleColumns(rows);
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(page, 0), totalPages - 1);
    const slice = rows.slice(
      currentPage * PAGE_SIZE,
      (currentPage + 1) * PAGE_SIZE,
    );
    const tableBody = document.getElementById("tbl-body");
    if (!tableBody) return;
    tableBody.innerHTML = slice.length
      ? slice
          .map(
            (r) =>
              "<tr>" +
              keys
                .map((k) => {
                  const fullText = String(r[k] ?? "");
                  const shortText = formatCell(fullText);
                  return `<td style="white-space: normal; word-break: break-word;" title="${escapeHtml(fullText)}">${escapeHtml(shortText)}</td>`;
                })
                .join("") +
              "</tr>",
          )
          .join("")
      : `<tr><td colspan="${Math.max(keys.length, 1)}" class="text-center text-muted py-3">Keine Daten</td></tr>`;

    // Tabellenkopf dynamisch (falls CSV-Spalten anders heißen)
    const tableHeadRow = document.querySelector("thead.table-dark tr");
    if (tableHeadRow) {
      tableHeadRow.innerHTML = keys
        .map((k) => {
          const arrow = sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : "";
          return `<th style="white-space: normal; word-break: break-word;"><button class="btn btn-link btn-sm p-0 text-white text-decoration-none" data-sort-key="${escapeHtml(k)}">${escapeHtml(prettifyKey(k))}${arrow}</button></th>`;
        })
        .join("");

      tableHeadRow.querySelectorAll("button[data-sort-key]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-sort-key");
          if (!key) return;
          if (sortKey === key) {
            sortDir = sortDir === "asc" ? "desc" : "asc";
          } else {
            sortKey = key;
            sortDir = "asc";
          }
          applyFilter();
        });
      });
    }

    const total = Math.ceil(rows.length / PAGE_SIZE);
    const pageInfo = document.getElementById("page-info");
    if (pageInfo)
      pageInfo.textContent = `Seite ${currentPage + 1} von ${Math.max(1, total)}`;
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    if (btnPrev) btnPrev.disabled = currentPage === 0;
    if (btnNext)
      btnNext.disabled = (currentPage + 1) * PAGE_SIZE >= rows.length;
  }

  // ── Chart ──────────────────────────────────────────────────────────
  function renderChart(rows) {
    loadChartJs(() => {
      if (chartInst) {
        chartInst.destroy();
        chartInst = null;
      }
      if (!rows.length) return;

      const keys = Object.keys(rows[0]);
      const metric = detectMetricKeys(keys);
      const datumKey = metric.dateKey;
      const avgKey = metric.avgKey;
      const maxKey = metric.maxKey;
      const minKey = metric.minKey;

      const labels = rows.map((r) => String(r[datumKey] || ""));
      const datasets = [];

      if (maxKey)
        datasets.push({
          label: "Max (°C)",
          data: rows.map((r) => parseFloat(r[maxKey]) || null),
          borderColor: "#e74c3c",
          backgroundColor: "rgba(231,76,60,0.08)",
          tension: 0.3,
          fill: false,
          pointRadius: 0,
          borderWidth: 1.5,
        });
      if (avgKey)
        datasets.push({
          label: "Ø (°C)",
          data: rows.map((r) => parseFloat(r[avgKey]) || null),
          borderColor: "#f39c12",
          backgroundColor: "rgba(243,156,18,0.1)",
          tension: 0.3,
          fill: false,
          pointRadius: 0,
          borderWidth: 2,
        });
      if (minKey)
        datasets.push({
          label: "Min (°C)",
          data: rows.map((r) => parseFloat(r[minKey]) || null),
          borderColor: "#3498db",
          backgroundColor: "rgba(52,152,219,0.08)",
          tension: 0.3,
          fill: false,
          pointRadius: 0,
          borderWidth: 1.5,
        });

      if (!datasets.length) return;

      chartInst = new Chart(document.getElementById("temp-chart"), {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "top" } },
          scales: {
            x: { ticks: { maxTicksLimit: 10, maxRotation: 45 } },
            y: { title: { display: true, text: "°C" } },
          },
        },
      });
    });
  }

  // ── Events ─────────────────────────────────────────────────────────
  const filterMonatEl = document.getElementById("filter-monat");
  if (filterMonatEl) {
    filterMonatEl.addEventListener("change", applyFilter);
  }
  const btnResetEl = document.getElementById("btn-reset");
  if (btnResetEl) {
    btnResetEl.addEventListener("click", () => {
      const monthEl = document.getElementById("filter-monat");
      if (monthEl) monthEl.value = "";
      applyFilter();
    });
  }
  const btnPrevEl = document.getElementById("btn-prev");
  if (btnPrevEl) {
    btnPrevEl.addEventListener("click", () =>
      renderTable(filtered, currentPage - 1),
    );
  }
  const btnNextEl = document.getElementById("btn-next");
  if (btnNextEl) {
    btnNextEl.addEventListener("click", () =>
      renderTable(filtered, currentPage + 1),
    );
  }
  const tableSearchEl = document.getElementById("tbl-search");
  if (tableSearchEl) {
    tableSearchEl.addEventListener("input", () => {
      applyFilter();
    });
  }

  // ── Start ──────────────────────────────────────────────────────────
  loadData();
  return null;
}

function addToHead() {}
