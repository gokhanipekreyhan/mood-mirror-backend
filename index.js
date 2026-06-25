const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const HUME_API_KEY = 'Q1G7QN39w6P08WctUViyndiwq25PDnpGgQYWAbcggX8VEaRH';

const EMOTION_MAP = {
  calm:     ['Calmness','Contentment','Serenity','Relief','Concentration','Satisfaction'],
  happy:    ['Joy','Excitement','Happiness','Amusement','Enthusiasm','Pride','Ecstasy','Admiration','Adoration'],
  stressed: ['Anger','Anxiety','Fear','Nervousness','Distress','Contempt','Disgust','Horror','Embarrassment'],
  tired:    ['Tiredness','Boredom','Sadness','Disappointment','Empathic Pain','Guilt','Shame'],
};

function mapEmotionsToMoods(emotions) {
  const scores = { calm: 0, happy: 0, stressed: 0, tired: 0 };
  emotions.forEach(({ name, score }) => {
    for (const [mood, keywords] of Object.entries(EMOTION_MAP)) {
      if (keywords.some(k => name.toLowerCase().includes(k.toLowerCase()))) {
        scores[mood] += score;
      }
    }
  });
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
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

    // Hume EVI inference endpoint
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: 'recording.m4a',
      contentType: req.file.mimetype || 'audio/m4a',
    });
    formData.append('models', JSON.stringify({ prosody: {} }));
    formData.append('transcription', JSON.stringify({ language: 'tr' }));

    const jobRes = await axios.post(
      'https://api.hume.ai/v0/batch/jobs',
      formData,
      {
        headers: {
          'X-Hume-Api-Key': HUME_API_KEY,
          ...formData.getHeaders(),
        },
      }
    );

    const jobId = jobRes.data?.job_id;
    if (!jobId) throw new Error('Job ID alınamadı');

    let emotions = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const statusRes = await axios.get(
          `https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`,
          { headers: { 'X-Hume-Api-Key': HUME_API_KEY } }
        );
        const predictions = statusRes.data;
        if (predictions && predictions.length > 0) {
          const prosody = predictions[0]?.results?.predictions?.[0]?.models?.prosody;
          if (prosody?.grouped_predictions?.[0]?.predictions?.length > 0) {
            const allEmotions = prosody.grouped_predictions[0].predictions
              .flatMap(p => p.emotions || []);
            const emotionMap = {};
            allEmotions.forEach(({ name, score }) => {
              if (!emotionMap[name]) emotionMap[name] = { total: 0, count: 0 };
              emotionMap[name].total += score;
              emotionMap[name].count += 1;
            });
            emotions = Object.entries(emotionMap)
              .map(([name, v]) => ({ name, score: v.total / v.count }))
              .sort((a, b) => b.score - a.score);

            console.log('Top emotions:', emotions.slice(0, 5).map(e => `${e.name}:${e.score.toFixed(2)}`).join(', '));
            break;
          }
        }
      } catch (e) {}
    }

    if (!emotions) throw new Error('Analiz tamamlanamadı');

    const result = mapEmotionsToMoods(emotions);
    if (!result) throw new Error('Emotion mapping başarısız');

    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Hata:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mood Mirror Backend port ${PORT} üzerinde çalışıyor`);
});