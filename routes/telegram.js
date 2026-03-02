import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Validate Telegram WebApp initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramWebAppData(initData) {
  if (!BOT_TOKEN || !initData) return false;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');

    // Sort params alphabetically and join with \n
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${val}`)
      .join('\n');

    // HMAC-SHA256 using "WebAppData" as key
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return expectedHash === hash;
  } catch {
    return false;
  }
}

/**
 * Parse user from initData
 */
function parseInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// POST /api/telegram/validate — validate TMA user
router.post('/validate', (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ valid: false, error: 'initData is required' });
  }

  const isValid = validateTelegramWebAppData(initData);

  if (!isValid) {
    return res.status(401).json({ valid: false, error: 'Invalid initData' });
  }

  const user = parseInitData(initData);
  res.json({ valid: true, user });
});

// GET /api/telegram/config — get public TMA config
router.get('/config', (req, res) => {
  res.json({
    botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
    miniAppUrl: process.env.MINI_APP_URL || '',
    shopName: process.env.SHOP_NAME || 'Biznes Do\'kon',
  });
});

export default router;
