// Entry point for Flags Quiz PWA
// Game logic will be implemented here

// Show progress bar while loading assets
function showProgressBar() {
  let bar = document.createElement('div');
  bar.id = 'progress-bar';
  bar.style.position = 'absolute';
  bar.style.top = '50%';
  bar.style.left = '50%';
  bar.style.transform = 'translate(-50%, -50%)';
  bar.style.width = '200px';
  bar.style.height = '8px';
  bar.style.background = '#e0e0e0';
  bar.style.borderRadius = '4px';
  bar.style.overflow = 'hidden';
  bar.innerHTML = '<div style="width:0%;height:100%;background:#1976d2;transition:width 0.3s;" id="progress-bar-inner"></div>';
  document.body.appendChild(bar);
}

function updateProgressBar(percent) {
  const inner = document.getElementById('progress-bar-inner');
  if (inner) inner.style.width = percent + '%';
}

function hideProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (bar) bar.remove();
}

async function loadAsset(url, onProgress) {
  // Fetch with progress (for images)
  if (url.endsWith('.png')) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onprogress = function (e) {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = function () {
        if (xhr.status === 200) {
          const img = new Image();
          img.src = URL.createObjectURL(xhr.response);
          img.onload = () => resolve(img);
        } else {
          reject(new Error('Failed to load image: ' + url));
        }
      };
      xhr.onerror = function () {
        reject(new Error('Network error'));
      };
      xhr.send();
    });
  } else {
    // For JSON, just fetch
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to load ' + url);
    return await resp.json();
  }
}

async function loadAssets() {
  showProgressBar();
  let progress = 0;
  updateProgressBar(progress);
  // Загружаем JSON
  const flagsJson = await loadAsset('assets/flags.json');
  progress = 30;
  updateProgressBar(progress);
  // Загружаем PNG с прогрессом
  const flagsImg = await loadAsset('assets/flags.png', p => {
    updateProgressBar(30 + Math.round(p * 0.7));
  });
  updateProgressBar(100);
  setTimeout(() => {
    hideProgressBar();
    document.getElementById('game-container').classList.add('visible');
  }, 300);
  return { flagsJson, flagsImg };
}

let flagsData = null;
let flagsImg = null;
let currentLang = 'ru';
let currentScore = 0;
let bestScore = 0;
let currentQuestion = null;
let questionIndex = 0;

function getBestScore() {
  return parseInt(localStorage.getItem('flags_quiz_best_score') || '0', 10);
}
function setBestScore(score) {
  localStorage.setItem('flags_quiz_best_score', score);
}

function getCurrentLang() {
  const select = document.getElementById('lang-select');
  return select ? select.value : 'ru';
}

function pickRandomQuestion() {
  // Выбираем тип вопроса: 0 — страна→флаг, 1 — флаг→страна
  const type = Math.random() < 0.5 ? 0 : 1;
  if (questionIndex >= flagsData.length) {
    questionIndex = 0;
    shuffle(flagsData);
  } else {
    questionIndex = questionIndex + 1;
  }
  const idx = questionIndex + 1;
  const correct = flagsData[idx];
  const others = [];
  const used = new Set([idx]);
  while (others.length < 3) {
    const i = Math.floor(Math.random() * flagsData.length);
    if (!used.has(i)) {
      others.push(flagsData[i]);
      used.add(i);
    }
  }
  // Перемешиваем правильный и неправильные
  const options = others.concat([correct]);
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { correct, options, type };
}

