const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const DEEPGRAM_API_KEY = '184e4e12b4b6ce324d08b141265d42bcfe505290';

const MOOD_KEYWORDS = {
  happy: ['mutlu','sevinçli','harika','güzel','mükemmel','süper','seviyorum','sevdim','iyi','muhteşem','neşeli','eğlenceli','keyifli','tatmin','başardım','yaptım','sevindim','memnun','şahane'],
  stressed: ['kızgın','sinirli','nefret','berbat','korkunç','bıktım','yeter','saçma','rezalet','öfkeli','delirdim','çıldırdım','bezdim','stresli','sıkıldım','kötü','nefret ediyorum','lanet'],
  tired: ['yorgun','bitkin','uyku','uyudum','uyuyamadım','uykusuz','yoruldum','dinlenmek','ağır','halsiz','isteksiz','bıkkın','üzgün','üzüldüm','mutsuz','kederli','bunaldım'],
  calm: ['sakin','huzurlu','rahat','dingin','sessiz','güzel','tamam','iyi','normal','fena değil','serbest','özgür','nefes'],
};

function analyzeText(text) {
  const lower = text.toLowerCase();
  const scores = { happy: 0, stressed: 0, tired: 0, calm: 0 };

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[mood] += 1;
      }
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  if (total === 0) {
    // Kelime eşleşmesi yoksa nötr/sakin döndür
    return { moods: { calm: 45, happy: 25, stressed: 15, tired: 15 }, dominant: 'calm' };
  }

  const moods = {};
  let sum = 0;
  const keys = Object.keys(scores);
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      moods[k] = Math.max(0, 100 - sum);
    } else {
      moods[k] = Math.round((scores[k] / total) * 100);
      sum += moods[k];
    }
  });

  const dominant = Object.keys(moods).reduce((a, b) => moods[a] > moods[b] ? a : b);
  return { moods, dominant };
}

app.get('/', (req, res) => {
  res.json({ status: 'Mood Mirror Backend çalışıyor!' });
});

app.post('/analyze', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
    }

    const dgRes = await axios.post(
      'https://api.deepgram.com/v1/listen?model=nova-2&detect_language=true',
      req.file.buffer,
      {
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': req.file.mimetype || 'audio/m4a',
        },
        timeout: 15000,
      }
    );

    const transcript = dgRes.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    console.log('Transcript:', transcript);

    const result = analyzeText(transcript);
    console.log('Moods:', result.moods, 'Dominant:', result.dominant);

    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Hata:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mood Mirror Backend port ${PORT} üzerinde çalışıyor`);
});