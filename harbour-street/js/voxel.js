/* =========================================================================
   Harbour Street — voxel Kingston
   A voxel-style 3D market district on the Kingston waterfront, built with
   Three.js. Every listed company is a tower: height follows market cap,
   the rooftop beacon glows green or red with the day's move, and a halted
   stock flashes amber. Click a tower to open its dashboard.
   Sector districts sit around the JSE building at 40 Harbour Street, with
   the Blue Mountains behind, the harbour in front, and weather that turns
   ugly when a hurricane event hits the simulation.
   ========================================================================= */

'use strict';

const VoxelCity = (() => {

  const V = 1;                 // voxel size
  const COLORS = {
    deepNavy: 0x0A1A3A, night: 0x060f24, daySky: 0x7EC8F2,
    sea: 0x1B6FA8, seaDeep: 0x0F4C81,
    sand: 0xE8D5A3, grass: 0x3E8E5A, grassDark: 0x2F7048,
    road: 0x27324A, roadLine: 0x3A4A6B,
    mountain: 0x24406B, mountainFar: 0x1A3055,
    jseGold: 0xF5A623, jseTeal: 0x1FC8C8,
    trunk: 0x8A5A33, palm: 0x2E9E58,
    up: 0x2ECC71, down: 0xEE5A52, flat: 0x8B9DC3, halt: 0xFFD93D,
  };

  let renderer, scene, camera, raycaster, pointer;
  let buildings = {};          // sym -> {group, beacon, base, label, height}
  let selectHalo = null;
  let sun, moon, hemi, ambient, skyMat = null;
  let seaMesh, seaGeo, seaBase;
  let rain = null, rainMat = null;
  let palms = [];
  let clouds = [];
  let onPick = null;
  let clock = 0;
  let camState = { theta: Math.PI * 0.28, phi: Math.PI * 0.32, dist: 74, target: null, drag: null };
  let canvasEl = null;

  // ----------------------------------------------------------------------
  function init(canvas, companies, sectors, pickCallback) {
    canvasEl = canvas;
    onPick = pickCallback;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(COLORS.deepNavy, 90, 220);

    camera = new THREE.PerspectiveCamera(50, 1, 0.5, 500);
    camState.target = new THREE.Vector3(0, 2, 0);

    ambient = new THREE.AmbientLight(0xffffff, 0.55);
    hemi = new THREE.HemisphereLight(0xbfe3ff, 0x2a3550, 0.7);
    sun = new THREE.DirectionalLight(0xfff2d0, 1.4);
    sun.position.set(40, 60, 20);
    moon = new THREE.DirectionalLight(0x9db8e8, 0);
    moon.position.set(-40, 50, -20);
    scene.add(ambient, hemi, sun, moon);

    buildTerrain();
    buildSea();
    buildMountains();
    buildJseHQ();
    buildDistricts(companies, sectors);
    buildPalms();
    buildClouds();
    buildHalo();

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    bindControls(canvas);
    resize();
    return api;
  }

  // ---- voxel helpers ----------------------------------------------------
  function box(w, h, d, color, emissive) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000, emissiveIntensity: emissive ? 1 : 0 })
    );
    return m;
  }

  // ---- terrain: voxel island platform -----------------------------------
  function buildTerrain() {
    const size = 64;                       // island span in voxels
    const half = size / 2;
    const geo = new THREE.BoxGeometry(V, V, V);
    const count = size * size;
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), count + 800);
    const mat4 = new THREE.Matrix4();
    const color = new THREE.Color();
    let i = 0;
    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        // island shape: rounded, with the south edge (positive z) as waterfront
        const dx = x / half, dz = z / (half * 1.15);
        const r = Math.sqrt(dx * dx + dz * dz);
        if (r > 1) continue;
        const isBeach = r > 0.88;
        const isRoad = (Math.abs(x % 14) < 1.5 || Math.abs(z % 14) < 1.5) && !isBeach;
        mat4.setPosition(x * V, -0.5 * V, z * V);
        mesh.setMatrixAt(i, mat4);
        if (isBeach) color.setHex(COLORS.sand);
        else if (isRoad) color.setHex(COLORS.road);
        else color.setHex(((x * 7 + z * 13) % 5 === 0) ? COLORS.grassDark : COLORS.grass);
        mesh.setColorAt(i, color);
        i++;
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
  }

  // ---- sea with gentle voxel-ish waves ----------------------------------
  function buildSea() {
    seaGeo = new THREE.PlaneGeometry(400, 400, 48, 48);
    seaGeo.rotateX(-Math.PI / 2);
    seaBase = Float32Array.from(seaGeo.attributes.position.array);
    const mat = new THREE.MeshLambertMaterial({ color: COLORS.sea, transparent: true, opacity: 0.92 });
    seaMesh = new THREE.Mesh(seaGeo, mat);
    seaMesh.position.y = -1.05;
    scene.add(seaMesh);
  }

  // ---- Blue Mountains backdrop ------------------------------------------
  function buildMountains() {
    const ridge = [[-90, 14, -80], [-58, 22, -88], [-24, 30, -95], [8, 26, -90], [40, 34, -98], [72, 20, -85], [100, 15, -92]];
    for (const [x, h, z] of ridge) {
      const m = box(34, h, 26, COLORS.mountain);
      m.position.set(x, h / 2 - 2, z);
      scene.add(m);
      const far = box(40, h * 0.7, 22, COLORS.mountainFar);
      far.position.set(x + 12, h * 0.35 - 2, z - 18);
      scene.add(far);
    }
  }

  // ---- the JSE building at 40 Harbour Street ----------------------------
  function buildJseHQ() {
    const g = new THREE.Group();
    const base = box(7, 3, 7, 0xDDE6F2); base.position.y = 1.5; g.add(base);
    const mid = box(5.4, 3, 5.4, 0xF0F5FB); mid.position.y = 4.5; g.add(mid);
    const top = box(4, 2.4, 4, COLORS.jseTeal); top.position.y = 7.2; g.add(top);
    const sign = box(4.6, 1, 1, COLORS.jseGold, COLORS.jseGold); sign.position.set(0, 3.4, 3.6); g.add(sign);
    const flag = box(0.3, 4, 0.3, 0xCCCCCC); flag.position.set(3, 10, 3); g.add(flag);
    const banner = box(2, 1.2, 0.1, COLORS.jseGold, 0x664400); banner.position.set(4.2, 11.2, 3); g.add(banner);
    g.position.set(0, 0, 16);            // on the waterfront, facing the sea
    g.userData.jse = true;
    scene.add(g);
    const label = makeLabel('JSE · 40 Harbour St', '#FFD93D', 30);
    label.position.set(0, 13, 16);
    label.scale.set(8.5, 2.1, 1);
    scene.add(label);
  }

  // ---- company towers in sector districts -------------------------------
  function buildDistricts(companies, sectors) {
    // group companies by sector
    const bySector = {};
    for (const co of companies) (bySector[co.sector] = bySector[co.sector] || []).push(co);
    const sectorKeys = Object.keys(bySector);

    // district anchor points arranged in a ring behind the waterfront
    const anchors = [];
    const rings = [[-14, 20], [16, 22], [-26, 6], [28, 6], [-8, 2], [10, 4], [-22, -10], [0, -12], [22, -10], [-14, -22], [8, -24], [-28, -18], [26, -22], [16, -6]];
    for (let i = 0; i < sectorKeys.length; i++) anchors.push(rings[i % rings.length]);

    sectorKeys.forEach((sec, si) => {
      const list = bySector[sec].slice().sort((a, b) => b.price * b.sharesOut - a.price * a.sharesOut);
      const [ax, az] = anchors[si];
      const cols = Math.ceil(Math.sqrt(list.length));
      list.forEach((co, idx) => {
        const gx = ax + (idx % cols) * 4.5 - (cols - 1) * 2.25;
        const gz = az + Math.floor(idx / cols) * 4.5;
        buildTower(co, sectors[co.sector], gx, gz);
      });
    });
  }

  function buildTower(co, sector, x, z) {
    const cap = co.price * co.sharesOut;                     // J$ millions
    // log-scaled height: J$0.1B -> ~3 voxels, J$180B -> ~15
    const h = Math.max(3, Math.min(16, Math.round(2.2 * Math.log10(cap / 30))));
    const g = new THREE.Group();
    const c = new THREE.Color(sector.color);
    const dark = c.clone().multiplyScalar(0.75);

    // voxel stack with setbacks — classic blocky skyline
    let y = 0;
    let w = co.market === 'junior' ? 2.2 : 3;
    const tiers = h <= 4 ? 1 : h <= 8 ? 2 : 3;
    for (let t = 0; t < tiers; t++) {
      const th = Math.ceil(h / tiers);
      const tier = box(w, th, w, t % 2 === 0 ? c.getHex() : dark.getHex());
      tier.position.y = y + th / 2;
      tier.userData.sym = co.sym;
      g.add(tier);
      y += th; w *= 0.78;
    }
    // windows: thin emissive strips
    const win = box(w * 1.05, 0.25, w * 1.05, 0xffffff, 0xBBD7FF);
    win.material.emissiveIntensity = 0.35;
    win.position.y = y * 0.45;
    win.userData.sym = co.sym;
    g.add(win);

    // rooftop beacon — colour driven by the day's price move
    const beacon = box(0.9, 0.9, 0.9, COLORS.flat, COLORS.flat);
    beacon.position.y = y + 0.45;
    beacon.userData.sym = co.sym;
    g.add(beacon);

    g.position.set(x, 0, z);
    g.userData.sym = co.sym;
    scene.add(g);

    const label = makeLabel(co.sym, '#FFFFFF', 34);
    label.position.set(x, y + 2.2, z);
    label.scale.set(6.5, 1.7, 1);
    scene.add(label);

    buildings[co.sym] = { group: g, beacon, label, height: y, baseY: y };
  }

  function makeLabel(text, color, fontPx) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.font = `800 ${fontPx}px Montserrat, Inter, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    return sp;
  }

  // ---- palms, clouds, halo ----------------------------------------------
  function buildPalms() {
    const spots = [[-6, 26], [7, 27], [-18, 24], [20, 26], [-30, 12], [31, 14], [-12, 28], [14, 28]];
    for (const [x, z] of spots) {
      const g = new THREE.Group();
      const trunk = box(0.5, 4, 0.5, COLORS.trunk); trunk.position.y = 2; g.add(trunk);
      for (let a = 0; a < 5; a++) {
        const leaf = box(2.6, 0.3, 0.7, COLORS.palm);
        leaf.position.set(Math.cos(a * 1.256) * 1.2, 4.1, Math.sin(a * 1.256) * 1.2);
        leaf.rotation.y = -a * 1.256;
        leaf.rotation.z = 0.28;
        g.add(leaf);
      }
      g.position.set(x, 0, z);
      scene.add(g);
      palms.push(g);
    }
  }

  function buildClouds() {
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const n = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const puff = box(4 + Math.random() * 4, 1.6, 3, 0xffffff);
        puff.material.transparent = true; puff.material.opacity = 0.85;
        puff.position.set(j * 3 - n, Math.random(), Math.random() * 2);
        g.add(puff);
      }
      g.position.set(Math.random() * 160 - 80, 32 + Math.random() * 10, Math.random() * 120 - 70);
      scene.add(g);
      clouds.push(g);
    }
  }

  function buildHalo() {
    const geo = new THREE.RingGeometry(2.6, 3.3, 4);
    geo.rotateX(-Math.PI / 2);
    selectHalo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xFFD93D, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    selectHalo.visible = false;
    selectHalo.position.y = 0.15;
    scene.add(selectHalo);
  }

  // ---- rain particle system (storm / hurricane) -------------------------
  function buildRain() {
    const N = 2400;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = Math.random() * 140 - 70;
      pos[i * 3 + 1] = Math.random() * 50;
      pos[i * 3 + 2] = Math.random() * 140 - 70;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rainMat = new THREE.PointsMaterial({ color: 0xAFC8E8, size: 0.22, transparent: true, opacity: 0.7 });
    rain = new THREE.Points(geo, rainMat);
    rain.visible = false;
    scene.add(rain);
  }

  // ---- camera controls: drag orbit, wheel zoom, touch -------------------
  function bindControls(canvas) {
    let lastPinch = 0;
    canvas.addEventListener('pointerdown', (e) => {
      camState.drag = { x: e.clientX, y: e.clientY, moved: false, button: e.button };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!camState.drag) return;
      const dx = e.clientX - camState.drag.x, dy = e.clientY - camState.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) camState.drag.moved = true;
      if (camState.drag.button === 2) {  // right-drag pans
        const s = camState.dist * 0.0016;
        const fwd = new THREE.Vector3(Math.sin(camState.theta), 0, Math.cos(camState.theta));
        const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
        camState.target.addScaledVector(right, dx * s);
        camState.target.addScaledVector(fwd, dy * s);
        camState.target.x = Math.max(-45, Math.min(45, camState.target.x));
        camState.target.z = Math.max(-45, Math.min(45, camState.target.z));
      } else {
        camState.theta -= dx * 0.0055;
        camState.phi = Math.max(0.12, Math.min(1.35, camState.phi - dy * 0.004));
      }
      camState.drag.x = e.clientX; camState.drag.y = e.clientY;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (camState.drag && !camState.drag.moved && camState.drag.button === 0) pickAt(e);
      camState.drag = null;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      camState.dist = Math.max(18, Math.min(150, camState.dist * (1 + e.deltaY * 0.001)));
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // pinch zoom
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (lastPinch) camState.dist = Math.max(18, Math.min(150, camState.dist * (lastPinch / d)));
        lastPinch = d;
      }
    }, { passive: true });
    canvas.addEventListener('touchend', () => { lastPinch = 0; });
  }

  function pickAt(e) {
    const rect = canvasEl.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o) {
        if (o.userData && o.userData.sym) { onPick && onPick(o.userData.sym); return; }
        o = o.parent;
      }
    }
  }

  // ---- selection --------------------------------------------------------
  function setSelected(sym) {
    if (!sym || !buildings[sym]) { selectHalo.visible = false; return; }
    const b = buildings[sym];
    selectHalo.visible = true;
    selectHalo.position.x = b.group.position.x;
    selectHalo.position.z = b.group.position.z;
  }

  function focusOn(sym) {
    if (!buildings[sym]) return;
    const b = buildings[sym];
    camState.target.x = b.group.position.x;
    camState.target.z = b.group.position.z;
    camState.dist = Math.min(camState.dist, 46);
  }

  // ---- per-frame update -------------------------------------------------
  const dayTop = new THREE.Color(COLORS.daySky);
  const duskTop = new THREE.Color(0xF08C5A);
  const nightTop = new THREE.Color(COLORS.night);
  const tmpColor = new THREE.Color();

  function update(dt, state) {
    clock += dt;
    if (!rain) buildRain();

    // --- day/night cycle (timeOfDay: 0=midnight .. 0.5=noon) ---
    const tod = state.timeOfDay;
    const sunAngle = (tod - 0.25) * Math.PI * 2;          // sunrise at 0.25
    const dayness = Math.max(0, Math.sin(sunAngle));       // 0 night, 1 noon
    const duskness = Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 3);
    sun.position.set(Math.cos(sunAngle) * 60, Math.sin(sunAngle) * 60, 25);
    sun.intensity = 1.5 * dayness;
    moon.intensity = 0.35 * (1 - dayness);
    ambient.intensity = 0.28 + 0.35 * dayness;
    hemi.intensity = 0.3 + 0.45 * dayness;

    let weatherDim = 1;
    if (state.weather === 'storm') weatherDim = 0.55;
    if (state.weather === 'hurricane') weatherDim = 0.3;

    tmpColor.copy(nightTop).lerp(dayTop, dayness * weatherDim);
    if (duskness > 0 && state.weather === null) tmpColor.lerp(duskTop, duskness * 0.5);
    renderer.setClearColor(tmpColor);
    scene.fog.color.copy(tmpColor);
    scene.fog.near = state.weather === 'hurricane' ? 40 : 90;
    scene.fog.far = state.weather === 'hurricane' ? 120 : 220;

    // --- sea waves ---
    const p = seaGeo.attributes.position;
    const rough = state.weather === 'hurricane' ? 2.6 : state.weather === 'storm' ? 1.5 : 0.55;
    for (let i = 0; i < p.count; i++) {
      const x = seaBase[i * 3], z = seaBase[i * 3 + 2];
      p.array[i * 3 + 1] = Math.sin(x * 0.12 + clock * 1.4) * Math.cos(z * 0.1 + clock * 0.9) * rough;
    }
    p.needsUpdate = true;

    // --- rain + wind ---
    const raining = state.weather === 'storm' || state.weather === 'hurricane';
    rain.visible = raining;
    if (raining) {
      const rp = rain.geometry.attributes.position;
      const speed = state.weather === 'hurricane' ? 55 : 30;
      const slant = state.weather === 'hurricane' ? 18 : 5;
      for (let i = 0; i < rp.count; i++) {
        rp.array[i * 3 + 1] -= speed * dt;
        rp.array[i * 3] -= slant * dt;
        if (rp.array[i * 3 + 1] < 0) {
          rp.array[i * 3 + 1] = 45 + Math.random() * 8;
          rp.array[i * 3] = Math.random() * 140 - 70;
        }
      }
      rp.needsUpdate = true;
    }

    // palms sway harder in weather
    const sway = state.weather === 'hurricane' ? 0.5 : state.weather === 'storm' ? 0.22 : 0.06;
    for (let i = 0; i < palms.length; i++) {
      palms[i].rotation.z = Math.sin(clock * (2 + i * 0.3)) * sway;
    }

    // clouds drift
    for (const cl of clouds) {
      cl.position.x += dt * (state.weather === 'hurricane' ? 14 : 2.2);
      if (cl.position.x > 100) cl.position.x = -100;
      cl.children.forEach(ch => { ch.material.opacity = raining ? 0.5 : 0.85; });
    }

    // --- beacons: price change colour, halted flash ---
    if (state.stocks) {
      for (const sym of Object.keys(buildings)) {
        const st = state.stocks[sym];
        if (!st) continue;
        const b = buildings[sym];
        const chg = (st.price - st.prevClose) / st.prevClose;
        let col;
        if (st.halted) col = (Math.floor(clock * 4) % 2 === 0) ? COLORS.halt : 0x333333;
        else if (chg > 0.001) col = COLORS.up;
        else if (chg < -0.001) col = COLORS.down;
        else col = COLORS.flat;
        b.beacon.material.color.setHex(col);
        b.beacon.material.emissive.setHex(col);
        b.beacon.material.emissiveIntensity = 0.5 + 0.4 * Math.abs(Math.sin(clock * 2.5));
        // big movers gently bounce their beacon
        const bounce = Math.min(0.6, Math.abs(chg) * 6);
        b.beacon.position.y = b.baseY + 0.45 + Math.abs(Math.sin(clock * 3)) * bounce;
      }
    }

    // selection halo pulse
    if (selectHalo.visible) {
      selectHalo.rotation.y = clock * 1.2;
      selectHalo.material.opacity = 0.55 + 0.35 * Math.sin(clock * 4);
    }

    // --- camera ---
    const ct = camState.target;
    camera.position.set(
      ct.x + camState.dist * Math.sin(camState.theta) * Math.cos(camState.phi),
      ct.y + camState.dist * Math.sin(camState.phi),
      ct.z + camState.dist * Math.cos(camState.theta) * Math.cos(camState.phi)
    );
    // hurricane shake
    if (state.weather === 'hurricane') {
      camera.position.x += (Math.random() - 0.5) * 0.3;
      camera.position.y += (Math.random() - 0.5) * 0.3;
    }
    camera.lookAt(ct);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const api = { init, update, resize, setSelected, focusOn };
  return api;
})();
