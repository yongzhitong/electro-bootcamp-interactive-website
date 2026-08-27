const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

function initGlobalUI() {
  const glow = $('.cursor-glow');
  document.addEventListener('pointermove', e => {
    if (!glow) return;
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });

  const progress = $('#readingProgress');
  const topButton = $('#backToTop');
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? scrollY / max * 100 : 0;
    if (progress) progress.style.width = `${pct}%`;
    topButton?.classList.toggle('show', scrollY > 500);
  };
  document.addEventListener('scroll', update, { passive: true });
  update();
  topButton?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: .12 });
  $$('.reveal').forEach(el => observer.observe(el));

  $$('.side-nav a[href]').forEach(a => {
    const href = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
    const isHome = (PAGE === '' || PAGE === 'index.html') && (href === 'index.html' || href === '');
    a.classList.toggle('active', href === PAGE || isHome);
  });

  $('#presentMode')?.addEventListener('click', () => {
    document.body.classList.toggle('presentation');
    $('#presentMode').textContent = document.body.classList.contains('presentation') ? 'Exit presentation' : 'Presentation mode';
  });
}

function initIntro() {
  const splash = $('#introSplash');
  if (!splash) {
    document.body.classList.remove('intro-lock');
    return;
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phases = ['phase-traces', 'phase-layout', 'phase-sponsor', 'phase-flicker', 'phase-on'];
  let timers = [];
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
  };
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  const finish = () => {
    if (splash.classList.contains('is-done') || splash.classList.contains('is-leaving')) return;
    clearTimers();
    splash.classList.add('is-leaving');
    later(() => {
      splash.classList.add('is-done');
      splash.classList.remove(...phases, 'is-leaving');
      splash.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-lock');
    }, 700);
  };

  const play = () => {
    clearTimers();
    splash.classList.remove('is-done', 'is-leaving', ...phases);
    document.body.classList.add('intro-lock');
    splash.setAttribute('aria-hidden', 'false');
    if (reduced) {
      splash.classList.add('phase-on');
      later(finish, 1800);
      return;
    }
    requestAnimationFrame(() => {
      splash.querySelectorAll('.trace, .pad, .intro-logo, .intro-screen-frame path, .intro-screen-frame circle').forEach(el => {
        el.style.animation = 'none';
        void el.getBoundingClientRect();
        el.style.animation = '';
      });
      splash.classList.add('phase-traces');
    });
    later(() => {
      splash.classList.remove('phase-traces');
      splash.classList.add('phase-layout');
    }, 2550);
    later(() => {
      splash.classList.remove('phase-layout');
      splash.classList.add('phase-sponsor');
    }, 3600);
    later(() => {
      splash.classList.remove('phase-sponsor');
      splash.classList.add('phase-flicker');
    }, 4250);
    later(() => {
      splash.classList.remove('phase-flicker');
      splash.classList.add('phase-on');
    }, 6700);
    later(finish, 9800);
  };

  splash.addEventListener('click', finish);
  $('#replayIntro')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    play();
  });
  play();
}

function initHeroParticles() {
  const canvas = $('#particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height, particles;
  const resize = () => {
    width = canvas.width = canvas.offsetWidth * devicePixelRatio;
    height = canvas.height = canvas.offsetHeight * devicePixelRatio;
    particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * .35 * devicePixelRatio,
      vy: (Math.random() - .5) * .35 * devicePixelRatio,
      r: (Math.random() * 2 + 1) * devicePixelRatio
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(40,232,255,.72)';
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120 * devicePixelRatio) {
          ctx.globalAlpha = 1 - d / (120 * devicePixelRatio);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  };
  resize();
  draw();
  window.addEventListener('resize', resize);
}

function initSeriesParallel() {
  const stage = $('#compareStage');
  if (!stage) return;
  const setMode = mode => {
    $$('[data-compare]').forEach(btn => {
      const on = btn.dataset.compare === mode;
      btn.classList.toggle('primary', on);
      btn.classList.toggle('ghost', !on);
    });
    $$('.led-bulb', stage).forEach(led => led.classList.add('on'));
    $('#compareTitle').textContent = mode === 'series' ? 'Series: one path' : 'Parallel: two paths';
    $('#compareText').textContent = mode === 'series'
      ? 'In series, current has only one road. If one LED is removed, the whole loop breaks and both lights go out.'
      : 'In parallel, each LED has its own road. If one LED is removed, the other can stay on.';
    $('#seriesSvg')?.classList.toggle('hidden', mode !== 'series');
    $('#parallelSvg')?.classList.toggle('hidden', mode !== 'parallel');
    stage.dataset.mode = mode;
  };
  $$('[data-compare]').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.compare)));
  $('#breakLed')?.addEventListener('click', () => {
    const mode = stage.dataset.mode || 'series';
    const leds = $$('.led-bulb', mode === 'series' ? $('#seriesSvg') : $('#parallelSvg'));
    if (mode === 'series') {
      leds.forEach(led => led.classList.remove('on'));
      $('#compareText').textContent = 'You broke the only path. Both LEDs go dark. That is why series circuits share one fate.';
    } else {
      leds[0]?.classList.remove('on');
      $('#compareText').textContent = 'You removed one LED. The other path still works, so the second LED stays bright.';
    }
  });
  $('#resetLeds')?.addEventListener('click', () => setMode(stage.dataset.mode || 'series'));
  setMode('series');
}

