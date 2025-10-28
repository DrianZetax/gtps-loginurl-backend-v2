const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const path = require('path');

app.use(
  compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

app.set('view engine', 'ejs');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  console.log(
    `[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`
  );
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    headers: true,
  })
);

app.all('/player/validate/close', (req, res) => {
  res.send('<script>window.close();</script>');
});

app.all('/player/login/dashboard', (req, res) => {
  const tData = {};

  try {
    const bodyStr = JSON.stringify(req.body);
    const uData = bodyStr.split('"')[1]?.split('\\n') || [];
    const uName = uData[0]?.split('|') || [];
    const uPass = uData[1]?.split('|') || [];

    for (let i = 0; i < uData.length - 1; i++) {
      const d = uData[i].split('|');
      tData[d[0]] = d[1];
    }

    if (uName[1] && uPass[1]) {
      return res.redirect('/player/growid/login/validate');
    }
  } catch (err) {
    console.log(`Warning: ${err}`);
  }

  res.render(path.join(__dirname, 'public/html/dashboard.ejs'), { data: tData });
});

app.all('/player/growid/login/validate', (req, res) => {
  const { _token = '', growId = '', password = '', action = '' } = req.body;

  // Cegah error .toLowerCase()
  const safeAction = typeof action === 'string' ? action.toLowerCase() : '';

  const tokenObj =
    safeAction === 'login'
      ? { server_name: _token.toUpperCase(), growId, password }
      : { server_name: _token.toUpperCase(), growId: '', password: '' };

  const token = Buffer.from(JSON.stringify(tokenObj)).toString('base64');

  res.json({
    status: 'success',
    message: 'Account Validated.',
    token,
    url: '',
    accountType: 'growtopia',
    accountAge: 2,
  });
});

app.all('/player/growid/checktoken', (req, res) => {
  const { refreshToken = '' } = req.body;

  res.json({
    status: 'success',
    message: 'Account Validated.',
    token: refreshToken,
    url: '',
    accountType: 'growtopia',
    accountAge: 2,
  });
});

app.get('/', (req, res) => {
  res.send('Hello Memek');
});

app.listen(5000, () => {
  console.log('Listening on port 5000');
});
