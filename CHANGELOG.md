# Changelog

## 1.2.1 — 2026-06-30

- FIX: Beschreibungsseite („Über diese App") rendert wieder vollständig. Ein nicht geschlossenes `<a href="…"`-Tag in der `beschreibung` hatte im ODAS-Live-System alle nachfolgenden Abschnitte verschluckt. Beschreibung mit validem HTML, vollständigen Abschnitten (Für wen / Inhalte / Datenquelle / Open Data App Store) und dreistufiger Datenquelle-Linkliste neu aufgesetzt; nicht aufgelöste `{{…}}`-Platzhalter entfernt. Lokale `config.json` synchronisiert.

## 1.2.0 — 2026-06-16

- ENH: Methodikbox (ausklappbar) mit Datenquelle-Hinweis und Datenstand ergänzt (`datenquelleHinweis`, `datenStand`).
- ENH: KPI-Erklärungstexte unter den Kennzahlen ergänzt (`kpiKontext1`–`kpiKontext8`).

## 1.1.0 — 2026-06-16

- ENH: Schale-4-Verständlichkeit ergänzt – „Für wen ist diese App?"-Block in Beschreibung und README.
- ENH: Konfigurierbarer Abschnitt „Weitere Informationen" mit weiterführenden Links (neues Feld `weiterfuehrendeLinks`, leer = ausgeblendet).
- ENH: Automatisches Datenfrische-Label „Letzte Messung" aus dem jüngsten Messdatum der geladenen Daten.
