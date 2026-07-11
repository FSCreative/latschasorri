# Guggamusik Partener Latschasorri

Neue Website der Guggamusik Latschasorri (Partenen im Montafon) – Neuauflage von www.latschasorri.com.

## Features

- Mobile-first, App-Look mit Fußzeilen-Navbar und "Mehr"-Sheet
- Alle Inhalte der alten Seite: Termine, Mitglieder, Vorstand, Ehrenmitglieder, Instrumente, Lieder, Chronik, Gönner
- Integrierte Foto-Galerie mit Lightbox
- Berichte/Blog-Tool
- Admin-Bereich (`/admin`): Fotos hochladen, Berichte schreiben, Termine, Mitglieder und Texte pflegen
- Bilder der alten Website werden beim ersten Start automatisch als lokale Kopie gespiegelt (`scripts/mirror-images.js`)

## Betrieb (Railway)

- **Start:** `npm start` (spiegelt zuerst Bilder, startet dann den Server)
- **Volume:** unter `/data` mounten und Variable `DATA_DIR=/data` setzen – dort liegen `data.json`, gespiegelte Bilder und Uploads
- **Variablen:**
  - `ADMIN_PASSWORD` – Passwort für den Admin-Bereich (Pflicht)
  - `DATA_DIR` – Datenverzeichnis, z. B. `/data`
  - `SESSION_SECRET` – optional, eigener Cookie-Signaturschlüssel

## Lokal starten

```bash
npm install
ADMIN_PASSWORD=test npm start
# http://localhost:3000
```
