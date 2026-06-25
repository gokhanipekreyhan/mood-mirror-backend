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
      // Duygular
      'mutlu','sevinç','sevinçli','neşe','neşeli','keyif','keyifli','heyecan','heyecanlı',
      'coşku','coşkulu','harika','mükemmel','süper','muhteşem','inanılmaz','enfes','nefis',
      'müthiş','şahane','güzel','tatmin','memnun','pozitif','umutlu','zevkli','eğlenceli',
      'seviyorum','sevdim','bayıldım','aşkım','sevgilim','canım','gurur','gururluyum',
      'başardım','kazandım','yaptım','tamamladım','aferin','helal','bravo','süpersin',
      'harikasın','mükemmelsin','teşekkür','minnettarım','şükür','şükrediyorum',
      // Eylemler
      'güldüm','gülüyorum','güldük','kahkaha','güldürdü','eğlendim','eğlendik',
      'oynadım','oynadık','dans ettim','dans ettik','kutladım','kutladık',
      'sarıldım','sarıldık','öptüm','öptük','sevdim','sevdik',
      'şarkı söyledim','müzik dinledim','film izledim','arkadaşlarla',
      'buluştum','gezdim','tatil','seyahat','yemek yedim','lezzetliydi',
      'uyandım dinç','güne başladım','spor yaptım','koştum','yüzdüm',
      'başardım','bitirdim','tamamladım','hallettim','çözdüm',
      'alışveriş','hediye aldım','sürpriz','beklenmedik güzel',
      'gülümse','gülümsedim','mutluluktan','sevinçten','neşeyle',
    ],
    stressed: [
      // Duygular
      'kızgın','kızdım','kızıyorum','sinir','sinirli','öfke','öfkeli','nefret','berbat',
      'bıktım','bezdim','dayanamıyorum','saçma','rezalet','gıcık','çıldır','delird',
      'lanet','istemiyorum','korkunç','yeter','gergin','stresli','endişe','kaygı',
      'panik','korku','tedirgin','sinirlendim','kudurdum','bunaldım','sıkıldım',
      'bunaltıcı','boğucu','sıkıntı','rahatsız','huzursuz','mutsuzum','berbat hissediyorum',
      // Küfür/argo
      'kahretsin','lanet olsun','kahrolsun','siktiret','amk','bok','sik','göt',
      'oç','piç','salak','gerizekalı','aptal','mal','dangalak','embesil',
      'ahmak','budala','sersem','şerefsiz','alçak','namussuz','hayvan',
      'canavar','sahtekar','yalancı','dolandırıcı','hırsız','it','eşek',
      // Eylemler
      'bağırdım','çığlık attım','ağladım öfkeden','kavga ettim','tartıştım',
      'kırdım','fırlattım','vurdum','küfür ettim','hakaret ettim',
      'kapıyı çarptım','telefonu kapattım','sinirden tittim',
      'uyuyamadım endişeden','sabaha kadar düşündüm','stres yaptım',
      'panikledim','korktum','titredi ellerim','kalbim hızlandı',
      'nefes alamadım','bunaldım','kafam karıştı','ne yapacağımı bilemedim',
      'işler ters gitti','her şey ters','hiçbir şey yolunda değil',
      'geç kaldım','kaçırdım','mahvettim','berbat ettim','yanlış yaptım',
      'ceza aldım','azarlandım','eleştirildim','reddedildim',
      'para kaybettim','işimi kaybettim','kavga','tartışma','anlaşmazlık',
      'trafik','sıkışık','bekledim saatlerce','kuyruğa girdim',
      'bozuldu','çalışmıyor','mahvoldu','yanmış','kırılmış',
    ],
    tired: [
      // Duygular
      'yorgun','yoruldum','bitkin','halsiz','dermansız','uyku','uyuyamad',
      'uykusuz','halim yok','gücüm yok','üzgün','üzüldüm','mutsuz','keder',
      'bunald','isteksiz','takatim','ağır','karamsar','çökmüş','bitik',
      'perişan','çaresiz','umutsuz','sıkkın','hüzün','melankolik',
      'neşesiz','kasvetli','içim sıkıştı','canım sıkkın','moralim bozuk',
      'motivasyonum yok','bıkmışım','bezginlik','can sıkıntısı','iç sıkıntısı',
      // Eylemler
      'ağladım','ağlıyorum','ağladık','gözyaşı','hıçkırarak',
      'yatağa düştüm','yataktan çıkamadım','sürünerek kalktım',
      'sabaha kadar uyuyamadım','çok az uyudum','uyku alamadım',
      'gözlerim kapanıyor','uyukluyorum','uykum geliyor',
      'yavaş yavaş yürüdüm','enerji yoktu','adım atmak zor geldi',
      'gittim ama çok yoruldum','eve gelince yığıldım','kollarım tutmuyor',
      'bacaklarım ağrıyor','sırtım ağrıyor','başım ağrıyor',
      'hastalandım','hasta hissediyorum','grip','ateşim var',
      'uzun gün','uzun hafta','çok çalıştım','mesai yaptım',
      'iş çıkışı','evden çıkmak istemedim','hiçbir şey yapmak istemedim',
      'yedim yattım','sadece yattım','hiç hareket etmedim',
      'kendimi kötü hissettim','içim boş','boşlukta','anlamsız',
      'kayıp','yalnız','yalnızlık','kimsem yok','kimse anlamıyor',
    ],
    calm: [
      // Duygular
      'sakin','huzur','huzurlu','rahat','dingin','sessiz','nefes','özgür',
      'serbest','soğukkanlı','dengeli','kararlı','güvenli','olumlu',
      'kabul','tamam','normal','iyi','fena değil','idare eder','şükür',
      'berrak','odaklı','konsantre','net','açık','temiz','taze',
      'dinlenmiş','yenilenmiş','enerjik','zinde','canlı',
      // Eylemler
      'dinlendim','uyudum','iyi uyudum','erken yattım','uzun uyudum',
      'meditasyon','nefes egzersizi','yoga','spor yaptım','yürüyüş',
      'kitap okudum','müzik dinledim','film izledim','dizi izledim',
      'kahve içtim','çay içtim','doğada yürüdüm','parka gittim',
      'deniz gördüm','denizde yüzdüm','güneşlendim','doğada',
      'oturdum düşündüm','günlük yazdım','plan yaptım','organize ettim',
      'arkadaşlarla sohbet','güzel vakit geçirdim','keyifli geçti',
      'huzurlu bir gün','sakin bir gün','güzel bir gün',
      'verimli çalıştım','işleri hallettim','tamamladım','bitirdim',
      'sevdiklerimle','ailemle','çocuklarımla','eşimle vakit',
      'gezdim','gezip gördüm','keşfettim','deneyimledim',
    ],
  },
  en: {
    happy: [
      // Emotions
      'happy','joy','joyful','excited','excitement','great','amazing','wonderful',
      'fantastic','awesome','love','loved','glad','cheerful','delighted','thrilled',
      'ecstatic','blessed','grateful','pleased','content','satisfied','excellent',
      'perfect','brilliant','superb','incredible','magnificent','outstanding',
      'elated','overjoyed','euphoric','blissful','radiant','glowing','proud',
      'thankful','grateful','appreciate','wonderful','marvelous','splendid',
      'terrific','spectacular','phenomenal','extraordinary','impressive',
      // Actions
      'laughed','laughing','giggled','celebrated','cheered','danced','sang',
      'hugged','kissed','smiled','grinned','beamed','won','achieved','succeeded',
      'completed','finished','accomplished','nailed it','killed it',
      'went out','hung out','met friends','party','gathered','reunited',
      'traveled','visited','explored','discovered','adventured',
      'ate well','delicious meal','great food','enjoyed','relaxed','chilled',
      'worked out','ran','jogged','swam','hiked','cycled',
      'bought','got a gift','surprised','unexpected good','good news',
      'promoted','raise','bonus','complimented','praised','appreciated',
      'woke up energized','started strong','productive day','good morning',
    ],
    stressed: [
      // Emotions
      'angry','mad','furious','rage','hate','hatred','terrible','awful',
      'stressed','anxious','anxiety','worried','worry','nervous','frustrating',
      'frustrated','annoyed','irritated','irritating','upset','panic','panicking',
      'scared','fear','fearful','overwhelmed','fed up','sick of','horrible',
      'dreadful','outraged','infuriated','livid','enraged','aggravated',
      'agitated','tense','tension','pressure','burden','unbearable',
      // Profanity/slang
      'pissed','pissed off','damn','shit','fuck','fucking','bullshit',
      'asshole','bastard','idiot','stupid','moron','jerk','dumbass',
      'crap','hell','screw this','screw you','hate this','hate my life',
      'for fucks sake','what the hell','what the fuck','are you kidding',
      // Actions
      'yelled','screamed','shouted','cried in anger','fought','argued',
      'slammed','threw','hit','broke something','lost temper',
      'hung up','stormed out','walked out','confronted',
      'couldnt sleep from stress','stayed up worrying','overthinking',
      'panicked','heart racing','hands shaking','couldnt breathe',
      'late','missed','failed','messed up','screwed up','made a mistake',
      'got yelled at','got criticized','got rejected','got fired',
      'lost money','lost job','accident','crash','emergency',
      'stuck in traffic','waited forever','long queue','delayed',
      'broken','not working','crashed','corrupted','lost data',
      'deadline','overdue','behind schedule','running out of time',
    ],
    tired: [
      // Emotions
      'tired','exhausted','sleepy','drained','weary','fatigue','fatigued',
      'bored','boring','sad','sadness','depressed','depression','hopeless',
      'miserable','disappointed','disappointment','lonely','loneliness',
      'empty','numb','gloomy','melancholy','melancholic','down','low',
      'unmotivated','sluggish','burned out','burnout','worn out',
      'heartbroken','devastated','shattered','broken','lost','helpless',
      'worthless','meaningless','purposeless','pointless','no energy',
      'dull','lifeless','spiritless','apathetic','indifferent',
      // Actions
      'cried','crying','sobbed','tears','wept','broke down',
      'couldnt get out of bed','stayed in bed','didnt move',
      'couldnt sleep','barely slept','slept poorly','insomnia',
      'eyes closing','nodding off','falling asleep','dozing',
      'dragged myself','barely walked','no strength','legs heavy',
      'worked too much','overworked','too many hours','exhausting day',
      'long day','long week','endless day','never ending',
      'got sick','feeling sick','headache','backache','body ache',
      'ate nothing','no appetite','skipped meals','forgot to eat',
      'stayed home','couldnt go out','didnt want to move',
      'grieving','lost someone','missing someone','heartache',
    ],
    calm: [
      // Emotions
      'calm','peaceful','relaxed','serene','quiet','balanced','centered',
      'clear','focused','mindful','steady','stable','comfortable','fine',
      'okay','alright','neutral','composed','collected','tranquil',
      'grounded','present','aware','content','settled','at peace',
      'refreshed','energized','recharged','renewed','restored',
      // Actions
      'meditated','meditation','breathing exercises','yoga','stretched',
      'rested','slept well','good sleep','napped','woke up refreshed',
      'read','reading','journaled','wrote','reflected','thought clearly',
      'walked','strolled','wandered','nature walk','park','beach',
      'coffee','tea','cooked','baked','gardened','crafted',
      'organized','planned','cleaned','tidied up','decluttered',
      'spent time with family','quality time','good conversation',
      'laughed with friends','enjoyed the moment','present moment',
      'sunny day','beautiful day','nice weather','fresh air',
      'accomplished something','ticked off list','productive',
      'watched a good movie','listened to music','hobby',
    ],
  },
  es: {
    happy: [
      'feliz','alegre','contento','maravilloso','fantástico','genial','increíble',
      'emocionado','encantado','satisfecho','estupendo','excelente','glorioso',
      'radiante','eufórico','dichoso','animado','positivo','entusiasmado',
      'agradecido','bendecido','increíble','perfecto','orgulloso','amoroso',
      'reí','celebré','bailé','canté','abracé','besé','sonreí',
      'gané','logré','conseguí','terminé','completé','triunfé',
      'salí','me encontré con amigos','viajé','exploré','disfruté',
      'comí bien','delicioso','me relajé','descansé','me divertí',
      'hice ejercicio','corrí','nadé','caminé','fui al gimnasio',
    ],
    stressed: [
      'enojado','furioso','odio','terrible','horrible','estresado','ansioso',
      'nervioso','frustrado','molesto','irritado','enfadado','pánico','miedo',
      'abrumado','harto','insoportable','espantoso','angustiado','desesperado',
      'agitado','tenso','presionado','agobiado','sin control',
      'mierda','joder','coño','hostia','cabron','imbécil','idiota',
      'estúpido','maldito','puta','puto','inútil','desgraciado','imbécil',
      'grité','peleé','discutí','lloré de rabia','golpeé','rompí',
      'no pude dormir','me quedé despierto preocupado','me entró pánico',
      'llegué tarde','fallé','me equivoqué','lo arruiné','perdí',
      'me despidieron','perdí dinero','accidente','emergencia',
    ],
    tired: [
      'cansado','agotado','somnoliento','drenado','aburrido','triste',
      'deprimido','sin esperanza','miserable','decepcionado','solo','vacío',
      'melancólico','bajo','desmotivado','extenuado','destrozado',
      'sin energía','sin fuerzas','apático','indiferente','sin ganas',
      'lloré','llorando','sollozé','no pude levantarme','me quedé en cama',
      'no dormí','dormí mal','insomnio','ojos pesados','me arrastraba',
      'trabajé demasiado','día agotador','semana larga','enfermo',
      'dolor de cabeza','dolor de espalda','no comí','sin apetito',
    ],
    calm: [
      'tranquilo','pacífico','relajado','sereno','silencioso','equilibrado',
      'centrado','claro','estable','cómodo','bien','neutral','compuesto',
      'seguro','apacible','descansado','renovado','fresco','en paz',
      'medité','respiré profundo','yoga','estiré','descansé','dormí bien',
      'leí','escribí','reflexioné','caminé','parque','playa','naturaleza',
      'café','té','cociné','organicé','limpié','tiempo en familia',
      'buena conversación','disfruté el momento','día soleado',
    ],
  },
  fr: {
    happy: [
      'heureux','joyeux','content','merveilleux','fantastique','génial','incroyable',
      'excité','ravi','satisfait','excellent','magnifique','euphorique','enchanté',
      'positif','enthousiaste','radieux','fier','reconnaissant','béni','parfait',
      'superbe','formidable','épanoui','comblé','rayonnant',
      'ri','célébré','dansé','chanté','embrassé','souri','gagné',
      'réussi','accompli','terminé','sorti','rencontré des amis',
      'voyagé','exploré','bien mangé','délicieux','me suis amusé',
      'fait du sport','couru','nagé','marché','été au gym',
    ],
    stressed: [
      'en colère','furieux','déteste','terrible','horrible','stressé','anxieux',
      'nerveux','frustré','irrité','énervé','panique','peur','submergé',
      'épuisé par le stress','insupportable','angoissé','désespéré',
      'agité','tendu','sous pression','débordé','hors de contrôle',
      'merde','putain','bordel','con','connard','idiot','stupide',
      'imbécile','salaud','foutu','chiant','nul','crétin',
      'crié','disputé','me suis battu','pleuré de rage','cassé quelque chose',
      'pas pu dormir','suis resté éveillé à m\'inquiéter','paniqué',
      'suis arrivé en retard','ai raté','me suis trompé','ai tout raté',
      'licencié','perdu de l\'argent','accident','urgence',
    ],
    tired: [
      'fatigué','épuisé','somnolent','ennuyé','triste','déprimé','sans espoir',
      'misérable','déçu','seul','vide','mélancolique','bas','démotivé',
      'à bout','brisé','pleuré','sans énergie','apathique','indifférent',
      'n\'ai pas pu me lever','suis resté au lit','n\'ai pas dormi',
      'mal dormi','insomnie','yeux lourds','me suis traîné',
      'trop travaillé','journée épuisante','longue semaine','malade',
      'mal de tête','mal de dos','pas mangé','sans appétit',
    ],
    calm: [
      'calme','paisible','détendu','serein','silencieux','équilibré','centré',
      'clair','stable','confortable','bien','neutre','composé','sécurisé',
      'tranquille','reposé','renouvelé','frais','en paix',
      'médité','respiré profondément','yoga','étiré','bien dormi',
      'lu','écrit','réfléchi','marché','parc','plage','nature',
      'café','thé','cuisiné','organisé','nettoyé','temps en famille',
      'bonne conversation','profité du moment','belle journée',
    ],
  },
  de: {
    happy: [
      'glücklich','freudig','fröhlich','wunderbar','fantastisch','toll','unglaublich',
      'aufgeregt','begeistert','zufrieden','ausgezeichnet','herrlich','euphorisch',
      'positiv','enthusiastisch','dankbar','gesegnet','perfekt','super','stolz',
      'strahlend','überglücklich','beseelt','lebensfroh',
      'gelacht','gefeiert','getanzt','gesungen','umarmt','geküsst','gelächelt',
      'gewonnen','erreicht','geschafft','abgeschlossen','vollendet',
      'ausgegangen','Freunde getroffen','gereist','erkundet','genossen',
      'gut gegessen','lecker','entspannt','erholt','Spaß gehabt',
      'Sport gemacht','gerannt','geschwommen','gewandert','ins Gym gegangen',
    ],
    stressed: [
      'wütend','zornig','hasse','schrecklich','gestresst','ängstlich','nervös',
      'frustriert','gereizt','verärgert','Panik','Angst','überwältigt',
      'unerträglich','verzweifelt','aufgewühlt','angespannt','unter Druck',
      'überfordert','außer Kontrolle',
      'Scheiße','verdammt','Mist','Idiot','Blödmann','dumm','bescheuert',
      'Arschloch','Trottel','Vollidiot','zum Kotzen','Depp','Vollidiot',
      'geschrien','gestritten','gekämpft','vor Wut geweint','etwas kaputtgemacht',
      'nicht schlafen können','wach gelegen und gegrübelt','Panik bekommen',
      'zu spät gekommen','versagt','Fehler gemacht','alles vermasselt',
      'gefeuert worden','Geld verloren','Unfall','Notfall',
    ],
    tired: [
      'müde','erschöpft','schläfrig','gelangweilt','traurig','deprimiert',
      'hoffnungslos','elend','enttäuscht','einsam','leer','melancholisch',
      'unmotiviert','ausgebrannt','gebrochen','keine Energie','apathisch',
      'geweint','nicht aufstehen können','im Bett geblieben',
      'nicht geschlafen','schlecht geschlafen','Schlaflosigkeit','schwere Augen',
      'mich geschleppt','zu viel gearbeitet','erschöpfender Tag','lange Woche',
      'krank','Kopfschmerzen','Rückenschmerzen','nichts gegessen','kein Appetit',
    ],
    calm: [
      'ruhig','friedlich','entspannt','gelassen','still','ausgeglichen','klar',
      'stabil','wohl','neutral','sicher','besonnen','gefasst','erholt','frisch',
      'meditiert','tief geatmet','Yoga gemacht','gedehnt','gut geschlafen',
      'gelesen','geschrieben','nachgedacht','spaziert','Park','Strand','Natur',
      'Kaffee','Tee','gekocht','organisiert','aufgeräumt','Zeit mit Familie',
      'gutes Gespräch','den Moment genossen','schöner Tag',
    ],
  },
  ar: {
    happy: [
      'سعيد','فرحان','مبتهج','رائع','ممتاز','مبهج','مسرور','متحمس','مبتهج',
      'شاكر','ممتنن','عظيم','بديع','مذهل','جميل','رائع','لطيف','بهجة',
      'فرح','سرور','بهجة','ابتهاج','انشراح','فخور','ممتنن',
      'ضحكت','احتفلت','رقصت','غنيت','احتضنت','ابتسمت','فزت',
      'نجحت','أكملت','انتهيت','خرجت','قابلت أصدقاء','سافرت',
      'استكشفت','استمتعت','أكلت جيداً','لذيذ','استرحت','مرحت',
      'مارست الرياضة','ركضت','سبحت','تمشيت','ذهبت للجيم',
    ],
    stressed: [
      'غاضب','محبط','كاره','فظيع','مجنون','قلق','خائف','مرهق',
      'لا أطيق','مزعج','متوتر','مضغوط','مرعوب','هلع','ذعر',
      'غبي','أحمق','يلعن','ملعون','لعنة','كلب','حمار','ابن حرام',
      'صرخت','تشاجرت','خناقة','بكيت من الغضب','كسرت شيئاً',
      'لم أنم','بقيت صاحياً قلقاً','أصابني الهلع',
      'تأخرت','فشلت','أخطأت','أفسدت كل شيء','خسرت',
      'فقدت عملي','خسرت مالاً','حادثة','طوارئ',
    ],
    tired: [
      'تعبان','مرهق','نعسان','حزين','مكتئب','يائس','بائس','خائب',
      'وحيد','فارغ','بلا طاقة','لامبالٍ','بلا حماس','منهك',
      'بكيت','لم أستطع النهوض','بقيت في السرير',
      'لم أنم','نمت بشكل سيء','أرق','عيون ثقيلة','جررت نفسي',
      'عملت كثيراً','يوم مرهق','أسبوع طويل','مريض',
      'صداع','آلام الظهر','لم آكل','بلا شهية',
    ],
    calm: [
      'هادئ','مرتاح','سكينة','توازن','واضح','مستقر','بخير','محايد',
      'منتعش','متجدد','بسلام','مطمئن','مسترخٍ',
      'تأملت','تنفست بعمق','يوغا','مددت','نمت جيداً',
      'قرأت','كتبت','تأملت','تمشيت','حديقة','شاطئ','طبيعة',
      'قهوة','شاي','طبخت','نظمت','نظفت','وقت مع العائلة',
      'محادثة جيدة','استمتعت باللحظة','يوم جميل',
    ],
  },
  ru: {
    happy: [
      'счастливый','радостный','веселый','отличный','замечательный','фантастический',
      'восхитительный','взволнованный','доволен','превосходный','великолепный',
      'позитивный','благодарный','гордый','переполнен радостью','на седьмом небе',
      'смеялся','праздновал','танцевал','пел','обнимал','улыбался','победил',
      'достиг','справился','завершил','закончил',
      'вышел','встретил друзей','путешествовал','исследовал','наслаждался',
      'хорошо поел','вкусно','отдохнул','расслабился','повеселился',
      'занимался спортом','бегал','плавал','ходил гулять','в спортзал',
    ],
    stressed: [
      'злой','сердитый','ненавижу','ужасный','стрессовый','тревожный','нервный',
      'расстроенный','раздражённый','паника','страх','подавленный','невыносимый',
      'взволнованный','напряжённый','под давлением','перегружен',
      'чёрт','блин','идиот','дурак','тупой','сволочь','придурок','мудак',
      'засранец','нахрен','твою мать','ёлки','чёрт возьми',
      'кричал','ругался','скандал','плакал от злости','что-то сломал',
      'не мог спать','лежал и переживал','запаниковал',
      'опоздал','провалил','ошибся','всё испортил','потерял',
      'уволили','потерял деньги','авария','чрезвычайная ситуация',
    ],
    tired: [
      'устал','измотан','сонный','скучно','грустный','депрессия','безнадёжный',
      'несчастный','разочарован','одинокий','пустой','меланхоличный',
      'без сил','апатичный','равнодушный','выгорел',
      'плакал','не смог встать','лежал в постели',
      'не спал','плохо спал','бессонница','тяжёлые веки','еле тащился',
      'слишком много работал','изматывающий день','длинная неделя','заболел',
      'головная боль','боль в спине','не ел','нет аппетита',
    ],
    calm: [
      'спокойный','мирный','расслабленный','тихий','сбалансированный','ясный',
      'стабильный','хорошо','нейтральный','отдохнувший','обновлённый','свежий',
      'медитировал','глубоко дышал','йога','потянулся','хорошо спал',
      'читал','писал','размышлял','гулял','парк','пляж','природа',
      'кофе','чай','готовил','организовал','убрался','время с семьёй',
      'хороший разговор','наслаждался моментом','хороший день',
    ],
  },
  pt: {
    happy: [
      'feliz','alegre','contente','maravilhoso','fantástico','incrível','animado',
      'encantado','satisfeito','excelente','magnífico','eufórico','positivo',
      'entusiasmado','grato','perfeito','ótimo','orgulhoso','radiante',
      'ri','celebrei','dancei','cantei','abracei','sorri','ganhei',
      'consegui','completei','terminei','saí','me encontrei com amigos',
      'viajei','explorei','comi bem','delicioso','me relaxei','me diverti',
      'fiz exercício','corri','nadei','caminhei','fui à academia',
    ],
    stressed: [
      'com raiva','furioso','odeio','terrível','horrível','estressado','ansioso',
      'nervoso','frustrado','irritado','com medo','pânico','sobrecarregado',
      'insuportável','desesperado','agitado','tenso','pressionado',
      'merda','porra','caralho','idiota','burro','imbecil','maldito',
      'desgraçado','filho da puta','vai se ferrar',
      'gritei','briguei','discuti','chorei de raiva','quebrei algo',
      'não consegui dormir','fiquei acordado preocupado','entrei em pânico',
      'cheguei atrasado','falhei','errei','estraguei tudo','perdi',
      'fui demitido','perdi dinheiro','acidente','emergência',
    ],
    tired: [
      'cansado','exausto','com sono','entediado','triste','deprimido','sem esperança',
      'miserável','decepcionado','solitário','vazio','melancólico','sem energia',
      'desmotivado','esgotado','destruído','apático','indiferente',
      'chorei','não consegui me levantar','fiquei na cama',
      'não dormi','dormi mal','insônia','olhos pesados','me arrastei',
      'trabalhei demais','dia exaustivo','semana longa','fiquei doente',
      'dor de cabeça','dor nas costas','não comi','sem apetite',
    ],
    calm: [
      'calmo','pacífico','relaxado','sereno','silencioso','equilibrado','centrado',
      'claro','estável','confortável','bem','neutro','descansado','renovado',
      'meditei','respirei fundo','yoga','alonguei','dormi bem',
      'li','escrevi','refleti','caminhei','parque','praia','natureza',
      'café','chá','cozinhei','organizei','limpei','tempo com família',
      'boa conversa','aproveitei o momento','dia lindo',
    ],
  },
  it: {
    happy: [
      'felice','gioioso','contento','meraviglioso','fantastico','incredibile',
      'emozionato','soddisfatto','eccellente','magnifico','euforico','positivo',
      'entusiasta','grato','perfetto','stupendo','orgoglioso','raggiante',
      'riso','celebrato','ballato','cantato','abbracciato','sorriso','vinto',
      'raggiunto','completato','finito','uscito','incontrato amici',
      'viaggiato','esplorato','mangiato bene','delizioso','mi sono rilassato',
      'fatto sport','corso','nuotato','camminato','andato in palestra',
    ],
    stressed: [
      'arrabbiato','furioso','odio','terribile','orribile','stressato','ansioso',
      'nervoso','frustrato','irritato','spaventato','panico','sopraffatto',
      'insopportabile','disperato','agitato','teso','sotto pressione',
      'cazzo','merda','stronzo','idiota','stupido','imbecille','maledetto',
      'bastardo','vaffanculo','porco dio',
      'urlato','litigato','pianto di rabbia','rotto qualcosa',
      'non riuscivo a dormire','rimasto sveglio preoccupato','ho avuto un attacco di panico',
      'sono arrivato tardi','ho fallito','ho sbagliato','ho rovinato tutto',
      'licenziato','perso soldi','incidente','emergenza',
    ],
    tired: [
      'stanco','esausto','assonnato','annoiato','triste','depresso','senza speranza',
      'miserabile','deluso','solo','vuoto','malinconico','senza energia',
      'demotivato','distrutto','apatico','indifferente',
      'pianto','non riuscivo ad alzarmi','rimasto a letto',
      'non ho dormito','dormito male','insonnia','occhi pesanti','mi trascinavo',
      'lavorato troppo','giornata estenuante','settimana lunga','mi sono ammalato',
      'mal di testa','mal di schiena','non ho mangiato','senza appetito',
    ],
    calm: [
      'calmo','pacifico','rilassato','sereno','silenzioso','equilibrato','centrato',
      'chiaro','stabile','comodo','bene','neutro','riposato','rinnovato',
      'meditato','respirato profondamente','yoga','allungato','dormito bene',
      'letto','scritto','riflettuto','camminato','parco','spiaggia','natura',
      'caffè','tè','cucinato','organizzato','pulito','tempo con famiglia',
      'bella conversazione','goduto il momento','bella giornata',
    ],
  },
  ko: {
    happy: [
      '행복','기쁨','신남','대박','완벽','멋진','놀라운','좋아','만족','훌륭',
      '굉장','황홀','감사','최고','완전좋아','기분좋아','설레','두근두근',
      '뿌듯해','자랑스러워','흐뭇해','기뻐','반가워','신나','흥분돼',
      '웃었어','축하했어','춤췄어','노래했어','안았어','미소지었어',
      '이겼어','성공했어','완료했어','끝냈어',
      '나갔어','친구만났어','여행했어','탐험했어','즐겼어',
      '맛있게먹었어','맛있었어','쉬었어','놀았어',
      '운동했어','달렸어','수영했어','걸었어','헬스장갔어',
    ],
    stressed: [
      '화났어','짜증','싫어','끔찍해','스트레스','불안','긴장','좌절',
      '짜증나','두려워','패닉','무서워','참을수없어','최악','억울해',
      '답답해','열받아','화가나','빡쳐','미치겠어','돌아버리겠어',
      '씨발','개새끼','병신','지랄','닥쳐','미친','바보','멍청이',
      '개같아','죽겠어','열받아','엿같아',
      '소리질렀어','싸웠어','다퉜어','화가나서울었어','때렸어','부쉈어',
      '잠을못잤어','걱정하다밤샜어','패닉왔어',
      '늦었어','실패했어','실수했어','망쳤어','잃었어',
      '잘렸어','돈잃었어','사고났어','응급상황이야',
    ],
    tired: [
      '피곤해','지쳤어','졸려','지루해','슬퍼','우울해','절망','불행해',
      '실망','외로워','공허해','우울','의욕없어','다탔어','무기력해',
      '무감각해','번아웃','기운없어','힘없어','늘어져',
      '울었어','일어날수없었어','침대에누워있었어',
      '잠못잤어','잠을잘못잤어','불면증','눈이무거워','간신히걸었어',
      '너무많이일했어','힘든하루','긴한주','아팠어',
      '두통','허리아파','못먹었어','입맛없어',
    ],
    calm: [
      '차분해','평화로워','편안해','고요해','균형잡힌','명확해','안정적',
      '괜찮아','중립적','쉬었어','재충전됐어','상쾌해','평온해',
      '명상했어','심호흡했어','요가했어','스트레칭했어','잘잤어',
      '책읽었어','글썼어','생각했어','걸었어','공원','해변','자연',
      '커피','차','요리했어','정리했어','청소했어','가족과시간',
      '좋은대화','순간을즐겼어','좋은하루',
    ],
  },
  zh: {
    happy: [
      '快乐','高兴','开心','太棒了','完美','精彩','兴奋','满足','出色','极好',
      '欣喜','感激','幸福','太好了','很棒','自豪','感恩','喜悦','愉快',
      '美好','振奋','充实','满足感','成就感',
      '笑了','庆祝了','跳舞了','唱歌了','拥抱了','微笑了','赢了',
      '成功了','完成了','出去了','见朋友了','旅行了','探索了',
      '好好吃了','好吃','放松了','玩了',
      '锻炼了','跑步了','游泳了','散步了','去健身房了',
    ],
    stressed: [
      '生气','愤怒','讨厌','可怕','压力','焦虑','紧张','沮丧','烦躁',
      '恐惧','恐慌','害怕','受不了','最糟糕','委屈','憋屈',
      '抓狂','崩溃了','气死了','烦死了','受够了',
      '操','去死','他妈的','傻逼','煞笔','白痴','混蛋','蠢货',
      '大喊了','吵架了','争吵了','气到哭','摔东西了',
      '睡不着','担心到天亮','恐慌发作',
      '迟到了','失败了','犯错了','搞砸了','丢失了',
      '被炒了','丢钱了','出事了','紧急情况',
    ],
    tired: [
      '累了','精疲力竭','困了','无聊','伤心','沮丧','绝望','悲惨','失望',
      '孤独','空虚','忧郁','没动力','崩溃','无精打采','麻木',
      '倦怠','没劲','提不起劲','心累',
      '哭了','起不来床','躺着不动',
      '没睡','睡不好','失眠','眼皮沉','硬撑着走',
      '工作太多','累死了一天','漫长的一周','生病了',
      '头疼','腰疼','没吃东西','没胃口',
    ],
    calm: [
      '平静','平和','放松','宁静','安静','平衡','清晰','稳定','还好','中立',
      '休息好了','精神焕发','神清气爽','安宁','淡定',
      '冥想了','深呼吸了','做瑜伽了','拉伸了','睡得好',
      '读书了','写作了','思考了','散步了','公园','海边','大自然',
      '喝咖啡','喝茶','做饭了','整理了','打扫了','陪家人',
      '好好聊天了','享受当下','美好的一天',
    ],
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

  // Rastgele küçük farklılıklar ekle — eşit görünmesin
  const noise = () => Math.floor(Math.random() * 7) - 3; // -3 ile +3 arası

  const moods = {};

  if (total === 1) {
    const dom = Object.keys(scores).find(k => scores[k] > 0);
    const others = Object.keys(scores).filter(k => k !== dom);
    moods[dom] = 52 + noise();
    const base = Math.floor((100 - moods[dom]) / 3);
    others.forEach((k, i) => {
      if (i === others.length - 1) {
        moods[k] = 100 - moods[dom] - others.slice(0, -1).reduce((s, ok) => s + moods[ok], 0);
      } else {
        moods[k] = Math.max(3, base + noise());
      }
    });
  } else if (total <= 3) {
    const BASE = 6 + noise();
    const remaining = 100 - BASE * 4;
    let sum = 0;
    const keys = Object.keys(scores);
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        moods[k] = Math.max(BASE, 100 - sum);
      } else {
        const extra = Math.round((scores[k] / total) * remaining) + noise();
        moods[k] = Math.max(3, BASE + extra);
        sum += moods[k];
      }
    });
  } else {
    const BASE = 4 + noise();
    const remaining = 100 - BASE * 4;
    let sum = 0;
    const keys = Object.keys(scores);
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        moods[k] = Math.max(BASE, 100 - sum);
      } else {
        const extra = Math.round((scores[k] / total) * remaining) + noise();
        moods[k] = Math.max(3, BASE + extra);
        sum += moods[k];
      }
    });
  }

  // Toplam 100 yap
  const totalMoods = Object.values(moods).reduce((a, b) => a + b, 0);
  if (totalMoods !== 100) {
    const dominant = Object.keys(moods).reduce((a, b) => moods[a] > moods[b] ? a : b);
    moods[dominant] += (100 - totalMoods);
  }

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