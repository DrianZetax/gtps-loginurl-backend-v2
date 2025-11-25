const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
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
app.set('views', path.join(__dirname, 'public/html'));
app.set('trust proxy', 1);

// Middleware
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${req.ip}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000, headers: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes

// Dashboard route - FIXED
// Dashboard route - FIXED
app.all('/player/login/dashboard', function (req, res) {
    console.log('Dashboard accessed with method:', req.method);
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    
    const tData = {};
    try {
        // Handle different content types
        if (req.is('application/json')) {
            // JSON data
            const body = req.body;
            if (body.growId && body.password) {
                tData['growId'] = body.growId;
                tData['password'] = body.password;
            }
        } else if (req.is('application/x-www-form-urlencoded')) {
            // Form data
            const uData = Object.keys(req.body).map(key => `${key}|${req.body[key]}`);
            for (let i = 0; i < uData.length; i++) { 
                const d = uData[i].split('|'); 
                tData[d[0]] = d[1]; 
            }
        }
        
        console.log('Processed data:', tData);
        
        // Render dashboard dengan data
        res.render('dashboard', { data: tData });
        
    } catch (why) { 
        console.log(`Dashboard error: ${why}`);
        res.render('dashboard', { data: {} });
    }
});

// Registration endpoint
app.all('/player/growid/register/validate', (req, res) => {
    try {
        console.log('Registration request:', req.body);
        
        const { _token, growId, password, email, gender } = req.body;
        
        // Validation
        if (!_token || !growId || !password || !email || !gender) {
            return res.status(400).json({
                status: "error",
                message: "All fields are required for registration!"
            });
        }

        if (growId.length < 3 || growId.length > 18) {
            return res.status(400).json({
                status: "error", 
                message: "GrowID must be between 3 and 18 characters!"
            });
        }

        if (password.length < 4 || password.length > 18) {
            return res.status(400).json({
                status: "error",
                message: "Password must be between 4 and 18 characters!"
            });
        }

        if (!/^[a-zA-Z0-9]+$/.test(growId)) {
            return res.status(400).json({
                status: "error",
                message: "GrowID can only contain letters and numbers!"
            });
        }

        // Create registration token
        const tokenData = {
            server_name: _token.toUpperCase(),
            growId: growId,
            password: password,
            email: email,
            gender: gender,
            isRegister: true
        };

        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        
        console.log('Registration successful for:', growId);
        
        res.json({
            status: "success",
            message: "Registration successful! You can now login.",
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

// Login endpoint
app.all('/player/growid/login/validate', (req, res) => {
    try {
        console.log('Login request:', req.body);
        
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
                growId: growId || "", 
                password: password || "",
                isRegister: false 
            };
        }

        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        
        console.log('Login token generated for:', growId || 'Guest');
        
        res.json({
            status: "success",
            message: "Login successful!",
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

// Token check endpoint
app.all('/player/growid/checktoken', (req, res) => {
    console.log('Token check request:', req.body);
    const { refreshToken } = req.body;
    res.json({
        status: 'success',
        message: 'Token is valid.',
        token: refreshToken,
        url: '',
        accountType: 'growtopia',
        accountAge: 2
    });
});

// Close window endpoint
app.all("/player/validate/close", function (req, res) {
    res.send("<script>window.close();</script>");
});

// Home page
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

// Serve login page directly
app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

// 404 handler
app.use('*', (req, res) => {
    console.log('404 - Route not found:', req.originalUrl);
    res.status(404).send('Route not found');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        status: "error",
        message: "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, function () {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Home: http://localhost:${PORT}`);
    console.log(`Login: http://localhost:${PORT}/login`);
});
