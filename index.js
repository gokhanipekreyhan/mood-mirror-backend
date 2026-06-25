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
    happy: ['mutlu','sevinç','harika','mükemmel','süper','muhteşem','neşe','keyif','heyecan','coşku','güldüm','gülüyorum','seviyorum','bayıldım','başardım','sevindim','memnun','güzel','tatmin','şahane','sevdim','neşeli','pozitif','umutlu','zevkli','eğlenceli','kahkaha','gülüştük','kutladık','kazandım','inanılmaz','enfes','nefis','müthiş','fenomal','aferin','helal','bravo','alkış','övündüm','gurur'],
    stressed: ['kızgın','kızdım','kızıyorum','sinir','sinirli','öfke','öfkeli','nefret','berbat','bıktım','bezdim','dayanamıyorum','saçma','rezalet','gıcık','çıldır','delird','kavga','lanet','istemiyorum','korkunç','yeter','gergin','stresli','endişe','kaygı','panik','korku','tedirgin','sinirlendim','kudurdum','kızdım','çıkıştım','bağırdım','sinir bozucu','berbat','iğrenç','tiksindim','kahretsin','Allah kahretsin','orospu','oğlu','amk','bok','sik','göt','oç','piç','salak','gerizekalı','aptal','mal','dangalak','embesil','ahmak','budala','sersem','hödük','şerefsiz','alçak','namussuz','it','köpek','eşek','hayvan','canavar','katil','sahtekar','yalancı','dolandırıcı','hırsız'],
    tired: ['yorgun','yoruldum','bitkin','halsiz','dermansız','uyku','uyuyamad','uykusuz','halim yok','gücüm yok','üzgün','üzüldüm','mutsuz','keder','bunald','isteksiz','takatim','ağır','karamsar','çökmüş','bitik','perişan','çaresiz','umutsuz','sıkkın','ağladım','ağlıyorum','hüzün','kötü hissediyorum','canım sıkkın','moralim bozuk','motivasyonum yok','bıkmışım','bezginlik','yorgunluk','can sıkıntısı','iç sıkıntısı','bungunluk'],
    calm: ['sakin','huzur','rahat','dingin','sessiz','nefes','özgür','serbest','dinliyorum','düşünüyorum','soğukkanlı','dengeli','kararlı','güvenli','huzurlu','olumlu','kabul','tamam','normal','iyi','fena değil','idare eder','orta','şükür','berrak','açık','net','clear','odaklı','konsantre','meditasyon','yoga','dinlendim','uyudum'],
  },
  en: {
    happy: ['happy','joy','excited','great','amazing','wonderful','fantastic','awesome','love','loved','glad','cheerful','delighted','thrilled','ecstatic','blessed','grateful','pleased','content','satisfied','excellent','perfect','brilliant','superb','incredible','laughed','celebrated','won','achieved','proud','grateful','elated','overjoyed','euphoric','blissful','radiant','glowing'],
    stressed: ['angry','mad','furious','hate','terrible','awful','stressed','anxious','worried','nervous','frustrated','annoyed','irritated','upset','rage','panic','scared','fear','overwhelmed','fed up','sick of','horrible','dreadful','outraged','pissed','pissed off','damn','shit','fuck','fucking','bullshit','asshole','bastard','idiot','stupid','moron','jerk','loser','dumbass','crap','hell','screw','hate this','cant stand','unbearable','nightmare','disaster','catastrophe','worst'],
    tired: ['tired','exhausted','sleepy','drained','weary','fatigue','bored','sad','depressed','hopeless','miserable','disappointed','lonely','empty','numb','gloomy','melancholy','down','low','unmotivated','sluggish','burned out','worn out','heartbroken','devastated','crying','cried','tearful','grief','sorrow','devastated','shattered','broken','lost','helpless','worthless','meaningless'],
    calm: ['calm','peaceful','relaxed','serene','quiet','balanced','centered','clear','focused','mindful','steady','stable','comfortable','fine','okay','alright','neutral','composed','collected','tranquil','meditated','rested','slept well','refreshed','energized','clear headed','grounded','present','aware'],
  },
  es: {
    happy: ['feliz','alegre','contento','maravilloso','fantástico','genial','increíble','emocionado','encantado','satisfecho','estupendo','excelente','glorioso','radiante','eufórico','dichoso','animado','positivo','entusiasmado','reí','celebré','gané','logré','orgulloso','agradecido','bendecido'],
    stressed: ['enojado','furioso','odio','terrible','horrible','estresado','ansioso','nervioso','frustrado','molesto','irritado','enfadado','pánico','miedo','abrumado','harto','insoportable','espantoso','angustiado','desesperado','mierda','joder','coño','hostia','cabron','imbécil','idiota','estúpido','maldito','puta','puto','inútil','desgraciado'],
    tired: ['cansado','agotado','somnoliento','drenado','aburrido','triste','deprimido','sin esperanza','miserable','decepcionado','solo','vacío','melancólico','bajo','desmotivado','extenuado','destrozado','llorando','lloré','tristeza','pena','desolado'],
    calm: ['tranquilo','pacífico','relajado','sereno','silencioso','equilibrado','centrado','claro','estable','cómodo','bien','neutral','compuesto','seguro','apacible','meditando','descansé','dormí bien'],
  },
  fr: {
    happy: ['heureux','joyeux','content','merveilleux','fantastique','génial','incroyable','excité','ravi','satisfait','excellent','magnifique','euphorique','enchanté','positif','enthousiaste','radieux','ri','célébré','gagné','réussi','fier','reconnaissant','béni'],
    stressed: ['en colère','furieux','déteste','terrible','horrible','stressé','anxieux','nerveux','frustré','irrité','énervé','panique','peur','submergé','épuisé','insupportable','angoissé','désespéré','merde','putain','bordel','con','connard','idiot','stupide','imbécile','salaud','foutu','chiant','nul'],
    tired: ['fatigué','épuisé','somnolent','ennuyé','triste','déprimé','sans espoir','misérable','déçu','seul','vide','mélancolique','bas','démotivé','à bout','brisé','pleuré','pleure','chagrin','peine','dévasté'],
    calm: ['calme','paisible','détendu','serein','silencieux','équilibré','centré','clair','stable','confortable','bien','neutre','composé','sécurisé','tranquille','médité','reposé','bien dormi'],
  },
  de: {
    happy: ['glücklich','freudig','fröhlich','wunderbar','fantastisch','toll','unglaublich','aufgeregt','begeistert','zufrieden','ausgezeichnet','herrlich','euphorisch','positiv','enthusiastisch','gelacht','gefeiert','gewonnen','erreicht','stolz','dankbar','gesegnet'],
    stressed: ['wütend','zornig','hasse','schrecklich','gestresst','ängstlich','nervös','frustriert','gereizt','verärgert','Panik','Angst','überwältigt','unerträglich','verzweifelt','erschöpft','Scheiße','verdammt','Mist','Idiot','Blödmann','dumm','bescheuert','Arschloch','Trottel','Vollidiot','zum Kotzen','Mist'],
    tired: ['müde','erschöpft','schläfrig','gelangweilt','traurig','deprimiert','hoffnungslos','elend','enttäuscht','einsam','leer','melancholisch','unmotiviert','ausgebrannt','gebrochen','geweint','Trauer','Kummer','verzweifelt'],
    calm: ['ruhig','friedlich','entspannt','gelassen','still','ausgeglichen','klar','stabil','wohl','neutral','sicher','besonnen','gefasst','meditiert','ausgeruht','gut geschlafen'],
  },
  ar: {
    happy: ['سعيد','فرحان','رائع','ممتاز','مبهج','مسرور','متحمس','مبتهج','شاكر','ممتنن','ضحكت','احتفلت','فزت','نجحت','فخور','بركة','عظيم','بديع'],
    stressed: ['غاضب','محبط','كاره','فظيع','مجنون','قلق','خائف','مرهق','لا أطيق','مزعج','كلب','حمار','غبي','أحمق','يلعن','ملعون','لعنة','تعبان','ضيقان','زعلان'],
    tired: ['تعبان','مرهق','نعسان','حزين','مكتئب','يائس','بائس','خائب','وحيد','فارغ','بكيت','أبكي','حزن','ألم','محطم'],
    calm: ['هادئ','مرتاح','سكينة','توازن','واضح','مستقر','بخير','محايد','تأملت','نمت جيداً'],
  },
  ru: {
    happy: ['счастливый','радостный','отличный','замечательный','фантастический','восхитительный','взволнованный','доволен','превосходный','великолепный','смеялся','праздновал','победил','достиг','гордый','благодарный'],
    stressed: ['злой','сердитый','ненавижу','ужасный','стрессовый','тревожный','нервный','расстроенный','раздражённый','паника','страх','подавленный','невыносимый','чёрт','блин','идиот','дурак','тупой','сволочь','придурок','мудак','засранец','нахрен'],
    tired: ['устал','измотан','сонный','скучно','грустный','депрессия','безнадёжный','несчастный','разочарован','одинокий','пустой','плакал','плачу','горе','печаль','сломлен'],
    calm: ['спокойный','мирный','расслабленный','тихий','сбалансированный','ясный','стабильный','хорошо','нейтральный','медитировал','отдохнул','хорошо спал'],
  },
  pt: {
    happy: ['feliz','alegre','contente','maravilhoso','fantástico','incrível','animado','encantado','satisfeito','excelente','magnífico','eufórico','positivo','entusiasmado','ri','celebrei','ganhei','consegui','orgulhoso','grato'],
    stressed: ['com raiva','furioso','odeio','terrível','horrível','estressado','ansioso','nervoso','frustrado','irritado','com medo','pânico','sobrecarregado','insuportável','desesperado','merda','porra','caralho','idiota','burro','imbecil','maldito','desgraçado'],
    tired: ['cansado','exausto','com sono','entediado','triste','deprimido','sem esperança','miserável','decepcionado','solitário','vazio','melancólico','desmotivado','esgotado','destruído','chorei','choro','tristeza','dor'],
    calm: ['calmo','pacífico','relaxado','sereno','silencioso','equilibrado','centrado','claro','estável','confortável','bem','neutro','meditei','descansei','dormi bem'],
  },
  it: {
    happy: ['felice','gioioso','contento','meraviglioso','fantastico','incredibile','emozionato','soddisfatto','eccellente','magnifico','euforico','positivo','entusiasta','riso','celebrato','vinto','raggiunto','orgoglioso','grato'],
    stressed: ['arrabbiato','furioso','odio','terribile','orribile','stressato','ansioso','nervoso','frustrato','irritato','spaventato','panico','sopraffatto','insopportabile','disperato','cazzo','merda','stronzo','idiota','stupido','imbecille','maledetto','bastardo'],
    tired: ['stanco','esausto','assonnato','annoiato','triste','depresso','senza speranza','miserabile','deluso','solo','vuoto','malinconico','demotivato','distrutto','pianto','piango','tristezza','dolore'],
    calm: ['calmo','pacifico','rilassato','sereno','silenzioso','equilibrato','centrato','chiaro','stabile','comodo','bene','neutro','meditato','riposato','dormito bene'],
  },
  ko: {
    happy: ['행복','기쁨','신남','대박','완벽','멋진','놀라운','좋아','만족','훌륭','굉장','황홀','감사','웃었어','축하했어','이겼어','성공했어','자랑스러워','기뻐'],
    stressed: ['화났어','짜증','싫어','끔찍해','스트레스','불안','긴장','좌절','짜증나','두려워','패닉','무서워','참을수없어','최악','제발','바보','멍청이','미쳤어','씨발','개새끼','병신','지랄','닥쳐'],
    tired: ['피곤해','지쳤어','졸려','지루해','슬퍼','우울해','절망','불행해','실망','외로워','공허해','우울','의욕없어','다탔어','울었어','울어','슬픔','고통'],
    calm: ['차분해','평화로워','편안해','고요해','균형잡힌','명확해','안정적','괜찮아','중립적','명상했어','쉬었어','잘잤어'],
  },
  zh: {
    happy: ['快乐','高兴','开心','太棒了','完美','精彩','兴奋','满足','出色','极好','欣喜','感激','笑了','庆祝','赢了','成功了','自豪','幸福'],
    stressed: ['生气','愤怒','讨厌','可怕','压力','焦虑','紧张','沮丧','烦躁','恐惧','恐慌','害怕','受不了','最糟糕','混蛋','白痴','蠢货','操','去死','他妈的','傻逼','煞笔'],
    tired: ['累了','精疲力竭','困了','无聊','伤心','沮丧','绝望','悲惨','失望','孤独','空虚','忧郁','没动力','崩溃','哭了','哭泣','悲伤','痛苦'],
    calm: ['平静','平和','放松','宁静','安静','平衡','清晰','稳定','还好','中立','冥想','休息了','睡得好'],
  },
};

function analyzeText(text, lang) {
  const lower = text.toLowerCase();
  const list = KEYWORDS[lang] || KEYWORDS.en;
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

  const BASE = 5;
  const remaining = 100 - BASE * 4;
  const moods = {};
  let sum = 0;
  const keys = Object.keys(scores);

  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      moods[k] = Math.max(BASE, 100 - sum);
    } else {
      const extra = Math.round((scores[k] / total) * remaining);
      moods[k] = BASE + extra;
      sum += (BASE + extra);
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
      return res.status(400).json({ error: 'No audio file' });
    }

    const lang = req.headers['x-language'] || 'en';

    const dgRes = await axios.post(
      `https://api.deepgram.com/v1/listen?model=nova-2&language=${lang}`,
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
    console.log('Language:', lang);

    if (!transcript.trim()) {
      return res.json({
        success: true,
        moods: { calm: 45, happy: 25, stressed: 15, tired: 15 },
        dominant: 'calm',
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