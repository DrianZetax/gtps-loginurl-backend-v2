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

// Daftar server yang tersedia
const availableServers = [
    "GTZS", "STYLOPS", "CHINAPS", "COASTPS", "SLOWLYPS", "NEXPS", "TESPS", "IDLEPS"
];

app.all("/player/validate/close", function (req, res) {
    res.send("<script>window.close();</script>");
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
        }
    } catch (why) {
        console.log(`Warning: ${why}`);
    }

    // Kirim juga daftar server ke template
    const encodedData = Buffer.from(JSON.stringify(tData)).toString('base64');
    res.render(__dirname + '/public/html/dashboard.ejs', { 
        data: encodedData,
        servers: availableServers 
    });
});

app.all('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action, server_name } = req.body;
    
    console.log(`Login/Validate Request:`, { 
        action: action || 'login', 
        growId: growId || 'guest',
        server: server_name || 'not specified'
    });

    let tokenData = {};
    
    // Validasi server name
    const selectedServer = server_name ? server_name.toUpperCase() : 'GTZS';
    
    if (!availableServers.includes(selectedServer)) {
        return res.json({
            status: 'error',
            message: 'Invalid server name! Available servers: ' + availableServers.join(', '),
            token: '',
            url: '',
            accountType: 'growtopia',
            accountAge: 2
        });
    }
    
    if (action && action.toLowerCase() === 'register') {
        if (!growId || !password) {
            return res.json({
                status: 'error',
                message: 'GrowID and password required for register',
                token: '',
                url: '',
                accountType: 'growtopia',
                accountAge: 2
            });
        }
        
        if (checkAccountExists(growId)) {
            return res.json({
                status: 'error',
                message: 'Account already exists',
                token: '',
                url: '',
                accountType: 'growtopia',
                accountAge: 2
            });
        }
        
        tokenData = { 
            server_name: selectedServer,
            growId: growId, 
            password: password,
            isRegister: true 
        };
    } 
    else if (growId && password) {
        tokenData = { 
            server_name: selectedServer,
            growId: growId, 
            password: password,
            isRegister: false 
        };
    } 
    else {
        tokenData = { 
            server_name: selectedServer,
            growId: "", 
            password: "",
            isRegister: false 
        };
    }
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    
    console.log(`Generated token for server ${selectedServer}: ${token}`);
    res.json({
        status: 'success',
        message: 'Account Validated.',
        token: token,
        url: '',
        accountType: 'growtopia',
        accountAge: 2
    });
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
    res.send('Server Running - Growtopia Backend with Nameserver');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
    console.log('Available servers:', availableServers.join(', '));
    console.log('Backend ready for Login/Register with nameserver support');
});
