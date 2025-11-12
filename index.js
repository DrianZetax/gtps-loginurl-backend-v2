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

app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 10000, headers: true }));

app.all("/player/validate/close", function (req, res) {
  res.send("<script>window.close();</script>");
});

app.all('/player/login/dashboard', function (req, res) {
    const tData = {};
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n'); const uName = uData[0].split('|'); const uPass = uData[1].split('|');
        for (let i = 0; i < uData.length - 1; i++) { const d = uData[i].split('|'); tData[d[0]] = d[1]; }
        if (uName[1] && uPass[1]) { res.redirect('/player/growid/login/validate'); }
    } catch (why) { console.log(`Warning: ${why}`); }

    res.render(__dirname + '/public/html/dashboard.ejs', {data: tData});
});

app.all('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password, action } = req.body;
    
    // Untuk register, tambahkan flag isRegister
    const isRegister = action.toLowerCase() === 'register';
    const tokenData = {
        server_name: _token.toUpperCase(), 
        growId: growId, 
        password: password,
        isRegister: isRegister
    };
    
    const token = JSON.stringify(tokenData);
    const tokens = Buffer.from(token).toString('base64');
    
    res.send(
        `{"status":"success","message":"Account Validated.","token":"${tokens}","url":"","accountType":"growtopia", "accountAge": 2}`,
    );
});

app.all('/player/growid/register', (req, res) => {
    const { _token, growId, password, gender, email } = req.body;
    
    // Validasi data register
    if (!growId || !password || !_token) {
        return res.json({
            status: 'error',
            message: 'Missing required fields'
        });
    }
    
    // Buat token untuk register
    const tokenData = {
        server_name: _token.toUpperCase(),
        growId: growId,
        password: password,
        gender: gender || 'man',
        email: email || '',
        isRegister: true
    };
    
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    
    res.json({
        status: 'success',
        message: 'Registration data prepared',
        token: token,
        url: '',
        accountType: 'growtopia'
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
   res.send('Hello Memek');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
});
