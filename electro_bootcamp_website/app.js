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

  const resetSvg = svg => {
    if (!svg) return;
    svg.classList.remove('circuit-off');
    $$('.circuit-wire', svg).forEach(wire => wire.classList.remove('dead'));
    $$('.lamp', svg).forEach(lamp => {
      lamp.classList.add('on');
      lamp.classList.remove('removed');
    });
  };

  const setMode = mode => {
    $$('[data-compare]').forEach(btn => {
      const on = btn.dataset.compare === mode;
      btn.classList.toggle('primary', on);
      btn.classList.toggle('ghost', !on);
    });
    resetSvg($('#seriesSvg'));
    resetSvg($('#parallelSvg'));
    $('#compareTitle').textContent = mode === 'series' ? 'Series: one path' : 'Parallel: two paths';
    $('#compareText').textContent = mode === 'series'
      ? 'In series, both lamps share the same current — the same flow. One road only. If one lamp is removed, the whole loop breaks and both lights go out.'
      : 'In parallel, both lamps share the same voltage — the same push from the battery. Each lamp has its own road. If one lamp is removed, the other can stay on.';
    $('#seriesSvg')?.classList.toggle('hidden', mode !== 'series');
    $('#parallelSvg')?.classList.toggle('hidden', mode !== 'parallel');
    stage.dataset.mode = mode;
  };

  $$('[data-compare]').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.compare)));
  $('#breakLed')?.addEventListener('click', () => {
    const mode = stage.dataset.mode || 'series';
    const svg = mode === 'series' ? $('#seriesSvg') : $('#parallelSvg');
    const lamps = $$('.lamp', svg);
    if (!lamps.length) return;
    lamps[0].classList.add('removed');
    lamps[0].classList.remove('on');
    if (mode === 'series') {
      lamps.forEach(lamp => lamp.classList.remove('on'));
      svg.classList.add('circuit-off');
      $('#compareText').textContent = 'You broke the only path, so the shared current stops. Both lamps go dark.';
    } else {
      $$('.branch-a', svg).forEach(wire => wire.classList.add('dead'));
      $('#compareText').textContent = 'You removed one lamp. The other still has the same battery push, so it stays bright.';
    }
  });
  $('#resetLeds')?.addEventListener('click', () => setMode(stage.dataset.mode || 'series'));
  setMode('series');
}

function initVoltageCurrent() {
  const svg = $('#vcSvg');
  const btn = $('#vcToggle');
  const hint = $('#vcHint');
  const title = $('#vcTitle');
  const lamp = $('#vcLamp');
  const charges = $('#vcCharges');
  if (!svg || !btn) return;

  spawnCharges(charges, '#vcChargePath', 16, 3.2);

  const paint = connected => {
    svg.classList.toggle('vc-on', connected);
    svg.classList.toggle('vc-off', !connected);
    lamp?.classList.toggle('on', connected);
    btn.textContent = connected ? 'Unplug the battery' : 'Connect the battery';
    if (title) title.textContent = connected ? 'Battery across a lamp' : 'Battery unplugged';
    if (hint) {
      hint.textContent = connected
        ? 'The battery pushes tiny charges out of the + side. That moving stream is current, and it lights the lamp.'
        : 'Unplug the battery and the push stops. The charges freeze, there is no current, and the lamp stays dark.';
    }
    if (connected) svg.unpauseAnimations();
    else svg.pauseAnimations();
  };
  btn.addEventListener('click', () => paint(!svg.classList.contains('vc-on')));
  paint(true);
}

function spawnCharges(group, pathId, count = 14, dur = 2.8) {
  if (!group || group.childElementCount) return;
  for (let i = 0; i < count; i++) {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', i % 4 === 0 ? '4' : '3');
    dot.setAttribute('class', 'vc-charge');
    const motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
    motion.setAttribute('dur', `${dur}s`);
    motion.setAttribute('repeatCount', 'indefinite');
    motion.setAttribute('begin', '0s');
    motion.setAttribute('calcMode', 'linear');
    const t = i / count;
    if (t === 0) {
      motion.setAttribute('keyPoints', '0;1');
      motion.setAttribute('keyTimes', '0;1');
    } else {
      motion.setAttribute('keyPoints', `${t};1;0;${t}`);
      motion.setAttribute('keyTimes', `0;${(1 - t).toFixed(4)};${(1 - t).toFixed(4)};1`);
    }
    const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath');
    mpath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', pathId);
    mpath.setAttribute('href', pathId);
    motion.appendChild(mpath);
    dot.appendChild(motion);
    group.appendChild(dot);
    try { motion.beginElement(); } catch (_) { /* animation starts from begin=0s */ }
  }
}

