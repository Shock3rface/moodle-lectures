(() => {
  'use strict';

  const T = window.THREE;
  const $ = (id) => document.getElementById(id);
  const fmt = (n, digits = 2) => Number(n).toFixed(digits).replace('.', ',');
  if (!T) {
    document.querySelectorAll('.canvas-wrap').forEach((el) => {
      const note = document.createElement('div');
      note.className = 'webgl-error';
      note.textContent = 'Не удалось загрузить Three.js. Проверьте подключение к интернету и обновите страницу.';
      el.appendChild(note);
    });
    return;
  }

  const makeRenderer = (canvas) => {
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    return renderer;
  };
  const addLights = (scene) => {
    scene.add(new T.HemisphereLight(0xeaf4ef, 0x354952, 2.0));
    const light = new T.DirectionalLight(0xffefd0, 2.2);
    light.position.set(-3, 6, 6);
    scene.add(light);
  };
  const mat = (color, opacity = 1, extra = {}) => new T.MeshStandardMaterial({ color, roughness: .5, metalness: .05, transparent: opacity < 1, opacity, ...extra });
  const box = (scene, size, position, material, parent = scene) => {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };
  const line = (scene, points, color, opacity = 1, linewidth = 1) => {
    const geometry = new T.BufferGeometry().setFromPoints(points.map((p) => new T.Vector3(...p)));
    const material = new T.LineBasicMaterial({ color, transparent: opacity < 1, opacity, linewidth });
    const object = new T.Line(geometry, material);
    scene.add(object);
    return object;
  };
  const sphere = (scene, radius, position, material, segments = 20) => {
    const mesh = new T.Mesh(new T.SphereGeometry(radius, segments, segments), material);
    mesh.position.set(...position);
    scene.add(mesh);
    return mesh;
  };
  const setupView = (canvas, scene, camera) => {
    const renderer = makeRenderer(canvas);
    let down = false, lastX = 0, lastY = 0;
    const target = new T.Vector3(0, .15, 0);
    let radius = 9, azimuth = .28, elevation = .18;
    const place = () => {
      elevation = Math.max(-.28, Math.min(.72, elevation));
      camera.position.set(target.x + radius * Math.sin(azimuth) * Math.cos(elevation), target.y + radius * Math.sin(elevation), target.z + radius * Math.cos(azimuth) * Math.cos(elevation));
      camera.lookAt(target);
    };
    place();
    canvas.addEventListener('pointerdown', (e) => { down = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      if (!down) return;
      azimuth -= (e.clientX - lastX) * .008;
      elevation += (e.clientY - lastY) * .006;
      lastX = e.clientX; lastY = e.clientY; place();
    });
    const endDrag = () => { down = false; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); radius = Math.max(5, Math.min(15, radius + e.deltaY * .008)); place(); }, { passive: false });
    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return { renderer, camera, resize, render: () => renderer.render(scene, camera) };
  };

  // Double slit: each click is one localized detection; the distribution is |ψ₁+ψ₂|².
  const waveCanvas = $('waveScene');
  if (waveCanvas) {
    const scene = new T.Scene();
    addLights(scene);
    const camera = new T.PerspectiveCamera(38, 1, .1, 100);
    const view = setupView(waveCanvas, scene, camera);
    const colors = { metal: mat(0x94aaa8), dark: mat(0x50656a), screen: mat(0xd9e8e2, .28, { side: T.DoubleSide }), gold: mat(0xf0d28f, .95, { emissive: 0x7c5b20, emissiveIntensity: .35 }), particle: mat(0xffe7a6, 1, { emissive: 0xffc95f, emissiveIntensity: 1.1 }), slit: mat(0x253c45) };
    box(scene, [8.8, .13, 1.5], [0, -1.28, 0], colors.metal);
    box(scene, [.12, 2.2, 1.0], [-3.45, -.1, 0], mat(0x738a89));
    sphere(scene, .22, [-3.45, -.1, 0], colors.particle, 24);
    // Barrier consists of three rails, leaving two narrow apertures.
    const bx = -.45, gapCenter = .03, slitGap = .54, slitHeight = .17;
    box(scene, [.16, .64, 1.05], [bx, .76, 0], colors.dark);
    box(scene, [.16, .64, 1.05], [bx, -.76, 0], colors.dark);
    box(scene, [.16, .50, 1.05], [bx, 0, 0], colors.dark);
    // Two aperture rims and screen frame.
    [-slitGap / 2, slitGap / 2].forEach((dy) => {
      box(scene, [.19, .035, 1.07], [bx, gapCenter + dy + slitHeight / 2, 0], colors.metal);
      box(scene, [.19, .035, 1.07], [bx, gapCenter + dy - slitHeight / 2, 0], colors.metal);
    });
    box(scene, [.08, 2.35, .12], [3.35, -.08, -.48], colors.metal);
    box(scene, [.08, 2.35, .12], [3.35, -.08, .48], colors.metal);
    box(scene, [.035, 2.2, .92], [3.35, -.08, 0], colors.screen);
    // Baseline and simple emitted wave paths; their spacing updates with wavelength.
    line(scene, [[-3.2, -.1, 0], [bx - .12, -.1, 0]], 0xe8cb8a, .65);
    const waveGuides = [];
    const screenHits = new T.Group(); scene.add(screenHits);
    const shutter = box(scene, [.22, slitHeight + .025, 1.09], [bx, gapCenter + slitGap / 2, 0], mat(0xb6c8c5));
    const particles = [];
    let hitCount = 0;
    const lambda = $('lambdaSlider'), mode = $('slitMode');
    const lambdaOut = $('lambdaOut'), result = $('waveResult'), stats = $('waveStats'), status = $('waveStatus');
    const wavelengthNm = () => Number(lambda.value);
    const fringePitchMm = () => 7.5 * wavelengthNm(); // L=1.5 m, d=0.20 μm; illustrative screen scale.
    function updateWaveGuides() {
      waveGuides.splice(0).forEach((o) => { scene.remove(o); o.geometry.dispose(); o.material.dispose(); });
      const pitch = fringePitchMm() / 7.5 * .72;
      shutter.visible = mode.value === 'one';
      for (let n = -2; n <= 2; n++) {
        const y = n * pitch;
        waveGuides.push(line(scene, [[bx + .1, gapCenter, -.05], [1.45, y, -.05], [3.30, y, -.05]], n === 0 ? 0xf2d894 : 0xb6d2d0, n === 0 ? .62 : .25));
      }
      lambdaOut.textContent = `${fmt(wavelengthNm(), 2)} нм`;
      result.innerHTML = `Шаг полос: <strong>Δy = λL/d ≈ ${fmt(fringePitchMm(), 1)} мм</strong> (условная шкала модели).`;
      status.textContent = mode.value === 'both' ? 'Две щели открыты' : 'Одна щель открыта';
      view.render();
    }
    function densityAt(y) {
      const sigma = .72;
      const envelope = Math.exp(-.5 * (y / sigma) ** 2);
      if (mode.value === 'one') return envelope;
      const pitch = Math.max(.15, fringePitchMm() / 7.5 * .72);
      return envelope * Math.cos(Math.PI * y / pitch) ** 2;
    }
    function sampleHit() {
      let y;
      for (let tries = 0; tries < 400; tries++) {
        const candidate = (Math.random() * 2 - 1) * 1.08;
        if (Math.random() < densityAt(candidate)) { y = candidate; break; }
      }
      if (y === undefined) y = (Math.random() * 2 - 1) * .3;
      const dot = sphere(screenHits, .045, [3.29, y - .08, .015], colors.particle, 10);
      dot.material = colors.particle;
      hitCount++;
      stats.textContent = `Частицы на экране: ${hitCount}`;
      const p = sphere(scene, .065, [-3.15, -.1, 0], colors.particle, 12);
      particles.push({ mesh: p, t: 0, target: new T.Vector3(3.2, y - .08, 0), start: new T.Vector3(-3.15, -.1, 0) });
      view.render();
    }
    $('fireParticle').addEventListener('click', sampleHit);
    $('fireBatch').addEventListener('click', () => { for (let i = 0; i < 20; i++) sampleHit(); });
    $('clearHits').addEventListener('click', () => {
      screenHits.clear(); hitCount = 0; stats.textContent = 'Частицы на экране: 0'; view.render();
    });
    lambda.addEventListener('input', updateWaveGuides);
    mode.addEventListener('change', updateWaveGuides);
    updateWaveGuides();
    window.addEventListener('resize', view.resize);
    waveCanvas.__animate = (dt) => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.t = Math.min(1, p.t + dt * 1.5);
        p.mesh.position.lerpVectors(p.start, p.target, p.t);
        if (p.t >= 1) { scene.remove(p.mesh); p.mesh.geometry.dispose(); particles.splice(i, 1); }
      }
      view.render();
    };
  }

  // Atomic transition: ΔE=hf=hc/λ; stimulated photons are emitted in phase/direction with the trigger.
  const emissionCanvas = $('emissionScene');
  if (emissionCanvas) {
    const scene = new T.Scene(); addLights(scene);
    const camera = new T.PerspectiveCamera(38, 1, .1, 100);
    const view = setupView(emissionCanvas, scene, camera);
    const railMat = mat(0xb3c9c3), atomMat = mat(0xf1cf87, 1, { emissive: 0x8b5c18, emissiveIntensity: .3 });
    const lowerY = -.72, upperY = .78;
    box(scene, [7.8, .14, 1.5], [0, -1.45, 0], mat(0x829a98));
    line(scene, [[-2.5, upperY, 0], [2.5, upperY, 0]], 0xc9ddd5, .95, 2);
    line(scene, [[-2.5, lowerY, 0], [2.5, lowerY, 0]], 0xc9ddd5, .95, 2);
    line(scene, [[-2.5, upperY, -.03], [-2.5, lowerY, -.03]], 0xe0c995, .55);
    const atom = sphere(scene, .22, [0, upperY, .1], atomMat, 24);
    const glow = sphere(scene, .38, [0, -.05, -.2], mat(0xe6dbc0, .18, { side: T.DoubleSide }), 20);
    const gapLine = line(scene, [[0, lowerY, .15], [0, upperY, .15]], 0xe0c995, .75);
    const photons = [];
    let emitted = 0, busy = false;
    const gap = $('gapSlider'), gapOut = $('gapOut'), emissionResult = $('emissionResult'), atomStatus = $('atomStatus'), photonCount = $('photonCount');
    function updateGap() {
      const ev = Number(gap.value), nm = 1239.84 / ev;
      gapOut.textContent = `${fmt(ev, 2)} эВ`;
      const color = new T.Color().setHSL(Math.max(0, Math.min(.72, (700 - nm) / 440)), .74, .68);
      atom.material.color.copy(color); atom.material.emissive.copy(color).multiplyScalar(.35);
      emissionResult.innerHTML = `Энергия фотона <strong>hν = ΔE</strong>; длина волны <strong>λ = hc/ΔE ≈ ${fmt(nm, 0)} нм</strong>.`;
      view.render();
    }
    function makePhoton(position, direction, color, speed = 2.2) {
      const group = new T.Group(); scene.add(group);
      const ball = new T.Mesh(new T.SphereGeometry(.12, 16, 16), mat(color, 1, { emissive: color, emissiveIntensity: 1.2 }));
      const beam = new T.Mesh(new T.CylinderGeometry(.035, .035, .7, 8), mat(color, .5, { emissive: color, emissiveIntensity: .6 }));
      beam.rotation.z = Math.PI / 2;
      group.add(beam, ball); group.position.copy(position);
      photons.push({ group, direction: direction.clone().normalize(), speed, age: 0 });
      return group;
    }
    function finishTransition(kind) {
      if (busy) return;
      if (atom.position.y < upperY - .2) { atomStatus.textContent = 'Сначала возбуди атом'; return; }
      busy = true; atomStatus.textContent = kind === 'spontaneous' ? 'Спонтанный переход' : 'Падающий фотон вызвал переход';
      if (kind === 'stimulated') {
        const trigger = makePhoton(new T.Vector3(-3.1, upperY, 0), new T.Vector3(1, 0, 0), atom.material.color, 2.8);
        trigger.userData.trigger = true;
      }
      const from = atom.position.clone(), to = new T.Vector3(0, lowerY, .1); let t = 0;
      const animateAtom = (dt) => {
        if (!busy) return;
        t += dt * 1.4;
        atom.position.lerpVectors(from, to, Math.min(1, t));
        if (t >= 1) {
          busy = false; emitted += kind === 'stimulated' ? 2 : 1;
          const c = atom.material.color.getHex();
          if (kind === 'stimulated') {
            // Incoming photon reaches the atom; the second, identical photon follows it.
            makePhoton(new T.Vector3(.35, lowerY + .2, .1), new T.Vector3(1, 0, 0), c, 2.8);
            makePhoton(new T.Vector3(.35, lowerY - .2, .1), new T.Vector3(1, 0, 0), c, 2.8);
          } else {
            const theta = Math.random() * Math.PI * 2;
            makePhoton(new T.Vector3(.1, lowerY, .1), new T.Vector3(Math.cos(theta), Math.sin(theta), 0), c, 2.2);
          }
          photonCount.textContent = `Испущено фотонов: ${emitted}`;
          atomStatus.textContent = 'Атом на нижнем уровне';
        }
      };
      emissionCanvas.__atomUpdate = animateAtom;
    }
    $('spontaneousBtn').addEventListener('click', () => finishTransition('spontaneous'));
    $('stimulatedBtn').addEventListener('click', () => finishTransition('stimulated'));
    $('exciteBtn').addEventListener('click', () => {
      busy = false; emissionCanvas.__atomUpdate = null;
      atom.position.set(0, upperY, .1); atomStatus.textContent = 'Атом возбуждён'; view.render();
    });
    gap.addEventListener('input', updateGap); updateGap();
    window.addEventListener('resize', view.resize);
    emissionCanvas.__animate = (dt) => {
      if (emissionCanvas.__atomUpdate) emissionCanvas.__atomUpdate(dt);
      for (let i = photons.length - 1; i >= 0; i--) {
        const p = photons[i]; p.age += dt; p.group.position.addScaledVector(p.direction, p.speed * dt);
        if (p.group.userData.trigger && p.group.position.x >= 0) {
          scene.remove(p.group); photons.splice(i, 1);
          p.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
          continue;
        }
        if (p.age > 4 || Math.abs(p.group.position.x) > 4.2 || Math.abs(p.group.position.y) > 3.5) {
          scene.remove(p.group); photons.splice(i, 1);
          p.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        }
      }
      view.render();
    };
  }

  const canvases = ['waveScene', 'emissionScene'].map($).filter(Boolean);
  let previousFrame = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - previousFrame) / 1000, .05);
    previousFrame = now;
    canvases.forEach((canvas) => canvas.__animate && canvas.__animate(dt));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  const quiz = $('answerBtn');
  if (quiz) quiz.addEventListener('click', () => {
    const panel = $('answer').closest('.quiz');
    panel.classList.toggle('open');
    quiz.setAttribute('aria-expanded', panel.classList.contains('open') ? 'true' : 'false');
    quiz.textContent = panel.classList.contains('open') ? 'Скрыть ответ' : 'Показать ответ';
  });
})();
