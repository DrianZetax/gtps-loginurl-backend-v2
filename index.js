const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');

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

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Root route - serve HTML
app.get('/', (req, res) => {
    // Jika ada token, redirect ke checktoken
    if (req.query.token) {
        return res.redirect(`/player/growid/checktoken?token=${req.query.token}`);
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Endpoint login/validate
app.post('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action } = req.body;
    
    console.log('Login/Validate Request:', { 
        action: action || 'LOGIN', 
        growId: growId || 'GUEST', 
        server: _token 
    });

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

    // Buat token data
    const tokenData = {
        server_name: (_token || 'GTPS').toUpperCase(),
        growId: growId || '',
        password: password || '',
        isRegister: (action && action.toLowerCase() === 'register') ? true : false
    };
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    
    console.log('Generated token:', token.substring(0, 50) + '...');
    
    // Response JSON - tanpa accountAge
    res.json({
        status: 'success',
        message: 'Account Validated.',
        token: token,
        url: '',
        accountType: 'growtopia'
    });
});

// Endpoint checktoken
app.get('/player/growid/checktoken', (req, res) => {
    const { token } = req.query;
    
    console.log('CheckToken request:', { token: token ? token.substring(0, 30) + '...' : 'MISSING' });
    
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
});

// Endpoint checktoken untuk POST (beberapa client menggunakan POST)
app.post('/player/growid/checktoken', (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({
            status: 'error',
            message: 'Token required'
        });
    }
    
    res.json({
        status: 'success',
        message: 'Account Validated.',
        token: refreshToken,
        url: '',
        accountType: 'growtopia'
    });
});

// Endpoint close
app.get('/player/validate/close', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Closing...</title></head>
        <body>
            <script>
                window.close();
                setTimeout(() => window.location.href = '/', 1000);
            </script>
            <p>Window akan ditutup. <a href="/">Klik disini</a> jika tidak tertutup.</p>
        </body>
        </html>
    `);
});

// Endpoint metadata (required oleh beberapa client)
app.get('/player/metadata/login', (req, res) => {
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
    res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});

// Untuk Vercel, export app
module.exports = app;

// Untuk local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Access at: http://localhost:${PORT}`);
    });
}