function initBreadboard() {
  const board = $('#breadboard');
  if (!board) return;
  const cols = 10;
  const rows = 6;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hole = document.createElement('button');
      hole.type = 'button';
      hole.className = 'bb-hole';
      hole.dataset.row = String(r);
      hole.dataset.col = String(c);
      hole.setAttribute('aria-label', `Breadboard hole row ${r + 1} column ${c + 1}`);
      board.appendChild(hole);
      cells.push(hole);
    }
  }
  board.addEventListener('click', e => {
    const hole = e.target.closest('.bb-hole');
    if (!hole) return;
    const row = hole.dataset.row;
    const col = hole.dataset.col;
    cells.forEach(el => {
      el.classList.toggle('linked', el.dataset.row === row);
      el.classList.toggle('same-row', el.dataset.col === col && el.dataset.row !== row);
    });
    hole.classList.add('linked');
    $('#bbHint').textContent = `On a small breadboard like this, holes in the same row are connected. Column ${Number(col) + 1} is highlighted in gold so you can compare.`;
  });
}

let ina = false;
let inb = false;

function initMotorDriver() {
  if (!$('#inaBtn') || !$('#inbBtn')) return;
  $('#inaBtn').addEventListener('click', () => { ina = !ina; updateMotor(); });
  $('#inbBtn').addEventListener('click', () => { inb = !inb; updateMotor(); });
  $$('.switch').forEach(sw => sw.addEventListener('click', () => {
    const name = sw.dataset.switch;
    if (name === 'S1' || name === 'S4') { ina = !ina; }
    if (name === 'S2' || name === 'S3') { inb = !inb; }
    updateMotor();
  }));
  updateMotor();
}

function updateMotor() {
  if (!$('#inaBtn')) return;
  $('#inaBtn').textContent = `INA: ${ina ? 'High' : 'Low'}`;
  $('#inaBtn').classList.toggle('on', ina);
  $('#inaBtn').setAttribute('aria-pressed', String(ina));
  $('#inbBtn').textContent = `INB: ${inb ? 'High' : 'Low'}`;
  $('#inbBtn').classList.toggle('on', inb);
  $('#inbBtn').setAttribute('aria-pressed', String(inb));

  let state = 'Coast';
  let cls = 'coast';
  let closed = [];
  if (ina && !inb) { state = 'Forward'; cls = 'forward'; closed = ['S1', 'S4']; }
  else if (!ina && inb) { state = 'Reverse'; cls = 'reverse'; closed = ['S2', 'S3']; }
  else if (ina && inb) { state = 'Brake'; cls = 'brake'; closed = ['S1', 'S2', 'S3', 'S4']; }

  if ($('#motorState')) {
    $('#motorState').textContent = state;
    $('#motorState').className = `motor-state ${cls}`;
  }
  $('#motorDisc')?.classList.remove('forward', 'reverse', 'brake', 'coast');
  $('#motorDisc')?.classList.add(cls);
  $$('.switch').forEach(sw => sw.classList.toggle('closed', closed.includes(sw.dataset.switch)));
  $('#currentPath')?.classList.toggle('active', cls === 'forward' || cls === 'reverse');
  $$('tr[data-row]').forEach(tr => tr.classList.toggle('active-row', tr.dataset.row === `${ina ? 1 : 0}${inb ? 1 : 0}`));
  if ($('#codeHighlight')) {
    $('#codeHighlight').textContent = cls === 'forward'
      ? 'digitalWrite(INA, HIGH);  digitalWrite(INB, LOW);'
      : cls === 'reverse'
        ? 'digitalWrite(INA, LOW);   digitalWrite(INB, HIGH);'
        : cls === 'brake'
          ? 'digitalWrite(INA, HIGH);  digitalWrite(INB, HIGH);'
          : 'digitalWrite(INA, LOW);   digitalWrite(INB, LOW);';
  }
}

