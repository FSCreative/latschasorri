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

## Instagram-Feed (Graph API)

Der native Feed auf der Startseite nutzt die Instagram Graph API ("Instagram API with Instagram Login"). Einrichtung (einmalig):

1. Instagram-Konto auf **Professionell** (Business/Creator) umstellen
2. Auf [developers.facebook.com](https://developers.facebook.com) eine App erstellen → Produkt **Instagram** hinzufügen ("API setup with Instagram login")
3. Instagram-Konto verbinden und einen **Long-lived Access Token** generieren
4. Token im Admin-Bereich unter *Texte → Instagram Access Token* einfügen (oder Railway-Variable `INSTAGRAM_TOKEN`)

Der Token wird automatisch wöchentlich verlängert (60-Tage-Token). Ohne Token zeigt die Seite das Instagram-Profil-Embed als Fallback.

## Lokal starten

```bash
npm install
ADMIN_PASSWORD=test npm start
# http://localhost:3000
```
