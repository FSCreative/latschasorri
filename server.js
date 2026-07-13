const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update('latschasorri:' + ADMIN_PASSWORD).digest('hex');

/* ---------- Datenhaltung (JSON-Datei im Volume) ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.copyFileSync(path.join(__dirname, 'seed.json'), DATA_FILE);
}
let db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

/* Migration & fehlende Schlüssel aus dem Seed ergänzen */
const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));
if (!db.alben && Array.isArray(db.galerie) && db.galerie.length) {
  db.alben = [{ id: 'a-start', titel: 'Impressionen', beschreibung: '', fotos: db.galerie }];
  delete db.galerie;
}
for (const k of Object.keys(seedData)) {
  if (db[k] === undefined) db[k] = seedData[k];
}
for (const k of Object.keys(seedData.settings)) {
  if (db.settings[k] === undefined) db.settings[k] = seedData.settings[k];
}
/* Einmalig: alten Standard-Begrüßungstext entfernen */
if ((db.texts.homeBody || '').startsWith('Die Faschingssaison 25/26')) {
  db.texts.homeBody = '';
}
save();
const uid = () => crypto.randomBytes(5).toString('hex');

/* ---------- Uploads ---------- */
const UPLOAD_DIR = path.join(DATA_DIR, 'media', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, Date.now() + '-' + uid() + ext);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /image\/(jpeg|png|gif|webp)/.test(file.mimetype))
});

/* ---------- Auth (signiertes Cookie) ---------- */
function sign(val) {
  return val + '.' + crypto.createHmac('sha256', SECRET).update(val).digest('hex');
}
function verify(signed) {
  if (!signed) return false;
  const i = signed.lastIndexOf('.');
  if (i < 0) return false;
  const val = signed.slice(0, i);
  try {
    if (crypto.timingSafeEqual(Buffer.from(sign(val)), Buffer.from(signed))) {
      return parseInt(val.split(':')[1], 10) > Date.now();
    }
  } catch (e) {}
  return false;
}
function getCookie(req, name) {
  const m = ('; ' + (req.headers.cookie || '')).match('; ' + name + '=([^;]+)');
  return m ? decodeURIComponent(m[1]) : null;
}
function isAdmin(req) { return verify(getCookie(req, 'lsadmin')); }
function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.redirect('/admin/login');
}

/* ---------- Middleware ---------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
app.use('/media', express.static(path.join(DATA_DIR, 'media'), { maxAge: '7d' }));
const BOOT = Date.now().toString(36); // Cache-Busting pro Deployment
app.use((req, res, next) => {
  res.locals.s = db.settings;
  res.locals.admin = isAdmin(req);
  res.locals.path = req.path;
  res.locals.v = BOOT;
  next();
});

/* ---------- Hilfsfunktionen ---------- */
const MONATE = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const TAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function fmtDatum(iso) {
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return { tag: '', nr: '', monat: '', lang: iso };
  return {
    tag: TAGE[d.getDay()], nr: String(d.getDate()).padStart(2, '0'),
    monat: MONATE[d.getMonth()],
    lang: TAGE[d.getDay()] + ', ' + d.getDate() + '. ' + MONATE[d.getMonth()] + ' ' + d.getFullYear()
  };
}
function nextTermin() {
  const today = new Date().toISOString().slice(0, 10);
  return [...db.termine].sort((a, b) => a.datum.localeCompare(b.datum)).find(t => t.datum >= today);
}

/* ---------- Instagram Graph API ---------- */
let igCache = { t: 0, posts: [] };
function igToken() {
  return (db.settings.instagramToken || '').trim() || process.env.INSTAGRAM_TOKEN || '';
}
async function getInstaPosts() {
  const token = igToken();
  if (!token) return null;
  if (Date.now() - igCache.t < 30 * 60 * 1000) return igCache.posts;
  try {
    const url = 'https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=9&access_token=' + encodeURIComponent(token);
    const r = await fetch(url);
    const j = await r.json();
    if (j.error) {
      console.warn('Instagram Graph API: ' + j.error.message);
      return igCache.posts.length ? igCache.posts : null;
    }
    igCache = {
      t: Date.now(),
      posts: (j.data || []).map(p => ({
        img: p.media_type === 'VIDEO' ? (p.thumbnail_url || '') : p.media_url,
        link: p.permalink,
        caption: (p.caption || '').split('\n')[0].slice(0, 90),
        video: p.media_type === 'VIDEO'
      })).filter(p => p.img)
    };
    refreshIgToken();
    return igCache.posts;
  } catch (e) {
    console.warn('Instagram Graph API: ' + e.message);
    return igCache.posts.length ? igCache.posts : null;
  }
}
/* Long-lived Token (60 Tage) automatisch verlängern – max. 1x pro Woche */
async function refreshIgToken() {
  const token = (db.settings.instagramToken || '').trim();
  if (!token) return; // nur Tokens aus dem Admin können gespeichert werden
  const last = db.settings.igRefreshedAt || 0;
  if (Date.now() - last < 7 * 24 * 60 * 60 * 1000) return;
  try {
    const r = await fetch('https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=' + encodeURIComponent(token));
    const j = await r.json();
    if (j.access_token) {
      db.settings.instagramToken = j.access_token;
      db.settings.igRefreshedAt = Date.now();
      save();
      console.log('Instagram-Token verlängert.');
    }
  } catch (e) { /* beim nächsten Mal erneut versuchen */ }
}

