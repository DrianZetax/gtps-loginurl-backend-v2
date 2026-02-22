const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const compression = require('compression');
const fs = require('fs');
const path = require('path');

app.use(compression({ level: 5, threshold: 0 }));

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Helper function
function checkAccountExists(growId) {
    const filePath = path.join(__dirname, 'database', 'players', `${growId}_.json`);
    return fs.existsSync(filePath);
}

// ENDPOINT UTAMA UNTUK LOGIN/REGISTER
app.all('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action } = req.body;
    
    console.log('=== GROWTOPIA VALIDATE REQUEST ===');
    console.log('Raw body:', req.body);
    console.log('Token:', _token);
    console.log('GrowID:', growId);
    console.log('Action:', action);
    console.log('===================================');

    let tokenData = {};
    
    // Determine if register or login
    const isRegister = (action && (action.toLowerCase() === 'register' || action.toLowerCase() === 'create_account'));
    
    if (isRegister) {
        console.log('MODE: REGISTER');
        tokenData = {
            server_name: _token ? _token.toUpperCase() : "GTZS",
            growId: growId,
            password: password,
            isRegister: true,
            email: "abc@gmail.com",
            gender: "man"
        };
    } else if (growId && password) {
        console.log('MODE: LOGIN');
        tokenData = {
            server_name: _token ? _token.toUpperCase() : "GTZS",
            growId: growId,
            password: password,
            isRegister: false
        };
    } else {
        console.log('MODE: GUEST');
        tokenData = {
            server_name: _token ? _token.toUpperCase() : "GTZS",
            growId: "",
            password: "",
            isRegister: false
        };
    }
    
    // Create token
    const token = JSON.stringify(tokenData);
    const tokens = Buffer.from(token).toString('base64');
    
    console.log('Token data:', tokenData);
    console.log('Base64 token:', tokens);
    
    // FORMAT RESPON YANG DIHARAPKAN GROWTOPIA CLIENT
    const response = {
        status: "success",
        message: "Account Validated.",
        token: tokens,
        url: "",
        accountType: "growtopia",
        accountAge: 2
    };
    
    console.log('Sending response:', response);
    res.json(response);
});

// Endpoint untuk checktoken
app.all('/player/growid/checktoken', (req, res) => {
    const { refreshToken } = req.body;
    console.log('Checktoken request:', refreshToken);
    
    res.json({
        status: "success",
        message: "Account Validated.",
        token: refreshToken,
        url: "",
        accountType: "growtopia",
        accountAge: 2
    });
});

// Endpoint untuk close
app.all("/player/validate/close", function (req, res) {
    res.send("<script>window.close();</script>");
});

app.get('/', function (req, res) {
    res.send('Growtopia Auth Server Running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', function () {
    console.log(`Auth server running on port ${PORT}`);
    console.log(`Make sure your growtopia client connects to this server`);
});
