const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const path = require('path');

// ==================== MIDDLEWARE ====================
app.use(compression({
  level: 5,
  threshold: 0,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.set('view engine', 'ejs');
app.set('trust proxy', 1);

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 5 * 60 * 1000, max: 800, headers: true }));

// ==================== HELPER FUNCTIONS ====================

/**
 * Buat token format JSON base64 untuk TokenHandler C++.
 * Format: base64({"growId":"...","password":"...","server_name":"...","isRegister":false})
 */
function createToken(growId, password, serverName, isRegister = false) {
  const tokenObj = {
    growId:      growId     || '',
    password:    password   || '',
    server_name: serverName || '',
    isRegister:  isRegister === true || isRegister === 1,
  };
  return Buffer.from(JSON.stringify(tokenObj)).toString('base64');
}

/**
 * Decode refreshToken dari client.
 * Support JSON base64 (format baru) dan query string base64 (format lama).
 * Returns { growId, password, server_name, isRegister } atau null jika gagal.
 */
function decodeToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;

    // Bersihkan trailing whitespace/newline yang bisa merusak base64
    const cleanToken = token.trim();
    const decoded = Buffer.from(cleanToken, 'base64').toString('utf-8');

    // Format baru: JSON
    try {
      const obj = JSON.parse(decoded);
      if (obj && typeof obj === 'object') {
        return {
          growId:      obj.growId      || '',
          password:    obj.password    || '',
          server_name: obj.server_name || '',
          isRegister:  obj.isRegister === true || obj.isRegister === 1,
        };
      }
    } catch (_) { /* bukan JSON, coba query string */ }

    // Format lama: query string fallback
    const params = {};
    decoded.split('&').forEach(part => {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) return;
      const key = part.substring(0, eqIdx);
      const val = decodeURIComponent(part.substring(eqIdx + 1));
      if (key) params[key] = val;
    });

    if (params.growId !== undefined) {
      return {
        growId:      params.growId                                       || '',
        password:    params.password || params.passwords                 || '',
        server_name: params.server_name                                  || '',
        isRegister:  params.isRegister === 'true' || params.reg === '1',
      };
    }

    return null;
  } catch (e) {
    console.error('[TOKEN DECODE ERROR]', e.message);
    return null;
  }
}

/**
 * Helper: kirim dashboard HTML sebagai response text/html.
 * Growtopia akan menampilkan form login ketika menerima response ini.
 */
function sendDashboard(res) {
  res.setHeader('Content-Type', 'text/html');
  try {
    res.render(path.join(__dirname, 'public/html/dashboard.ejs'), { data: {} });
  } catch (_) {
    // Fallback jika EJS tidak ada — kirim HTML form login
    res.send(`
<!DOCTYPE html>
<html>
<head><title>Login</title></head>
<body>
<form method="POST" action="/player/growid/login/validate">
  <input type="text"     name="growId"      placeholder="GrowID" required />
  <input type="password" name="password"    placeholder="Password" required />
  <input type="text"     name="server_name" placeholder="Server Name" required />
  <input type="hidden"   name="action"      value="login" />
  <button type="submit">Login</button>
</form>
</body>
</html>`);
  }
}

// ==================== ENDPOINTS ====================

app.all('/favicon.ico', (req, res) => res.status(204).end());

app.all('/player/register', (req, res) => res.send('Coming soon...'));

/**
 * Dashboard login — ditampilkan ke user sebagai form login web
 */
app.all('/player/login/dashboard', function(req, res) {
  const tData = {};
  try {
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr !== '{}') {
      const uData = bodyStr.split('"')[1].split('\\n');
      for (let i = 0; i < uData.length - 1; i++) {
        const d = uData[i].split('|');
        if (d.length >= 2) tData[d[0]] = d[1];
      }
      const uName = uData[0]?.split('|');
      const uPass = uData[1]?.split('|');
      if (uName?.[1] && uPass?.[1]) {
        return res.redirect('/player/growid/login/validate');
      }
    }
  } catch (why) {
    console.log(`[DASHBOARD] Warning: ${why}`);
  }
  
  res.setHeader('Content-Type', 'text/html');
  try {
    res.render(path.join(__dirname, 'public/html/dashboard.ejs'), { data: tData });
  } catch (_) {
    sendDashboard(res);
  }
});