/* ================== ÖFFENTLICHE SEITEN ================== */
app.get('/', async (req, res) => {
  const berichte = [...db.berichte].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 3);
  const instaPosts = await getInstaPosts();
  const fotos = db.alben.flatMap(a => a.fotos).slice(-6).reverse();
  res.render('home', { title: 'Home', texts: db.texts, next: nextTermin(), fmtDatum, berichte, galerie: fotos, instaPosts });
});

app.get('/termine', (req, res) => {
  const termine = [...db.termine].sort((a, b) => a.datum.localeCompare(b.datum));
  const today = new Date().toISOString().slice(0, 10);
  res.render('termine', { title: 'Termine', texts: db.texts, termine, fmtDatum, today });
});

app.get('/mitglieder', (req, res) => {
  res.render('mitglieder', {
    title: 'Mitglieder',
    aktive: db.mitglieder.filter(m => m.kategorie === 'aktiv'),
    ehren: db.mitglieder.filter(m => m.kategorie === 'ehren'),
    vorstand: db.vorstand, vorstandBild: db.vorstandBild
  });
});

app.get('/instrumente', (req, res) => {
  res.render('instrumente', { title: 'Instrumente', instrumente: db.instrumente });
});

app.get('/lieder', (req, res) => {
  res.render('lieder', { title: 'Unsere Lieder', lieder: db.lieder });
});

app.get('/galerie', (req, res) => {
  res.render('galerie', { title: 'Galerie', alben: [...db.alben].reverse() });
});

app.get('/galerie/:id', (req, res) => {
  const album = db.alben.find(a => a.id === req.params.id);
  if (!album) return res.status(404).render('404', { title: 'Nicht gefunden' });
  res.render('album', { title: album.titel, album });
});

app.get('/berichte', (req, res) => {
  const berichte = [...db.berichte].sort((a, b) => b.datum.localeCompare(a.datum));
  res.render('berichte', { title: 'Berichte', berichte, fmtDatum });
});

app.get('/berichte/:slug', (req, res) => {
  const b = db.berichte.find(x => x.slug === req.params.slug || x.id === req.params.slug);
  if (!b) return res.status(404).render('404', { title: 'Nicht gefunden' });
  res.render('bericht', { title: b.titel, b, fmtDatum });
});

app.get('/chronik', (req, res) => {
  res.render('chronik', { title: 'Chronik', chronik: db.chronik });
});

app.get('/goenner', (req, res) => {
  res.render('goenner', { title: 'Unsere Gönner', texts: db.texts });
});

/* ================== ADMIN ================== */
app.get('/admin/login', (req, res) => {
  if (isAdmin(req)) return res.redirect('/admin');
  res.render('admin-login', { title: 'Admin Login', error: null });
});

app.post('/admin/login', (req, res) => {
  const pw = req.body.password || '';
  if (ADMIN_PASSWORD && pw === ADMIN_PASSWORD) {
    const token = sign('admin:' + (Date.now() + 1000 * 60 * 60 * 12));
    res.setHeader('Set-Cookie', 'lsadmin=' + encodeURIComponent(token) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200');
    return res.redirect('/admin');
  }
  res.status(401).render('admin-login', { title: 'Admin Login', error: ADMIN_PASSWORD ? 'Falsches Passwort.' : 'Kein ADMIN_PASSWORD gesetzt (Railway-Variable).' });
});

app.post('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'lsadmin=; Path=/; Max-Age=0');
  res.redirect('/');
});

app.get('/admin', requireAdmin, (req, res) => {
  res.render('admin', {
    title: 'Admin', db,
    berichte: [...db.berichte].sort((a, b) => b.datum.localeCompare(a.datum)),
    termine: [...db.termine].sort((a, b) => a.datum.localeCompare(b.datum)),
    saved: req.query.saved
  });
});

/* --- Texte --- */
app.post('/admin/texte', requireAdmin, (req, res) => {
  for (const k of Object.keys(db.texts)) {
    if (typeof req.body[k] === 'string') db.texts[k] = req.body[k].trim();
  }
  if (typeof req.body.motto === 'string') db.settings.motto = req.body.motto.trim();
  if (typeof req.body.email === 'string') db.settings.email = req.body.email.trim();
  if (typeof req.body.instagramHandle === 'string') db.settings.instagramHandle = req.body.instagramHandle.trim().replace(/^@/, '');
  if (typeof req.body.instagramToken === 'string' && req.body.instagramToken.trim() !== db.settings.instagramToken) {
    db.settings.instagramToken = req.body.instagramToken.trim();
    db.settings.igRefreshedAt = Date.now();
    igCache = { t: 0, posts: [] };
  }
  if (typeof req.body.instagramEmbed === 'string') db.settings.instagramEmbed = req.body.instagramEmbed.trim();
  save();
  res.redirect('/admin?saved=texte#texte');
});

