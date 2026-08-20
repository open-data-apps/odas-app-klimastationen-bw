# Changelog


## 1.25.0 - 2026-08-20
- FIX: Drei-Datenzustände-Kontrakt umgesetzt — fehlende `apiurl` zeigt `alert-info` statt einen Hinweistext ohne Alert-Klasse; 0 Zeilen zeigen „Keine Datensätze in der Datenquelle gefunden." (F-69). Die zugrundeliegende Ursache (Direktmodus dauerhaft datenlos wegen fehlender CORS-Header, F-76) bleibt bewusst zurückgestellt bis zum ODAS-Proxy-Update.

## 1.24.0 - 2026-08-18
- `proxyAktiv`-Schalter entfernt (`app-package.json`, `odas-config/config.json`): Der ODAS-Proxy wird umgebaut und funktioniert nach der aktuellen Host-Regel nicht mit `web1.karlsruhe.de`; das Feld wird bis zum Abschluss des Umbaus bewusst nicht angeboten. Die App läuft ausschließlich im Direktmodus; der bisherige Datenschutz-Hinweis auf den Proxy war dadurch sachlich falsch und wurde auf die Direktabruf-Formulierung umgestellt.

## 1.23.0 - 2026-08-17
- `apiurl.hilfe` verwendete das Wort „Datensatz" für das Feld, das explizit NICHT die Datensatzseite sein soll (plus Tippfehler „Ressoucen"); jetzt mit expliziter Abgrenzung zu `urlDaten` formuliert (F-68)

## 1.22.0 - 2026-08-17
- `fetchOdasJson()` wirft jetzt bei nicht-JSON-Antworten (CSV, HTML, leerer Body) eine sprechende Konfigurationsfehlermeldung statt der rohen `JSON.parse`-Parserfehlermeldung (F-66)
- `urlDaten` zeigte auf einen nicht mehr existierenden Host (`offenedaten.esslingen.de`/`open-data-esslingen.de`, NXDOMAIN) bzw. auf den Platzhalter `.../testdaten` (HTTP 404) — jetzt auf die reale Datensatz-Landingpage der tatsächlich konfigurierten `apiurl`-Quelle verweisend, live per HTTP-Abruf verifiziert (F-67)

## 1.21.0 - 2026-08-17
- **CHG:** `instanz-config`-`category`-Vokabular auf Deutsch umgestellt (`allgemein`, `beschreibung`, `datenherkunft`, `kontakt-rechtliches`, `sonstiges`); die entfallenen Kategorien `metrics` und `advanced` wurden auf `beschreibung` bzw. `sonstiges` verteilt

## 1.20.0 - 2026-08-13
- FIX: Lifecycle-Ressourcen beim Seitenwechsel abgeräumt (F-57): `onPageLeave` räumt alle vier Chart-Instanzen per `.destroy()` ab (Cleanup-Registry je App-Container, robust gegen scheiternde Cleanups, wird nach dem Durchlauf geleert); verspätete Fetch-/PapaParse-/Chart.js-Fortsetzungen erzeugen nach dem Seitenwechsel keine Charts mehr und überschreiben weder Status noch DOM

## 1.19.0 - 2026-08-12
- FIX: `app/index.html` auf den Template-Stand (F-47): Datei byte-gleich aus `oda-generic` übernommen — gültiges HTML, deutsche ARIA-Labels, Footer im Body; Titel und Fußzeile bleiben Platzhalter und werden zur Laufzeit aus der Instanz-Config überschrieben

## 1.18.0 - 2026-08-11
- FIX: CSV-Parsing auf PapaParse 5.4.1 umgestellt (F-40): `parseCsv` nutzt jetzt `Papa.parse` mit `header: true`, `skipEmptyLines: "greedy"` und Delimiter-Auto-Detect; gequotete Felder mit Zeilenumbruch werden RFC-4180-konform geparst; die Zahlen-Guard-Logik (nur vollständig numerische Werte werden zu Zahlen, Datumsspalten bleiben Text) bleibt unverändert; PapaParse-Fehler werden sichtbar in der Statuszeile gemeldet

