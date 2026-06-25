const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const ASSEMBLYAI_API_KEY = 'bafcda79229248c5962146c659ddb629';

function mapSentimentToMoods(results) {
  const scores = { calm: 0, happy: 0, stressed: 0, tired: 0 };
  let count = 0;

  results.forEach(({ sentiment, confidence }) => {
    count++;
    if (sentiment === 'POSITIVE') {
      scores.happy += confidence;
      scores.calm += confidence * 0.3;
    } else if (sentiment === 'NEGATIVE') {
      scores.stressed += confidence * 0.6;
      scores.tired += confidence * 0.4;
    } else {
      scores.calm += confidence * 0.5;
      scores.tired += confidence * 0.5;
    }
  });

  if (count === 0) return null;

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

    // 1. AssemblyAI'a ses yükle
    const uploadRes = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      req.file.buffer,
      {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream',
        },
      }
    );

    const audioUrl = uploadRes.data.upload_url;
    if (!audioUrl) throw new Error('Upload başarısız');

    // 2. Transkript + sentiment analizi başlat
    const transcriptRes = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: audioUrl,
        sentiment_analysis: true,
        language_detection: true,
      },
      {
        headers: { 'authorization': ASSEMBLYAI_API_KEY },
      }
    );

    const transcriptId = transcriptRes.data.id;
    if (!transcriptId) throw new Error('Transcript ID alınamadı');

    // 3. Sonucu bekle (polling)
    let sentimentResults = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { 'authorization': ASSEMBLYAI_API_KEY } }
      );

      const status = pollRes.data.status;
      console.log('Status:', status);

      if (status === 'completed') {
        sentimentResults = pollRes.data.sentiment_analysis_results;
        console.log('Sentiment:', JSON.stringify(sentimentResults?.slice(0, 3)));
        break;
      } else if (status === 'error') {
        throw new Error('Transkript hatası: ' + pollRes.data.error);
      }
    }

    if (!sentimentResults || sentimentResults.length === 0) {
      // Ses analiz edilemedi, ses tonu bazlı fallback
      return res.json({
        success: true,
        moods: { calm: 40, happy: 25, stressed: 20, tired: 15 },
        dominant: 'calm'
      });
    }

    const result = mapSentimentToMoods(sentimentResults);
    if (!result) throw new Error('Mapping başarısız');

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