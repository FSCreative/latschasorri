/**
 * Spiegelt die Bilder der alten Website (latschasorri.com) als lokale Kopien
 * in das persistente Datenverzeichnis. Läuft bei jedem Start, lädt aber nur
 * Dateien, die noch nicht vorhanden sind.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const MIRROR_DIR = path.join(DATA_DIR, 'media', 'mirror');

const BASE = 'http://www.latschasorri.com';

// Quelle -> lokaler Dateiname
const IMAGES = {
  '/images/Latschasorri/Mitglieder/2024_Mannschaft_Wien.jpg': 'mannschaft-wien-2024.jpg',
  '/images/Latschasorri/Aktuelles/2026_Auftritte.jpg': 'auftritte-2026.jpg',
  '/images/Latschasorri/Mitglieder/Ausschuss2023.jpg': 'vorstand-2023.jpg',
  '/templates/version3_57/images/object795019310.png': 'logo.png',
  '/images/Latschasorri/Menuebilder/IMG_6132.JPG': 'trompeten.jpg',
  '/images/Latschasorri/Menuebilder/Posauna.jpg': 'posaunen.jpg',
  '/images/Latschasorri/Menuebilder/IMG_6127.JPG': 'schlagwerk.jpg',
  '/images/Latschasorri/Mitglieder/Aurelia.jpg': 'aurelia.jpg',
  '/images/Latschasorri/Mitglieder/Madlen1.jpg': 'madlen.jpg',
  '/images/Latschasorri/Mitglieder/Daniela_B.jpg': 'daniela.jpg',
  '/images/Latschasorri/Mitglieder/BarbaraBitschnau.jpg': 'barbara-b.jpg',
  '/images/Latschasorri/Mitglieder/Magdalena1.jpg': 'magdalena.jpg',
  '/images/Latschasorri/Mitglieder/Baebi1.jpg': 'baebi.jpg',
  '/images/Latschasorri/Mitglieder/Heinz.jpg': 'heinz.jpg',
  '/images/Latschasorri/Mitglieder/Bettina1.jpg': 'bettina.jpg',
  '/images/Latschasorri/Mitglieder/Simon1.jpg': 'simon.jpg',
  '/images/Latschasorri/Mitglieder/Kili.jpg': 'kili.jpg',
  '/images/IMG-20200215-WA0023.jpg': 'marika.jpg',
  '/images/Latschasorri/Mitglieder/Elias1.jpg': 'elias.jpg',
  '/images/Latschasorri/Mitglieder/Marlies1.jpg': 'marlies.jpg',
  '/images/Latschasorri/Mitglieder/Michael.jpg': 'michael.jpg',
  '/images/Latschasorri/Mitglieder/Nadine1.jpg': 'nadine.jpg',
  '/images/Latschasorri/Mitglieder/DanielSchu.jpg': 'daniel.jpg',
  '/images/Latschasorri/Mitglieder/Sabi1.jpg': 'sabi.jpg',
  '/images/Latschasorri/Mitglieder/Larissa1.jpg': 'larissa.jpg',
  '/images/Latschasorri/Mitglieder/Roman2.jpg': 'roman.jpg',
  '/images/Latschasorri/Mitglieder/Monika.jpg': 'monika.jpg',
  '/images/Latschasorri/Mitglieder/Konstanz.JPG': 'konstanz.jpg',
  '/images/Latschasorri/Mitglieder/Manuelak.jpg': 'manuela.jpg',
  '/images/Latschasorri/Mitglieder/Sonja.jpg': 'sonja.jpg',
  '/images/Latschasorri/Mitglieder/Marlenem.jpg': 'marlene.jpg'
};

function download(url, dest) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode !== 200) {
        console.warn('  Übersprungen (' + res.statusCode + '): ' + url);
        res.resume();
        return resolve(false);
      }
      const file = fs.createWriteStream(dest + '.tmp');
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          fs.renameSync(dest + '.tmp', dest);
          resolve(true);
        });
      });
    });
    req.on('error', (e) => {
      console.warn('  Fehler: ' + url + ' – ' + e.message);
      resolve(false);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

(async () => {
  fs.mkdirSync(MIRROR_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, 'media', 'uploads'), { recursive: true });
  let ok = 0, skip = 0;
  for (const [src, name] of Object.entries(IMAGES)) {
    const dest = path.join(MIRROR_DIR, name);
    if (fs.existsSync(dest)) { skip++; continue; }
    console.log('Lade ' + src);
    if (await download(BASE + src, dest)) ok++;
  }
  console.log('Bilder-Spiegelung fertig: ' + ok + ' neu, ' + skip + ' vorhanden.');
})();
