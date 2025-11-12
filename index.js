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

// Endpoint utama untuk login dan register - KIRIM REDIRECT KE GAME
app.all('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action, gender, email } = req.body;
    
    console.log('=== /player/growid/login/validate REQUEST ===');
    console.log('Action:', action);
    console.log('Server:', _token);
    console.log('GrowID:', growId);
    console.log('Password:', password ? '***' + password.slice(-2) : 'empty');
    console.log('Gender:', gender);
    console.log('Email:', email);
    
    const isRegister = action && action.toLowerCase() === 'register';
    const tokenData = {
        server_name: _token ? _token.toUpperCase() : '', 
        growId: growId || '', 
        password: password || '',
        isRegister: isRegister
    };
    
    if (isRegister) {
        tokenData.gender = gender || 'man';
        tokenData.email = email || '';
    }
    
    console.log('Token Data:', tokenData);
    
    const token = JSON.stringify(tokenData);
    const tokens = Buffer.from(token).toString('base64');
    
    console.log('Generated Token:', tokens);
    console.log('=====================');
    
    // KIRIM REDIRECT KE GAME DENGAN TOKEN
    const gameUrl = `gt:${_token.toUpperCase()}`;
    const serverHost = `${_token.toUpperCase()}.gtps.id`; // Ganti dengan host server Anda
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Redirecting to Game</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #1a1208; color: #d7ccc8; }
                .container { max-width: 500px; margin: 50px auto; padding: 20px; background: rgba(60, 40, 30, 0.9); border-radius: 10px; }
                .token-box { background: rgba(30, 20, 10, 0.8); padding: 15px; border-radius: 5px; margin: 15px 0; word-break: break-all; }
                .instructions { text-align: left; margin: 20px 0; }
            </style>
            <script>
                console.log('Token generated:', '${tokens}');
                
                // Try to launch the game
                function launchGame() {
                    window.location.href = '${gameUrl}';
                }
                
                // Copy token to clipboard
                function copyToken() {
                    navigator.clipboard.writeText('${tokens}').then(function() {
                        alert('Token copied to clipboard!');
                    });
                }
                
                // Auto-launch after 2 seconds
                setTimeout(launchGame, 2000);
            </script>
        </head>
        <body>
            <div class="container">
                <h2>🎮 Redirecting to Growtopia...</h2>
                <p>Your account has been validated. Launching game...</p>
                
                <div class="token-box">
                    <strong>Token:</strong><br>
                    <code>${tokens}</code>
                </div>
                
                <button onclick="copyToken()" style="padding: 10px 20px; margin: 10px; background: #d7a461; border: none; border-radius: 5px; cursor: pointer;">
                    Copy Token
                </button>
                
                <button onclick="launchGame()" style="padding: 10px 20px; margin: 10px; background: #4caf50; border: none; border-radius: 5px; cursor: pointer;">
                    Launch Game Now
                </button>
                
                <div class="instructions">
                    <h3>Manual Connection Instructions:</h3>
                    <ol>
                        <li>Open Growtopia</li>
                        <li>Connect to server: <strong>${_token.toUpperCase()}</strong></li>
                        <li>When prompted for token, paste the token above</li>
                        <li>Or use IP: <strong>${serverHost}</strong></li>
                    </ol>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Endpoint khusus register - REDIRECT KE ENDPOINT UTAMA
app.all('/player/growid/register', (req, res) => {
    const { _token, growId, password, gender, email } = req.body;
    
    console.log('=== /player/growid/register - REDIRECTING ===');
    console.log('Server:', _token);
    console.log('GrowID:', growId);
    
    // Render form yang akan submit ke endpoint utama dengan action=register
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Processing Registration</title>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    document.getElementById('redirectForm').submit();
                });
            </script>
        </head>
        <body>
            <p>Processing registration...</p>
            <form id="redirectForm" method="POST" action="/player/growid/login/validate">
                <input type="hidden" name="_token" value="${_token}">
                <input type="hidden" name="growId" value="${growId}">
                <input type="hidden" name="password" value="${password}">
                <input type="hidden" name="gender" value="${gender || 'man'}">
                <input type="hidden" name="email" value="${email || ''}">
                <input type="hidden" name="action" value="register">
            </form>
        </body>
        </html>
    `);
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

app.get('/debug/token', (req, res) => {
    const { data } = req.query;
    if (data) {
        try {
            const decoded = Buffer.from(data, 'base64').toString();
            res.json({
                original: data,
                decoded: decoded,
                parsed: JSON.parse(decoded)
            });
        } catch (e) {
            res.json({ error: e.message });
        }
    } else {
        res.send('Add ?data=base64token to debug');
    }
});

app.get('/', function (req, res) {
   res.send('Server is running. Use /player/growid/login/validate for login/register');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
    console.log('Debug token endpoint: http://localhost:5000/debug/token?data=YOUR_TOKEN');
});