function initStepper(rootId, steps, extra) {
  const root = document.getElementById(rootId);
  if (!root || !steps.length) return;
  let index = 0;
  const title = $('[data-step-title]', root);
  const text = $('[data-step-text]', root);
  const why = $('[data-step-why]', root);
  const now = $('[data-step-now]', root);
  const total = $('[data-step-total]', root);
  if (total) total.textContent = String(steps.length);

  const paint = () => {
    const step = steps[index];
    if (now) now.textContent = String(index + 1);
    if (title) title.textContent = step.title;
    if (text) text.textContent = step.text;
    if (why) why.textContent = step.why;
    extra?.(step, index);
  };

  $('[data-step-next]', root)?.addEventListener('click', () => {
    index = Math.min(index + 1, steps.length - 1);
    paint();
  });
  $('[data-step-prev]', root)?.addEventListener('click', () => {
    index = Math.max(index - 1, 0);
    paint();
  });
  paint();
}

function initWifiStepper() {
  initStepper('wifiStepper', [
    { title: 'ESP32 becomes a mini Wi-Fi shop', text: 'Your board starts a local access point. It is a tiny network that only exists around your car.', why: 'No school Wi-Fi needed. Phone talks straight to the car.', row: 0 },
    { title: 'Open phone Wi-Fi settings', text: 'Turn on Wi-Fi and look for a name like ELECTRO-Car-07. Each car can have its own name.', why: 'If two cars share one name, phones can get confused.', row: 1 },
    { title: 'Join the car network', text: 'Tap the car Wi-Fi and connect. Your phone may say “no internet”. That is normal.', why: 'This network is only for control, not YouTube.', row: 1 },
    { title: 'Open the control website', text: 'In the phone browser, open the address the facilitators give you. You should see drive buttons.', why: 'The ESP32 is also a tiny web server.', row: 2 },
    { title: 'Test drive', text: 'Tap forward, reverse, and stop. If the wheels move, your code and Wi-Fi both work.', why: 'Fix problems now, before the race track gets busy.', row: 2 }
  ], (step) => {
    $$('.wifi-row').forEach((row, i) => row.classList.toggle('active', i === step.row));
  });
}

function initAssemblyStepper() {
  const car = $('#miniCar');
  initStepper('assemblyStepper', [
    { title: 'Fit the motors', text: 'Clip or screw both motors onto the chassis so the wheels sit straight.', why: 'Crooked motors make the car drift.', look: 'show-motors' },
    { title: 'Mount the PCB and ESP32', text: 'Seat the printed circuit board and ESP32 so they cannot rattle loose.', why: 'A bouncing board can unplug wires mid-race.', look: 'show-motors show-board' },
    { title: 'Connect power and motors', text: 'Use the same PCB-to-motor and power wiring from the H-bridge lesson.', why: 'Wrong polarity can stop the car or stress the board.', look: 'show-motors show-board' },
    { title: 'Mark your car', text: 'Add a sticker, colour, or name. Every student has the same kit, so make yours obvious.', why: 'No mix-ups when 28 cars hit the table.', look: 'show-motors show-board show-decal' },
    { title: 'Gentle test run', text: 'Drive in the enclosed area only. No drops, no crashes into walls for fun.', why: 'You take this car home. Keep it in one piece.', look: 'show-motors show-board show-decal' }
  ], (step) => {
    if (!car) return;
    car.className = `mini-car ${step.look}`;
  });
}

