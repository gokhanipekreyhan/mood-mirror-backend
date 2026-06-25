const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const DEEPGRAM_API_KEY = '184e4e12b4b6ce324d08b141265d42bcfe505290';

function mapSentimentToMoods(segments) {
  const scores = { calm: 0, happy: 0, stressed: 0, tired: 0 };
  let total = 0;

  segments.forEach(({ sentiment, sentiment_score }) => {
    const score = sentiment_score || 0.5;
    total++;
    if (sentiment === 'positive') {
      scores.happy += score;
      scores.calm += score * 0.3;
    } else if (sentiment === 'negative') {
      scores.stressed += score * 0.6;
      scores.tired += score * 0.4;
    } else {
      scores.calm += score * 0.6;
      scores.tired += score * 0.4;
    }
  });

  if (total === 0) return null;

  const sum = Object.values(scores).reduce((a, b) => a + b, 0);
  if (sum === 0) return null;

  const moods = {};
  let cumsum = 0;
  const keys = Object.keys(scores);
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      moods[k] = Math.max(0, 100 - cumsum);
    } else {
      moods[k] = Math.round((scores[k] / sum) * 100);
      cumsum += moods[k];
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

    const response = await axios.post(
      'https://api.deepgram.com/v1/listen?model=nova-2&sentiment=true&language=tr',
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
    console.log('Deepgram response:', JSON.stringify(data?.results?.sentiments?.segments?.slice(0, 3)));

    const segments = data?.results?.sentiments?.segments || [];
    const average = data?.results?.sentiments?.average;

    console.log('Average sentiment:', JSON.stringify(average));

    let result;
    if (segments.length > 0) {
      result = mapSentimentToMoods(segments);
    } else if (average) {
      // Fallback: average sentiment kullan
      result = mapSentimentToMoods([{ sentiment: average.sentiment, sentiment_score: average.sentiment_score }]);
    }

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