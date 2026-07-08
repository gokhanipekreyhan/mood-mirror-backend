const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// ---- Yapılandırma ----
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '184e4e12b4b6ce324d08b141265d42bcfe505290';
const APP_KEY = process.env.APP_KEY || 'mm-gokhan-2026-x9r4';
const REQUIRE_APP_KEY = process.env.REQUIRE_APP_KEY === '1'; // Render'da 1 yapınca zorunlu olur
const RATE_LIMIT = 30;              // IP başına saatlik istek
const RATE_WINDOW = 60 * 60 * 1000; // 1 saat

// ---- Rate limit (bellek içi) ----
const rateMap = new Map();
function rateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const now = Date.now();
  let rec = rateMap.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + RATE_WINDOW };
    rateMap.set(ip, rec);
  }
  rec.count++;
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) if (now > v.resetAt) rateMap.delete(k);
  }
  if (rec.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}

// ---- API anahtarı kontrolü ----
function appKeyCheck(req, res, next) {
  if (REQUIRE_APP_KEY && req.headers['x-app-key'] !== APP_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// =====================================================================
//  SÖZLÜK
//  Ağırlık işaretleri:  '!kelime' = 3 puan (güçlü)   'kelime' = 2 puan
//                       '~kelime' = 1 puan (zayıf/bağlamsal)
//  Eşleşme substring ile yapılır: 'yorgun' -> yorgunum/yorgundum/yoruldum... yakalar
// =====================================================================
const RAW = {
  tr: {
    happy: [
      '!mutlu','!mutluyum','!çok mutluyum','!sevinç','sevinçli','sevindim','sevindik','!neşe','neşeli',
      'keyif','keyifli','!keyfim yerinde','heyecan','heyecanlı','coşku','coşkulu',
      '!harika','!harikaydı','!mükemmel','!süper','!muhteşem','inanılmaz','enfes','nefis','müthiş','şahane',
      '~güzel','tatmin','memnun','memnunum','pozitif','umutlu','umut dolu','zevkli','eğlenceli',
      '!bayıldım','seviyorum','sevdim','!aşkım','!aşığım','sevgilim','~canım',
      'gurur','!gururluyum','gurur duydum','!başardım','kazandım','kazandık','maçı kazandık',
      'aferin','helal olsun','bravo','teşekkür','minnettarım','şükür','!çok şükür',
      'moralim yüksek','moralim yerinde','içim içime sığmıyor','!havalara uçtum','!dünyalar benim oldu',
      '!ağzım kulaklarımda','şanslıyım','şanslı hissediyorum','iyi haber','güzel haber','müjde',
      'güldüm','gülüyorum','güldük','!kahkaha','güldürdü','gülümsedim','eğlendim','eğlendik',
      'oynadım','oynadık','dans ettim','dans ettik','kutladım','kutladık','!kutlama',
      'doğum günü','düğün','nişan','bebeğimiz','torunum',
      'sarıldım','sarıldık','öptüm','öptük','şarkı söyledim','arkadaşlarla','buluştum',
      '~gezdim','~tatile','~seyahat','lezzetliydi','~yemek yedim','piknik','pikniğe',
      'uyandım dinç','dinç uyandım','güne güzel başladım','~spor yaptım','koştum','yüzdüm',
      'bitirdim','hallettim','çözdüm','tamamladım','~alışveriş','hediye aldım','hediye ettim','sürpriz',
      'terfi','zam aldım','takdir aldım','tebrik','sınavı geçtim','sınavı kazandım','işe girdim','kabul edildim',
      'çok iyiyim','süper hissediyorum','harika hissediyorum','moralim düzeldi','içim açıldı','yüzüm güldü',
      'müthiş bir gün','çok eğlendik','kahkahalarla','doyasıya','hasret giderdik','kavuştuk','barıştık',
      'maaş yattı','ikramiye','hediye geldi','sürpriz yaptı','ödül aldım','birinci oldum','gol attık',
    ],
    stressed: [
      '!kızgın','kızdım','kızıyorum','!sinir','sinirli','sinirlendim','sinirim bozuldu','gerildim',
      '!öfke','öfkeli','!nefret','!berbat','!bıktım','bezdim','!dayanamıyorum','saçma','rezalet','gıcık',
      'çıldır','delird','!delireceğim','!kafayı yiyeceğim','tepem attı','kafam attı','damarıma bastı',
      'canımı sıkıyor','canımı sıktı','lanet','istemiyorum','korkunç','yeter artık','yetti',
      '!gergin','!stresli','!stres','strese girdim','stres yaptım','!endişe','endişeliyim','!kaygı','kaygılıyım',
      '!panik','!panik atak','korku','korktum','tedirgin','kudurdum','!bunaldım','sıkıldım','bunaltıcı','boğucu',
      'rahatsız','huzursuz','içim daralıyor','içim daraldı','kalbim sıkışıyor','nefesim daraldı',
      '!kahretsin','!lanet olsun','kahrolsun','!amk','salak','gerizekalı','aptal','dangalak',
      'şerefsiz','namussuz','yalancı','dolandırıcı','hırsız',
      'bağırdım','çığlık attım','kavga','tartıştım','tartışma','küstük','fırlattım','küfür ettim','hakaret',
      'kapıyı çarptım','uyuyamadım','sabaha kadar düşündüm','panikledim','ellerim titredi','kalbim hızlandı',
      'nefes alamadım','kafam karıştı','ne yapacağımı bilemedim','işler ters gitti','her şey ters',
      'hiçbir şey yolunda değil','geç kaldım','kaçırdım','!mahvettim','!mahvoldum','berbat ettim','yanlış yaptım',
      'ceza aldım','azarlandım','azar işittim','eleştirildim','reddedildim','!kovuldum','!işten atıldım',
      'para kaybettim','param bitti','maaş yetmiyor','borç','~fatura','~kira','pahalı',
      'yetişemiyorum','yetişemedim','son dakika','teslim tarihi','~sınav var','~toplantı var','~patron',
      'kaza yaptım','kaza geçirdim','ameliyat','aldatıldım','ihanet','ayrıldık','boşan','kandırıldım','dolandırıldım',
      '~trafik','bekledim saatlerce','kuyruğa girdim','bozuldu','çalışmıyor','arıza',
      'gına geldi','illallah','sabrım taştı','sabrım kalmadı','kafam şişti','beynim durdu','geriyor beni',
      'deli ediyor','uğraştırdı','kabus gibi','felaket','rezil oldum','utandım','mahcup oldum',
      'borca girdim','icra','haciz','maaş gecikti','şok oldum','küplere bindim','ateş püskürüyorum',
      'trafik cezası','ceza yedim','araba bozuldu','arıza yaptı','su bastı','elektrik kesildi','internet gitti','telefon bozuldu',
    ],
    tired: [
      '!yorgun','!yoruldum','!çok yoruldum','!bitkin','halsiz','dermansız','~uykum var','uykum geliyor',
      'uykusuz','uykusuz kaldım','uyuyamad','halim yok','gücüm yok','takatim kalmadı','takatsiz',
      '!üzgün','!üzgünüm','üzüldüm','!mutsuz','mutsuzum','keder','isteksiz','ağır geliyor','karamsar',
      'çökmüş','çöktüm','içim çöktü','!bitik','!bittim','!tükendim','!tükenmişlik','perişan','çaresiz','umutsuz',
      'sıkkın','canım sıkkın','moralim bozuk','moral bozukluğu','hüzün','melankoli','neşesiz','kasvetli',
      'içim sıkıştı','motivasyonum yok','bıkmışım','bezginlik','can sıkıntısı','iç sıkıntısı',
      '!depresyon','depresif','!enerjim yok','enerjim bitti','!pilim bitti','yıprandım','canım çıktı',
      '!ağladım','ağlıyorum','ağladık','gözyaşı','hıçkıra','ağlamak istiyorum','ağlamaklıyım',
      'yatağa düştüm','!yataktan çıkamadım','kalkamadım','!zor kalktım','sürünerek','güç bela',
      'sabaha kadar uyuyamadım','çok az uyudum','geç yattım','dinlenemedim',
      'gözlerim kapanıyor','gözüm açılmıyor','uyukluyorum','~esniyorum','esneyip','ayakta duramıyorum',
      'adım atmak zor','yığıldım','kollarım tutmuyor','bacaklarım ağrıyor','sırtım ağrıyor','başım ağrıyor',
      '!migren','ağrım var','hastalandım','hastayım','hasta hissediyorum','~grip','üşüttüm','öksürük',
      'ateşim var','baş dönmesi','uzun gün','uzun hafta','çok çalıştım','~mesai','fazla mesai','iki iş',
      '~nöbet','iş çıkışı','evden çıkmak istemedim','hiçbir şey yapmak istemedim','hiçbir şeye elim gitmiyor',
      'yedim yattım','sadece yattım','hiç hareket etmedim','kendimi kötü hissediyorum','kötü hissettim',
      'içim boş','boşluktayım','anlamsız','kayıp hissediyorum','!yalnız','yalnızım','yalnızlık',
      'kimsem yok','kimse anlamıyor','özledim','özlem','kaybettik','vefat','cenaze','yas',
      'yürüyecek halim yok','parmağımı kıpırdatamıyorum','beynim yandı','kafam durdu','gözlerim yanıyor',
      'ayaklarım ağrıyor','ayaklarıma kara sular indi','sabahladım','uyku tutmadı','bitap','mecalsiz',
      'dermanım kalmadı','moral bozuk','tadım yok','tadı tuzu yok','boğazım düğümlendi','gözlerim doldu',
      'içlendim','hüzünlendim','karalar bağladım','yıkıldım','sarsıldım','perişanım',
    ],
    calm: [
      '!sakin','sakinim','!huzur','!huzurlu','huzurluyum','!rahat','rahatım','rahatladım','ferahladım',
      'dingin','sessiz','derin nefes','nefes aldım','özgür','serbest','soğukkanlı','dengeli','kararlı',
      'güvende','olumlu','~normal','~iyi','iyiyim','!iyi hissediyorum','fena değil','idare eder',
      'berrak','odaklı','odaklandım','konsantre','dinlenmiş','dinlendim','yenilenmiş','zinde','!zindeyim',
      'kafam rahat','içim rahat','iç huzuru','stressiz','sorunsuz','yolunda','her şey yolunda',
      'kontrol altında','planlı','düzenli','~rutin','normal bir gün','sıradan bir gün','sakin bir gün','huzurlu bir gün',
      '!iyi uyudum','uyudum','erken yattım','uzun uyudum','deliksiz uyudum','!meditasyon','nefes egzersizi',
      '!yoga','esneme yaptım','~yürüyüş','yürüyüşe çıktım','sahilde yürüdüm','~kitap okudum','~müzik dinledim',
      '~film izledim','~dizi izledim','~kahve içtim','~çay içtim','doğada','~parka gittim','denize','sahil',
      'kumsal','orman','kuş sesleri','yağmur sesi','güneşlendim','mum yaktım','duş aldım','sıcak duş',
      'banyo yaptım','bakım yaptım','oturdum düşündüm','günlük yazdım','plan yaptım','organize ettim',
      'düzenledim','temizlik yaptım','toparladım','sohbet ettim','güzel vakit geçirdim','keyifli geçti',
      'verimli çalıştım','~ailemle','~eşimle','~çocuklarımla','sevdiklerimle','dua ettim','~namaz','ibadet',
      'şükrettim','mola verdim','ara verdim','izin günü','~hafta sonu','tatildeyim',
      '~yürüdüm','sakinleştim','gevşedim','kafamı dinledim','kafa dinledim','şöyle bir oturdum',
      'manzara izledim','balkonda oturdum','çayımı yudumladım','huzur buldum','içim ferahladı',
      'derin bir nefes','oh be','rahat bir nefes','sorun kalmadı','halloldu','rayına oturdu',
      'stres attım','balık tuttum','denize girdim','serinledim','şekerleme yaptım','kestirdim','erkenden yattım',
    ],
  },
  en: {
    happy: [
      '!happy','!joy','joyful','excited','excitement','!great','!amazing','!wonderful','!fantastic','!awesome',
      'love','loved','glad','cheerful','delighted','thrilled','ecstatic','blessed','grateful','pleased',
      'content','satisfied','excellent','!perfect','brilliant','superb','incredible','magnificent','outstanding',
      'elated','overjoyed','euphoric','blissful','radiant','proud','thankful','appreciate','marvelous',
      'terrific','spectacular','phenomenal','!over the moon','!best day','made my day','good vibes',
      'stoked','pumped','hyped','!in love','date went well','good news','great news',
      'laughed','laughing','giggled','celebrated','cheered','danced','sang','hugged','kissed','smiled','grinned',
      'we won','won the game','achieved','succeeded','completed','accomplished','nailed it','killed it','crushed it','aced',
      'went out','hung out','met friends','~party','gathered','reunited','caught up with','laughed so hard','hilarious',
      'traveled','visited','explored','~vacation','~holiday','beach day','~sunny','sunshine',
      'delicious','yummy','tasty','ate well','enjoyed','treat myself','treated myself',
      'worked out','jogged','went swimming','hiked','cycled','went for a run',
      'bought','got a gift','surprised','unexpected good','!got promoted','promotion','got a raise','~bonus',
      'passed the exam','got the job','engagement','engaged','wedding','newborn','my baby','puppy','kitten',
      'complimented','praised','appreciated','woke up energized','productive day','proud of myself','so proud',
    ],
    stressed: [
      '!angry','so mad','mad at','!furious','hate','hatred','!terrible','!awful','!stressed','stressing out',
      '!anxious','anxiety','worried','worry','nervous','frustrating','frustrated','annoyed','irritated','irritating',
      'upset','!panic','panicking','!panic attack','scared','fear','fearful','!overwhelmed','fed up','sick of',
      'horrible','dreadful','outraged','infuriated','livid','enraged','aggravated','agitated','tense','tension',
      'pressure','under pressure','burden','unbearable','!losing my mind','freaking out','freaked out',
      '!breaking down','overloaded','swamped','too much work','workload',
      'pissed','damn','shit','fuck','fucking','bullshit','asshole','bastard','idiot','stupid','moron','jerk',
      'dumbass','crap','what the hell','screw this','hate this','hate my life','what the fuck','are you kidding',
      'yelled','screamed','shouted','fought','argued','argument','had a fight','slammed','threw','broke something',
      'lost temper','hung up','stormed out','confronted','couldnt sleep from stress','stayed up worrying','overthinking',
      'panicked','heart racing','hands shaking','couldnt breathe','running late','missed the bus','missed the flight',
      'failed','messed up','screwed up','made a mistake','got yelled at','got criticized','got rejected','!got fired',
      'lost money','lost job','accident','crash','emergency','locked out','lost my keys',
      'stuck in traffic','traffic jam','road rage','waited forever','long queue','delayed',
      'broken','not working','crashed','corrupted','lost data','~deadline','deadline tomorrow','overdue',
      'behind schedule','behind on','running out of time','!breakup','broke up','!divorce','cheated on','betrayed',
      'lied to me','scammed','~bills','~rent','debt','cant afford',"can't afford",'!disaster','!nightmare','!worst day',
      '~boss','~exam','test tomorrow','toxic','drama','spilled','ruined',
      'sick and tired of','fed up with','car broke down','power went out','internet went down','got a fine','parking ticket',
    ],
    tired: [
      '!tired','!exhausted','sleepy','!drained','weary','fatigue','fatigued','bored','boring','!sad','sadness',
      '!depressed','depression','hopeless','miserable','disappointed','disappointment','!lonely','loneliness',
      'empty','numb','gloomy','melancholy','melancholic','feeling down','feeling low','feeling blue',
      'unmotivated','sluggish','!burned out','!burnt out','burnout','worn out','!heartbroken','devastated',
      'shattered','helpless','worthless','meaningless','pointless','no energy','zero energy','dull','lifeless',
      'apathetic','indifferent','!dead tired','wiped out','knackered','!running on empty','sleep deprived',
      'emotionally drained','heavy heart','!grief','grieving','mourning','miss him','miss her','homesick',
      'cried','crying','sobbed','tears','wept','broke down','cried myself to sleep','teary',
      'couldnt get out of bed','stayed in bed','didnt move','couldnt sleep','barely slept','slept poorly',
      'insomnia','no sleep','all nighter','all-nighter','jet lag','jetlag','yawning','eyes closing','nodding off',
      'dozing','dragged myself','dragging myself','barely walked','no strength','legs heavy',
      'worked too much','overworked','too many hours','exhausting','long day','long week','endless day',
      'got sick','feeling sick','sick today','headache','!migraine','backache','body ache','sore all over','aching',
      '~flu','fever','ate nothing','no appetite','skipped meals','forgot to eat','stayed home','couldnt go out',
      'didnt want to move','lost someone','missing someone','heartache',
      'can barely move','feet are killing me','brain is fried','no sleep at all',
    ],
    calm: [
      '!calm','!peaceful','!relaxed','serene','quiet','balanced','centered','clear headed','focused','mindful',
      'steady','stable','comfortable','im fine',"i'm fine",'feeling fine','okay','alright','neutral','composed',
      'collected','tranquil','grounded','present','settled','!at peace','refreshed','energized','recharged',
      'renewed','restored','~chill','chilled out','unwind','unwinding','wind down','peace of mind','no worries',
      'stress free','under control','sorted','~routine','ordinary day','nothing special','slow morning',
      'lazy sunday','cozy','comfy',
      'meditated','meditation','breathing exercises','!yoga','stretched','rested','!slept well','good sleep',
      'napped','woke up refreshed','well rested','early night','reading','journaled','wrote','reflected',
      'thought clearly','walked','strolled','wandered','nature walk','~park','~beach','fresh air','sunset','sunrise',
      'ocean','waves','rain sounds','candle','hot shower','warm bath','self care','self-care','spa day','gratitude',
      'prayed','~prayer','deep breath','took a break','day off','~weekend','~coffee','cup of tea','drank tea',
      'cooked','baked','gardened','crafted','organized','planned','cleaned','tidied up','decluttered',
      'spent time with family','quality time','good conversation','laughed with friends','enjoyed the moment',
      'beautiful day','nice weather','ticked off list','productive','watched a good movie','listened to music','~hobby',
      'took a walk','went for a walk','cleared my head','watched the sunset','let off steam',
    ],
  },
  es: {
    happy: [
      '!feliz','!alegre','contento','!maravilloso','!fantástico','genial','increíble','emocionado','encantado',
      'satisfecho','estupendo','excelente','glorioso','radiante','eufórico','dichoso','animado','positivo',
      'entusiasmado','agradecido','bendecido','!perfecto','orgulloso','amoroso','!felicísimo','contentísimo',
      'de maravilla','!qué alegría','buenas noticias','me ascendieron','aprobé el examen','conseguí trabajo',
      'enamorado','boda','cumpleaños','~vacaciones','día de playa','me encantó','riquísimo','qué risa',
      'muy divertido','orgulloso de mí',
      'reí','celebré','bailé','canté','abracé','besé','sonreí','gané','logré','conseguí','terminé','completé',
      'triunfé','salí','me encontré con amigos','viajé','exploré','disfruté','comí bien','delicioso',
      'me relajé','me divertí','hice ejercicio','corrí','nadé','caminé','fui al gimnasio',
    ],
    stressed: [
      '!enojado','!furioso','odio','!terrible','!horrible','!estresado','!ansioso','nervioso','frustrado',
      'molesto','irritado','enfadado','!pánico','!ataque de pánico','miedo','!abrumado','harto','insoportable',
      'espantoso','angustiado','desesperado','agitado','tenso','presionado','agobiado','sin control',
      'no aguanto más','hasta las narices',
      'mierda','joder','coño','hostia','cabron','imbécil','idiota','estúpido','maldito','puta','puto','inútil','desgraciado',
      'grité','peleé','discutí','discusión','golpeé','rompí','no pude dormir','me quedé despierto preocupado',
      'me entró pánico','llegué tarde','fallé','me equivoqué','lo arruiné','perdí','me despidieron','perdí dinero',
      'accidente','emergencia','ruptura','divorcio','me engañó','deudas','~facturas','~alquiler','sin dinero',
      '~atasco','~tráfico','fecha límite','qué desastre','pesadilla','el peor día','~jefe','examen mañana',
    ],
    tired: [
      '!cansado','!agotado','somnoliento','drenado','aburrido','!triste','!deprimido','sin esperanza','miserable',
      'decepcionado','solo','vacío','melancólico','bajón','desanimado','desmotivado','extenuado','destrozado',
      'sin energía','sin fuerzas','apático','indiferente','sin ganas','!agotadísimo','muerto de cansancio',
      'lloré','llorando','no pude levantarme','me quedé en cama','no dormí','dormí mal','insomnio','sin dormir',
      'trasnoché','ojeras','bostezando','ojos pesados','me arrastraba','trabajé demasiado','día agotador',
      'semana larga','enfermo','me enfermé','fiebre','migraña','~gripe','dolor de cabeza','dolor de espalda',
      'todo me duele','no comí','sin apetito','luto','extraño a',
    ],
    calm: [
      '!tranquilo','!pacífico','!relajado','sereno','silencioso','equilibrado','centrado','estable','cómodo',
      '~bien','neutral','compuesto','seguro','apacible','descansado','renovado','fresco','!en paz','relajadísimo',
      'sin preocupaciones','todo bajo control','todo en orden','día tranquilo','mañana tranquila',
      'medité','respiré hondo','respiré profundo','!yoga','estiré','descansé','dormí bien','descansé bien',
      'leí','escribí','reflexioné','caminé','~parque','~playa','naturaleza','aire fresco','atardecer','amanecer',
      '~café','~té','cociné','organicé','limpié','tiempo en familia','buena conversación','disfruté el momento',
      'día soleado','ducha caliente','baño caliente','autocuidado','día libre','~fin de semana',
    ],
  },
  fr: {
    happy: [
      '!heureux','!joyeux','content','!merveilleux','!fantastique','génial','incroyable','excité','ravi',
      'satisfait','excellent','magnifique','euphorique','enchanté','positif','enthousiaste','radieux','fier',
      'reconnaissant','béni','!parfait','superbe','formidable','épanoui','comblé','rayonnant','!très heureux',
      '!trop content','quelle joie','bonne nouvelle','promu','réussi mon examen','trouvé un travail','amoureux',
      'mariage','anniversaire','~vacances','~plage','trop drôle','mort de rire','fier de moi','cadeau',
      'célébré','dansé','chanté','embrassé','souri','gagné','réussi','accompli','terminé','sorti',
      'rencontré des amis','voyagé','exploré','bien mangé','délicieux','me suis amusé','fait du sport',
      'couru','nagé','marché','été au gym',
    ],
    stressed: [
      '!en colère','!furieux','déteste','!terrible','!horrible','!stressé','!anxieux','nerveux','frustré',
      'irrité','énervé','!panique','!crise de panique','peur','submergé','insupportable','angoissé','désespéré',
      'agité','tendu','sous pression','débordé','hors de contrôle','je n\'en peux plus','ras le bol',
      'merde','putain','bordel','connard','idiot','stupide','imbécile','salaud','chiant','crétin',
      'crié','disputé','dispute','me suis battu','cassé quelque chose','pas pu dormir',
      'resté éveillé à m\'inquiéter','paniqué','arrivé en retard','ai raté','me suis trompé','ai tout raté',
      'licencié','perdu de l\'argent','accident','urgence','rupture','divorce','trompé','dettes','~factures',
      '~loyer','fauché','embouteillage','~trafic','date limite','cauchemar','pire journée','~patron','examen demain',
    ],
    tired: [
      '!fatigué','!épuisé','!crevé','somnolent','ennuyé','!triste','!déprimé','sans espoir','misérable','déçu',
      'seul','vide','mélancolique','démotivé','à bout','brisé','sans énergie','apathique','indifférent',
      'mort de fatigue','nuit blanche','déprime','coup de blues',
      'pleuré','n\'ai pas pu me lever','resté au lit','n\'ai pas dormi','mal dormi','insomnie','yeux lourds',
      'me suis traîné','bâillé','trop travaillé','journée épuisante','longue semaine','malade','tombé malade',
      'fièvre','migraine','~grippe','courbatures','mal de tête','mal de dos','pas mangé','sans appétit',
      'deuil','il me manque','elle me manque',
    ],
    calm: [
      '!calme','!paisible','!détendu','serein','silencieux','équilibré','centré','stable','confortable','~bien',
      'neutre','composé','!tranquille','reposé','renouvelé','frais','!en paix','zen','sans souci','tout va bien',
      'sous contrôle','journée tranquille',
      'médité','respiré profondément','respiré un bon coup','!yoga','étiré','bien dormi','lu','écrit','réfléchi',
      'marché','~parc','~plage','nature','air frais','coucher de soleil','~café','~thé','cuisiné','organisé',
      'nettoyé','temps en famille','bonne conversation','profité du moment','belle journée','douche chaude',
      'bain chaud','jour de congé','~week-end',
    ],
  },
  de: {
    happy: [
      '!glücklich','freudig','!fröhlich','!wunderbar','!fantastisch','toll','unglaublich','aufgeregt','begeistert',
      'zufrieden','ausgezeichnet','herrlich','euphorisch','positiv','enthusiastisch','dankbar','gesegnet',
      '!perfekt','super','stolz','strahlend','überglücklich','!sehr glücklich','!riesig gefreut','gute nachrichten',
      'befördert','prüfung bestanden','job bekommen','verliebt','hochzeit','geburtstag','~urlaub','strandtag',
      'sehr lecker','so gelacht','stolz auf mich','geschenk bekommen',
      'gelacht','gefeiert','getanzt','gesungen','umarmt','geküsst','gelächelt','gewonnen','erreicht','geschafft',
      'abgeschlossen','ausgegangen','freunde getroffen','gereist','erkundet','genossen','gut gegessen','lecker',
      'entspannt','erholt','spaß gehabt','sport gemacht','gerannt','geschwommen','gewandert','ins gym gegangen',
    ],
    stressed: [
      '!wütend','zornig','hasse','!schrecklich','!gestresst','ängstlich','nervös','frustriert','gereizt',
      'verärgert','!panik','!panikattacke','angst','überwältigt','unerträglich','verzweifelt','aufgewühlt',
      'angespannt','unter druck','überfordert','außer kontrolle','ich kann nicht mehr',
      'scheiße','verdammt','mist','idiot','blödmann','dumm','bescheuert','arschloch','trottel','vollidiot',
      'zum kotzen','depp',
      'geschrien','gestritten','streit','gekämpft','etwas kaputtgemacht','nicht schlafen können',
      'wach gelegen und gegrübelt','panik bekommen','zu spät gekommen','zu spät dran','versagt','fehler gemacht',
      'alles vermasselt','gefeuert worden','geld verloren','unfall','notfall','trennung','scheidung','betrogen',
      'schulden','rechnungen','~miete','pleite','~stau','~verkehr','abgabetermin','!frist','katastrophe',
      'albtraum','schlimmster tag','~chef','prüfung morgen',
    ],
    tired: [
      '!müde','!erschöpft','!todmüde','schläfrig','gelangweilt','!traurig','!deprimiert','hoffnungslos','elend',
      'enttäuscht','einsam','leer','melancholisch','unmotiviert','!ausgebrannt','gebrochen','keine energie',
      'apathisch','!fix und fertig','!kaputt','durchgemacht','ausgelaugt','niedergeschlagen',
      'geweint','nicht aufstehen können','im bett geblieben','nicht geschlafen','schlecht geschlafen',
      'schlaflosigkeit','schwere augen','mich geschleppt','gähne','zu viel gearbeitet','erschöpfender tag',
      'lange woche','krank','krank geworden','fieber','migräne','~grippe','kopfschmerzen','rückenschmerzen',
      'gliederschmerzen','nichts gegessen','kein appetit','trauer','vermisse ihn','vermisse sie',
    ],
    calm: [
      '!ruhig','!friedlich','!entspannt','!gelassen','still','ausgeglichen','klar','stabil','wohl','neutral',
      'sicher','besonnen','gefasst','erholt','frisch','gechillt','sorgenfrei','alles im griff','alles gut',
      'ruhiger tag','ausgeschlafen',
      'meditiert','tief geatmet','tief durchgeatmet','yoga gemacht','gedehnt','gut geschlafen','gelesen',
      'geschrieben','nachgedacht','spaziert','~park','~strand','natur','frische luft','sonnenuntergang',
      '~kaffee','~tee','gekocht','organisiert','aufgeräumt','zeit mit familie','gutes gespräch',
      'den moment genossen','schöner tag','heiße dusche','warmes bad','freier tag','~wochenende',
    ],
  },
  ar: {
    happy: [
      '!سعيد','!فرحان','مبتهج','!رائع','ممتاز','مبهج','مسرور','متحمس','شاكر','ممتن','عظيم','بديع','مذهل',
      'جميل','لطيف','بهجة','فرح','سرور','ابتهاج','انشراح','فخور','!سعيد جداً','!فرحان جداً','خبر جميل',
      'ترقيت','نجحت في الامتحان','حصلت على وظيفة','واقع في الحب','زفاف','عيد ميلاد','~إجازة','يوم على البحر',
      'لذيذ جداً','ضحكت كثيراً','فخور بنفسي','هدية',
      'ضحكت','احتفلت','رقصت','غنيت','احتضنت','ابتسمت','فزت','نجحت','أكملت','انتهيت','خرجت','قابلت أصدقاء',
      'سافرت','استكشفت','استمتعت','أكلت جيداً','لذيذ','استرحت','مرحت','مارست الرياضة','ركضت','سبحت','تمشيت',
    ],
    stressed: [
      '!غاضب','محبط','كاره','!فظيع','مجنون','!قلق','خائف','مرهق','لا أطيق','مزعج','!متوتر','مضغوط','مرعوب',
      '!هلع','ذعر','!نوبة هلع','ما عاد أتحمل','مش قادر',
      'غبي','أحمق','يلعن','ملعون','لعنة','ابن حرام',
      'صرخت','تشاجرت','خناقة','شجار','كسرت شيئاً','لم أنم من القلق','بقيت صاحياً قلقاً','أصابني الهلع',
      'تأخرت','فشلت','أخطأت','أفسدت كل شيء','خسرت','فقدت عملي','خسرت مالاً','حادثة','طوارئ',
      'انفصال','طلاق','خانني','ديون','فواتير','~إيجار','مفلس','~زحمة','ازدحام','موعد التسليم','متأخر',
      'كارثة','كابوس','أسوأ يوم','~المدير','امتحان غداً',
    ],
    tired: [
      '!تعبان','!مرهق','نعسان','!حزين','!مكتئب','يائس','بائس','خائب','وحيد','فارغ','بلا طاقة','لامبال',
      'بلا حماس','منهك','!تعبان جداً','!منهك تماماً','ميت من التعب','محبط جداً',
      'بكيت','لم أستطع النهوض','بقيت في السرير','لم أنم','نمت بشكل سيء','أرق','سهرت الليل','أتثاءب',
      'عيون ثقيلة','جررت نفسي','عملت كثيراً','يوم مرهق','أسبوع طويل','مريض','مرضت','حمى','صداع نصفي',
      '~إنفلونزا','صداع','آلام الظهر','جسمي يؤلمني','لم آكل','بلا شهية','حداد','أفتقده','أفتقدها',
    ],
    calm: [
      '!هادئ','!مرتاح','سكينة','توازن','واضح','مستقر','بخير','محايد','منتعش','متجدد','!بسلام','مطمئن',
      'مسترخ','مرتاح البال','بدون قلق','كل شيء تمام','كل شيء تحت السيطرة','يوم هادئ',
      'تأملت','تنفست بعمق','!يوغا','مددت','نمت جيداً','نمت كويس','قرأت','كتبت','تمشيت','~حديقة','~شاطئ',
      'طبيعة','هواء نقي','غروب','~قهوة','~شاي','طبخت','نظمت','نظفت','وقت مع العائلة','محادثة جيدة',
      'استمتعت باللحظة','يوم جميل','دش ساخن','حمام دافئ','يوم إجازة','~نهاية الأسبوع','مستريح',
    ],
  },
  ru: {
    happy: [
      '!счастливый','!счастлив','!радостный','веселый','!отличный','!замечательный','фантастический',
      'восхитительный','взволнованный','доволен','превосходный','великолепный','позитивный','благодарный',
      'гордый','!на седьмом небе','переполнен радостью','!очень счастлив','!так рад','хорошие новости',
      'повысили','сдал экзамен','получил работу','влюблён','свадьба','день рождения','~отпуск','день на пляже',
      'очень вкусно','так смеялся','горжусь собой','подарок',
      'смеялся','праздновал','танцевал','пел','обнимал','улыбался','победил','достиг','справился','завершил',
      'закончил','вышел','встретил друзей','путешествовал','наслаждался','хорошо поел','вкусно','отдохнул',
      'расслабился','повеселился','занимался спортом','бегал','плавал','ходил гулять','в спортзал',
    ],
    stressed: [
      '!злой','сердитый','ненавижу','!ужасный','!стресс','!тревожный','нервный','расстроенный','раздражённый',
      '!паника','!паническая атака','страх','подавленный','невыносимый','напряжённый','под давлением',
      'перегружен','больше не могу','достало',
      'чёрт','блин','идиот','дурак','тупой','сволочь','придурок','мудак','нахрен','твою мать','чёрт возьми',
      'кричал','ругался','скандал','ссора','что-то сломал','не мог спать от стресса','лежал и переживал',
      'запаниковал','опоздал','опаздываю','провалил','ошибся','всё испортил','потерял','уволили',
      'потерял деньги','авария','чрезвычайная','расставание','развод','изменил','изменила','долги','счета',
      '~аренда','нет денег','~пробка','дедлайн','катастрофа','кошмар','худший день','~начальник','экзамен завтра',
    ],
    tired: [
      '!устал','!измотан','сонный','скучно','!грустный','!депрессия','безнадёжный','несчастный','разочарован',
      '!одинокий','пустой','меланхоличный','без сил','апатичный','равнодушный','!выгорел','!смертельно устал',
      '!выжат','тоска','подавлен','разбит',
      'плакал','не смог встать','лежал в постели','не спал','плохо спал','бессонница','не спал всю ночь',
      'зеваю','тяжёлые веки','еле тащился','слишком много работал','изматывающий день','длинная неделя',
      'заболел','температура','мигрень','~грипп','головная боль','боль в спине','всё болит','не ел',
      'нет аппетита','траур','скучаю по нему','скучаю по ней',
    ],
    calm: [
      '!спокойный','!спокойно','мирный','!расслабленный','тихий','сбалансированный','ясный','стабильный',
      '~хорошо','нейтральный','отдохнувший','обновлённый','свежий','спокойно на душе','без забот',
      'всё под контролем','всё хорошо','спокойный день','выспался','отдохнул',
      'медитировал','глубоко дышал','глубоко вдохнул','!йога','потянулся','хорошо спал','читал','писал',
      'размышлял','гулял','~парк','~пляж','природа','свежий воздух','закат','~кофе','~чай','готовил',
      'организовал','убрался','время с семьёй','хороший разговор','наслаждался моментом','хороший день',
      'горячий душ','тёплая ванна','выходной','~выходные',
    ],
  },
  pt: {
    happy: [
      '!feliz','!alegre','contente','!maravilhoso','!fantástico','incrível','animado','encantado','satisfeito',
      'excelente','magnífico','eufórico','positivo','entusiasmado','grato','!perfeito','ótimo','orgulhoso',
      'radiante','!muito feliz','!felicíssimo','boas notícias','fui promovido','passei na prova',
      'consegui emprego','apaixonado','casamento','aniversário','~férias','dia de praia','ri demais',
      'orgulhoso de mim','presente',
      'celebrei','dancei','cantei','abracei','sorri','ganhei','consegui','completei','terminei','saí',
      'me encontrei com amigos','viajei','explorei','comi bem','delicioso','me relaxei','me diverti',
      'fiz exercício','corri','nadei','caminhei','fui à academia',
    ],
    stressed: [
      '!com raiva','!furioso','odeio','!terrível','!horrível','!estressado','!ansioso','nervoso','frustrado',
      'irritado','com medo','!pânico','!ataque de pânico','sobrecarregado','insuportável','desesperado',
      'agitado','tenso','pressionado','não aguento mais','de saco cheio',
      'merda','porra','caralho','idiota','burro','imbecil','maldito','desgraçado',
      'gritei','briguei','briga','discuti','quebrei algo','não consegui dormir','fiquei acordado preocupado',
      'entrei em pânico','cheguei atrasado','atrasado','falhei','errei','estraguei tudo','perdi',
      'fui demitido','perdi dinheiro','acidente','emergência','término','divórcio','me traiu','dívidas',
      '~contas','~aluguel','sem dinheiro','~trânsito','engarrafamento','prazo','desastre','pesadelo',
      'pior dia','~chefe','prova amanhã',
    ],
    tired: [
      '!cansado','!exausto','com sono','entediado','!triste','!deprimido','sem esperança','miserável',
      'decepcionado','solitário','vazio','melancólico','sem energia','desmotivado','esgotado','destruído',
      'apático','indiferente','!morto de cansaço','!acabado','pra baixo','desanimado',
      'chorei','não consegui me levantar','fiquei na cama','não dormi','dormi mal','insônia','virei a noite',
      'bocejando','olhos pesados','me arrastei','trabalhei demais','dia exaustivo','semana longa',
      'fiquei doente','febre','enxaqueca','~gripe','dor de cabeça','dor nas costas','corpo doendo',
      'não comi','sem apetite','luto','sinto falta dele','sinto falta dela',
    ],
    calm: [
      '!calmo','!pacífico','!relaxado','sereno','silencioso','equilibrado','centrado','claro','estável',
      'confortável','~bem','neutro','descansado','renovado','de boa','sem preocupações','tudo sob controle',
      'tudo certo','dia tranquilo',
      'meditei','respirei fundo','!yoga','alonguei','dormi bem','li','escrevi','refleti','caminhei','~parque',
      '~praia','natureza','ar fresco','pôr do sol','~café','~chá','cozinhei','organizei','limpei',
      'tempo com família','boa conversa','aproveitei o momento','dia lindo','banho quente','dia de folga',
      '~fim de semana',
    ],
  },
  it: {
    happy: [
      '!felice','gioioso','contento','!meraviglioso','!fantastico','incredibile','emozionato','soddisfatto',
      'eccellente','magnifico','euforico','positivo','entusiasta','grato','!perfetto','stupendo','orgoglioso',
      'raggiante','!felicissimo','!contentissimo','belle notizie','promosso','passato l\'esame','trovato lavoro',
      'innamorato','matrimonio','compleanno','~vacanza','giornata al mare','buonissimo','riso tantissimo',
      'fiero di me','regalo',
      'celebrato','ballato','cantato','abbracciato','sorriso','vinto','raggiunto','completato','finito','uscito',
      'incontrato amici','viaggiato','esplorato','mangiato bene','delizioso','mi sono rilassato','fatto sport',
      'corso','nuotato','camminato','andato in palestra',
    ],
    stressed: [
      '!arrabbiato','!furioso','odio','!terribile','!orribile','!stressato','!ansioso','nervoso','frustrato',
      'irritato','spaventato','!panico','!attacco di panico','sopraffatto','insopportabile','disperato',
      'agitato','teso','sotto pressione','non ce la faccio più',
      'cazzo','merda','stronzo','idiota','stupido','imbecille','maledetto','bastardo','vaffanculo',
      'urlato','litigato','litigio','rotto qualcosa','non riuscivo a dormire','rimasto sveglio preoccupato',
      'attacco di panico','arrivato tardi','in ritardo','ho fallito','ho sbagliato','ho rovinato tutto',
      'licenziato','perso soldi','incidente','emergenza','rottura','divorzio','tradito','debiti','~bollette',
      '~affitto','al verde','~traffico','scadenza','disastro','incubo','giornata peggiore','~capo','esame domani',
    ],
    tired: [
      '!stanco','!esausto','!stanchissimo','assonnato','annoiato','!triste','!depresso','senza speranza',
      'miserabile','deluso','vuoto','malinconico','senza energia','demotivato','!distrutto','apatico',
      'indifferente','morto di stanchezza','giù di morale','abbattuto',
      'pianto','non riuscivo ad alzarmi','rimasto a letto','non ho dormito','dormito male','insonnia',
      'notte in bianco','sbadiglio','occhi pesanti','mi trascinavo','lavorato troppo','giornata estenuante',
      'settimana lunga','mi sono ammalato','febbre','emicrania','~influenza','mal di testa','mal di schiena',
      'dolori ovunque','non ho mangiato','senza appetito','lutto','mi manca',
    ],
    calm: [
      '!calmo','!pacifico','!rilassato','sereno','silenzioso','equilibrato','centrato','chiaro','stabile',
      'comodo','~bene','neutro','riposato','rinnovato','tranquillissimo','senza pensieri','tutto sotto controllo',
      'tutto bene','giornata tranquilla',
      'meditato','respirato profondamente','respiro profondo','!yoga','allungato','dormito bene',
      'dormito benissimo','letto un libro','scritto','riflettuto','camminato','~parco','~spiaggia','natura',
      'aria fresca','tramonto','~caffè','~tè','cucinato','organizzato','pulito','tempo con famiglia',
      'bella conversazione','goduto il momento','bella giornata','doccia calda','bagno caldo','giorno libero','~weekend',
    ],
  },
  ko: {
    happy: [
      '!행복','!기쁨','신남','!대박','!완벽','멋진','놀라운','좋아','만족','훌륭','굉장','황홀','감사','!최고',
      '완전좋아','기분좋아','설레','두근두근','뿌듯해','자랑스러워','흐뭇해','기뻐','반가워','신나','흥분돼',
      '!너무행복해','!정말기뻐','좋은소식','승진했어','시험합격','취직했어','사랑에빠졌어','결혼식','생일',
      '~휴가','바다갔어','정말맛있','빵터졌','내가자랑스러워','선물받았어',
      '웃었어','축하했어','춤췄어','노래했어','안았어','미소지었어','이겼어','성공했어','완료했어','끝냈어',
      '나갔어','친구만났어','여행했어','즐겼어','맛있게먹었어','맛있었어','놀았어','운동했어','달렸어',
      '수영했어','걸었어','헬스장갔어',
    ],
    stressed: [
      '!화났어','!짜증','싫어','!끔찍','!스트레스','!불안','긴장','좌절','두려워','!패닉','!공황','무서워',
      '참을수없어','!최악','억울해','답답해','열받아','화가나','빡쳐','!미치겠어','돌아버리겠어','더는못참아',
      '씨발','개새끼','병신','지랄','미친','바보','멍청이','개같아','죽겠어','엿같아',
      '소리질렀어','싸웠어','다퉜어','다툼','때렸어','부쉈어','잠을못잤어','걱정하다밤샜어','패닉왔어',
      '늦었어','실패했어','실수했어','망쳤어','잃었어','잘렸어','돈잃었어','사고났어','응급',
      '이별','이혼','바람피웠','빚','청구서','~월세','돈없어','~차막혀','마감','악몽','최악의하루','~상사','내일시험',
    ],
    tired: [
      '!피곤','!지쳤어','졸려','지루해','!슬퍼','!우울','절망','불행해','실망','!외로워','공허해','의욕없어',
      '!번아웃','무기력','무감각','기운없어','힘없어','늘어져','!너무피곤해','!완전지쳤어','다탔어','상심','그리워',
      '울었어','일어날수없었어','침대에누워있었어','잠못잤어','잠을잘못잤어','불면증','밤샜어','하품',
      '눈이무거워','간신히걸었어','너무많이일했어','힘든하루','긴한주','아팠어','아프기시작','열나','두통',
      '편두통','~감기','허리아파','온몸이아파','못먹었어','입맛없어','축처져',
    ],
    calm: [
      '!차분','!평화로워','!편안','고요해','균형잡힌','명확해','안정적','~괜찮아','중립적','쉬었어','재충전',
      '상쾌해','평온해','마음이편해','걱정없어','다괜찮아','문제없어','조용한하루','개운해',
      '명상했어','심호흡','!요가','스트레칭','잘잤어','푹잤어','책읽었어','글썼어','생각했어','~공원','~해변',
      '자연','신선한공기','노을','~커피','~차마셨','요리했어','정리했어','청소했어','가족과시간','좋은대화',
      '순간을즐겼어','좋은하루','따뜻한샤워','반신욕','쉬는날','~주말',
    ],
  },
  zh: {
    happy: [
      '!快乐','!高兴','!开心','!太棒了','!完美','精彩','兴奋','满足','出色','极好','欣喜','感激','!幸福',
      '!太好了','很棒','自豪','感恩','喜悦','愉快','美好','振奋','充实','成就感','!非常开心','!太开心了',
      '好消息','升职了','考试通过','找到工作','恋爱了','婚礼','生日','~假期','去海边','太好吃了','笑死我了',
      '为自己骄傲','收到礼物',
      '笑了','庆祝','跳舞','唱歌','拥抱','微笑','赢了','成功了','完成了','出去了','见朋友','旅行','探索',
      '好好吃了','好吃','放松了','玩了','锻炼','跑步','游泳','散步','去健身房',
    ],
    stressed: [
      '!生气','!愤怒','讨厌','!可怕','!压力','!焦虑','紧张','沮丧','烦躁','恐惧','!恐慌','害怕','受不了',
      '!最糟糕','委屈','憋屈','抓狂','!崩溃','气死了','烦死了','受够了','受不了了',
      '操','他妈的','傻逼','白痴','混蛋','蠢货',
      '大喊','吵架','争吵','气到哭','摔东西','睡不着','担心到天亮','!恐慌发作','迟到','要迟到了','失败了',
      '犯错','搞砸了','丢失','被炒了','丢钱','出事了','紧急情况','分手','离婚','被背叛','欠债','账单',
      '~房租','没钱了','~堵车','截止日期','灾难','噩梦','最差的一天','~老板','明天考试',
    ],
    tired: [
      '!累了','!精疲力竭','!累死了','困了','无聊','!伤心','!沮丧','绝望','悲惨','失望','!孤独','空虚','忧郁',
      '没动力','无精打采','麻木','!倦怠','没劲','提不起劲','!心累','!筋疲力尽','情绪低落','难过','没力气',
      '哭了','起不来床','躺着不动','没睡','睡不好','失眠','熬夜','通宵','打哈欠','眼皮沉','硬撑着走',
      '工作太多','漫长的一周','生病了','发烧','头疼','偏头痛','~感冒','腰疼','浑身疼','没吃东西','没胃口',
      '哀悼','想他','想她',
    ],
    calm: [
      '!平静','!平和','!放松','宁静','安静','平衡','清晰','稳定','~还好','中立','休息好了','精神焕发',
      '!神清气爽','安宁','淡定','心里踏实','没有烦恼','一切顺利','一切都好','安静的一天','睡得很好',
      '冥想','深呼吸','!瑜伽','拉伸','睡得好','读书','写作','思考','散步了','~公园','~海边','大自然',
      '新鲜空气','日落','~喝咖啡','~喝茶','做饭','整理','打扫','陪家人','好好聊天','享受当下','美好的一天',
      '热水澡','泡澡','休息日','~周末',
    ],
  },
};

// ---- Ağırlık işaretlerini çözümle ----
const KEYWORDS = {};
for (const [lang, moods] of Object.entries(RAW)) {
  KEYWORDS[lang] = {};
  for (const [mood, list] of Object.entries(moods)) {
    KEYWORDS[lang][mood] = list.map(e => {
      if (e[0] === '!') return [e.slice(1), 3];
      if (e[0] === '~') return [e.slice(1), 1];
      return [e, 2];
    });
  }
}

// ---- Olumsuzlama ----
// Olumsuzlanan duygu şu hedefe aktarılır:
const NEG_TARGET = { happy: 'tired', calm: 'stressed', stressed: 'calm', tired: 'calm' };

const NEG_BEFORE = {
  en: ['not','no','never','hardly','barely',"don't",'dont',"didn't",'didnt',"isn't",'isnt',"wasn't",'wasnt',"can't",'cant',"couldn't",'couldnt',"won't",'wont',"ain't",'aint','without'],
  es: ['no','nunca','jamás','jamas','sin'],
  fr: ['pas','jamais','aucun','aucune','sans'],
  de: ['nicht','kein','keine','nie','niemals','ohne'],
  ar: ['لا','ما','مش','ليس','لست','بدون'],
  ru: ['не','нет','без'],
  pt: ['não','nao','nunca','jamais','sem'],
  it: ['non','mai','senza'],
};
const NEG_AFTER = {
  tr: ['değil','değilim','değildi','değildim','yok','yoktu','kalmadı','olmadı','sayılmam'],
};

function isNegated(hay, idx, termLen, lang) {
  if (lang === 'zh') {
    const b = hay.slice(Math.max(0, idx - 3), idx);
    return b.includes('不') || b.includes('没') || b.includes('别');
  }
  if (lang === 'ko') {
    const b = hay.slice(Math.max(0, idx - 3), idx);
    const a = hay.slice(idx + termLen, idx + termLen + 3);
    return b.includes('안') || b.includes('못') || a.includes('않') || a.includes('없');
  }
  const before = NEG_BEFORE[lang];
  if (before) {
    const win = hay.slice(Math.max(0, idx - 20), idx);
    const words = win.trim().split(/\s+/).slice(-2).map(w => w.replace(/[.,!?;:'"]+/g, ''));
    if (words.some(w => before.includes(w))) return true;
  }
  const after = NEG_AFTER[lang];
  if (after) {
    const win = hay.slice(idx + termLen, idx + termLen + 18);
    const words = win.trim().split(/\s+/).slice(0, 2).map(w => w.replace(/[.,!?;:'"]+/g, ''));
    if (words.some(w => after.includes(w))) return true;
  }
  return false;
}

// ---- Analiz ----
function analyzeText(text, lang) {
  const lower = text.toLowerCase();
  const compactLangs = (lang === 'ko' || lang === 'zh');
  // Korece/Çince transkriptlerde boşluklar eşleşmeyi bozabilir; boşluksuz kopyada ara
  const hay = compactLangs ? lower.replace(/\s+/g, '') : lower;
  const dict = KEYWORDS[lang] || KEYWORDS.en;
  const scores = { happy: 0, stressed: 0, tired: 0, calm: 0 };
  const matched = [];

  // 1) Tüm eşleşmeleri topla — kelime başı sınırıyla (ko/zh hariç)
  const found = [];
  for (const [mood, entries] of Object.entries(dict)) {
    for (const [term, weight] of entries) {
      let idx = -1, from = 0;
      while (true) {
        const i = hay.indexOf(term, from);
        if (i === -1) break;
        if (compactLangs || i === 0 || !/\p{L}/u.test(hay[i - 1])) { idx = i; break; }
        from = i + 1; // kelime ortasında — sonraki eşleşmeye bak (örn. 'iyi' ⊄ 'endişeliyim')
      }
      if (idx !== -1) found.push({ mood, term, weight, idx, end: idx + term.length });
    }
  }

  // 2) Uzun eşleşme kazanır: kısa terim, onu kapsayan daha uzun bir eşleşmenin içindeyse elenir
  //    (örn. 'hiçbir şey yolunda değil' varken içindeki 'yolunda' ayrıca sayılmaz)
  const kept = found.filter(a => !found.some(b =>
    b !== a && b.term.length > a.term.length && b.term.includes(a.term) &&
    a.idx >= b.idx && a.end <= b.end
  ));

  // 3) Skorla + olumsuzlama (+ Türkçe -sIz eki = yokluk bildirir → tersine çevir)
  for (const f of kept) {
    let neg = isNegated(hay, f.idx, f.term.length, lang);
    if (!neg && lang === 'tr') {
      const after = hay.slice(f.end, f.end + 3);
      if (/^s[ıiuü]z/.test(after)) neg = true; // neşe+siz, huzur+suz, rahat+sız...
    }
    if (neg) {
      scores[NEG_TARGET[f.mood]] += f.weight;
      matched.push(`NEG "${f.term}" ${f.mood}->${NEG_TARGET[f.mood]} +${f.weight}`);
    } else {
      scores[f.mood] += f.weight;
      matched.push(`"${f.term}" ${f.mood} +${f.weight}`);
    }
  }

  console.log('Matches:', matched.slice(0, 25).join(' | ') || 'none');
  console.log('Scores:', scores);

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { moods: { calm: 45, happy: 25, stressed: 15, tired: 15 }, dominant: 'calm' };
  }

  // Güven: toplam puan arttıkça baskın duygu payı büyür (yumuşak dağılım)
  const conf = Math.min(1, total / 12);
  const pool = Math.round(38 + 47 * conf); // 42..85 arası
  const evenRest = (100 - pool) / 4;
  const noise = () => Math.floor(Math.random() * 5) - 2; // -2..+2

  const moods = {};
  let sum = 0;
  const keys = Object.keys(scores);
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      moods[k] = Math.max(2, 100 - sum);
    } else {
      moods[k] = Math.max(2, Math.round(pool * (scores[k] / total) + evenRest + noise()));
      sum += moods[k];
    }
  });

  // Toplamı 100'e sabitle
  const totalMoods = Object.values(moods).reduce((a, b) => a + b, 0);
  let dominant = keys.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
  moods[dominant] += (100 - totalMoods);
  if (moods[dominant] < 2) moods[dominant] = 2;
  dominant = keys.reduce((a, b) => (moods[a] >= moods[b] ? a : b));

  return { moods, dominant };
}

// ---- Rotalar ----
app.get('/', (req, res) => {
  res.json({ status: 'Mood Mirror Backend çalışıyor!', version: '2.0' });
});

app.post('/analyze', rateLimiter, appKeyCheck, upload.single('audio'), async (req, res) => {
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

module.exports = { analyzeText, KEYWORDS };
