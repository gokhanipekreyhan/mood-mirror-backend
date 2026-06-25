const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const DEEPGRAM_API_KEY = '184e4e12b4b6ce324d08b141265d42bcfe505290';

function mapSentimentToMoods(words) {
  let positive = 0, negative = 0, neutral = 0, total = 0;

  words.forEach(({ sentiment, sentiment_score }) => {
    if (!sentiment) return;
    total++;
    const score = sentiment_score || 0.5;
    if (sentiment === 'positive') positive += score;
    else if (sentiment === 'negative') negative += score;
    else neutral += score;
  });

  if (total === 0) return null;

  const sum = positive + negative + neutral || 1;
  const posRatio = positive / sum;
  const negRatio = negative / sum;
  const neuRatio = neutral / sum;

  const moods = {
    happy: Math.round(posRatio * 70 + neuRatio * 10),
    calm: Math.round(neuRatio * 60 + posRatio * 20),
    stressed: Math.round(negRatio * 60),
    tired: Math.round(negRatio * 40 + neuRatio * 20),
  };

  // Toplam 100 yap
  const total100 = Object.values(moods).reduce((a, b) => a + b, 0);
  const keys = Object.keys(moods);
  keys.forEach(k => { moods[k] = Math.round((moods[k] / total100) * 100); });
  moods.tired = Math.max(0, 100 - moods.happy - moods.calm - moods.stressed);

  const dominant = Object.keys(moods).reduce((a, b) => moods[a] > moods[b] ? a : b);
  console.log('Moods:', moods, 'Dominant:', dominant);
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

    const response = await axios.post(
      'https://api.deepgram.com/v1/listen?model=nova-2&sentiment=true&detect_language=true',
      req.file.buffer,
      {
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': req.file.mimetype || 'audio/m4a',
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    console.log('Word count:', words.length, 'Sample:', JSON.stringify(words.slice(0, 3)));

    const result = mapSentimentToMoods(words);

    if (!result) {
      return res.json({
        success: true,
        moods: { calm: 40, happy: 25, stressed: 20, tired: 15 },
        dominant: 'calm'
      });
    }

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