// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Telegram konfiguratsiyasi
const token = '8331628985:AAEcxjLxU3bb6BfbLFQJw1G5NTcYNn6JlaU';
const chatId = '5728779626';

// Yordamchi: getUpdates dan natijani oladi
async function getUpdates(offset = null) {
  try {
    let url = `https://api.telegram.org/bot${token}/getUpdates`;
    if (offset !== null) url += `?offset=${offset}`;
    const { data } = await axios.get(url);
    return data;
  } catch (e) {
    console.error('getUpdates err', e.message || e);
    return null;
  }
}

// /latest?since=ID  -> update_id > since bo'lgan eng so'nggi message.text ni qaytaradi
app.get('/latest', async (req, res) => {
  try {
    const since = parseInt(req.query.since || '0', 10) || 0;
    // offset = since + 1 so that we get only newer updates
    const offset = since ? since + 1 : null;
    const data = await getUpdates(offset);
    if (!data || !data.ok) return res.json({ success: false, message: null });

    // top latest update with text
    let latest = null;
    let latestId = since;
    for (const u of data.result || []) {
      if (u.update_id && u.message) {
        const id = u.update_id;
        const text = u.message.text || u.message.caption || null;
        if (text && id > latestId) {
          latestId = id;
          latest = text;
        }
      }
    }

    if (latest) return res.json({ success: true, message: latest, update_id: latestId });
    return res.json({ success: false, message: null });
  } catch (e) {
    console.error('/latest err', e);
    res.status(500).json({ success: false });
  }
});

// /upload-html  -> fayl yuborishdan oldingi eng so'nggi update_id ni qaytaradi (since)
app.post('/upload-html', async (req, res) => {
  try {
    const html = req.body.html || req.body.h || '';
    if (!html) return res.status(400).json({ success: false, error: 'Bo‘sh HTML' });

    // 1) get current updates to know "since"
    const dataBefore = await getUpdates(null);
    let maxBefore = 0;
    if (dataBefore && dataBefore.ok && Array.isArray(dataBefore.result)) {
      for (const u of dataBefore.result) {
        if (u.update_id && u.update_id > maxBefore) maxBefore = u.update_id;
      }
    }

    // 2) Write the HTML to disk (temporary)
    const filePath = path.join(__dirname, 'page.html');
    fs.writeFileSync(filePath, html);

    // 3) Send document to Telegram (bot sends doc to chat)
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('document', fs.createReadStream(filePath), 'page.html');

    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, form, {
        headers: form.getHeaders()
      });
    } catch (tgErr) {
      console.error('sendDocument err', tgErr.message || tgErr);
      // lekin fayl yuborishda xatolik bo'lsa ham clientga "since" qaytarish foydali bo'lishi mumkin
      return res.status(500).json({ success: false, error: 'Telegramga yuborilmadi' });
    }

    // 4) Javob: qaytaramiz "since" — ya'ni fayl yuborilishidan oldingi eng so'nggi update_id
    return res.json({ success: true, since: maxBefore });
  } catch (e) {
    console.error('/upload-html err', e);
    res.status(500).json({ success: false });
  }
});

// (optional) f1.js xizmat qilish - public dan olinadi avtomatik, lekin qo'shsa bo'ladi
app.get('/f1.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'f1.js'));
});

// index route (oddiy)
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.send('<!doctype html><title>OK</title><h3>Server ishlayapti ✅</h3>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server: http://localhost:${PORT}`));
