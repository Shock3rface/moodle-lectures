(() => {
  'use strict';
  const T = window.THREE;
  const $ = (id) => document.getElementById(id);
  const fmt = (n, digits = 2) => Number(n).toFixed(digits).replace('.', ',');
  if (!T) {
    document.querySelectorAll('.scene').forEach((host) => {
      const message = document.createElement('div');
      message.className = 'readout';
      message.textContent = 'Не удалось загрузить Three.js. Проверьте подключение к интернету и обновите страницу.';
      host.appendChild(message);
    });
    return;
  }
  const material = (color, opacity = 1, extra = {}) => new T.MeshStandardMaterial({ color, roughness: .48, metalness: .03, transparent: opacity < 1, opacity, ...extra });
  const meshBox = (parent, size, position, mat) => {
    const m = new T.Mesh(new T.BoxGeometry(...size), mat); m.position.set(...position); parent.add(m); return m;
  };
  const meshSphere = (parent, radius, position, mat, segments = 18) => {
    const m = new T.Mesh(new T.SphereGeometry(radius, segments, segments), mat); m.position.set(...position); parent.add(m); return m;
  };
  const line = (parent, points, color, opacity = 1) => {
    const geometry = new T.BufferGeometry().setFromPoints(points.map((p) => new T.Vector3(...p)));
    const object = new T.Line(geometry, new T.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
    parent.add(object); return object;
  };
  const clearGroup = (group) => {
    const oldChildren = [...group.children];
    group.clear();
    oldChildren.forEach((child) => child.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => m.dispose());
    }));
  };
  const cylinderBetween = (parent, a, b, radius, mat) => {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), delta = new T.Vector3().subVectors(end, start);
    const object = new T.Mesh(new T.CylinderGeometry(radius, radius, delta.length(), 8), mat);
    object.position.copy(start).add(end).multiplyScalar(.5);
    object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    parent.add(object); return object;
  };
  const initView = (canvas, scene, camera, target = new T.Vector3(0, 0, 0)) => {
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
    catch (error) {
      const note = document.createElement('div'); note.className = 'readout';
      note.textContent = 'WebGL недоступен в этом браузере или устройстве. Обновите браузер либо включите аппаратное ускорение.';
      canvas.parentElement.appendChild(note); return { render() {}, resize() {} };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .88;
    const initialView = { radius: 8.8, azimuth: .22, elevation: .16, zoom: 1 };
    const spherical = { ...initialView };
    const placeCamera = () => {
      spherical.elevation = Math.max(-.35, Math.min(.72, spherical.elevation));
      camera.position.set(target.x + spherical.radius * Math.sin(spherical.azimuth) * Math.cos(spherical.elevation), target.y + spherical.radius * Math.sin(spherical.elevation), target.z + spherical.radius * Math.cos(spherical.azimuth) * Math.cos(spherical.elevation));
      camera.lookAt(target);
    };
    placeCamera();
    const zoomTo = (value) => { spherical.zoom = Math.max(.75, Math.min(3.2, value)); camera.zoom = spherical.zoom; camera.updateProjectionMatrix(); render(); };
    let dragging = false, px = 0, py = 0;
    canvas.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (!dragging) return; spherical.azimuth -= (e.clientX - px) * .008; spherical.elevation += (e.clientY - py) * .006; px = e.clientX; py = e.clientY; placeCamera(); render(); });
    canvas.addEventListener('pointerup', () => { dragging = false; });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
    const host = canvas.parentElement;
    host.addEventListener('wheel', (e) => { e.preventDefault(); zoomTo(spherical.zoom * Math.exp(-e.deltaY * .001)); }, { passive: false });
    const tools = document.createElement('div'); tools.className = 'scene-tools';
    const toolButton = (label, aria, action) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', aria); b.title = aria; b.addEventListener('click', (e) => { e.stopPropagation(); action(); }); tools.appendChild(b); };
    toolButton('+', 'Приблизить сцену', () => zoomTo(spherical.zoom * 1.25));
    toolButton('−', 'Отдалить сцену', () => zoomTo(spherical.zoom / 1.25));
    toolButton('↺', 'Сбросить ракурс и масштаб', () => { Object.assign(spherical, initialView); camera.zoom = 1; camera.updateProjectionMatrix(); placeCamera(); render(); });
    host.appendChild(tools);
    const resize = () => { const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera); };
    new ResizeObserver(resize).observe(canvas); resize();
    function render() { renderer.render(scene, camera); }
    return { renderer, resize, render, zoomTo };
  };
  const lightScene = (scene) => {
    scene.add(new T.HemisphereLight(0xe8f3ee, 0x374b50, .8));
    const key = new T.DirectionalLight(0xffe8c6, 1.05); key.position.set(-4, 6, 5); scene.add(key);
    const fill = new T.DirectionalLight(0xc7dcdf, .32); fill.position.set(3, 1, -5); scene.add(fill);
  };

  // Tissue and DNA: symbolic marks change immediately with dose and exposure conditions.
  const cellCanvas = $('cellScene');
  if (cellCanvas) {
    const scene = new T.Scene(); lightScene(scene);
    const camera = new T.PerspectiveCamera(39, 1, .1, 100), view = initView(cellCanvas, scene, camera, new T.Vector3(0, .05, 0));
    const shellMat = material(0xaccbc0, .16, { side: T.DoubleSide, depthWrite: false });
    const nucleusMat = material(0xb6a9c9, .3, { side: T.DoubleSide });
    meshSphere(scene, 1.54, [0, 0, 0], shellMat, 40);
    meshSphere(scene, .65, [.18, .03, .08], nucleusMat, 32);
    // Two-strand helix with base-pair rungs.
    const strandMatA = material(0x97b8ac, 1, { emissive: 0x294b43, emissiveIntensity: .18 });
    const strandMatB = material(0xc4a6ad, 1, { emissive: 0x57363f, emissiveIntensity: .12 });
    const strandA = [], strandB = [], helixY0 = -.86, helixY1 = .86, radius = .25, turns = 2.4;
    for (let i = 0; i <= 52; i++) {
      const u = i / 52, y = helixY0 + u * (helixY1 - helixY0), a = u * Math.PI * 2 * turns;
      strandA.push([.18 + radius * Math.cos(a), y, .08 + radius * Math.sin(a)]);
      strandB.push([.18 + radius * Math.cos(a + Math.PI), y, .08 + radius * Math.sin(a + Math.PI)]);
    }
    line(scene, strandA, 0x9fc6b8); line(scene, strandB, 0xcaa9ad);
    const baseTrackPositions = [-.62, -.31, 0, .31, .62];
    for (let i = 0; i <= 52; i += 3) {
      const u = i / 52, a = u * Math.PI * 2 * turns, y = helixY0 + u * (helixY1 - helixY0);
      if (baseTrackPositions.some((site) => Math.abs(site - y) < .075)) continue;
      const aPos = [.18 + radius * Math.cos(a), y, .08 + radius * Math.sin(a)];
      const bPos = [.18 + radius * Math.cos(a + Math.PI), y, .08 + radius * Math.sin(a + Math.PI)];
      cylinderBetween(scene, aPos, bPos, .012, material(0xe3d2ad, .8));
    }
    const lesions = new T.Group(); scene.add(lesions);
    // Neighbouring cells create a tissue context without pretending to be to scale.
    const neighbourDamage = [];
    [[-2.5, .72, -.4], [-2.48, -.75, -.45], [2.45, .72, -.5], [2.5, -.8, -.4]].forEach(([x, y, z], i) => {
      meshSphere(scene, .72, [x, y, z], material(i % 2 ? 0xd6c8dc : 0xc1d8ce, .28, { side: T.DoubleSide }), 24);
      meshSphere(scene, .24, [x + .08, y, z + .1], material(i % 2 ? 0xb7a6ca : 0x92b3a6, .35, { side: T.DoubleSide }), 18);
      neighbourDamage.push(meshSphere(scene, .105, [x + .08, y, z + .34], material(0xe7a18f, 0, { emissive: 0x9d4149, emissiveIntensity: .4 }), 12));
    });
    const tracks = new T.Group(); scene.add(tracks);
    const doseSlider = $('doseSlider'), rateSelect = $('rateSelect'), extentSelect = $('extentSelect');
    const doseOut = $('doseOut'), doseReadout = $('doseReadout'), cellState = $('cellState'), cellDamageCount = $('cellDamageCount');
    function updateCell() {
      const dose = Number(doseSlider.value), acute = rateSelect.value === 'acute', whole = extentSelect.value === 'whole';
      doseOut.textContent = `${fmt(dose, 2)} Гр`;
      const n = dose < .08 ? 0 : Math.min(5, Math.ceil(dose * 2.5));
      const activeTrackYs = [[], [0], [-.31, .31], [-.31, 0, .31], [-.62, -.31, .31, .62], baseTrackPositions];
      clearGroup(tracks);
      clearGroup(lesions);
      for (let i = 0; i < n; i++) {
        const y = activeTrackYs[n][i];
        const hitX = .18;
        const trackMat = new T.LineBasicMaterial({ color: 0xffd58d, transparent: true, opacity: whole ? .92 : .78 });
        const tr = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(whole ? -3.15 : -1.15, y, .25), new T.Vector3(hitX, y, .18)]), trackMat);
        tracks.add(tr);
        const spark = meshSphere(tracks, .075, [hitX, y, .18], material(0xffd58d, .98, { emissive: 0xffa946, emissiveIntensity: 1.25 }), 14);
        spark.scale.setScalar(.9 + .06 * i);
        const u = (y - helixY0) / (helixY1 - helixY0), phase = u * Math.PI * 2 * turns;
        const aPos = [.18 + radius * Math.cos(phase), y, .08 + radius * Math.sin(phase)];
        const bPos = [.18 + radius * Math.cos(phase + Math.PI), y, .08 + radius * Math.sin(phase + Math.PI)];
        const lesionMat = material(0xf09b91, 1, { emissive: 0xb84352, emissiveIntensity: 1.1 });
        meshSphere(lesions, .105, aPos, lesionMat, 16);
        meshSphere(lesions, .105, bPos, lesionMat.clone(), 16);
        // Broken base pair shown as two short, separated fragments at the track intersection.
        const fragmentMat = material(0xffd8a0, .98, { emissive: 0xb76d46, emissiveIntensity: .7 });
        const mid = new T.Vector3(...aPos).add(new T.Vector3(...bPos)).multiplyScalar(.5);
        const cut = new T.Vector3(...bPos).sub(new T.Vector3(...aPos)).normalize();
        const gap = .08;
        const left = mid.clone().addScaledVector(cut, -gap), right = mid.clone().addScaledVector(cut, gap);
        cylinderBetween(lesions, aPos, [left.x, left.y, left.z], .025, fragmentMat);
        cylinderBetween(lesions, [right.x, right.y, right.z], bPos, .025, fragmentMat.clone());
      }
      lesions.traverse((object) => { if (object.material && 'opacity' in object.material) object.material.opacity = acute ? .98 : .72; });
      const outerMarksVisible = whole && dose >= .35;
      neighbourDamage.forEach((marker) => { marker.visible = outerMarksVisible; marker.material.opacity = outerMarksVisible ? (acute ? .9 : .56) : 0; });
      const band = dose < .1 ? 'Низкий учебный диапазон' : dose < .5 ? 'Повреждения могут восстанавливаться' : dose < 1 ? 'Выраженнее клеточный ответ' : 'Высокий острый диапазон';
      cellState.textContent = band;
      cellDamageCount.textContent = `Условных участков повреждения ДНК: ${n}${outerMarksVisible ? ` · соседние клетки: ${neighbourDamage.length}` : ''}`;
      if (!whole) {
        doseReadout.innerHTML = '<strong>Локальное воздействие:</strong> вывод о синдроме для всего тела здесь неприменим. Последствия зависят от облучённого органа, объёма ткани и локальной поглощённой дозы.';
      } else if (!acute) {
        doseReadout.innerHTML = '<strong>Растянуто во времени:</strong> у клеток обычно больше возможностей восстановить часть повреждений. Это может уменьшать вероятность тканевых реакций, но не обнуляет риск отдалённых эффектов.';
      } else if (dose < .1) {
        doseReadout.innerHTML = '<strong>Малая острая доза:</strong> немедленные тканевые реакции обычно не ожидаются. Возможный отдалённый риск нельзя надёжно предсказать для отдельного человека.';
      } else if (dose < 1) {
        doseReadout.innerHTML = '<strong>Клеточный уровень:</strong> некоторые повреждения возникают и восстанавливаются; клинические последствия не следуют автоматически из одного числа дозы.';
      } else {
        doseReadout.innerHTML = '<strong>Высокая острая доза всему телу:</strong> в области порядка 1 Гр и выше возможны острые тканевые эффекты, включая лучевой синдром. Это ориентир для учебного разговора, а не порог диагноза.';
      }
      view.render();
    }
    [doseSlider, rateSelect, extentSelect].forEach((el) => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', updateCell));
    updateCell();
  }

  // Protection model: normalized comparison for the same idealized source and radiation type.
  const shieldCanvas = $('shieldScene');
  if (shieldCanvas) {
    const scene = new T.Scene(); lightScene(scene);
    const camera = new T.PerspectiveCamera(39, 1, .1, 100), view = initView(shieldCanvas, scene, camera, new T.Vector3(-.75, -.05, 0));
    meshBox(scene, [7.5, .12, 1.8], [-.6, -1.31, 0], material(0x7f9995));
    const sourceX = -3.35;
    const sourceMat = material(0xe4bd79, 1, { emissive: 0x9c5e25, emissiveIntensity: .55 });
    meshSphere(scene, .29, [sourceX, 0, 0], sourceMat, 24);
    meshSphere(scene, .12, [sourceX, 0, .22], material(0xfff0bf, 1, { emissive: 0xf4ba5e, emissiveIntensity: 1.4 }), 16);
    // A simplified standing figure: visual receiver, not a human dose model.
    const person = new T.Group(); scene.add(person);
    meshSphere(person, .22, [0, .93, 0], material(0xd5c5b8), 18);
    meshSphere(person, .045, [-.07, .96, .195], material(0x43545a), 10);
    meshSphere(person, .045, [.07, .96, .195], material(0x43545a), 10);
    meshBox(person, [.65, .84, .33], [0, .28, 0], material(0x9fb8ae));
    cylinderBetween(person, [-.17, -.18, 0], [-.24, -.96, 0], .11, material(0xb9c8c0));
    cylinderBetween(person, [.17, -.18, 0], [.24, -.96, 0], .11, material(0xb9c8c0));
    cylinderBetween(person, [-.33, .5, 0], [-.75, .03, 0], .085, material(0xb9c8c0));
    cylinderBetween(person, [.33, .5, 0], [.75, .03, 0], .085, material(0xb9c8c0));
    const shieldMat = material(0xb5c7bf, .82, { side: T.DoubleSide });
    const shield = meshBox(scene, [.17, 2.45, 1.3], [-1.5, -.02, -.05], shieldMat);
    const shieldBase = meshBox(scene, [.48, .1, 1.45], [-1.5, -1.18, -.05], material(0x91aaa3));
    const rayGroup = new T.Group(); scene.add(rayGroup);
    const distance = $('distanceSlider'), time = $('timeSlider'), radiation = $('radiationSelect'), shieldChoice = $('shieldSelect');
    const distanceOut = $('distanceOut'), timeOut = $('timeOut'), shieldReadout = $('shieldReadout'), shieldState = $('shieldState'), relativeDose = $('relativeDose');
    const materialsById = { none: { name: 'Экран не установлен' }, paper: { name: 'Бумажный экран' }, plastic: { name: 'Пластиковый экран' }, dense: { name: 'Плотный экран' } };
    // Relative transmission is intentionally illustrative, not tabulated attenuation data.
    const attenuation = {
      alpha: { none: 1, paper: .025, plastic: .012, dense: .008 },
      beta: { none: 1, paper: .62, plastic: .055, dense: .18 },
      gamma: { none: 1, paper: .97, plastic: .91, dense: .48 }
    };
    const radiationInfo = {
      alpha: { color: 0xe4a77d, name: 'альфа-частицы', fact: 'Снаружи альфа-частицы имеют малую проникающую способность; опасность резко меняется при попадании радионуклида внутрь.' },
      beta: { color: 0xefd28e, name: 'бета-частицы', fact: 'Для бета-излучения часто выбирают подходящий низко-Z экран, например пластик; плотные материалы могут породить тормозное излучение.' },
      gamma: { color: 0xaed2d0, name: 'гамма-кванты', fact: 'Плотный экран ослабляет гамма-поток, но требуемая толщина зависит от энергии и не делает поле строго нулевым.' }
    };
    function updateShield() {
      const d = Number(distance.value), minutes = Number(time.value), type = radiation.value, screen = shieldChoice.value;
      const info = radiationInfo[type], trans = attenuation[type][screen];
      const personX = sourceX + d * 1.65, screenX = (sourceX + personX) / 2;
      person.position.set(personX, -.3, 0); shield.position.x = screenX;
      shieldBase.position.x = screenX;
      shield.visible = screen !== 'none';
      shieldBase.visible = screen !== 'none';
      shield.material.color.set(screen === 'dense' ? 0x9b9997 : screen === 'plastic' ? 0xa9c9c4 : 0xd4c9ad);
      clearGroup(rayGroup);
      const rayOffsets = [-.34, 0, .34];
      rayOffsets.forEach((offset, i) => {
        const y = offset;
        const z = 0;
        const color = info.color;
        const personEntry = personX - .32;
        const screenEntry = screen === 'none' ? null : screenX - .1;
        const firstEnd = screenEntry === null ? personEntry : screenEntry;
        line(rayGroup, [[sourceX + .28, 0, z], [firstEnd, y, z]], color, .78);
        if (screenEntry !== null && trans > .03) {
          const tissueEnd = type === 'gamma' ? personX + .4 : personX - .04;
          line(rayGroup, [[screenX + .1, y, z], [tissueEnd, y, z]], color, Math.min(.82, trans));
        } else if (screenEntry === null && type === 'gamma') {
          line(rayGroup, [[personEntry, y, z], [personX + .4, y, z]], color, .55);
        } else if (screenEntry === null && type === 'beta') {
          line(rayGroup, [[personEntry, y, z], [personX - .04, y, z]], color, .55);
        }
        const dotX = screenEntry !== null && trans < .1 ? screenX - .11 : type === 'alpha' ? personEntry : type === 'beta' ? personX - .04 : personX + .4;
        meshSphere(rayGroup, .052, [dotX, y, z], material(color, .96, { emissive: color, emissiveIntensity: .85 }), 10);
      });
      const relative = (minutes / 10) * (1 / (d * d)) * trans;
      distanceOut.textContent = `${fmt(d, 1)} м`; timeOut.textContent = `${minutes} мин`;
      shieldState.textContent = `${info.name} · ${materialsById[screen].name}`;
      relativeDose.textContent = `Относительный индекс: ${fmt(relative, 2)}`;
      shieldReadout.innerHTML = `<strong>${info.fact}</strong><br>В этой упрощённой модели относительный индекс пропорционален времени и приблизительно обратно квадрату расстояния. Сравнивай его только с исходным значением для того же вида излучения.`;
      view.render();
    }
    [distance, time].forEach((el) => el.addEventListener('input', updateShield));
    [radiation, shieldChoice].forEach((el) => el.addEventListener('change', updateShield));
    updateShield();
  }

  const answerButton = $('answerBtn');
  if (answerButton) answerButton.addEventListener('click', () => {
    const quiz = $('answer').closest('.quiz'); quiz.classList.toggle('open');
    const open = quiz.classList.contains('open'); answerButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    answerButton.textContent = open ? 'Скрыть подсказку' : 'Показать подсказку';
  });
})();