/**
 * Endpoint validasi login/register.
 * Form dashboard mengirim: growId, password, server_name, action
 */
app.all('/player/growid/login/validate', (req, res) => {
  const growId     = (req.body.growId      || '').trim();
  const password   = (req.body.password    || '').trim();
  const serverName = (req.body.server_name || '').trim();
  const action     = (req.body.action      || 'login').toLowerCase();

  console.log(`[LOGIN/VALIDATE] action=${action} growId=${growId} server=${serverName}`);

  res.setHeader('Content-Type', 'text/html');

  if (!growId || !password) {
    return res.send(JSON.stringify({
      status: 'error',
      message: 'GrowID and password are required.',
    }));
  }

  if (!serverName) {
    return res.send(JSON.stringify({
      status: 'error',
      message: 'Server name is required.',
    }));
  }

  const isRegister = action === 'register';
  const token = createToken(growId, password, serverName, isRegister);

  console.log(`[LOGIN/VALIDATE] Token OK -> growId=${growId} server=${serverName}`);

  res.send(JSON.stringify({
    status:      'success',
    message:     'Account Validated.',
    token:       token,
    url:         '',
    accountType: 'growtopia',
    accountAge:  2,
  }));
});

/**
 * Endpoint checktoken — 307 redirect mempertahankan HTTP POST body.
 */
app.all('/player/growid/checktoken', (req, res) => {
  console.log('[CHECKTOKEN] 307 -> /player/growid/validate/checktoken');
  res.redirect(307, '/player/growid/validate/checktoken');
});

/**
 * Endpoint validate/checktoken — dipanggil Growtopia saat reconnect/resume.
 */
app.all('/player/growid/validate/checktoken', (req, res) => {
  const { refreshToken } = req.body;

  console.log('[VALIDATE CHECKTOKEN] Request received');

  if (!refreshToken) {
    console.log('[VALIDATE CHECKTOKEN] No refreshToken -> dashboard');
    return sendDashboard(res);
  }

  const td = decodeToken(refreshToken);

  if (!td) {
    console.log('[VALIDATE CHECKTOKEN] Decode failed -> dashboard');
    return sendDashboard(res);
  }

  console.log(`[VALIDATE CHECKTOKEN] Decoded -> growId="${td.growId}" server="${td.server_name}"`);

  // SKENARIO 2: growId / password / server_name kosong -> paksa re-login
  if (!td.growId || !td.password || !td.server_name) {
    console.log('[VALIDATE CHECKTOKEN] Empty fields -> dashboard (force re-login)');
    return sendDashboard(res);
  }

  // SKENARIO 1: Token valid & lengkap -> buatkan token validasi baru
  const newToken = createToken(td.growId, td.password, td.server_name, td.isRegister);

  console.log(`[VALIDATE CHECKTOKEN] OK -> growId=${td.growId} server=${td.server_name}`);

  res.setHeader('Content-Type', 'text/html');
  res.send(JSON.stringify({
    status:      'success',
    message:     'Account Validated.',
    token:       newToken,
    url:         '',
    accountType: 'growtopia',
    accountAge:  2,
  }));
});

app.get('/', (req, res) => res.send('Growtopia Backend Server Running'));

app.listen(5000, function() {
  console.log('='.repeat(55));
  console.log('  SERVER RUNNING ON PORT 5000');
  console.log('='.repeat(55));
  console.log('  POST /player/growid/login/validate');
  console.log('  POST /player/growid/checktoken  (307 redirect)');
  console.log('  POST /player/growid/validate/checktoken');
  console.log('='.repeat(55));
});
