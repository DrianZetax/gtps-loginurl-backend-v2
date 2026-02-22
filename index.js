const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ==================== ROUTES ====================

// Root route - serve HTML atau handle token
app.get('/', (req, res) => {
    // Jika ada token, redirect ke checktoken
    if (req.query.token) {
        console.log('Redirecting to checktoken with token');
        return res.redirect(`/player/growid/checktoken?token=${req.query.token}`);
    }
    // Tampilkan halaman login
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint login/validate - dipanggil oleh form
app.post('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action } = req.body;
    
    console.log('=== LOGIN/VALIDATE REQUEST ===');
    console.log('Action:', action || 'LOGIN');
    console.log('GrowID:', growId || 'GUEST');
    console.log('Server:', _token);

    // Validasi untuk register
    if (action && action.toLowerCase() === 'register') {
        if (!growId || !password) {
            return res.json({
                status: 'error',
                message: 'GrowID and password required for register'
            });
        }
        
        if (growId.length < 3 || growId.length > 18) {
            return res.json({
                status: 'error',
                message: 'GrowID must be between 3 and 18 characters'
            });
        }
        
        if (password.length < 4 || password.length > 18) {
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
    
    // Response sukses - TANPA accountAge
    res.json({
        status: 'success',
        message: 'Account Validated.',
        token: token,
        url: '',
        accountType: 'growtopia'
    });
});

// Endpoint checktoken untuk GET (dengan query parameter)
app.get('/player/growid/checktoken', (req, res) => {
    const { token } = req.query;
    
    console.log('=== CHECKTOKEN GET REQUEST ===');
    console.log('Token:', token ? token.substring(0, 30) + '...' : 'MISSING');
    
    if (!token) {
        return res.status(400).json({
            status: 'error',
            message: 'Token required'
        });
    }
    
    try {
        // Decode token untuk verifikasi
        const decoded = Buffer.from(token, 'base64').toString();
        const tokenData = JSON.parse(decoded);
        
        console.log('Token verified for:', tokenData.growId || 'GUEST');
        console.log('Is Register:', tokenData.isRegister);
        
        // Response yang benar untuk client Growtopia - TANPA accountAge
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
});

// Endpoint checktoken untuk POST (dengan body)
app.post('/player/growid/checktoken', (req, res) => {
    const { refreshToken } = req.body;
    
    console.log('=== CHECKTOKEN POST REQUEST ===');
    console.log('RefreshToken:', refreshToken ? refreshToken.substring(0, 30) + '...' : 'MISSING');
    
    if (!refreshToken) {
        return res.status(400).json({
            status: 'error',
            message: 'Token required'
        });
    }
    
    try {
        const decoded = Buffer.from(refreshToken, 'base64').toString();
        const tokenData = JSON.parse(decoded);
        
        console.log('Token verified for:', tokenData.growId || 'GUEST');
        
        res.json({
            status: 'success',
            message: 'Account Validated.',
            token: refreshToken,
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
});

// Endpoint dashboard
app.all('/player/login/dashboard', (req, res) => {
    console.log('Dashboard request received');
    
    let tData = {};
    try {
        // Parse data dari request body
        const bodyStr = JSON.stringify(req.body);
        if (bodyStr.includes('|')) {
            const parts = bodyStr.split('\\n');
            parts.forEach(part => {
                const data = part.split('|');
                if (data.length >= 2) {
                    tData[data[0]] = data[1];
                }
            });
        }
    } catch (why) { 
        console.log(`Dashboard parse warning: ${why}`); 
    }

    // Render dashboard.ejs
    res.render('dashboard', { data: tData });
});

// Endpoint close
app.all('/player/validate/close', (req, res) => {
    console.log('Close window request');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Closing...</title>
            <style>
                body { 
                    background: #1a2a3a; 
                    color: white; 
                    font-family: Arial; 
                    text-align: center; 
                    padding: 50px;
                }
            </style>
        </head>
        <body>
            <h2>Window akan ditutup...</h2>
            <p>Silakan kembali ke game.</p>
            <script>
                setTimeout(() => {
                    window.close();
                    window.location.href = '/';
                }, 2000);
            </script>
        </body>
        </html>
    `);
});

// Endpoint metadata (required oleh client)
app.get('/player/metadata/login', (req, res) => {
    console.log('Metadata request');
    res.json({
        status: 'success',
        message: 'Metadata retrieved',
        data: {
            maintenance: false,
            redirect_url: ''
        }
    });
});

// Handle 404
app.use((req, res) => {
    console.log('404 Not Found:', req.url);
    res.status(404).json({ 
        status: 'error', 
        message: 'Endpoint not found' 
    });
});

// Untuk Vercel, export app
module.exports = app;

// Untuk local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n=== GTPSID LOGIN SERVER ===');
        console.log(`Server running on port ${PORT}`);
        console.log(`Access at: http://localhost:${PORT}\n`);
    });
}
