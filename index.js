const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const path = require('path');

app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/html'));

app.set('trust proxy', 1);

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000, headers: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.all("/player/validate/close", function (req, res) {
  res.send("<script>window.close();</script>");
});

app.all('/player/login/dashboard', function (req, res) {
    const tData = {};
    try {
        // Handle form data dari login
        if (req.body.growId || req.body.password) {
            tData['growId'] = req.body.growId || '';
            tData['password'] = req.body.password || '';
        }
    } catch (why) { 
        console.log(`Warning: ${why}`); 
    }

    res.render('dashboard', {data: tData});
});

// 🆕 ENDPOINT REGISTRASI - FIXED
app.all('/player/growid/register/validate', (req, res) => {
    try {
        console.log('📝 REGISTRATION REQUEST:', req.body);
        
        const { _token, growId, password, email, gender } = req.body;
        
        // Validasi input
        if (!_token) {
            return res.status(400).json({
                status: "error",
                message: "Server name is required!"
            });
        }

        if (!growId || !password) {
            return res.status(400).json({
                status: "error",
                message: "GrowID and Password are required!"
            });
        }

        // Validasi panjang GrowID
        if (growId.length < 3 || growId.length > 18) {
            return res.status(400).json({
                status: "error", 
                message: "GrowID must be between 3 and 18 characters!"
            });
        }

        if (password.length < 4 || password.length > 18) {
            return res.status(400).json({
                status: "error",
                message: "Password must be between 4 and 18 characters!"
            });
        }

        if (!/^[a-zA-Z0-9]+$/.test(growId)) {
            return res.status(400).json({
                status: "error",
                message: "GrowID can only contain letters and numbers!"
            });
        }

        // 🎯 BUAT TOKEN UNTUK REGISTRASI
        const tokenData = {
            server_name: _token.toUpperCase(),
            growId: growId,
            password: password,
            email: email || "",
            gender: gender || "man",
            isRegister: true  // 🚀 INI YANG PENTING
        };

        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        
        console.log('✅ REGISTRATION SUCCESS:', growId);
        console.log('🔑 TOKEN:', token);
        console.log('📋 TOKEN DATA:', tokenData);
        
        // Kirim response
        res.json({
            status: "success",
            message: "Registration successful!",
            token: token,
            url: "gtpsid://play", // 🚀 URL untuk redirect
            accountType: "growtopia",
            accountAge: 0
        });

    } catch (error) {
        console.error('❌ REGISTRATION ERROR:', error);
        res.status(500).json({
            status: "error",
            message: "Registration failed due to server error."
        });
    }
});

// 🆕 ENDPOINT LOGIN - FIXED
app.all('/player/growid/login/validate', (req, res) => {
    try {
        console.log('🟢 LOGIN REQUEST:', req.body);
        
        const { _token, growId, password } = req.body;
        
        if (!_token) {
            return res.status(400).json({
                status: "error",
                message: "Server name is required!"
            });
        }

        let tokenData;
        if (growId && password) {
            // Login dengan GrowID
            tokenData = { 
                server_name: _token.toUpperCase(), 
                growId: growId, 
                password: password,
                isRegister: false
            };
            console.log('🔐 GROWID LOGIN:', growId);
        } else {
            // Guest login
            tokenData = { 
                server_name: _token.toUpperCase(), 
                growId: "", 
                password: "",
                isRegister: false 
            };
            console.log('👤 GUEST LOGIN');
        }

        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        
        console.log('✅ LOGIN SUCCESS');
        console.log('🔑 TOKEN:', token);
        console.log('📋 TOKEN DATA:', tokenData);
        
        res.json({
            status: "success",
            message: "Login successful!",
            token: token,
            url: "gtpsid://play", // 🚀 URL untuk redirect
            accountType: "growtopia", 
            accountAge: 2
        });

    } catch (error) {
        console.error('❌ LOGIN ERROR:', error);
        res.status(500).json({
            status: "error",
            message: "Login failed."
        });
    }
});

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

// Home page
app.get('/', function (req, res) {
   res.render('dashboard', {data: {}});
});

app.listen(5000, function () {
    console.log('🚀 Server listening on port 5000');
    console.log('📍 Home: http://localhost:5000');
    console.log('🔐 Login API: http://localhost:5000/player/growid/login/validate');
    console.log('📝 Register API: http://localhost:5000/player/growid/register/validate');
});