function renderQuestion(questionObj) {
  const container = document.getElementById('game-container');
  // Очищаем всё кроме select
  Array.from(container.children).forEach(child => {
    if (child.id !== 'lang-select') container.removeChild(child);
  });

  const lang = getCurrentLang();
  const { correct, options, type } = questionObj || pickRandomQuestion();
  if (!questionObj) currentQuestion = { correct, options, type };

  // Обертка для вопроса и вариантов
  const qaWrap = document.createElement('div');
  qaWrap.style.display = 'flex';
  qaWrap.style.flexDirection = 'column';
  qaWrap.style.alignItems = 'center';
  qaWrap.style.width = '100%';

  if (type === 0) {
    // Тип 0: страна → флаг
    const q = document.createElement('div');
    q.className = 'quiz-question';
    q.textContent = `${correct.name[lang] || correct.name['en']}`;
    qaWrap.appendChild(q);

    // Варианты (флаги)
    const opts = document.createElement('div');
    opts.style.display = 'grid';
    opts.style.gridTemplateColumns = '1fr 1fr';
    opts.style.gridTemplateRows = '1fr 1fr';
    opts.style.gap = '16px';
    opts.style.margin = '24px auto 32px auto';
    opts.style.justifyItems = 'center';
    opts.style.alignItems = 'center';
    opts.style.width = 'auto';
    opts.style.maxWidth = '';

    options.forEach(opt => {
      const origW = opt.img.right - opt.img.left;
      const origH = opt.img.bottom - opt.img.top;
      const minW = 10, minH = 10;
      const maxW = 150, maxH = 100;
      let drawW = maxW, drawH = maxH;
      const ratio = origW / origH;
      if (drawW / drawH > ratio) {
        drawW = Math.round(drawH * ratio);
      } else {
        drawH = Math.round(drawW / ratio);
      }
      drawW = Math.max(drawW, minW);
      drawH = Math.max(drawH, minH);
      const canvas = document.createElement('canvas');
      canvas.width = origW;
      canvas.height = origH;
      canvas.style.width = drawW + 'px';
      canvas.style.height = drawH + 'px';
      canvas.style.border = '2px solid transparent';
      canvas.style.borderRadius = '8px';
      canvas.style.cursor = 'pointer';
      canvas.className = 'flag-option';
      const ctx = canvas.getContext('2d');
      ctx.drawImage(flagsImg, opt.img.left, opt.img.top, origW, origH, 0, 0, origW, origH);
      opts.appendChild(canvas);
      canvas.addEventListener('click', () => handleAnswer(opt, correct, canvas, opts, options, type));
    });
    qaWrap.appendChild(opts);
  } else {
    // Тип 1: флаг → страна
    const flagWrap = document.createElement('div');
    flagWrap.style.display = 'flex';
    flagWrap.style.justifyContent = 'center';
    flagWrap.style.alignItems = 'center';
    flagWrap.style.margin = '32px auto 24px auto';
    // Показываем флаг вопроса
    const origW = correct.img.right - correct.img.left;
    const origH = correct.img.bottom - correct.img.top;
    const minW = 10, minH = 10;
    const maxW = 200, maxH = 150;
    let drawW = maxW, drawH = maxH;
    const ratio = origW / origH;
    if (drawW / drawH > ratio) {
      drawW = Math.round(drawH * ratio);
    } else {
      drawH = Math.round(drawW / ratio);
    }
    drawW = Math.max(drawW, minW);
    drawH = Math.max(drawH, minH);
    const canvas = document.createElement('canvas');
    canvas.width = origW;
    canvas.height = origH;
    canvas.style.width = drawW + 'px';
    canvas.style.height = drawH + 'px';
    canvas.style.borderRadius = '8px';
    canvas.className = 'flag-option';
    const ctx = canvas.getContext('2d');
    ctx.drawImage(flagsImg, correct.img.left, correct.img.top, origW, origH, 0, 0, origW, origH);
    flagWrap.appendChild(canvas);
    qaWrap.appendChild(flagWrap);

    // Варианты (названия)
    const opts = document.createElement('div');
    opts.style.display = 'grid';
    opts.style.gridTemplateColumns = '1fr 1fr';
    opts.style.gridTemplateRows = '1fr 1fr';
    opts.style.gap = '16px';
    opts.style.margin = '24px auto 32px auto';
    opts.style.justifyItems = 'center';
    opts.style.alignItems = 'center';
    opts.style.width = 'auto';
    opts.style.maxWidth = '';

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt.name[lang] || opt.name['en'];
      btn.style.border = '2px solid transparent';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.className = 'country-option';
      opts.appendChild(btn);
      btn.addEventListener('click', () => handleAnswer(opt, correct, btn, opts, options, type));
    });
    qaWrap.appendChild(opts);
  }
  container.appendChild(qaWrap);

  // Счет
  renderScore();
}

function handleAnswer(selected, correct, selectedElem, optsDiv, options, type) {
  // Блокируем повторные клики
  Array.from(optsDiv.children).forEach(c => c.style.pointerEvents = 'none');
  // Подсветка
  options.forEach((opt, i) => {
    const elem = optsDiv.children[i];
    if (opt === correct) {
      elem.style.borderColor = '#43a047'; // green
    }
    if (opt === selected && opt !== correct) {
      elem.style.borderColor = '#e53935'; // red
    }
  });
  // Счет
  if (selected === correct) {
    currentScore++;
    if (currentScore > bestScore) {
      bestScore = currentScore;
      setBestScore(bestScore);
    }
  } else {
    currentScore = 0;
  }
  setTimeout(() => renderQuestion(), 1200);
}

function renderScore() {
  let scoreBar = document.getElementById('score-bar');
  if (!scoreBar) {
    scoreBar = document.createElement('div');
    scoreBar.id = 'score-bar';
    scoreBar.style.position = 'absolute';
    scoreBar.style.left = '0';
    scoreBar.style.right = '0';
    scoreBar.style.bottom = '0';
    scoreBar.style.background = 'rgba(255,255,255,0.95)';
    scoreBar.style.fontSize = '1.1rem';
    scoreBar.style.textAlign = 'center';
    scoreBar.style.padding = '12px 0 10px 0';
    scoreBar.style.borderTop = '1px solid #eee';
    scoreBar.style.letterSpacing = '0.5px';
    document.getElementById('game-container').appendChild(scoreBar);
  }
  const lang = getCurrentLang();
  const scoreTexts = {
    ru: `Текущий счет: ${currentScore}   Лучший результат: ${bestScore}`,
    en: `Score: ${currentScore}   Best: ${bestScore}`,
    es: `Puntuación: ${currentScore}   Mejor: ${bestScore}`,
    cn: `分数: ${currentScore}   最高: ${bestScore}`,
    fr: `Score: ${currentScore}   Meilleur: ${bestScore}`
  };
  scoreBar.textContent = scoreTexts[lang] || scoreTexts['en'];
}

function setupLanguageSelector() {
  const select = document.getElementById('lang-select');
  // Восстановить язык из localStorage
  const savedLang = localStorage.getItem('flags_quiz_lang');
  if (savedLang && select) {
    select.value = savedLang;
  }
  // Сохранять выбор языка
  select.addEventListener('change', () => {
    localStorage.setItem('flags_quiz_lang', select.value);
    currentLang = select.value;
    if (currentQuestion) {
      renderQuestion(currentQuestion);
    }
  });
}

function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const { flagsJson, flagsImg: img } = await loadAssets();
    flagsData = flagsJson;
    shuffle(flagsData);
    questionIndex = 0;
    flagsImg = img;
    bestScore = getBestScore();
    setupLanguageSelector();
    renderQuestion();
  } catch (e) {
    alert('Ошибка загрузки ресурсов: ' + e.message);
  }
}); 