function initBatteryMotor() {
  const svg = $('#bmSvg');
  const battery = $('#bmBattery');
  const btn = $('#bmFlip');
  const hint = $('#bmHint');
  const title = $('#bmTitle');
  const state = $('#bmState');
  const polL = $('#bmPolL');
  const polR = $('#bmPolR');
  if (!svg || !battery) return;

  spawnCharges($('#bmChargesFw'), '#bmPathFw');
  spawnCharges($('#bmChargesRev'), '#bmPathRev');

  let flipped = false;
  const paint = () => {
    svg.classList.toggle('bm-fwd', !flipped);
    svg.classList.toggle('bm-rev', flipped);
    battery.setAttribute('aria-pressed', String(flipped));
    if (polL) polL.textContent = flipped ? '−' : '+';
    if (polR) polR.textContent = flipped ? '+' : '−';
    if (title) title.textContent = flipped ? 'Battery flipped — current reverses' : 'Battery across a motor';
    if (state) {
      state.classList.toggle('forward', !flipped);
      state.classList.toggle('reverse', flipped);
      state.textContent = flipped ? 'Spinning anticlockwise' : 'Spinning clockwise';
    }
    if (hint) {
      hint.textContent = flipped
        ? '+ is now on the other side. The push flipped, current goes the other way, and the motor reverses.'
        : 'The battery pushes charges out of +. That flow is current, and it spins the motor one way.';
    }
    if (btn) btn.textContent = flipped ? 'Rotate back' : 'Rotate the battery';
  };

  const toggle = () => {
    flipped = !flipped;
    paint();
  };
  battery.addEventListener('click', toggle);
  battery.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
  btn?.addEventListener('click', toggle);
  paint();
}

function initBreadboard() {
  const board = $('#breadboard');
  if (!board) return;
  const cols = 10;
  const rows = 6;
  const tracesWrap = document.createElement('div');
  tracesWrap.className = 'bb-traces';
  tracesWrap.setAttribute('aria-hidden', 'true');
  const traces = [];
  for (let c = 0; c < cols; c++) {
    const trace = document.createElement('span');
    trace.className = 'bb-trace';
    trace.dataset.col = String(c);
    tracesWrap.appendChild(trace);
    traces.push(trace);
  }
  board.appendChild(tracesWrap);

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

  const paint = (row, col) => {
    cells.forEach(el => {
      const sameCol = el.dataset.col === col;
      const sameRow = el.dataset.row === row;
      el.classList.toggle('linked', sameCol);
      el.classList.toggle('same-row', sameRow && !sameCol);
    });
    traces.forEach(trace => trace.classList.toggle('active', trace.dataset.col === col));
    $('#bbHint').textContent = `On a small breadboard like this, holes in the same column are connected. The cyan line is the hidden clip. Row ${Number(row) + 1} is gold so you can see those holes are not joined.`;
  };

  board.addEventListener('click', e => {
    const hole = e.target.closest('.bb-hole');
    if (!hole) return;
    paint(hole.dataset.row, hole.dataset.col);
  });
  paint('0', '0');
}

let ina = false;
let inb = false;
const hbSwitches = { S1: false, S2: true, S3: false, S4: true };

