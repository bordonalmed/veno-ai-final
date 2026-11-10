/* eslint-disable no-mixed-operators */
// Mapa 3D do MMII Venoso: gera um membro inferior em 3D a partir dos MESMOS
// achados do Map 2D (veias, segmentos de refluxo, diâmetros, perfurantes e
// varizes desenhadas) e permite aproximar até ver a veia por dentro, com as
// válvulas e o fluxo. Ilustração educativa — não é imagem do exame.
//
// iniciarMapa3D(raiz, exame, lado) monta tudo dentro do elemento `raiz`
// (marcação em Mapa3D.js, elementos achados por data-m3d) e devolve uma
// função que desliga e libera a memória da placa de vídeo.
import * as THREE from "three";
import * as G from "../../utils/vascularMapping";

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const num = (x) => x.toFixed(1).replace(".", ",");
// interpolação linear por trechos: tabela [[x, y], ...] com x crescente
const porTrechos = (x, t) => { if (x <= t[0][0]) return t[0][1]; for (let i = 0; i < t.length - 1; i++) if (x <= t[i + 1][0]) return lerp(t[i][1], t[i + 1][1], (x - t[i][0]) / (t[i + 1][0] - t[i][0])); return t[t.length - 1][1]; };
const NS = "http://www.w3.org/2000/svg";
const RUIM = "pérvia e incompetente";