## 1.17.0 - 2026-08-08
- CHG: Bootstrap-Ziele instanzeindeutig (F-32): Tab-Ziele (`#tab-temp` … `#tab-klima`) auf Portfolio-Stil umgestellt (`#klima-tab-<tab>-<klimaUid>`) und KPI-Kontext- sowie Methodik-Ziele (`#klima-kpi-kontext-<n>`, `#klima-methodik-body`) um eine Instanzkennung ergänzt — mehrere Instanzen derselben App auf einer Seite klappen ihre Panels und wechseln ihre Tabs unabhängig; die CSS-Klassen `klima-kpi-info-toggle`/`klima-methodik-toggle` bleiben unverändert

## 1.16.0 - 2026-08-07
- FIX: Datumsspalte wird nicht mehr als Zahl gekonvertiert (Bestandsfehler im CSV-Parser, beim Browsernachweis Tranche 3 gefunden): `parseFloat("2026-02-13 00:00:00")` ergab 2026, dadurch zeigte die Tabelle nur das Jahr und der Monatsfilter blieb leer. Nur vollständig numerische Werte werden zu Zahlen; der Monatsfilter ist wieder befüllt und filtert.

## 1.15.0 - 2026-08-06
- CHG: DOM-Zugriffe auf den App-Container gescopt (F-25, Tranche 3): alle Elemente der App werden über den App-Container (root.querySelector) angesprochen statt über document; unpräfixierte IDs mit `klima-`-Präfix versehen (`status-text` → `klima-status-text`, `filter-monat` → `klima-filter-monat`, `record-count` → `klima-record-count`, `kpi-tage` → `klima-kpi-tage`, `kpi-temp-avg` → `klima-kpi-temp-avg`, `kpi-temp-max` → `klima-kpi-temp-max`, `kpi-regen` → `klima-kpi-regen`, `kpi-wind-max` → `klima-kpi-wind-max`, `kpi-druck` → `klima-kpi-druck`, `kpi-feuchte` → `klima-kpi-feuchte`, `kpi-sonne` → `klima-kpi-sonne`, `tbl-head` → `klima-tbl-head`, `tbl-body` → `klima-tbl-body`, `page-info` → `klima-page-info`, `btn-prev` → `klima-btn-prev`, `btn-next` → `klima-btn-next`, `btn-reset` → `klima-btn-reset`, `chart-temp` → `klima-chart-temp`, `chart-wind` → `klima-chart-wind`, `chart-regen` → `klima-chart-regen`, `chart-klima` → `klima-chart-klima`); die Helper `set()` und `mkChart()` präfixieren ihre IDs an jeweils einer Stelle; der Tab-Wechsel-Selektor wird über den App-Container gescopt

## 1.14.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.13.0 - 2026-08-06
- FIX: Base auf Template oda-generic 1.6.0 vereinheitlicht (Hook renderPageOverride)

## 1.12.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.11.0 - 2026-08-04
- FIX: Bootstrap, Chart.js vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.10.0 - 2026-08-04
- FIX: Chart.js-Version vereinheitlicht auf 4.4.9 (vorher uneinheitlich gepinnt oder ganz ungepinnt, laedt bei jedem Aufruf die neueste Version) — Voraussetzung fuer das geplante Vendoring (F-07 Teil 2)

## 1.9.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)

## 1.8.0 - 2026-07-31
- DOC: Standalone-Anleitung individualisiert (F-10) - `proxyAktiv` ist auf `nein` zu
  **setzen** statt zu belassen; Austausch der Datenquelle als eigener Schritt ergaenzt
- DOC: Standalone als eingeschraenkt gekennzeichnet - mit der mitgelieferten Quelle ist
  die App in keiner Standalone-Konfiguration funktionsfaehig

## 1.7.0 - 2026-07-31
- CHG: Platzhalter-Titel in der lokalen Konfiguration durch den echten App-Titel ersetzt

