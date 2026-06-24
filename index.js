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
  calm: ['Calmness', 'Contentment', 'Serenity', 'Relief'],
  happy: ['Joy', 'Excitement', 'Happiness', 'Amusement', 'Enthusiasm'],
  stressed: ['Anger', 'Anxiety', 'Fear', 'Nervousness', 'Distress', 'Contempt'],
  tired: ['Tiredness', 'Boredom', 'Sadness', 'Disappointment'],
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

app.post('/analyze-debug', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Ses yok' });

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: 'recording.m4a',
      contentType: req.file.mimetype || 'audio/m4a',
    });
    formData.append('models', JSON.stringify({ prosody: {} }));

    const jobRes = await axios.post(
      'https://api.hume.ai/v0/batch/jobs',
      formData,
      { headers: { 'X-Hume-Api-Key': HUME_API_KEY, ...formData.getHeaders() } }
    );

    const jobId = jobRes.data?.job_id;

    let rawEmotions = null;
    for (let i = 0; i < 15; i++) {
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
            rawEmotions = Object.entries(emotionMap)
              .map(([name, v]) => ({ name, score: +(v.total / v.count).toFixed(3) }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 10);
            break;
          }
        }
      } catch (e) {}
    }

    res.json({ top10: rawEmotions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Mood Mirror Backend çalışıyor!' });
});

app.post('/analyze', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: 'recording.m4a',
      contentType: req.file.mimetype || 'audio/m4a',
    });
    formData.append('models', JSON.stringify({ prosody: {} }));

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
    for (let i = 0; i < 15; i++) {
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
            emotions = Object.entries(emotionMap).map(([name, v]) => ({
              name,
              score: v.total / v.count,
            }));
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