export function iniciarMapa3D(raiz, exame, ladoMembro) {
  const $ = (id) => raiz.querySelector('[data-m3d="' + id + '"]');
  const ex = exame;
  const SX = ladoMembro === "Direito" ? -1 : 1; // a perna direita é a esquerda espelhada
  let vivo = true, rafId = 0, tGerar2 = 0;
  // todo ouvinte passa por aqui para sair junto quando o 3D fecha
  const ouvintes = [];
  const ouvir = (el, tipo, fn, op) => { el.addEventListener(tipo, fn, op); ouvintes.push([el, tipo, fn, op]); };
  // =====================================================================
  //  3D: A PERNA GERADA A PARTIR DO MAPA
  // =====================================================================
  const T = THREE, palco = raiz, v3d = $('v3d'), veu = $('veu');
  // canvas novo a cada abertura: um contexto WebGL perdido não volta
  const canvas = $('gl').cloneNode(false); $('gl').replaceWith(canvas);
  let renderer = null;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
  const modo3d = true;
  if (!renderer) {
    $('semgl').hidden = false; canvas.hidden = true; veu.style.opacity = '0';
    for (const id of ['bNomes', 'rolagem']) $(id).hidden = true;
    const ctl = raiz.querySelector('.m3d-controles'); if (ctl) ctl.hidden = true;
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;

  const SISTOLE = 1.5, CICLO = 4.3, DUR_REFLUXO = 2.3, VMAX = 5.2;
  const st = { nivel: 'perna', dil: 0, o: 0, t: 0, tc: 0, v: 0, pausado: false, doppler: false, sel: 0, trocando: false, pronto: false, semZoomAte: 0 };
  function velocidade(tc, dil) {
    if (tc < SISTOLE) return Math.pow(Math.sin(Math.PI * tc / SISTOLE), 0.8);
    const tau = tc - SISTOLE, vN = tau < 0.22 ? -0.35 * Math.sin(Math.PI * tau / 0.22) : 0; let vR = 0;
    if (tau < DUR_REFLUXO) { const sobe = Math.min(1, tau / 0.25), cai = Math.pow(Math.max(0, 1 - Math.max(0, tau - 0.25) / (DUR_REFLUXO - 0.25)), 0.9); vR = -0.85 * sobe * cai; }
    return lerp(vN, vR, dil);
  }

  // ---------- a perna (esquerda; 1 unidade = 10 cm; medial = -x, anterior = +z) ----------
  const cenaP = new T.Scene(); cenaP.background = new T.Color(0x0d141f);
  const camP3 = new T.PerspectiveCamera(45, 1, 0.05, 80); cenaP.add(camP3);
  cenaP.add(new T.HemisphereLight(0xffffff, 0x1a2636, 0.95));
  const luzP = new T.DirectionalLight(0xffffff, 0.55); luzP.position.set(-0.4, 0.5, 1); camP3.add(luzP);
  const SEC = [[4.3, .92, .98, 0, 0], [3.6, .9, .96, 0, 0], [2.6, .8, .88, -.02, .02], [1.6, .68, .74, -.04, .03], [.8, .58, .62, -.05, .03], [.2, .54, .58, -.05, .05], [-.4, .5, .55, -.04, 0], [-1.2, .56, .66, -.03, -.1], [-2.0, .46, .52, -.02, -.08], [-2.8, .34, .38, 0, -.04], [-3.4, .28, .33, 0, -.02], [-3.85, .28, .34, 0, 0]];
  const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  function secao(y) {
    let i = 0; while (i < SEC.length - 2 && y < SEC[i + 1][0]) i++;
    const a = SEC[Math.max(0, i - 1)], b = SEC[i], c = SEC[i + 1], d = SEC[Math.min(SEC.length - 1, i + 2)], t = clamp((y - b[0]) / (c[0] - b[0]), 0, 1), o = [];
    for (let k = 1; k < 5; k++) o.push(cr(a[k], b[k], c[k], d[k], t));
    o[2] *= SX;
    return o;
  }
  // ponto na perna: altura y, ângulo (0° lateral, 90° anterior, 180° medial, 270° posterior), fração do raio até a pele
  function ponto(y, graus, frac) { const s = secao(y), a = graus * Math.PI / 180; return new T.Vector3(s[2] + SX * frac * s[0] * Math.cos(a), y, s[3] + frac * s[1] * Math.sin(a)); }
  function casca(aneis) {
    const M = aneis[0].length, pos = [], idx = [];
    for (const a of aneis) for (const p of a) pos.push(p.x, p.y, p.z);
    for (let i = 0; i < aneis.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M; idx.push(a, b, c, b, d, c); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const MP = 44, aneisPerna = [], aneisPe = [];
  const anel = (f) => { const a = []; for (let j = 0; j < MP; j++) a.push(f(j / MP * Math.PI * 2)); return a; };
  aneisPerna.push(anel(() => new T.Vector3(0, 4.3, 0)));
  for (let i = 0; i <= 66; i++) { const y = lerp(4.3, -3.85, i / 66), s = secao(y); aneisPerna.push(anel((a) => new T.Vector3(s[2] + SX * s[0] * Math.cos(a), y, s[3] + s[1] * Math.sin(a)))); }
  aneisPerna.push(anel(() => new T.Vector3(0, -3.85, 0)));
  const PE = [[-.62, .03, .25], [-.5, .2, .62], [-.3, .29, .78], [0, .33, .8], [.3, .36, .66], [.7, .4, .46], [1.1, .43, .34], [1.5, .42, .27], [1.75, .33, .22], [1.86, .05, .1]];
  for (let i = 0; i <= 36; i++) {
    const z = lerp(PE[0][0], PE[PE.length - 1][0], i / 36); let k = 0; while (k < PE.length - 2 && z > PE[k + 1][0]) k++;
    const a0 = PE[Math.max(0, k - 1)], b0 = PE[k], c0 = PE[k + 1], d0 = PE[Math.min(PE.length - 1, k + 2)], t = clamp((z - b0[0]) / (c0[0] - b0[0]), 0, 1);
    const wx = Math.max(.02, cr(a0[1], b0[1], c0[1], d0[1], t)), h = Math.max(.06, cr(a0[2], b0[2], c0[2], d0[2], t));
    aneisPe.push(anel((a) => new T.Vector3(SX * wx * Math.cos(a), -4.3 + h / 2 + (h / 2) * Math.sin(a) * (Math.sin(a) < 0 ? 0.8 : 1), z)));
  }
  const mPele = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.FrontSide,
    uniforms: { cor: { value: new T.Vector3(0.98, 0.74, 0.6) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 cor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0); gl_FragColor = vec4(cor * (0.72 + 0.28 * f), mix(0.10, 0.74, f)); }',
  });
  for (const g of [casca(aneisPerna), casca(aneisPe)]) {
    const p = g.attributes.position, n = g.attributes.normal, i0 = Math.floor(p.count / 2), sY = secao(clamp(p.getY(i0), -3.85, 4.3));
    if ((p.getX(i0) - sY[2]) * n.getX(i0) + (p.getZ(i0) - sY[3]) * n.getZ(i0) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
    const m = new T.Mesh(g, mPele); m.renderOrder = 2; cenaP.add(m);
  }
  const plat = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 0.06, 56), new T.MeshBasicMaterial({ color: new T.Color(0x17232f).convertSRGBToLinear() }));
  plat.position.set(0, -4.36, 0.55); cenaP.add(plat);

  // ---------- do 2D para o 3D ----------
  // alturas: os marcos do mapa (JSF, joelho, tornozelo) viram alturas na perna
  const Y3M = (y) => porTrechos(y, [[10, 4.3], [48, 3.75], [320, .1], [552, -3.55], [612, -4.3]]);
  const Y3P = (y) => porTrechos(y, [[10, 4.3], [314, .1], [535, -3.5], [622, -4.3]]);
  // trajeto anatômico: [altura, ângulo, fração]
  const T_GSV = [[-3.55, 150, .9], [-2.8, 165, .9], [-2.0, 178, .9], [-1.2, 188, .9], [-.5, 205, .9], [.1, 215, .9], [.8, 208, .9], [1.6, 192, .9], [2.4, 172, .9], [3.1, 152, .88], [3.5, 140, .8], [3.75, 130, .5]];
  const T_SSV = [[-3.5, 300, .9], [-2.7, 282, .9], [-1.9, 272, .9], [-1.1, 270, .92], [-.4, 270, .9], [-.05, 270, .75], [.1, 268, .48]];
  const T_FEM = [[.6, 255, .42], [1.3, 215, .4], [2.2, 175, .42], [3.1, 145, .46], [3.75, 130, .5], [4.25, 125, .5]];
  const T_POP = [[-.9, 270, .42], [-.4, 270, .45], [.1, 268, .48], [.6, 255, .42]];
  function tab(Tb, y) { y = clamp(y, Tb[0][0], Tb[Tb.length - 1][0]); for (let i = 0; i < Tb.length - 1; i++) if (y <= Tb[i + 1][0]) { const k = (y - Tb[i][0]) / (Tb[i + 1][0] - Tb[i][0]); return [lerp(Tb[i][1], Tb[i + 1][1], k), lerp(Tb[i][2], Tb[i + 1][2], k)]; } const u = Tb[Tb.length - 1]; return [u[1], u[2]]; }
  function trecho(Tb, ya, yb) { const pts = [], n = Math.max(2, Math.ceil(Math.abs(yb - ya) / 0.12)); for (let i = 0; i <= n; i++) { const y = lerp(ya, yb, i / n), q = tab(Tb, y); pts.push(ponto(y, q[0], q[1])); } return pts; }
  // largura da silhueta do desenho em cada altura (para saber onde o traço caiu)
  function limites(d) {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute';
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); document.body.appendChild(s);
    const Lp = p.getTotalLength(), mn = {}, mx = {};
    for (let i = 0; i <= 2000; i++) { const q = p.getPointAtLength(Lp * i / 2000), k = Math.round(q.y / 4); if (mn[k] === undefined || q.x < mn[k]) mn[k] = q.x; if (mx[k] === undefined || q.x > mx[k]) mx[k] = q.x; }
    s.remove();
    return (y) => { let k = Math.round(y / 4), d2 = 0; while (mn[k + d2] === undefined && mn[k - d2] === undefined && d2 < 40) d2++; const kk = mn[k + d2] !== undefined ? k + d2 : k - d2; if (mn[kk] === undefined) return [150, 30]; return [(mn[kk] + mx[kk]) / 2, Math.max(8, (mx[kk] - mn[kk]) / 2)]; };
  }
  const limA = limites(G.MEDIAL_SILHOUETTE), limP = limites(G.POSTERIOR_SILHOUETTE);
  // um ponto desenhado no mapa vira um ponto rente à pele: a referência é a safena daquela vista
  function sobe(x, y, vista) {
    if (vista === 'anterior') { const y3 = clamp(Y3M(y), -3.8, 4.2), ref = tab(T_GSV, y3)[0], hw = limA(y)[1], dx = x - G.interpAt(G.VSM_SPINE, G.VSM_HALF, clamp(y, 48, 552))[0]; return ponto(y3, ref - clamp(dx / hw, -1.2, 1.2) * 90, .955); }
    const y3 = clamp(Y3P(y), -3.8, 4.2), l = limP(y); return ponto(y3, 270 - clamp((x - l[0]) / l[1], -1, 1) * 90, .955);
  }
  function texturaFluxo() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 4; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#5a5a5a'); gr.addColorStop(.45, '#5a5a5a'); gr.addColorStop(.7, '#ffffff'); gr.addColorStop(.82, '#ffffff'); gr.addColorStop(1, '#5a5a5a');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; return t;
  }
  const texBase = texturaFluxo();
  const COR3 = { ok: new T.Color(0x3d8fe0), ruim: new T.Color(0xe23b3b), trombo: new T.Color(0x7b838f), recan: new T.Color(0xd99a3d), ausente: new T.Color(0x9aa6b0) };
  for (const k in COR3) COR3[k].convertSRGBToLinear();
  const ROTULO = { ok: 'competente', ruim: 'com refluxo', trombo: 'trombose', recan: 'recanalização parcial', ausente: 'ausente' };
  const estadoDe = (s) => !s ? 'ok' : s === RUIM ? 'ruim' : s === 'ausente' ? 'ausente' : s.indexOf('não compressível') === 0 ? 'trombo' : s.indexOf('semi compressível') === 0 ? 'recan' : 'ok';
  const gVeias = new T.Group(); cenaP.add(gVeias);
  let TUBOS = [], AMOSTRAS = [], ROT_P = [];
  function tubo(o) {
    const curva = new T.CatmullRomCurve3(o.pts), comp = curva.getLength(); let tex = null;
    if (o.estado === 'ruim' || o.estado === 'recan') { tex = texBase.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(2, comp * 2.6), 1); }
    const mat = new T.MeshStandardMaterial({ color: COR3[o.estado].clone(), map: tex, roughness: 0.45, emissive: COR3[o.estado].clone().multiplyScalar(0.3) });
    const leve = o.estado === 'ausente' || (o.discreto && o.estado === 'ok');
    if (leve) { mat.transparent = true; mat.opacity = o.estado === 'ausente' ? 0.5 : 0.4; }
    gVeias.add(new T.Mesh(new T.TubeGeometry(curva, Math.max(8, Math.round(comp * 16)), leve && o.estado === 'ok' ? o.r * 0.7 : o.r, 10, false), mat));
    const t = { nome: o.nome, estado: o.estado, curva, tex, mat }; TUBOS.push(t);
    if (o.estado !== 'ausente' && !o.semToque) for (let k = 0; k < 30; k++) AMOSTRAS.push({ p: curva.getPointAt(k / 29), v: TUBOS.length - 1 });
    return TUBOS.length - 1;
  }
  function bola(p, r, estado) { const c = COR3[estado]; const m = new T.Mesh(new T.SphereGeometry(r, 20, 14), new T.MeshStandardMaterial({ color: c.clone(), roughness: 0.35, emissive: c.clone().multiplyScalar(0.35) })); m.position.copy(p); gVeias.add(m); }
  // trechos de uma safena, com a mesma regra do mapa 2D (início/fim do refluxo ou da ausência)
  function trechosSafena(status, v, marco) {
    const est = estadoDe(status), top = marco.top, bot = marco.tornozelo;
    if (est !== 'ruim' && est !== 'ausente') return [{ a: top, b: bot, e: est }];
    const pi = v.inicio && v.inicio.indexOf('cm_') === 0, pf = v.fim && v.fim.indexOf('cm_') === 0;
    if (!(v.inicio && v.fim && (!pi || v.inicio_valor) && (!pf || v.fim_valor))) return [{ a: top, b: bot, e: est }];
    let a = G.yFromField(v.inicio, v.inicio_valor, marco), b = G.yFromField(v.fim, v.fim_valor, marco); if (a > b) { const t = a; a = b; b = t; }
    const resto = est === 'ausente' ? estadoDe(v.restante) : 'ok';
    const out = []; if (a > top + 2) out.push({ a: top, b: a, e: resto }); out.push({ a, b, e: est }); if (b < bot - 2) out.push({ a: b, b: bot, e: resto }); return out;
  }
  const raioSafena = (e, mm, base) => e === 'ausente' ? .013 : e === 'ruim' ? (parseFloat(mm) > 0 ? clamp(parseFloat(mm) * 0.0085, .03, .1) : base * 1.6) : e === 'trombo' ? base * 1.35 : base;
  function geraPerna() {
    for (const m of gVeias.children) { m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose(); }
    gVeias.clear(); TUBOS = []; AMOSTRAS = []; ROT_P = [];
    const p = ex.profundas, s = ex.superficiais, e = (k) => estadoDe(p[k]);
    // sistema profundo
    const iFem = tubo({ nome: 'Veia femoral superficial', estado: e('Veia Femoral Superficial'), r: .072, pts: trecho(T_FEM, .6, 2.92) });
    tubo({ nome: 'Veia femoral comum', estado: e('Veia Femoral Comum'), r: .08, pts: trecho(T_FEM, 2.92, 4.25) });
    const q292 = tab(T_FEM, 2.92);
    tubo({ nome: 'Veia femoral profunda', discreto: true, estado: e('Veia Femoral Profunda'), r: .055, pts: [ponto(.4, 100, .3), ponto(1.2, 105, .3), ponto(2.0, 115, .34), ponto(2.6, 132, .4), ponto(2.92, q292[0], q292[1])] });
    const iPop = tubo({ nome: 'Veia poplítea', estado: e('Veia Poplítea'), r: .066, pts: trecho(T_POP, -.9, .6) });
    const popB = ponto(-.9, 270, .42);
    tubo({ nome: 'Veias tibiais posteriores', discreto: true, estado: e('Veias Tibiais posteriores'), r: .03, pts: [ponto(-3.5, 205, .62), ponto(-2.6, 225, .42), ponto(-1.7, 245, .38), popB] });
    tubo({ nome: 'Veias tibiais anteriores', discreto: true, estado: e('Veias Tibiais anteriores'), r: .028, pts: [ponto(-3.5, 80, .6), ponto(-2.6, 65, .42), ponto(-1.7, 62, .36), ponto(-1.2, 40, .15), popB] });
    tubo({ nome: 'Veias gastrocnêmicas', discreto: true, estado: e('Veias Gastrocnêmicas'), r: .026, pts: [ponto(-2.0, 250, .72), ponto(-1.5, 258, .66), ponto(-1.1, 265, .55), popB] });
    tubo({ nome: 'Veias soleares', discreto: true, estado: e('Veias Soleares'), r: .026, pts: [ponto(-2.5, 290, .55), ponto(-1.9, 285, .5), ponto(-1.3, 278, .46), popB] });
    // safena magna e JSF
    const yM = (y) => porTrechos(y, [[48, 3.75], [320, .1], [552, -3.55]]); let iMag = -1, iMagRuim = -1;
    for (const tr of trechosSafena(s['Safena Magna'], ex.magna, G.LANDMARK_MAGNA)) {
      const ya = yM(tr.b), yb = yM(tr.a), meio = (ya + yb) / 2;
      const i = tubo({ nome: 'Safena magna', estado: tr.e, r: raioSafena(tr.e, meio > .1 ? ex.magna.coxa : ex.magna.perna, .034), pts: trecho(T_GSV, ya, yb) });
      if (tr.e === 'ruim' && iMagRuim < 0) iMagRuim = i; if (iMag < 0 || (ya <= 1.6 && yb >= 1.6)) iMag = i;
    }
    bola(ponto(3.72, 131, .52), .1, estadoDe(s['JSF']));
    // safena parva e JSP
    const yP = (y) => porTrechos(y, [[314, .1], [535, -3.5]]); let iPar = -1;
    for (const tr of trechosSafena(s['Safena Parva'], ex.parva, G.LANDMARK_PARVA)) {
      const ya = yP(tr.b), yb = yP(tr.a), i = tubo({ nome: 'Safena parva', estado: tr.e, r: raioSafena(tr.e, '', .03), pts: trecho(T_SSV, ya, yb) });
      if (iPar < 0 || (ya <= -1.9 && yb >= -1.9)) iPar = i;
    }
    bola(ponto(.1, 268, .5), .085, estadoDe(s['JSP']));
    // perfurantes insuficientes (ligam a safena magna ao sistema profundo)
    for (const q of ex.perfurantes) { if (q.status !== RUIM || !q.segmento) continue; const o = G.posicaoPerfurante(q.segmento, q.valor); if (!o) continue; const y3 = yM(o.y), g = tab(T_GSV, y3); tubo({ nome: 'Veia perfurante', estado: 'ruim', r: .024, semToque: true, pts: [ponto(y3 - .05, g[0] + 30, .45), ponto(y3, g[0] + 14, .7), ponto(y3, g[0], g[1])] }); bola(ponto(y3, g[0], .93), .07, 'ruim'); }
    // varizes desenhadas: cada traço do 2D vira um trajeto rente à pele
    const RV = { 'Varizes Superficiais': .034, 'Varizes Reticulares': .018, 'Microvarizes': .008, 'Tromboflebite Superficial': .026 };
    for (const t of ex.tracos) {
      const pts = []; let u = null;
      for (const q of t.pts) { if (u && Math.hypot(q[0] - u[0], q[1] - u[1]) < 2.5) continue; u = q; pts.push(sobe(q[0], q[1], t.vista)); }
      if (pts.length < 2) continue;
      const cor = t.tipo === 'Tromboflebite Superficial' ? 0x6b7280 : 0xe23b3b;
      gVeias.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), pts.length * 6, RV[t.tipo] || .02, 7, false), new T.MeshStandardMaterial({ color: new T.Color(cor).convertSRGBToLinear(), roughness: 0.45, emissive: new T.Color(cor).convertSRGBToLinear().multiplyScalar(0.3) })));
    }
    const qm = tab(T_GSV, 1.6);
    ROT_P = [
      { el: $('l0'), txt: 'JSF', p: ponto(3.6, 137, .7), v: iMag, ruim: s['JSF'] === RUIM },
      { el: $('l1'), txt: 'V. femoral', p: TUBOS[iFem].curva.getPointAt(.75), v: iFem, ruim: TUBOS[iFem].estado === 'ruim' },
      { el: $('l2'), txt: 'Safena magna', p: ponto(1.6, qm[0], qm[1]), v: iMag, ruim: iMagRuim >= 0 },
      { el: $('l3'), txt: 'V. poplítea', p: TUBOS[iPop].curva.getPointAt(.45), v: iPop, ruim: TUBOS[iPop].estado === 'ruim' },
      { el: $('l4'), txt: 'Safena parva', p: ponto(-1.9, 272, .9), v: iPar, ruim: iPar >= 0 && TUBOS[iPar].estado === 'ruim' },
    ];
    for (const r of ROT_P) { r.el.textContent = r.txt; r.el.dataset.ruim = r.ruim ? '1' : '0'; }
    const tem = (e) => TUBOS.some((t) => t.estado === e), ponto2 = (c, t) => '<span><i style="background:' + c + '"></i>' + t + '</span>';
    $('leg').innerHTML = ponto2('#3d8fe0', 'competente') + (tem('ruim') ? ponto2('#e23b3b', 'refluxo') : '') + (tem('trombo') ? ponto2('#6b7280', 'trombose') : '') + (tem('recan') ? ponto2('#d99a3d', 'recanalização') : '') + (tem('ausente') ? ponto2('#aab4bc', 'ausente') : '');
    const primeiroRuim = TUBOS.findIndex((t) => t.estado === 'ruim' && t.nome !== 'Veia perfurante');
    st.sel = primeiroRuim >= 0 ? primeiroRuim : iMag;
  }
  const alvoMarca = new T.Mesh(new T.RingGeometry(.145, .16, 48), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, side: T.DoubleSide }));
  alvoMarca.renderOrder = 5; alvoMarca.visible = false; cenaP.add(alvoMarca);
  const CENTRO = new T.Vector3(0, 0.15, 0.2);
  const camP = { az: -0.6, pol: 1.5, dist: 12.5, alvo: CENTRO.clone(), alvoS: CENTRO.clone() };

  // ---------- a veia (segmento com válvulas, por fora em corte e por dentro) ----------
  const L = 16, H = 1.9, VALVULAS = [-3.4, 3.2];
  const cam = { az: 0.38, pol: 1.47, dist: 13, inY: -6.4, tx: 0, tz: 0 };
  function raio(y) { let b = 0; for (const z of VALVULAS) { const d = (y - (z + 0.8 * H)) / 1.0; b += Math.exp(-d * d); } return (1 + 0.32 * st.dil) * (1 + 0.2 * b); }
  const cenaV = new T.Scene();
  const corFora = new T.Color(0x0d141f), corDentro = new T.Color(0x3a0c14), corFundo = new T.Color();
  cenaV.fog = new T.FogExp2(0x0d141f, 0.012);
  const camV3 = new T.PerspectiveCamera(55, 1, 0.05, 90); cenaV.add(camV3);
  cenaV.add(new T.HemisphereLight(0xffffff, 0x3a1a22, 0.9));
  camV3.add(new T.PointLight(0xfff1ea, 0.8, 24, 1.2));
  const sol = new T.DirectionalLight(0xffffff, 0.4); sol.position.set(2, 3, 6); cenaV.add(sol);
  function texturaParede() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#c75a6e'; g.fillRect(0, 0, 256, 256);
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 90; i++) { const x = rnd() * 256, y = rnd() * 256, r = 8 + rnd() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, r); const cl = rnd() > 0.5 ? '255,214,214' : '120,30,48'; gr.addColorStop(0, 'rgba(' + cl + ',.20)'); gr.addColorStop(1, 'rgba(' + cl + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.strokeStyle = 'rgba(110,26,44,.22)'; g.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) { const x = rnd() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, 80, x - 8, 170, x + 2, 256); g.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 5); t.encoding = T.sRGBEncoding; return t;
  }
  const gParede = new T.CylinderGeometry(1, 1, L, 56, 110, true);
  const pw = gParede.attributes.position, baseP = new Float32Array(pw.count * 2);
  for (let i = 0; i < pw.count; i++) { const x = pw.getX(i), z = pw.getZ(i), n = Math.hypot(x, z) || 1; baseP[2 * i] = x / n; baseP[2 * i + 1] = z / n; }
  function atualizaParede() { for (let i = 0; i < pw.count; i++) { const y = pw.getY(i), r = raio(y); pw.setXYZ(i, baseP[2 * i] * r, y, baseP[2 * i + 1] * r); } pw.needsUpdate = true; gParede.computeVertexNormals(); }
  atualizaParede();
  cenaV.add(new T.Mesh(gParede, new T.MeshStandardMaterial({ map: texturaParede(), roughness: 0.62, side: T.BackSide })));
  const vidro = new T.Mesh(gParede, new T.MeshBasicMaterial({ color: 0x7fe3f1, transparent: true, opacity: 0.07, side: T.FrontSide, depthWrite: false })); cenaV.add(vidro);
  const NU = 26, NV = 12;
  const mFolheto = new T.MeshStandardMaterial({ color: 0xf6dcd5, roughness: 0.5, side: T.DoubleSide, transparent: true, opacity: 0.94 });
  const folhetos = [];
  for (const z0 of VALVULAS) for (const s of [1, -1]) { const g = new T.PlaneGeometry(1, 1, NU, NV); const m = new T.Mesh(g, mFolheto); m.frustumCulled = false; cenaV.add(m); folhetos.push({ g, z0, s }); }
  function bordaLivreX(u, rt, o) { const k = 1 - u * u, gap = lerp(0.012, 0.34, st.dil); return lerp(rt * gap * Math.pow(k, 0.8), rt * (1 - 0.17 * Math.pow(k, 0.7)) * Math.cos(u * 1.5462), o); }
  function atualizaFolheto(f) {
    const p = f.g.attributes.position, yt = f.z0 + H, rt = raio(yt), o = st.o, c = 1 - o;
    const tremor = o * 0.5 + st.dil * Math.min(1, Math.abs(Math.min(0, st.v)) * 1.6);
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = -1 + 2 * i / NU, v = j / NV, phi = u * 1.5462, k = 1 - u * u;
      const ya = f.z0 + H * u * u, ra = raio(ya), ax = ra * Math.cos(phi), az = ra * Math.sin(phi);
      const fx = bordaLivreX(u, rt, o) + 0.035 * Math.sin(st.t * 11 + u * 5 + f.z0) * k * tremor;
      const fz = lerp(rt * Math.sin(phi), rt * (1 - 0.17 * Math.pow(k, 0.7)) * Math.sin(phi), o);
      const vv = Math.pow(v, 0.9), bar = Math.sin(Math.PI * v) * k * c;
      p.setXYZ(j * (NU + 1) + i, f.s * (lerp(ax, fx, vv) - 0.1 * rt * bar), lerp(ya, yt, vv) - 0.22 * H * bar, lerp(az, fz, vv));
    }
    p.needsUpdate = true; f.g.computeVertexNormals();
  }
  const perfil = [[0, 0.09], [0.3, 0.13], [0.6, 0.22], [0.82, 0.25], [0.96, 0.15], [1, 0], [0.96, -0.15], [0.82, -0.25], [0.6, -0.22], [0.3, -0.13], [0, -0.09]].map((q) => new T.Vector2(q[0], q[1]));
  const N = 560, mCel = new T.MeshStandardMaterial({ color: 0xb3121f, roughness: 0.45 });
  const cel = new T.InstancedMesh(new T.LatheGeometry(perfil, 14), mCel, N); cel.frustumCulled = false; cenaV.add(cel);
  const pA = new Float32Array(N), pZ = new Float32Array(N), pY = new Float32Array(N), pR = new Float32Array(N * 6);
  let sem = 99; const rnd = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647; };
  for (let i = 0; i < N; i++) { let x, z; do { x = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + z * z > 0.9); pZ[i] = z; pA[i] = x / Math.sqrt(1 - z * z); pY[i] = (rnd() - 0.5) * L; for (let k = 0; k < 6; k++) pR[i * 6 + k] = rnd(); }
  const peca = new T.Object3D();
  const corSangue = new T.Color(0xb3121f), corSobe = new T.Color(0x2f7fe0), corVolta = new T.Color(0xff4d4d), corAlvo = new T.Color();
  let dentroF = 0;
  function meiaLargura(y, zU, r) {
    const corda = r * Math.sqrt(Math.max(0, 1 - zU * zU)); let x = corda;
    for (const z0 of VALVULAS) {
      const yt = z0 + H; if (y < z0 || y > yt + 0.4 * H) continue;
      const u = Math.asin(clamp(zU, -1, 1)) / 1.5708, borda = Math.min(corda, bordaLivreX(u, raio(yt), st.o));
      if (y <= yt) { const ya = z0 + H * u * u; if (y > ya) x = Math.min(x, lerp(corda, borda, (y - ya) / (yt - ya))); }
      else x = Math.min(x, lerp(borda, corda, ss(yt, yt + 0.4 * H, y)));
    }
    return x;
  }
  function atualizaCelulas(dt) {
    const ativo = Math.abs(st.v) > 0.01;
    for (let i = 0; i < N; i++) {
      let y = pY[i]; const r = raio(y), zU = pZ[i], a = pA[i], corda = r * Math.sqrt(1 - zU * zU), livre = meiaLargura(y, zU, r);
      if (ativo) { const rho2 = a * a * (1 - zU * zU) + zU * zU, jato = Math.min(2.4, corda / Math.max(livre, 0.05)); y += st.v * VMAX * (1 - 0.72 * rho2) * jato * dt; if (y > L / 2) y -= L; else if (y < -L / 2) y += L; pY[i] = y; }
      peca.position.set(a * livre * 0.93, y, zU * r * 0.95);
      const giro = st.t * (0.4 + pR[i * 6 + 3] * 1.3);
      peca.rotation.set(pR[i * 6] * 6.28 + giro, pR[i * 6 + 1] * 6.28 + giro * 0.7, pR[i * 6 + 2] * 6.28);
      const perto = lerp(1, 0.72 * ss(0.6, 2.6, peca.position.distanceTo(camV3.position)), dentroF);
      peca.scale.setScalar((0.085 + pR[i * 6 + 4] * 0.035) * perto + 0.0001);
      peca.updateMatrix(); cel.setMatrixAt(i, peca.matrix);
    }
    cel.instanceMatrix.needsUpdate = true;
  }


  // ---------- câmeras e navegação: perna -> veia -> por dentro ----------
  cam.alvoY = 0;
  const guia = new T.PerspectiveCamera(), alvoPos = new T.Vector3(), alvoOlhar = new T.Vector3(), cima = new T.Vector3();
  function posiciona(suave) {
    const k = suave ? 0.12 : 1;
    if (st.nivel === 'perna') {
      camP.alvoS.lerp(camP.alvo, suave ? 0.14 : 1);
      alvoPos.set(camP.alvoS.x + camP.dist * Math.sin(camP.pol) * Math.sin(camP.az), camP.alvoS.y + camP.dist * Math.cos(camP.pol), camP.alvoS.z + camP.dist * Math.sin(camP.pol) * Math.cos(camP.az));
      guia.position.copy(alvoPos); guia.up.set(0, 1, 0); guia.lookAt(camP.alvoS);
      camP3.position.lerp(alvoPos, k); camP3.quaternion.slerp(guia.quaternion, k); return;
    }
    if (st.nivel === 'veia') { alvoPos.set(cam.dist * Math.sin(cam.pol) * Math.sin(cam.az), cam.alvoY + cam.dist * Math.cos(cam.pol), cam.dist * Math.sin(cam.pol) * Math.cos(cam.az)); alvoOlhar.set(0, cam.alvoY, 0); cima.set(0, 1, 0); }
    else { const bal = st.pausado ? 0 : 0.1; alvoPos.set(bal * Math.sin(st.t * 0.7), cam.inY, bal * Math.cos(st.t * 0.9)); alvoOlhar.set(alvoPos.x + cam.tx, cam.inY + 1, alvoPos.z + cam.tz); cima.set(0, 0, -1); }
    guia.position.copy(alvoPos); guia.up.copy(cima); guia.lookAt(alvoOlhar);
    camV3.position.lerp(alvoPos, k); camV3.quaternion.slerp(guia.quaternion, k);
  }
  const estSel = () => (TUBOS[st.sel] ? TUBOS[st.sel].estado : 'ok');
  const alvoDilVeia = () => { const e = estSel(); return e === 'ruim' ? 1 : e === 'trombo' ? 0.5 : 0; };
  const fatorFluxo = () => { const e = estSel(); return e === 'trombo' ? 0 : e === 'recan' ? 0.45 : 1; };
  const nPerna = $('nPerna'), nVeia = $('nVeia'), nDentro = $('nDentro'), dica = $('dica');
  const DICAS = { perna: 'Arraste para girar. Use a barra da direita (ou dois dedos) para subir e descer. Toque numa veia para ver o nome.', veia: 'Arraste para girar. Aproxime para entrar na veia, afaste para voltar à perna.', dentro: 'Arraste para olhar. Aproxime para avançar, afaste para sair.' };
  function pinta() {
    nPerna.setAttribute('aria-pressed', String(st.nivel === 'perna')); nVeia.setAttribute('aria-pressed', String(st.nivel === 'veia')); nDentro.setAttribute('aria-pressed', String(st.nivel === 'dentro'));
    dica.textContent = DICAS[st.nivel]; const naP = st.nivel === 'perna'; $('dopBox').dataset.min = '0'; $('dopBox').hidden = true; fase.hidden = naP; $('leg').hidden = !naP; $('bNomes').hidden = !naP; if (st.pronto) ajusta();
  }
  function irPara(n) {
    if (n === st.nivel || st.trocando) return;
    const mudaCena = (st.nivel === 'perna') !== (n === 'perna');
    const aplica = () => { st.nivel = n; st.semZoomAte = performance.now() + 650; if (n === 'veia') { cam.dist = 13; cam.alvoY = 0; } if (n === 'dentro') { cam.inY = -6.4; cam.tx = 0; cam.tz = 0; } if (n === 'perna') camP.dist = clamp(camP.dist, 3.4, 18); pinta(); };
    if (!mudaCena) { aplica(); return; }
    st.trocando = true; veu.textContent = ''; veu.style.opacity = '1';
    setTimeout(() => { aplica(); st.dil = alvoDilVeia(); atualizaParede(); posiciona(false); veu.style.opacity = '0'; st.trocando = false; }, 240);
  }
  const prj = new T.Vector3(); let W = 1, Hh = 1;
  function amostraPerto(nx, ny, limite) { let melhor = null, bd = limite * limite; const asp = W / Hh; for (const s of AMOSTRAS) { prj.copy(s.p).project(camP3); if (prj.z > 1 || prj.z < -1) continue; const dx = (prj.x - nx) * asp, dy = prj.y - ny, d = dx * dx + dy * dy; if (d < bd) { bd = d; melhor = s; } } return melhor; }
  function aproxima(fator, nx, ny) {
    if (st.trocando || performance.now() < st.semZoomAte) return;
    if (st.nivel === 'perna') {
      camP.dist = clamp(camP.dist / fator, 1.5, 18);
      if (fator > 1) { const s = amostraPerto(nx, ny, 0.45); if (s) { st.sel = s.v; alvoMarca.visible = true; camP.alvo.lerp(s.p, clamp((fator - 1) * 2.2, 0.06, 0.6)); } }
      else { const k = clamp((1 / fator - 1) * 1.2, 0, 0.5); camP.alvo.x = lerp(camP.alvo.x, CENTRO.x, k); camP.alvo.z = lerp(camP.alvo.z, CENTRO.z, k); if (camP.dist > 9) alvoMarca.visible = false; }
      limitaAlvo();
      if (camP.dist <= 1.75 && AMOSTRAS.length) { let m = null, bd = 1e9; for (const s of AMOSTRAS) { const d = s.p.distanceToSquared(camP.alvo); if (d < bd) { bd = d; m = s; } } st.sel = m.v; camP.alvo.copy(m.p); irPara('veia'); }
    } else if (st.nivel === 'veia') { cam.dist = clamp(cam.dist / fator, 2.2, 22); limitaAlvo(); if (cam.dist <= 2.4) irPara('dentro'); else if (cam.dist >= 21.5) irPara('perna'); }
    else { cam.inY += Math.log(fator) * 4.5; if (cam.inY < -7.3) irPara('veia'); cam.inY = clamp(cam.inY, -7.3, 6.2); }
  }
  // rolagem vertical: quanto da altura cabe na tela e onde a vista está
  const Y_TOPO = 4.4, COMP_PERNA = 8.9;
  function rolagem() {
    if (st.nivel === 'perna') { const vis = 0.828 * camP.dist, livre = COMP_PERNA - vis; return { frac: clamp(vis / COMP_PERNA, 0.1, 1), pos: livre > 0.05 ? clamp((Y_TOPO - vis / 2 - camP.alvo.y) / livre, 0, 1) : 0, livre: livre > 0.05 }; }
    if (st.nivel === 'veia') { const vis = 1.04 * cam.dist, livre = L - vis; return { frac: clamp(vis / L, 0.1, 1), pos: livre > 0.05 ? clamp((L / 2 - vis / 2 - cam.alvoY) / livre, 0, 1) : 0, livre: livre > 0.05 }; }
    return { frac: 0.14, pos: clamp((6.2 - cam.inY) / 13.5, 0, 1), livre: true };
  }
  function rolaPara(pos) {
    pos = clamp(pos, 0, 1);
    if (st.nivel === 'perna') { const vis = 0.828 * camP.dist, livre = COMP_PERNA - vis; if (livre > 0.05) { camP.alvo.y = Y_TOPO - vis / 2 - pos * livre; alvoMarca.visible = false; } }
    else if (st.nivel === 'veia') { const vis = 1.04 * cam.dist, livre = L - vis; if (livre > 0.05) cam.alvoY = L / 2 - vis / 2 - pos * livre; }
    else cam.inY = 6.2 - pos * 13.5;
  }
  // mantém a vista dentro da altura da perna (e centrada quando a perna inteira cabe na tela)
  function limitaAlvo() {
    if (st.nivel === 'perna') { const vis = 0.828 * camP.dist; if (vis >= COMP_PERNA) camP.alvo.y = lerp(camP.alvo.y, CENTRO.y, 0.5); else camP.alvo.y = clamp(camP.alvo.y, Y_TOPO - COMP_PERNA + vis / 2, Y_TOPO - vis / 2); }
    else if (st.nivel === 'veia') { const vis = 1.04 * cam.dist; cam.alvoY = vis >= L ? 0 : clamp(cam.alvoY, -L / 2 + vis / 2, L / 2 - vis / 2); }
  }
  function arrastaVertical(dyPx) { // conteúdo acompanha o dedo
    if (st.nivel === 'perna') { camP.alvo.y += dyPx * 0.828 * camP.dist / Hh; alvoMarca.visible = false; limitaAlvo(); }
    else if (st.nivel === 'veia') { cam.alvoY += dyPx * 1.04 * cam.dist / Hh; limitaAlvo(); }
    else cam.inY = clamp(cam.inY + dyPx * 0.02, -7.3, 6.2);
  }
  const barraR = $('rolagem'), polegar = $('polegar'); let pegaR = null;
  function atualizaRolagem() {
    const r = rolagem(), Ht = barraR.clientHeight, hp = Math.max(28, r.frac * Ht);
    polegar.style.height = hp.toFixed(1) + 'px'; polegar.style.top = (r.pos * (Ht - hp)).toFixed(1) + 'px';
    const livre = r.livre ? '1' : '0'; if (barraR.dataset.livre !== livre) barraR.dataset.livre = livre;
    const vn = String(Math.round(r.pos * 100)); if (barraR.getAttribute('aria-valuenow') !== vn) barraR.setAttribute('aria-valuenow', vn);
  }
  ouvir(barraR, 'pointerdown', (e) => {
    e.preventDefault(); try { barraR.setPointerCapture(e.pointerId); } catch (_) {}
    const b = barraR.getBoundingClientRect(), p = polegar.getBoundingClientRect(), dentro = e.clientY >= p.top && e.clientY <= p.bottom;
    pegaR = { topo: b.top, curso: Math.max(1, b.height - p.height), desl: dentro ? e.clientY - p.top : p.height / 2 };
    rolaPara((e.clientY - pegaR.topo - pegaR.desl) / pegaR.curso);
  });
  ouvir(barraR, 'pointermove', (e) => { if (pegaR) rolaPara((e.clientY - pegaR.topo - pegaR.desl) / pegaR.curso); });
  const soltaR = () => { pegaR = null; }; ouvir(barraR, 'pointerup', soltaR); ouvir(barraR, 'pointercancel', soltaR);
  ouvir(barraR, 'keydown', (e) => { const d = e.key === 'ArrowDown' ? 0.08 : e.key === 'ArrowUp' ? -0.08 : e.key === 'PageDown' ? 0.3 : e.key === 'PageUp' ? -0.3 : 0; if (d) { e.preventDefault(); rolaPara(rolagem().pos + d); } });
  const dedos = new Map(); let pinca = 0, pincaMeio = null, toque = null;
  const ndc = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]; };
  ouvir(canvas, 'pointerdown', (e) => { dedos.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} pinca = 0; pincaMeio = null; toque = dedos.size === 1 ? { t: performance.now(), mov: 0 } : null; });
  ouvir(canvas, 'pointermove', (e) => {
    const d = dedos.get(e.pointerId); if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; if (toque) toque.mov += Math.abs(dx) + Math.abs(dy);
    if (dedos.size === 1 && (e.shiftKey || (e.buttons & 2))) arrastaVertical(dy);
    else if (dedos.size === 1) {
      if (st.nivel === 'perna') { camP.az -= dx * 0.008; camP.pol = clamp(camP.pol - dy * 0.006, 0.35, 2.75); }
      else if (st.nivel === 'veia') { cam.az -= dx * 0.008; cam.pol = clamp(cam.pol - dy * 0.006, 0.3, 2.84); }
      else { cam.tx = clamp(cam.tx + dx * 0.004, -1.5, 1.5); cam.tz = clamp(cam.tz - dy * 0.004, -1.5, 1.5); }
    } else if (dedos.size === 2) { const [a, b] = Array.from(dedos.values()), dist = Math.hypot(a.x - b.x, a.y - b.y); if (pinca > 0 && dist > 0) { const m = ndc({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); aproxima(dist / pinca, m[0], m[1]); } pinca = dist; const meio = (a.y + b.y) / 2; if (pincaMeio !== null) arrastaVertical(meio - pincaMeio); pincaMeio = meio; }
  });
  const solta = (e) => {
    if (toque && e.type === 'pointerup' && toque.mov < 8 && performance.now() - toque.t < 450 && st.nivel === 'perna') {
      const m = ndc(e), s = amostraPerto(m[0], m[1], 70 / Hh);
      if (s) { if (st.sel === s.v && alvoMarca.visible && camP.dist < 5) { camP.alvo.copy(s.p); irPara('veia'); } else { st.sel = s.v; camP.alvo.copy(s.p); alvoMarca.visible = true; camP.dist = Math.min(camP.dist, 4.2); } }
    }
    dedos.delete(e.pointerId); pinca = 0; pincaMeio = null; toque = null;
  };
  ouvir(canvas, 'pointerup', solta); ouvir(canvas, 'pointercancel', solta);
  ouvir(canvas, 'contextmenu', (e) => e.preventDefault());
  ouvir(canvas, 'wheel', (e) => { e.preventDefault(); const m = ndc(e); aproxima(Math.exp(-e.deltaY * 0.0014), m[0], m[1]); }, { passive: false });
  ouvir(nPerna, 'click', () => irPara('perna')); ouvir(nVeia, 'click', () => irPara('veia')); ouvir(nDentro, 'click', () => irPara('dentro'));
  const bCor = $('bCor'), bPausa = $('bPausa');
  ouvir($('bNomes'), 'click', () => { st.nomes = !st.nomes; $('bNomes').setAttribute('aria-pressed', String(!!st.nomes)); });
  ouvir(bCor, 'click', () => { st.doppler = !st.doppler; bCor.setAttribute('aria-pressed', String(st.doppler)); });
  function mostraPausa() {
    bPausa.innerHTML = st.pausado ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
    bPausa.setAttribute('aria-label', st.pausado ? 'Continuar animação' : 'Pausar animação'); bPausa.setAttribute('aria-pressed', String(st.pausado));
  }
  ouvir(bPausa, 'click', () => { st.pausado = !st.pausado; mostraPausa(); }); mostraPausa();
  // tela cheia: API do navegador quando existe; senão (iPhone) o 3D cobre a página
  const bTela = $('bTela'); let cheia = false;
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function mostraTela() {
    bTela.innerHTML = cheia ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    bTela.setAttribute('aria-label', cheia ? 'Sair da tela cheia' : 'Tela cheia'); bTela.setAttribute('aria-pressed', String(cheia));
  }
  function poeCheia(v) {
    cheia = v; raiz.classList.toggle('m3d--cheia', v); document.documentElement.style.overflow = v ? 'hidden' : ''; mostraTela();
    if (v) { const pf = raiz.requestFullscreen || raiz.webkitRequestFullscreen; if (pf && !fsEl()) { try { const r = pf.call(raiz); if (r && r.catch) r.catch(() => {}); } catch (_) {} } }
    else if (fsEl() === raiz) { const sf = document.exitFullscreen || document.webkitExitFullscreen; try { const r = sf.call(document); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
  }
  ouvir(bTela, 'click', () => poeCheia(!cheia)); mostraTela();
  const aoMudarFs = () => { if (cheia && fsEl() !== raiz) poeCheia(false); };
  ouvir(document, 'fullscreenchange', aoMudarFs); ouvir(document, 'webkitfullscreenchange', aoMudarFs);
  ouvir(document, 'keydown', (e) => { if (e.key === 'Escape' && cheia) poeCheia(false); });
  [0, 1, 2, 3, 4].forEach((i) => ouvir($('l' + i), 'click', () => { const r = ROT_P[i]; if (!r || r.v < 0 || st.nivel !== 'perna' || st.trocando) return; st.sel = r.v; camP.alvo.copy(r.p); alvoMarca.visible = true; camP.dist = 2.6; setTimeout(() => { if (vivo) irPara('veia'); }, 620); }));

  // rótulos presos ao 3D
  const ROT_V = [[$('rCor'), 4.1, 1], [$('rPe'), -3.3, 1], [$('rV1'), VALVULAS[0] + H * 0.55, -1], [$('rV2'), VALVULAS[1] + H * 0.55, -1]];
  const lado = new T.Vector3(), eixo = new T.Vector3();
  function poe(el, v, vis, ancora) {
    const ok = vis && v.z > -1 && v.z < 1 && Math.abs(v.x) < 0.99 && Math.abs(v.y) < 0.99;
    el.style.opacity = ok ? (vis === 2 ? '.45' : '1') : '0'; el.style.pointerEvents = ok && el.tagName === 'BUTTON' ? 'auto' : 'none';
    el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * Hh).toFixed(1) + 'px) translate(' + ancora + ',-50%)';
  }
  function atualizaRotulos() {
    const naPerna = st.nivel === 'perna' && !st.trocando, naVeia = st.nivel === 'veia' && !st.trocando;
    for (const r of ROT_P) {
      if (!naPerna || !st.nomes || r.v < 0) { poe(r.el, prj.set(9, 9, 9), 0, '0'); continue; }
      const s = secao(clamp(r.p.y, -3.85, 4.3)); eixo.set(s[2], r.p.y, s[3]).project(camP3); const exo = eixo.x;
      lado.set(r.p.x - s[2], 0, r.p.z - s[3]); const frente = lado.dot(prj.copy(camP3.position).sub(r.p)) > 0;
      prj.copy(r.p).project(camP3); poe(r.el, prj, camP.dist > 4.5 ? (frente ? 1 : 2) : 0, prj.x < exo ? 'calc(-100% - 12px)' : '12px');
    }
    const ls = $('lSel'), tb = TUBOS[st.sel];
    if (naPerna && alvoMarca.visible && !st.nomes && tb) { const tx = tb.nome + ' · ' + ROTULO[tb.estado]; if (ls.textContent !== tx) { ls.textContent = tx; ls.dataset.ruim = tb.estado === 'ruim' ? '1' : '0'; } prj.copy(camP.alvo).project(camP3); const lw = ls.offsetWidth || 170, lx = clamp((prj.x * 0.5 + 0.5) * W, lw / 2 + 8, W - lw / 2 - 38), ly = Math.max(24, (-prj.y * 0.5 + 0.5) * Hh - 34); ls.style.opacity = '1'; ls.style.transform = 'translate(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px) translate(-50%,-50%)'; }
    else ls.style.opacity = '0';
    lado.set(1, 0, 0).applyQuaternion(camV3.quaternion);
    for (const [el, y, sgn] of ROT_V) { const afasta = (1 + 0.32 * st.dil) * 1.3 + 0.9; prj.set(lado.x * afasta * sgn, y, lado.z * afasta * sgn).project(camV3); poe(el, prj, naVeia && dentroF < 0.35 ? 1 : 0, '-50%'); }
  }

  // leitura do ciclo
  const fase = $('fase'), faseK = $('faseK'), faseT = $('faseT'), dopR = $('dopR'), dopN = $('dopN');
  let ultimaFase = '', resumo = '';
  function atualizaFase() {
    if (st.nivel === 'perna') return;
    let k, t, tom = 'normal'; const sist = st.tc < SISTOLE, tau = Math.min(Math.max(0, st.tc - SISTOLE), DUR_REFLUXO);
    if (st.nivel === 'perna') {
      const r = TUBOS.find((q) => q.estado === 'ruim' && q.nome !== 'Veia perfurante'); k = 'Membro inferior ' + (ladoMembro === 'Direito' ? 'direito' : 'esquerdo');
      if (sist) t = '↑ Sangue sobe'; else if (!r) t = 'Válvulas seguram o sangue'; else { tom = 'refluxo'; t = '↓ Refluxo ' + r.nome.toLowerCase() + ' <b>' + num(tau) + ' s</b>'; }
    } else {
      const e = estSel(); k = (TUBOS[st.sel] ? TUBOS[st.sel].nome : 'Veia') + ' · ' + ROTULO[e];
      if (e === 'trombo') { tom = 'refluxo'; t = 'Não compressível · sem fluxo'; }
      else if (sist) t = e === 'recan' ? 'Fluxo reduzido · recanalização parcial' : 'Sangue sobe · válvulas abertas';
      else if (e !== 'ruim') t = 'Válvulas fecham · sem refluxo'; else { tom = 'refluxo'; t = 'Válvulas não fecham · <b>sangue volta</b>'; }
    }
    const chave = k + t; if (chave !== ultimaFase) { ultimaFase = chave; faseK.textContent = k; faseT.innerHTML = t; fase.dataset.tom = tom; fase.dataset.compacto = st.nivel === 'perna' ? '1' : '0'; }
    const naPerna = st.nivel === 'perna', n = naPerna ? resumo : 'Doppler (esquemático)', e = estSel(), rr = naPerna ? '' : e === 'ruim' ? 'refluxo' : e === 'trombo' ? 'sem fluxo' : 'sem refluxo';
    if (dopN.textContent !== n) dopN.textContent = n; if (dopR.textContent !== rr) { dopR.textContent = rr; dopR.style.color = (e === 'ruim' || e === 'trombo') ? 'var(--refluxo)' : ''; }
  }
  const dop = $('dop'), dctx = dop.getContext('2d');
  function desenhaDoppler() {
    if (st.nivel === 'perna' || $('dopBox').hidden) return;
    const w = dop.width, h = dop.height, y0 = h * 0.52, ampC = h * 0.46, ampB = h * 0.44, px = Math.max(1, w / 420 * 1.2), f = fatorFluxo();
    dctx.clearRect(0, 0, w, h);
    for (const sinal of [1, -1]) { dctx.beginPath(); dctx.moveTo(0, y0); for (let x = 0; x <= w; x += 2) { const v = velocidade(x / w * CICLO, st.dil >= 0.99 ? 1 : 0) * f, vv = sinal > 0 ? Math.max(0, v) : Math.min(0, v); dctx.lineTo(x, y0 - vv * (sinal > 0 ? ampC : ampB)); } dctx.lineTo(w, y0); dctx.closePath(); dctx.fillStyle = sinal > 0 ? 'rgba(14,184,208,.75)' : 'rgba(255,93,93,.85)'; dctx.fill(); }
    dctx.fillStyle = 'rgba(159,178,198,.55)'; dctx.fillRect(0, y0 - px / 2, w, px);
    dctx.fillStyle = 'rgba(159,178,198,.35)'; dctx.fillRect(SISTOLE / CICLO * w, 0, px, h);
    dctx.fillStyle = '#ffffff'; dctx.fillRect(st.tc / CICLO * w - px, 0, px * 2, h);
  }
  function ajusta() {
    W = Math.max(1, v3d.clientWidth); Hh = Math.max(1, v3d.clientHeight);
    renderer.setSize(W, Hh, false); for (const c of [camP3, camV3]) { c.aspect = W / Hh; c.updateProjectionMatrix(); }
    const dpr = Math.min(window.devicePixelRatio || 1, 2); dop.width = Math.max(2, Math.round(dop.clientWidth * dpr)); dop.height = Math.max(2, Math.round(dop.clientHeight * dpr));
  }
  const aoRedimensionar = () => { if (modo3d && st.pronto) ajusta(); };
  const ro = window.ResizeObserver ? new ResizeObserver(aoRedimensionar) : null;
  if (ro) ro.observe(palco); else ouvir(window, 'resize', aoRedimensionar);

  // o botão 3D: gera a perna a partir do que está no mapa
  const tGerar = setTimeout(() => {
    st.trocando = true; veu.textContent = 'Gerando 3D'; veu.style.opacity = '1';
    tGerar2 = setTimeout(() => {
      if (!vivo) return;
      geraPerna(); st.pronto = true; st.nivel = 'perna'; alvoMarca.visible = false; ajusta();
      camP.az = -0.6; camP.pol = 1.5; camP.alvo.copy(CENTRO); camP.dist = (W / Hh < 0.85) ? 12.4 : 12.2;
      st.dil = alvoDilVeia(); atualizaParede(); pinta(); posiciona(false); ultimaFase = '';
      veu.style.opacity = '0'; st.trocando = false;
    }, 60);
  }, 0);

  // laço
  const corTmp = new T.Color();
  let antes = performance.now();
  function quadro(agora) {
    if (!vivo) return;
    rafId = requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora;
    if (!modo3d || !st.pronto) return;
    const dtA = st.pausado ? 0 : dt; st.t += dtA; st.tc = (st.tc + dtA) % CICLO;
    if (st.nivel === 'perna') {
      const vOk = Math.max(0, velocidade(st.tc, 0)), vRuim = velocidade(st.tc, 1);
      for (const tb of TUBOS) {
        const v = tb.estado === 'ruim' ? vRuim : tb.estado === 'trombo' || tb.estado === 'ausente' ? 0 : tb.estado === 'recan' ? vOk * 0.45 : vOk;
        if (tb.tex) tb.tex.offset.x -= v * dtA * 4.2;
        if (st.doppler && tb.estado !== 'trombo' && tb.estado !== 'ausente') { corTmp.copy(v < -0.02 ? COR3.ruim : COR3.ok); tb.mat.color.lerp(corTmp, 0.18); }
        else tb.mat.color.lerp(COR3[tb.estado], 0.18);
        tb.mat.emissive.copy(tb.mat.color).multiplyScalar(tb.estado === 'ruim' ? 0.3 + 0.55 * Math.max(0, -v) : 0.3);
      }
      posiciona(true);
      if (alvoMarca.visible) { alvoMarca.position.copy(camP.alvo); alvoMarca.quaternion.copy(camP3.quaternion); alvoMarca.scale.setScalar((1 + 0.12 * Math.sin(agora * 0.006)) * clamp(camP.dist / 6, 0.35, 1.4)); }
      renderer.setClearColor(0x0d141f); renderer.render(cenaP, camP3);
    } else {
      const alvoDil = alvoDilVeia(), e = estSel();
      if (Math.abs(alvoDil - st.dil) > 0.0005) { st.dil += (alvoDil - st.dil) * (1 - Math.exp(-dt * 3.2)); if (Math.abs(alvoDil - st.dil) < 0.002) st.dil = alvoDil; atualizaParede(); }
      st.v = velocidade(st.tc, e === 'ruim' ? st.dil : 0) * fatorFluxo();
      const alvoO = e === 'trombo' ? 0.25 : (st.tc < SISTOLE - 0.05 ? 1 : 0); st.o += (alvoO - st.o) * (1 - Math.exp(-dtA * (alvoO ? 14 : 11)));
      for (const f of folhetos) atualizaFolheto(f);
      atualizaCelulas(dtA);
      if (e === 'trombo') corAlvo.setHex(0x4a0d14); else if (st.doppler) corAlvo.copy(st.v < -0.02 ? corVolta : corSobe); else corAlvo.copy(corSangue);
      mCel.color.lerp(corAlvo, 0.2);
      posiciona(true);
      dentroF = 1 - ss(1.1, 3.2, Math.hypot(camV3.position.x, camV3.position.z));
      corFundo.copy(corFora).lerp(corDentro, dentroF);
      renderer.setClearColor(corFundo); cenaV.fog.color.copy(corFundo); cenaV.fog.density = lerp(0.012, 0.1, dentroF);
      vidro.material.opacity = 0.07 * (1 - dentroF);
      renderer.render(cenaV, camV3);
    }
    atualizaFase(); desenhaDoppler(); atualizaRotulos(); atualizaRolagem();
  }
  rafId = requestAnimationFrame(quadro);

  return function parar() {
    vivo = false; cancelAnimationFrame(rafId); clearTimeout(tGerar); clearTimeout(tGerar2);
    for (const [el, tipo, fn, op] of ouvintes) el.removeEventListener(tipo, fn, op);
    if (cheia) poeCheia(false);
    if (ro) ro.disconnect(); else window.removeEventListener('resize', aoRedimensionar);
    for (const cena of [cenaP, cenaV]) cena.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
    });
    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
  };
}