function initConnectionStepper() {
  initStepper('connectStepper', [
    { title: 'Find the motor pads', text: 'On your provided PCB, locate the two motor outputs. These come from the H-bridge.', why: 'The PCB is the tidy version of the breadboard circuit you just built.' },
    { title: 'Wire motor + and −', text: 'Connect the motor leads to the PCB motor pads. Keep red and black consistent.', why: 'Swapping these later just reverses “forward”, which is easy to fix in code.' },
    { title: 'Connect the battery', text: 'Join the battery pack to the PCB power input. Check the voltage range the facilitators give you.', why: 'Motors need a real battery. Do not try to power them from a laptop USB only.' },
    { title: 'Double-check before power', text: 'Look for loose strands, backwards battery clips, and wires that could short.', why: 'Thirty seconds of checking beats a dead kit.' }
  ]);
}

const quizzes = {
  'circuits.html': [
    {
      title: 'Checkpoint · Circuit reading',
      tag: 'After symbols and breadboard',
      questions: [
        { id: 'c1', type: 'mcq', prompt: 'Why do engineers draw circuit diagrams instead of only photographing the real wires?', options: ['Photos are not allowed in class.', 'Diagrams use standard symbols so a messy real circuit becomes easy to read and share.', 'Diagrams make the circuit use less power.', 'Only computers can understand diagrams.'], correct: 1, hint: 'Think “simplify and communicate”.', answer: 'Diagrams simplify real wiring into standard symbols that anyone on the team can follow.' },
        { id: 'c2', type: 'mcq', prompt: 'Two LEDs share one path from the battery. If one LED is removed, both go out. What connection is that?', options: ['Parallel', 'Series', 'Wireless', 'Short circuit'], correct: 1, hint: 'One road only.', answer: 'Series. One broken part opens the whole loop.' },
        { id: 'c3', type: 'mcq', prompt: 'On a breadboard, which holes are usually connected?', options: ['Random holes', 'Holes in the same row of a terminal strip', 'Only the four corner holes', 'None — you must solder them'], correct: 1, hint: 'Rows are the secret.', answer: 'Holes in the same row are linked inside the board.' },
        { id: 'c4', type: 'mcq', prompt: 'A PCB is best described as…', options: ['A paper sketch of a circuit', 'A solidified, printed version of a circuit with copper tracks', 'A type of battery', 'A Wi-Fi password'], correct: 1, hint: 'Printed Circuit Board.', answer: 'A PCB is a solid board with printed copper tracks. Your kit includes one.' }
      ]
    }
  ],
  'h-bridge.html': [
    {
      title: 'Checkpoint · H-bridge logic',
      tag: 'After the switch demo',
      questions: [
        { id: 'h1', type: 'mcq', prompt: 'Why do we use an H-bridge with a DC motor?', options: ['To make the battery last forever', 'To let the same motor spin forwards or backwards by changing switch paths', 'To turn the motor into a speaker', 'To connect Wi-Fi'], correct: 1, hint: 'Direction control.', answer: 'An H-bridge flips which way current goes through the motor.' },
        { id: 'h2', type: 'mcq', prompt: 'To move forwards, which pair of switches should be closed?', options: ['S1 and S3', 'S1 and S4', 'S2 and S4', 'All four'], correct: 1, hint: 'Opposite corners.', answer: 'S1 and S4 close for forward. S2 and S3 close for reverse.' },
        { id: 'h3', type: 'mcq', prompt: 'What is the dangerous move on an H-bridge?', options: ['Leaving all switches open', 'Closing both switches on the same side, like S1 and S2, which shorts power to ground', 'Spinning the motor slowly', 'Using a breadboard first'], correct: 1, hint: 'Never give electricity a shortcut around the motor.', answer: 'Closing S1 and S2 together (or S3 and S4) can short the supply. Do not do that.' },
        { id: 'h4', type: 'table', prompt: 'Fill INA and INB for each motor action.', rows: [{ label: 'Forward', a: 'High', b: 'Low' }, { label: 'Reverse', a: 'Low', b: 'High' }], hint: 'INA High + INB Low = forward.', answer: 'Forward: INA High, INB Low. Reverse: INA Low, INB High.' }
      ]
    }
  ],
  'programming.html': [
    {
      title: 'Checkpoint · Motor code + Wi-Fi',
      tag: 'After applyDirection and the access point',
      questions: [
        { id: 'p1', type: 'mcq', prompt: 'In applyDirection, which pair should be HIGH / LOW to drive forwards (same wiring as the lesson)?', options: ['INA LOW, INB LOW', 'INA HIGH, INB LOW', 'INA LOW, INB HIGH', 'INA HIGH, INB HIGH'], correct: 1, hint: 'Match the H-bridge truth table.', answer: 'INA HIGH and INB LOW for forward.' },
        { id: 'p2', type: 'mcq', prompt: 'Your phone says “Connected, no internet” on the car Wi-Fi. What should you do?', options: ['Throw the ESP32 away', 'That is normal. Open the control website anyway.', 'The car is broken', 'Connect to school Wi-Fi instead'], correct: 1, hint: 'Local access point.', answer: 'The ESP32 network is local only. No internet is expected.' },
        { id: 'p3', type: 'text', prompt: 'Name the two things you must test before lunch: the motor pins and the…', keywords: ['wifi', 'wi-fi', 'wi fi'], hint: 'Phone + access point.', answer: 'Wi-Fi / the phone control link.' }
      ]
    }
  ]
};

