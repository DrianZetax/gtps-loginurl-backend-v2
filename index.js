const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// Konfigurasi
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Middleware
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

app.set('trust proxy', 1);

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`);
    
    // CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Rate limiting
app.use(rateLimiter({ 
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 10000, 
    headers: true,
    message: 'Too many requests, please try again later.'
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ==================== ROUTES ====================

// Route utama - menampilkan halaman login
app.get('/', (req, res) => {
    // Jika ada token, redirect ke checktoken
    if (req.query.token) {
        console.log('Redirecting to checktoken with token:', req.query.token.substring(0, 20) + '...');
        return res.redirect(`/player/growid/checktoken?token=${req.query.token}`);
    }
    
    // Tampilkan halaman HTML
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    
    // Cek apakah file exists
    if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
    } else {
        console.error('HTML file not found at:', htmlPath);
        res.status(404).send('Login page not found. Please check server configuration.');
    }
});

// Endpoint login/register - dipanggil oleh form HTML
app.post('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action } = req.body;
    
    console.log('=== LOGIN/VALIDATE REQUEST ===');
    console.log('Action:', action || 'LOGIN');
    console.log('GrowID:', growId || 'GUEST');
    console.log('Server:', _token);
    console.log('Password:', password ? '[PROVIDED]' : '[EMPTY]');
    
    // Validasi input untuk register
    if (action && action.toLowerCase() === 'register') {
        if (!growId || growId.length < 3 || growId.length > 18) {
            return res.json({
                status: 'error',
                message: 'GrowID must be between 3 and 18 characters'
            });
        }
        
        if (!password || password.length < 4 || password.length > 18) {
            return res.json({
                status: 'error',
                message: 'Password must be between 4 and 18 characters'
            });
        }
    }
    
    // Buat token data sesuai format yang diharapkan C++ handler
    const tokenData = {
        server_name: (_token || 'GTPS').toUpperCase(),
        growId: growId || '',
        password: password || '',
        isRegister: (action && action.toLowerCase() === 'register') ? true : false
    };
    
    // Encode token ke base64
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    
    console.log('Generated token:', token.substring(0, 50) + '...');
    console.log('Token data:', tokenData);
    
    // Response sukses
    res.json({
        status: 'success',
        message: 'Account Validated.',
        token: token,
        url: '', // Kosong karena akan redirect ke root dengan token
        accountType: 'growtopia'
    });
    
    console.log('=== END LOGIN/VALIDATE ===\n');
});

// Endpoint check token - dipanggil setelah redirect dari root
app.get('/player/growid/checktoken', (req, res) => {
    const { token } = req.query;
    
    console.log('=== CHECKTOKEN REQUEST ===');
    console.log('Token:', token ? token.substring(0, 50) + '...' : 'MISSING');
    
    if (!token) {
        console.log('Error: Token missing');
        return res.status(400).json({
            status: 'error',
            message: 'Token required'
        });
    }
    
    try {
        // Decode token untuk verifikasi
        const decoded = Buffer.from(token, 'base64').toString();
        const tokenData = JSON.parse(decoded);
        
        console.log('Decoded token data:', tokenData);
        console.log('Token valid');
        
        // Response yang benar untuk client Growtopia
        res.json({
            status: 'success',
            message: 'Account Validated.',
            token: token,
            url: '',
            accountType: 'growtopia'
        });
        
    } catch (error) {
        console.error('Token decode error:', error.message);
        res.status(400).json({
            status: 'error',
            message: 'Invalid token format'
        });
    }
    
    console.log('=== END CHECKTOKEN ===\n');
});

// Endpoint metadata - diperlukan oleh beberapa client
app.get('/player/metadata/login', (req, res) => {
    console.log('Metadata request received');
    res.json({
        status: 'success',
        message: 'Metadata retrieved',
        data: {
            maintenance: false,
            redirect_url: ''
        }
    });
});

// Endpoint close window
app.get('/player/validate/close', (req, res) => {
    console.log('Close window request received');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Closing...</title>
            <script>
                window.close();
                setTimeout(function() {
                    window.location.href = '/';
                }, 1000);
            </script>
        </head>
        <body>
            <p>Window akan ditutup. Jika tidak tertutup, <a href="/">klik disini</a></p>
        </body>
        </html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Handle 404
app.use((req, res) => {
    console.log('404 Not Found:', req.method, req.url);
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});

// ==================== START SERVER ====================
app.listen(PORT, HOST, () => {
    console.log('\n=== GTPSID LOGIN SERVER ===');
    console.log(`Server running on:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${getLocalIP()}:${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`- GET  /                 - Login page`);
    console.log(`- POST /player/growid/login/validate - Login/Register API`);
    console.log(`- GET  /player/growid/checktoken - Token validation`);
    console.log(`- GET  /health           - Health check`);
    console.log('\nPress Ctrl+C to stop\n');
});

// Helper function untuk mendapatkan IP lokal
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip internal and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}
