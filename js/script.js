// © 2026 Milner Tello Guzman. Todos los derechos reservados.

    /* CONFIG */
    let lang = localStorage.getItem('lang') || "es";
    let unlocked = parseInt(localStorage.getItem('unlocked')) || 1;
    let coins = parseInt(localStorage.getItem('coins')) || 0;
    let levelStars = JSON.parse(localStorage.getItem('levelStars')) || {};
    let survivalHighScore = parseInt(localStorage.getItem('survivalHighScore')) || 0;
    
    // Premium Tracking
    let stats = JSON.parse(localStorage.getItem('stats')) || { answered: 0, correct: 0, maxCombo: 0 };
    let achievements = JSON.parse(localStorage.getItem('achievements')) || {};
    let inventory = JSON.parse(localStorage.getItem('inventory')) || { forest: false, ocean: false };
    // Compatibilidad: agregar llaves nuevas si faltan (para partidas antiguas)
    const inventoryDefaults = {
      forest: false,
      ocean: false,
      sunset: false,
      mint: false,
      candy: false,
      space: false,
      royal: false,
      neon: false,
      angel: false
    };
    inventory = Object.assign({}, inventoryDefaults, inventory || {});
    let lastDailyClaim = localStorage.getItem('lastDailyClaim') || "";
    let dailyStreak = parseInt(localStorage.getItem('dailyStreak')) || 0;
    
    let level = 1;
    let index = 0;
    let score = 0;
    let timer;
    let time = 10;
    let baseTime = 10;
    let ageDifficulty = localStorage.getItem('ageDifficulty') || 'teen';
    let soundMuted = localStorage.getItem('soundMuted') === '1';
    let lastVolumeBeforeMute = parseFloat(localStorage.getItem('lastVolumeBeforeMute')) || 0.5;
    let survivalBonusLives = parseInt(localStorage.getItem('survivalBonusLives')) || 0;
    let lastGiftClaimTs = parseInt(localStorage.getItem('lastGiftClaimTs')) || 0;
    const giftCooldownMs = 30 * 60 * 1000;
    let questions = [];
    let usedQuestionIndices = new Set(); // evita repetir preguntas entre niveles

    // Lista de los 20 archivos JSON de preguntas (1050+ preguntas en 100 niveles)
    // default_questions.json se carga primero como fallback esencial
    const questionFiles = [
      'preguntas/default_questions.json',
      'preguntas/preguntas_genesis_niveles_1_5.json',
      'preguntas/preguntas_exodo_niveles_6_10.json',
      'preguntas/preguntas_jueces_niveles_11_15.json',
      'preguntas/preguntas_reyes_niveles_16_20.json',
      'preguntas/preguntas_profetas_niveles_21_25.json',
      'preguntas/preguntas_exilio_regreso_niveles_26_30.json',
      'preguntas/preguntas_jesus_niveles_31_35.json',
      'preguntas/preguntas_jesus_ministerio_niveles_36_40.json',
      'preguntas/preguntas_jesus_pasion_niveles_41_45.json',
      'preguntas/preguntas_hechos_niveles_46_50.json',
      'preguntas/preguntas_cartas_pablo_1_niveles_51_55.json',
      'preguntas/preguntas_cartas_pablo_2_niveles_56_60.json',
      'preguntas/preguntas_cartas_pastorales_hebreos_niveles_61_65.json',
      'preguntas/preguntas_santiago_pedro_juan_niveles_66_70.json',
      'preguntas/preguntas_judas_apocalipsis_niveles_71_75.json',
      'preguntas/preguntas_at_profundo_niveles_76_80.json',
      'preguntas/preguntas_nt_profundo_niveles_81_85.json',
      'preguntas/preguntas_sintesis_biblia_niveles_86_90.json',
      'preguntas/preguntas_niveles_91_95.json',
      'preguntas/preguntas_niveles_finales_96_100.json'
    ];

    // Gamification
    let isSurvival = false;
    let lives = 3;
    let combo = 0;
    let survivalScore = 0;
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === '1';
    let onboardingStep = 0;
    let lowPerfMode = false;

    // Helper function for haptic feedback
    function vibrate(pattern = [50]) {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    }

    // Helper function for efficient star rendering
    function renderStars(container, count, earned) {
      // Clear existing content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      // Create new stars
      for (let j = 0; j < count; j++) {
        const star = document.createElement('span');
        star.textContent = '⭐';
        star.className = j < earned ? 'star-gold' : 'star-gray';
        if (j < earned) {
          star.style.animationDelay = `${j * 0.2}s`;
        }
        container.appendChild(star);
      }
    }

    // Helper function to share results
    function shareResult(level, score, stars) {
      let text = `¡Completé el Nivel ${level} en Trivia Bíblica: Aprende Jugando con ${score}/10 puntos y ${stars}⭐! ¿Puedes superarlo?`;
      if (lang === "en") text = `I completed Level ${level} in Trivia Bíblica: Aprende Jugando with ${score}/10 points and ${stars}⭐! Can you beat it?`;
      if (lang === "qu") text = `¡Tukurqani Nivel ${level}ta Trivia Bíblica: Aprende Jugando pi ${score}/10 puntoswan ${stars}⭐! ¿Qanpas atipawaqchu?`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Trivia Bíblica: Aprende Jugando Challenge',
          text: text,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(text + ' ' + window.location.href).then(() => {
          let alertMsg = "Resultado copiado al portapapeles";
          if (lang === "en") alertMsg = "Result copied to clipboard";
          if (lang === "qu") alertMsg = "Rikumanta qillqapi waqaycharqani";
          alert(alertMsg);
        });
      }
    }

    // Helper function to show tutorial
    function showTutorial() {
      if (localStorage.getItem('tutorialShown')) return;
      
      const tutorialSteps = [
        { title: 
            lang === "es" ? "¡Bienvenido a Trivia Bíblica: Aprende Jugando!" :
            lang === "qu" ? "¡Bienvenido a Trivia Bíblica: Aprende Jugando!" :
            "Welcome to Trivia Bíblica: Aprende Jugando!", 
          content: 
            lang === "es" ? "Responde preguntas bíblicas para ganar estrellas y monedas." :
            lang === "qu" ? "Bibliamanta tapukuykunata kutichiy ch'askiy estrellaswan qullqita." :
            "Answer Bible questions to earn stars and coins." },
        { title: 
            lang === "es" ? "Modos de Juego" :
            lang === "qu" ? "Pukllay laya" :
            "Game Modes", 
          content: 
            lang === "es" ? "Elige entre Quiz, Supervivencia o Mapa de Niveles." :
            lang === "qu" ? "Akllay Quiz, Kawsay o Nivel Mapa ukhupi." :
            "Choose between Quiz, Survival or Level Map." },
        { title: 
            lang === "es" ? "Poderes Especiales" :
            lang === "qu" ? "Sapaq atiykuna" :
            "Special Powers", 
          content: 
            lang === "es" ? "Usa monedas para pistas, tiempo extra o eliminar opciones." :
            lang === "qu" ? "Qullqita llamk'achiy willayninkunaq, yapamanta pachaq o akllanakunaq chinkachinapaq." :
            "Use coins for hints, extra time or eliminate options." },
        { title: 
            lang === "es" ? "¡Diviértete!" :
            lang === "qu" ? "¡Kusikuy!" :
            "Have Fun!", 
          content: 
            lang === "es" ? "Aprende la Biblia mientras juegas. ¡Que Dios te bendiga!" :
            lang === "qu" ? "Pukllashwan Bibliata yachay. ¡Dios bendecisunki!" :
            "Learn the Bible while playing. God bless you!" }
      ];
      
      let currentStep = 0;
      
      const tutorialDiv = document.createElement('div');
      tutorialDiv.id = 'tutorial';
      tutorialDiv.innerHTML = `
        <div class="tutorial-overlay">
          <div class="tutorial-card">
            <h3 id="tutorial-title">${tutorialSteps[0].title}</h3>
            <p id="tutorial-content">${tutorialSteps[0].content}</p>
            <div class="tutorial-buttons">
              <button id="tutorial-skip">${
                lang === "es" ? "Saltar" :
                lang === "qu" ? "Pawsay" :
                "Skip"
              }</button>
              <button id="tutorial-next">${
                lang === "es" ? "Siguiente" :
                lang === "qu" ? "Qatiq" :
                "Next"
              }</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(tutorialDiv);
      
      const nextBtn = tutorialDiv.querySelector('#tutorial-next');
      const skipBtn = tutorialDiv.querySelector('#tutorial-skip');
      
      nextBtn.onclick = () => {
        currentStep++;
        if (currentStep < tutorialSteps.length) {
          document.getElementById('tutorial-title').textContent = tutorialSteps[currentStep].title;
          document.getElementById('tutorial-content').textContent = tutorialSteps[currentStep].content;
        } else {
          tutorialDiv.remove();
          localStorage.setItem('tutorialShown', 'true');
        }
      };
      
      skipBtn.onclick = () => {
        tutorialDiv.remove();
        localStorage.setItem('tutorialShown', 'true');
      };
    }

    // Cache DOM elements for gift UI
    let giftElements = {};
    function initGiftElements() {
      giftElements.btn = document.getElementById("giftButton");
      giftElements.txt = document.getElementById("giftTimerText");
      giftElements.quickBtn = document.getElementById("homeGiftQuickBtn");
      giftElements.quickBadge = document.getElementById("homeGiftBadge");
    }

    const defaultBgIcons = ["🕊️", "🕊️", "🌥️", "✨", "⭐", "🌟", "☁️", "☁️", "🐑"];
    
    // Iconos bíblicos temáticos para niveles
    const themeIcons = {
      genesis: ["🌍", "✨", "🌿", "🐍", "🍎", "🕊️", "📜", "🌈"],
      exodus: ["🔥", "🌊", "📜", "🍞", "⚡", "🏔️", "🐑", "👑"],
      judges: ["⚔️", "🦁", "🔥", "🏺", "🌪️", "💪", "🎯", "🏆"],
      kings: ["👑", "🏛️", "🎺", "📜", "⚔️", "🏰", "🕊️", "⭐"],
      prophets: ["📖", "🔥", "👁️", "🎺", "⚡", "🌊", "🏜️", "🕊️"],
      jesus: ["⭐", "👶", "🎁", "🕊️", "💧", "🐟", "🍞", "✨"],
      ministry: ["🚶", "🎣", "⛵", "🏔️", "🌊", "👣", "💡", "🙏"],
      passion: ["⛪", "🌿", "⚰️", "✝️", "🪨", "👑", "🔨", "🕊️"],
      acts: ["🔥", "🕊️", "⛵", "🏛️", "🌊", "👥", "🗣️", "⚡"],
      paul: ["✉️", "⛓️", "🚢", "🏛️", "📜", "✨", "🕊️", "❤️"],
      letters: ["📜", "✉️", "🔥", "💎", "🕊️", "⭐", "📖", "✨"],
      revelation: ["👁️", "🐉", "⭐", "🎺", "🏆", "👑", "💎", "🌟"],
      default: ["📖", "✨", "⭐", "🕊️", "🙏", "💡", "🌟", "📜"]
    };
    
    // Función para obtener tema visual según el nivel (1-100)
    function getLevelTheme(levelNum) {
      // Determinar temática según el rango de niveles
      let themeKey = 'default';
      if (levelNum <= 5) themeKey = 'genesis';
      else if (levelNum <= 10) themeKey = 'exodus';
      else if (levelNum <= 15) themeKey = 'judges';
      else if (levelNum <= 20) themeKey = 'kings';
      else if (levelNum <= 25) themeKey = 'prophets';
      else if (levelNum <= 30) themeKey = 'prophets';
      else if (levelNum <= 35) themeKey = 'jesus';
      else if (levelNum <= 40) themeKey = 'ministry';
      else if (levelNum <= 45) themeKey = 'passion';
      else if (levelNum <= 50) themeKey = 'acts';
      else if (levelNum <= 55) themeKey = 'paul';
      else if (levelNum <= 60) themeKey = 'paul';
      else if (levelNum <= 65) themeKey = 'letters';
      else if (levelNum <= 70) themeKey = 'letters';
      else if (levelNum <= 75) themeKey = 'revelation';
      else if (levelNum <= 80) themeKey = 'prophets';
      else if (levelNum <= 85) themeKey = 'letters';
      else if (levelNum <= 90) themeKey = 'letters';
      else if (levelNum <= 95) themeKey = 'letters';
      else themeKey = 'revelation';
      
      const icons = themeIcons[themeKey] || themeIcons.default;
      
      return {
        bgClass: `level-theme-${((levelNum - 1) % 20) + 1}`,
        icons: [...icons, ...icons.slice(0, 1)], // 9 iconos
        floaters: icons.slice(0, 6) // 6 floaters
      };
    }

    /* ===== 100 PREGUNTAS REALES ÚNICAS ===== */
    const bank = [
      /* ===== ANTIGUO TESTAMENTO ===== */
      { q_es: "¿Quién fue el primer hombre?", q_en: "Who was the first man?", q_qu: "¿Pikun karqan ñawpaq runa?", a_es: ["Adán", "Noé", "Abraham"], a_en: ["Adam", "Noah", "Abraham"], a_qu: ["Adán", "Noé", "Abraham"], c: 0, ref: "Génesis 2:7", text_es: "Jehová Dios formó al hombre del polvo del suelo.", text_en: "Jehovah God formed the man from the dust of the ground.", text_qu: "Jehová Dios runata allpapi pacha ukhupi kamakurqan." },
      { q_es: "¿Quién fue la primera mujer?", q_en: "Who was the first woman?", q_qu: "¿Pikun karqan ñawpaq warmi?", a_es: ["Eva", "Sara", "Rebeca"], a_en: ["Eve", "Sarah", "Rebekah"], a_qu: ["Eva", "Sara", "Rebeca"], c: 0, ref: "Génesis 2:22", text_es: "De la costilla hizo una mujer.", text_en: "From the rib he made a woman.", text_qu: "Warmi waqta ukhupi kamakurqan." },
      { q_es: "¿Quién construyó el arca?", q_en: "Who built the ark?", q_qu: "¿Pikun arca ruwarqan?", a_es: ["Noé", "Moisés", "David"], a_en: ["Noah", "Moses", "David"], a_qu: ["Noé", "Moisés", "David"], c: 0, ref: "Génesis 6:14", text_es: "Hazte un arca de madera resinosa.", text_en: "Make for yourself an ark of resinous wood.", text_qu: "Kikinpaq resinosa k'aspiwan arca ruway." },
      { q_es: "¿Cuántos días llovió en el Diluvio?", q_en: "How many days did it rain during the Flood?", q_qu: "¿Hayk'a p'unchaymi parakurqan para pacha ukhupi?", a_es: ["40", "7", "100"], a_en: ["40", "7", "100"], a_qu: ["40", "7", "100"], c: 0, ref: "Génesis 7:12", text_es: "Llovió 40 días y 40 noches.", text_en: "It rained 40 days and 40 nights.", text_qu: "40 p'unchay 40 tuta parakurqan." },
      { q_es: "¿Quién mató a Abel?", q_en: "Who killed Abel?", q_qu: "¿Pin Abelta wañuchirqan?", a_es: ["Caín", "Set", "Noé"], a_en: ["Cain", "Seth", "Noah"], a_qu: ["Caín", "Set", "Noé"], c: 0, ref: "Génesis 4:8", text_es: "Caín atacó a su hermano.", text_en: "Cain attacked his brother.", text_qu: "Caín wawqinta maqaspa wañuchirqan." },
      { q_es: "¿Quién interpretó sueños en Egipto?", q_en: "Who interpreted dreams in Egypt?", q_qu: "¿Pin Egipto suyupi mosqoykunata sut'incharqan?", a_es: ["José", "Moisés", "Daniel"], a_en: ["Joseph", "Moses", "Daniel"], a_qu: ["José", "Moisés", "Daniel"], c: 0, ref: "Génesis 41:15", text_es: "Dios dará respuesta.", text_en: "God will give the answer.", text_qu: "Diosmi kutichiyta qonqa." },
      { q_es: "¿Quién guió a Israel fuera de Egipto?", q_en: "Who led Israel out of Egypt?", q_qu: "¿Pin Israelta Egipto suyumanta horqomurqan?", a_es: ["Moisés", "Abraham", "Isaac"], a_en: ["Moses", "Abraham", "Isaac"], a_qu: ["Moisés", "Abraham", "Isaac"], c: 0, ref: "Éxodo 3:10", text_es: "Saca a mi pueblo.", text_en: "Bring my people out.", text_qu: "Llaqtayta horqomuy." },
      { q_es: "¿Quién recibió los Diez Mandamientos?", q_en: "Who received the Ten Commandments?", q_qu: "¿Pin Chunka Kamachikuykunata chaskirqan?", a_es: ["Moisés", "David", "Salomón"], a_en: ["Moses", "David", "Solomon"], a_qu: ["Moisés", "David", "Salomón"], c: 0, ref: "Éxodo 31:18", text_es: "Dios dio las tablas.", text_en: "God gave the tablets.", text_qu: "Diosmi rumipi qellqasqata qoran." },
      { q_es: "¿Quién derribó los muros de Jericó?", q_en: "Who brought down Jericho walls?", q_qu: "¿Pin Jericó perqakunata thunirqan?", a_es: ["Josué", "Moisés", "David"], a_en: ["Joshua", "Moses", "David"], a_qu: ["Josué", "Moisés", "David"], c: 0, ref: "Josué 6:20", text_es: "El muro cayó.", text_en: "The wall fell.", text_qu: "Perqa urmaykurqan." },
      { q_es: "¿Quién venció a Goliat?", q_en: "Who defeated Goliath?", q_qu: "¿Pin Goliat-ta atiparqan?", a_es: ["David", "Saúl", "Samuel"], a_en: ["David", "Saul", "Samuel"], a_qu: ["David", "Saúl", "Samuel"], c: 0, ref: "1 Samuel 17:50", text_es: "David venció.", text_en: "David defeated him.", text_qu: "Davidmi atiparqan." },
      { q_es: "¿Cuántos años vivió Matusalén?", q_en: "How many years did Methuselah live?", q_qu: "¿Hayk'a watan Matusalén kawsarqan?", a_es: ["969", "777", "900"], a_en: ["969", "777", "900"], a_qu: ["969", "777", "900"], c: 0, ref: "Génesis 5:27", text_es: "Matusalén vivió 969 años.", text_en: "Methuselah lived 969 years.", text_qu: "Matusalén 969 watata kawsarqan." },
      { q_es: "¿Quién fue arrojado al foso de los leones?", q_en: "Who was thrown into the lion's den?", q_qu: "¿Pin leonkunapa t'oqonman choqasqa karqan?", a_es: ["Daniel", "Jonás", "Pablo"], a_en: ["Daniel", "Jonah", "Paul"], a_qu: ["Daniel", "Jonás", "Pablo"], c: 0, ref: "Daniel 6:16", text_es: "Daniel fue arrojado.", text_en: "Daniel was thrown in.", text_qu: "Danielmi choqasqa karqan." },
      { q_es: "¿Quién fue tragado por un gran pez?", q_en: "Who was swallowed by a great fish?", q_qu: "¿Pin jatun challwapa millp'usqan karqan?", a_es: ["Jonás", "Elías", "Ezequiel"], a_en: ["Jonah", "Elijah", "Ezekiel"], a_qu: ["Jonás", "Elías", "Ezequiel"], c: 0, ref: "Jonás 1:17", text_es: "Un gran pez tragó a Jonás.", text_en: "A great fish swallowed Jonah.", text_qu: "Jatun challwan millp'uykurqan." },
      { q_es: "¿Quién fue el rey más sabio de Israel?", q_en: "Who was the wisest king of Israel?", q_qu: "¿Pin Israelpi aswan yachayniyoq rey karqan?", a_es: ["Salomón", "David", "Saúl"], a_en: ["Solomon", "David", "Saul"], a_qu: ["Salomón", "David", "Saúl"], c: 0, ref: "1 Reyes 4:31", text_es: "Salomón fue el más sabio.", text_en: "Solomon was the wisest.", text_qu: "Salomónmi aswan yachayniyoq karqan." },
      { q_es: "¿Quién venció a los filisteos con quijada de asno?", q_en: "Who defeated Philistines with a donkey's jaw?", q_qu: "¿Pin asno k'akllawan filisteo runakunata atiparqan?", a_es: ["Sansón", "David", "Gedeón"], a_en: ["Samson", "David", "Gideon"], a_qu: ["Sansón", "David", "Gedeón"], c: 0, ref: "Jueces 15:15", text_es: "Hirió a mil hombres.", text_en: "He struck down a thousand men.", text_qu: "Waranqa runakunata wañuchirqan." },
      { q_es: "¿Quién construyó el templo de Jerusalén?", q_en: "Who built the temple in Jerusalem?", q_qu: "¿Pin Jerusalénpi yupaychana wasita ruwarqan?", a_es: ["Salomón", "David", "Ezequías"], a_en: ["Solomon", "David", "Hezekiah"], a_qu: ["Salomón", "David", "Ezequías"], c: 0, ref: "1 Reyes 6:1", text_es: "Salomón edificó la casa.", text_en: "Solomon built the house.", text_qu: "Salomónmi wasita ruwarqan." },
      { q_es: "¿Cuántas plagas envió Dios sobre Egipto?", q_en: "How many plagues did God send on Egypt?", q_qu: "¿Hayk'a castigokunatan Dios Egiptoman kacharqan?", a_es: ["10", "7", "12"], a_en: ["10", "7", "12"], a_qu: ["10", "7", "12"], c: 0, ref: "Éxodo 7–12", text_es: "Diez plagas sobre Egipto.", text_en: "Ten plagues upon Egypt.", text_qu: "Chunka castigokuna karqan." },
      { q_es: "¿Quién era la madre de Moisés?", q_en: "Who was Moses' mother?", q_qu: "¿Pin Moisespa maman karqan?", a_es: ["Jocabed", "Miriam", "Séfora"], a_en: ["Jochebed", "Miriam", "Zipporah"], a_qu: ["Jocabed", "Miriam", "Séfora"], c: 0, ref: "Éxodo 6:20", text_es: "Jocabed, hija de Leví.", text_en: "Jochebed, daughter of Levi.", text_qu: "Jocabed, Levipa ususin." },
      { q_es: "¿Cuántos años estuvo Israel en el desierto?", q_en: "How many years did Israel wander the desert?", q_qu: "¿Hayk'a watan Israel runakuna ch'usaq pajapi karqanku?", a_es: ["40", "20", "50"], a_en: ["40", "20", "50"], a_qu: ["40", "20", "50"], c: 0, ref: "Números 14:33", text_es: "Cuarenta años en el desierto.", text_en: "Forty years in the wilderness.", text_qu: "40 wata ch'usaq pajapi karqanku." },
      { q_es: "¿Quién fue el primer rey de Israel?", q_en: "Who was the first king of Israel?", q_qu: "¿Pin Israelpa ñawpaq reynin karqan?", a_es: ["Saúl", "David", "Samuel"], a_en: ["Saul", "David", "Samuel"], a_qu: ["Saúl", "David", "Samuel"], c: 0, ref: "1 Samuel 10:1", text_es: "Samuel ungió a Saúl.", text_en: "Samuel anointed Saul.", text_qu: "Samuelmi Saúl-ta aceitewan jwichirqan." },
      { q_es: "¿Quién ungió a David como rey?", q_en: "Who anointed David as king?", q_qu: "¿Pin Davidta rey kananpaq aceitewan jwichirqan?", a_es: ["Samuel", "Natán", "Gad"], a_en: ["Samuel", "Nathan", "Gad"], a_qu: ["Samuel", "Natán", "Gad"], c: 0, ref: "1 Samuel 16:13", text_es: "Samuel ungió a David.", text_en: "Samuel anointed David.", text_qu: "Samuelmi Davidta jwichirqan." },
      { q_es: "¿Qué arma usó David contra Goliat?", q_en: "What weapon did David use against Goliath?", q_qu: "¿Ima armawanmi David Goliat-ta wañuchirqan?", a_es: ["Honda", "Espada", "Lanza"], a_en: ["Sling", "Sword", "Spear"], a_qu: ["Waraka", "Espada", "Lanza"], c: 0, ref: "1 Samuel 17:49", text_es: "Tomó su honda y una piedra.", text_en: "He took his sling and a stone.", text_qu: "Warakanta rumiwan jap'irqan." },
      { q_es: "¿En qué monte recibió Moisés los mandamientos?", q_en: "On what mountain did Moses receive the commandments?", q_qu: "¿Mayqen orqopin Moisés kamachikuykunata chaskirqan?", a_es: ["Sinaí", "Carmelo", "Sion"], a_en: ["Sinai", "Carmel", "Zion"], a_qu: ["Sinaí", "Carmelo", "Sion"], c: 0, ref: "Éxodo 19:20", text_es: "Dios descendió al monte Sinaí.", text_en: "God descended to Mount Sinai.", text_qu: "Diosmi Sinaí orqoman uraykamurqan." },
      { q_es: "¿Quién era the hermano de Moisés?", q_en: "Who was Moses' brother?", q_qu: "¿Pin Moisespa wawqin karqan?", a_es: ["Aarón", "Josué", "Caleb"], a_en: ["Aaron", "Joshua", "Caleb"], a_qu: ["Aarón", "Josué", "Caleb"], c: 0, ref: "Éxodo 4:14", text_es: "Aarón, el levita, es tu hermano.", text_en: "Aaron the Levite is your brother.", text_qu: "Aarón, levita runan wawqiyki." },
      { q_es: "¿Cuántos hijos tuvo Jacob?", q_en: "How many sons did Jacob have?", q_qu: "¿Hayk'a churiyoqmi Jacob karqan?", a_es: ["12", "10", "7"], a_en: ["12", "10", "7"], a_qu: ["12", "10", "7"], c: 0, ref: "Génesis 35:22", text_es: "Doce hijos tuvo Jacob.", text_en: "Twelve sons Jacob had.", text_qu: "Jacob 12 churiyoq karqan." },
      { q_es: "¿Quién fue el esposo de Rut?", q_en: "Who was Ruth's husband (Boaz)?", q_qu: "¿Pin Rut-pa qosan karqan?", a_es: ["Boaz", "Elimelec", "Quelión"], a_en: ["Boaz", "Elimelech", "Chilion"], a_qu: ["Boaz", "Elimelec", "Quelión"], c: 0, ref: "Rut 4:13", text_es: "Boaz tomó a Rut por esposa.", text_en: "Boaz took Ruth as his wife.", text_qu: "Boaz Rut-ta casarakurqan." },
      { q_es: "¿Quién era la suegra de Rut?", q_en: "Who was Ruth's mother-in-law?", q_qu: "¿Pin Rut-pa quesachin karqan?", a_es: ["Noemí", "Débora", "Ana"], a_en: ["Naomi", "Deborah", "Hannah"], a_qu: ["Noemí", "Débora", "Ana"], c: 0, ref: "Rut 1:4", text_es: "Noemí era su suegra.", text_en: "Naomi was her mother-in-law.", text_qu: "Noemí karqan quesachin." },
      { q_es: "¿Quién fue la primera jueza de Israel?", q_en: "Who was the first female judge of Israel?", q_qu: "¿Pin Israelpi ñawpaq jueza warmi karqan?", a_es: ["Débora", "Rut", "Ester"], a_en: ["Deborah", "Ruth", "Esther"], a_qu: ["Débora", "Rut", "Ester"], c: 0, ref: "Jueces 4:4", text_es: "Débora, profetisa, juzgaba a Israel.", text_en: "Deborah, a prophetess, judged Israel.", text_qu: "Débora, profetisa, Israelta juzgaq." },
      { q_es: "¿Quién salvó a Israel siendo reina?", q_en: "Who saved Israel as queen?", q_qu: "¿Ima reinan Israelta qespichirqan?", a_es: ["Ester", "Rut", "Dalila"], a_en: ["Esther", "Ruth", "Delilah"], a_qu: ["Ester", "Rut", "Dalila"], c: 0, ref: "Ester 4:14", text_es: "Ester salvó a su pueblo.", text_en: "Esther saved her people.", text_qu: "Estermi llaqtanta qespichirqan." },
      { q_es: "¿Quién fue el profeta del fuego?", q_en: "Who was the prophet of fire?", q_qu: "¿Pin ninapa profetan karqan?", a_es: ["Elías", "Eliseo", "Isaías"], a_en: ["Elijah", "Elisha", "Isaiah"], a_qu: ["Elías", "Eliseo", "Isaías"], c: 0, ref: "1 Reyes 18:38", text_es: "El fuego de Jehová cayó.", text_en: "The fire of Jehovah fell.", text_qu: "Jehovapa ninan urmaykamurqan." },
      /* ===== NUEVO TESTAMENTO ===== */
      { q_es: "¿Dónde nació Jesús?", q_en: "Where was Jesus born?", q_qu: "¿Maypin Jesús nacerqan?", a_es: ["Belén", "Nazaret", "Jerusalén"], a_en: ["Bethlehem", "Nazareth", "Jerusalem"], a_qu: ["Belén", "Nazaret", "Jerusalén"], c: 0, ref: "Mateo 2:1", text_es: "Jesús nació en Belén.", text_en: "Jesus was born in Bethlehem.", text_qu: "Jesús Belén llaqtapin nacerqan." },
      { q_es: "¿Quién bautizó a Jesús?", q_en: "Who baptized Jesus?", q_qu: "¿Pin Jesusta bautizarqan?", a_es: ["Juan", "Pedro", "Pablo"], a_en: ["John", "Peter", "Paul"], a_qu: ["Juan", "Pedro", "Pablo"], c: 0, ref: "Mateo 3:13", text_es: "Jesús fue bautizado.", text_en: "Jesus was baptized.", text_qu: "Jesús bautizasqa karqan." },
      { q_es: "¿Cuántos discípulos tuvo Jesús?", q_en: "How many disciples did Jesus have?", q_qu: "¿Hayk'a discipulokunatan Jesús jap'irqan?", a_es: ["12", "10", "7"], a_en: ["12", "10", "7"], a_qu: ["12", "10", "7"], c: 0, ref: "Mateo 10:1", text_es: "Llamó a doce discípulos.", text_en: "He called twelve disciples.", text_qu: "12 discipulokunatan wajyarqan." },
      { q_es: "¿Quién negó a Jesús tres veces?", q_en: "Who denied Jesus three times?", q_qu: "¿Pin Jesusta kinsa kutita negarqan?", a_es: ["Pedro", "Juan", "Tomás"], a_en: ["Peter", "John", "Thomas"], a_qu: ["Pedro", "Juan", "Tomás"], c: 0, ref: "Lucas 22:61", text_es: "Pedro negó.", text_en: "Peter denied.", text_qu: "Pedromi negarqan." },
      { q_es: "¿En qué murió Jesús?", q_en: "How did Jesus die?", q_qu: "¿Imapin Jesús wañurqan?", a_es: ["En un madero", "En cruz", "A espada"], a_en: ["On a stake", "On a cross", "By sword"], a_qu: ["Maderopi", "Cruzpi", "Espadawan"], c: 0, ref: "Hechos 5:30", text_es: "Colgado en un madero.", text_en: "Hanged on a stake.", text_qu: "Maderopi warkusqa karqan." },
      { q_es: "¿Quién escribió Apocalipsis?", q_en: "Who wrote Revelation?", q_qu: "¿Pin Apocalipsis-ta qellqarqan?", a_es: ["Juan", "Pedro", "Pablo"], a_en: ["John", "Peter", "Paul"], a_qu: ["Juan", "Pedro", "Pablo"], c: 0, ref: "Apocalipsis 1:1", text_es: "Revelación dada a Juan.", text_en: "Revelation given to John.", text_qu: "Juanmi revelacionta chaskispa qellqarqan." },
      { q_es: "¿Quién traicionó a Jesús?", q_en: "Who betrayed Jesus?", q_qu: "¿Pin Jesusta traicionarqan?", a_es: ["Judas", "Pedro", "Tomás"], a_en: ["Judas", "Peter", "Thomas"], a_qu: ["Judas", "Pedro", "Tomás"], c: 0, ref: "Mateo 26:14", text_es: "Judas lo entregó.", text_en: "Judas handed him over.", text_qu: "Judasmi Jesusta qoran." },
      { q_es: "¿Cuánto recibió Judas por traicionar a Jesús?", q_en: "How much did Judas get for betraying Jesus?", q_qu: "¿Hayk'atan Judas chaskirqan Jesusta traicionasqanmanta?", a_es: ["30 piezas de plata", "10 monedas", "50 denarios"], a_en: ["30 silver pieces", "10 coins", "50 denarii"], a_qu: ["30 qolqe", "10 qolqe", "50 denarios"], c: 0, ref: "Mateo 26:15", text_es: "Le pagaron 30 piezas de plata.", text_en: "They paid him 30 silver pieces.", text_qu: "30 qolqeta paman qoranku." },
      { q_es: "¿Quién llevó el madero de Jesús?", q_en: "Who carried Jesus' cross?", q_qu: "¿Pin Jesustpa maderonta aparqan?", a_es: ["Simón de Cirene", "Juan", "Pedro"], a_en: ["Simon of Cyrene", "John", "Peter"], a_qu: ["Simón de Cirene", "Juan", "Pedro"], c: 0, ref: "Mateo 27:32", text_es: "Obligaron a Simón a cargar el madero.", text_en: "They forced Simon to carry the cross.", text_qu: "Simón Cirene runatan maderota apachirqanku." },
      { q_es: "¿En qué monte se transfiguró Jesús?", q_en: "On what mountain was Jesus transfigured?", q_qu: "¿Mayqen orqopin Jesús transfigurakurqan?", a_es: ["Monte alto", "Carmelo", "Sinaí"], a_en: ["High mountain", "Carmel", "Sinai"], a_qu: ["Jatun orqopi", "Carmelo", "Sinaí"], c: 0, ref: "Mateo 17:1", text_es: "Subió a un monte alto.", text_en: "He went up a high mountain.", text_qu: "Jatun orqoman wicharqan." },
      { q_es: "¿Cuántos panes multiplicó Jesús?", q_en: "How many loaves did Jesus multiply?", a_es: ["5", "7", "12"], a_en: ["5", "7", "12"], c: 0, ref: "Mateo 14:17", text_es: "Cinco panes y dos peces.", text_en: "Five loaves and two fish." },
      { q_es: "¿Quién fue el primer mártir cristiano?", q_en: "Who was the first Christian martyr?", a_es: ["Esteban", "Jacobo", "Pablo"], a_en: ["Stephen", "James", "Paul"], c: 0, ref: "Hechos 7:59", text_es: "Esteban fue apedreado.", text_en: "Stephen was stoned." },
      { q_es: "¿En qué ciudad se llamaron primero cristianos?", q_en: "In what city were followers first called Christians?", a_es: ["Antioquía", "Jerusalén", "Roma"], a_en: ["Antioch", "Jerusalem", "Rome"], c: 0, ref: "Hechos 11:26", text_es: "En Antioquía los llamaron cristianos.", text_en: "In Antioch they were called Christians." },
      { q_es: "¿Quién escribió más cartas del Nuevo Testamento?", q_en: "Who wrote the most letters in the New Testament?", a_es: ["Pablo", "Juan", "Pedro"], a_en: ["Paul", "John", "Peter"], c: 0, ref: "Romanos 1:1", text_es: "Pablo escribió muchas cartas.", text_en: "Paul wrote many letters." },
      { q_es: "¿Quién resucitó a Lázaro?", q_en: "Who raised Lazarus?", a_es: ["Jesús", "Pedro", "Elías"], a_en: ["Jesus", "Peter", "Elijah"], c: 0, ref: "Juan 11:43", text_es: "Jesús llamó a Lázaro.", text_en: "Jesus called Lazarus." },
      { q_es: "¿Cuántos días estuvo Jesús en el sepulcro?", q_en: "How many days was Jesus in the tomb?", a_es: ["3", "2", "7"], a_en: ["3", "2", "7"], c: 0, ref: "Mateo 12:40", text_es: "Tres días y tres noches.", text_en: "Three days and three nights." },
      { q_es: "¿A quién se le apareció primero Jesús resucitado?", q_en: "To whom did Jesus appear first after resurrection?", a_es: ["María Magdalena", "Pedro", "Juan"], a_en: ["Mary Magdalene", "Peter", "John"], c: 0, ref: "Juan 20:16", text_es: "Jesús dijo: María.", text_en: "Jesus said: Mary." },
      { q_es: "¿Cuántos días duró el ayuno de Jesús?", q_en: "How many days did Jesus fast?", a_es: ["40", "7", "3"], a_en: ["40", "7", "3"], c: 0, ref: "Mateo 4:2", text_es: "Ayunó cuarenta días y cuarenta noches.", text_en: "He fasted forty days and forty nights." },
      { q_es: "¿Qué ocupación tenía Pedro antes de seguir a Jesús?", q_en: "What was Peter's occupation before following Jesus?", a_es: ["Pescador", "Carpintero", "Recaudador"], a_en: ["Fisherman", "Carpenter", "Tax collector"], c: 0, ref: "Mateo 4:18", text_es: "Pedro era pescador.", text_en: "Peter was a fisherman." },
      { q_es: "¿Quién era el padre adoptivo de Jesús?", q_en: "Who was Jesus' adoptive father?", a_es: ["José", "Zacarías", "Simeón"], a_en: ["Joseph", "Zechariah", "Simeon"], c: 0, ref: "Mateo 1:16", text_es: "José, esposo de María.", text_en: "Joseph, husband of Mary." },
      /* MÁS PREGUNTAS (Sumando 100 en total) */
      { q_es: "¿De qué árbol comieron Adán y Eva?", q_en: "From which tree did Adam and Eve eat?", a_es: ["Bien y mal", "De la vida", "Higuera"], a_en: ["Good and evil", "Of life", "Fig tree"], c: 0, ref: "Génesis 3:6", text_es: "Comieron del árbol del bien y del mal.", text_en: "They ate from the tree of good and evil." },
      { q_es: "¿Qué animal engañó a Eva?", q_en: "What animal deceived Eve?", a_es: ["Serpiente", "León", "Cuervo"], a_en: ["Serpent", "Lion", "Raven"], c: 0, ref: "Génesis 3:4", text_es: "La serpiente dijo a la mujer: No moriréis.", text_en: "The serpent said to the woman: You will not die." },
      { q_es: "¿Qué señal dio Dios después del diluvio?", q_en: "What sign did God give after the flood?", a_es: ["Arcoíris", "Estrella", "Nube"], a_en: ["Rainbow", "Star", "Cloud"], c: 0, ref: "Génesis 9:13", text_es: "Pongo mi arco en las nubes.", text_en: "I put my bow in the clouds." },
      { q_es: "¿A quién le pidió Dios sacrificar a su hijo?", q_en: "Who did God ask to sacrifice his son?", a_es: ["Abraham", "Isaac", "Jacob"], a_en: ["Abraham", "Isaac", "Jacob"], c: 0, ref: "Génesis 22:2", text_es: "Toma a tu hijo y ofrécelo.", text_en: "Take your son and offer him." },
      { q_es: "¿A qué hijo iba a sacrificar Abraham?", q_en: "Which son was Abraham going to sacrifice?", a_es: ["Isaac", "Ismael", "Esaú"], a_en: ["Isaac", "Ishmael", "Esau"], c: 0, ref: "Génesis 22:9", text_es: "Ató a Isaac su hijo.", text_en: "He bound Isaac his son." },
      { q_es: "¿Quién fue vendido como esclavo por sus hermanos?", q_en: "Who was sold as a slave by his brothers?", a_es: ["José", "Benjamín", "Rubén"], a_en: ["Joseph", "Benjamin", "Reuben"], c: 0, ref: "Génesis 37:28", text_es: "Vendieron a José por 20 piezas de plata.", text_en: "They sold Joseph for 20 silver pieces." },
      { q_es: "¿Quién fue la esposa de Isaac?", q_en: "Who was Isaac's wife?", a_es: ["Rebeca", "Raquel", "Lea"], a_en: ["Rebekah", "Rachel", "Leah"], c: 0, ref: "Génesis 24:67", text_es: "Isaac tomó a Rebeca.", text_en: "Isaac took Rebekah." },
      { q_es: "¿Quién engañó a su padre para recibir la bendición?", q_en: "Who deceived his father to get the blessing?", a_es: ["Jacob", "Esaú", "José"], a_en: ["Jacob", "Esau", "Joseph"], c: 0, ref: "Génesis 27:23", text_es: "Jacob fue bendecido.", text_en: "Jacob was blessed." },
      { q_es: "¿Cómo se llamaba el hermano gemelo de Jacob?", q_en: "What was Jacob's twin brother's name?", a_es: ["Esaú", "Aarón", "Ismael"], a_en: ["Esau", "Aaron", "Ishmael"], c: 0, ref: "Génesis 25:25", text_es: "El primero que nació fue Esaú.", text_en: "The firstborn was Esau." },
      { q_es: "¿En qué se convirtió la esposa de Lot?", q_en: "What did Lot's wife turn into?", a_es: ["Estatua de sal", "Árbol", "Piedra"], a_en: ["Pillar of salt", "Tree", "Stone"], c: 0, ref: "Génesis 19:26", text_es: "Miró atrás y se volvió de sal.", text_en: "She looked back and became salt." },
      { q_es: "¿A quién se le apareció Dios en una zarza ardiente?", q_en: "To whom did God appear in a burning bush?", a_es: ["Moisés", "Josué", "Elías"], a_en: ["Moses", "Joshua", "Elijah"], c: 0, ref: "Éxodo 3:2", text_es: "La zarza ardía y no se consumía.", text_en: "The bush burned and was not consumed." },
      { q_es: "¿Qué mar cruzaron los israelitas en seco?", q_en: "Which sea did the Israelites cross on dry land?", a_es: ["Mar Rojo", "Mar Muerto", "Mar de Galilea"], a_en: ["Red Sea", "Dead Sea", "Sea of Galilee"], c: 0, ref: "Éxodo 14:22", text_es: "Entraron por medio del mar seco.", text_en: "They went into the midst of the dry sea." },
      { q_es: "¿Qué alimento cayó del cielo para Israel?", q_en: "What food fell from the sky for Israel?", a_es: ["Maná", "Trigo", "Miel"], a_en: ["Manna", "Wheat", "Honey"], c: 0, ref: "Éxodo 16:15", text_es: "Este es el pan que Jehová les da.", text_en: "This is the bread Jehovah gives you." },
      { q_es: "¿Quiénes fueron los dos espías que dieron un buen reporte?", q_en: "Who were the two spies with a good report?", a_es: ["Josué y Caleb", "Moisés y Aarón", "Gedeón y Sansón"], a_en: ["Joshua and Caleb", "Moses and Aaron", "Gideon and Samson"], c: 0, ref: "Números 14:6", text_es: "Josué y Caleb animaron al pueblo.", text_en: "Joshua and Caleb encouraged the people." },
      { q_es: "¿Qué ciudad fue destruida con fuego y azufre?", q_en: "Which city was destroyed by fire and brimstone?", a_es: ["Sodoma", "Jericó", "Nínive"], a_en: ["Sodom", "Jericho", "Nineveh"], c: 0, ref: "Génesis 19:24", text_es: "Jehová llovió fuego sobre Sodoma.", text_en: "Jehovah rained fire on Sodom." },
      { q_es: "¿A quién le dio su cabello una gran fuerza?", q_en: "Whose hair gave him great strength?", a_es: ["Sansón", "Salomón", "Absalón"], a_en: ["Samson", "Solomon", "Absalom"], c: 0, ref: "Jueces 16:17", text_es: "Si me rapan, mi fuerza se irá.", text_en: "If I am shaved, my strength will leave." },
      { q_es: "¿Qué reina visitó a Salomón por su fama?", q_en: "Which queen visited Solomon for his fame?", a_es: ["Reina de Sabá", "Reina Ester", "Reina Jezabel"], a_en: ["Queen of Sheba", "Queen Esther", "Queen Jezebel"], c: 0, ref: "1 Reyes 10:1", text_es: "Vino a ponerle pruebas difíciles.", text_en: "She came to test him with hard questions." },
      { q_es: "¿Quién tiró a Goliat con una honda?", q_en: "Who struck Goliath with a sling?", a_es: ["David", "Saúl", "Jonatán"], a_en: ["David", "Saul", "Jonathan"], c: 0, ref: "1 Samuel 17:50", text_es: "David venció al filisteo.", text_en: "David struck the Philistine." },
      { q_es: "¿Por qué ciudad desfiló el pueblo por siete días?", q_en: "Around which city did the people march for 7 days?", a_es: ["Jericó", "Jerusalén", "Samaria"], a_en: ["Jericho", "Jerusalem", "Samaria"], c: 0, ref: "Josué 6:15", text_es: "El séptimo día marcharon siete veces.", text_en: "On the seventh day they marched seven times." },
      { q_es: "¿Qué ave trajo una hoja de olivo a Noé?", q_en: "What bird brought an olive leaf to Noah?", a_es: ["Paloma", "Cuervo", "Águila"], a_en: ["Dove", "Raven", "Eagle"], c: 0, ref: "Génesis 8:11", text_es: "La paloma regresó con una hoja.", text_en: "The dove returned with a leaf." },
      { q_es: "¿A qué país huyó Jesús de niño con sus padres?", q_en: "To what country did Jesus flee as a child?", a_es: ["Egipto", "Babilonia", "Roma"], a_en: ["Egypt", "Babylon", "Rome"], c: 0, ref: "Mateo 2:14", text_es: "Huyó de noche a Egipto.", text_en: "He departed at night to Egypt." },
      { q_es: "¿En qué río bautizaba Juan el Bautista?", q_en: "In what river did John the Baptist baptize?", a_es: ["Jordán", "Nilo", "Éufrates"], a_en: ["Jordan", "Nile", "Euphrates"], c: 0, ref: "Mateo 3:6", text_es: "Los bautizaba en el río Jordán.", text_en: "He baptized them in the Jordan river." },
      { q_es: "¿Qué ángel anunció el nacimiento de Jesús?", q_en: "Which angel announced Jesus' birth?", a_es: ["Gabriel", "Miguel", "Rafael"], a_en: ["Gabriel", "Michael", "Raphael"], c: 0, ref: "Lucas 1:26", text_es: "El ángel Gabriel fue enviado.", text_en: "The angel Gabriel was sent." },
      { q_es: "¿Qué milagro hizo Jesús en Caná?", q_en: "What miracle did Jesus do in Cana?", a_es: ["Agua en vino", "Multiplicar pan", "Sanar ciegos"], a_en: ["Water into wine", "Multiply bread", "Healing blind"], c: 0, ref: "Juan 2:9", text_es: "El agua hecha vino.", text_en: "The water made wine." },
      { q_es: "¿De qué enfermedad sanó Jesús a los diez leprosos?", q_en: "What disease did Jesus heal the 10 men from?", a_es: ["Lepra", "Ceguera", "Sordera"], a_en: ["Leprosy", "Blindness", "Deafness"], c: 0, ref: "Lucas 17:12", text_es: "Encontró a diez leprosos.", text_en: "He met ten lepers." },
      { q_es: "¿Qué publicano se subió a un árbol para ver a Jesús?", q_en: "Which tax collector climbed a tree to see Jesus?", a_es: ["Zaqueo", "Mateo", "Judas"], a_en: ["Zacchaeus", "Matthew", "Judas"], c: 0, ref: "Lucas 19:4", text_es: "Subió a un árbol sicómoro.", text_en: "He climbed a sycamore tree." },
      { q_es: "¿A quién le dijo Jesús 'tienes que nacer de nuevo'?", q_en: "To whom did Jesus say 'you must be born again'?", a_es: ["Nicodemo", "Pedro", "Lázaro"], a_en: ["Nicodemus", "Peter", "Lazarus"], c: 0, ref: "Juan 3:7", text_es: "Os es necesario nacer de nuevo.", text_en: "You must be born again." },
      { q_es: "¿Cuál era la profesión de Mateo antes de seguir a Jesús?", q_en: "What was Matthew's profession before following Jesus?", a_es: ["Cobrador de impuestos", "Pescador", "Carpintero"], a_en: ["Tax collector", "Fisherman", "Carpenter"], c: 0, ref: "Mateo 9:9", text_es: "Vio a Mateo en la aduana.", text_en: "He saw Matthew at the tax booth." },
      { q_es: "¿Qué apóstol caminó sobre el agua hacia Jesús?", q_en: "Which apostle walked on water towards Jesus?", a_es: ["Pedro", "Juan", "Jacobo"], a_en: ["Peter", "John", "James"], c: 0, ref: "Mateo 14:29", text_es: "Pedro caminó sobre las aguas.", text_en: "Peter walked on the water." },
      { q_es: "¿Con cuántos peces alimentó Jesús a los 5000?", q_en: "With how many fish did Jesus feed the 5000?", a_es: ["Dos", "Siete", "Doce"], a_en: ["Two", "Seven", "Twelve"], c: 0, ref: "Mateo 14:17", text_es: "Cinco panes y dos peces.", text_en: "Five loaves and two fish." },
      { q_es: "¿Qué usó una mujer para secar los pies de Jesús?", q_en: "What did a woman use to dry Jesus' feet?", a_es: ["Sus cabellos", "Una toalla", "Su túnica"], a_en: ["Her hair", "A towel", "Her tunic"], c: 0, ref: "Lucas 7:38", text_es: "Los enjugaba con sus cabellos.", text_en: "She wiped them with her hair." },
      { q_es: "¿Quién lavó sus manos al condenar a Jesús?", q_en: "Who washed his hands when condemning Jesus?", a_es: ["Pilato", "Herodes", "Caifás"], a_en: ["Pilate", "Herod", "Caiaphas"], c: 0, ref: "Mateo 27:24", text_es: "Se lavó las manos ante la multitud.", text_en: "He washed his hands before the crowd." },
      { q_es: "¿Qué se rasgó en el templo cuando Jesús murió?", q_en: "What tore in the temple when Jesus died?", a_es: ["La cortina (velo)", "El altar", "Los muros"], a_en: ["The curtain (veil)", "The altar", "The walls"], c: 0, ref: "Mateo 27:51", text_es: "El velo del templo se rasgó.", text_en: "The temple curtain was torn." },
      { q_es: "¿Qué soldado reconoció a Jesús como Hijo de Dios en la cruz?", q_en: "Who recognized Jesus as Son of God on the cross?", a_es: ["Un centurión", "Un fariseo", "Pilato"], a_en: ["A centurion", "A pharisee", "Pilate"], c: 0, ref: "Mateo 27:54", text_es: "De veras este era Hijo de Dios.", text_en: "Truly this was the Son of God." },
      { q_es: "¿Qué apóstol exigió tocar a Jesús para creer?", q_en: "Which apostle demanded to touch Jesus to believe?", a_es: ["Tomás", "Felipe", "Pedro"], a_en: ["Thomas", "Philip", "Peter"], c: 0, ref: "Juan 20:25", text_es: "Tomás dijo: Si no viere, no creeré.", text_en: "Thomas said: If I don't see, I won't believe." },
      { q_es: "¿En qué festejo cayó el Espíritu Santo sobre sus discípulos?", q_en: "On what feast did the Holy Spirit fall on disciples?", a_es: ["Pentecostés", "Pascua", "Tabernáculos"], a_en: ["Pentecost", "Passover", "Tabernacles"], c: 0, ref: "Hechos 2:1", text_es: "Llegó el día de Pentecostés.", text_en: "The day of Pentecost came." },
      { q_es: "¿Quiénes mintieron sobre una propiedad y cayeron muertos?", q_en: "Who lied about money and fell dead?", a_es: ["Ananías y Safira", "Priscila y Aquila", "Marta y María"], a_en: ["Ananias and Sapphira", "Priscilla and Aquila", "Martha and Mary"], c: 0, ref: "Hechos 5:1", text_es: "Ananías y su mujer Safira mintieron.", text_en: "Ananias and Sapphira lied." },
      { q_es: "¿Qué se les apareció a los discípulos encendida en Pentecostés?", q_en: "What flaming thing appeared to disciples at Pentecost?", a_es: ["Lenguas de fuego", "Carros de fuego", "Zarzas ardientes"], a_en: ["Tongues of fire", "Chariots of fire", "Burning bushes"], c: 0, ref: "Hechos 2:3", text_es: "Se les aparecieron lenguas como de fuego.", text_en: "Tongues like fire appeared." },
      { q_es: "¿En el camino a qué ciudad se le apareció Jesús a Saulo?", q_en: "On the way to what city did Jesus appear to Saul?", a_es: ["Damasco", "Roma", "Jerusalén"], a_en: ["Damascus", "Rome", "Jerusalem"], c: 0, ref: "Hechos 9:3", text_es: "Yendo por el camino cerca de Damasco...", text_en: "On the road near Damascus..." },
      { q_es: "¿Quién escribió el libro de los Hechos (Hechos de los apóstoles)?", q_en: "Who wrote the book of Acts?", a_es: ["Lucas", "Pablo", "Pedro"], a_en: ["Luke", "Paul", "Peter"], c: 0, ref: "Lucas 1:3 / Hechos 1:1", text_es: "El médico amado lo escribió.", text_en: "The beloved physician wrote it." },
      { q_es: "¿Quién cayó herido por una ventana al dormirse?", q_en: "Who fell from a window while asleep?", a_es: ["Eutico", "Esteban", "Timoteo"], a_en: ["Eutychus", "Stephen", "Timothy"], c: 0, ref: "Hechos 20:9", text_es: "Eutico se durmió y cayó del tercer piso.", text_en: "Eutychus slept and fell from the third floor." },
      { q_es: "¿A qué isla fue desterrado el apóstol Juan?", q_en: "To what island was John exiled?", a_es: ["Patmos", "Chipre", "Creta"], a_en: ["Patmos", "Cyprus", "Crete"], c: 0, ref: "Apocalipsis 1:9", text_es: "Estaba en la isla llamada Patmos.", text_en: "I was on the island called Patmos." },
      { q_es: "¿A cuántas iglesias se dirigen las cartas en Apocalipsis?", q_en: "How many churches are written to in Revelation?", a_es: ["Siete", "Doce", "Diez"], a_en: ["Seven", "Twelve", "Ten"], c: 0, ref: "Apocalipsis 1:11", text_es: "Escribe a las siete iglesias.", text_en: "Write to the seven churches." },
      { q_es: "¿Quién es llamado 'El Verbo' (La Palabra) en la Biblia?", q_en: "Who is called 'The Word' in the Bible?", a_es: ["Jesús", "Moisés", "Juan"], a_en: ["Jesus", "Moses", "John"], c: 0, ref: "Juan 1:1", text_es: "El Verbo era con Dios.", text_en: "The Word was with God." },
      { q_es: "¿Quién fue el sumo sacerdote durante el juicio de Jesús?", q_en: "Who was high priest during Jesus' trial?", a_es: ["Caifás", "Anás", "Pilato"], a_en: ["Caiaphas", "Annas", "Pilate"], c: 0, ref: "Mateo 26:57", text_es: "Lo llevaron ante el sumo sacerdote Caifás.", text_en: "They took him to Caiaphas." },
      { q_es: "¿Quién pidió el cuerpo de Jesús a Pilato?", q_en: "Who asked Pilate for Jesus' body?", a_es: ["José de Arimatea", "Nicodemo", "Pedro"], a_en: ["Joseph of Arimathea", "Nicodemus", "Peter"], c: 0, ref: "Mateo 27:58", text_es: "José pidió el cuerpo de Jesús.", text_en: "Joseph asked for Jesus' body." },
      { q_es: "¿Dónde oró angustiado Jesús antes de ser arrestado?", q_en: "Where did Jesus pray before arrest?", a_es: ["Getsemaní", "Sinaí", "Gólgota"], a_en: ["Gethsemane", "Sinai", "Golgotha"], c: 0, ref: "Mateo 26:36", text_es: "Llegó a un lugar llamado Getsemaní.", text_en: "He came to Gethsemane." },
      { q_es: "¿Qué tipo de corona le pusieron a Jesús?", q_en: "What kind of crown was put on Jesus?", a_es: ["Corona de espinas", "Corona de oro", "Corona de laurel"], a_en: ["Crown of thorns", "Crown of gold", "Crown of laurel"], c: 0, ref: "Mateo 27:29", text_es: "Pusieron sobre su cabeza una corona tejida de espinas.", text_en: "They put a crown of thorns on him." },
      { q_es: "¿Quién es nuestro único mediador ante Dios?", q_en: "Who is our only mediator before God?", a_es: ["Jesucristo", "María", "Los ángeles"], a_en: ["Jesus Christ", "Mary", "Angels"], c: 0, ref: "1 Timoteo 2:5", text_es: "Un solo mediador, Jesucristo hombre.", text_en: "One mediator, the man Christ Jesus." },
      { q_es: "¿De qué jardín fueron expulsados Adán y Eva?", q_en: "From which garden were Adam and Eve exiled?", a_es: ["Edén", "Getsemaní", "Carmelo"], a_en: ["Eden", "Gethsemane", "Carmel"], c: 0, ref: "Génesis 3:23", text_es: "Lo sacó del huerto del Edén.", text_en: "He sent him out of Eden." },
      
      /* ====== 100 PREGUNTAS MÁS DIFÍCILES (Niveles 3 al 5) ====== */
      { q_es: "¿Qué rey de Judá tuvo lepra hasta su muerte?", q_en: "Which king of Judah had leprosy until his death?", a_es: ["Uzías", "Ezequías", "Josías"], a_en: ["Uzziah", "Hezekiah", "Josiah"], c: 0, ref: "2 Crónicas 26:21", text_es: "Uzías quedó leproso.", text_en: "Uzziah became a leper." },
      { q_es: "¿Cómo se llamaba el escriba del profeta Jeremías?", q_en: "What was the name of Jeremiah's scribe?", a_es: ["Baruc", "Esdras", "Zacarías"], a_en: ["Baruch", "Ezra", "Zechariah"], c: 0, ref: "Jeremías 36:4", text_es: "Jeremías llamó a Baruc.", text_en: "Jeremiah called Baruch." },
      { q_es: "¿A qué profeta le ordenó Dios casarse a una prostituta?", q_en: "Which prophet was told to marry a prostitute?", a_es: ["Oseas", "Amós", "Miqueas"], a_en: ["Hosea", "Amos", "Micah"], c: 0, ref: "Oseas 1:2", text_es: "Tómate una mujer fornicaria.", text_en: "Take a wife of whoredom." },
      { q_es: "¿Qué rey construyó la ciudad de Samaria?", q_en: "Which king built the city of Samaria?", a_es: ["Omri", "Acab", "Jeroboam"], a_en: ["Omri", "Ahab", "Jeroboam"], c: 0, ref: "1 Reyes 16:24", text_es: "Omri edificó Samaria.", text_en: "Omri built Samaria." },
      { q_es: "¿Quién mató al rey Eglón con un puñal?", q_en: "Who killed King Eglon with a dagger?", a_es: ["Aod", "Otoniel", "Sangá"], a_en: ["Ehud", "Othniel", "Shamgar"], c: 0, ref: "Jueces 3:21", text_es: "Aod metió el puñal.", text_en: "Ehud thrust the dagger." },
      { q_es: "¿Cuál era el nombre del padre de Matusalén?", q_en: "What was the name of Methuselah's father?", a_es: ["Enoc", "Lamec", "Set"], a_en: ["Enoch", "Lamech", "Seth"], c: 0, ref: "Génesis 5:21", text_es: "Enoc engendró a Matusalén.", text_en: "Enoch became father to Methuselah." },
      { q_es: "¿Cómo se llamó el hijo que Abraham tuvo con Agar?", q_en: "What was the name of the son Abraham had with Hagar?", a_es: ["Ismael", "Isaac", "Zimrán"], a_en: ["Ishmael", "Isaac", "Zimran"], c: 0, ref: "Génesis 16:15", text_es: "Agar dio a luz a Ismael.", text_en: "Hagar bore Ishmael." },
      { q_es: "¿Qué juez tenía 30 hijos que cabalgaban 30 asnos?", q_en: "Which judge had 30 sons who rode 30 donkeys?", a_es: ["Jair", "Ibsán", "Tolá"], a_en: ["Jair", "Ibzan", "Tola"], c: 0, ref: "Jueces 10:4", text_es: "Tuvo treinta hijos sobre treinta asnos.", text_en: "He had thirty sons on thirty donkeys." },
      { q_es: "¿A qué rey cananeo le cortaron los pulgares?", q_en: "Which Canaanite king had his thumbs cut off?", a_es: ["Adoni-bezec", "Jabín", "Sihón"], a_en: ["Adoni-bezek", "Jabin", "Sihon"], c: 0, ref: "Jueces 1:6", text_es: "Le cortaron los pulgares.", text_en: "They cut off his thumbs." },
      { q_es: "¿De quién era madre Elisabet (Isabel)?", q_en: "Who was Elizabeth's son?", a_es: ["Juan el Bautista", "Jesús", "Santiago"], a_en: ["John the Baptist", "Jesus", "James"], c: 0, ref: "Lucas 1:57", text_es: "Elisabet dio a luz un hijo.", text_en: "Elizabeth brought forth a son." },
      { q_es: "¿Cómo se llamaba la esposa de Moisés?", q_en: "What was the name of Moses' wife?", a_es: ["Séfora", "Miriam", "Raquel"], a_en: ["Zipporah", "Miriam", "Rachel"], c: 0, ref: "Éxodo 2:21", text_es: "Dio a Moisés su hija Séfora.", text_en: "He gave Moses his daughter Zipporah." },
      { q_es: "¿Quiénes construyeron los utensilios del Tabernáculo?", q_en: "Who built the utensils for the Tabernacle?", a_es: ["Bezaleel y Aholiab", "Moisés y Aarón", "Josué y Caleb"], a_en: ["Bezalel and Oholiab", "Moses and Aaron", "Joshua and Caleb"], c: 0, ref: "Éxodo 31:2", text_es: "He llamado a Bezaleel.", text_en: "I have called Bezalel." },
      { q_es: "¿Qué líder rebelde fue tragado por la tierra?", q_en: "Which rebel leader was swallowed by the earth?", a_es: ["Coré", "Acán", "Absalón"], a_en: ["Korah", "Achan", "Absalom"], c: 0, ref: "Números 16:32", text_es: "La tierra los tragó.", text_en: "The earth swallowed them." },
      { q_es: "¿Qué adivino fue contratado para maldecir a Israel?", q_en: "What diviner was hired to curse Israel?", a_es: ["Balaam", "Balac", "Simón"], a_en: ["Balaam", "Balak", "Simon"], c: 0, ref: "Números 22:5", text_es: "Balac envió por Balaam.", text_en: "Balak sent for Balaam." },
      { q_es: "¿Quién detuvo una plaga clavando una lanza a dos personas?", q_en: "Who stopped a plague by spearing two people?", a_es: ["Finees", "Aarón", "Josué"], a_en: ["Phinehas", "Aaron", "Joshua"], c: 0, ref: "Números 25:7", text_es: "Finees tomó una lanza.", text_en: "Phinehas took a spear." },
      { q_es: "¿Qué familia de hermanas pidió herencia de tierras?", q_en: "Which family of sisters asked for land inheritance?", a_es: ["Hijas de Zelofehad", "Hijas de Lot", "Hijas de Job"], a_en: ["Daughters of Zelophehad", "Daughters of Lot", "Daughters of Job"], c: 0, ref: "Números 27:1", text_es: "Vinieron las hijas de Zelofehad.", text_en: "The daughters of Zelophehad came." },
      { q_es: "¿Quién robó el manto babilónico en Jericó?", q_en: "Who stole the Babylonian garment in Jericho?", a_es: ["Acán", "Gazi", "Coré"], a_en: ["Achan", "Gehazi", "Korah"], c: 0, ref: "Josué 7:21", text_es: "Acán tomó el manto babilónico.", text_en: "Achan took the Babylonian garment." },
      { q_es: "¿Qué pueblo engañó a Josué con pan mohoso?", q_en: "Which people deceived Joshua with moldy bread?", a_es: ["Gabaonitas", "Amorreos", "Jebuseos"], a_en: ["Gibeonites", "Amorites", "Jebusites"], c: 0, ref: "Josué 9:4", text_es: "Usaron astucia, pan seco y mohoso.", text_en: "They used moldy bread." },
      { q_es: "¿Quién fue el general cananeo que huyó de Barac?", q_en: "Who was the Canaanite general that fled from Barak?", a_es: ["Sísara", "Jabín", "Eglón"], a_en: ["Sisera", "Jabin", "Eglon"], c: 0, ref: "Jueces 4:15", text_es: "Sísara huyó a pie.", text_en: "Sisera fled on foot." },
      { q_es: "¿Qué mujer mató a Sísara con una estaca de tienda?", q_en: "Which woman killed Sisera with a tent peg?", a_es: ["Jael", "Débora", "Rut"], a_en: ["Jael", "Deborah", "Ruth"], c: 0, ref: "Jueces 4:21", text_es: "Jael metió la estaca por sus sienes.", text_en: "Jael drove the peg into his temple." },
      { q_es: "¿Qué juez hizo un voto precipitado sobre su hija?", q_en: "Which judge made a rash vow about his daughter?", a_es: ["Jefté", "Sansón", "Gedeón"], a_en: ["Jephthah", "Samson", "Gideon"], c: 0, ref: "Jueces 11:30", text_es: "Jefté hizo un voto.", text_en: "Jephthah made a vow." },
      { q_es: "¿Cómo se llamaba la otra esposa de Elcana (además de Ana)?", q_en: "What was the name of Elkanah's other wife (besides Hannah)?", a_es: ["Penina", "Orfa", "Mical"], a_en: ["Peninnah", "Orpah", "Michal"], c: 0, ref: "1 Samuel 1:2", text_es: "Una era Ana, y la otra Penina.", text_en: "One was Hannah, the other Peninnah." },
      { q_es: "¿Cómo se llamaban los hijos malvados de Elí?", q_en: "What were the names of Eli's wicked sons?", a_es: ["Ofni y Finees", "Nadab y Abiú", "Joel y Abías"], a_en: ["Hophni and Phinehas", "Nadab and Abihu", "Joel and Abijah"], c: 0, ref: "1 Samuel 1:3", text_es: "Ofni y Finees, sacerdotes de Jehová.", text_en: "Hophni and Phinehas, priests." },
      { q_es: "¿Quién era el esposo rico y necio de Abigail?", q_en: "Who was the rich and foolish husband of Abigail?", a_es: ["Nabal", "Uría", "Nabaliel"], a_en: ["Nabal", "Uriah", "Nabaliel"], c: 0, ref: "1 Samuel 25:3", text_es: "El hombre se llamaba Nabal.", text_en: "The man's name was Nabal." },
      { q_es: "¿Cómo se llamaba el general del ejército del rey Saúl?", q_en: "What was the name of King Saul's army general?", a_es: ["Abner", "Joab", "Amasa"], a_en: ["Abner", "Joab", "Amasa"], c: 0, ref: "1 Samuel 14:50", text_es: "El general era Abner.", text_en: "The general was Abner." },
      { q_es: "¿Cuál hijo de Jonatán era cojo de ambos pies?", q_en: "Which son of Jonathan was lame in both feet?", a_es: ["Mefiboset", "Is-boset", "Maquir"], a_en: ["Mephibosheth", "Ish-bosheth", "Machir"], c: 0, ref: "2 Samuel 4:4", text_es: "Quedó cojo, y se llamaba Mefiboset.", text_en: "He became lame, named Mephibosheth." },
      { q_es: "¿Quién murió al tocar el arca del pacto para sostenerla?", q_en: "Who died when he touched the ark to steady it?", a_es: ["Uza", "Ahío", "Abinadab"], a_en: ["Uzzah", "Ahio", "Abinadab"], c: 0, ref: "2 Samuel 6:7", text_es: "Dios lo hirió allí.", text_en: "God struck him down there." },
      { q_es: "¿Qué profeta confrontó a David por su pecado con Betsabé?", q_en: "Which prophet confronted David about his sin with Bathsheba?", a_es: ["Natán", "Gad", "Amós"], a_en: ["Nathan", "Gad", "Amos"], c: 0, ref: "2 Samuel 12:1", text_es: "Jehová envió a Natán a David.", text_en: "Jehovah sent Nathan to David." },
      { q_es: "¿A quién le compró David la era para construir un altar?", q_en: "From whom did David buy the threshing floor to build an altar?", a_es: ["Arauna", "Ornán", "Efrón"], a_en: ["Araunah", "Ornan", "Ephron"], c: 0, ref: "2 Samuel 24:18", text_es: "Sube y levanta altar en la era de Arauna.", text_en: "Go up and rear an altar in Araunah's floor." },
      { q_es: "¿Qué hijo de David intentó usurpar el trono antes que Salomón?", q_en: "Which son of David tried to usurp the throne before Solomon?", a_es: ["Adonías", "Absalón", "Amnón"], a_en: ["Adonijah", "Absalom", "Amnon"], c: 0, ref: "1 Reyes 1:5", text_es: "Adonías se rebeló diciendo: Yo reinaré.", text_en: "Adonijah exalted himself saying: I will be king." },
      { q_es: "¿Qué rey de Tiro ayudó a Salomón a construir el Templo?", q_en: "Which king of Tyre helped Solomon build the Temple?", a_es: ["Hiram", "Senaquerib", "Ciro"], a_en: ["Hiram", "Sennacherib", "Cyrus"], c: 0, ref: "1 Reyes 5:1", text_es: "Hiram envió siervos a Salomón.", text_en: "Hiram sent servants to Solomon." },
      { q_es: "¿Quién fue el primer rey del reino dividido de Israel (norte)?", q_en: "Who was the first king of the divided kingdom of Israel (north)?", a_es: ["Jeroboam", "Roboam", "Acab"], a_en: ["Jeroboam", "Rehoboam", "Ahab"], c: 0, ref: "1 Reyes 12:20", text_es: "Hicieron a Jeroboam rey de Israel.", text_en: "They made Jeroboam king over Israel." },
      { q_es: "¿Quién fue el hijo y sucesor del rey Salomón?", q_en: "Who was the son and successor of King Solomon?", a_es: ["Roboam", "Jeroboam", "Asa"], a_en: ["Rehoboam", "Jeroboam", "Asa"], c: 0, ref: "1 Reyes 11:43", text_es: "Reinó en su lugar su hijo Roboam.", text_en: "His son Rehoboam reigned in his stead." },
      { q_es: "¿Qué general sirio fue sanado de lepra en el río Jordán?", q_en: "Which Syrian general was healed of leprosy in the Jordan River?", a_es: ["Naamán", "Hazael", "Ben-adad"], a_en: ["Naaman", "Hazael", "Ben-hadad"], c: 0, ref: "2 Reyes 5:14", text_es: "Naamán se zambulló siete veces.", text_en: "Naaman dipped himself seven times." },
      { q_es: "¿Cómo se llamaba el siervo de Eliseo que quedó leproso por avaricia?", q_en: "What was the name of Elisha's servant who became leprous out of greed?", a_es: ["Giezi", "Baruc", "Ziba"], a_en: ["Gehazi", "Baruch", "Ziba"], c: 0, ref: "2 Reyes 5:20", text_es: "Giezi corrió tras Naamán.", text_en: "Gehazi ran after Naaman." },
      { q_es: "¿Qué reina usurpó el trono de Judá y mató a sus nietos?", q_en: "Which queen usurped the throne of Judah and killed her grandchildren?", a_es: ["Atalía", "Jezabel", "Mical"], a_en: ["Athaliah", "Jezebel", "Michal"], c: 0, ref: "2 Reyes 11:1", text_es: "Atalía destruyó toda la descendencia real.", text_en: "Athaliah destroyed all the royal seed." },
      { q_es: "¿Qué rey asirio sitió Jerusalén en tiempos de Ezequías?", q_en: "Which Assyrian king besieged Jerusalem in the days of Hezekiah?", a_es: ["Senaquerib", "Nabucodonosor", "Ciro"], a_en: ["Sennacherib", "Nebuchadnezzar", "Cyrus"], c: 0, ref: "2 Reyes 18:13", text_es: "Subió Senaquerib rey de Asiria.", text_en: "Sennacherib king of Assyria came up." },
      { q_es: "¿Qué rey niño de 8 años encontró el Libro de la Ley?", q_en: "Which 8-year-old boy king found the Book of the Law?", a_es: ["Josías", "Joás", "Uzías"], a_en: ["Josiah", "Joash", "Uzziah"], c: 0, ref: "2 Reyes 22:1", text_es: "De ocho años era Josías.", text_en: "Josiah was eight years old." },
      { q_es: "¿Quién fue el último rey de Judá antes del exilio a Babilonia?", q_en: "Who was the last king of Judah before the Babylonian exile?", a_es: ["Sedequías", "Joacim", "Jeconías"], a_en: ["Zedekiah", "Jehoiakim", "Jeconiah"], c: 0, ref: "2 Reyes 24:18", text_es: "Sedequías reinó en Jerusalén.", text_en: "Zedekiah reigned in Jerusalem." },
      { q_es: "¿Qué rey vio una mano escribiendo en la pared?", q_en: "Which king saw a hand writing on the wall?", a_es: ["Belsasar", "Darío", "Ciro"], a_en: ["Belshazzar", "Darius", "Cyrus"], c: 0, ref: "Daniel 5:5", text_es: "El rey veía la mano que escribía.", text_en: "The king saw the hand that wrote." },
      { q_es: "¿Qué líder reconstruyó las murallas de Jerusalén?", q_en: "Which leader rebuilt the walls of Jerusalem?", a_es: ["Nehemías", "Esdras", "Zorobabel"], a_en: ["Nehemiah", "Ezra", "Zerubbabel"], c: 0, ref: "Nehemías 2:17", text_es: "Venid, edifiquemos el muro.", text_en: "Come, let us build the wall." },
      { q_es: "¿Cómo se llamaba el esposo de la profetisa Ana?", q_en: "Who was the husband of the prophetess Anna?", a_es: ["No se menciona", "Zacarías", "Simeón"], a_en: ["Not mentioned", "Zechariah", "Simeon"], c: 0, ref: "Lucas 2:36", text_es: "Estuvo casada por siete años.", text_en: "She lived with a husband seven years." },
      { q_es: "¿En qué región liberó Jesús a un endemoniado llamado Legión?", q_en: "In what region did Jesus free a demoniac named Legion?", a_es: ["Gadara (Los gadarenos)", "Cesarea", "Judea"], a_en: ["Gadarenes", "Caesarea", "Judea"], c: 0, ref: "Lucas 8:26", text_es: "Arribaron a la tierra de los gadarenos.", text_en: "They arrived at the country of the Gadarenes." },
      { q_es: "¿A qué jefe de la sinagoga le resucitó Jesús a su hija?", q_en: "To which synagogue ruler did Jesus resurrect his daughter?", a_es: ["Jairo", "Nicodemo", "Crispo"], a_en: ["Jairus", "Nicodemus", "Crispus"], c: 0, ref: "Marcos 5:22", text_es: "Vino uno de los principales llamado Jairo.", text_en: "There came a ruler named Jairus." },
      { q_es: "¿En qué estanque fue sanado un paralítico que llevaba 38 años enfermo?", q_en: "At what pool was a paralytic of 38 years healed?", a_es: ["Betesda", "Siloé", "Jordán"], a_en: ["Bethesda", "Siloam", "Jordan"], c: 0, ref: "Juan 5:2", text_es: "Hay un estanque llamado Betesda.", text_en: "There is a pool called Bethesda." },
      { q_es: "¿A qué ciego le untó Jesús barro con saliva y lo mandó a lavarse?", q_en: "Which blind man did Jesus put mud on and send to wash?", a_es: ["Ciego de nacimiento (Siloé)", "Bartimeo", "Ciego de Betsaida"], a_en: ["Man born blind (Siloam)", "Bartimaeus", "Blind man of Bethsaida"], c: 0, ref: "Juan 9:7", text_es: "Ve a lavarte al estanque de Siloé.", text_en: "Go, wash in the pool of Siloam." },
      { q_es: "¿Cómo se llamaba el siervo al que Pedro le cortó la oreja?", q_en: "What was the name of the servant whose ear Peter cut off?", a_es: ["Malco", "Cornelio", "Julio"], a_en: ["Malchus", "Cornelius", "Julius"], c: 0, ref: "Juan 18:10", text_es: "El nombre del siervo era Malco.", text_en: "The servant's name was Malchus." },
      { q_es: "¿Quién era el suegro de Caifás?", q_en: "Who was the father-in-law of Caiaphas?", a_es: ["Anás", "Ananías", "Gamaliel"], a_en: ["Annas", "Ananias", "Gamaliel"], c: 0, ref: "Juan 18:13", text_es: "Primero lo llevaron a Anás.", text_en: "They led him away to Annas first." },
      { q_es: "¿A qué criminal soltó Pilato en lugar de Jesús?", q_en: "What criminal did Pilate release instead of Jesus?", a_es: ["Barrabás", "Dimas", "Gestas"], a_en: ["Barabbas", "Dismas", "Gestas"], c: 0, ref: "Marcos 15:15", text_es: "Pilato les soltó a Barrabás.", text_en: "Pilate released Barabbas to them." },
      { q_es: "¿En qué lugar que significa 'La Calavera' crucificaron a Jesús?", q_en: "At what place meaning 'The Skull' was Jesus crucified?", a_es: ["Gólgota", "Getsemaní", "Sión"], a_en: ["Golgotha", "Gethsemane", "Zion"], c: 0, ref: "Mateo 27:33", text_es: "Gólgota, que significa: Lugar de la Calavera.", text_en: "Golgotha, meaning: Place of a Skull." },
      { q_es: "¿De quién era discípulo uno de los que caminaban con Jesús hacia Emaús?", q_en: "Who was one of the disciples walking with Jesus to Emmaus?", a_es: ["Cleofas", "Apolos", "Esteban"], a_en: ["Cleopas", "Apollos", "Stephen"], c: 0, ref: "Lucas 24:18", text_es: "Respondiendo uno llamado Cleofas...", text_en: "One of them, named Cleopas, answered..." },
      { q_es: "¿A quién eligieron para reemplazar a Judas Iscariote?", q_en: "Who was chosen to replace Judas Iscariot?", a_es: ["Matías", "José / Barsabás", "Pablo"], a_en: ["Matthias", "Joseph / Barsabbas", "Paul"], c: 0, ref: "Hechos 1:26", text_es: "La suerte cayó sobre Matías.", text_en: "The lot fell on Matthias." },
      { q_es: "¿En qué puerta del Templo sanaron Pedro y Juan al cojo?", q_en: "At what temple gate did Peter and John heal the lame man?", a_es: ["La Hermosa", "Puerta de las Ovejas", "Puerta Oriental"], a_en: ["Beautiful", "Sheep Gate", "Eastern Gate"], c: 0, ref: "Hechos 3:2", text_es: "A la puerta llamada la Hermosa.", text_en: "At the gate called Beautiful." },
      { q_es: "¿Qué fariseo sabio recomendó liberar a los apóstoles?", q_en: "What wise Pharisee advised freeing the apostles?", a_es: ["Gamaliel", "Nicodemo", "Saulo"], a_en: ["Gamaliel", "Nicodemus", "Saul"], c: 0, ref: "Hechos 5:34", text_es: "Se levantó Gamaliel, doctor de la ley.", text_en: "Gamaliel, a teacher of the law, stood up." },
      { q_es: "¿De dónde era José, llamado Bernabé por los apóstoles?", q_en: "Where was Joseph, called Barnabas by the apostles, from?", a_es: ["Chipre", "Tarso", "Alejandría"], a_en: ["Cyprus", "Tarsus", "Alexandria"], c: 0, ref: "Hechos 4:36", text_es: "Levita natural de Chipre.", text_en: "A Levite of Cyprus." },
      { q_es: "¿Cómo se llamaba la reina de los etíopes servida por el eunuco?", q_en: "What was the name of the queen of the Ethiopians served by the eunuch?", a_es: ["Candace", "Sabá", "Atalía"], a_en: ["Candace", "Sheba", "Athaliah"], c: 0, ref: "Hechos 8:27", text_es: "Funcionario de Candace, reina de los etíopes.", text_en: "An official of Candace, queen of the Ethiopians." },
      { q_es: "¿Cúal era el nombre de la mujer que Pedro resucitó en Jope?", q_en: "What was the name of the woman Peter resurrected in Joppa?", a_es: ["Tabita (Dorcas)", "Lidia", "Priscila"], a_en: ["Tabitha (Dorcas)", "Lydia", "Priscilla"], c: 0, ref: "Hechos 9:36", text_es: "Había una discípula llamada Tabita.", text_en: "There was a disciple named Tabitha." },
      { q_es: "¿Quién era el centurión piadoso en Cesarea que mandó llamar a Pedro?", q_en: "Who was the devout centurion in Caesarea who sent for Peter?", a_es: ["Cornelio", "Julio", "Galo"], a_en: ["Cornelius", "Julius", "Gallio"], c: 0, ref: "Hechos 10:1", text_es: "Cierto hombre llamado Cornelio.", text_en: "A certain man named Cornelius." },
      { q_es: "¿Qué profeta predijo una gran hambre en el imperio?", q_en: "Which prophet foretold a great famine in the empire?", a_es: ["Agabo", "Silas", "Judas"], a_en: ["Agabus", "Silas", "Judas"], c: 0, ref: "Hechos 11:28", text_es: "Agabo daba a entender que habría hambre.", text_en: "Agabus predicted a famine." },
      { q_es: "¿Cómo se llamaba la muchacha que no le abrió la puerta a Pedro de la emoción?", q_en: "What was the name of the girl who didn't open the door to Peter out of joy?", a_es: ["Rode", "Loida", "Eunice"], a_en: ["Rhoda", "Lois", "Eunice"], c: 0, ref: "Hechos 12:13", text_es: "Salió a escuchar una muchacha llamada Rode.", text_en: "A girl named Rhoda came to answer." },
      { q_es: "¿Qué falso profeta quedó ciego al enfrentarse a Pablo?", q_en: "What false prophet was blinded when opposing Paul?", a_es: ["Elimas (Barjesús)", "Simón el mago", "Teudas"], a_en: ["Elymas (Bar-Jesus)", "Simon the sorcerer", "Theudas"], c: 0, ref: "Hechos 13:8", text_es: "Elimas el mago se les oponía.", text_en: "Elymas the sorcerer opposed them." },
      { q_es: "¿Quién era la vendedora de púrpura que se bautizó en Filipos?", q_en: "Who was the seller of purple baptized in Philippi?", a_es: ["Lidia", "Eunice", "Febe"], a_en: ["Lydia", "Eunice", "Phoebe"], c: 0, ref: "Hechos 16:14", text_es: "Una mujer llamada Lidia oyó.", text_en: "A woman named Lydia heard us." },
      { q_es: "¿Quién hospedó a Pablo en Tesalónica y fue arrastrado ante los jueces?", q_en: "Who hosted Paul in Thessalonica and was dragged before judges?", a_es: ["Jasón", "Crispo", "Sóstenes"], a_en: ["Jason", "Crispus", "Sosthenes"], c: 0, ref: "Hechos 17:5", text_es: "Asaltaron la casa de Jasón.", text_en: "They assaulted the house of Jason." },
      { q_es: "¿En qué colina o tribunal predicó Pablo en Atenas?", q_en: "On what hill or council did Paul preach in Athens?", a_es: ["El Areópago", "El Sanedrín", "El Pretorio"], a_en: ["The Areopagus", "The Sanhedrin", "The Praetorium"], c: 0, ref: "Hechos 17:22", text_es: "Pablo, de pie en el Areópago.", text_en: "Paul, standing in the Areopagus." },
      { q_es: "¿Quiénes eran los esposos fabricantes de tiendas que ayudaron a Pablo?", q_en: "Who were the tent-making husband and wife that helped Paul?", a_es: ["Aquila y Priscila", "Ananías y Safira", "Andrónico y Junias"], a_en: ["Aquila and Priscilla", "Ananias and Sapphira", "Andronicus and Junia"], c: 0, ref: "Hechos 18:2", text_es: "Halló a un judío llamado Aquila y a su mujer Priscila.", text_en: "He found a Jew named Aquila and Priscilla." },
      { q_es: "¿Cómo se llamaba el principal de la sinagoga en Corinto que creyó en el Señor?", q_en: "What was the name of the synagogue ruler in Corinth who believed?", a_es: ["Crispo", "Galo", "Demetrio"], a_en: ["Crispus", "Gallio", "Demetrius"], c: 0, ref: "Hechos 18:8", text_es: "Crispo creyó en el Señor.", text_en: "Crispus believed in the Lord." },
      { q_es: "¿Qué judío de Alejandría, muy elocuente, predicaba en Éfeso?", q_en: "What eloquent Jew from Alexandria preached in Ephesus?", a_es: ["Apolos", "Tito", "Timoteo"], a_en: ["Apollos", "Titus", "Timothy"], c: 0, ref: "Hechos 18:24", text_es: "Llegó a Éfeso Apolos.", text_en: "Apollos came to Ephesus." },
      { q_es: "¿Qué platero instigó un motín en Éfeso contra Pablo?", q_en: "What silversmith started a riot in Ephesus against Paul?", a_es: ["Demetrio", "Alejandro", "Eutico"], a_en: ["Demetrius", "Alexander", "Eutychus"], c: 0, ref: "Hechos 19:24", text_es: "Un platero llamado Demetrio.", text_en: "A silversmith named Demetrius." },
      { q_es: "¿Cómo se llamaba la esposa judía del gobernador romano Félix?", q_en: "What was the name of the Jewish wife of the Roman governor Felix?", a_es: ["Drusila", "Berenice", "María"], a_en: ["Drusilla", "Bernice", "Mary"], c: 0, ref: "Hechos 24:24", text_es: "Vino Félix con su mujer Drusila.", text_en: "Felix came with his wife Drusilla." },
      { q_es: "¿Qué gobernador romano sucedió a Félix en Judea?", q_en: "Which Roman governor succeeded Felix in Judea?", a_es: ["Porcio Festo", "Poncio Pilato", "Lucio"], a_en: ["Porcius Festus", "Pontius Pilate", "Lucius"], c: 0, ref: "Hechos 24:27", text_es: "Félix tuvo por sucesor a Porcio Festo.", text_en: "Felix was succeeded by Porcius Festus." },
      { q_es: "¿A qué rey le dijo con audacia Pablo su testimonio casi convenciéndolo?", q_en: "To which king did Paul boldly give his testimony almost persuading him?", a_es: ["Rey Agripa", "Rey Herodes", "Rey Aretas"], a_en: ["King Agrippa", "King Herod", "King Aretas"], c: 0, ref: "Hechos 26:28", text_es: "Agripa dijo a Pablo: Por poco me persuades.", text_en: "Agrippa said: You almost persuade me." },
      { q_es: "¿En qué isla naufragó el apóstol Pablo?", q_en: "On which island was the apostle Paul shipwrecked?", a_es: ["Malta (Melita)", "Chipre", "Tróade"], a_en: ["Malta (Melita)", "Cyprus", "Troas"], c: 0, ref: "Hechos 28:1", text_es: "Supimos que la isla se llamaba Malta.", text_en: "We learned the island was called Malta." },
      { q_es: "¿Cómo se llamaba el gobernador o 'hombre principal' de la isla Malta?", q_en: "What was the name of the chief man of the island of Malta?", a_es: ["Publio", "Julio", "Rufo"], a_en: ["Publius", "Julius", "Rufus"], c: 0, ref: "Hechos 28:7", text_es: "Había haciendas del hombre principal, Publio.", text_en: "There were lands belonging to the chief man, Publius." },
      { q_es: "¿Cómo se llamaba el esclavo prófugo sobre quien Pablo escribió una epístola?", q_en: "What was the name of the runaway slave Paul wrote an epistle about?", a_es: ["Onésimo", "Filemón", "Epafras"], a_en: ["Onesimus", "Philemon", "Epaphras"], c: 0, ref: "Filemón 1:10", text_es: "Te ruego por mi hijo Onésimo.", text_en: "I appeal to you for my son Onesimus." },
      { q_es: "¿Qué colaborador de Pablo fundó al parecer la iglesia en Colosas?", q_en: "Which coworker of Paul apparently founded the church in Colossae?", a_es: ["Epafras", "Timoteo", "Lucas"], a_en: ["Epaphras", "Timothy", "Luke"], c: 0, ref: "Colosenses 1:7", text_es: "Como aprendisteis de Epafras.", text_en: "As you learned from Epaphras." },
      { q_es: "¿A qué colaborador llama Pablo 'compañero de milicia' en Filemón?", q_en: "Which coworker does Paul call 'fellow soldier' in Philemon?", a_es: ["Arquipo", "Apolos", "Tito"], a_en: ["Archippus", "Apollos", "Titus"], c: 0, ref: "Filemón 1:2", text_es: "Y a Arquipo nuestro compañero de milicia.", text_en: "And to Archippus our fellow soldier." },
      { q_es: "¿Quién es descrito en 3ra de Juan como alguien 'al que le gusta tener el primer lugar'?", q_en: "Who is described in 3 John as one 'who loves to have the preeminence'?", a_es: ["Diótrefes", "Gayo", "Demas"], a_en: ["Diotrephes", "Gaius", "Demas"], c: 0, ref: "3 Juan 1:9", text_es: "Diótrefes, al cual le gusta tener el primer lugar.", text_en: "Diotrephes, who loves to have the preeminence." },
      { q_es: "¿Qué arcángel peleó con el diablo disputando el cuerpo de Moisés?", q_en: "Which archangel fought with the devil over Moses' body?", a_es: ["Miguel", "Gabriel", "Rafael"], a_en: ["Michael", "Gabriel", "Raphael"], c: 0, ref: "Judas 1:9", text_es: "Miguel disputaba por el cuerpo de Moisés.", text_en: "Michael disputed about the body of Moses." },
      { q_es: "¿En la carta a qué iglesia de Apocalipsis se dice que allí está el 'trono de Satanás'?", q_en: "In which church's letter in Revelation is 'Satan's throne' mentioned?", a_es: ["Pérgamo", "Éfeso", "Sardis"], a_en: ["Pergamum", "Ephesus", "Sardis"], c: 0, ref: "Apocalipsis 2:12", text_es: "Escribe a Pérgamo... donde está el trono de Satanás.", text_en: "Write to Pergamum... where Satan's throne is." },
      { q_es: "¿Cómo se llama en arameo el 'destructor' rey del abismo?", q_en: "What is the Hebrew name of the 'destroyer' king of the abyss?", a_es: ["Abadón", "Leviatán", "Beelzebú"], a_en: ["Abaddon", "Leviathan", "Beelzebul"], c: 0, ref: "Apocalipsis 9:11", text_es: "Su nombre en hebreo es Abadón.", text_en: "His name in Hebrew is Abaddon." },
      { q_es: "¿Cómo se llama el lugar en hebreo donde se congregan tropas para la batalla final?", q_en: "What is the Hebrew place where troops gather for the final battle?", a_es: ["Armagedón", "Meguido", "Valle de Josafat"], a_en: ["Armageddon", "Megiddo", "Valley of Jehoshaphat"], c: 0, ref: "Apocalipsis 16:16", text_es: "Y los reunió en el lugar... Armagedón.", text_en: "He gathered them to the place... Armageddon." }
    ];

    // Variable para almacenar preguntas adicionales del JSON
    let extraQuestions = [];
    let allQuestions = [];

    // Función para mezclar array aleatoriamente (Fisher-Yates)
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    // Diccionario básico para "traducción automática" de términos comunes
    const quDict = {
      "¿Quién": "¿Pin",
      "¿Qué": "¿Ima",
      "¿Dónde": "¿Maypin",
      "¿Cuántos": "¿Hayk'a",
      "¿Cómo": "¿Imayna",
      "hijo": "churi",
      "mujer": "warmi",
      "hombre": "runa",
      "rey": "rey",
      "Dios": "Dios",
      "Jesús": "Jesús",
      "Biblia": "Biblia",
      "fue": "karqan",
      "padre": "tata",
      "madre": "mama"
    };

    function translateToQuechua(text) {
      if (!text) return text;
      let translated = text;
      // Esta es una traducción muy básica para asegurar que nada quede en blanco
      for (const [key, value] of Object.entries(quDict)) {
        const regex = new RegExp(key, "gi");
        translated = translated.replace(regex, value);
      }
      return translated;
    }

    // Función para cargar preguntas desde los 19 archivos JSON nuevos (1000 preguntas)
    async function loadExtraQuestions() {
      try {
        extraQuestions = [];
        
        // Cargar todos los archivos JSON en paralelo
        const promises = questionFiles.map(async (file) => {
          try {
            const response = await fetch(file);
            if (response.ok) {
              const data = await response.json();
              // Transformar formato nuevo al formato del bank
              const questions = data.preguntas.map(q => ({
                q_es: q.pregunta,
                q_en: q.pregunta, // Usar español como fallback para inglés
                q_qu: translateToQuechua(q.pregunta),
                a_es: [q.opciones.A, q.opciones.B, q.opciones.C, q.opciones.D],
                a_en: [q.opciones.A, q.opciones.B, q.opciones.C, q.opciones.D],
                a_qu: [
                  translateToQuechua(q.opciones.A),
                  translateToQuechua(q.opciones.B),
                  translateToQuechua(q.opciones.C),
                  translateToQuechua(q.opciones.D)
                ],
                c: q.respuesta_correcta.charCodeAt(0) - 65, // Convertir A/B/C/D a 0/1/2/3
                ref: q.explicacion.split(' ')[0] || 'Referencia bíblica',
                text_es: q.explicacion,
                text_en: q.explicacion,
                text_qu: translateToQuechua(q.explicacion),
                lvl: q.nivel // Usar el nivel específico de cada pregunta
              }));
              return questions;
            }
          } catch (err) {
            console.log(`Error cargando ${file}:`, err);
            return [];
          }
        });
        
        const results = await Promise.all(promises);
        extraQuestions = results.flat(); // Combinar todas las preguntas
        
        console.log(`Cargadas ${extraQuestions.length} preguntas de ${questionFiles.length} archivos`);
        
        if (extraQuestions.length > 0) {
          combineAndDistributeQuestions();
        } else {
          // Fallback: usar array vacío si no se cargaron preguntas (default_questions.json siempre debería cargar)
          allQuestions = [];
          console.warn('No se cargaron preguntas de los archivos JSON');
        }
      } catch (error) {
        console.log('Error cargando preguntas:', error);
        allQuestions = [];
      }
    }

    // Función para combinar y distribuir preguntas en 100 niveles
    function combineAndDistributeQuestions() {
      // Usar solo las preguntas de los archivos JSON (1000 preguntas)
      // Si no hay preguntas extras, usar el bank como fallback
      if (extraQuestions.length > 0) {
        allQuestions = [...extraQuestions];
      } else {
        allQuestions = [...bank];
      }
      
      console.log(`Total de preguntas cargadas: ${allQuestions.length}`);
      
      // Verificar distribución por niveles (usando los niveles ya asignados en los JSON)
      let distribution = {};
      for (let i = 1; i <= 100; i++) distribution[i] = 0;
      
      allQuestions.forEach(q => {
        const lvl = q.lvl || 1;
        if (lvl >= 1 && lvl <= 100) {
          distribution[lvl] = (distribution[lvl] || 0) + 1;
        }
      });
      
      console.log('Distribución de preguntas por nivel:', distribution);
      console.log(`Total: ${allQuestions.length} preguntas en 100 niveles`);
    }

    // Función para distribuir preguntas por nivel (solo bank original)
    function distributeQuestionsByLevel() {
      bank.forEach((q, idx) => {
        q.lvl = Math.floor(idx / 40) + 1;
      });
    }

    // Asignar nivel progresivo por defecto ANTES de cargar extras
    bank.forEach((q, idx) => {
      q.lvl = Math.floor(idx / 40) + 1;
    });

    // Cargar preguntas adicionales al iniciar (después de asignar niveles base)
    loadExtraQuestions();
    
    // Timeout de seguridad: si después de 5 segundos no hay preguntas combinadas,
    // asegurar que el bank tenga niveles asignados
    setTimeout(() => {
      if (!allQuestions || allQuestions.length === 0) {
        console.log('Timeout: Usando banco de preguntas base');
        if (bank.length > 0 && !bank[0].lvl) {
          distributeQuestionsByLevel();
        }
      }
    }, 5000);

    // Función auxiliar para obtener el banco de preguntas a usar
    function getQuestionBank() {
      // Si hay preguntas combinadas, usarlas; si no, usar bank
      if (allQuestions && allQuestions.length > 0) {
        return allQuestions;
      }
      // Si bank no tiene niveles asignados, asignarlos
      if (bank.length > 0 && !bank[0].lvl) {
        distributeQuestionsByLevel();
      }
      return bank;
    }


    /* ===== LÓGICA ===== */

    function show(id) {
      document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
      document.getElementById(id).classList.add("active");

      if (id === "home" || id === "modes" || id === "map" || id === "settings" || id === "shop" || id === "achievements" || id === "stats" || id === "extras" || id === "categories") {
        clearLevelVisualTheme();
      }

      // Detener audio de victoria si se sale de congrats y reanudar fondo
      let vAudio = document.getElementById("victoryAudio");
      let bgAudio = document.getElementById("bgMusic");
      let birdsAudio = document.getElementById("birdsAudio");
      if (id !== "congrats" && vAudio) {
        if (!vAudio.paused) {
          vAudio.pause();
          vAudio.currentTime = 0;
          if (musicStarted && bgAudio && bgAudio.paused) {
            bgAudio.play().catch(e => {});
          }
        }
        if (typeof stopContinuousConfetti === "function") stopContinuousConfetti();
      }

      // Bird sounds for map section
      if (id === "map") {
        // Entering map - play birds, stop main music
        if (bgAudio && !bgAudio.paused) {
          bgAudio.pause();
        }
        if (birdsAudio) {
          birdsAudio.volume = bgAudio ? bgAudio.volume : 0.5;
          birdsAudio.play().catch(e => {});
        }
        // Actualizar candados y eventos de niveles al mostrar el mapa
        updateLocks();
      } else {
        // Leaving map - stop birds, resume main music if applicable
        if (birdsAudio && !birdsAudio.paused) {
          birdsAudio.pause();
          birdsAudio.currentTime = 0;
        }
        if (musicStarted && bgAudio && bgAudio.paused && id !== "congrats") {
          bgAudio.play().catch(e => {});
        }
      }
    }

    function detectPerformanceMode() {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = navigator.deviceMemory || 4;
      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lowPerfMode = prefersReducedMotion || cores <= 4 || memory <= 4;
      if (lowPerfMode) document.body.classList.add("low-perf");
    }

    function preloadCoreAssets() {
      const preloadText = document.getElementById("preloadText");
      if (preloadText) {
        let text = "Cargando recursos...";
        if (lang === "en") text = "Loading assets...";
        if (lang === "qu") text = "Recursokunata cargashan...";
        preloadText.innerText = text;
      }

      const audioIds = ["bgMusic", "correctAudio", "wrongAudio", "victoryAudio", "cueteAudio", "birdsAudio", "clockAudio", "popAudio"];
      const preloadPromises = audioIds.map((id) => new Promise((resolve) => {
        const el = document.getElementById(id);
        if (!el) { resolve(); return; }
        const onReady = () => resolve();
        el.addEventListener("canplaythrough", onReady, { once: true });
        el.addEventListener("error", onReady, { once: true });
        try {
          el.load();
        } catch (e) {
          resolve();
        }
        setTimeout(resolve, 300);
      }));

      return Promise.all(preloadPromises).then(() => {
        const overlay = document.getElementById("preloadOverlay");
        if (overlay) {
          overlay.classList.add("hidden");
          setTimeout(() => { overlay.style.display = "none"; }, 320);
        }
      });
    }

    const onboardingContent = {
      es: [
        { title: "Bienvenido a Trivia Bíblica: Aprende Jugando", body: "Responde preguntas biblicas y gana monedas en cada partida." },
        { title: "Sube de nivel", body: "Necesitas 7/10 para avanzar. Completa niveles para desbloquear nuevos retos." },
        { title: "Haz rachas y premios", body: "Acierta seguido para sumar mas monedas y mejorar tu record en supervivencia." }
      ],
      en: [
        { title: "Welcome to Trivia Bíblica: Aprende Jugando", body: "Answer Bible questions and earn coins in every match." },
        { title: "Level up", body: "You need 7/10 to advance. Clear levels to unlock new challenges." },
        { title: "Build streaks and rewards", body: "Get consecutive correct answers for more coins and a better survival record." }
      ]
    };

    function renderOnboardingStep() {
      const steps = onboardingContent[lang] || onboardingContent.es;
      const step = steps[onboardingStep];
      document.getElementById("onboardingTitle").innerText = step.title;
      document.getElementById("onboardingBody").innerText = step.body;
      document.querySelectorAll(".onboarding-dot").forEach((dot, idx) => {
        dot.classList.toggle("active", idx === onboardingStep);
      });
      let nextText = "Siguiente";
      if (lang === "en") nextText = "Next";
      if (lang === "qu") nextText = "Qatiq";

      let startText = "Empezar";
      if (lang === "en") startText = "Start";
      if (lang === "qu") startText = "Qallariy";

      let skipText = "Saltar";
      if (lang === "en") skipText = "Skip";
      if (lang === "qu") skipText = "Pawsay";

      document.getElementById("onboardingNextBtn").innerText = onboardingStep === steps.length - 1 ? startText : nextText;
      document.getElementById("onboardingSkipBtn").innerText = skipText;
    }

    function closeOnboarding() {
      localStorage.setItem('hasSeenOnboarding', '1');
      document.getElementById("onboardingModal").style.display = "none";
    }

    function initOnboarding() {
      if (hasSeenOnboarding) return;
      onboardingStep = 0;
      renderOnboardingStep();
      document.getElementById("onboardingModal").style.display = "flex";

      document.getElementById("onboardingNextBtn").onclick = () => {
        const steps = onboardingContent[lang] || onboardingContent.es;
        if (onboardingStep >= steps.length - 1) {
          closeOnboarding();
          return;
        }
        onboardingStep++;
        renderOnboardingStep();
      };
      document.getElementById("onboardingSkipBtn").onclick = closeOnboarding;
    }

    function toggleLang() {
      const m = document.getElementById("langMenu");
      m.style.display = m.style.display === "block" ? "none" : "block";
    }

    function setLang(l) {
      lang = l;
      localStorage.setItem('lang', l);
      const titleEl = document.getElementById("title");
      if (titleEl) {
        titleEl.innerText = 
          lang === "es" ? "🗺️ Selecciona un Nivel" : 
          lang === "en" ? "🗺️ Select a Level" :
          "🗺️ Nivelta akllay";
      }
      updateHomeTexts();
      updateLevelPreviewText();
      updateLifelineLabels();
      updateLocks();
    }

    function updateHomeTexts() {
      // Home elements
      const playBtn = document.getElementById("homePlayBtn");
      const extrasBtn = document.getElementById("homeExtrasBtn");
      const dailyLabel = document.getElementById("homeDailyLabel");
      const homeGiftQuickBtn = document.getElementById("homeGiftQuickBtn");

      // Extras elements
      const extrasTitle = document.getElementById("extrasTitle");
      const extrasSubtitle = document.getElementById("extrasSubtitle");
      const extrasDivider = document.getElementById("extrasDivider");
      const extrasShopBtn = document.getElementById("extrasShopBtn");
      const extrasAchievementsBtn = document.getElementById("extrasAchievementsBtn");
      const extrasStatsBtn = document.getElementById("extrasStatsBtn");
      const extrasBackBtn = document.getElementById("extrasBackBtn");
      const giftButton = document.getElementById("giftButton");

      // Settings elements
      const settingsTitle = document.getElementById("settingsTitle");
      const settingsDivider = document.getElementById("settingsDivider");
      const volumeLabel = document.getElementById("volumeLabel");
      const langLabel = document.getElementById("langLabel");
      const ageLabel = document.getElementById("ageLabel");
      const optKids = document.getElementById("optKids");
      const optTeen = document.getElementById("optTeen");
      const optAdult = document.getElementById("optAdult");
      const resetBtn = document.getElementById("resetBtn");
      const settingsBackBtn = document.getElementById("settingsBackBtn");

      // Categories elements
      const categoriesTitle = document.getElementById("categoriesTitle");
      const categoriesSubtitle = document.getElementById("categoriesSubtitle");
      const categoriesDivider = document.getElementById("categoriesDivider");
      const catOldTitle = document.getElementById("catOldTitle");
      const catOldDesc = document.getElementById("catOldDesc");
      const catOldBadge = document.getElementById("catOldBadge");
      const catNewTitle = document.getElementById("catNewTitle");
      const catNewDesc = document.getElementById("catNewDesc");
      const catNewBadge = document.getElementById("catNewBadge");
      const catCharTitle = document.getElementById("catCharTitle");
      const catCharDesc = document.getElementById("catCharDesc");
      const catCharBadge = document.getElementById("catCharBadge");
      const catTFTitle = document.getElementById("catTFTitle");
      const catTFDesc = document.getElementById("catTFDesc");
      const catTFBadge = document.getElementById("catTFBadge");
      const categoriesBackBtn = document.getElementById("categoriesBackBtn");

      // Shop elements
      const shopTitle = document.getElementById("shopTitle");
      const shopSubtitle = document.getElementById("shopSubtitle");
      const shopBackBtn = document.getElementById("shopBackBtn");

      // Achievements elements
      const achievementsTitle = document.getElementById("achievementsTitle");
      const achievementsSubtitle = document.getElementById("achievementsSubtitle");
      const achievementsBackBtn = document.getElementById("achievementsBackBtn");

      // Stats elements
      const statsTitle = document.getElementById("statsTitle");
      const statsSubtitle = document.getElementById("statsSubtitle");
      const statsBackBtn = document.getElementById("statsBackBtn");

      // Update Home
      if (playBtn) playBtn.innerText = 
        lang === "es" ? "🎮 ¡Jugar!" :
        lang === "en" ? "🎮 Play!" :
        "🎮 Pukllay!";
      if (extrasBtn) extrasBtn.innerText = 
        lang === "es" ? "✨ Extras" :
        lang === "en" ? "✨ Extras" :
        "✨ Yapamanta";
      if (dailyLabel) dailyLabel.innerText = 
        lang === "es" ? "📜 Texto de Hoy" :
        lang === "en" ? "📜 Today's Text" :
        "📜 P'unchaypa Qillqan";
      if (homeGiftQuickBtn) homeGiftQuickBtn.title = 
        lang === "es" ? "Abrir regalo" : 
        lang === "en" ? "Open gift" :
        "Regaluta kichay";

      // Update Extras
      if (extrasTitle) extrasTitle.innerText = 
        lang === "es" ? "✨ Extras" :
        lang === "en" ? "✨ Extras" :
        "✨ Yapamanta";
      if (extrasSubtitle) extrasSubtitle.innerText = 
        lang === "es" ? "Accesos especiales" :
        lang === "en" ? "Special access" :
        "Sapaq yaykuy";
      if (extrasDivider) extrasDivider.innerText = 
        lang === "es" ? "⭐ contenido extra ⭐" :
        lang === "en" ? "⭐ extra content ⭐" :
        "⭐ yapamanta willay ⭐";
      if (extrasShopBtn) extrasShopBtn.innerText = 
        lang === "es" ? "🛍️ Tienda" :
        lang === "en" ? "🛍️ Shop" :
        "🛍️ Qhatu";
      if (extrasAchievementsBtn) extrasAchievementsBtn.innerText = 
        lang === "es" ? "🏅 Trofeos" :
        lang === "en" ? "🏅 Trophies" :
        "🏅 Atipaykuna";
      if (extrasStatsBtn) extrasStatsBtn.innerText = 
        lang === "es" ? "📊 Datos" :
        lang === "en" ? "📊 Stats" :
        "📊 Willaykuna";
      if (extrasBackBtn) extrasBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";

      // Update Settings
      if (settingsTitle) settingsTitle.innerText = 
        lang === "es" ? "⚙️ Ajustes" :
        lang === "en" ? "⚙️ Settings" :
        "⚙️ Allichay";
      if (settingsDivider) settingsDivider.innerText = 
        lang === "es" ? "🎵 opciones 🎵" :
        lang === "en" ? "🎵 options 🎵" :
        "🎵 akllanakuna 🎵";
      if (volumeLabel) volumeLabel.innerText = 
        lang === "es" ? "🔊 Volumen de efectos" :
        lang === "en" ? "🔊 Effects volume" :
        "🔊 Kunka uyarikuna";
      if (langLabel) langLabel.innerText = 
        lang === "es" ? "🌐 Idioma" :
        lang === "en" ? "🌐 Language" :
        "🌐 Rimay";
      if (ageLabel) ageLabel.innerText = 
        lang === "es" ? "👧🧒 Dificultad por edades" :
        lang === "en" ? "👧🧒 Age difficulty" :
        "👧🧒 Watakunaman sasa kay";
      if (optKids) optKids.innerText = 
        lang === "es" ? "Niños (más tiempo)" :
        lang === "en" ? "Kids (more time)" :
        "Erqekuna (aswan pacha)";
      if (optTeen) optTeen.innerText = 
        lang === "es" ? "Jóvenes (normal)" :
        lang === "en" ? "Teens (normal)" :
        "Waynakuna (normal)";
      if (optAdult) optAdult.innerText = 
        lang === "es" ? "Adultos (más difícil)" :
        lang === "en" ? "Adults (harder)" :
        "Kuraq runakuna (aswan sasa)";
      if (resetBtn) resetBtn.innerText = 
        lang === "es" ? "🗑️ Reiniciar Progreso" :
        lang === "en" ? "🗑️ Reset Progress" :
        "🗑️ Tukuyta qallariy";
      if (settingsBackBtn) settingsBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";

      // Update Categories
      if (categoriesTitle) categoriesTitle.innerText = 
        lang === "es" ? "📚 Categorías" :
        lang === "en" ? "📚 Categories" :
        "📚 Categoríakunawan";
      if (categoriesSubtitle) categoriesSubtitle.innerText = 
        lang === "es" ? "Elige un tema bíblico" :
        lang === "en" ? "Choose a Bible topic" :
        "Bibliamanta temata akllay";
      if (categoriesDivider) categoriesDivider.innerText = 
        lang === "es" ? "⭐ selecciona ⭐" :
        lang === "en" ? "⭐ select ⭐" :
        "⭐ akllay ⭐";
      if (catOldTitle) catOldTitle.innerText = 
        lang === "es" ? "Antiguo Testamento" :
        lang === "en" ? "Old Testament" :
        "Ñawpaq Testamento";
      if (catOldDesc) catOldDesc.innerText = 
        lang === "es" ? "Desde Génesis hasta Malaquías" :
        lang === "en" ? "From Genesis to Malachi" :
        "Génesismanta Malaquías-kama";
      if (catOldBadge) catOldBadge.innerText = 
        lang === "es" ? "40 preguntas" :
        lang === "en" ? "40 questions" :
        "40 tapukuykuna";
      if (catNewTitle) catNewTitle.innerText = 
        lang === "es" ? "Nuevo Testamento" :
        lang === "en" ? "New Testament" :
        "Musuq Testamento";
      if (catNewDesc) catNewDesc.innerText = 
        lang === "es" ? "Desde Mateo hasta Apocalipsis" :
        lang === "en" ? "From Matthew to Revelation" :
        "Mateomanta Apocalipsis-kama";
      if (catNewBadge) catNewBadge.innerText = 
        lang === "es" ? "40 preguntas" :
        lang === "en" ? "40 questions" :
        "40 tapukuykuna";
      if (catCharTitle) catCharTitle.innerText = 
        lang === "es" ? "Personajes Bíblicos" :
        lang === "en" ? "Bible Characters" :
        "Bibliamanta Runakuna";
      if (catCharDesc) catCharDesc.innerText = 
        lang === "es" ? "Conoce a los héroes de la fe" :
        lang === "en" ? "Meet the heroes of faith" :
        "Iñiypa héroenkuna reqsiy";
      if (catCharBadge) catCharBadge.innerText = 
        lang === "es" ? "40 preguntas" :
        lang === "en" ? "40 questions" :
        "40 tapukuykuna";
      if (catTFTitle) catTFTitle.innerText = 
        lang === "es" ? "Verdadero o Falso" :
        lang === "en" ? "True or False" :
        "Chiqap o Llullap";
      if (catTFDesc) catTFDesc.innerText = 
        lang === "es" ? "¿Puedes distinguir la verdad?" :
        lang === "en" ? "Can you tell the truth?" :
        "¿Chiqapta yachawaqchu?";
      if (catTFBadge) catTFBadge.innerText = 
        lang === "es" ? "30 preguntas" :
        lang === "en" ? "30 questions" :
        "30 tapukuykuna";
      if (categoriesBackBtn) categoriesBackBtn.innerText = 
        lang === "es" ? "🏠 Regresar al menú principal" :
        lang === "en" ? "🏠 Back to main menu" :
        "🏠 Ñawpaq menuman kutiy";

      // Update Shop
      if (shopTitle) shopTitle.innerText = 
        lang === "es" ? "🛍️ Tienda" :
        lang === "en" ? "🛍️ Shop" :
        "🛍️ Qhatu";
      if (shopSubtitle) shopSubtitle.innerText = 
        lang === "es" ? "Usa tus monedas ahorradas" :
        lang === "en" ? "Use your saved coins" :
        "Qollqiykiwan rantiy";
      if (shopBackBtn) shopBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";

      // Update Achievements
      if (achievementsTitle) achievementsTitle.innerText = 
        lang === "es" ? "🏅 Trofeos" :
        lang === "en" ? "🏅 Trophies" :
        "🏅 Atipaykuna";
      if (achievementsSubtitle) achievementsSubtitle.innerText = 
        lang === "es" ? "Demuestra tu habilidad" :
        lang === "en" ? "Show your skill" :
        "Yachayniykita qawachiy";
      if (achievementsBackBtn) achievementsBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";

      // Update Stats
      if (statsTitle) statsTitle.innerText = 
        lang === "es" ? "📊 Estadísticas" :
        lang === "en" ? "📊 Stats" :
        "📊 Willaykuna";
      if (statsSubtitle) statsSubtitle.innerText = 
        lang === "es" ? "Progreso General" :
        lang === "en" ? "Overall Progress" :
        "Tukuy puriy";
      if (statsBackBtn) statsBackBtn.innerText = 
        lang === "es" ? "🏠 Volver" :
        lang === "en" ? "🏠 Back" :
        "🏠 Kutiy";
    }

    function setAgeDifficulty(val) {
      ageDifficulty = val || 'teen';
      localStorage.setItem('ageDifficulty', ageDifficulty);
      updateLifelineLabels();
    }

    function getDifficultyConfig() {
      if (ageDifficulty === 'kids') {
        return { baseTime: 14, coinMult: 0.9, costs: { fifty: 14, time: 8, hint: 6, skip: 10 } };
      }
      if (ageDifficulty === 'adult') {
        return { baseTime: 8, coinMult: 1.25, costs: { fifty: 24, time: 14, hint: 12, skip: 18 } };
      }
      return { baseTime: 10, coinMult: 1.0, costs: { fifty: 20, time: 10, hint: 8, skip: 12 } };
    }

    function updateLifelineLabels() {
      const cfg = getDifficultyConfig();
      baseTime = cfg.baseTime;
      const fiftyBtn = document.getElementById("fiftyBtn");
      const timeBtn = document.getElementById("timeBtn");
      const hintBtn = document.getElementById("hintBtn");
      const skipBtn = document.getElementById("skipBtn");
      if (fiftyBtn) fiftyBtn.innerText = `50/50 (${cfg.costs.fifty}🪙)`;
      if (timeBtn) timeBtn.innerText = `+10s (${cfg.costs.time}🪙)`;
      if (hintBtn) hintBtn.innerText = 
        lang === "en" ? `💡 Hint (${cfg.costs.hint}🪙)` :
        lang === "qu" ? `💡 Willay (${cfg.costs.hint}🪙)` :
        `💡 Pista (${cfg.costs.hint}🪙)`;
      if (skipBtn) skipBtn.innerText = 
        lang === "en" ? `⏭️ Skip (${cfg.costs.skip}🪙)` :
        lang === "qu" ? `⏭️ Pawsay (${cfg.costs.skip}🪙)` :
        `⏭️ Saltar (${cfg.costs.skip}🪙)`;

      const sel = document.getElementById("ageDifficulty");
      if (sel) sel.value = ageDifficulty;
    }

    function updateVolume(val) {
      const volume = parseFloat(val);
      document.getElementById("bgMusic").volume = volume;
      document.getElementById("correctAudio").volume = volume;
      document.getElementById("wrongAudio").volume = volume;
      let vAudio = document.getElementById("victoryAudio");
      if (vAudio) vAudio.volume = volume;
      let cAudio = document.getElementById("cueteAudio");
      if (cAudio) cAudio.volume = volume;
      let clockAudio = document.getElementById("clockAudio");
      if (clockAudio) clockAudio.volume = volume;
      let birdsAudio = document.getElementById("birdsAudio");
      if (birdsAudio) birdsAudio.volume = volume;
      let popAudio = document.getElementById("popAudio");
      if (popAudio) popAudio.volume = volume;

      if (volume > 0) {
        soundMuted = false;
        lastVolumeBeforeMute = volume;
        localStorage.setItem('lastVolumeBeforeMute', String(lastVolumeBeforeMute));
      } else {
        soundMuted = true;
      }

      localStorage.setItem('soundMuted', soundMuted ? '1' : '0');
      localStorage.setItem('volume', String(volume));
      updateSoundToggleUI();
    }

    function updateSoundToggleUI() {
      const btn = document.getElementById("soundToggle");
      if (!btn) return;
      btn.innerText = soundMuted ? "🔇" : "🔊";
      btn.title = soundMuted ? "Activar sonido" : "Desactivar sonido";
    }

    function toggleSound() {
      const volumeSlider = document.getElementById("volume");

      if (soundMuted) {
        const restoreVolume = lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : 0.5;
        if (volumeSlider) volumeSlider.value = restoreVolume;
        updateVolume(restoreVolume);
      } else {
        const currentVolume = volumeSlider ? parseFloat(volumeSlider.value) : parseFloat(localStorage.getItem('volume')) || 0.5;
        if (currentVolume > 0) {
          lastVolumeBeforeMute = currentVolume;
          localStorage.setItem('lastVolumeBeforeMute', String(lastVolumeBeforeMute));
        }
        if (volumeSlider) volumeSlider.value = 0;
        updateVolume(0);
      }
    }

    function startGame() {
      let vol = document.getElementById("volume").value;
      updateVolume(vol);

      let bgMusic = document.getElementById("bgMusic");
      if (bgMusic) {
        bgMusic.play().catch(e => console.log("Audio play prevented:", e));
      }

      isSurvival = false;
      isCategoryMode = false;
      show("map");
      updateLocks();
    }

    function showModes() {
      show("modes");
    }

    const modeTutorialContent = {
      story: {
        es: {
          title: "📖 Modo Historia",
          body: "Avanza por niveles. Necesitas 7/10 para desbloquear el siguiente nivel.",
          tips: ["🗺️ Elige un nivel en el mapa", "⭐ Responde 10 preguntas", "🪙 Ganas monedas por tus aciertos"]
        },
        en: {
          title: "📖 Story Mode",
          body: "Advance through levels. You need 7/10 to unlock the next level.",
          tips: ["🗺️ Pick a level on the map", "⭐ Answer 10 questions", "🪙 Earn coins for correct answers"]
        },
        qu: {
          title: "📖 Ñawpaq Willay",
          body: "Niveltakama puriy. 7/10 necesitanki qatiq nivelta kichanapaq.",
          tips: ["🗺️ Mapapi nivelta akllay", "⭐ 10 tapukuykunata kutichiy", "🪙 Allin kutichisqaykimanta qullqita chaskinki"]
        }
      },
      survival: {
        es: {
          title: "🔥 Supervivencia",
          body: "Juega sin parar hasta quedarte sin vidas. ¡Haz la mejor racha posible!",
          tips: ["❤️ Tienes 3 vidas", "🔥 Suma puntos por cada acierto", "🏆 Intenta romper tu récord"]
        },
        en: {
          title: "🔥 Survival",
          body: "Play nonstop until you run out of lives. Build the best streak you can!",
          tips: ["❤️ You have 3 lives", "🔥 Score points for every correct answer", "🏆 Try to beat your record"]
        },
        qu: {
          title: "🔥 Kawsay",
          body: "Pukllay mana saykuspa kawsayniyki tukunankama. ¡Aswan allin rachata ruway!",
          tips: ["❤️ 3 kawsayniyuq kanki", "🔥 Sapa allin kutichisqaykimanta puntukunata chaskinki", "🏆 Récordniykita atipayta munay"]
        }
      },
      categories: {
        es: {
          title: "📚 Por Categorías",
          body: "Juega por temas bíblicos. ¡Elige tu categoría favorita y demuestra lo que sabes!",
          tips: ["📜 Antiguo Testamento", "📖 Nuevo Testamento", "👑 Personajes Bíblicos", "✅❌ Verdadero o Falso"]
        },
        en: {
          title: "📚 By Categories",
          body: "Play by Bible topics. Choose your favorite category and show what you know!",
          tips: ["📜 Old Testament", "📖 New Testament", "👑 Biblical Characters", "✅❌ True or False"]
        },
        qu: {
          title: "📚 Categoríakunawan",
          body: "Bibliamanta temakunawan pukllay. ¡Aswan munasqayki categoriata akllay hinaspa yachasqaykita qawachiy!",
          tips: ["📜 Ñawpaq Testamento", "📖 Musuq Testamento", "👑 Bibliamanta Runakuna", "✅❌ Chiqap o Llullap"]
        }
      }
    };

    function openModeTutorial(modeKey) {
      const modal = document.getElementById("modeModal");
      const titleEl = document.getElementById("modeTitle");
      const bodyEl = document.getElementById("modeBody");
      const tipsEl = document.getElementById("modeTips");
      const playBtn = document.getElementById("modePlayBtn");

      const mode = modeTutorialContent[modeKey] || modeTutorialContent.story;
      let t = mode.es;
      if (lang === "en") t = mode.en;
      if (lang === "qu") t = mode.qu;

      titleEl.innerText = t.title;
      bodyEl.innerText = t.body;
      tipsEl.innerHTML = t.tips.map(x => `<div style="margin:4px 0;">${x}</div>`).join("");

      if (lang === "en") playBtn.innerText = "✅ Start";
      else if (lang === "qu") playBtn.innerText = "✅ Qallariy";
      else playBtn.innerText = "✅ Empezar";

      playBtn.onclick = () => {
        closeModeTutorial();
        if (modeKey === "survival") startSurvival();
        else if (modeKey === "categories") show("categories");
        else startGame();
      };

      modal.style.display = "flex";
    }

    function closeModeTutorial() {
      const modal = document.getElementById("modeModal");
      if (modal) modal.style.display = "none";
    }

    function showSettings() {
      show("settings");
    }

    function formatGiftTime(ms) {
      const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function getGiftRemainingMs() {
      const now = Date.now();
      return Math.max(0, giftCooldownMs - (now - lastGiftClaimTs));
    }

    function updateGiftUI(lastRewardMessage) {
      const remaining = getGiftRemainingMs();
      if (remaining <= 0) {
        if (giftElements.btn) {
          giftElements.btn.disabled = false;
          giftElements.btn.innerText = 
            lang === "es" ? "🎁 Regalo listo" : 
            lang === "en" ? "🎁 Gift ready" :
            "🎁 Regalun listo";
        }
        if (giftElements.txt) {
          if (lang === "es") {
            giftElements.txt.innerText = `Listo para reclamar${survivalBonusLives > 0 ? ` · ❤️ extra: ${survivalBonusLives}` : ""}`;
          } else if (lang === "en") {
            giftElements.txt.innerText = `Ready to claim${survivalBonusLives > 0 ? ` · Extra ❤️: ${survivalBonusLives}` : ""}`;
          } else {
            giftElements.txt.innerText = `Reclamanapaq listo${survivalBonusLives > 0 ? ` · ❤️ yapamanta: ${survivalBonusLives}` : ""}`;
          }
        }
        if (giftElements.quickBtn) {
          giftElements.quickBtn.classList.add("ready");
        }
        if (giftElements.quickBadge) giftElements.quickBadge.innerText = "!";
      } else {
        if (giftElements.btn) {
          giftElements.btn.disabled = true;
          giftElements.btn.innerText = 
            lang === "es" ? "🎁 Regalo" : 
            lang === "en" ? "🎁 Gift" :
            "🎁 Regalu";
        }
        if (giftElements.txt) {
          let t = "";
          if (lang === "es") t = `Próximo regalo en ${formatGiftTime(remaining)}`;
          else if (lang === "en") t = `Next gift in ${formatGiftTime(remaining)}`;
          else t = `Qatiq regalu ${formatGiftTime(remaining)} ukhupi`;
          
          giftElements.txt.innerText = t + (survivalBonusLives > 0 ? ` · ❤️ ${survivalBonusLives}` : "");
        }
        if (giftElements.quickBtn) {
          giftElements.quickBtn.classList.remove("ready");
        }
        if (giftElements.quickBadge) giftElements.quickBadge.innerText = formatGiftTime(remaining);
      }

      if (lastRewardMessage && giftElements.txt) {
        giftElements.txt.innerText = lastRewardMessage;
      }
    }

    function openGiftFromHome() {
      const remaining = getGiftRemainingMs();
      if (remaining <= 0) {
        claimTimedGift();
      } else {
        let waitMsg = "";
        if (lang === "es") waitMsg = `⏳ Próximo regalo en ${formatGiftTime(remaining)}`;
        else if (lang === "en") waitMsg = `⏳ Next gift in ${formatGiftTime(remaining)}`;
        else waitMsg = `⏳ Qatiq regalu ${formatGiftTime(remaining)} ukhupi`;
        
        showGiftRewardToast(waitMsg);
        showConfetti(50, 38);
      }
    }

    function claimTimedGift() {
      console.log("claimTimedGift called");
      const remaining = getGiftRemainingMs();
      console.log("Remaining time:", remaining);
      if (remaining > 0) {
        console.log("Gift not ready yet, remaining:", remaining);
        let waitMsg = "";
        if (lang === "es") waitMsg = `⏳ Próximo regalo en ${formatGiftTime(remaining)}`;
        else if (lang === "en") waitMsg = `⏳ Next gift in ${formatGiftTime(remaining)}`;
        else waitMsg = `⏳ Qatiq regalu ${formatGiftTime(remaining)} ukhupi`;
        
        showGiftRewardToast(waitMsg);
        return;
      }

      let rewardMessage = "";
      if (Math.random() < 0.72) {
        const rewardCoins = Math.floor(Math.random() * 13) + 8; // 8-20
        coins += rewardCoins;
        localStorage.setItem('coins', coins);
        if (lang === "es") rewardMessage = `🎉 Recibiste +${rewardCoins} monedas`;
        else if (lang === "en") rewardMessage = `🎉 You got +${rewardCoins} coins`;
        else rewardMessage = `🎉 Chaskinki +${rewardCoins} qullqita`;
      } else {
        survivalBonusLives += 1;
        localStorage.setItem('survivalBonusLives', survivalBonusLives);
        if (lang === "es") rewardMessage = "❤️ Ganaste +1 corazón para tu próxima supervivencia";
        else if (lang === "en") rewardMessage = "❤️ You got +1 heart for your next survival run";
        else rewardMessage = "❤️ Chaskinki +1 sunquuta qatiq kawsaypaq";
      }

      lastGiftClaimTs = Date.now();
      localStorage.setItem('lastGiftClaimTs', String(lastGiftClaimTs));
      updateLocks();
      updateGiftUI(rewardMessage);
      showGiftRewardToast(rewardMessage);
      showConfetti(50, 42);
    }

    function showGiftRewardToast(message) {
      const toast = document.getElementById("giftToast");
      if (!toast) return;
      toast.innerText = message;
      toast.classList.remove("show");
      void toast.offsetWidth;
      toast.classList.add("show");
    }

    function startLevel(l) {
      console.log("startLevel called with level:", l, "unlocked:", unlocked);
      if (l > unlocked) {
        console.log("Level locked, returning");
        return;
      }
      
      isSurvival = false;
      isCategoryMode = false;
      applyLevelVisualTheme(l);
      level = l;
      index = 0;
      score = 0;
      combo = 0;
      
      document.getElementById("comboBadge").style.display = "none";
      document.getElementById("lives-container").style.display = "none";
      document.getElementById("lifelines").style.display = "flex";
      updateLifelineLabels();
      document.getElementById("quizCoins").innerText = coins;

      // Filtrar preguntas no usadas aún y acordes a la dificultad del nivel
      let currentBank = getQuestionBank();
      let available = currentBank.map((q, i) => i).filter(i => !usedQuestionIndices.has(i) && currentBank[i].lvl === level);

      // Si quedan menos de 10 de la dificultad actual, reseteamos SOLO las de este nivel
      if (available.length < 10) {
        let levelIndices = currentBank.map((q, i) => i).filter(i => currentBank[i].lvl === level);
        levelIndices.forEach(idx => usedQuestionIndices.delete(idx));
        available = currentBank.map((q, i) => i).filter(i => !usedQuestionIndices.has(i) && currentBank[i].lvl === level);
      }

      // Si aún no hay suficientes, usar cualquier pregunta del nivel (incluyendo usadas)
      if (available.length < 10) {
        available = currentBank.map((q, i) => i).filter(i => currentBank[i].lvl === level);
      }

      // Mezclar y tomar 10
      let shuffledIndices = shuffle([...available]);
      let picked = shuffledIndices.slice(0, 10);

      // Marcar como usadas
      picked.forEach(i => usedQuestionIndices.add(i));

      questions = picked.map(i => getQuestionBank()[i]);
      
      if (questions.length === 0) {
        console.error(`ERROR: No hay preguntas para el nivel ${level}`);
        alert(`Error: No se encontraron preguntas para el nivel ${level}. Por favor recarga la página.`);
        return;
      }

      show("quiz");
      nextQ();
    }

    /* ===== CATEGORY MODE ===== */
    let isCategoryMode = false;
    let currentCategory = '';

    // Category question indices
    const oldTestamentIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113];
    const newTestamentIndices = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147];
    const charactersIndices = [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 55, 57, 58, 59, 60, 61, 62, 63, 64, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97];

    // True/False question bank
    const trueFalseBank = [
      { q_es: "¿Adán y Eva comieron del árbol de la vida?", q_en: "Did Adam and Eve eat from the tree of life?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Génesis 3:6", text_es: "Comieron del árbol del bien y del mal, no de la vida.", text_en: "They ate from the tree of good and evil, not of life." },
      { q_es: "¿Noé llevó dos de cada animal al arca?", q_en: "Did Noah take two of each animal on the ark?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 7:15", text_es: "Dos de cada especie entraron al arca.", text_en: "Two of every kind entered the ark." },
      { q_es: "¿Abraham tenía 100 años cuando nació Isaac?", q_en: "Was Abraham 100 years old when Isaac was born?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 21:5", text_es: "Abraham tenía 100 años.", text_en: "Abraham was 100 years old." },
      { q_es: "¿Moisés partió el Mar Rojo en dos?", q_en: "Did Moses split the Red Sea in two?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Éxodo 14:21", text_es: "Las aguas se dividieron.", text_en: "The waters were divided." },
      { q_es: "¿David era hijo de Saúl?", q_en: "Was David the son of Saul?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "1 Samuel 17:12", text_es: "David era hijo de Isaí, no de Saúl.", text_en: "David was son of Jesse, not Saul." },
      { q_es: "¿Salomón construyó el primer templo?", q_en: "Did Solomon build the first temple?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "1 Reyes 6:1", text_es: "Salomón comenzó a edificar el templo.", text_en: "Solomon began to build the temple." },
      { q_es: "¿Jonás fue envuelto por una ballena?", q_en: "Was Jonah swallowed by a whale?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Jonás 1:17", text_es: "Un gran pez, no específicamente ballena.", text_en: "A great fish, not specifically a whale." },
      { q_es: "¿Jesús nació en Nazaret?", q_en: "Was Jesus born in Nazareth?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Mateo 2:1", text_es: "Jesús nació en Belén, no Nazaret.", text_en: "Jesus was born in Bethlehem, not Nazareth." },
      { q_es: "¿Jesús tuvo 12 apóstoles?", q_en: "Did Jesus have 12 apostles?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 10:1", text_es: "Llamó a sus doce discípulos.", text_en: "He called his twelve disciples." },
      { q_es: "¿Pedro negó a Jesús tres veces?", q_en: "Did Peter deny Jesus three times?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 26:75", text_es: "Pedro lo negó tres veces.", text_en: "Peter denied him three times." },
      { q_es: "¿Pablo era uno de los doce apóstoles originales?", q_en: "Was Paul one of the original twelve apostles?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Hechos 9:3-6", text_es: "Pablo fue llamado después, no era de los doce.", text_en: "Paul was called later, not among the twelve." },
      { q_es: "¿Jesús resucitó a Lázaro de los muertos?", q_en: "Did Jesus raise Lazarus from the dead?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Juan 11:43-44", text_es: "Lázaro salió de la tumba.", text_en: "Lazarus came out of the tomb." },
      { q_es: "¿La Biblia tiene 66 libros en total?", q_en: "Does the Bible have 66 books in total?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Canon bíblico", text_es: "39 en el AT y 27 en el NT = 66 libros.", text_en: "39 in OT and 27 in NT = 66 books." },
      { q_es: "¿Moisés escribió los Salmos?", q_en: "Did Moses write the Psalms?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Salmos", text_es: "David escribió la mayoría, no Moisés.", text_en: "David wrote most of them, not Moses." },
      { q_es: "¿Jesús caminó sobre el agua?", q_en: "Did Jesus walk on water?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 14:25", text_es: "Jesús caminó sobre las aguas.", text_en: "Jesus walked on the sea." },
      { q_es: "¿Satanás tentó a Eva en el jardín?", q_en: "Did Satan tempt Eve in the garden?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Génesis 3:1", text_es: "La serpiente (no especificado como Satanás en Génesis).", text_en: "The serpent (not specified as Satan in Genesis)." },
      { q_es: "¿El diluvio duró 40 días y 40 noches?", q_en: "Did the flood last 40 days and 40 nights?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 7:12", text_es: "Llovió 40 días y 40 noches.", text_en: "It rained 40 days and 40 nights." },
      { q_es: "¿Caín mató a su hermano Abel?", q_en: "Did Cain kill his brother Abel?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 4:8", text_es: "Caín atacó a su hermano Abel.", text_en: "Cain attacked his brother Abel." },
      { q_es: "¿José fue vendido como esclavo por sus hermanos?", q_en: "Was Joseph sold as a slave by his brothers?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Génesis 37:28", text_es: "Sus hermanos lo vendieron por 20 piezas de plata.", text_en: "His brothers sold him for 20 pieces of silver." },
      { q_es: "¿El Arca de la Alianza contenía los diez mandamientos?", q_en: "Did the Ark of the Covenant contain the Ten Commandments?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Hebreos 9:4", text_es: "Contenía las tablas del pacto.", text_en: "It contained the tablets of the covenant." },
      { q_es: "¿Goliat era un israelita?", q_en: "Was Goliath an Israelite?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "1 Samuel 17:4", text_es: "Goliat era filisteo, no israelita.", text_en: "Goliath was Philistine, not Israelite." },
      { q_es: "¿Daniel sobrevivió en el foso de los leones?", q_en: "Did Daniel survive the lions' den?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Daniel 6:22", text_es: "Daniel fue protegido por Dios.", text_en: "Daniel was protected by God." },
      { q_es: "¿Jesús fue bautizado por Juan el Bautista?", q_en: "Was Jesus baptized by John the Baptist?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 3:13", text_es: "Jesús fue bautizado por Juan en el Jordán.", text_en: "Jesus was baptized by John in the Jordan." },
      { q_es: "¿Jesús resucitó al tercer día?", q_en: "Did Jesus rise on the third day?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "1 Corintios 15:4", text_es: "Resucitó al tercer día según las Escrituras.", text_en: "He rose again the third day according to the Scriptures." },
      { q_es: "¿Pablo escribió el libro de Apocalipsis?", q_en: "Did Paul write the book of Revelation?", a_es: ["Falso", "Verdadero"], a_en: ["False", "True"], c: 0, ref: "Apocalipsis 1:1", text_es: "Juan escribió Apocalipsis, no Pablo.", text_en: "John wrote Revelation, not Paul." },
      { q_es: "¿La última cena fue antes de la crucifixión?", q_en: "Was the Last Supper before the crucifixion?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 26:26-30", text_es: "Fue la última cena antes de que Jesús fuera arrestado.", text_en: "It was the last supper before Jesus was arrested." },
      { q_es: "¿María Magdalena fue la primera en ver a Jesús resucitado?", q_en: "Was Mary Magdalene the first to see the risen Jesus?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Juan 20:14-16", text_es: "María Magdalena fue la primera en verlo.", text_en: "Mary Magdalene was the first to see him." },
      { q_es: "¿Jesús nació de una virgen?", q_en: "Was Jesus born of a virgin?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 1:23", text_es: "María era virgen cuando concibió.", text_en: "Mary was a virgin when she conceived." },
      { q_es: "¿El Espíritu Santo descendió en Pentecostés?", q_en: "Did the Holy Spirit descend at Pentecost?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Hechos 2:1-4", text_es: "El Espíritu Santo descendió como lenguas de fuego.", text_en: "The Holy Spirit descended as tongues of fire." },
      { q_es: "¿Bautizar significa sumergir en agua?", q_en: "Does baptize mean to immerse in water?", a_es: ["Verdadero", "Falso"], a_en: ["True", "False"], c: 0, ref: "Mateo 3:16", text_es: "Jesús subió del agua después de ser bautizado.", text_en: "Jesus went up from the water after being baptized." }
    ];

    function startCategory(category) {
      let vol = document.getElementById("volume").value;
      updateVolume(vol);

      let bgMusic = document.getElementById("bgMusic");
      bgMusic.play().catch(e => console.log("Audio play prevented:", e));

      isCategoryMode = true;
      isSurvival = false;
      currentCategory = category;
      clearLevelVisualTheme();
      index = 0;
      score = 0;
      combo = 0;
      
      document.getElementById("comboBadge").style.display = "none";
      document.getElementById("lives-container").style.display = "none";
      document.getElementById("lifelines").style.display = "flex";
      updateLifelineLabels();
      document.getElementById("quizCoins").innerText = coins;

      let categoryIndices;
      if (category === 'oldTestament') {
        const currentBank = getQuestionBank();
        categoryIndices = currentBank.map((q, i) => i).filter(i => currentBank[i].lvl <= 30);
      } else if (category === 'newTestament') {
        const currentBank = getQuestionBank();
        categoryIndices = currentBank.map((q, i) => i).filter(i => currentBank[i].lvl >= 31 && currentBank[i].lvl <= 100);
      } else if (category === 'characters') {
        const currentBank = getQuestionBank();
        // Búsqueda simple de palabras clave relacionadas con personajes
        const keywords = ['quién', 'quien', 'quiénes', 'quienes', 'hijo', 'esposa', 'madre', 'padre', 'rey', 'reina', 'profeta', 'juez', 'apóstol', 'discípulo'];
        categoryIndices = currentBank.map((q, i) => i).filter(i => {
          const text = (currentBank[i].q_es || "").toLowerCase();
          return keywords.some(k => text.includes(k));
        });
      } else if (category === 'trueFalse') {
        // For true/false, use special bank
        questions = shuffle([...trueFalseBank]);
        show("quiz");
        nextQ();
        return;
      }

      // Filter and select 10 random questions from category
      categoryIndices = shuffle(categoryIndices);
      let picked = categoryIndices.slice(0, 10);
      questions = picked.map(i => getQuestionBank()[i]);

      show("quiz");
      nextQ();
    }

    function finishCategory() {
      let earnedStars = score === 10 ? 3 : (score >= 8 ? 2 : 1);
      
      let categoryNames = {
        'oldTestament': 
          lang === 'es' ? 'Antiguo Testamento' :
          lang === 'qu' ? 'Ñawpaq Testamento' :
          'Old Testament',
        'newTestament': 
          lang === 'es' ? 'Nuevo Testamento' :
          lang === 'qu' ? 'Musuq Testamento' :
          'New Testament',
        'characters': 
          lang === 'es' ? 'Personajes Bíblicos' :
          lang === 'qu' ? 'Bibliamanta Runakuna' :
          'Biblical Characters',
        'trueFalse': 
          lang === 'es' ? 'Verdadero o Falso' :
          lang === 'qu' ? 'Chiqap o Llullap' :
          'True or False'
      };

      if (score >= 7) {
        let bgAudio = document.getElementById("bgMusic");
        if (bgAudio) bgAudio.pause();

        let vAudio = document.getElementById("victoryAudio");
        if (vAudio) {
          vAudio.currentTime = 0;
          vAudio.play().catch(e => {});
        }

        document.getElementById("congratsTitle").innerText = 
          lang === "es" ? "¡Categoría completada! 🎉" :
          lang === "qu" ? "¡Categoría tukurqan! 🎉" :
          "Category completed! 🎉";
        document.getElementById("congratsMsg").innerText = 
          lang === "es" ? "¡Superaste la categoría " + categoryNames[currentCategory] + " con honor! 🌟" :
          lang === "qu" ? "¡Atipanki " + categoryNames[currentCategory] + " categoriata allinllawan! 🌟" :
          "You passed the " + categoryNames[currentCategory] + " category with honor! 🌟";
        document.getElementById("congrats-score-num").innerText = score;
        
        let sc = document.getElementById("congratsStars");
        renderStars(sc, 3, earnedStars);

        let nextBtn = document.getElementById("nextBtn");
        nextBtn.innerText = 
          lang === "es" ? "📚 Otra categoría" :
          lang === "qu" ? "📚 Huk yapamanta categoría" :
          "📚 Another category";
        nextBtn.style.display = "inline-flex";
        nextBtn.onclick = () => show('categories');
        
        show("congrats");
        startContinuousConfetti();
      } else {
        let wrongSnd = document.getElementById("wrongAudio");
        wrongSnd.currentTime = 0;
        wrongSnd.play().catch(e => { });

        document.getElementById("tryIcon").innerText = "💪";
        document.getElementById("tryTitle").innerText = 
          lang === "es" ? "¡Inténtalo de nuevo!" :
          lang === "qu" ? "¡Musk'aq ruray!" :
          "Try again!";
        document.getElementById("tryMsg").innerText = 
          lang === "es" ? "Necesitas 7 o más para completar la categoría. ¡Tú puedes! 🌈" :
          lang === "qu" ? "7 o aswan necesitanki categoriata tukunapaq. ¡Qan atipawaq! 🌈" :
          "You need 7 or more to complete the category. You can do it! 🌈";
        document.getElementById("try-score-num").innerText = score;
        document.getElementById("try-score-den").innerText = "/10";
        document.getElementById("retryBtn").style.display = "inline-flex";
        document.getElementById("retryBtn").onclick = () => startCategory(currentCategory);
        show("tryagain");
      }
    }

    // Función para generar datos de preview de cualquier nivel (1-100)
    function getLevelPreviewData(levelNumber) {
      const themes = [
        { range: [1, 5], emoji: "🌱", diff: "Fácil", diffEn: "Easy", diffQu: "Pisi" },
        { range: [6, 10], emoji: "📜", diff: "Fácil-Medio", diffEn: "Easy-Medium", diffQu: "Pisi-Chawpi" },
        { range: [11, 15], emoji: "⚔️", diff: "Medio", diffEn: "Medium", diffQu: "Chawpi" },
        { range: [16, 20], emoji: "👑", diff: "Medio", diffEn: "Medium", diffQu: "Chawpi" },
        { range: [21, 25], emoji: "📖", diff: "Medio-Alto", diffEn: "Medium-High", diffQu: "Chawpi-Hanaq" },
        { range: [26, 30], emoji: "🏛️", diff: "Medio-Alto", diffEn: "Medium-High", diffQu: "Chawpi-Hanaq" },
        { range: [31, 35], emoji: "⭐", diff: "Alto", diffEn: "Hard", diffQu: "Sasa" },
        { range: [36, 40], emoji: "🚶", diff: "Alto", diffEn: "Hard", diffQu: "Sasa" },
        { range: [41, 45], emoji: "✝️", diff: "Alto", diffEn: "Hard", diffQu: "Sasa" },
        { range: [46, 50], emoji: "🔥", diff: "Alto", diffEn: "Hard", diffQu: "Sasa" },
        { range: [51, 55], emoji: "✉️", diff: "Experto", diffEn: "Expert", diffQu: "Yachaq" },
        { range: [56, 60], emoji: "⛓️", diff: "Experto", diffEn: "Expert", diffQu: "Yachaq" },
        { range: [61, 65], emoji: "📜", diff: "Experto", diffEn: "Expert", diffQu: "Yachaq" },
        { range: [66, 70], emoji: "💎", diff: "Experto", diffEn: "Expert", diffQu: "Yachaq" },
        { range: [71, 75], emoji: "👁️", diff: "Maestro", diffEn: "Master", diffQu: "Yachachiq" },
        { range: [76, 80], emoji: "🔮", diff: "Maestro", diffEn: "Master", diffQu: "Yachachiq" },
        { range: [81, 85], emoji: "⚡", diff: "Maestro", diffEn: "Master", diffQu: "Yachachiq" },
        { range: [86, 90], emoji: "🌟", diff: "Maestro", diffEn: "Master", diffQu: "Yachachiq" },
        { range: [91, 95], emoji: "🏆", diff: "Leyenda", diffEn: "Legend", diffQu: "Kusikusqa" },
        { range: [96, 100], emoji: "👑", diff: "Divino", diffEn: "Divine", diffQu: "Diosniyuq" }
      ];
      
      const theme = themes.find(t => levelNumber >= t.range[0] && levelNumber <= t.range[1]) || themes[0];
      
      return {
        emoji: theme.emoji,
        es: { 
          title: `Nivel ${levelNumber}`, 
          desc: `Trivia bíblica nivel ${levelNumber}. Domina la Palabra de Dios.`, 
          diff: `Dificultad: ${theme.diff}` 
        },
        en: { 
          title: `Level ${levelNumber}`, 
          desc: `Bible trivia level ${levelNumber}. Master God's Word.`, 
          diff: `Difficulty: ${theme.diffEn}` 
        },
        qu: { 
          title: `Nivel ${levelNumber}`, 
          desc: `Bibliamanta tapukuy nivel ${levelNumber}. Diospa rimasqanta yachay.`, 
          diff: `Sasa kay: ${theme.diffQu}` 
        }
      };
    }
    
    // Mantener compatibilidad con código existente
    const levelPreviewData = {
      1: getLevelPreviewData(1),
      2: getLevelPreviewData(2),
      3: getLevelPreviewData(3),
      4: getLevelPreviewData(4),
      5: getLevelPreviewData(5)
    };

    function updateLevelPreviewText() {
      const box = document.getElementById("levelPreview");
      if (!box || box.style.display === "none") return;
      showLevelPreview(Math.min(unlocked, 100));
    }

    function showLevelPreview(levelNumber) {
      const data = getLevelPreviewData(levelNumber);
      const t = 
        lang === "es" ? data.es :
        lang === "en" ? data.en :
        data.qu;
      document.getElementById("levelPreview").style.display = "block";
      document.getElementById("previewEmoji").innerText = data.emoji;
      document.getElementById("previewTitle").innerText = t.title;
      document.getElementById("previewDesc").innerText = t.desc;
      document.getElementById("previewDifficulty").innerText = t.diff;
      document.getElementById("previewReward").innerText = "+20 🪙";
    }

    function highlightCurrentLevel() {
      document.querySelectorAll(".level-pin").forEach(el => el.classList.remove("level-current"));
      const current = Math.min(unlocked, 100);
      const currentPin = document.getElementById(`lvlPin${current}`);
      if (currentPin) currentPin.classList.add("level-current");
    }

    function startSurvival() {
      let vol = document.getElementById("volume").value;
      updateVolume(vol);

      let bgMusic = document.getElementById("bgMusic");
      bgMusic.play().catch(e => console.log("Audio play prevented:", e));

      isSurvival = true;
      isCategoryMode = false;
      clearLevelVisualTheme();
      lives = 3 + survivalBonusLives;
      survivalBonusLives = 0;
      localStorage.setItem('survivalBonusLives', survivalBonusLives);
      survivalScore = 0;
      combo = 0;
      index = 0;
      
      document.getElementById("comboBadge").style.display = "none";
      document.getElementById("lives-container").style.display = "block";
      document.getElementById("lives-container").innerText = "❤️❤️❤️";
      document.getElementById("lifelines").style.display = "none"; // No comodines
      updateLifelineLabels();
      
      let currentBank = getQuestionBank();
      let available = currentBank.map((q, i) => i);
      questions = shuffle([...available]).map(i => currentBank[i]);

      show("quiz");
      nextQ();
    }

    function useFiftyFifty() {
      const cost = getDifficultyConfig().costs.fifty;
      if (coins < cost) return;
      coins -= cost;
      localStorage.setItem('coins', coins);
      document.getElementById("quizCoins").innerText = coins;
      
      let buttons = Array.from(document.querySelectorAll("#a .answer"));
      let incorrectButtons = buttons.filter(b => !b.dataset.correct);
      
      for(let i=0; i<Math.min(2, incorrectButtons.length); i++){
        incorrectButtons[i].style.visibility = "hidden";
        incorrectButtons[i].onclick = null;
      }
      
      let correctSnd = document.getElementById("correctAudio");
      correctSnd.currentTime = 0;
      correctSnd.play().catch(e => {});
      document.getElementById("fiftyBtn").disabled = true;
    }

    function useExtraTime() {
      const cost = getDifficultyConfig().costs.time;
      if (coins < cost) return;
      coins -= cost;
      localStorage.setItem('coins', coins);
      document.getElementById("quizCoins").innerText = coins;
      
      time += 10;
      let correctSnd = document.getElementById("correctAudio");
      correctSnd.currentTime = 0;
      correctSnd.play().catch(e => {});
    }

    function nextQ() {
      clearInterval(timer);
      
      // Start clock sound, stop background music
      let clockAudio = document.getElementById("clockAudio");
      let bgAudio = document.getElementById("bgMusic");
      if (clockAudio) {
        clockAudio.currentTime = 0;
        clockAudio.volume = bgAudio ? bgAudio.volume : 0.5;
        clockAudio.play().catch(e => {});
      }
      if (bgAudio && !bgAudio.paused) {
        bgAudio.pause();
      }
      
      if (!isSurvival && index >= questions.length) { finish(); return; }
      if (isSurvival && index >= questions.length) {
        let currentBank = getQuestionBank();
        let available = currentBank.map((q, i) => i);
        questions = shuffle([...available]).map(i => currentBank[i]);
        index = 0;
      }

      let q = questions[index];
      if (isSurvival) {
        document.getElementById("quiz-label").innerText = 
          "🔥 " + (
            lang === "es" ? "Supervivencia" :
            lang === "qu" ? "Kawsay" :
            "Survival"
          ) + " · " + (
            lang === "es" ? "Puntos: " :
            lang === "qu" ? "Puntos: " :
            "Points: "
          ) + survivalScore;
      } else if (isCategoryMode) {
        let catNames = {
          'oldTestament': 
            lang === 'es' ? '📜 Antiguo Testamento' :
            lang === 'qu' ? '📜 Ñawpaq Testamento' :
            '📜 Old Testament',
          'newTestament': 
            lang === 'es' ? '📖 Nuevo Testamento' :
            lang === 'qu' ? '📖 Musuq Testamento' :
            '📖 New Testament',
          'characters': 
            lang === 'es' ? '👑 Personajes' :
            lang === 'qu' ? '👑 Runakuna' :
            '👑 Characters',
          'trueFalse': 
            lang === 'es' ? '✅❌ Verdadero/Falso' :
            lang === 'qu' ? '✅❌ Chiqap/Llullap' :
            '✅❌ True/False'
        };
        document.getElementById("quiz-label").innerText =
          catNames[currentCategory] + " · " + (
            lang === "es" ? "Pregunta " :
            lang === "qu" ? "Tapukuy " :
            "Question "
          ) + (index + 1) + "/10";
      } else {
        document.getElementById("quiz-label").innerText =
          "⭐ " + (
            lang === "es" ? "Nivel " :
            lang === "qu" ? "Nivel " :
            "Level "
          ) + level + " · " + (
            lang === "es" ? "Pregunta " :
            lang === "qu" ? "Tapukuy " :
            "Question "
          ) + (index + 1) + "/10";
      }

      if(!isSurvival){
        document.getElementById("fiftyBtn").disabled = false;
        const hintBtn = document.getElementById("hintBtn");
        const skipBtn = document.getElementById("skipBtn");
        const timeBtn = document.getElementById("timeBtn");
        if (hintBtn) hintBtn.disabled = false;
        if (skipBtn) skipBtn.disabled = false;
        if (timeBtn) timeBtn.disabled = false;
      }

      document.getElementById("q").innerText = 
        lang === "es" ? q.q_es :
        lang === "qu" ? (q.q_qu || q.q_es) :
        q.q_en;
      document.getElementById("verse").classList.remove("show");
      document.getElementById("confetti").classList.remove("show");

      let div = document.getElementById("a");
      div.innerHTML = "";
      startTimer();

      let answers = 
        lang === "es" ? q.a_es :
        lang === "qu" ? (q.a_qu || q.a_es) :
        q.a_en;
      let correctIndex = q.c;
      let shuffledAnswers = shuffle([...answers]);
      let newCorrectIndex = shuffledAnswers.indexOf(answers[correctIndex]);

      const emojis = ["🅰️", "🅱️", "🆎"];
      shuffledAnswers.forEach((op, i) => {
        let b = document.createElement("button");
        b.className = "answer";
        b.innerText = op;
        if (i === newCorrectIndex) b.dataset.correct = "true";
        b.onclick = () => answer(i, newCorrectIndex);
        div.appendChild(b);
      });
    }

    function updateLivesUI() {
      let str = "";
      for(let i=0; i<3; i++) {
        str += i < lives ? "❤️" : "🖤";
      }
      document.getElementById("lives-container").innerText = str;
    }
    
    function showFloatingCombo() {
      let f = document.createElement("div");
      f.className = "floating-text";
      f.innerText = "¡Racha x" + combo + "!";
      f.style.left = (40 + Math.random() * 20) + "%";
      f.style.top = "30%";
      document.getElementById("quiz").appendChild(f);
      setTimeout(() => f.remove(), 1500);
    }

    function startTimer() {
      baseTime = getDifficultyConfig().baseTime;
      time = baseTime;
      let timerEl = document.getElementById("timer");
      let clockNumber = document.getElementById("clockNumber");
      timerEl.style.width = "100%";
      timerEl.classList.remove("danger");
      if (clockNumber) clockNumber.innerText = time;
      timer = setInterval(() => {
        time--;
        if (clockNumber) clockNumber.innerText = Math.max(0, time);
        timerEl.style.width = Math.max(0, Math.min(100, (time / baseTime) * 100)) + "%";
        if (time <= Math.max(2, Math.ceil(baseTime * 0.25))) timerEl.classList.add("danger");
        else timerEl.classList.remove("danger");

        if (time <= 0) {
          clearInterval(timer);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          let wrongSnd = document.getElementById("wrongAudio");
          wrongSnd.currentTime = 0;
          wrongSnd.play().catch(e => { });
          
          combo = 0;
          document.getElementById("comboBadge").style.display = "none";
          
          if (isSurvival) {
            lives--;
            updateLivesUI();
            if (lives <= 0) {
              finishSurvival();
              return;
            }
          }
          
          index++;
          nextQ();
        }
      }, 1000);
    }

    function answer(clickedIndex, correctIndex) {
      clearInterval(timer);
      
      // Stop clock sound when answering
      let clockAudio = document.getElementById("clockAudio");
      if (clockAudio && !clockAudio.paused) {
        clockAudio.pause();
        clockAudio.currentTime = 0;
      }
      
      let q = questions[index];
      let buttons = document.querySelectorAll(".answer");

      buttons.forEach((b, i) => {
        b.onclick = null;
        if (i === correctIndex) b.classList.add("correct");
        if (i === clickedIndex && clickedIndex !== correctIndex) b.classList.add("wrong");
      });

      if (clickedIndex === correctIndex) {
        if (navigator.vibrate) navigator.vibrate(50);
        stats.answered++;
        stats.correct++;
        
        let correctSnd = document.getElementById("correctAudio");
        correctSnd.currentTime = 0;
        correctSnd.play().catch(e => console.error("Error al reproducir acertar:", e));
        score++;
        survivalScore++;
        combo++;
        if (combo > stats.maxCombo) stats.maxCombo = combo;
        
        const cfg = getDifficultyConfig();
        let earnedCoins = 2 + Math.floor(combo / 2);
        earnedCoins = Math.max(1, Math.round(earnedCoins * cfg.coinMult));
        coins += earnedCoins;
        localStorage.setItem('coins', coins);
        document.getElementById('quizCoins').innerText = coins;
        
        if (combo >= 3) {
          let cb = document.getElementById("comboBadge");
          let rachaText = "🔥 Racha x";
          if (lang === "en") rachaText = "🔥 Streak x";
          if (lang === "qu") rachaText = "🔥 Atipay x";
          cb.innerText = rachaText + combo;
          cb.style.display = "block";
          cb.style.animation = 'none';
          cb.offsetHeight; 
          cb.style.animation = 'popIn 0.3s forwards';
          showFloatingCombo();
        }
        showConfetti();
      } else {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        stats.answered++;
        combo = 0;
        document.getElementById("comboBadge").style.display = "none";
        
        let wrongSnd = document.getElementById("wrongAudio");
        wrongSnd.volume = parseFloat(document.getElementById("volume").value) || 0.5;
        wrongSnd.currentTime = 0;
        wrongSnd.play().catch(e => console.error("Fallo audio error:", e));
      }

      let v = document.getElementById("verse");
      v.innerHTML = "<strong>📖 " + q.ref + "</strong>" + (
        lang === "es" ? q.text_es :
        lang === "qu" ? (q.text_qu || q.text_es) :
        q.text_en
      );
      v.classList.add("show");

      setTimeout(() => { 
        if (isSurvival && clickedIndex !== correctIndex) {
          lives--;
          updateLivesUI();
          if (lives <= 0) {
            finishSurvival();
            return;
          }
        }
        index++; 
        savePremiumData();
        checkAchievements();
        nextQ(); 
      }, 1800);
    }

    function useHint() {
      const cost = getDifficultyConfig().costs.hint;
      if (coins < cost) return;
      let buttons = Array.from(document.querySelectorAll("#a .answer"));
      if (buttons.length < 2) return;
      const incorrect = buttons.filter(b => !b.dataset.correct && b.style.visibility !== "hidden" && !b.classList.contains("wrong"));
      if (incorrect.length === 0) return;

      coins -= cost;
      localStorage.setItem('coins', coins);
      document.getElementById("quizCoins").innerText = coins;

      // Elimina 1 respuesta incorrecta (pista)
      const pick = incorrect[Math.floor(Math.random() * incorrect.length)];
      pick.style.visibility = "hidden";
      pick.onclick = null;

      let snd = document.getElementById("correctAudio");
      snd.currentTime = 0;
      snd.play().catch(e => {});

      document.getElementById("hintBtn").disabled = true;
    }

    function useSkip() {
      const cost = getDifficultyConfig().costs.skip;
      if (coins < cost) return;

      coins -= cost;
      localStorage.setItem('coins', coins);
      document.getElementById("quizCoins").innerText = coins;

      combo = 0;
      document.getElementById("comboBadge").style.display = "none";

      let snd = document.getElementById("correctAudio");
      snd.currentTime = 0;
      snd.play().catch(e => {});

      clearInterval(timer);
      index++;
      nextQ();
    }

    function finish() {
      // Stop clock sound when finishing
      let clockAudio = document.getElementById("clockAudio");
      if (clockAudio && !clockAudio.paused) {
        clockAudio.pause();
        clockAudio.currentTime = 0;
      }
      
      // Handle category mode finish separately
      if (isCategoryMode) {
        finishCategory();
        return;
      }

      if (score >= 7) {
        let bgAudio = document.getElementById("bgMusic");
        if (bgAudio) bgAudio.pause();

        let vAudio = document.getElementById("victoryAudio");
        if (vAudio) {
          vAudio.currentTime = 0;
          vAudio.play().catch(e => {});
        }

        let earnedStars = score === 10 ? 3 : (score >= 8 ? 2 : 1);
        if (!levelStars[level] || earnedStars > levelStars[level]) {
          levelStars[level] = earnedStars;
          localStorage.setItem('levelStars', JSON.stringify(levelStars));
        }

        document.getElementById("congratsTitle").innerText = 
          lang === "es" ? "¡Felicidades! 🎉" :
          lang === "qu" ? "¡Allinlla! 🎉" :
          "Congratulations! 🎉";
        document.getElementById("congratsMsg").innerText = 
          lang === "es" ? "¡Superaste el Nivel " + level + " con honor! 🌟" :
          lang === "qu" ? "¡Atipanki Nivel " + level + "ta allinllawan! 🌟" :
          "You passed Level " + level + " with honor! 🌟";
        document.getElementById("congrats-score-num").innerText = score;
        
        let sc = document.getElementById("congratsStars");
        renderStars(sc, 3, earnedStars);

        let nextBtn = document.getElementById("nextBtn");
        nextBtn.innerText = level < 100
          ? (
              lang === "es" ? "Siguiente nivel 🚀" :
              lang === "qu" ? "Qatiq nivel 🚀" :
              "Next level 🚀"
            )
          : (
              lang === "es" ? "🗺️ Volver al mapa" :
              lang === "qu" ? "🗺️ Mapaman kutiy" :
              "Back to map 🗺️"
            );
        nextBtn.style.display = level < 100 ? "inline-flex" : "none";
        nextBtn.onclick = nextLevel;
        
        show("congrats");
        startContinuousConfetti();
        if (level < 100) {
          unlocked = Math.max(unlocked, level + 1);
          localStorage.setItem('unlocked', unlocked);
        }
        updateLocks();
      } else {
        let wrongSnd = document.getElementById("wrongAudio");
        wrongSnd.currentTime = 0;
        wrongSnd.play().catch(e => { });

        document.getElementById("tryIcon").innerText = "💪";
        document.getElementById("tryTitle").innerText = 
          lang === "es" ? "¡Inténtalo de nuevo!" :
          lang === "qu" ? "¡Musk'aq ruray!" :
          "Try again!";
        document.getElementById("tryMsg").innerText = 
          lang === "es" ? "Necesitas 7 o más para avanzar. ¡Tú puedes! 🌈" :
          lang === "qu" ? "7 o aswan necesitanki ñawpaqman riyta. ¡Qan atipawaq! 🌈" :
          "You need 7 or more to advance. You can do it! 🌈";
        document.getElementById("try-score-num").innerText = score;
        document.getElementById("try-score-den").innerText = "/10";
        document.getElementById("retryBtn").style.display = "inline-flex";
        show("tryagain");
      }
    }

    function finishSurvival() {
      // Stop clock sound when finishing
      let clockAudio = document.getElementById("clockAudio");
      if (clockAudio && !clockAudio.paused) {
        clockAudio.pause();
        clockAudio.currentTime = 0;
      }
      
      let wrongSnd = document.getElementById("wrongAudio");
      wrongSnd.currentTime = 0;
      wrongSnd.play().catch(e => { });
      
      let isHigh = false;
      if (survivalScore > survivalHighScore) {
        survivalHighScore = survivalScore;
        localStorage.setItem('survivalHighScore', survivalHighScore);
        isHigh = true;
      }
      
      document.getElementById("tryIcon").innerText = "🔥";
      document.getElementById("tryTitle").innerText = 
        lang === "es" ? "¡Fin del Juego!" :
        lang === "qu" ? "¡Pukllay tukuy!" :
        "Game Over!";
      document.getElementById("tryMsg").innerText = (isHigh ? 
        (lang === "es" ? "🌟 ¡NUEVO RÉCORD! 🌟\n" :
         lang === "qu" ? "🌟 ¡MUSUQ RÉCORD! 🌟\n" :
         "🌟 NEW RECORD! 🌟\n") : "") + 
        (lang === "es" ? "Sobreviviste a " + survivalScore + " preguntas." :
         lang === "qu" ? survivalScore + " tapukuykunapi kawsanki." :
         "You survived " + survivalScore + " questions.");
      document.getElementById("try-score-num").innerText = survivalScore;
      document.getElementById("try-score-den").innerText = " PTS";
      document.getElementById("retryBtn").style.display = "none";
      show("tryagain");
      updateLocks();
    }

    function updateHomeProgress() {
      const unlockedEl = document.getElementById("homeUnlockedText");
      const coinsEl = document.getElementById("homeCoinsText");
      const accEl = document.getElementById("homeAccuracyText");
      if (unlockedEl) unlockedEl.innerText = `${Math.min(unlocked, 100)}/100`;
      if (coinsEl) coinsEl.innerText = String(coins);
      const accuracy = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;
      if (accEl) accEl.innerText = `${accuracy}%`;
    }

    // Función para generar niveles 16-100 dinámicamente con patrón zigzag
    function generateDynamicLevels() {
      const container = document.querySelector('.level-path-buttons');
      if (!container) return;
      
      // Verificar si ya se generaron los niveles dinámicos
      if (container.dataset.generated === 'full') return;
      
      // Posiciones de los niveles 1-15 para continuar el patrón:
      // 1:50%, 2:26.7%, 3:20%, 4:26.7%, 5:50%, 6:73.3%, 7:80%, 8:60%, 9:40%, 10:26.7%, 11:50%, 12:73.3%, 13:80%, 14:60%, 15:40%
      // El patrón es: Centro -> Izq -> IzqExt -> Izq -> Centro -> Der -> DerExt -> Der -> Izq -> Izq -> Centro -> Der -> DerExt -> Der -> Izq
      const leftPositions = [50, 26.7, 20, 26.7, 50, 73.3, 80, 60, 40, 26.7, 50, 73.3, 80, 60, 40];
      
      // El nivel 15 está en top:30%, espaciado de ~2% entre niveles
      // Para 85 niveles más (16-100), necesitamos extender significativamente
      const baseTop = 30;
      const spacing = 2.0; // Espaciado reducido para niveles más compactos
      
      for (let i = 16; i <= 100; i++) {
        // Verificar si ya existe
        if (document.getElementById('lvlPin' + i)) continue;
        
        // Calcular posición siguiendo el patrón cíclico
        const patternIndex = (i - 1) % 15;
        const left = leftPositions[patternIndex];
        const top = baseTop + (i - 15) * spacing;
        
        const pin = document.createElement('div');
        // Determinar clase de diseño según bloque de 5 niveles
        const blockClass = `level-block-${Math.ceil(i / 5)}`;
        pin.className = `level-pin ${blockClass}`;
        pin.id = 'lvlPin' + i;
        pin.style.cssText = `top:${top}%; left:${left}%;`;
        pin.dataset.level = i;

        // Determinar emoji de casa según el nivel
        let houseEmoji = i % 2 === 0 ? '🏘️' : '🏠';
        let extraClass = '';
        
        // Especial para nivel 100: Atalaya
        if (i === 100) {
          houseEmoji = '🏰';
          extraClass = 'legendary-tower';
        }

        // Determinar posición relativa de la casa (más alejada del nivel)
        const houseLeftOffset = left > 50 ? -85 : 85;

        pin.innerHTML = `
          <div class="level locked" id="lvl${i}">${i}</div>
          <span class="lock-badge" id="lock${i}">🔒</span>
          <div class="stars-container" id="stars${i}">
            <span class="star-gray">⭐</span>
            <span class="star-gray">⭐</span>
            <span class="star-gray">⭐</span>
          </div>
          <span class="house-decoration ${extraClass}" style="position: absolute; top: -10px; left: ${houseLeftOffset}%; animation: houseSway 6s ease-in-out infinite;">
            ${houseEmoji}
            ${i === 100 ? `
              <div class="tower-sparkles-container"></div>
            ` : ''}
          </span>
        `;

        container.appendChild(pin);

        // Generar chispas para el nivel 100
        if (i === 100) {
          const sparklesContainer = pin.querySelector('.tower-sparkles-container');
          setInterval(() => {
            const sparkle = document.createElement('div');
            sparkle.className = 'tower-sparkle';
            sparkle.style.left = Math.random() * 100 + '%';
            sparkle.style.bottom = '0';
            sparkle.style.setProperty('--drift', (Math.random() * 100 - 50) + 'px');
            sparkle.style.animationDelay = Math.random() * 2 + 's';
            sparklesContainer.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 2000);
          }, 200);
        }
      }
      
      // Ajustar la altura del contenedor del mapa para scroll
      const mapPathArea = document.querySelector('.map-path-area');
      if (mapPathArea) {
        const totalHeight = 100 + (85 * spacing); // 100% base + espaciado
        mapPathArea.style.height = `${Math.max(800, totalHeight)}%`;
      }
      
      container.dataset.generated = 'full';
      console.log('Niveles 16-100 generados dinámicamente con patrón zigzag mejorado');
      
      // Generar partículas después de que los niveles estén creados
      setTimeout(() => {
        updateLevelParticles();
        updateLevelWaves();
        updateLevelPath();
      }, 300);
    }

    function updateLocks() {
      console.log("updateLocks called, unlocked:", unlocked);
      let mapCoinsEl = document.getElementById('mapCoins');
      let quizCoinsEl = document.getElementById('quizCoins');
      if (mapCoinsEl) mapCoinsEl.innerText = coins;
      if (quizCoinsEl) quizCoinsEl.innerText = coins;
      
      // Update total stars counter
      let totalStars = 0;
      for (let i = 1; i <= 100; i++) {
        totalStars += levelStars[i] || 0;
      }
      let totalStarsEl = document.getElementById('mapTotalStars');
      if (totalStarsEl) totalStarsEl.innerText = totalStars;
      let highScoreEl = document.getElementById('highScoreText');
      if (highScoreEl) {
        let text = "🏆 Récord Supervivencia: ";
        if (lang === "en") text = "🏆 Survival Record: ";
        if (lang === "qu") text = "🏆 Kawsay Atipay: ";
        highScoreEl.innerText = text + survivalHighScore;
      }
      updateGiftUI();
      updateHomeProgress();

      // Generar niveles dinámicos si no existen (para niveles 16-100)
      generateDynamicLevels();
      
      for (let i = 1; i <= 100; i++) {
        let el = document.getElementById("lvl" + i);
        let lockEl = document.getElementById("lock" + i);
        let sc = document.getElementById("stars" + i);
        if (sc) {
          let st = levelStars[i] || 0;
          renderStars(sc, 3, st);
        }

        if (el) {
          if (unlocked >= i) {
            el.classList.remove("locked");
            
            // Marcar como completado si tiene estrellas
            if (levelStars[i] > 0) {
              el.classList.add("completed");
            } else {
              el.classList.remove("completed");
            }

            el.onclick = (function (n) { 
              return function(e) {
                startLevel(n);
              }; 
            })(i);
            if (lockEl) lockEl.style.display = "none";
            // Show decorations for this specific unlocked level
            const levelDecors = document.querySelectorAll('.level-decor[data-level="' + i + '"]');
            levelDecors.forEach(d => d.classList.add('show'));
          } else {
            el.classList.add("locked");
            el.onclick = null;
            if (lockEl) lockEl.style.display = "flex";
            // Hide decorations for this locked level
            const levelDecors = document.querySelectorAll('.level-decor[data-level="' + i + '"]');
            levelDecors.forEach(d => d.classList.remove('show'));
          }
        }

        // Add hover and click event listeners to level pins
        let levelPin = document.getElementById('lvlPin' + i);
        if (levelPin) {
          levelPin.onmouseenter = (function(n) {
            return function() {
              showLevelPreview(n);
            };
          })(i);
          levelPin.onmouseleave = function() {
            document.getElementById("levelPreview").style.display = "none";
          };
          // Make entire pin area clickable for unlocked levels
          if (unlocked >= i) {
            levelPin.style.cursor = 'pointer';
            levelPin.onclick = (function (n) { 
              return function(e) {
                e.stopPropagation();
                startLevel(n);
              }; 
            })(i);
          } else {
            levelPin.style.cursor = 'default';
            levelPin.onclick = null;
          }
        }
      }

      highlightCurrentLevel();
      
      // Actualizar partículas y ondas alrededor de niveles desbloqueados
      updateLevelParticles();
      updateLevelWaves();
      updateLevelPath();
      
      // Don't show preview automatically, only on hover
      document.getElementById("levelPreview").style.display = "none";
    }

    // Función para dibujar el camino de puntos entre niveles
    function updateLevelPath() {
      const mapContent = document.querySelector('.map-path-content');
      if (!mapContent) return;

      // Crear contenedor de camino si no existe
      let pathContainer = mapContent.querySelector('.level-path-container');
      if (!pathContainer) {
        pathContainer = document.createElement('div');
        pathContainer.className = 'level-path-container';
        pathContainer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1;';
        mapContent.appendChild(pathContainer);
      }
      
      pathContainer.innerHTML = '';

      for (let i = 1; i < 100; i++) {
        const currentPin = document.getElementById(`lvlPin${i}`);
        const nextPin = document.getElementById(`lvlPin${i+1}`);
        
        if (!currentPin || !nextPin) continue;

        const rect1 = currentPin.getBoundingClientRect();
        const rect2 = nextPin.getBoundingClientRect();
        const containerRect = mapContent.getBoundingClientRect();

        const x1 = rect1.left - containerRect.left + rect1.width / 2;
        const y1 = rect1.top - containerRect.top + rect1.height / 2;
        const x2 = rect2.left - containerRect.left + rect2.width / 2;
        const y2 = rect2.top - containerRect.top + rect2.height / 2;

        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const dotsCount = Math.floor(dist / 20); // Un punto cada 20px

        for (let j = 1; j < dotsCount; j++) {
          const dot = document.createElement('div');
          dot.className = 'map-path-dot';
          if (i < unlocked) dot.classList.add('active');
          
          const t = j / dotsCount;
          const dx = x1 + (x2 - x1) * t;
          const dy = y1 + (y2 - y1) * t;
          
          dot.style.left = `${dx}px`;
          dot.style.top = `${dy}px`;
          pathContainer.appendChild(dot);
        }
      }
    }
    
    // Crear o actualizar partículas alrededor de niveles desbloqueados
    function updateLevelParticles() {
      const mapContent = document.querySelector('.map-path-content');
      if (!mapContent) return;
      
      // Crear contenedor de partículas si no existe
      let particlesContainer = mapContent.querySelector('.level-particles-container');
      if (!particlesContainer) {
        particlesContainer = document.createElement('div');
        particlesContainer.className = 'level-particles-container';
        mapContent.appendChild(particlesContainer);
      }
      
      // Limpiar partículas existentes
      particlesContainer.innerHTML = '';
      
      // Crear partículas para cada nivel desbloqueado
      for (let i = 1; i <= Math.min(unlocked, 100); i++) {
        const levelPin = document.getElementById(`lvlPin${i}`);
        if (!levelPin) continue;
        
        // Agregar clase unlocked al pin
        levelPin.classList.add('unlocked');
        
        // Obtener posición del nivel
        const rect = levelPin.getBoundingClientRect();
        const containerRect = mapContent.getBoundingClientRect();
        const top = rect.top - containerRect.top + rect.height / 2;
        const left = rect.left - containerRect.left + rect.width / 2;
        
        // Crear 3-5 partículas por nivel
        const particleCount = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < particleCount; j++) {
          createParticle(particlesContainer, left, top, i, j);
        }
      }
    }
    
    // Crear una partícula individual
    function createParticle(container, centerX, centerY, levelNum, particleIndex) {
      const particle = document.createElement('div');
      
      // Tipos de partículas
      const types = ['star', 'sparkle', 'glow', 'orb'];
      const animations = ['orbit', 'float', 'pulse', 'drift'];
      
      // Seleccionar tipo y animación aleatoriamente
      const type = types[particleIndex % types.length];
      const animation = animations[particleIndex % animations.length];
      
      particle.className = `level-particle ${type} ${animation}`;
      
      // Posicionar en el centro del nivel
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      
      // Variar el radio de órbita según el índice
      const orbitRadius = 30 + (particleIndex * 8);
      particle.style.setProperty('--orbit-radius', `${orbitRadius}px`);
      
      // Variar la dirección de rotación
      const direction = particleIndex % 2 === 0 ? 1 : -1;
      particle.style.setProperty('--direction', direction);
      
      // Retraso aleatorio para cada partícula
      particle.style.animationDelay = `${Math.random() * 4}s`;
      
      // Duración aleatoria
      const duration = 3 + Math.random() * 3;
      particle.style.animationDuration = `${duration}s`;
      
      container.appendChild(particle);
    }
    
    // Recrear partículas cuando se redimensiona la ventana
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateLevelParticles();
        updateLevelWaves();
        updateLevelPath();
      }, 250);
    });
    
    // Crear o actualizar ondas alrededor de niveles desbloqueados
    function updateLevelWaves() {
      const mapContent = document.querySelector('.map-path-content');
      if (!mapContent) return;
      
      // Crear contenedor de ondas si no existe
      let wavesContainer = mapContent.querySelector('.level-waves-container');
      if (!wavesContainer) {
        wavesContainer = document.createElement('div');
        wavesContainer.className = 'level-waves-container';
        mapContent.appendChild(wavesContainer);
      }
      
      // Limpiar ondas existentes
      wavesContainer.innerHTML = '';
      
      // Crear ondas para cada nivel desbloqueado
      for (let i = 1; i <= Math.min(unlocked, 100); i++) {
        const levelPin = document.getElementById(`lvlPin${i}`);
        if (!levelPin) continue;
        
        // Obtener posición del nivel
        const rect = levelPin.getBoundingClientRect();
        const containerRect = mapContent.getBoundingClientRect();
        const top = rect.top - containerRect.top + rect.height / 2;
        const left = rect.left - containerRect.left + rect.width / 2;
        
        // Determinar clase de bloque para color
        const blockClass = `level-block-${Math.ceil(i / 5)}`;
        
        // Crear 3 ondas por nivel con retrasos diferentes
        for (let j = 1; j <= 3; j++) {
          createWave(wavesContainer, left, top, blockClass, j);
        }
      }
    }
    
    // Crear una onda individual
    function createWave(container, centerX, centerY, blockClass, waveIndex) {
      const wave = document.createElement('div');
      wave.className = `level-wave wave-${waveIndex} ${blockClass}`;
      
      // Posicionar en el centro del nivel
      wave.style.left = `${centerX}px`;
      wave.style.top = `${centerY}px`;
      
      // Variar el tamaño inicial según el índice
      const baseSize = 35 + (waveIndex * 5);
      wave.style.width = `${baseSize}px`;
      wave.style.height = `${baseSize}px`;
      
      container.appendChild(wave);
    }

    // Crear o actualizar partículas alrededor de niveles desbloqueados
    function updateLevelParticles() {
      const mapContent = document.querySelector('.map-path-content');
      if (!mapContent) return;
      
      // Crear contenedor de partículas si no existe
      let particlesContainer = mapContent.querySelector('.level-particles-container');
      if (!particlesContainer) {
        particlesContainer = document.createElement('div');
        particlesContainer.className = 'level-particles-container';
        mapContent.appendChild(particlesContainer);
      }
      
      // Limpiar partículas existentes
      particlesContainer.innerHTML = '';
      
      // Crear partículas para cada nivel desbloqueado
      for (let i = 1; i <= Math.min(unlocked, 100); i++) {
        const levelPin = document.getElementById(`lvlPin${i}`);
        if (!levelPin) continue;
        
        // Agregar clase unlocked al pin
        levelPin.classList.add('unlocked');
        
        // Obtener posición del nivel
        const rect = levelPin.getBoundingClientRect();
        const containerRect = mapContent.getBoundingClientRect();
        const top = rect.top - containerRect.top + rect.height / 2;
        const left = rect.left - containerRect.left + rect.width / 2;
        
        // Crear 3-5 partículas por nivel
        const particleCount = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < particleCount; j++) {
          createParticle(particlesContainer, left, top, i, j);
        }
      }
    }
    
    // Crear una partícula individual
    function createParticle(container, centerX, centerY, levelNum, particleIndex) {
      const particle = document.createElement('div');
      
      // Tipos de partículas
      const types = ['star', 'sparkle', 'glow', 'orb'];
      const animations = ['orbit', 'float', 'pulse', 'drift'];
      
      // Seleccionar tipo y animación aleatoriamente
      const type = types[particleIndex % types.length];
      const animation = animations[particleIndex % animations.length];
      
      particle.className = `level-particle ${type} ${animation}`;
      
      // Posicionar en el centro del nivel
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      
      // Variar el radio de órbita según el índice
      const orbitRadius = 30 + (particleIndex * 8);
      particle.style.setProperty('--orbit-radius', `${orbitRadius}px`);
      
      // Variar la dirección de rotación
      const direction = particleIndex % 2 === 0 ? 1 : -1;
      particle.style.setProperty('--direction', direction);
      
      // Retraso aleatorio para cada partícula
      particle.style.animationDelay = `${Math.random() * 4}s`;
      
      // Duración aleatoria
      const duration = 3 + Math.random() * 3;
      particle.style.animationDuration = `${duration}s`;
      
      container.appendChild(particle);
    }

    function shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function resetProgress() {
      let confirmMsg = "¿Reiniciar todo el progreso?";
      if (lang === "en") confirmMsg = "Reset all progress?";
      if (lang === "qu") confirmMsg = "¿Tukuy nivelta kutichiyta munankichu?";
      if (confirm(confirmMsg)) {
        localStorage.removeItem('unlocked');
        localStorage.removeItem('coins');
        localStorage.removeItem('levelStars');
        localStorage.removeItem('survivalHighScore');
        unlocked = 1;
        coins = 0;
        levelStars = {};
        survivalHighScore = 0;
        usedQuestionIndices.clear();
        updateLocks();
        for (let i = 2; i <= 100; i++) {
          let el = document.getElementById("lvl" + i);
          let lockEl = document.getElementById("lock" + i);
          if (el) el.classList.add("locked");
          if (el) el.onclick = null;
          if (lockEl) lockEl.style.display = "flex";
        }
        highlightCurrentLevel();
        showLevelPreview(1);
      }
    }

    function nextLevel() {
      if (level < 100) startLevel(level + 1);
      else show("map");
    }

    function retryLevel() {
      startLevel(level);
    }

    function exitQuiz() {
      clearInterval(timer);
      clearLevelVisualTheme();
      
      // Stop clock sound and resume background music when exiting
      let clockAudio = document.getElementById("clockAudio");
      let bgAudio = document.getElementById("bgMusic");
      if (clockAudio && !clockAudio.paused) {
        clockAudio.pause();
        clockAudio.currentTime = 0;
      }
      if (bgAudio && bgAudio.paused && musicStarted) {
        bgAudio.play().catch(e => {});
      }
      
      if (isCategoryMode) {
        isCategoryMode = false;
        show('categories');
      } else if (isSurvival) {
        show('home');
      } else {
        show('map');
      }
    }

    function applyLevelVisualTheme(levelNum) {
      const body = document.body;
      // Remove all possible level theme classes before applying new one (assuming 20 blocks of 5 levels)
      for (let i = 1; i <= 20; i++) body.classList.remove(`level-theme-${i}`);
      const theme = getLevelTheme(levelNum);
      if (!theme) return;
      body.classList.add(theme.bgClass);
      updateFloatingDecor(theme.icons, theme.floaters);
    }

    function clearLevelVisualTheme() {
      const body = document.body;
      for (let i = 1; i <= 20; i++) body.classList.remove(`level-theme-${i}`);
      updateFloatingDecor(defaultBgIcons, ["📜", "🕊️", "⭐", "🪔", "📖", "🌿"]);
    }

    function updateFloatingDecor(iconSet, floaterSet) {
      const bgIcons = document.querySelectorAll(".global-bg-icons .bg-icon");
      bgIcons.forEach((icon, idx) => {
        icon.textContent = iconSet[idx] || defaultBgIcons[idx] || "✨";
      });

      const floaters = document.querySelectorAll(".level-floaters .level-floater");
      floaters.forEach((floater, idx) => {
        floater.textContent = floaterSet[idx] || "✨";
      });
    }

    /* Confetti tipo globo reventado – fuegos artificiales rápidos */
    const CONFETTI_COLORS = [
      '#FF4DA6', '#FF1493', '#FF6B35', '#FFB300', '#FFE600',
      '#A8FF3E', '#00FF88', '#00CFFF', '#007BFF', '#CC44FF',
      '#FF69B4', '#FF0055', '#00FFD2', '#FFAA00', '#FF3D00'
    ];

    function spawnBurst(cx, cy) {
      const container = document.getElementById('confetti');
      const PAPERS = lowPerfMode ? 28 : 55;   // serpentinas rectangulares
      const DOTS = lowPerfMode ? 16 : 35;   // puntos redondos

      /* destello central */
      const flash = document.createElement('div');
      flash.style.cssText = `
    position:absolute;
    left:${cx}px; top:${cy}px;
    width:18px; height:18px;
    border-radius:50%;
    background:radial-gradient(circle, #fff 0%, rgba(255,255,200,0) 70%);
    transform:translate(-50%,-50%);
    animation: flash-pop 0.28s ease-out forwards;
    pointer-events:none;
  `;
      container.appendChild(flash);
      setTimeout(() => flash.remove(), 300);

      /* papelitos rectangulares */
      for (let i = 0; i < PAPERS; i++) {
        const piece = document.createElement('div');
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const angle = (Math.random() * 360) * Math.PI / 180;
        const speed = 80 + Math.random() * 260;       // px
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - (Math.random() * 80); // arco hacia arriba
        const r0 = Math.random() * 360;
        const r1 = r0 + (Math.random() * 520 - 260);
        const flip = Math.random() > 0.5 ? 1 : -1;
        const w = 5 + Math.random() * 8;   // 5–13 px
        const h = 3 + Math.random() * 5;   // 3–8 px
        const dur = 0.45 + Math.random() * 0.35; // 0.45–0.80 s  ← RÁPIDO

        piece.style.cssText = `
      position:absolute;
      left:${cx}px; top:${cy}px;
      width:${w}px; height:${h}px;
      background:${color};
      border-radius:2px;
      transform-origin:center center;
      --vx:${vx}px; --vy:${vy}px;
      --r0:${r0}deg; --r1:${r1}deg;
      --flip:${flip};
      animation: paper-fly ${dur}s cubic-bezier(0.15,0.85,0.35,1) forwards;
      pointer-events:none;
    `;
        container.appendChild(piece);
        setTimeout(() => piece.remove(), dur * 1000 + 50);
      }

      /* puntos redondos */
      for (let i = 0; i < DOTS; i++) {
        const dot = document.createElement('div');
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const angle = (Math.random() * 360) * Math.PI / 180;
        const speed = 60 + Math.random() * 220;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - Math.random() * 70;
        const size = 4 + Math.random() * 7;
        const dur = 0.40 + Math.random() * 0.30;

        dot.style.cssText = `
      position:absolute;
      left:${cx}px; top:${cy}px;
      width:${size}px; height:${size}px;
      background:${color};
      border-radius:50%;
      --vx:${vx}px; --vy:${vy}px;
      animation: dot-fly ${dur}s cubic-bezier(0.1,0.9,0.3,1) forwards;
      pointer-events:none;
    `;
        container.appendChild(dot);
        setTimeout(() => dot.remove(), dur * 1000 + 50);
      }
    }

    function showConfetti(startX = 50, startY = 50) {
      /* Convertir % a px relativos a ventana */
      const cx = (startX / 100) * window.innerWidth;
      const cy = (startY / 100) * window.innerHeight;
      spawnBurst(cx, cy);
    }

    let activeCuetes = [];
    function playCuete() {
      let original = document.getElementById("cueteAudio");
      if (original) {
        let a = original.cloneNode();
        a.volume = parseFloat(document.getElementById("volume").value) || 0.5;
        
        activeCuetes.push(a);
        a.addEventListener("ended", () => {
          let idx = activeCuetes.indexOf(a);
          if (idx !== -1) activeCuetes.splice(idx, 1);
        });

        a.play().catch(e => {});
      }
    }

    function stopAllCuetes() {
      activeCuetes.forEach(a => {
        a.pause();
        a.currentTime = 0;
      });
      activeCuetes = [];
    }

    let isConfettiActive = false;
    function showMultipleConfetti() {
      /* Serie de explosiones como fuegos artificiales – muy rápidas */
      const positions = [
        { x: 50, y: 35 },
        { x: 20, y: 25 }, { x: 80, y: 25 },
        { x: 30, y: 55 }, { x: 70, y: 55 },
        { x: 50, y: 70 },
        { x: 15, y: 45 }, { x: 85, y: 45 },
      ];
      positions.forEach((pos, i) => {
        setTimeout(() => {
          if (!isConfettiActive) return;
          showConfetti(pos.x, pos.y);
          playCuete();
        }, i * 160); // ← disparos cada 160 ms
      });
    }

    let confettiInterval = null;
    function startContinuousConfetti() {
      if (typeof stopContinuousConfetti === "function") stopContinuousConfetti();
      isConfettiActive = true;
      showMultipleConfetti(); // First burst pattern
      confettiInterval = setInterval(() => {
        if (!isConfettiActive) return;
        const rx = 10 + Math.random() * 80; // 10% to 90%
        const ry = 10 + Math.random() * 60; // 10% to 70%
        showConfetti(rx, ry);
        playCuete();
      }, 400); // one burst every 400ms
    }

    function stopContinuousConfetti() {
      isConfettiActive = false;
      if (confettiInterval) {
        clearInterval(confettiInterval);
        confettiInterval = null;
      }
      if (typeof stopAllCuetes === 'function') stopAllCuetes();
    }

    /* ===== TEMA (modo oscuro desactivado) ===== */
    let darkMode = false;

    function applyTheme() {
      // Forzar siempre modo claro
      document.documentElement.classList.remove('dark');
      darkMode = false;
    }

    function toggleTheme() {
      applyTheme();
    }

    // Inicializar variable musical antes de llamar a show()
    let musicStarted = false;

    const dailyTexts = [
      { text: "No tengas miedo, porque estoy contigo. No te angusties, porque yo soy tu Dios. Yo te daré fuerzas. Sí, yo te ayudaré; con mi mano derecha de justicia de veras te sostendré.", ref: "Isaías 41:10" },
      { text: "Confía en Jehová con todo tu corazón y no te apoyes en tu propio entendimiento. Tenlo presente en todos tus caminos, y él hará derechas tus sendas.", ref: "Proverbios 3:5, 6" },
      { text: "Tengo fuerzas para todo gracias a aquel que me da poder.", ref: "Filipenses 4:13" },
      { text: "Arroja tu carga sobre Jehová, y él te sostendrá. Jamás permitirá que el justo caiga.", ref: "Salmo 55:22" },
      { text: "¿Acaso no te he ordenado yo que seas fuerte y valiente? No te aterrorices ni tengas miedo, porque Jehová tu Dios estará contigo vayas donde vayas.", ref: "Josué 1:9" },
      { text: "Mientras echan todas sus inquietudes sobre él, porque él se preocupa por ustedes.", ref: "1 Pedro 5:7" },
      { text: "Porque sé muy bien lo que tengo en mente para ustedes —afirma Jehová—. Quiero que tengan paz, no calamidad. Quiero darles un futuro y una esperanza.", ref: "Jeremías 29:11" },
      { text: "Sabemos que Dios hace que todas sus obras cooperen para el bien de los que lo aman...", ref: "Romanos 8:28" },
      { text: "Dios es nuestro refugio y nuestra fuerza, una ayuda siempre disponible en tiempos de angustia.", ref: "Salmo 46:1" },
      { text: "Él le da poder al cansado y llena de vigor al que está sin fuerzas.", ref: "Isaías 40:29" },
      { text: "Pero los que esperan en Jehová recobrarán las fuerzas. Levantarán el vuelo como si tuvieran alas de águila. Correrán y no se agotarán...", ref: "Isaías 40:31" },
      { text: "Jehová será un refugio seguro para el oprimido, un refugio seguro en tiempos de angustia.", ref: "Salmo 9:9" },
      { text: "Jehová está cerca de los que tienen el corazón destrozado; salva a los que están hundidos en el desánimo.", ref: "Salmo 34:18" },
      { text: "Jehová es mi luz y mi salvación. ¿De quién voy a tener miedo? Jehová es la fortaleza de mi vida. ¿De quién voy a sentir terror?", ref: "Salmo 27:1" },
      { text: "Que el Dios que da esperanza los llene de toda alegría y paz por la confianza que tienen en él, para que su esperanza abunde...", ref: "Romanos 15:13" },
      { text: "Por eso, podemos decir llenos de valor: “Jehová es mi ayudante; no tendré miedo. ¿Qué puede hacerme el hombre?”", ref: "Hebreos 13:6" },
      { text: "Alzaré mis ojos a las montañas. ¿De dónde vendrá mi ayuda? Mi ayuda viene de Jehová, el Creador del cielo y de la tierra.", ref: "Salmo 121:1, 2" },
      { text: "Vengan a mí, todos los que están cansados y llevan cargas pesadas, y yo los aliviaré.", ref: "Mateo 11:28" },
      { text: "Le diré a Jehová: “Tú eres mi refugio y mi fortaleza, mi Dios, en quien confío”.", ref: "Salmo 91:2" },
      { text: "Alabado sea el Dios y Padre... que nos consuela en todas nuestras pruebas...", ref: "2 Corintios 1:3, 4" },
      { text: "Aunque ande por el valle de profunda sombra, no temeré ningún mal, porque tú estás conmigo; tu vara y tu bastón me dan seguridad.", ref: "Salmo 23:4" },
      { text: "Les dejo la paz; les doy mi paz... No dejen que sus corazones se angustien ni se encojan de miedo.", ref: "Juan 14:27" },
      { text: "Jehová tu Dios está en medio de ti. Como un poderoso, él te salvará. Se alegrará mucho por ti.", ref: "Sofonías 3:17" },
      { text: "Porque estoy convencido de que ni muerte ni vida... ni altura ni profundidad ni ninguna otra creación podrá separarnos del amor de Dios.", ref: "Romanos 8:38, 39" },
      { text: "Tema a Jehová y sírvale fielmente con todo su corazón; fíjese en todo lo que él ha hecho por usted.", ref: "1 Samuel 12:24" },
      { text: "Pon tu camino en las manos de Jehová; confía en él, y él actuará en tu favor.", ref: "Salmo 37:5" },
      { text: "Aunque caiga, no se quedará en el suelo, porque Jehová lo sostiene de la mano.", ref: "Salmo 37:24" },
      { text: "El nombre de Jehová es una torre fuerte. El justo corre hacia ella y recibe protección.", ref: "Proverbios 18:10" },
      { text: "Tú protegerás a los que se apoyan por completo en ti; les darás una paz continua, porque en ti confían.", ref: "Isaías 26:3" },
      { text: "Cuando pases por las aguas, yo estaré contigo; y, cuando cruces los ríos, no te ahogarán... porque yo soy Jehová tu Dios.", ref: "Isaías 43:2" },
      { text: "Gracias al amor leal de Jehová no hemos sido eliminados, porque sus muestras de compasión nunca se agotan. Son nuevas cada mañana.", ref: "Lamentaciones 3:22, 23" },
      { text: "Pero yo me mantendré pendiente de Jehová. Rebosaré de esperanza en el Dios de mi salvación. Mi Dios me escuchará.", ref: "Miqueas 7:7" },
      { text: "Porque Dios no nos dio un espíritu de cobardía, sino de poder, de amor y de buen juicio.", ref: "2 Timoteo 1:7" },
      { text: "Ustedes necesitan aguante para que, después de haber hecho la voluntad de Dios, reciban lo que él ha prometido.", ref: "Hebreos 10:36" },
      { text: "Y les secará toda lágrima de sus ojos, y la muerte ya no existirá, ni habrá más tristeza ni llanto ni dolor. Las cosas anteriores han desaparecido.", ref: "Apocalipsis 21:4" }
    ];

    function loadDailyText() {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now - start;
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      
      const index = dayOfYear % dailyTexts.length;
      const verse = dailyTexts[index];
      
      const bodyEl = document.getElementById("dailyTextBody");
      const refEl = document.getElementById("dailyTextRef");
      if (bodyEl && refEl) {
        bodyEl.innerText = '"' + verse.text + '"';
        refEl.innerText = "- " + verse.ref;
      }
    }

    /* ===== PREMIUM FEATURES LOGIC ===== */
    const storeItems = [
      { id: 'classic', name: 'Tema Clásico ✨', price: 0, desc: 'El estilo original (gratis).' },
      { id: 'sunset', name: 'Tema Atardecer 🌅', price: 120, desc: 'Cálido y alegre, como un cuento.' },
      { id: 'mint', name: 'Tema Menta 🍃', price: 160, desc: 'Fresco, suave y relajante.' },
      { id: 'forest', name: 'Tema Bosque 🌲', price: 200, desc: 'Verdor y paz.' },
      { id: 'candy', name: 'Tema Caramelos 🍭', price: 260, desc: 'Más colores y brillo divertido.' },
      { id: 'ocean', name: 'Tema Océano 🌊', price: 320, desc: 'Aguas profundas.' },
      { id: 'space', name: 'Tema Espacio 🚀', price: 520, desc: 'Estrellas, brillo y contraste gamer.' },
      { id: 'royal', name: 'Tema Real 👑', price: 720, desc: 'Dorado premium y look elegante.' },
      { id: 'neon', name: 'Tema Neón 💎', price: 900, desc: 'Luces intensas y energía arcade.' },
      { id: 'angel', name: 'Tema Cielo ☁️', price: 1200, desc: 'Ultra premium: cielo, brillo y magia.' }
    ];

    const allAchievements = [
      { id: 'a1', icon: '🧠', title: 'Erudito Básico', desc: 'Responde 20 correctas.', req: () => stats.correct >= 20 },
      { id: 'a2', icon: '🔥', title: 'Racha Imparable', desc: 'Alcanza una racha de x5.', req: () => stats.maxCombo >= 5 },
      { id: 'a3', icon: '🔥', title: 'Superviviente Nato', desc: 'Alcanza 15 pts en Supervivencia.', req: () => survivalHighScore >= 15 },
      { id: 'a4', icon: '🛍️', title: 'Decorador', desc: 'Compra un tema en la Tienda.', req: () => Object.values(inventory || {}).some(Boolean) }
    ];

    function savePremiumData() {
      localStorage.setItem('stats', JSON.stringify(stats));
      localStorage.setItem('achievements', JSON.stringify(achievements));
      localStorage.setItem('inventory', JSON.stringify(inventory));
    }

    function checkAchievements() {
      let newlyUnlocked = false;
      allAchievements.forEach(a => {
        if (!achievements[a.id] && a.req()) {
          achievements[a.id] = true;
          newlyUnlocked = true;
        }
      });
      if(newlyUnlocked) savePremiumData();
    }

    function renderShop() {
      document.getElementById("shopCoins").innerText = coins;
      let html = '';
      storeItems.forEach(item => {
        let owned = item.id === 'classic' ? true : !!inventory[item.id];
        let cantAfford = coins < item.price;
        let btnHtml = owned 
          ? `<button class="btn btn-ghost" onclick="equipTheme('${item.id}')">✨ Usar</button>`
          : `<button class="btn btn-gold" ${cantAfford ? 'disabled style="opacity:0.5"' : ''} onclick="buyItem('${item.id}', ${item.price})">💰 ${item.price}</button>`;
          
        html += `
          <div class="shop-item">
            <div class="shop-details">
              <h4>${item.name}</h4>
              <p>${item.desc}</p>
            </div>
            ${btnHtml}
          </div>
        `;
      });
      document.getElementById("shopContainer").innerHTML = html;
    }

    function buyItem(id, price) {
      if (id === 'classic') return;
      if (coins >= price) {
        let snd = document.getElementById("correctAudio");
        snd.currentTime = 0; snd.play().catch(()=>{});
        coins -= price;
        localStorage.setItem('coins', coins);
        inventory[id] = true;
        savePremiumData();
        checkAchievements();
        renderShop();
      }
    }

    function equipTheme(id) {
      document.documentElement.className = ''; 
      if(darkMode) document.documentElement.classList.add('dark');
      if(id === 'forest') document.documentElement.classList.add('theme-forest');
      if(id === 'ocean') document.documentElement.classList.add('theme-ocean');
      if(id === 'sunset') document.documentElement.classList.add('theme-sunset');
      if(id === 'mint') document.documentElement.classList.add('theme-mint');
      if(id === 'candy') document.documentElement.classList.add('theme-candy');
      if(id === 'space') document.documentElement.classList.add('theme-space');
      if(id === 'royal') document.documentElement.classList.add('theme-royal');
      if(id === 'neon') document.documentElement.classList.add('theme-neon');
      if(id === 'angel') document.documentElement.classList.add('theme-angel');
    }

    function renderAchievements() {
      let html = '';
      allAchievements.forEach(a => {
        let unlocked = achievements[a.id];
        html += `
          <div class="achievement-item ${unlocked ? 'unlocked' : ''}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="shop-details">
              <h4>${a.title}</h4>
              <p>${a.desc}</p>
            </div>
          </div>
        `;
      });
      document.getElementById("achievementsContainer").innerHTML = html;
    }

    function renderStats() {
      let acc = stats.answered > 0 ? Math.floor((stats.correct / stats.answered) * 100) : 0;
      document.getElementById("statsContainer").innerHTML = `
        <div class="stat-card">
          <div class="stat-val">${stats.answered}</div>
          <div class="stat-title">Respondidas</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${stats.correct}</div>
          <div class="stat-title">Correctas</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${acc}%</div>
          <div class="stat-title">Precisión</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${stats.maxCombo}</div>
          <div class="stat-title">Racha Máx</div>
        </div>
      `;
    }

    function checkDailyReward() {
      const today = new Date().toISOString().split('T')[0];
      if (lastDailyClaim !== today) {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        let yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDailyClaim === yesterdayStr) dailyStreak++;
        else dailyStreak = 1;

        let reward = 10 + (Math.min(dailyStreak, 7) * 2);
        document.getElementById("dailyRewardAmount").innerText = reward;
        let text = "🔥 Racha: " + dailyStreak + (dailyStreak > 1 ? " días" : " día");
        if (lang === "en") text = "🔥 Streak: " + dailyStreak + (dailyStreak > 1 ? " days" : " day");
        if (lang === "qu") text = "🔥 Racha: " + dailyStreak + (dailyStreak > 1 ? " p'unchaykuna" : " p'unchay");
        document.getElementById("dailyStreakText").innerText = text;
        document.getElementById("dailyModal").style.display = "flex";
        
        window.pendingDailyReward = reward;
      }
    }

    function claimDailyReward() {
      const today = new Date().toISOString().split('T')[0];
      lastDailyClaim = today;
      localStorage.setItem('lastDailyClaim', lastDailyClaim);
      localStorage.setItem('dailyStreak', dailyStreak);
      
      coins += window.pendingDailyReward || 10;
      localStorage.setItem('coins', coins);
      
      document.getElementById("dailyModal").style.display = "none";
      updateLocks(); 
      let correctSnd = document.getElementById("correctAudio");
      correctSnd.currentTime = 0;
      correctSnd.play().catch(e => {});
      showConfetti();
    }

    function showDailyReward() {
      const modal = document.getElementById("dailyModal");
      if (modal) {
        // Calculate current reward based on streak
        let reward = 10 + (Math.min(dailyStreak, 7) * 2);
        document.getElementById("dailyRewardAmount").innerText = reward;
        document.getElementById("dailyStreakText").innerText = "🔥 Racha: " + dailyStreak + (dailyStreak>1?" días":" día");
        window.pendingDailyReward = reward;
        modal.style.display = "flex";
      }
    }

    let musicMuted = false;
    function toggleMusic() {
      let bgMusic = document.getElementById("bgMusic");
      if (!bgMusic) return;
      
      if (musicMuted) {
        bgMusic.muted = false;
        musicMuted = false;
        if (musicStarted) bgMusic.play().catch(e => {});
      } else {
        bgMusic.muted = true;
        musicMuted = true;
        bgMusic.pause();
      }
    }

    detectPerformanceMode();
    applyTheme();
    updateHomeTexts();
    updateLifelineLabels();
    const savedVolume = parseFloat(localStorage.getItem('volume'));
    const volumeInput = document.getElementById("volume");
    if (volumeInput && !Number.isNaN(savedVolume)) {
      volumeInput.value = savedVolume;
    }
    updateVolume(volumeInput ? volumeInput.value : 0.5);
    clearLevelVisualTheme();
    show("home");
    updateLocks();
    loadDailyText();
    checkDailyReward();
    preloadCoreAssets().then(() => {
      initOnboarding();
      showTutorial();
      startBgMusicManual(); // Iniciar música automáticamente
    });
    updateGiftUI();
    setInterval(updateGiftUI, 1000);
    function startBgMusicManual() {
      let bgMusic = document.getElementById("bgMusic");
      if (!bgMusic) {
        console.log("No se encontró el audio bgMusic");
        return;
      }
      
      console.log("Preparando música de fondo");
      
      // Preparar el audio
      bgMusic.muted = false;
      bgMusic.loop = true;
      bgMusic.load(); // Cargar el audio
      
      // Agregar listeners para iniciar música tras interacción
      const tryPlay = () => {
        console.log("Intentando reproducir música tras interacción");
        bgMusic.volume = 0.5; // Forzar volumen audible
        bgMusic.play().then(() => {
          musicStarted = true;
          musicMuted = false;
          console.log("Música iniciada exitosamente tras interacción");
          document.removeEventListener('click', tryPlay);
          document.removeEventListener('touchstart', tryPlay);
          document.removeEventListener('mousedown', tryPlay);
        }).catch(err => console.log("Error al reproducir:", err.message));
      };
      
      document.addEventListener('click', tryPlay);
      document.addEventListener('touchstart', tryPlay);
      document.addEventListener('mousedown', tryPlay);
      console.log("Listeners de música agregados");
    }

    function startBgMusic() {
      let bgMusic = document.getElementById("bgMusic");
      if (!bgMusic) {
        console.log("bgMusic element not found!");
        return;
      }

      // Si ya está reproduciéndose, no hacer nada
      if (!bgMusic.paused && musicStarted) {
        console.log("Music already playing");
        return;
      }

      console.log("Trying to start background music...");
      console.log("Audio src:", bgMusic.src);
      console.log("Audio readyState:", bgMusic.readyState);
      console.log("Audio paused:", bgMusic.paused);
      console.log("Audio muted:", bgMusic.muted);
      console.log("Audio volume:", bgMusic.volume);
      console.log("musicStarted:", musicStarted);
      console.log("soundMuted:", soundMuted);

      // Asegurar que el volumen sea el correcto (del slider o localStorage o 0.5 por defecto)
      const volumeSlider = document.getElementById("volume");
      const savedVolume = parseFloat(localStorage.getItem('volume'));
      const targetVolume = volumeSlider ? parseFloat(volumeSlider.value) : (savedVolume || 0.5);
      bgMusic.volume = targetVolume > 0 ? targetVolume : 0.5;
      bgMusic.muted = false;
      bgMusic.loop = true;

      // Función para intentar reproducir
      const tryPlay = () => {
        console.log("Attempting to play...");
        let playPromise = bgMusic.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            musicStarted = true;
            console.log("Background music started successfully!");
            // Remover todos los listeners de inicio
            document.removeEventListener("click", startBgMusic);
            document.removeEventListener("touchstart", startBgMusic);
            document.removeEventListener("keydown", startBgMusic);
            document.removeEventListener("click", handleFirstInteraction);
            document.removeEventListener("touchstart", handleFirstInteraction);
            document.removeEventListener("keydown", handleFirstInteraction);
          }).catch(e => {
            console.log("Audio play failed:", e.message);
            // No es un error fatal - esperar próxima interacción del usuario
          });
        }
      };

      // Si el audio no está listo, esperar
      if (bgMusic.readyState < 2) {
        console.log("Audio not ready, waiting for canplay...");
        const onCanPlay = () => {
          console.log("Audio can play now!");
          bgMusic.removeEventListener('canplaythrough', onCanPlay);
          bgMusic.removeEventListener('canplay', onCanPlay);
          tryPlay();
        };
        bgMusic.addEventListener('canplaythrough', onCanPlay, { once: true });
        bgMusic.addEventListener('canplay', onCanPlay, { once: true });
        // Forzar carga del audio
        bgMusic.load();
        return;
      }

      tryPlay();
    }

    // Intentar automáticamente después de cargar recursos (con retry)
    let musicRetryCount = 0;
    const maxMusicRetries = 3;

    function attemptStartMusic() {
      if (musicStarted) return;
      if (musicRetryCount < maxMusicRetries) {
        console.log("Music attempt #", musicRetryCount + 1);
        startBgMusic();
        musicRetryCount++;
        setTimeout(attemptStartMusic, 1000);
      }
    }

    setTimeout(attemptStartMusic, 500);

    // Si el navegador bloquea el autoplay, se iniciará al primer tap/clic en cualquier lado
    function handleFirstInteraction(e) {
      console.log("First interaction detected:", e.type);
      startBgMusic();
    }

    document.addEventListener("click", handleFirstInteraction, { once: true });
    document.addEventListener("touchstart", handleFirstInteraction, { once: true });
    document.addEventListener("keydown", handleFirstInteraction, { once: true });

    // También escuchar clics continuamente como respaldo
    document.addEventListener("click", startBgMusic);
    document.addEventListener("touchstart", startBgMusic);
    document.addEventListener("keydown", startBgMusic);

    // Función para reproducir sonido pop al hacer clic en botones de navegación
    function playPopSound() {
      console.log('playPopSound llamado, soundMuted:', soundMuted);
      if (soundMuted) {
        console.log('Sonido muteado, no se reproduce');
        return;
      }
      let popAudio = document.getElementById("popAudio");
      console.log('popAudio existe:', !!popAudio);
      if (popAudio) {
        popAudio.currentTime = 0;
        let volume = parseFloat(document.getElementById("volume")?.value) || 0.5;
        popAudio.volume = volume;
        console.log('Reproduciendo pop.mp3 con volumen:', volume);
        popAudio.play().catch(e => {
          console.error('Error al reproducir pop.mp3:', e);
        });
      } else {
        console.error('No se encontró el elemento popAudio');
      }
    }

    // Agregar sonido pop a todos los botones de navegación (excluyendo botones de respuestas y sección de niveles)
    document.addEventListener("click", function(e) {
      // Verificar si el clic fue en un botón
      let btn = e.target.closest("button");
      if (!btn) return;

      console.log('Click en botón detectado:', btn.textContent, 'clases:', btn.className);

      // Excluir botones de respuestas (tienen clase .opt)
      if (btn.classList.contains("opt")) {
        console.log('Botón excluido: es opción de respuesta');
        return;
      }

      // Excluir botones que ya tienen su propio sonido (correct/wrong)
      if (btn.id === "fiftyBtn" || btn.id === "timeBtn" || btn.id === "hintBtn" || btn.id === "skipBtn") {
        console.log('Botón excluido: es comodín');
        return;
      }

      // Excluir botones en la sección de niveles (mapa)
      if (btn.closest("#map")) {
        console.log('Botón excluido: está en sección de niveles');
        return;
      }

      console.log('Reproduciendo sonido pop...');
      // Reproducir sonido pop
      playPopSound();
    });

    // TEST: Función para verificar que todo esté funcionando (disponible en consola)
    window.testLevel1 = function() {
      console.log('=== TEST NIVEL 1 ===');
      console.log('lvl1 existe:', !!document.getElementById('lvl1'));
      console.log('lvlPin1 existe:', !!document.getElementById('lvlPin1'));
      console.log('startLevel existe:', typeof startLevel === 'function');
      console.log('unlocked:', unlocked);
      console.log('Preguntas cargadas:', getQuestionBank().length);
    };

    // Initialize cached elements
    initGiftElements();

    // Register Service Worker for PWA functionality
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registrado con éxito:', registration.scope);
          })
          .catch(error => {
            console.log('Error al registrar Service Worker:', error);
          });
      });
    }

    // Request notification permission for gift reminders
    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Permiso de notificaciones concedido');
          }
        });
      }
    }
