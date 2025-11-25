const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');

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
app.set('trust proxy', 1);

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000, headers: true }));

// Tambahkan endpoint untuk registrasi
app.all('/player/growid/register/validate', (req, res) => {
    try {
        const { _token, growId, password, email, gender } = req.body;
        console.log('Registration attempt:', { growId, email, gender });
        
        // Validasi input
        if (!growId || !password || !email || !gender) {
            return res.status(400).json({
                status: "error",
                message: "All fields are required for registration!"
            });
        }

        // Validasi panjang GrowID
        if (growId.length < 3 || growId.length > 18) {
            return res.status(400).json({
                status: "error", 
                message: "GrowID must be between 3 and 18 characters!"
            });
        }

        // Validasi panjang password
        if (password.length < 4 || password.length > 18) {
            return res.status(400).json({
                status: "error",
                message: "Password must be between 4 and 18 characters!"
            });
        }

        // Validasi karakter GrowID
        if (!/^[a-zA-Z0-9]+$/.test(growId)) {
            return res.status(400).json({
                status: "error",
                message: "GrowID can only contain letters and numbers!"
            });
        }

        // Buat token untuk registrasi
        const tokenData = {
            server_name: _token.toUpperCase(),
            growId: growId,
            password: password,
            email: email,
            gender: gender,
            isRegister: true
        };

        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        
        res.json({
            status: "success",
            message: "Registration data validated.",
            token: token,
            url: "",
            accountType: "growtopia",
            accountAge: 0
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            status: "error",
            message: "Registration failed due to server error."
        });
    }
});

app.all('/player/growid/login/validate', (req, res) => {
    try {
        const { _token, growId, password, action } = req.body;
        
        let tokenData;
        if (action && action.toLowerCase() === 'login' && growId && password) {
            tokenData = { 
                server_name: _token.toUpperCase(), 
                growId: growId, 
                password: password,
                isRegister: false 
            };
        } else {
            tokenData = { 
                server_name: _token.toUpperCase(), 
                growId: "", 
                password: "",
                isRegister: false 
            };
        }

        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        
        res.json({
            status: "success",
            message: "Account Validated.",
            token: token,
            url: "",
            accountType: "growtopia", 
            accountAge: 2
        });

    } catch (error) {
        console.error('Login validation error:', error);
        res.status(500).json({
            status: "error",
            message: "Login validation failed."
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

app.all("/player/validate/close", function (req, res) {
    res.send("<script>window.close();</script>");
});

app.get('/', function (req, res) {
    res.send('Server is running');
});

app.listen(5000, function () {
    console.log('Server listening on port 5000');
});
