const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs');
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

// Helper function untuk check account
function checkAccountExists(growId) {
    const filePath = path.join(__dirname, 'database', 'players', `${growId}_.json`);
    return fs.existsSync(filePath);
}

app.all("/player/validate/close", function (req, res) {
  res.send("<script>window.close();</script>");
});

app.all('/player/login/dashboard', function (req, res) {
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

    res.render(__dirname + '/public/html/dashboard.ejs', {data: tData});
});

app.all('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action } = req.body;
    
    console.log(`Login/Validate Request:`, { 
        action: action, 
        growId: growId, 
        server: _token 
    });

    let tokenData = {};
    
    if (action && action.toLowerCase() === 'register') {
        // MODE REGISTER
        if (!growId || !password) {
            return res.send(
                `{"status":"error","message":"GrowID and password required for register","token":"","url":"","accountType":"growtopia", "accountAge": 2}`
            );
        }
        
        // Cek jika akun sudah ada
        if (checkAccountExists(growId)) {
            return res.send(
                `{"status":"error","message":"Account already exists","token":"","url":"","accountType":"growtopia", "accountAge": 2}`
            );
        }
        
        // Kirim data register ke C++ handler
        tokenData = { 
            server_name: _token.toUpperCase(), 
            growId: growId, 
            password: password,
            isRegister: true 
        };
        
    } else if (growId && password) {
        // MODE LOGIN
        tokenData = { 
            server_name: _token.toUpperCase(), 
            growId: growId, 
            password: password,
            isRegister: false 
        };
    } else {
        // MODE GUEST
        tokenData = { 
            server_name: _token.toUpperCase(), 
            growId: "", 
            password: "",
            isRegister: false 
        };
    }
    
    const token = JSON.stringify(tokenData);
    const tokens = Buffer.from(token).toString('base64');
    
    console.log(`Generated token: ${tokens}`);
    console.log(`Token data:`, tokenData);

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

app.get('/', function (req, res) {
   res.send('Server Running');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
    console.log('Backend ready for Login/Register');
});