function initQuiz() {
  const container = $('#quizContainer');
  const groups = quizzes[PAGE];
  if (!container || !groups) return;
  const storageKey = `electroQuiz:${PAGE}`;

  container.innerHTML = groups.map((group, gi) => `
    <section class="quiz-group" aria-labelledby="group-${gi}">
      <div class="quiz-group-header"><div><h3 id="group-${gi}">${group.title}</h3><p>${group.tag}</p></div><span>Quiz</span></div>
      ${group.questions.map(renderQuestion).join('')}
    </section>
  `).join('');

  const all = () => groups.flatMap(g => g.questions);
  const byId = id => all().find(q => q.id === id);

  const save = () => {
    const data = {};
    all().forEach(q => {
      if (q.type === 'mcq') data[q.id] = $(`input[name="${q.id}"]:checked`)?.value || '';
      else if (q.type === 'table') {
        data[q.id] = q.rows.map((_, i) => ({
          a: $(`select[data-qid="${q.id}"][data-row="${i}"][data-col="a"]`)?.value || '',
          b: $(`select[data-qid="${q.id}"][data-row="${i}"][data-col="b"]`)?.value || ''
        }));
      } else data[q.id] = $(`[data-qid="${q.id}"]`)?.value || '';
    });
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
    all().forEach(q => {
      if (q.type === 'mcq' && data[q.id] !== undefined) {
        const input = $(`input[name="${q.id}"][value="${data[q.id]}"]`);
        if (input) input.checked = true;
      } else if (q.type === 'table' && Array.isArray(data[q.id])) {
        data[q.id].forEach((row, i) => {
          const a = $(`select[data-qid="${q.id}"][data-row="${i}"][data-col="a"]`);
          const b = $(`select[data-qid="${q.id}"][data-row="${i}"][data-col="b"]`);
          if (a) a.value = row.a || '';
          if (b) b.value = row.b || '';
        });
      } else if (data[q.id] !== undefined) {
        const el = $(`[data-qid="${q.id}"]`);
        if (el) el.value = data[q.id];
      }
    });
  } catch { /* ignore */ }

  const checkOne = q => {
    if (q.type === 'mcq') {
      const selected = $(`input[name="${q.id}"]:checked`);
      return selected && Number(selected.value) === q.correct;
    }
    if (q.type === 'table') {
      return q.rows.every((row, i) => {
        const a = $(`select[data-qid="${q.id}"][data-row="${i}"][data-col="a"]`)?.value;
        const b = $(`select[data-qid="${q.id}"][data-row="${i}"][data-col="b"]`)?.value;
        return a === row.a && b === row.b;
      });
    }
    const value = ($(`[data-qid="${q.id}"]`)?.value || '').trim().toLowerCase();
    return !!value && q.keywords.every(k => value.includes(k));
  };

  const updateScore = (correct, total) => {
    if ($('#scoreText')) $('#scoreText').textContent = `${correct}/${total} checked`;
  };

  container.addEventListener('input', save);
  container.addEventListener('change', save);
  $('#checkWorksheet')?.addEventListener('click', () => {
    let correct = 0;
    const questions = all();
    questions.forEach(q => {
      const card = $(`.quiz-card[data-qid="${q.id}"]`);
      const feedback = $('.answer-feedback', card);
      const ok = checkOne(q);
      if (ok) correct++;
      card.classList.toggle('correct', ok);
      card.classList.toggle('wrong', !ok);
      feedback.className = `answer-feedback show ${ok ? 'correct' : 'wrong'}`;
      feedback.textContent = `${ok ? '✅ Nice.' : '🔎 Try again.'} ${q.answer}`;
    });
    updateScore(correct, questions.length);
    if (correct === questions.length) confetti(70);
  });
  $('#showHints')?.addEventListener('click', () => $$('.hint-text').forEach(h => h.classList.toggle('show')));
  $('#resetWorksheet')?.addEventListener('click', () => {
    localStorage.removeItem(storageKey);
    $$('input[type="text"], textarea').forEach(el => { el.value = ''; });
    $$('input[type="radio"]').forEach(el => { el.checked = false; });
    $$('select').forEach(el => { el.value = ''; });
    $$('.quiz-card').forEach(c => c.classList.remove('correct', 'wrong'));
    $$('.answer-feedback').forEach(f => { f.className = 'answer-feedback'; f.textContent = ''; });
    updateScore(0, all().length);
  });
  updateScore(0, all().length);
}