function initMotorDriver() {
  if (!$('#inaBtn') || !$('#inbBtn')) return;
  const bridge = $('#hbridgeSvg');

  $('#inaBtn').addEventListener('click', () => {
    ina = !ina;
    if (bridge) {
      hbSwitches.S1 = ina;
      hbSwitches.S2 = !ina;
    }
    updateMotor();
  });
  $('#inbBtn').addEventListener('click', () => {
    inb = !inb;
    if (bridge) {
      hbSwitches.S3 = inb;
      hbSwitches.S4 = !inb;
    }
    updateMotor();
  });

  $$('[data-switch]', $('#hbridge') || document).forEach(el => {
    const toggle = () => {
      const name = el.dataset.switch;
      if (!(name in hbSwitches)) return;
      hbSwitches[name] = !hbSwitches[name];
      updateMotor();
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
  updateMotor();
}

function liveHBridgeSegs(cls, leftShort, rightShort) {
  const live = new Set();
  const add = (...ids) => ids.forEach(id => live.add(id));
  if (cls === 'forward') add('bat+', 'topr', 'topl', 's1a', 's1b', 'ml', 'mr', 's4a', 's4b', 'botr', 'bat-');
  else if (cls === 'reverse') add('bat+', 'topr', 's3a', 's3b', 'mr', 'ml', 's2a', 's2b', 'botl', 'botr', 'bat-');
  else if (leftShort || rightShort) {
    add('bat+', 'bat-');
    if (leftShort) add('topr', 'topl', 's1a', 's1b', 's2a', 's2b', 'botl', 'botr');
    if (rightShort) add('topr', 's3a', 's3b', 's4a', 's4b', 'botr');
  } else if (cls === 'brake') {
    if (hbSwitches.S1 && hbSwitches.S3) add('bat+', 'topr', 'topl', 's1a', 's1b', 's3a', 's3b');
    if (hbSwitches.S2 && hbSwitches.S4) add('bat-', 'botr', 'botl', 's2a', 's2b', 's4a', 's4b');
  }
  return live;
}

function paintHBridge(cls, leftShort, rightShort) {
  $('#pathForward')?.classList.toggle('active', cls === 'forward');
  $('#pathReverse')?.classList.toggle('active', cls === 'reverse');
  $('#pathShortLeft')?.classList.toggle('active', leftShort);
  $('#pathShortRight')?.classList.toggle('active', rightShort);
  const live = liveHBridgeSegs(cls, leftShort, rightShort);
  $$('#hbridgeSvg [data-seg]').forEach(seg => {
    const on = live.has(seg.dataset.seg);
    seg.classList.toggle('live', on && cls !== 'short');
    seg.classList.toggle('burn', on && cls === 'short');
  });
  const motor = $('#motorSymbol');
  if (motor) {
    motor.classList.remove('forward', 'reverse', 'brake', 'coast', 'short');
    motor.classList.add(cls === 'short' ? 'coast' : cls);
  }
  $('#batterySymbol')?.classList.toggle('short', cls === 'short');
  $$('#hbridge [data-switch]').forEach(g => {
    const on = !!hbSwitches[g.dataset.switch];
    g.classList.toggle('closed', on);
    g.classList.toggle('on', on);
    g.setAttribute('aria-pressed', String(on));
  });
  const hint = $('#hbHint');
  if (!hint) return;
  if (cls === 'short') hint.textContent = 'Same-side switches are both ON. Current skips the motor and dumps through the short — the battery and that wire burn.';
  else if (cls === 'forward') hint.textContent = 'Forward: S1 and S4 are ON. Current goes left to right through the motor.';
  else if (cls === 'reverse') hint.textContent = 'Reverse: S2 and S3 are ON. Current goes right to left through the motor. Unused branches stay off.';
  else if (cls === 'brake') hint.textContent = 'Both motor terminals sit on the same rail, so the motor is braked.';
  else hint.textContent = 'No complete path. Tap a switch button, or use INA / INB to set a whole side.';
}

function updateMotor() {
  if (!$('#inaBtn')) return;
  $('#inaBtn').textContent = `INA: ${ina ? 'High' : 'Low'}`;
  $('#inaBtn').classList.toggle('on', ina);
  $('#inaBtn').setAttribute('aria-pressed', String(ina));
  $('#inbBtn').textContent = `INB: ${inb ? 'High' : 'Low'}`;
  $('#inbBtn').classList.toggle('on', inb);
  $('#inbBtn').setAttribute('aria-pressed', String(inb));
  $$('[data-ina]').forEach(p => p.classList.toggle('active', p.dataset.ina === (ina ? 'high' : 'low')));
  $$('[data-inb]').forEach(p => p.classList.toggle('active', p.dataset.inb === (inb ? 'high' : 'low')));

  const bridge = $('#hbridgeSvg');
  let state = 'Coast';
  let cls = 'coast';

  if (bridge) {
    const { S1, S2, S3, S4 } = hbSwitches;
    const leftShort = S1 && S2;
    const rightShort = S3 && S4;
    if (leftShort || rightShort) {
      state = 'Short circuit!';
      cls = 'short';
    } else if (S1 && S4 && !S2 && !S3) {
      state = 'Forward';
      cls = 'forward';
    } else if (S2 && S3 && !S1 && !S4) {
      state = 'Reverse';
      cls = 'reverse';
    } else if ((S1 && S3 && !S2 && !S4) || (S2 && S4 && !S1 && !S3)) {
      state = 'Brake';
      cls = 'brake';
    } else {
      state = 'Coast / open';
      cls = 'coast';
    }
    paintHBridge(cls, leftShort, rightShort);
  } else if (ina && !inb) {
    state = 'Forward';
    cls = 'forward';
  } else if (!ina && inb) {
    state = 'Reverse';
    cls = 'reverse';
  } else if (ina && inb) {
    state = 'Brake';
    cls = 'brake';
  }

  if ($('#motorState')) {
    $('#motorState').textContent = state;
    $('#motorState').className = `motor-state ${cls}`;
  }
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
    if (text) {
      if (step.html) text.innerHTML = step.html;
      else text.textContent = step.text || '';
    }
    if (why) {
      why.textContent = step.why || '';
      why.hidden = !step.why;
    }
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
  const phonePane = $('#wifiPhonePane');
  const photoPane = $('#wifiPhotoPane');
  const photo = $('#wifiStepPhoto');
  const photoTitle = $('#wifiPhotoTitle');
  initStepper('wifiStepper', [
    { title: 'ESP32 becomes a mini Wi-Fi shop', text: 'Your board starts a local access point. It is a tiny network that only exists around your car.', why: 'No school Wi-Fi needed. Phone talks straight to the car.' },
    { title: 'Open phone Wi-Fi settings', text: 'Turn on Wi-Fi and look under Available networks for a name like ELECTRO-Car-15. Your number may be different.', why: 'If two cars share one name, phones can get confused.', image: 'assets/programming/wifi-step-2.jpg', alt: 'Phone Wi-Fi list with ELECTRO-Car-15 under available networks' },
    { title: 'Join the car network', text: 'Tap the car Wi-Fi and connect. Your phone may say “No internet”. That is normal. Stay on that network.', why: 'This network is only for control, not YouTube.', image: 'assets/programming/wifi-step-3.jpg', alt: 'Phone connected to ELECTRO-Car-15 with no internet' },
    { title: 'Open the control website', text: 'In the phone browser, type 192.168.4.1. You should see ESP32 Arrow Control with the four arrows and speed sliders.', why: 'The ESP32 is also a tiny web server.', image: 'assets/programming/wifi-step-4.jpg', alt: 'Phone browser open at 192.168.4.1 showing ESP32 Arrow Control, Active NONE' },
    { title: 'Test drive', text: 'Hold an arrow. Active should change, like UP. If the wheels move, your code and Wi-Fi both work. Let go to stop.', why: 'Fix problems now, before the race track gets busy.', image: 'assets/programming/wifi-step-5.jpg', alt: 'ESP32 Arrow Control with the up button green and Active UP' }
  ], (step, index) => {
    const showPhone = index === 0;
    phonePane?.classList.toggle('hidden', !showPhone);
    photoPane?.classList.toggle('hidden', showPhone);
    if (photoTitle) photoTitle.textContent = `Step ${index + 1}`;
    if (!showPhone && photo && step.image) {
      photo.src = step.image;
      photo.alt = step.alt || '';
    }
  });
}

function initAssemblyStepper() {
  const photo = $('#assemblyStepPhoto');
  const photoWrap = $('#assemblyPhotoWrap');
  const photoHint = $('#assemblyPhotoHint');
  const photoTitle = $('#assemblyPhotoTitle');
  initStepper('assemblyStepper', [
    {
      title: 'Orient the motor',
      html: '<p>Orient the motor such that the wire side faces you and pull the wire under the motor. Make sure the wires coming out are on the same side as the small circle on the side of the motor (circled).</p>',
      image: 'assets/assembly/step-1.jpg',
      alt: 'Motor with wires pulled under, small circle on the same side as the wires'
    },
    {
      title: 'Seat the motor',
      html: '<ol class="build-steps"><li>Thread both red and black wires through the hole on the side of the motor.</li><li>Ensure that the small circle is facing the outer wall. <strong>DO NOT try to insert the motor where the small circle is facing the inner wall. ESPECIALLY NOT BY FORCE! You may damage the motor or chassis.</strong> The motor axle will slide into the circular hole from the top. If you inserted it according to the orientation in step 1, the motor should fit in easily.</li><li>For best results, push the small rubber cube into the slot such that it presses against the outer wall, holding it securely in the slot.</li></ol>',
      image: 'assets/assembly/step-2.jpg',
      alt: 'Motor seated in the chassis with wires through the side hole, peg on the outer wall, and rubber cube in the slot'
    },
    {
      title: 'Fit the ball bearing',
      html: '<p>Flip the chassis over, and align the holes of the ball bearing with the holes on the chassis. Use the cross-head screwdriver to screw the black screws through both the ball bearing and chassis.</p>',
      image: 'assets/assembly/step-3.jpg',
      alt: 'Ball caster being screwed to the underside of the chassis'
    },
    {
      title: 'Wheels and lid',
      html: '<p>Attach the wheels onto the motors, and the lid on the chassis. Align the holes on the lid to the extensions on the chassis, while ensuring the small compartment on the lid is above the motors. The side with the motors is the front of the car.</p>',
      image: 'assets/assembly/step-4.jpg',
      alt: 'Chassis with both motors and wheels fitted at the front'
    },
    {
      title: 'Insert the ESP32',
      html: '<p>Insert the ESP32 into the slot. <strong>ENSURE THAT THE PINS ARE INSERTED CORRECTLY. Match the pin names on the PCB with the ESP32. IF INSERTED WRONGLY, THE ESP32 COULD POTENTIALLY BURN!</strong> Make sure the connection is correct before connecting the battery.</p>',
      image: 'assets/assembly/step-5.jpg',
      alt: 'ESP32 being aligned so D22 and D23 match the labels on the PCB'
    },
    {
      title: 'Place PCB and battery',
      html: '<p>Place the PCB in the larger compartment <strong>with the screw terminals facing the middle of the car</strong>. Place the battery holder with batteries inside in the smaller compartment.</p>'
    },
    {
      title: 'Connect motors and power',
      html: '<p>Connect the batteries and motor wires into the PCB as before. Ensure that you connect the correct side of motor to the label on the PCB. (e.g. LM label is for the left motor, RM labels is for the right motor).</p>'
    }
  ], (step, index) => {
    if (photoTitle) photoTitle.textContent = `Step ${index + 1}`;
    const hasPhoto = Boolean(step.image);
    photoWrap?.classList.toggle('hidden', !hasPhoto);
    photoHint?.classList.toggle('hidden', hasPhoto);
    if (hasPhoto && photo) {
      photo.src = step.image;
      photo.alt = step.alt || '';
    }
  });
}

function initConnectionStepper() {
  const photo = $('#connectStepPhoto');
  initStepper('connectStepper', [
    {
      title: 'Find the motor outputs',
      text: 'On your provided PCB, locate the four motor outputs. These come from the H-bridge. The text below the screw hole describes which terminal and side of motor to connect. RM- stands for Right Motor −, likewise LM+ stands for Left Motor +.',
      image: 'assets/h-bridge/step-1.jpg',
      alt: 'Custom PCB with the four motor screw terminals circled'
    },
    {
      title: 'Wire the motors',
      text: 'Connect the motor leads to the PCB motor pads according to the text below the screw hole. The left or right side do not matter yet, just ensure the negative and positive terminals are connected correctly. Tighten the screw hole with the wire in it using a cross-head screwdriver.',
      image: 'assets/h-bridge/step-2.jpg',
      alt: 'Tightening a motor wire into a PCB screw terminal'
    },
    {
      title: 'Connect the battery',
      text: 'Join the battery pack to the PCB power input. Ensure that the loose strands of metal from the red and black wires are NOT TOUCHING. When the battery is connected securely, the white LED will light up brightly.',
      image: 'assets/h-bridge/step-3.jpg',
      alt: 'Battery pack wired to Vin and GND with the white power LED on'
    },
    {
      title: 'Check for shorts',
      text: 'Look for loose strands, backwards battery clips, and wires that could short. Pull on the wires lightly to ensure they are tightly in the screw hole.',
      image: 'assets/h-bridge/step-4.jpg',
      alt: 'Dangerous loose copper strands at the power terminals'
    }
  ], step => {
    if (!photo || !step.image) return;
    photo.src = step.image;
    photo.alt = step.alt || '';
  });
}

const quizzes = {
  'circuits.html': [
    {
      title: 'Checkpoint · Circuit reading',
      tag: 'After symbols and breadboard',
      questions: [
        { id: 'c1', type: 'mcq', prompt: 'Why do engineers draw circuit diagrams instead of only photographing the real wires?', options: ['Photos are not allowed in class.', 'Diagrams use standard symbols so a messy real circuit becomes easy to read and share.', 'Diagrams make the circuit use less power.', 'Only computers can understand diagrams.'], correct: 1, hint: 'Think “simplify and communicate”.', answer: 'Diagrams simplify real wiring into standard symbols that anyone on the team can follow.' },
        { id: 'c2', type: 'mcq', prompt: 'Two LEDs share one path from the battery. If one LED is removed, both go out. What connection is that?', options: ['Parallel', 'Series', 'Wireless', 'Short circuit'], correct: 1, hint: 'One road only.', answer: 'Series. One broken part opens the whole loop.' },
        { id: 'c5', type: 'mcq', prompt: 'A lamp stays dark. What must be true?', options: ['Current can flow even with no voltage.', 'Voltage is the flow, current is the push.', 'Current only flows if voltage is pushing, and voltage needs a power source across the lamp.', 'Lamps never need a battery.'], correct: 2, hint: 'Think push, then flow.', answer: 'No battery across the lamp means no voltage (push), so no current (flow). The lamp stays dark.' },
        { id: 'c3', type: 'mcq', prompt: 'On a breadboard, which holes are usually connected?', options: ['Random holes', 'Holes in the same column of a terminal strip', 'Only the four corner holes', 'None — you must solder them'], correct: 1, hint: 'Columns are the secret.', answer: 'Holes in the same column are linked inside the board.' },
        { id: 'c4', type: 'mcq', prompt: 'A PCB is best described as…', options: ['A paper sketch of a circuit', 'A solidified, printed version of a circuit with copper tracks', 'A type of battery', 'A Wi-Fi password'], correct: 1, hint: 'Printed Circuit Board.', answer: 'A PCB is a solid board with printed copper tracks. Your kit includes one.' }
      ]
    }
  ],
  'h-bridge.html': [
    {
      title: 'Checkpoint · H-bridge logic',
      tag: 'After the switch demo',
      questions: [
        { id: 'h0', type: 'mcq', prompt: 'You connect a battery straight to a motor. What happens if you rotate the battery so + and − swap?', options: ['The motor always spins the same way', 'Current reverses, so the motor spins the other way', 'The motor becomes a lamp', 'Voltage disappears'], correct: 1, hint: 'Think about the push from Circuits.', answer: 'Swapping + and − reverses the push, so current goes the other way and the motor reverses.' },
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
        { id: 'p1', type: 'mcq', prompt: 'What does digitalWrite(AIN2, HIGH) do?', options: ['Reads the value on pin AIN2', 'Sets pin AIN2 to HIGH', 'Sets every motor pin to HIGH', 'Checks if d == UP'], correct: 1, hint: 'Write means set. Digital means HIGH or LOW.', answer: 'It writes HIGH onto pin AIN2.' },
        { id: 'p2', type: 'mcq', prompt: 'Your phone says “Connected, no internet” on the car Wi-Fi. What should you do?', options: ['Throw the ESP32 away', 'That is normal. Open the control website anyway.', 'The car is broken', 'Connect to school Wi-Fi instead'], correct: 1, hint: 'Local access point.', answer: 'The ESP32 network is local only. No internet is expected.' },
        { id: 'p3', type: 'text', prompt: 'Name the two things you must test before you build the chassis: the motor pins and the…', keywords: ['wifi', 'wi-fi', 'wi fi'], hint: 'Phone + access point.', answer: 'Wi-Fi / the phone control link.' }
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
        car.style.transition = `left ${2.2 + Math.random() * 1.1}s cubic-bezier(.15,.75,.2,1) ${i * .1}s`;
        car.style.left = 'calc(100% - 52px)';
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
  initVoltageCurrent();
  initBatteryMotor();
  initBreadboard();
  initMotorDriver();
  initWifiStepper();
  initAssemblyStepper();
  initConnectionStepper();
  initQuiz();
  initRace();
});
