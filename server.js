const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { timingSafeEqual } = require('crypto');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const cron = require('node-cron');

const app = express();
const port = Number(process.env.PORT) || 4000;
const timezone = process.env.SCHEDULE_TIMEZONE || 'Asia/Ho_Chi_Minh';
const exchangeRateUrl = process.env.EXCHANGE_RATE_URL;
const keepAliveUrl = process.env.KEEP_ALIVE_URL;

let latestRate = null;
let updatedAt = null;

app.use(express.json({ limit: '10kb' }));

const protectedEndpointRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests, try again in 1 minute' },
});

function requireApiKey(req, res, next) {
  const configuredApiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!configuredApiKey) {
    res.status(503).json({ error: 'Not found API key configuration' });
    return;
  }

  const providedApiKey = req.headers['x-api-key'];
  if (!providedApiKey) {
    res.status(401).json({ error: 'Invalild API key' });
    return;
  }

  const expected = Buffer.from(configuredApiKey);
  const provided = Buffer.from(providedApiKey);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
}

async function fetchKrwToVndRate() {
  const response = await fetch(exchangeRateUrl, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Exchange-rate request failed with status ${response.status}`);
  }

  const data = await response.json();
  const saleBaseRate = Number(data.saleBaseRate);
  const rate = Number((100 / saleBaseRate).toFixed(2)); // krw * rate = 100 vnd
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Exchange-rate response contains an invalid sale base rate');
  }

  latestRate = rate;
  updatedAt = new Date().toISOString();
  console.info(`Exchange rate updated: ${rate}`);
}

app.get('/api/exchange-rate', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (latestRate === null) {
    res.status(503).json({ error: 'Exchange rate is not available yet' });
    return;
  }

  res.json({ rate: latestRate, updatedAt });
});

app.put('/api/exchange-rate', protectedEndpointRateLimit, requireApiKey, (req, res) => {
  const { rate } = req.body || {};
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    res.status(400).json({ error: 'Rate must be a positive finite number' });
    return;
  }

  latestRate = rate;
  updatedAt = new Date().toISOString();
  res.set('Cache-Control', 'no-store');
  res.json({ rate: latestRate, updatedAt });
});

app.post('/api/exchange-rate/reset', protectedEndpointRateLimit, requireApiKey, async (req, res) => {
  try {
    await fetchKrwToVndRate();
    res.set('Cache-Control', 'no-store');
    res.json({ rate: latestRate, updatedAt });
  } catch (error) {
    console.error('Unable to reset the KRW to VND exchange rate:', error);
    res.status(502).json({ error: 'Unable to fetch the latest exchange rate' });
  }
});

const buildDirectory = path.join(__dirname, 'build');
app.use(express.static(buildDirectory));
app.get('*', (req, res, next) => {
  res.sendFile(path.join(buildDirectory, 'index.html'), (error) => {
    if (error) next();
  });
});

if (!cron.validate('0 7 * * *')) {
  throw new Error('Invalid daily exchange-rate schedule');
}

cron.schedule(
  '0 7 * * *',
  () => {
    fetchKrwToVndRate().catch((error) => {
      console.error('Unable to fetch the scheduled KRW to VND exchange rate:', error);
    });
  },
  { timezone }
);

if (keepAliveUrl) {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const response = await fetch(keepAliveUrl, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        console.error(`Keep-alive request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Unable to send the keep-alive request:', error);
    }
  });
  console.info('Website keep-alive requests enabled (every 5 minutes)');
}

app.listen(port, () => {
  console.info(`Exchange-rate server listening on port ${port} (daily schedule: 07:00 ${timezone})`);
  fetchKrwToVndRate().catch((error) => {
    console.error('Unable to fetch the initial KRW to VND exchange rate:', error);
  });
});