function renderQuestion(q) {
  let body = '';
  if (q.type === 'mcq') {
    body = q.options.map((opt, i) => `<label><input type="radio" name="${q.id}" value="${i}" /> ${String.fromCharCode(65 + i)}. ${opt}</label>`).join('');
  } else if (q.type === 'table') {
    body = `<div class="fill-grid"><strong>Action</strong><strong>INA</strong><strong>INB</strong>${q.rows.map((row, i) => `<span>${row.label}</span><select data-qid="${q.id}" data-row="${i}" data-col="a"><option value="">Choose...</option><option>High</option><option>Low</option></select><select data-qid="${q.id}" data-row="${i}" data-col="b"><option value="">Choose...</option><option>High</option><option>Low</option></select>`).join('')}</div>`;
  } else {
    body = `<input type="text" data-qid="${q.id}" placeholder="Type your answer..." />`;
  }
  return `<article class="quiz-card" data-qid="${q.id}"><p><strong>${q.prompt}</strong></p>${body}<div class="hint-text">💡 ${q.hint}</div><div class="answer-feedback" aria-live="polite"></div></article>`;
}

function initRace() {
  $('#startRace')?.addEventListener('click', () => {
    const cars = [$('#raceCar1'), $('#raceCar2'), $('#raceCar3')].filter(Boolean);
    cars.forEach(car => { car.style.transition = 'none'; car.style.left = '20px'; });
    setTimeout(() => {
      cars.forEach((car, i) => {
        car.style.transition = `left ${2.1 + Math.random() * 1.2}s cubic-bezier(.2,.7,.2,1) ${i * .08}s`;
        car.style.left = `${76 + Math.random() * 10}%`;
      });
      confetti(75);
    }, 80);
  });

  const timeEl = $('#raceTime');
  const startBtn = $('#timerStart');
  const resetBtn = $('#timerReset');
  if (!timeEl || !startBtn) return;
  let started = 0;
  let running = false;
  let frame = 0;
  const pad = n => String(n).padStart(2, '0');
  const paint = t => {
    const cs = Math.floor(t / 10) % 100;
    const s = Math.floor(t / 1000) % 60;
    const m = Math.floor(t / 60000);
    timeEl.textContent = `${pad(m)}:${pad(s)}.${pad(cs)}`;
  };
  const tick = () => {
    if (!running) return;
    paint(performance.now() - started);
    frame = requestAnimationFrame(tick);
  };
  startBtn.addEventListener('click', () => {
    if (running) {
      running = false;
      cancelAnimationFrame(frame);
      timeEl.dataset.acc = String(performance.now() - started);
      startBtn.textContent = 'Start timer';
      return;
    }
    started = performance.now() - Number(timeEl.dataset.acc || 0);
    running = true;
    startBtn.textContent = 'Stop timer';
    tick();
  });
  resetBtn?.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(frame);
    timeEl.dataset.acc = '0';
    paint(0);
    startBtn.textContent = 'Start timer';
  });
}

function confetti(count = 50) {
  const colors = ['#28e8ff', '#ff4ac4', '#ffd166', '#39e58c', '#ffffff', '#2e72ff'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'confetti-piece';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = `${Math.random() * .4}s`;
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initIntro();
  initGlobalUI();
  initHeroParticles();
  initSeriesParallel();
  initBreadboard();
  initMotorDriver();
  initWifiStepper();
  initAssemblyStepper();
  initConnectionStepper();
  initQuiz();
  initRace();
});
