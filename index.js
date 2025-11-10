const express = require("express");
const compression = require("compression");
const app = express();

// Middleware
app.use(compression({ level: 6 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("trust proxy", 1);
app.set("view engine", "ejs");

// Header & log
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// ============ ROUTES ============

// Tutup halaman validasi
app.all("/player/validate/close", (req, res) => {
  res.send("<script>window.close();</script>");
});

// Dashboard (dummy form handler)
app.all("/player/login/dashboard", (req, res) => {
  const tData = {};
  try {
    const uData = JSON.stringify(req.body).split('"')[1].split("\\n");
    const uName = uData[0].split("|");
    const uPass = uData[1].split("|");
    for (let i = 0; i < uData.length - 1; i++) {
      const d = uData[i].split("|");
      tData[d[0]] = d[1];
    }
    if (uName[1] && uPass[1]) {
      return res.redirect("/player/growid/login/validate");
    }
  } catch (err) {
    console.log("Warning:", err);
  }
  res.render(__dirname + "/public/html/dashboard.ejs", { data: tData });
});

// Validasi GrowID (generate token)
app.all("/player/growid/login/validate", (req, res) => {
  try {
    const { _token, growId, password, action } = req.body;

    // Normalisasi nama server
    const serverName = _token ? _token.toUpperCase() : "SURVIVAL";

    // Buat objek token JSON
    const payload = {
      server_name: serverName,
      growId: action?.toLowerCase() === "login" ? growId : "",
      password: action?.toLowerCase() === "login" ? password : ""
    };

    // Encode ke base64
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");

    console.log("[Token generated]", payload);

    // Kirim response ke client
    res.json({
      status: "success",
      message: "Account validated.",
      token: encoded,
      url: "",
      accountType: "growtopia",
      accountAge: 2
    });
  } catch (err) {
    console.error("Error generating token:", err);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

// Check Token (ping ulang)
app.all("/player/growid/checktoken", (req, res) => {
  const { refreshToken } = req.body;
  res.json({
    status: "success",
    message: "Account Validated.",
    token: refreshToken || "",
    url: "",
    accountType: "growtopia",
    accountAge: 2
  });
});

// Root test
app.get("/", (req, res) => {
  res.send("Backend running successfully ✅");
});

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
