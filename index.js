const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const DEEPGRAM_API_KEY = '184e4e12b4b6ce324d08b141265d42bcfe505290';

const KEYWORDS = {
  tr: {
    happy: [
      'mutlu','sevinç','harika','mükemmel','süper','muhteşem','neşe','keyif',
      'heyecan','coşku','güldüm','gülüyorum','seviyorum','bayıldım','başardım',
      'sevindim','memnun','güzel','iyi','tatmin','şahane','sevdim','memnunum'
    ],
    stressed: [
      'kızgın','kızdım','kızıyorum','sinir','sinirli','öfke','öfkeli',
      'nefret','berbat','bıktım','bezdim','dayanamıyorum','saçma','rezalet',
      'gıcık','çıldır','delird','kavga','bağır','lanet','istemiyorum',
      'korkunç','yeter','bunaltıcı','sıkıntı','gergin','stresli'
    ],
    tired: [
      'yorgun','yoruldum','bitkin','halsiz','dermansız','uyku','uyuyamad',
      'uykusuz','halim yok','gücüm yok','üzgün','üzüldüm','mutsuz','keder',
      'bunald','isteksiz','takatim','ağır','kasvetli','karamsar','çökmüş',
      'bitik','düşkün','perişan','çaresiz','umutsuz','can sıkıntısı'
    ],
    calm: [
      'sakin','huzur','rahat','dingin','sessiz','nefes','özgür','serbest',
      'dinliyorum','düşünüyorum','anlıyorum','soğukkanlı','dengeli','kararlı',
      'güvenli','huzurlu','tatmin','memnun','olumlu','pozitif'
    ],
  },
  en: {
    happy: [
      'happy','joy','excited','great','amazing','wonderful','fantastic','awesome',
      'love','loved','glad','cheerful','delighted','thrilled','ecstatic','blessed',
      'grateful','pleased','content','satisfied','good','excellent','perfect'
    ],
    stressed: [
      'angry','mad','furious','hate','terrible','awful','stressed','anxious',
      'worried','nervous','frustrated','annoyed','irritated','upset','rage',
      'panic','scared','fear','overwhelmed','exhausted by','fed up','sick of'
    ],
    tired: [
      'tired','exhausted','sleepy','drained','weary','fatigue','bored','sad',
      'depressed','hopeless','miserable','disappointed','lonely','empty',
      'numb','gloomy','melancholy','down','low','unmotivated','sluggish'
    ],
    calm: [
      'calm','peaceful','relaxed','serene','quiet','balanced','centered','clear',
      'focused','mindful','steady','stable','comfortable','fine','okay','alright',
      'neutral','composed','collected','tranquil'
    ],
  }
};

function analyzeText(text, lang) {
  const lower = text.toLowerCase();
  const list = KEYWORDS[lang] || KEYWORDS.tr;
  const scores = { happy: 0, stressed: 0, tired: 0, calm: 0 };

  for (const [mood, keywords] of Object.entries(list)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[mood] += 1;
        console.log(`Match: "${kw}" -> ${mood}`);
      }
    }
  }

  console.log('Scores:', scores);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return { moods: { calm: 45, happy: 25, stressed: 15, tired: 15 }, dominant: 'calm' };
  }

  // Minimum %10 her kategoriye, kalanı skorla böl
  const BASE = 10;
  const remaining = 100 - BASE * 4;
  const moods = {};
  let sum = BASE * 4;

  const keys = Object.keys(scores);
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      moods[k] = Math.max(BASE, 100 - sum);
    } else {
      const extra = Math.round((scores[k] / total) * remaining);
      moods[k] = BASE + extra;
      sum += extra;
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
    const detectedLang = dgRes.data?.results?.channels?.[0]?.detected_language || 'tr';
    const lang = detectedLang.startsWith('en') ? 'en' : 'tr';

    console.log('Transcript:', transcript);
    console.log('Language:', lang);

    if (!transcript.trim()) {
      return res.json({
        success: true,
        moods: { calm: 45, happy: 25, stressed: 15, tired: 15 },
        dominant: 'calm'
      });
    }

    const result = analyzeText(transcript, lang);
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