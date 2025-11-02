const express = require("express");
const bodyParser = require("body-parser");
const compression = require("compression");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// === Helper ===
function savePlayer(growId, password, serverName) {
  const dir = path.join(__dirname, "database", "players");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${growId}.json`);
  const data = {
    growId,
    password,
    server_name: serverName,
    created_at: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// === ROUTES ===
app.get("/", (req, res) => {
  res.render(path.join(__dirname, "public", "html", "dashboard.ejs"));
});

// LOGIN
app.post("/player/growid/login/validate", (req, res) => {
  const { _token, growId, password } = req.body;
  if (!_token || !growId || !password)
    return res.status(400).json({ status: "error", message: "Missing data." });

  const filePath = path.join(__dirname, "database", "players", `${growId}.json`);
  if (!fs.existsSync(filePath))
    return res
      .status(404)
      .json({ status: "error", message: "Account not found. Please register." });

  const user = JSON.parse(fs.readFileSync(filePath));
  if (user.password !== password)
    return res.status(403).json({ status: "error", message: "Wrong password." });

  const tokenData = {
    server_name: _token,
    growId,
    password,
    isRegister: false,
  };

  const token = Buffer.from(JSON.stringify(tokenData)).toString("base64");
  res.json({
    status: "success",
    message: "Login successful.",
    token,
  });
});

// REGISTER
app.post("/player/growid/register", (req, res) => {
  const { _token, growId, password } = req.body;
  if (!_token || !growId || !password)
    return res.status(400).json({ status: "error", message: "Missing data." });

  const filePath = path.join(__dirname, "database", "players", `${growId}.json`);
  if (fs.existsSync(filePath))
    return res
      .status(400)
      .json({ status: "error", message: "GrowID already exists!" });

  savePlayer(growId, password, _token);

  const tokenData = {
    server_name: _token,
    growId,
    password,
    isRegister: true,
  };

  const token = Buffer.from(JSON.stringify(tokenData)).toString("base64");
  res.json({
    status: "success",
    message: "Registered successfully.",
    token,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
