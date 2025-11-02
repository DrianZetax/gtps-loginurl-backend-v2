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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000, headers: true }));
app.use(express.static('public'));

// === Logging sederhana ===
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

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
        items: [18, 32, 6336],
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
}

// === ROUTES ===

// === DASHBOARD (LOGIN + REGISTER dalam satu halaman) ===
app.get(['/player/login/dashboard', '/', '/player/growid/login'], (req, res) => {
    res.render(__dirname + '/public/html/dashboard.ejs');
});

// === VALIDASI LOGIN ===
app.post('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action } = req.body;

    if (action && action.toLowerCase() === 'register') {
        return res.redirect('/player/growid/register');
    }

    const filePath = path.join(__dirname, 'database', 'players', `${growId}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: "error", message: "GrowID not found." });
    }

    const playerData = JSON.parse(fs.readFileSync(filePath));
    if (playerData.password !== password) {
        return res.status(403).json({ status: "error", message: "Incorrect password." });
    }

    const token = Buffer.from(JSON.stringify({
        server_name: _token?.toUpperCase() || "",
        growId,
        password
    })).toString('base64');

    res.json({
        status: "success",
        message: "Login successful.",
        token,
        redirect: "/player/login/dashboard"
    });
});

// === REGISTER ===
app.post('/player/growid/register', (req, res) => {
    const { _token, growId, password } = req.body;
    if (!_token || !growId || !password)
        return res.status(400).json({ status: "error", message: "All fields required." });

    const filePath = path.join(__dirname, 'database', 'players', `${growId}.json`);
    if (fs.existsSync(filePath))
        return res.status(400).json({ status: "error", message: "GrowID already exists!" });

    savePlayer(growId, password, _token);

    const token = Buffer.from(JSON.stringify({
        server_name: _token?.toUpperCase() || "",
        growId,
        password
    })).toString('base64');

    res.json({
        status: "success",
        message: "Registration successful.",
        token,
        redirect: "/player/login/dashboard"
    });
});

// === SERVER RUN ===
app.listen(5000, () => console.log("🚀 GrowID backend running at http://localhost:5000"));
