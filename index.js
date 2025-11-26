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
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000, headers: true }));

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

// Endpoint untuk login/register - HANYA GENERATE TOKEN
app.all('/player/growid/login/validate', (req, res) => {
    try {
        const { _token, growId, password, action } = req.body;
        const serverName = _token ? _token.toUpperCase() : "SERVER";
        
        let tokenData = {};
        
        if (action && action.toLowerCase() === 'register') {
            // Mode Register - kirim data lengkap
            tokenData = { 
                server_name: serverName, 
                growId: growId || "", 
                password: password || "",
                isRegister: true
            };
        } else if (growId && password) {
            // Mode Login - kirim data lengkap
            tokenData = { 
                server_name: serverName, 
                growId: growId, 
                password: password,
                isRegister: false
            };
        } else {
            // Guest login - kosongkan data
            tokenData = { 
                server_name: serverName, 
                growId: "", 
                password: "",
                isRegister: false
            };
        }
        
        const token = JSON.stringify(tokenData);
        const tokens = Buffer.from(token).toString('base64');
        
        console.log(`Token generated for: ${growId || 'Guest'}, Action: ${action}, Server: ${serverName}`);
        
        res.json({
            status: "success",
            message: "Token generated successfully.",
            token: tokens,
            url: "",
            accountType: "growtopia", 
            accountAge: 2
        });
        
    } catch (error) {
        console.log('Token generation error:', error);
        res.json({
            status: "error",
            message: "Token generation failed."
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

app.get('/', function (req, res) {
    res.send('Server Running');
});

app.listen(5000, function () {
    console.log('Backend listening on port 5000 - Token Generator Only');
});
