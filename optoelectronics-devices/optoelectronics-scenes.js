(() => {
  'use strict';
  const T = window.THREE;
  const canvas = document.getElementById('scene');
  const panel = document.getElementById('controlPanel');
  const title = document.getElementById('sceneTitle');
  const meter = document.getElementById('sceneMeter');
  const tabs = [...document.querySelectorAll('[data-device]')];
  if (!T) {
    panel.querySelector('#result').textContent = 'Не удалось загрузить 3D-движок. Проверьте подключение к интернету и обновите страницу.';
    return;
  }

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false }); }
  catch (error) { panel.querySelector('#result').textContent = 'Браузер не смог запустить 3D-графику WebGL. Откройте страницу в современном браузере с включённым аппаратным ускорением.'; console.error(error); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x203541, 1);
  const scene = new T.Scene();
  scene.background = new T.Color(0x203541);
  scene.fog = new T.Fog(0x203541, 12, 24);
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
  const cameraTarget = new T.Vector3(0, 0.45, 0);
  let cameraRadius = 9.5, yaw = -0.56, pitch = 0.18, dragging = false, lastX = 0, lastY = 0;
  function placeCamera() {
    camera.position.set(cameraRadius * Math.sin(yaw) * Math.cos(pitch), cameraRadius * Math.sin(pitch) + 1.4, cameraRadius * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(cameraTarget);
  }
  placeCamera();
  scene.add(new T.HemisphereLight(0xddeaf0, 0x293c44, 2.0));
  const keyLight = new T.DirectionalLight(0xffedcf, 2.2); keyLight.position.set(-3, 7, 5); scene.add(keyLight);
  const rimLight = new T.DirectionalLight(0x9fc9d2, 1.25); rimLight.position.set(5, 3, -5); scene.add(rimLight);
  const world = new T.Group(); scene.add(world);
  const apparatus = new T.Group(); world.add(apparatus);
  const rayGroup = new T.Group(); world.add(rayGroup);
  const baseMat = new T.MeshStandardMaterial({ color: 0x526b75, roughness: 0.72, metalness: 0.18 });
  const steelMat = new T.MeshStandardMaterial({ color: 0xb4c6c2, roughness: 0.34, metalness: 0.68 });
  const ceramicMat = new T.MeshStandardMaterial({ color: 0xdde8df, roughness: 0.3, metalness: 0.12 });
  const darkMat = new T.MeshStandardMaterial({ color: 0x344b55, roughness: 0.55, metalness: 0.16 });
  const grid = new T.GridHelper(12, 24, 0x8daeb0, 0x78959d);
  grid.position.y = -0.61; grid.material.transparent = true; grid.material.opacity = 0.22; scene.add(grid);
  const floor = new T.Mesh(new T.PlaneGeometry(100, 100), new T.MeshStandardMaterial({ color: 0x203541, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.64; scene.add(floor);

  const leds = {
    red: { name: 'Красный', wave: 625, volts: 2.0, color: 0xf17e78 },
    green: { name: 'Зелёный', wave: 525, volts: 2.35, color: 0x8dce9e },
    blue: { name: 'Синий', wave: 470, volts: 2.64, color: 0x8db8ed }
  };
  const metals = { Cs: { name: 'Цезий', work: 2.14 }, Na: { name: 'Натрий', work: 2.28 }, Zn: { name: 'Цинк', work: 4.31 } };
  const config = {
    photo: { title: 'Фотоэлемент · внешний фотоэффект', intro: 'Вакуумная колба с фотокатодом и анодом. Свет выбивает электроны; при замкнутой цепи возникает фототок.', aLabel: 'Длина волны света λ', aUnit: 'нм', aMin: 300, aMax: 750, aStep: 1, aStart: 520, bLabel: 'Относительная интенсивность', bUnit: '%', bMin: 0, bMax: 100, bStep: 1, bStart: 70 },
    sensor: { title: 'Фотодатчик · фотодиод', intro: 'Полупроводниковый p–n-переход преобразует падающий свет в ток. Фотодиоды используют в автоматике, пультах и оптической связи.', aLabel: 'Освещённость', aUnit: 'лк', aMin: 0, aMax: 1000, aStep: 10, aStart: 500, bLabel: 'Длина волны λ', bUnit: 'нм', bMin: 400, bMax: 900, bStep: 5, bStart: 650 },
    solar: { title: 'Солнечная батарея · фотовольтаический эффект', intro: 'Внутреннее поле p–n-перехода разделяет носители заряда. Угол между лучами и нормалью панели определяет долю поглощённого потока.', aLabel: 'Угол падения от нормали', aUnit: '°', aMin: 0, aMax: 80, aStep: 1, aStart: 25, bLabel: 'Плотность потока света', bUnit: 'Вт/м²', bMin: 100, bMax: 1200, bStep: 10, bStart: 800 },
    led: { title: 'Светодиод · электролюминесценция', intro: 'При прямом включении электроны и дырки рекомбинируют в p–n-переходе. Энергия перехода определяет цвет излучения.', aLabel: 'Ток через светодиод', aUnit: 'мА', aMin: 0, aMax: 30, aStep: 0.1, aStart: 0, select: true }
  };
  const state = { mode: 'photo', a: 520, b: 70, material: 'red' };
  const model = {};
  const v = (x, y, z) => new T.Vector3(x, y, z);
  function mat(color, roughness = 0.45, metalness = 0.1, extra = {}) { return new T.MeshStandardMaterial({ color, roughness, metalness, ...extra }); }
  function addBox(parent, x, y, z, w, h, d, material, bevel = false) {
    const geo = bevel ? new T.BoxGeometry(w, h, d, 2, 2, 2) : new T.BoxGeometry(w, h, d);
    const mesh = new T.Mesh(geo, material); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function addSphere(parent, x, y, z, r, material, width = 24, height = 16) {
    const mesh = new T.Mesh(new T.SphereGeometry(r, width, height), material); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function addCylinder(parent, start, end, radius, material, radial = 12) {
    const direction = end.clone().sub(start), length = direction.length();
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, length, radial), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(v(0, 1, 0), direction.normalize()); parent.add(mesh); return mesh;
  }
  function addWire(parent, points, color = 0xd6c38f, radius = 0.025) {
    for (let i = 0; i < points.length - 1; i++) addCylinder(parent, points[i], points[i + 1], radius, mat(color, 0.34, 0.45));
  }
  function clearGroup(group) { while (group.children.length) { const child = group.children[group.children.length - 1]; group.remove(child); child.traverse?.(o => { o.geometry?.dispose?.(); }); } }
  function wavelengthColor(nm) {
    const hue = nm < 440 ? 275 : nm < 490 ? 275 - (nm - 440) * 1.45 : nm < 510 ? 203 - (nm - 490) * 2.1 : nm < 580 ? 161 - (nm - 510) * 1.9 : nm < 645 ? 28 - (nm - 580) * 0.43 : 0;
    return new T.Color().setHSL(Math.max(0, hue) / 360, 0.92, 0.64);
  }
  function glowMaterial(color, opacity = 0.95) { return new T.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false }); }
  function beam(parent, start, end, color, radius = 0.018, glow = true) {
    const g = new T.Group(); parent.add(g);
    if (glow) addCylinder(g, start, end, radius * 3, glowMaterial(color, 0.16), 8);
    const core = addCylinder(g, start, end, radius, glowMaterial(color, 0.96), 8);
    return { group: g, core };
  }
  function addBench() {
    addBox(apparatus, 0, -0.5, 0, 7, 0.18, 2.25, baseMat);
    addBox(apparatus, -2.7, -0.91, 0, 0.15, 0.72, 0.18, steelMat);
    addBox(apparatus, 2.7, -0.91, 0, 0.15, 0.72, 0.18, steelMat);
    addBox(apparatus, 0, -0.39, 0.97, 6.2, 0.018, 0.018, steelMat);
  }
  function photoModel() {
    addBench();
    const glass = new T.Mesh(new T.CylinderGeometry(0.68, 0.68, 1.85, 32, 1, true), new T.MeshPhysicalMaterial({ color: 0xc6e6e2, transparent: true, opacity: 0.17, roughness: 0.08, metalness: 0, side: T.DoubleSide }));
    glass.rotation.z = Math.PI / 2; glass.position.set(0.05, 0.28, 0); apparatus.add(glass);
    const rimMat = mat(0xa7c3c0, 0.28, 0.55);
    for (const x of [-0.88, 0.98]) { const rim = new T.Mesh(new T.TorusGeometry(0.68, 0.035, 8, 36), rimMat); rim.rotation.y = Math.PI / 2; rim.position.set(x, 0.28, 0); apparatus.add(rim); }
    addBox(apparatus, -0.48, 0.28, 0, 0.12, 0.9, 0.68, mat(0xd6a573, 0.32, 0.22));
    addBox(apparatus, 0.56, 0.28, 0, 0.1, 0.8, 0.58, ceramicMat);
    addWire(apparatus, [v(-0.48, -0.17, 0), v(-0.48, -0.38, 0), v(-1.15, -0.38, 0)], 0xe5c783);
    addWire(apparatus, [v(0.56, -0.12, 0), v(0.56, -0.38, 0), v(1.18, -0.38, 0)], 0xb2d5cb);
    addSphere(apparatus, -3.0, 0.28, 0, 0.22, mat(0xf1d28d, 0.22, 0, { emissive: 0xb67e30, emissiveIntensity: 0.5 }));
    model.rays = []; model.electrons = [];
    for (let i = 0; i < 7; i++) model.rays.push(beam(rayGroup, v(-2.78, 0.28, (i - 3) * 0.105), v(-0.57, 0.28, (i - 3) * 0.105), 0xffdc92, 0.012));
    for (let i = 0; i < 8; i++) model.electrons.push(addSphere(rayGroup, 5, 0, 0, 0.048, glowMaterial(0xffe09c), 12, 10));
  }
  function sensorModel() {
    addBench();
    addBox(apparatus, -0.2, -0.1, 0, 1.8, 0.62, 1.0, darkMat);
    addBox(apparatus, -0.2, 0.23, 0, 0.8, 0.08, 0.68, mat(0x9bc0bd, 0.22, 0.18, { transparent: true, opacity: 0.75 }));
    addBox(apparatus, 0.18, 0.32, 0, 0.22, 0.18, 0.48, mat(0x8eb5bc, 0.3, 0.25));
    addBox(apparatus, -0.55, 0.36, 0, 0.06, 0.34, 0.5, mat(0xd4a778, 0.32, 0.2));
    addWire(apparatus, [v(-0.55, -0.08, 0), v(-0.55, -0.37, 0), v(-1.1, -0.37, 0)], 0xe5c783);
    addWire(apparatus, [v(0.18, -0.08, 0), v(0.18, -0.37, 0), v(0.78, -0.37, 0)], 0xb2d5cb);
    model.rays = []; model.pairs = []; model.bars = [];
    for (let i = 0; i < 7; i++) model.rays.push(beam(rayGroup, v(-0.2 + (i - 3) * 0.18, 2.4, 0), v(-0.2 + (i - 3) * 0.12, 0.5, 0), 0x9fe0c8, 0.015));
    for (let i = 0; i < 6; i++) { model.pairs.push(addSphere(rayGroup, 0, 0.46, 0, 0.055, glowMaterial(0xffd27d), 12, 10)); model.pairs.push(addSphere(rayGroup, 0, 0.46, 0, 0.045, glowMaterial(0x9ed2f0), 12, 10)); }
    for (let i = 0; i < 5; i++) model.bars.push(addBox(apparatus, -1.15 + i * 0.18, -0.25, 0.6, 0.12, 0.12, 0.1, mat(0x435c63)));
  }
  function solarModel() {
    addBench();
    model.panel = new T.Group(); model.panel.position.set(0.15, -0.12, 0); apparatus.add(model.panel);
    addBox(model.panel, 0, 0, 0, 2.5, 0.1, 1.55, mat(0x68909b, 0.36, 0.22));
    const cellMat = mat(0x457482, 0.38, 0.24);
    for (let x = -1.0; x <= 1.01; x += 0.5) addBox(model.panel, x, 0.055, 0, 0.018, 0.012, 1.46, steelMat);
    for (let z = -0.48; z <= 0.49; z += 0.32) addBox(model.panel, 0, 0.055, z, 2.42, 0.012, 0.018, steelMat);
    for (let x = -0.78; x <= 0.79; x += 0.52) for (let z = -0.32; z <= 0.33; z += 0.32) addBox(model.panel, x, 0.058, z, 0.48, 0.014, 0.28, cellMat);
    addCylinder(apparatus, v(0.15, -0.45, 0), v(0.15, -0.05, 0), 0.07, steelMat);
    addWire(apparatus, [v(0.15, -0.35, 0), v(-0.55, -0.4, 0), v(-0.85, -0.4, 0)], 0xd9c18c);
    model.rays = [];
    for (let i = 0; i < 6; i++) model.rays.push(beam(rayGroup, v(-0.85 + i * 0.3, 3.2, -0.55 + (i % 3) * 0.55), v(0, 0.1, -0.55 + (i % 3) * 0.55), 0xffd98a, 0.024));
  }
  function ledModel() {
    addBench();
    addBox(apparatus, 0, -0.1, 0, 0.92, 0.28, 0.72, mat(0x526b72, 0.4, 0.28));
    addBox(apparatus, 0, 0.1, 0, 0.58, 0.28, 0.5, mat(0x9aadb0, 0.28, 0.25));
    addWire(apparatus, [v(-0.16, 0.24, 0), v(-0.16, -0.39, 0), v(-0.75, -0.39, 0)], 0xd6bf8e, 0.04);
    addWire(apparatus, [v(0.16, 0.24, 0), v(0.16, -0.39, 0), v(0.75, -0.39, 0)], 0xaed2c8, 0.04);
    const dome = new T.Mesh(new T.SphereGeometry(0.35, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshPhysicalMaterial({ color: 0xe9e5d4, roughness: 0.18, transmission: 0.35, transparent: true, opacity: 0.8, emissive: 0x000000 }));
    dome.position.set(0, 0.38, 0); apparatus.add(dome); model.dome = dome;
    model.rays = [];
    for (let i = 0; i < 7; i++) model.rays.push(beam(rayGroup, v(0, 0.48, 0), v(1.1, 1.65, (i - 3) * 0.26), 0xf17e78, 0.017));
  }
  function updateMeter(label, value, ratio, color) {
    meter.querySelector('.meter-title').textContent = label;
    meter.querySelector('.meter-value').textContent = value;
    meter.querySelector('.meter-fill').style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    meter.querySelector('.meter-fill').style.backgroundColor = color || '#e8cc8b';
  }
  function energyEV(nm) { return 1240 / nm; }
  function fixed(n, digits = 1) { return Number(n).toFixed(digits).replace('.', ','); }
  function rebuildScene() {
    clearGroup(apparatus); clearGroup(rayGroup); model.rays = [];
    if (state.mode === 'photo') photoModel();
    if (state.mode === 'sensor') sensorModel();
    if (state.mode === 'solar') solarModel();
    if (state.mode === 'led') ledModel();
    updateScene();
  }
  function updateScene() {
    const c = state.mode;
    if (c === 'photo') {
      const color = wavelengthColor(state.a), e = energyEV(state.a), emits = e >= metals.Cs.work, count = Math.round(state.b / 14);
      model.rays.forEach((r, i) => { r.group.visible = i < count; r.core.material.color.copy(color); r.group.scale.setScalar(0.82 + state.b / 250); });
      model.electrons.forEach((p, i) => { p.visible = emits && i < Math.min(count, 6); p.position.set(-0.3 + ((animationTime * 0.7 + i * 0.19) % 1) * 0.75, 0.25 + Math.sin(animationTime * 2 + i) * 0.15, (i % 4 - 1.5) * 0.12); });
      const current = emits ? state.b * 0.12 : 0;
      updateMeter('Фотоэффект', emits ? `Eₖ ≈ ${fixed(e - metals.Cs.work, 2)} эВ · Iф ≈ ${fixed(current, 1)} усл. ед.` : 'Порог не достигнут · фотоэмиссии нет', emits ? state.b / 100 : 0, `#${color.getHexString()}`);
      document.getElementById('result').innerHTML = `<strong>Энергия фотона:</strong> ${fixed(e, 2)} эВ. Для цезия порог λ₀ ≈ 579 нм. ${emits ? `Фотоны выбивают электроны; Eₖ ≈ ${fixed(e - metals.Cs.work, 2)} эВ.` : 'Энергии фотона недостаточно для выхода электрона.'} Увеличение интенсивности меняет число фотонов и фототок, но не энергию каждого электрона.`;
    }
    if (c === 'sensor') {
      const color = wavelengthColor(state.b), response = Math.exp(-Math.pow((state.b - 680) / 230, 2)), current = state.a * 0.018 * response;
      const count = Math.round(state.a / 145);
      model.rays.forEach((r, i) => { r.group.visible = i < count; r.core.material.color.copy(color); });
      model.pairs.forEach((p, i) => { p.visible = i < Math.min(12, Math.round(state.a / 90)); const pair = Math.floor(i / 2); p.position.set(-0.48 + (pair % 3) * 0.2 + (i % 2) * 0.07, 0.35 + ((animationTime * 0.55 + pair * 0.17) % 1) * 0.68, (pair - 2) * 0.08); });
      model.bars.forEach((bar, i) => { const on = (i + 1) / 5 <= state.a / 1000; bar.material.color.set(on ? 0x9ed0b2 : 0x435c63); });
      updateMeter('Фототок фотодиода', `${fixed(current, 1)} мкА · λ ${fixed(state.b, 0)} нм`, state.a / 1000 * response, `#${color.getHexString()}`);
      document.getElementById('result').innerHTML = `<strong>Отклик фотодиода:</strong> при ${fixed(state.a, 0)} лк и λ = ${fixed(state.b, 0)} нм относительный фототок ≈ ${fixed(current, 1)} мкА в условной модели. Освещённость задаёт число носителей, а спектральная чувствительность зависит от материала.`;
    }
    if (c === 'solar') {
      const angle = state.a * Math.PI / 180, eff = Math.cos(angle), power = 0.20 * state.b * 0.012 * eff;
      model.panel.rotation.z = angle; model.panel.updateMatrixWorld(true);
      model.rays.forEach((r, i) => { r.group.visible = i < Math.max(1, Math.round(state.b / 200)); r.core.material.color.set(0xffd98a); const localX = -0.9 + (i % 3) * 0.8, localZ = -0.42 + Math.floor(i / 3) * 0.84; const target = v(localX, 0.08, localZ).applyMatrix4(model.panel.matrixWorld); r.group.position.set(target.x, target.y - 0.1, target.z - (-0.55 + (i % 3) * 0.55)); });
      updateMeter('Мощность солнечной панели', `${fixed(power, 2)} Вт · cos θ = ${fixed(eff, 2)}`, power / 2.88, '#e9ce8e');
      document.getElementById('result').innerHTML = `<strong>Оценка мощности:</strong> P ≈ ηES cos θ. Для площади 0,012 м², η = 20%, E = ${fixed(state.b, 0)} Вт/м² и θ = ${fixed(state.a, 0)}° получается около ${fixed(power, 2)} Вт. При θ = 0° лучи падают по нормали и мощность максимальна.`;
    }
    if (c === 'led') {
      const led = leds[state.material], brightness = state.a / 30;
      model.dome.material.color.set(led.color); model.dome.material.emissive.set(led.color); model.dome.material.emissiveIntensity = brightness * 1.4;
      model.rays.forEach((r, i) => { r.group.visible = i < Math.ceil(state.a / 4.3); r.core.material.color.set(led.color); r.group.scale.setScalar(0.8 + brightness * 0.9); });
      updateMeter('Яркость светодиода', `${led.name} · ${fixed(state.a, 1)} мА · λ ≈ ${led.wave} нм`, brightness, `#${new T.Color(led.color).getHexString()}`);
      document.getElementById('result').innerHTML = `<strong>Цвет и энергия:</strong> ${led.name.toLowerCase()} свет, λ ≈ ${led.wave} нм; энергия фотона E ≈ ${fixed(energyEV(led.wave), 2)} эВ. Ток ${fixed(state.a, 1)} мА усиливает световой поток, но практически не меняет энергию отдельного фотона.`;
    }
  }
  function buildPanel() {
    const c = config[state.mode]; title.textContent = c.title;
    const control = (id, label, min, max, step, value, unit, digits = 0) => `<div class="control"><label for="${id}"><span>${label}</span><output id="${id}Out">${fixed(value, digits)} ${unit}</output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
    let controls = '';
    if (state.mode === 'led') controls = control('a', c.aLabel, c.aMin, c.aMax, c.aStep, state.a, c.aUnit, 1) + `<div class="control"><label for="material"><span>Материал / цвет излучения</span></label><select id="material"><option value="red">Красный · λ ≈ 625 нм</option><option value="green">Зелёный · λ ≈ 525 нм</option><option value="blue">Синий · λ ≈ 470 нм</option></select></div>`;
    else controls = control('a', c.aLabel, c.aMin, c.aMax, c.aStep, state.a, c.aUnit) + control('b', c.bLabel, c.bMin, c.bMax, c.bStep, state.b, c.bUnit);
    panel.innerHTML = `<div class="intro"><div class="label">Выбранное устройство</div><h3>${state.mode === 'photo' ? 'Фотоэлемент' : state.mode === 'sensor' ? 'Фотодатчик' : state.mode === 'solar' ? 'Солнечная батарея' : 'Светодиод'}</h3><p style="margin-top:9px">${c.intro}</p></div>${controls}<div class="result" id="result"></div>`;
    if (state.mode === 'led') document.getElementById('material').value = state.material;
    document.getElementById('result').textContent = 'Измени условия и наблюдай за моделью.';
  }
  function onControl(event) {
    const el = event.target;
    if (!el) return;
    if (el.id === 'a' || el.id === 'b') {
      state[el.id] = Number(el.value);
      const out = document.getElementById(el.id + 'Out');
      if (out) out.textContent = `${fixed(state[el.id], el.id === 'a' && state.mode === 'led' ? 1 : 0)} ${el.id === 'a' ? config[state.mode].aUnit : config[state.mode].bUnit}`;
      updateScene();
    } else if (el.id === 'material') { state.material = el.value; updateScene(); }
  }
  panel.addEventListener('input', onControl);
  panel.addEventListener('change', onControl);
  tabs.forEach(tab => tab.addEventListener('click', () => {
    state.mode = tab.dataset.device; tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    state.a = config[state.mode].aStart; state.b = config[state.mode].bStart || 0;
    if (state.mode === 'led') state.material = 'red';
    buildPanel(); rebuildScene();
  }));
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; yaw += (e.clientX - lastX) * 0.008; pitch = Math.max(-0.45, Math.min(0.8, pitch + (e.clientY - lastY) * 0.006)); lastX = e.clientX; lastY = e.clientY; placeCamera(); });
  canvas.addEventListener('pointerup', () => { dragging = false; }); canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); cameraRadius = Math.max(6.2, Math.min(14, cameraRadius * Math.exp(e.deltaY * 0.001))); placeCamera(); }, { passive: false });
  document.getElementById('resetView').addEventListener('click', () => { yaw = -0.56; pitch = 0.18; cameraRadius = 9.5; placeCamera(); });
  const resize = () => { const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); window.addEventListener('resize', resize);
  let animationTime = 0;
  renderer.setAnimationLoop((_, delta = 0.016) => { animationTime += Math.min(delta, 0.05); renderer.render(scene, camera); });
  buildPanel(); rebuildScene(); resize();
})();
