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
app.use(rateLimiter({ windowMs: 5 * 60 * 1000, max: 800, headers: true }));

// ==================== HELPER FUNCTIONS ====================
function validateTokenFormat(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        return decoded.includes('growId=') && (decoded.includes('password=') || decoded.includes('passwords='));
    } catch {
        return false;
    }
}

// ==================== ENDPOINTS ====================
app.all('/favicon.ico', function(req, res) {
    res.status(204).end();
});

app.all('/player/register', function(req, res) {
    res.send("Coming soon...");
});

app.all('/player/login/dashboard', function (req, res) {
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
        console.log(`Warning: ${why}`);
    }

    res.render(__dirname + '/public/html/dashboard.ejs', {data: tData});
});

// 🔴 ENDPOINT VALIDASI LOGIN/REGISTER
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token || '';
    const growId = req.body.growId || '';
    const password = req.body.password || '';
    const action = req.body.action || 'login';

    console.log(`[LOGIN/VALIDATE] ${action} - ${growId}`);

    // Format token sesuai standar dengan parameter reg
    const regFlag = (action.toLowerCase() === 'register') ? '1' : '0';
    const tokenString = `_token=${_token}&growId=${growId}&password=${password}&reg=${regFlag}`;
    const token = Buffer.from(tokenString).toString('base64');
   
    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia","accountAge":2}`
    );
});

// 🔴 ENDPOINT CHECKTOKEN - REDIRECT 307 (PENTING!)
app.all('/player/growid/checktoken', (req, res) => {
    console.log('[CHECKTOKEN] Redirecting to validate endpoint (307)');
    // 307 Temporary Redirect mempertahankan POST method dan body
    res.redirect(307, '/player/growid/validate/checktoken');
});

// 🔴 ENDPOINT VALIDATE CHECKTOKEN - RESPON TEXT/HTML
app.all('/player/growid/validate/checktoken', (req, res) => {
    const { refreshToken } = req.body;
    
    console.log('[VALIDATE CHECKTOKEN] Processing token validation');
    
    try {
        if (!refreshToken) {
            console.log('[VALIDATE CHECKTOKEN] No token provided');
            return res.render(__dirname + '/public/html/dashboard.ejs');
        }

        // Decode token untuk validasi
        const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
        console.log('[VALIDATE CHECKTOKEN] Decoded:', decoded);
        
        // Validasi format token
        if (!decoded.includes('growId=') || (!decoded.includes('password=') && !decoded.includes('passwords='))) {
            console.log('[VALIDATE CHECKTOKEN] Invalid token format');
            return res.render(__dirname + '/public/html/dashboard.ejs');
        }

        // Response dengan Content-Type text/html (wajib untuk 5.40)
        const response = JSON.stringify({
            status: 'success',
            message: 'Account Validated.',
            token: refreshToken,
            url: '',
            accountType: 'growtopia',
            accountAge: 2
        });
        
        res.setHeader('Content-Type', 'text/html');
        res.send(response);
        
    } catch (error) {
        console.log('[VALIDATE CHECKTOKEN] Error:', error.message);
        res.render(__dirname + '/public/html/dashboard.ejs');
    }
});

app.get('/', function (req, res) {
    res.send('Growtopia Backend Server - Updated for 5.40');
});

app.listen(5000, function () {
    console.log('=' .repeat(50));
    console.log('🚀 SERVER RUNNING ON PORT 5000');
    console.log('=' .repeat(50));
    console.log('✅ Updated for Growtopia 5.40:');
    console.log('   • /player/growid/checktoken → 307 redirect');
    console.log('   • /player/growid/validate/checktoken → text/html response');
    console.log('   • Token format includes reg parameter');
    console.log('=' .repeat(50));
});
