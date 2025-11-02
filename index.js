const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs');
const path = require('path');

// === Middleware dasar ===
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

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000, headers: true }));

// === Fungsi bantu ===
function savePlayer(growId, password, serverName) {
    const dir = path.join(__dirname, 'database', 'players');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${growId}.json`);

    const data = {
        growId,
        password,
        server_name: serverName,
        created_at: new Date().toISOString(),
        gems: 100,
        items: [18, 32, 6336], // starter items (Fist, Wrench, SpaceBook)
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
}

// === ROUTES ===

// Tutup jendela validasi
app.all("/player/validate/close", (req, res) => {
    res.send("<script>window.close();</script>");
});

// Dashboard dummy
app.all('/player/login/dashboard', (req, res) => {
    const tData = {};
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n');
        const uName = uData[0].split('|');
        const uPass = uData[1].split('|');
        for (let i = 0; i < uData.length - 1; i++) {
            const d = uData[i].split('|');
            tData[d[0]] = d[1];
        }
        if (uName[1] && uPass[1]) {
            res.redirect('/player/growid/login/validate');
        }
    } catch (why) {
        console.log(`Warning: ${why}`);
    }
    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
});

// === LOGIN VALIDATION ===
app.all('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action } = req.body;

    if (action && action.toLowerCase() === 'register') {
        return res.redirect('/player/growid/register');
    }

    const filePath = path.join(__dirname, 'database', 'players', `${growId}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send({ status: "error", message: "Account not found. Please register first." });
    }

    const token = JSON.stringify({
        server_name: _token?.toUpperCase() || "",
        growId: growId || "",
        password: password || ""
    });

    const tokens = Buffer.from(token).toString('base64');
    res.send({
        status: "success",
        message: "Account validated.",
        token: tokens,
        url: "",
        accountType: "growtopia",
        accountAge: 2
    });
});

// === REGISTER PAGE ===
app.get('/player/growid/register', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Register GrowID</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" />
      </head>
      <body class="d-flex align-items-center justify-content-center" style="height:100vh;background:#f5f5f5;">
        <div class="p-4 bg-white shadow rounded" style="max-width:400px;width:100%;">
          <h4 class="text-center mb-3">Register Your GrowID</h4>
          <form method="POST" action="/player/growid/register/submit">
            <div class="form-group">
              <input type="text" name="_token" class="form-control" placeholder="Server Name *" required />
            </div>
            <div class="form-group">
              <input type="text" name="growId" class="form-control" placeholder="Choose GrowID *" required />
            </div>
            <div class="form-group">
              <input type="password" name="password" class="form-control" placeholder="Choose Password *" required />
            </div>
            <button type="submit" class="btn btn-success btn-block">Register</button>
            <a href="/" class="btn btn-secondary btn-block">Back to Login</a>
          </form>
        </div>
      </body>
      </html>
    `);
});

// === REGISTER SUBMIT ===
app.post('/player/growid/register/submit', (req, res) => {
    const { _token, growId, password } = req.body;

    if (!_token || !growId || !password) {
        return res.status(400).send({ status: "error", message: "All fields are required." });
    }

    const playerFile = path.join(__dirname, 'database', 'players', `${growId}.json`);
    if (fs.existsSync(playerFile)) {
        return res.status(400).send({ status: "error", message: "GrowID already exists!" });
    }

    // Simpan akun baru
    savePlayer(growId, password, _token);

    // Buat token base64 untuk dikirim ke C++
    const token = Buffer.from(JSON.stringify({
        server_name: _token.toUpperCase(),
        growId,
        password
    })).toString('base64');

    res.send({
        status: "success",
        message: "Registration successful.",
        token,
        url: "/player/growid/login/validate",
        accountType: "growtopia"
    });
});

// === CHECK TOKEN ===
app.all('/player/growid/checktoken', (req, res) => {
    const { refreshToken } = req.body;
    res.json({
        status: 'success',
        message: 'Account Validated.',
        token: refreshToken,
        url: '',
        accountType: 'growtopia',
        accountAge: 2
    });
});

// === ROOT ===
app.get('/', (req, res) => {
    res.send('GrowID Handler Active ✅');
});

// === LISTEN ===
app.listen(5000, () => {
    console.log('Listening on port 5000');
});