## 1.6.0 - 2026-07-31
- FIX: Quelldaten und string-Config-Werte werden vor der HTML-Ausgabe maskiert (F-08)
- CHG: toter Konfigurationsschlüssel lizenz entfernt (F-17)
- CHG: brandingCSS und brandingCSSFile als Base-Abhängigkeiten deklariert und lokal gespiegelt (F-17)
- CHG: format.typ von "String" auf v1-sicheres "string" korrigiert (F-18)
- CHG: dropdown-Default auf Feldebene verschoben statt in format (F-18)
- CHG: daten.schema auf assets/schema.json gesetzt (F-20)

## 1.5.0 - 2026-07-30

- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; `handleRouting()` wird `await`et und besitzt einen Fehlerpfad. Bisher blieb die Seite bei einem Fehler im Seitenaufbau stumm leer
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschliessenden Schraegstrich nicht mehr das letzte Verzeichnis ab; die Konfiguration wird auch unter `.../app` gefunden
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu (`setupSamePageLinks()`) - das Logo fuehrt damit aus Unteransichten zurueck zur Startseite
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0; app-spezifisches Aufraeumen laeuft ueber den neuen Hook `onPageLeave(page)` in `app/app.js`
- **FIX:** Der Pfad zur Branding-CSS wird jetzt relativ zum App-Verzeichnis aufgeloest (`../assets/branding.css`); bisher wurde die Datei beim lokalen Test unterhalb von `app/` gesucht und deshalb nicht gefunden

## 1.4.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)
- **FIX:** Startseiten-Renderer wird nun `await`et; bei asynchronen Apps erscheint kein kurzzeitiges `[object Promise]` in `#main-content`

## 1.3.0 - 2026-07-23

- **ENH:** Datenabruf auf den Schalter `proxyAktiv` umgestellt; direkte Abrufe sind der Standard, der ODAS-Proxy wird nur noch bei `ja` verwendet
- **ENH:** Einfachen Standalone-Betrieb hinter Traefik mit derselben `odas-config/config.json` wie in der Entwicklung ergänzt
- **ENH:** Traefik-Anbindung auf das externe Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` festgelegt
- **FIX:** Proxy-Basispfad funktioniert jetzt auch bei URLs mit `index.html`; der Ziel-Pfad wird URL-kodiert
- **FIX:** Raten-Schleife über Proxy-Kandidaten durch den eindeutigen Schalter ersetzt
- **DOC:** `proxyAktiv` bleibt auf `ja` voreingestellt, weil web1.karlsruhe.de keinen CORS-Header sendet; Standalone-Betrieb erfordert eine CORS-freigegebene Datenquelle
- **DOC:** Start über `STANDALONE=true make up` dokumentiert

## 1.2.1 — 2026-06-30

- FIX: Beschreibungsseite („Über diese App") rendert wieder vollständig. Ein nicht geschlossenes `<a href="…"`-Tag in der `beschreibung` hatte im ODAS-Live-System alle nachfolgenden Abschnitte verschluckt. Beschreibung mit validem HTML, vollständigen Abschnitten (Für wen / Inhalte / Datenquelle / Open Data App Store) und dreistufiger Datenquelle-Linkliste neu aufgesetzt; nicht aufgelöste `{{…}}`-Platzhalter entfernt. Lokale `config.json` synchronisiert.

## 1.2.0 — 2026-06-16

- ENH: Methodikbox (ausklappbar) mit Datenquelle-Hinweis und Datenstand ergänzt (`datenquelleHinweis`, `datenStand`).
- ENH: KPI-Erklärungstexte unter den Kennzahlen ergänzt (`kpiKontext1`–`kpiKontext8`).

## 1.1.0 — 2026-06-16

- ENH: Schale-4-Verständlichkeit ergänzt – „Für wen ist diese App?"-Block in Beschreibung und README.
- ENH: Konfigurierbarer Abschnitt „Weitere Informationen" mit weiterführenden Links (neues Feld `weiterfuehrendeLinks`, leer = ausgeblendet).
- ENH: Automatisches Datenfrische-Label „Letzte Messung" aus dem jüngsten Messdatum der geladenen Daten.
