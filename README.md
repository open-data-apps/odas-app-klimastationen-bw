# ODAS App Klimastationen

Klimastationen App für den Open Data App-Store (ODAS).

Die App visualisiert Klimamessdaten und zeigt sie als KPIs, Diagramm und Tabelle.

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
- KPI-Kacheln für Messtage, Temperatur und Regen
- Linienchart für den Temperaturverlauf
- Filter nach Monat und paginierte Datentabelle

Die Konfiguration wird vom ODAS geladen.

Die Klimadaten werden über die konfigurierte apiurl geladen.

## Für wen ist diese App?

Diese App richtet sich an Bürgerinnen und Bürger in Karlsruhe und der Region, an die Stadtverwaltung sowie an alle, die sich für Wetter und Klima interessieren. Voraussetzung ist kein spezielles Datenwissen – wer die Wetter- und Klimaentwicklung der Region nachvollziehen möchte, kann die App direkt nutzen.

## Entwicklung

    $ make build up

Die App wird dadurch gestartet und steht auf Port 8090 zur Verfügung:

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

## Betriebsarten

Die App kann lokal, eigenstaendig hinter einem Traefik-Reverse-Proxy oder ueber den ODAS
betrieben werden.

**Standalone ist eingeschraenkt** und nur mit einer ausgetauschten, CORS-freigegebenen
Datenquelle moeglich — siehe den Hinweis unter „Standalone-Betrieb".

### Datenabruf: `proxyAktiv`

| Wert   | Bedeutung                                                                   |
| ------ | --------------------------------------------------------------------------- |
| `nein` | Direkter Abruf der Daten-URL. Setzt eine CORS-freigegebene Quelle voraus.    |
| `ja`   | Abruf ueber den ODAS-Proxy `…/odp-data`. Nur im ODAS-Live-System verfuegbar. |

**Diese App ist auf `ja` voreingestellt.** Die konfigurierte Datenquelle
(`web1.karlsruhe.de`) sendet keinen `Access-Control-Allow-Origin`-Header; ein Direktabruf aus
dem Browser wird daher blockiert. Fuer Entwicklung und Standalone-Betrieb muss
eine CORS-freigegebene Datenquelle konfiguriert und `proxyAktiv` auf `nein`
gesetzt werden.

### Standalone-Betrieb

> **Standalone ist bei dieser App eingeschraenkt.** Mit der mitgelieferten Datenquelle
> ist sie in **keiner** Standalone-Konfiguration funktionsfaehig: mit `proxyAktiv: "ja"`
> fehlt der Proxy im Container, mit `"nein"` greift die CORS-Sperre der Quelle. Der
> Standalone-Betrieb setzt deshalb zwingend eine ausgetauschte, CORS-freigegebene
> Datenquelle voraus.

Voraussetzung: ein laufender Traefik mit dem externen Docker-Netzwerk `proxynet`,
dem EntryPoint `websecure` und dem Zertifikatsresolver `letsencrypt`.

1. In `docker-compose.standalone.yml` den Platzhalter `app1.example.com` durch den
   echten FQDN ersetzen.
2. In `odas-config/config.json` `proxyAktiv` auf `nein` **setzen** — ausgeliefert
   wird `ja`. Der ODAS-Proxy `…/odp-data` steht im Standalone-Container nicht zur
   Verfuegung; die mitgelieferte `nginx.conf` kennt keinen entsprechenden
   `location`-Block.
3. Die Datenquelle (`apiurl`) auf eine CORS-freigegebene Ressource umstellen. Die
   mitgelieferte Quelle (`web1.karlsruhe.de`) sendet keinen
   `Access-Control-Allow-Origin`-Header und ist standalone **nicht** nutzbar.
4. Starten:

```bash
STANDALONE=true make up
STANDALONE=true make logs
STANDALONE=true make down
```

Im Standalone-Betrieb entfaellt die lokale Portfreigabe; Traefik terminiert TLS und
leitet auf den internen Nginx-Port 80 weiter. Die Konfiguration wird aus derselben
`odas-config/config.json` gelesen wie in der Entwicklung und von Nginx unter `/config`
ausgeliefert.

### Beim Aufruf kontaktierte Drittanbieter

Beim Aufruf dieser App werden keine externen Server für Programmbibliotheken kontaktiert; alle Bibliotheken werden lokal aus `app/vendor/` ausgeliefert. Extern abgerufen wird ausschließlich die konfigurierte Datenquelle — über den ODAS-Proxy.

### Auslieferung an den ODAS

`make zip` erzeugt das Liefer-ZIP mit `app/`, `assets/`, `app-package.json` und
`CHANGELOG.md`. Die Infrastrukturdateien (`Dockerfile`, `docker-compose*.yml`,
`nginx.conf`, `Makefile`) sind nicht Teil der Auslieferung. Das ZIP ist ein Bauartefakt und wird nicht mitversioniert, sondern bei Bedarf mit `make zip` erzeugt.

## Autor

(C) 2026, Ondics GmbH
