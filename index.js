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

// Helper functions
function checkGrowIDExists(growId) {
    try {
        const databasePath = path.join(__dirname, 'database', 'players');
        const filePath = path.join(databasePath, `${growId}_.json`);
        return fs.existsSync(filePath);
    } catch (error) {
        console.error('Error checking GrowID:', error);
        return false;
    }
}

function createPlayerData(growId, password, serverName) {
    const playerData = {
        growID: growId,
        tankIDName: growId,
        tankIDPass: password,
        requestedName: "Yawa",
        new_version: true,
        growid: true,
        auth_: false,
        gender: "man",
        new_pass: true,
        account_created: Math.floor(Date.now() / (1000 * 60 * 60 * 24)),
        playtime: Math.floor(Date.now() / 1000),
        inv: [
            { id: 18, count: 1 },
            { id: 32, count: 1 },
            { id: 6336, count: 1 }
        ],
        last_server: serverName
    };
    return playerData;
}

function savePlayerData(growId, playerData) {
    try {
        const databasePath = path.join(__dirname, 'database', 'players');
        
        // Create database directory if it doesn't exist
        if (!fs.existsSync(databasePath)) {
            fs.mkdirSync(databasePath, { recursive: true });
        }
        
        const filePath = path.join(databasePath, `${growId}_.json`);
        fs.writeFileSync(filePath, JSON.stringify(playerData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving player data:', error);
        return false;
    }
}

// Routes
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
    
    // Handle Register action
    if (action && action.toLowerCase() === 'register') {
        if (!growId || !password) {
            return res.status(400).json({
                status: "error",
                message: "GrowID and Password are required for registration."
            });
        }

        // Check if GrowID already exists
        if (checkGrowIDExists(growId)) {
            return res.status(400).json({
                status: "error",
                message: "GrowID already exists. Try a different name!"
            });
        }

        // Create player data
        const playerData = createPlayerData(growId, password, _token.toUpperCase());
        
        // Save player data
        if (savePlayerData(growId, playerData)) {
            const token = JSON.stringify({ 
                server_name: _token.toUpperCase(), 
                growId: growId, 
                password: password,
                isRegister: true 
            });
            const tokens = Buffer.from(token).toString('base64');
            
            return res.json({
                status: "success",
                message: "Account successfully registered! Please re-login to start playing.",
                token: tokens,
                url: "",
                accountType: "growtopia",
                accountAge: 2
            });
        } else {
            return res.status(500).json({
                status: "error",
                message: "Failed to create account. Please try again."
            });
        }
    }
    
    // Handle Login action
    const token = (action && action.toLowerCase() === 'login' ? 
        JSON.stringify({ 
            server_name: _token.toUpperCase(), 
            growId: growId, 
            password: password,
            isRegister: false 
        }) : 
        JSON.stringify({ 
            server_name: _token.toUpperCase(), 
            growId: "", 
            password: "",
            isRegister: false 
        })
    );
    
    const tokens = Buffer.from(token).toString('base64');
    res.json({
        status: "success",
        message: "Account Validated.",
        token: tokens,
        url: "",
        accountType: "growtopia", 
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

// New route for direct registration (optional)
app.post('/player/growid/register', (req, res) => {
    const { server_name, growId, password } = req.body;
    
    if (!growId || !password || !server_name) {
        return res.status(400).json({
            status: "error",
            message: "Server name, GrowID and Password are required."
        });
    }

    if (checkGrowIDExists(growId)) {
        return res.status(400).json({
            status: "error",
            message: "GrowID already exists. Try a different name!"
        });
    }

    const playerData = createPlayerData(growId, password, server_name.toUpperCase());
    
    if (savePlayerData(growId, playerData)) {
        res.json({
            status: "success",
            message: "Account successfully registered!",
            data: {
                growId: growId,
                server: server_name.toUpperCase()
            }
        });
    } else {
        res.status(500).json({
            status: "error",
            message: "Failed to create account. Please try again."
        });
    }
});

app.get('/', function (req, res) {
    res.send('Hello World');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
});