/* --- Termine --- */
app.post('/admin/termine', requireAdmin, (req, res) => {
  db.termine.push({ id: uid(), datum: req.body.datum, zeit: req.body.zeit, titel: req.body.titel, ort: req.body.ort });
  save();
  res.redirect('/admin?saved=termin#termine');
});
app.post('/admin/termine/:id/delete', requireAdmin, (req, res) => {
  db.termine = db.termine.filter(t => t.id !== req.params.id);
  save();
  res.redirect('/admin#termine');
});

/* --- Berichte (Blog) --- */
app.post('/admin/berichte', requireAdmin, upload.single('bild'), (req, res) => {
  const slug = (req.body.titel || 'bericht').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || uid();
  const id = req.body.id;
  const existing = id && db.berichte.find(b => b.id === id);
  const bild = req.file ? '/media/uploads/' + req.file.filename : (existing ? existing.bild : '');
  if (existing) {
    Object.assign(existing, { titel: req.body.titel, datum: req.body.datum, body: req.body.body, bild });
  } else {
    db.berichte.push({ id: uid(), slug, titel: req.body.titel, datum: req.body.datum || new Date().toISOString().slice(0, 10), bild, body: req.body.body });
  }
  save();
  res.redirect('/admin?saved=bericht#berichte');
});
app.post('/admin/berichte/:id/delete', requireAdmin, (req, res) => {
  db.berichte = db.berichte.filter(b => b.id !== req.params.id);
  save();
  res.redirect('/admin#berichte');
});

/* --- Galerie: Alben --- */
app.post('/admin/alben', requireAdmin, (req, res) => {
  const existing = req.body.id && db.alben.find(a => a.id === req.body.id);
  if (existing) {
    existing.titel = req.body.titel;
    existing.beschreibung = req.body.beschreibung || '';
  } else {
    db.alben.push({ id: uid(), titel: req.body.titel, beschreibung: req.body.beschreibung || '', fotos: [] });
  }
  save();
  res.redirect('/admin?saved=album#galerie');
});
app.post('/admin/alben/:id/delete', requireAdmin, (req, res) => {
  db.alben = db.alben.filter(a => a.id !== req.params.id);
  save();
  res.redirect('/admin#galerie');
});
app.post('/admin/alben/:id/fotos', requireAdmin, upload.array('bilder', 30), (req, res) => {
  const album = db.alben.find(a => a.id === req.params.id);
  if (album) {
    (req.files || []).forEach(f => {
      album.fotos.push({ id: uid(), bild: '/media/uploads/' + f.filename, titel: req.body.titel || '' });
    });
    save();
  }
  res.redirect('/admin?saved=fotos#galerie');
});
app.post('/admin/alben/:id/fotos/:fid/delete', requireAdmin, (req, res) => {
  const album = db.alben.find(a => a.id === req.params.id);
  if (album) {
    album.fotos = album.fotos.filter(f => f.id !== req.params.fid);
    save();
  }
  res.redirect('/admin#galerie');
});

/* --- Chronik --- */
app.post('/admin/chronik', requireAdmin, (req, res) => {
  const existing = req.body.id && db.chronik.find(c => c.id === req.body.id);
  const data = { jahr: req.body.jahr, titel: req.body.titel, text: req.body.text };
  if (existing) Object.assign(existing, data);
  else db.chronik.push(Object.assign({ id: uid() }, data));
  save();
  res.redirect('/admin?saved=chronik#chronik');
});
app.post('/admin/chronik/:id/delete', requireAdmin, (req, res) => {
  db.chronik = db.chronik.filter(c => c.id !== req.params.id);
  save();
  res.redirect('/admin#chronik');
});

/* --- Mitglieder --- */
app.post('/admin/mitglieder', requireAdmin, upload.single('bild'), (req, res) => {
  const id = req.body.id;
  const existing = id && db.mitglieder.find(m => m.id === id);
  const bild = req.file ? '/media/uploads/' + req.file.filename : (existing ? existing.bild : '');
  const data = { name: req.body.name, rufname: req.body.rufname, seit: req.body.seit, instrument: req.body.instrument, kategorie: req.body.kategorie === 'ehren' ? 'ehren' : 'aktiv', bild };
  if (existing) Object.assign(existing, data);
  else db.mitglieder.push(Object.assign({ id: uid() }, data));
  save();
  res.redirect('/admin?saved=mitglied#mitglieder');
});
app.post('/admin/mitglieder/:id/delete', requireAdmin, (req, res) => {
  db.mitglieder = db.mitglieder.filter(m => m.id !== req.params.id);
  save();
  res.redirect('/admin#mitglieder');
});

app.use((req, res) => res.status(404).render('404', { title: 'Nicht gefunden' }));

app.listen(PORT, () => console.log('Latschasorri läuft auf Port ' + PORT));
