# ODAS App Klimastationen BW

Klimastationen BW App für den Open Data App-Store (ODAS).

Die App visualisiert Klimamessdaten aus Baden-Wuerttemberg und zeigt sie als KPIs, Diagramm und Tabelle.

Die App ist eine "ODAS App V1".

## Systemvoraussetzungen

- Docker/Docker Compose
- Make

Die Entwicklung wurde getestet unter Windows und Ubuntu

## Funktionen

Die App ist eine Single-Page-Application Webapp mit:

- Logo Anzeige
- Menü
- Seiten für Impressum, Datenschutz, Beschreibung, Kontakt, Hauptinhalt
- Inhaltsbereich
- Fußzeile
- KPI-Kacheln fuer Messtage, Temperatur und Regen
- Linienchart fuer den Temperaturverlauf
- Filter nach Monat und paginierte Datentabelle

Die Konfiguration wird vom ODAS geladen.

Die Klimadaten werden ueber die konfigurierte apiurl geladen.

## Entwicklung

    $ make build up

Die App wird dadurch gestartet und steht auf Port 8090 zur Verfuegung:

http://localhost:8090

Beim lokalen Start wird die Konfiguration lokal geladen.

Was bei der App-Entwicklung beachtet werden sollte, steht in der [ODA Spezifikation](https://open-data-apps.github.io/open-data-app-docs/)

Nicht vergessen: Bevor die App in den ODAS eingereicht wird muss die `app-package.json` noch angepasst werden.

### Aufbau der App

Der Inhaltsbereich wird in app/app.js erstellt. Dort kann eigener Code implementiert werden.

#### Desktop Version

![Alt-Text](/assets/Desktop_Screenshot.png)

#### Mobile Version

![Alt-Text](/assets/Mobile_Screenshot.png)

## Autor

(C) 2026, Ondics GmbH
