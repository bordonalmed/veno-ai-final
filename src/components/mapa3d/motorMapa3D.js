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

// opcoes (todas opcionais; sem elas o 3D só mostra):
//   aoSelecionar({ tipo, key })  toque numa veia (abre o mesmo painel do 2D)
//   aoDesenhar({ tipo, vista, pts })  traço desenhado na pele, já no sistema do mapa 2D
//   aoApagar(indice)  borracha num traço (índice em exame.tracos)
// A função devolvida desliga o 3D; .atualizar(exame) refaz as veias sem mexer
// na câmera e .caneta(tipo | "borracha" | null) liga o desenho.
export function iniciarMapa3D(raiz, exame, ladoMembro, opcoes = {}) {
  const $ = (id) => raiz.querySelector('[data-m3d="' + id + '"]');
  let ex = exame;
  const SX = ladoMembro === "Direito" ? -1 : 1; // a perna direita é a esquerda espelhada
  const FAV = opcoes.modo === 'fav'; // fístula arteriovenosa (membro superior)
  const ARTERIAL = opcoes.modo === 'arterial' || opcoes.modo === 'mmssArterial' || FAV; // Doppler arterial: a árvore arterial no lugar das veias
  const BRACO = opcoes.modo === 'mmssVenoso' || opcoes.modo === 'mmssArterial' || FAV;
  const PACIENTE = !!opcoes.paciente; // página do paciente (QR Code): sem Doppler, só ver, girar e navegar // Doppler venoso de membro superior: braço, ombro e pescoço no lugar da perna
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
    const nada = () => {}; nada.atualizar = () => {}; nada.caneta = () => {};
    return nada;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;

  const SISTOLE = 1.5, CICLO = 4.3, DUR_REFLUXO = 2.3, VMAX = 5.2;
  const peleR = $('peleR');
  const st = { pele: peleR ? clamp(Number(peleR.value) / 100, 0, 1) : 0.5, nivel: 'perna', dil: 0, o: 0, t: 0, tc: 0, v: 0, pausado: false, doppler: false, externa: false, amostraY: null, arrastaGate: false, sel: 0, trocando: false, pronto: false, semZoomAte: 0 };
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
  // braço esquerdo (posição anatômica, palma para a frente): [altura, meia-largura (x), meia-profundidade (z), centro x (- = medial), centro z]
  // em cima, o ombro e a parte alta do tórax até a linha média (x = -2,6); embaixo, a mão
  const SEC_BRACO = [[3.82, .26, .25, .06, 0], [3.7, .52, .5, .05, 0], [3.45, .62, .58, .06, 0], [3.0, .6, .57, .2, 0], [2.6, .55, .54, .26, 0], [2.0, .5, .53, .3, .01], [1.2, .46, .5, .3, .02], [.5, .42, .44, .3, 0], [.15, .41, .4, .3, -.02], [-.3, .45, .41, .3, 0], [-1.0, .42, .36, .3, 0], [-1.8, .34, .27, .3, 0], [-2.45, .29, .19, .3, 0], [-2.8, .38, .17, .3, .01], [-3.3, .41, .16, .3, .01], [-3.52, .4, .145, .3, .01], [-3.6, .33, .12, .3, 0], [-3.65, .12, .06, .3, 0]];
  // tronco (ombro e tórax até a linha média, x = -2,6), separado do braço: o braço pende ao lado dele
  const SEC_TRONCO = [[4.05, .7, .45, -2.0, 0], [3.95, 1.0, .58, -1.75, .02], [3.78, 1.25, .68, -1.4, .05], [3.5, 1.35, .74, -1.25, .08], [3.0, 1.28, .76, -1.3, .08], [2.4, 1.18, .74, -1.4, .06], [1.7, 1.1, .7, -1.45, .04], [1.25, .98, .62, -1.5, .03], [.95, .7, .44, -1.6, .02], [.8, .3, .2, -1.7, 0]];
  const SEC = BRACO ? SEC_BRACO : [[4.3, .92, .98, 0, 0], [3.6, .9, .96, 0, 0], [2.6, .8, .88, -.02, .02], [1.6, .68, .74, -.04, .03], [.8, .58, .62, -.05, .03], [.2, .54, .58, -.05, .05], [-.4, .5, .55, -.04, 0], [-1.2, .56, .66, -.03, -.1], [-2.0, .46, .52, -.02, -.08], [-2.8, .34, .38, 0, -.04], [-3.4, .28, .33, 0, -.02], [-3.85, .28, .34, 0, 0]];
  const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  function secao(y, TAB = SEC) {
    let i = 0; while (i < TAB.length - 2 && y < TAB[i + 1][0]) i++;
    const a = TAB[Math.max(0, i - 1)], b = TAB[i], c = TAB[i + 1], d = TAB[Math.min(TAB.length - 1, i + 2)], t = clamp((y - b[0]) / (c[0] - b[0]), 0, 1), o = [];
    for (let k = 1; k < 5; k++) o.push(cr(a[k], b[k], c[k], d[k], t));
    o[2] *= SX;
    return o;
  }
  // ponto na perna: altura y, ângulo (0° lateral, 90° anterior, 180° medial, 270° posterior), fração do raio até a pele
  // relevo anatômico sobre a seção: [ângulo (0° lateral, 90° anterior, 180° medial, 270° posterior), altura, dy, dθ, amplitude]
  const RELEVO = [
    [90, 2.3, 1.3, 38, .055], [25, 1.9, 1.35, 32, .085], [148, .8, .42, 28, .14], [192, 3.05, .95, 36, .05], [268, 2.4, 1.25, 48, .05], // coxa: reto femoral, vasto lateral, vasto medial, adutores, posteriores
    [90, .3, .19, 22, .1], [62, .08, .14, 14, -.035], [118, .08, .14, 14, -.035], [172, .28, .22, 26, .04], [8, .28, .22, 24, .03], [270, .18, .26, 36, -.045], // joelho: patela, tendão patelar, côndilos, fossa poplítea
    [236, -1.0, .55, 32, .17], [305, -.82, .45, 28, .12], [270, -1.95, .5, 50, .035], [96, -1.6, 1.15, 9, .035], [138, -1.7, 1.0, 22, -.03], [60, -1.2, .9, 22, .045], // perna: gastrocnêmios, sóleo, crista e face medial da tíbia, tibial anterior
    [270, -3.2, .55, 14, .06], [234, -3.42, .36, 14, -.06], [306, -3.42, .36, 14, -.06], [176, -3.6, .13, 20, .12], [4, -3.76, .13, 20, .12], // tornozelo: Aquiles e sulcos, maléolos medial (mais alto) e lateral
  ];
  const RELEVO_BRACO = [
    [90, 1.6, .7, 40, .07], [270, 1.8, .8, 50, .05], [20, 3.3, .4, 70, .06], [40, -.6, .5, 35, .06], [150, -.7, .6, 40, .05], [270, .12, .15, 25, .05], // bíceps, tríceps, deltoide, braquiorradial, flexores, olécrano
  ];
  if (BRACO) RELEVO.splice(0, RELEVO.length, ...RELEVO_BRACO);
  const difG = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
  function relevo(y, graus) { let f = 1; for (const [a0, y0, sy, sa, A] of RELEVO) { const dy = (y - y0) / sy, da = difG(graus, a0) / sa; f += A * Math.exp(-dy * dy - da * da); } return f; }
  function ponto(y, graus, frac) { const s = secao(y), a = graus * Math.PI / 180, k = frac * relevo(y, graus); return new T.Vector3(s[2] + SX * k * s[0] * Math.cos(a), y, s[3] + k * s[1] * Math.sin(a)); }
  function casca(aneis) {
    const M = aneis[0].length, pos = [], idx = [];
    for (const a of aneis) for (const p of a) pos.push(p.x, p.y, p.z);
    for (let i = 0; i < aneis.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M; idx.push(a, b, c, b, d, c); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const MP = 96, aneisPerna = [], aneisPe = [];
  const anel = (f) => { const a = []; for (let j = 0; j < MP; j++) a.push(f(j / MP * Math.PI * 2)); return a; };
  const Y_ALTO = BRACO ? 3.82 : 4.3, Y_BAIXO = BRACO ? -3.65 : -3.85;
  { const s0 = secao(Y_ALTO); aneisPerna.push(anel(() => new T.Vector3(s0[2], Y_ALTO, s0[3]))); }
  for (let i = 0; i <= 170; i++) { const y = lerp(Y_ALTO, Y_BAIXO, i / 170); aneisPerna.push(anel((a) => ponto(y, a * 180 / Math.PI, 1))); }
  { const s1 = secao(Y_BAIXO); aneisPerna.push(anel(() => new T.Vector3(s1[2], Y_BAIXO, s1[3]))); }
  // pé: ao longo de z (calcanhar -> dedos): [z, meia-largura, altura, arco plantar (lado medial)]
  const PE = [[-.66, .02, .12, 0], [-.6, .17, .36, 0], [-.45, .25, .55, 0], [-.25, .27, .66, .02], [0, .27, .62, .05], [.3, .29, .5, .07], [.65, .33, .4, .06], [1.0, .37, .32, .03], [1.35, .38, .25, .01], [1.62, .36, .2, 0], [1.8, .3, .15, 0], [1.9, .18, .1, 0], [1.94, .04, .05, 0]];
  function peSecao(z) {
    z = clamp(z, PE[0][0], PE[PE.length - 1][0]); let k = 0; while (k < PE.length - 2 && z > PE[k + 1][0]) k++;
    const a0 = PE[Math.max(0, k - 1)], b0 = PE[k], c0 = PE[k + 1], d0 = PE[Math.min(PE.length - 1, k + 2)], t = clamp((z - b0[0]) / (c0[0] - b0[0]), 0, 1);
    return { w: Math.max(.02, cr(a0[1], b0[1], c0[1], d0[1], t)), h: Math.max(.05, cr(a0[2], b0[2], c0[2], d0[2], t)), arco: cr(a0[3], b0[3], c0[3], d0[3], t) };
  }
  for (let i = 0; i <= (BRACO ? -1 : 70); i++) {
    const z = lerp(PE[0][0], PE[PE.length - 1][0], i / 70), { w: wx, h, arco } = peSecao(z);
    // c > 0 é o lado medial do pé (vai para -x na perna esquerda, +x na direita)
    aneisPe.push(anel((a) => { const sn = Math.sin(a), c = Math.cos(a); let y = -4.3 + h / 2 + (h / 2) * sn * (sn < 0 ? 0.8 : 1); if (sn < 0 && c > 0) y += arco * Math.pow(c, 1.5) * -sn * 3.2; return new T.Vector3(-SX * wx * c, y, z); }));
  }
  const W3 = (x, y, z) => new T.Vector3(SX * x, y, z); // ponto do braço esquerdo (x < 0 = medial), espelhado no direito
  const PELES = []; // malhas da pele (para desenhar direto nela)
  // pele: quase opaca, com textura (poros e manchas suaves), relevo fino, tom avermelhado no joelho/tornozelo/pé,
  // luz que atravessa a pele (sombras quentes e borda) e brilho suave. As veias são desenhadas depois, "sob a pele".
  const mPele = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.FrontSide, extensions: { derivatives: true },
    uniforms: { cor: { value: new T.Vector3(0.87, 0.68, 0.57) }, sombra: { value: new T.Vector3(0.62, 0.27, 0.21) }, rubor: { value: new T.Vector3(0.84, 0.5, 0.43) }, opac: { value: 0.9 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vVP; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; vVP = mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: [
      'uniform vec3 cor; uniform vec3 sombra; uniform vec3 rubor; uniform float opac; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vVP;',
      'float hs(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
      'float rd(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(mix(hs(i), hs(i + vec3(1,0,0)), f.x), mix(hs(i + vec3(0,1,0)), hs(i + vec3(1,1,0)), f.x), f.y),',
      '             mix(mix(hs(i + vec3(0,0,1)), hs(i + vec3(1,0,1)), f.x), mix(hs(i + vec3(0,1,1)), hs(i + vec3(1,1,1)), f.x), f.y), f.z); }',
      'void main(){',
      '  vec3 N = normalize(vN), V = normalize(vV);',
      '  float alt = rd(vP * 34.0) * 0.6 + rd(vP * 90.0) * 0.4;',
      '  vec3 sx = dFdx(vVP), sy = dFdy(vVP); vec2 dh = vec2(dFdx(alt), dFdy(alt)) * 0.0022;',
      '  vec3 r1 = cross(sy, N), r2 = cross(N, sx); float det = dot(sx, r1);',
      '  if (abs(det) > 1e-9) N = normalize(abs(det) * N - sign(det) * (dh.x * r1 + dh.y * r2));',
      '  vec3 L = normalize(vec3(-0.45, 0.6, 1.0)), L2 = normalize(vec3(0.7, 0.2, -0.6));',
      '  float nl = dot(N, L), w = 0.5, d1 = max(0.0, (nl + w) / (1.0 + w)), d2 = max(0.0, (dot(N, L2) + w) / (1.0 + w));',
      '  float rim = pow(1.0 - abs(dot(N, V)), 2.4);',
      '  float mancha = rd(vP * 2.3) * 0.6 + rd(vP * 6.5) * 0.4;',
      '  float verm = exp(-pow((vP.y - 0.25) / 0.45, 2.0)) * 0.55 + exp(-pow((vP.y + 3.65) / 0.4, 2.0)) * 0.6 + smoothstep(-3.9, -4.25, vP.y) * 0.5;',
      '  vec3 base = mix(cor, rubor, clamp(verm * 0.7 + (mancha - 0.5) * 0.35, 0.0, 1.0)) * (0.96 + 0.08 * mancha);',
      '  vec3 c = mix(sombra, base, smoothstep(0.0, 0.9, d1)) * (0.46 + 0.6 * d1) + vec3(0.42, 0.58, 0.85) * 0.12 * d2;',
      '  vec3 H = normalize(L + V); float fr = 0.04 + 0.96 * pow(1.0 - max(dot(V, H), 0.0), 5.0);',
      '  c += pow(max(dot(N, H), 0.0), 42.0) * 0.22 * (0.5 + fr) + vec3(1.0, 0.8, 0.7) * rim * 0.16 + vec3(0.9, 0.35, 0.25) * rim * (1.0 - d1) * 0.25;',
      '  c *= 0.975 + 0.05 * rd(vP * 140.0);',
      '  gl_FragColor = vec4(c, mix(0.2 + 0.6 * rim, 1.0, opac));',
      '}'].join('\n'),
  });
  // braço: pescoço (cilindro na linha média) e polegar (lado lateral, palma para a frente)
  
  if (BRACO) {
    const malhaPele = (g, centro) => { // casca com as normais para fora
      const pp = g.attributes.position, nn = g.attributes.normal, i0 = Math.floor(pp.count / 2), c = centro(pp.getY(i0));
      if ((pp.getX(i0) - c[0]) * nn.getX(i0) + (pp.getZ(i0) - c[1]) * nn.getZ(i0) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
      const m = new T.Mesh(g, mPele); m.renderOrder = 2; cenaP.add(m); PELES.push(m);
    };
    // tronco
    const aneisTr = [], sT = (y) => secao(y, SEC_TRONCO);
    { const q = sT(4.05); aneisTr.push(anel(() => new T.Vector3(q[2], 4.05, q[3]))); }
    for (let i = 0; i <= 70; i++) { const y = lerp(4.05, .8, i / 70), q = sT(y); aneisTr.push(anel((a) => new T.Vector3(q[2] + SX * q[0] * Math.cos(a), y, q[3] + q[1] * Math.sin(a)))); }
    { const q = sT(.8); aneisTr.push(anel(() => new T.Vector3(q[2], .8, q[3]))); }
    malhaPele(casca(aneisTr), (y) => { const q = sT(y); return [q[2], q[3]]; });
    // pescoço (na linha média)
    const aneisPesc = [], cx = -2.55 * SX;
    aneisPesc.push(anel(() => new T.Vector3(cx, 3.8, 0)));
    for (let i = 0; i <= 34; i++) { const u = i / 34, y = lerp(3.8, 4.62, u), r = (0.48 + 0.03 * Math.sin(u * Math.PI)) * (u > 0.82 ? Math.sqrt(Math.max(0.05, 1 - Math.pow((u - 0.82) / 0.18, 2))) : 1); aneisPesc.push(anel((a) => new T.Vector3(cx + SX * r * Math.cos(a), y, 0.02 + r * 0.96 * Math.sin(a)))); }
    aneisPesc.push(anel(() => new T.Vector3(cx, 4.62, 0)));
    malhaPele(casca(aneisPesc), () => [cx, 0.02]);
    // polegar (lateral) e dedos
    const dedo = (pts, r) => { const c = new T.CatmullRomCurve3(pts), m = new T.Mesh(new T.TubeGeometry(c, 20, r, 12, false), mPele); m.renderOrder = 2; cenaP.add(m); PELES.push(m); const pn = new T.Mesh(new T.SphereGeometry(r, 12, 8), mPele); pn.position.copy(c.getPointAt(1)); pn.renderOrder = 2; cenaP.add(pn); PELES.push(pn); };
    dedo([W3(.56, -2.62, .04), W3(.7, -2.95, .08), W3(.77, -3.28, .12), W3(.78, -3.55, .14)], .085);
    [[.26, .55, .07], [.09, .63, .072], [-.08, .59, .068], [-.24, .47, .06]].forEach(([dx, comp, r]) => dedo([W3(.3 + dx, -3.46, 0), W3(.3 + dx, -3.46 - comp * 0.5, .015), W3(.3 + dx * 1.04, -3.46 - comp, .035)], r));
  }
  for (const g of BRACO ? [casca(aneisPerna)] : [casca(aneisPerna), casca(aneisPe)]) {
    const p = g.attributes.position, n = g.attributes.normal, i0 = Math.floor(p.count / 2), sY = secao(clamp(p.getY(i0), -3.85, 4.3));
    if ((p.getX(i0) - sY[2]) * n.getX(i0) + (p.getZ(i0) - sY[3]) * n.getZ(i0) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
    const m = new T.Mesh(g, mPele); m.renderOrder = 2; cenaP.add(m); PELES.push(m);
  }
  const plat = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 0.06, 56), new T.MeshBasicMaterial({ color: new T.Color(0x17232f).convertSRGBToLinear() }));
  plat.position.set(0, -4.36, 0.55); if (!BRACO) cenaP.add(plat);

  // ---------- do 2D para o 3D ----------
  // alturas: os marcos do mapa (JSF, joelho, tornozelo) viram alturas na perna
  const Y3M = (y) => porTrechos(y, [[10, 4.3], [48, 3.75], [320, .1], [552, -3.55], [612, -4.3]]);
  const Y3P = (y) => porTrechos(y, [[10, 4.3], [314, .1], [535, -3.5], [622, -4.3]]);
  // trajeto anatômico: [altura, ângulo, fração]
  // magna: anteromedial na perna (à frente do maléolo medial), posteromedial no joelho, medial na coxa
  const T_GSV = [[-3.55, 135, .9], [-2.8, 142, .9], [-2.0, 148, .9], [-1.2, 156, .9], [-.5, 172, .9], [.1, 190, .9], [.8, 190, .9], [1.6, 184, .9], [2.4, 176, .9], [3.1, 160, .88], [3.5, 145, .8], [3.75, 130, .5]];
  // parva: lateroposterior (atrás do maléolo lateral), subindo para a linha média posterior até a JSP
  const T_SSV = [[-3.5, 318, .9], [-2.7, 305, .9], [-1.9, 295, .9], [-1.1, 286, .92], [-.4, 278, .9], [-.05, 272, .75], [.1, 268, .48]];
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
  // Correspondência das faces entre o mapa 2D e a perna 3D (ângulo: 0° lateral, 90° anterior, 180° medial, 270° posterior).
  // Os dois desenhos do 2D (perna esquerda) têm o lado MEDIAL à direita — no anterior a femoral fica à esquerda
  // da safena magna, e a magna desce pelo lado direito:
  //   anterior  -> centro = face anterior (90°), borda direita = medial (180°), borda esquerda = lateral (0°);
  //   posterior -> centro = face posterior (270°), borda direita = medial (180°), borda esquerda = lateral (360°).
  // As bordas têm uma margem para dentro, para o traço nunca sair da perna.
  const MARGEM = 0.12;
  const kAnt = (ang) => { let d = ang - 90; if (d > 180) d -= 360; if (d < -180) d += 360; return d / 90; };    // +1 medial, -1 lateral
  const kPost = (ang) => { let d = ang - 270; if (d > 180) d -= 360; if (d < -180) d += 360; return -d / 90; }; // +1 medial, -1 lateral
  const naFrente = (ang) => ang >= 345 || ang <= 195; // medial e lateral puros ficam nas bordas do desenho anterior
  // Pé (dorso): no desenho anterior do 2D, abaixo do tornozelo (y 556 a 610) fica o pé — de cima para baixo vai do
  // tornozelo aos dedos; da borda esquerda (lateral) à direita (medial) atravessa o dorso de um lado ao outro.
  const Y_PE0 = 556, Y_PE1 = 610, Z_PE0 = 0.05, Z_PE1 = 1.88;
  function pontoPe(y, x) {
    const z = lerp(Z_PE0, Z_PE1, clamp((y - Y_PE0) / (Y_PE1 - Y_PE0), 0, 1)), sp = peSecao(z), l = limA(y);
    const c = clamp((x - l[0]) / (l[1] * (1 - MARGEM)), -0.95, 0.95), sn = Math.sqrt(1 - c * c); // c > 0: medial
    return new T.Vector3(-SX * sp.w * c * 1.01, -4.3 + sp.h / 2 + (sp.h / 2) * sn * 1.01, z);
  }
  function descePe(P) {
    const y = clamp(Y_PE0 + (P.z - Z_PE0) / (Z_PE1 - Z_PE0) * (Y_PE1 - Y_PE0), Y_PE0, Y_PE1), sp = peSecao(P.z), l = limA(y);
    const c = clamp((-SX * P.x) / sp.w, -1, 1);
    return [r1(l[0] + c * l[1] * (1 - MARGEM)), r1(y)];
  }
  // um ponto desenhado no mapa vira um ponto rente à pele
  function sobe(x, y, vista) {
    if (vista === 'anterior') {
      if (y > Y_PE0) return pontoPe(y, x);
      const y3 = clamp(Y3M(y), -3.8, 4.2), l = limA(y), k = clamp((x - l[0]) / (l[1] * (1 - MARGEM)), -1, 1);
      return ponto(y3, 90 + k * 90, .955);
    }
    const y3 = clamp(Y3P(y), -3.8, 4.2), l = limP(y), k = clamp((x - l[0]) / (l[1] * (1 - MARGEM)), -1, 1);
    return ponto(y3, 270 - k * 90, .955);
  }
  // inverso de sobe(): ponto da pele -> { x, y } no mapa 2D da perna esquerda
  const inverte = (tab2) => { const t = tab2.map(([a, b]) => [b, a]).sort((p, q) => p[0] - q[0]); return (y3) => porTrechos(y3, t); };
  const Y2M = inverte([[10, 4.3], [48, 3.75], [320, .1], [552, -3.55], [612, -4.3]]);
  const Y2P = inverte([[10, 4.3], [314, .1], [535, -3.5], [622, -4.3]]);
  function anguloNaPele(P) {
    const s2 = secao(clamp(P.y, -3.85, 4.3));
    const lx = (P.x - s2[2]) / (SX * s2[0]), lz = (P.z - s2[3]) / s2[1];
    return (Math.atan2(lz, lx) * 180 / Math.PI + 360) % 360;
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  function desce(P, vista) {
    if (P.pe) return descePe(P);
    const y3 = clamp(P.y, -3.8, 4.2), ang = anguloNaPele(P);
    if (vista === 'anterior') { const y = Y2M(y3), l = limA(y); return [r1(l[0] + clamp(kAnt(ang), -1, 1) * l[1] * (1 - MARGEM)), r1(y)]; }
    const y = Y2P(y3), l = limP(y); return [r1(l[0] + clamp(kPost(ang), -1, 1) * l[1] * (1 - MARGEM)), r1(y)];
  }
  // a vista do traço: anterior se a maior parte dele está na metade da frente da perna, senão posterior
  function vistaDoTraco(pts3) {
    let a = 0;
    for (const P of pts3) if (P.pe || naFrente(anguloNaPele(P))) a++;
    return a * 2 >= pts3.length ? 'anterior' : 'posterior';
  }
  function texturaFluxo() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 4; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#5a5a5a'); gr.addColorStop(.45, '#5a5a5a'); gr.addColorStop(.7, '#ffffff'); gr.addColorStop(.82, '#ffffff'); gr.addColorStop(1, '#5a5a5a');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; return t;
  }
  const texBase = texturaFluxo();
  const COR3 = { ok: new T.Color(0x3d8fe0), ruim: new T.Color(0xe23b3b), trombo: new T.Color(0x7b838f), recan: new T.Color(0xd99a3d), ausente: new T.Color(0x9aa6b0), art: new T.Color(0xd8343a), hiper: new T.Color(0x9c1f24), hipo: new T.Color(0xef8080), esten: new T.Color(0xf5a623), ocl: new T.Color(0x3b4048) };
  COR3.parcial = new T.Color(0x3d8fe0); if (BRACO) COR3.trombo = new T.Color(0x3b4048);
  for (const k in COR3) COR3[k].convertSRGBToLinear();
  const ROTULO = { ok: 'competente', ruim: 'com refluxo', trombo: 'trombose', recan: 'recanalização parcial', ausente: 'ausente', art: 'sem alterações', hiper: 'fluxo hipercinético', hipo: 'fluxo hipocinético', esten: 'estenose', ocl: 'oclusão' };
  if (BRACO) { ROTULO.ok = 'pérvia'; ROTULO.trombo = 'trombose oclusiva'; ROTULO.parcial = 'trombose parcial'; }
  const estadoMMSS = (v) => { const s = v && v.status; return s === 'Trombose oclusiva' ? 'trombo' : s === 'Trombose parcial (não oclusiva)' ? 'parcial' : s === 'Recanalização parcial' ? 'recan' : s === 'Ausente' ? 'ausente' : 'ok'; };
  const estadoDe = (s) => !s ? 'ok' : s === RUIM ? 'ruim' : s === 'ausente' ? 'ausente' : s.indexOf('não compressível') === 0 ? 'trombo' : s.indexOf('semi compressível') === 0 ? 'recan' : 'ok';
  const gVeias = new T.Group(); cenaP.add(gVeias);
  // veias "sob a pele": desenhadas depois da pele, levemente translúcidas; as do lado de lá da perna ficam apagadas
  // controle "Pele": 0 = pele opaca (só as varizes), 0,5 = aparecem as safenas, 1 = transparente (veias profundas)
  const suave = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function camadas() {
    const t = st.pele; mPele.uniforms.opac.value = 1 - 0.8 * t;
    const fator = { variz: 1, safena: 0.15 + 0.85 * suave(0, 0.5, t), profunda: suave(0.35, 0.9, t) };
    for (const m of gVeias.children) {
      if (!m.material || m.material.userData.op0 === undefined) continue;
      const f = fator[m.userData.camada || 'safena']; m.material.opacity = m.material.userData.op0 * f; m.visible = f > 0.02;
    }
  }
  function sobPele() {
    for (const m of gVeias.children) {
      if (!m.material || m.material.userData.sob) continue;
      const mt = m.material; mt.userData.sob = true; mt.userData.op0 = mt.opacity; mt.transparent = true; m.renderOrder = 3;
      if (m.userData.semFade) continue;
      mt.onBeforeCompile = (sh) => {
        sh.vertexShader = 'varying vec3 vMundoSP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vMundoSP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vMundoSP;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  { vec2 d = normalize(vMundoSP.xz + vec2(1e-4)), cc = normalize(cameraPosition.xz + vec2(1e-4)); gl_FragColor.a *= mix(0.2, 0.9, smoothstep(-0.35, 0.45, dot(d, cc))); }');
      };
      mt.needsUpdate = true;
    }
  }
  let TUBOS = [], AMOSTRAS = [], ROT_P = [];
  function tubo(o) {
    const curva = new T.CatmullRomCurve3(o.pts), comp = curva.getLength(); let tex = null;
    if (o.estado === 'ruim' || o.estado === 'recan' || o.estado === 'parcial') { tex = texBase.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(2, comp * 2.6), 1); }
    const mat = new T.MeshStandardMaterial({ color: COR3[o.estado].clone(), map: tex, roughness: 0.45, emissive: COR3[o.estado].clone().multiplyScalar(0.3) });
    const leve = o.estado === 'ausente' || (o.discreto && o.estado === 'ok') || o.estado === 'parcial';
    if (leve) { mat.transparent = true; mat.opacity = o.estado === 'ausente' ? 0.5 : o.estado === 'parcial' ? 0.55 : 0.4; }
    const malhaT = new T.Mesh(new T.TubeGeometry(curva, Math.max(8, Math.round(comp * 16)), leve && o.estado === 'ok' ? o.r * 0.7 : o.r, 10, false), mat);
    if (o.estado === 'parcial') { // núcleo escuro do trombo, do meio da veia
      const nucleo = new T.Mesh(new T.TubeGeometry(curva, Math.max(8, Math.round(comp * 16)), o.r * 0.55, 8, false), new T.MeshStandardMaterial({ color: COR3.trombo.clone(), roughness: 0.7 }));
      nucleo.userData.camada = /^Veias? (jugular|subclávia|axilar|braquiais|radiais|ulnares)/i.test(o.nome || '') ? 'profunda' : 'safena'; nucleo.userData.semFade = !!o.semFade; gVeias.add(nucleo);
    }
    malhaT.userData.camada = /^Veias? (femoral|poplítea|tibiais|gastrocnêmicas|soleares|jugular|subclávia|axilar|braquiais|radiais|ulnares)/i.test(o.nome || '') ? 'profunda' : 'safena'; malhaT.userData.semFade = !!o.semFade; gVeias.add(malhaT);
    const t = { nome: o.nome, chave: o.chave || null, estado: o.estado, curva, tex, mat, rotulo: o.rotulo || null }; TUBOS.push(t);
    if (o.estado !== 'ausente' && !o.semToque) for (let k = 0; k < 30; k++) AMOSTRAS.push({ p: curva.getPointAt(k / 29), v: TUBOS.length - 1 });
    return TUBOS.length - 1;
  }
  function bola(p, r, estado, nome, chave) {
    const c = COR3[estado], mat = new T.MeshStandardMaterial({ color: c.clone(), roughness: 0.35, emissive: c.clone().multiplyScalar(0.35) });
    const m = new T.Mesh(new T.SphereGeometry(r, 20, 14), mat); m.position.copy(p); m.userData.camada = 'safena'; gVeias.add(m);
    if (!nome) return;
    // junção: entra como "tubo" curtinho para o toque, o rótulo e a cor
    TUBOS.push({ nome, chave, estado, curva: new T.CatmullRomCurve3([p.clone(), p.clone().add(new T.Vector3(0, 0.001, 0))]), tex: null, mat, junc: true });
    for (let k = 0; k < 6; k++) AMOSTRAS.push({ p: p.clone(), v: TUBOS.length - 1 });
  }
  // trechos de uma safena, com a mesma regra do mapa 2D (início/fim do refluxo ou da ausência)
  function trechosSafena(status, v, marco) {
    const est = estadoDe(status), top = marco.top, bot = marco.tornozelo;
    if (est !== 'ruim' && est !== 'ausente' && est !== 'trombo') return [{ a: top, b: bot, e: est }];
    const pi = v.inicio && v.inicio.indexOf('cm_') === 0, pf = v.fim && v.fim.indexOf('cm_') === 0;
    if (!(v.inicio && v.fim && (!pi || v.inicio_valor) && (!pf || v.fim_valor))) return [{ a: top, b: bot, e: est }];
    let a = G.yFromField(v.inicio, v.inicio_valor, marco), b = G.yFromField(v.fim, v.fim_valor, marco); if (a > b) { const t = a; a = b; b = t; }
    // ausência: o trecho presente pode ser normal, com refluxo ou trombosado; tromboflebite: o resto é pérvio (normal ou com refluxo)
    const resto = est === 'ausente' ? estadoDe(v.restante) : est === 'trombo' ? (estadoDe(v.restante) === 'ruim' ? 'ruim' : 'ok') : 'ok';
    const out = []; if (a > top + 2) out.push({ a: top, b: a, e: resto }); out.push({ a, b, e: est }); if (b < bot - 2) out.push({ a: b, b: bot, e: resto }); return out;
  }
  // ---------- Doppler arterial ----------
  // trajeto de cada artéria da perna esquerda: [altura, ângulo (0° lateral, 90° anterior, 180° medial, 270° posterior), fração do raio]
  const T_ART = [
    ['Artéria Femoral Comum', 'A. femoral comum', .07, [[4.28, 114, .5], [3.95, 117, .48], [3.6, 120, .46]]],
    ['Artéria Femoral Profunda', 'A. femoral profunda', .05, [[3.6, 118, .44], [3.1, 92, .36], [2.3, 58, .3], [1.5, 36, .28]]],
    ['Artéria Femoral Superficial', 'A. femoral superficial', .058, [[3.6, 121, .45], [3.1, 138, .42], [2.2, 166, .38], [1.3, 206, .36], [.6, 248, .38]]],
    ['Artéria Poplítea', 'A. poplítea', .054, [[.6, 248, .38], [.1, 262, .4], [-.4, 266, .38], [-.88, 263, .36]]],
    ['Artéria Tibial Anterior', 'A. tibial anterior', .036, [[-.7, 264, .34], [-.95, 305, .2], [-1.2, 395, .32], [-1.9, 418, .42], [-2.7, 430, .45], [-3.35, 442, .5], [-3.65, 452, .58]]],
    ['Artéria Fibular', 'A. fibular', .033, [[-.88, 263, .36], [-1.5, 284, .42], [-2.2, 298, .44], [-2.9, 302, .44], [-3.4, 300, .45]]],
    ['Artéria Tibial Posterior', 'A. tibial posterior', .036, [[-.88, 263, .36], [-1.5, 240, .42], [-2.3, 220, .45], [-3.1, 200, .55], [-3.55, 190, .68], [-3.78, 180, .72]]],
  ];
  // membro superior: tronco braquiocefálico (só à direita), subclávia, axilar, braquial, radial e ulnar
  const T_ART_BRACO = () => {
    const dir = ladoMembro === 'Direito';
    return [
      ...(dir ? [['Tronco Braquiocefálico', 'Tronco braquiocefálico', .075, [W3(-2.42, 2.95, .16), W3(-2.4, 3.2, .16), W3(-2.3, 3.5, .15)]]] : []),
      ['Artéria Subclávia', 'A. subclávia', .06, dir ? [W3(-2.3, 3.5, .15), W3(-1.8, 3.72, .12), W3(-1.15, 3.6, .1), W3(-.62, 3.35, .08)] : [W3(-2.42, 2.95, .1), W3(-2.3, 3.4, .12), W3(-1.8, 3.7, .12), W3(-1.15, 3.6, .1), W3(-.62, 3.35, .08)]],
      ['Artéria Axilar', 'A. axilar', .055, [W3(-.62, 3.35, .08), W3(-.3, 3.1, .0), ponto(2.85, 172, .42), ponto(2.55, 165, .4)]],
      ['Artéria Braquial', 'A. braquial', .045, [[2.55, 165, .4], [1.8, 155, .38], [1.0, 140, .36], [.4, 120, .34], [.05, 105, .32]]],
      ['Artéria Radial', 'A. radial', .032, [[.05, 105, .32], [-.5, 80, .45], [-1.4, 60, .6], [-2.2, 50, .75], [-2.45, 45, .8]]],
      ['Artéria Ulnar', 'A. ulnar', .032, [[.05, 105, .32], [-.5, 130, .45], [-1.4, 140, .58], [-2.2, 145, .72], [-2.45, 148, .78]]],
    ];
  };
  const TERCOS = ['Terço proximal', 'Terço médio', 'Terço distal'];
  // velocidade da animação do sangue nas artérias: normocinético bem mais rápido que o venoso; hipo mais lento, hiper mais rápido
  const RAPIDEZ_ART = 2.4, VEL_ART = { 'Normocinético': 1, 'Hipercinético': 1.7, 'Hipocinético': 0.4 };
  // trechos de uma artéria conforme os achados (u = 0 proximal .. 1 distal): oclusão (terço ou total),
  // estenose da placa no terço, stent (trecho central, como no 2D) com reestenose ou ocluído, velocidade
  const CENTRAL = [0.3, 0.7]; // aneurisma e dissecção: trecho central do vaso (igual ao 2D)
  // stent: o terço escolhido no 2D, todo o vaso, ou o trecho central (exames sem a localização)
  const faixaStent3D = (v) => { const l = v && v.localizacaoStent; return l === 'Terço proximal' ? [0.02, 1 / 3] : l === 'Terço médio' ? [1 / 3, 2 / 3] : l === 'Terço distal' ? [2 / 3, 0.98] : l === 'Toda a extensão' ? [0.02, 0.98] : CENTRAL; };
  const numA = (x) => { const n = parseFloat(String(x || '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  function trechosArteria(v) {
    const base = v.velocidade === 'Hipercinético' ? 'hiper' : v.velocidade === 'Hipocinético' ? 'hipo' : 'art';
    const ocl = v.status === 'Ocluída' ? (v.localizacaoOclusao || 'Total') : null, iOcl = TERCOS.indexOf(ocl);
    const pct = numA(v.estenosePercentual), est = v.status !== 'Ocluída' && v.placa === 'Presente' && pct > 0 ? TERCOS.indexOf(v.localizacaoPlaca || 'Terço médio') : -1;
    // (FAV: veia de drenagem tratada como artéria no nível Artéria)
    const stent = v.stent && v.stent !== 'Ausente' ? v.stent : null, FS = faixaStent3D(v);
    const estado = (u) => {
      const t = Math.min(2, Math.floor(u * 3));
      if (ocl && (ocl === 'Total' || iOcl === t)) return 'ocl';
      if (stent && u > FS[0] && u < FS[1]) { if (stent === 'Ocluído') return 'ocl'; if (stent === 'Com reestenose') return 'esten'; }
      if (est === t) return 'esten';
      return base;
    };
    const cortes = [...new Set([0, 1 / 3, 2 / 3, 1, ...(stent ? FS : [])])].sort((a, b) => a - b), out = [];
    for (let i = 0; i < cortes.length - 1; i++) {
      const a = cortes[i], b = cortes[i + 1], e = estado((a + b) / 2), u = out[out.length - 1];
      const rest = stent === 'Com reestenose' && a >= FS[0] - 1e-6 && b <= FS[1] + 1e-6;
      if (u && u.e === e && e !== 'esten') u.b = b; else out.push({ a, b, e, pct: e === 'esten' ? (rest ? 60 : pct) : 0, rest });
    }
    return out;
  }
  // tubo de raio variável (a estenose afina a artéria; o aneurisma dilata)
  function geoTubo(curva, rFn, nSeg, nRad) {
    const fr = curva.computeFrenetFrames(nSeg, false), pos = [], nor = [], idx = [], P = new T.Vector3(), n = new T.Vector3();
    for (let i = 0; i <= nSeg; i++) {
      curva.getPointAt(i / nSeg, P); const r = rFn(i / nSeg);
      for (let j = 0; j <= nRad; j++) { const a = j / nRad * Math.PI * 2; n.copy(fr.normals[i]).multiplyScalar(-Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a)).normalize(); pos.push(P.x + r * n.x, P.y + r * n.y, P.z + r * n.z); nor.push(n.x, n.y, n.z); }
    }
    for (let i = 0; i < nSeg; i++) for (let j = 0; j < nRad; j++) { const a = i * (nRad + 1) + j, b = a + nRad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g;
  }
  // calibre normal (mm) de cada artéria, para o tamanho do aneurisma
  const CALIBRE = { 'Tronco Braquiocefálico': 12, 'Artéria Subclávia': 8, 'Artéria Axilar': 7, 'Artéria Braquial': 5, 'Artéria Radial': 2.5, 'Artéria Ulnar': 2.5, 'Artéria Femoral Comum': 9, 'Artéria Femoral Profunda': 6, 'Artéria Femoral Superficial': 7, 'Artéria Poplítea': 6, 'Artéria Tibial Anterior': 3, 'Artéria Fibular': 3, 'Artéria Tibial Posterior': 3 };
  const fatorAneurisma = (key, v) => { const d = numA(v.aneurismaDiametro); return d > 0 ? clamp(d / (CALIBRE[key] || 6), 1.5, 2.8) : 2.2; };
  const bojo = (u) => Math.exp(-Math.pow((u - 0.5) / 0.11, 2));
  // malha do stent (losangos metálicos)
  function texturaStent(fundo) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    if (fundo) { g.fillStyle = fundo; g.fillRect(0, 0, 64, 64); } else g.clearRect(0, 0, 64, 64);
    g.strokeStyle = '#ffffff'; g.lineWidth = fundo ? 9 : 5;
    g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  const texStent = texturaStent(), texStentPerna = texturaStent('#6f7883');
  const corStent = (s) => s === 'Com reestenose' ? 0xd9a14a : s === 'Ocluído' ? 0x8b939c : 0xd7dde3;
  // enxerto / ponte: corre pela face medial, da femoral comum (ou superficial) até o alvo (como no 2D)
  const ENX_INICIO = { 'Femoral comum': [[3.92, 117, .5], [3.5, 140, .78]], 'Femoral superficial': [[3.0, 140, .42], [2.75, 150, .78]] };
  const ENX_MEIO = [[2.2, 165, .84], [1.3, 178, .86], [.6, 188, .86]];
  const ENX_FIM = {
    'Femoropoplíteo acima do joelho': [[.35, 225, .62], [.15, 250, .42]],
    'Femoropoplíteo abaixo do joelho': [[.1, 195, .86], [-.4, 215, .74], [-.72, 248, .46], [-.86, 262, .38]],
    'Femorodistal|Tibial posterior': [[.1, 195, .86], [-.9, 200, .84], [-1.9, 205, .74], [-2.7, 205, .6], [-3.05, 200, .56]],
    'Femorodistal|Fibular': [[.1, 195, .86], [-.9, 205, .84], [-1.6, 235, .7], [-2.15, 290, .48]],
    'Femorodistal|Tibial anterior': [[.1, 195, .86], [-.9, 200, .86], [-1.3, 150, .86], [-1.7, 95, .78], [-2.0, 60, .44]],
  };
  const ENX_CRUZADO = [[4.62, 178, 2.9], [4.5, 165, 1.8], [4.25, 135, 1.0], [3.95, 118, .55]];
  function rotaEnxerto(enx) {
    if (!enx || !enx.tipo) return null;
    if (enx.tipo === 'Fêmoro-femoral cruzado') return ENX_CRUZADO;
    const fim = enx.tipo === 'Femorodistal' ? ENX_FIM['Femorodistal|' + (enx.destino || 'Tibial posterior')] : ENX_FIM[enx.tipo];
    if (!fim) return null;
    return [...ENX_INICIO[enx.origem === 'Femoral superficial' ? 'Femoral superficial' : 'Femoral comum'], ...ENX_MEIO, ...fim];
  }
  const LOCAL_ENX = { 'Anastomose proximal': 'Terço proximal', 'Corpo do enxerto': 'Terço médio', 'Anastomose distal': 'Terço distal' };
  // o enxerto como "artéria" (mesmos trechos e a mesma vista por dentro)
  function enxertoComoArteria(enx) {
    const loc = LOCAL_ENX[enx.local] || 'Terço médio';
    return { status: enx.status === 'Ocluído' ? 'Ocluída' : 'Pérvia', localizacaoOclusao: 'Total', velocidade: 'Normocinético', tipoOnda: enx.status === 'Ocluído' ? 'Monofásico' : 'Bifásico', placa: enx.status === 'Com estenose' ? 'Presente' : 'Ausente', estenosePercentual: enx.status === 'Com estenose' ? '60' : '', localizacaoPlaca: loc, caracteristicaPlaca: 'Mista', ateromatose: 'Ausente', enxerto: true };
  }
  const curvaDaRota = (rota) => {
    if (rota[0] instanceof T.Vector3) return new T.CatmullRomCurve3(rota);
    const pts0 = [];
    for (let i = 0; i < rota.length - 1; i++) { const [ya, ga, fa] = rota[i], [yb, gb, fb] = rota[i + 1], n = Math.max(2, Math.ceil(Math.abs(yb - ya) / 0.12)); for (let j = i ? 1 : 0; j <= n; j++) { const k = j / n; pts0.push(ponto(lerp(ya, yb, k), lerp(ga, gb, k), lerp(fa, fb, k))); } }
    return new T.CatmullRomCurve3(pts0);
  };
  // pontinhos de ateromatose na parede (como os pontos brancos do 2D)
  const mAtero = new T.MeshStandardMaterial({ color: 0xfff1c2, roughness: 0.5 });
  function geraArterias() {
    const A = ex.arterias || {}, inicio = {}, extras = { stent: false, aneur: false, dissec: false, reab: false, enx: null };
    const lista = (BRACO ? T_ART_BRACO() : T_ART).map(([key, nome, r0, rota]) => [key, nome, r0, curvaDaRota(rota), A[key]]);
    const enx = ex.enxerto && ex.enxerto.tipo ? ex.enxerto : null, rotaE = rotaEnxerto(enx);
    if (rotaE) { lista.push(['enxerto', 'Enxerto ' + enx.tipo.toLowerCase(), .05, curvaDaRota(rotaE), enxertoComoArteria(enx)]); extras.enx = enx.status === 'Ocluído' ? 'ocl' : 'ok'; }
    for (const [key, nome, r0, toda, v] of lista) {
      if (!v) continue;
      const ehEnx = key === 'enxerto', aneur = !ehEnx && v.aneurisma ? fatorAneurisma(key, v) : 0, sentido = v.sentido === 'Retrógrado' ? -1 : 1;
      for (const tr of trechosArteria(v)) {
        const pts = []; for (let i = 0; i <= 24; i++) pts.push(toda.getPointAt(lerp(tr.a, tr.b, i / 24)));
        const curva = new T.CatmullRomCurve3(pts), comp = curva.getLength();
        const k = tr.e === 'esten' ? clamp(tr.pct / 100, 0, .95) * 0.8 : 0;
        const rFn = (u) => { const ug = lerp(tr.a, tr.b, u); return r0 * (tr.e === 'ocl' ? 0.92 : 1) * (1 - k * Math.pow(Math.sin(Math.PI * u), 2)) * (aneur ? 1 + (aneur - 1) * bojo(ug) : 1); };
        const tex = null; // na perna as artérias ficam paradas (o fluxo aparece na Artéria e Por dentro)
        const cor = ehEnx && tr.e !== 'esten' ? new T.Color(tr.e === 'ocl' ? 0x7d8790 : 0x2f6fd6).convertSRGBToLinear() : COR3[tr.e].clone();
        const mat = new T.MeshStandardMaterial({ color: cor.clone(), map: tex, roughness: 0.42, emissive: cor.clone().multiplyScalar(0.3) });
        const malha = new T.Mesh(geoTubo(curva, rFn, Math.max(16, Math.round(comp * 20)), 12), mat); malha.userData.camada = 'safena'; malha.userData.semFade = BRACO && /Tronco|Subclávia|Axilar/.test(key); gVeias.add(malha);
        const rot = tr.e === 'esten' ? (tr.rest ? 'reestenose do stent' : 'estenose ' + Math.round(tr.pct) + '%') : tr.e === 'ocl' && v.stent === 'Ocluído' && tr.a >= faixaStent3D(v)[0] - 1e-6 && tr.b <= faixaStent3D(v)[1] + 1e-6 ? 'stent ocluído' : null;
        TUBOS.push({ nome, chave: { tipo: ehEnx ? 'enxerto' : 'arteria', key }, estado: tr.e, rotulo: rot, curva, tex, mat, sentido, corFixa: ehEnx && tr.e !== 'esten' ? cor : null });
        for (let q = 0; q < 24; q++) AMOSTRAS.push({ p: curva.getPointAt(q / 23), v: TUBOS.length - 1 });
        if (inicio[key] === undefined) inicio[key] = TUBOS.length - 1;
      }
      if (ehEnx) continue;
      const ajusta = (o) => { o.userData.camada = 'safena'; o.userData.semFade = BRACO && /Tronco|Subclávia|Axilar/.test(key); gVeias.add(o); return o; };
      // stent: malha metálica em volta do trecho central
      if (v.stent && v.stent !== 'Ausente') {
        extras.stent = true;
        const FSp = faixaStent3D(v), pts = []; for (let i = 0; i <= 24; i++) pts.push(toda.getPointAt(lerp(FSp[0], FSp[1], i / 24)));
        const cs = new T.CatmullRomCurve3(pts), comp = cs.getLength(), tx = texStentPerna.clone(); tx.needsUpdate = true; tx.repeat.set(Math.max(2, comp * 6), 3);
        const cor = new T.Color(corStent(v.stent)).convertSRGBToLinear();
        ajusta(new T.Mesh(geoTubo(cs, () => r0 * 1.42, Math.max(16, Math.round(comp * 24)), 14), new T.MeshStandardMaterial({ color: cor, map: tx, metalness: 0.55, roughness: 0.35, emissive: cor.clone().multiplyScalar(0.25), transparent: true, opacity: 0.92 })));
        for (const u of [FSp[0], FSp[1]]) { const anel = new T.Mesh(new T.TorusGeometry(r0 * 1.42, r0 * 0.18, 8, 24), new T.MeshStandardMaterial({ color: cor, metalness: 0.6, roughness: 0.3, emissive: cor.clone().multiplyScalar(0.3) })); anel.position.copy(toda.getPointAt(u)); anel.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), toda.getTangentAt(u)); ajusta(anel); }
      }
      // aneurisma sacular: bolsa de um lado
      if (aneur && v.aneurismaForma === 'Sacular') {
        extras.aneur = true; const P = toda.getPointAt(0.5), tg = toda.getTangentAt(0.5), lado = new T.Vector3(SX, 0, 0.3).cross(tg).normalize();
        const b = new T.Mesh(new T.SphereGeometry(r0 * aneur * 0.75, 24, 16), new T.MeshStandardMaterial({ color: COR3[v.status === 'Ocluída' ? 'ocl' : 'art'].clone(), roughness: 0.45 }));
        b.position.copy(P).addScaledVector(lado, r0 * aneur * 0.55); ajusta(b);
      } else if (aneur) extras.aneur = true;
      // dissecção: a linha branca do flap no trecho central
      if (v.disseccao) {
        extras.dissec = true; const pts = [];
        for (let i = 0; i <= 40; i++) { const u = lerp(CENTRAL[0], CENTRAL[1], i / 40), P = toda.getPointAt(u), tg = toda.getTangentAt(u), nn = new T.Vector3(0, 0, 1).cross(tg).normalize(), bn = tg.clone().cross(nn), ang = i / 40 * Math.PI * 1.2, r = r0 * 1.04 * (aneur ? 1 + (aneur - 1) * bojo(u) : 1); pts.push(P.clone().addScaledVector(nn, Math.cos(ang) * r).addScaledVector(bn, Math.sin(ang) * r)); }
        ajusta(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 60, r0 * 0.16, 6, false), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x555555, roughness: 0.4 })));
      }
      // reabitada por colaterais: vasinhos tortuosos chegando no terço proximal
      if (v.reabitada) {
        extras.reab = true;
        [[-1, 0.1], [1, 0.18], [-1, 0.26]].forEach(([s, u]) => {
          const P = toda.getPointAt(u), Q = toda.getPointAt(Math.max(0, u - 0.16)), tg = toda.getTangentAt(u), nn = new T.Vector3(0, 0, 1).cross(tg).normalize().multiplyScalar(s);
          const pts = [Q.clone().addScaledVector(nn, r0 * 5), Q.clone().lerp(P, 0.4).addScaledVector(nn, r0 * 4.2).add(new T.Vector3(0, 0, r0 * 1.5)), Q.clone().lerp(P, 0.75).addScaledVector(nn, r0 * 2.2), P];
          ajusta(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 30, r0 * 0.28, 6, false), new T.MeshStandardMaterial({ color: COR3.hipo.clone(), roughness: 0.5 })));
        });
      }
      // ateromatose: pontinhos na parede
      const nAt = { Discreta: 5, Moderada: 10, Severa: 18 }[v.ateromatose] || 0;
      for (let i = 0; i < nAt; i++) {
        const u = (i + 0.5) / nAt, P = toda.getPointAt(u), tg = toda.getTangentAt(u), nn = new T.Vector3(0, 0, 1).cross(tg).normalize(), bn = tg.clone().cross(nn), a = i * 2.4;
        const m = new T.Mesh(new T.SphereGeometry(r0 * 0.32, 8, 6), mAtero); m.position.copy(P).addScaledVector(nn, Math.cos(a) * r0 * 0.92).addScaledVector(bn, Math.sin(a) * r0 * 0.92); ajusta(m);
      }
    }
    const rot = (i, key, txt, t) => { const k = inicio[key]; if (k === undefined) return null; const lst = TUBOS.filter((q) => q.chave.key === key); return { el: $('l' + i), txt, p: TUBOS[k].curva.getPointAt(t), v: k, ruim: lst.some((q) => q.estado === 'esten' || q.estado === 'ocl') }; };
    ROT_P = BRACO ? [rot(0, 'Artéria Subclávia', 'A. subclávia', .45), rot(1, 'Artéria Axilar', 'A. axilar', .5), rot(2, 'Artéria Braquial', 'A. braquial', .45), rot(3, 'Artéria Radial', 'A. radial', .55), rot(4, 'Artéria Ulnar', 'A. ulnar', .55)].filter(Boolean) : [rot(0, 'Artéria Femoral Comum', 'A. femoral comum', .5), rot(1, 'Artéria Femoral Superficial', 'A. femoral sup.', .4), rot(2, 'Artéria Poplítea', 'A. poplítea', .5), rot(3, 'Artéria Tibial Anterior', 'A. tibial ant.', .6), rot(4, 'Artéria Tibial Posterior', 'A. tibial post.', .6)].filter(Boolean);
    for (const r of ROT_P) { r.el.textContent = r.txt; r.el.dataset.ruim = r.ruim ? '1' : '0'; }
    const tem = (e) => TUBOS.some((t) => t.estado === e && !t.corFixa), ponto2 = (c, t) => '<span><i style="background:' + c + '"></i>' + t + '</span>';
    $('leg').innerHTML = ponto2('#d8343a', 'fluxo normal') + (tem('esten') ? ponto2('#f5a623', 'estenose') : '') + (tem('ocl') ? ponto2('#3b4048', 'oclusão') : '') + (tem('hiper') ? ponto2('#9c1f24', 'hipercinético') : '') + (tem('hipo') ? ponto2('#ef8080', 'hipocinético') : '')
      + (extras.stent ? ponto2('#c9d1d9', 'stent') : '') + (extras.aneur ? ponto2('#b3262e', 'aneurisma') : '') + (extras.dissec ? ponto2('#ffffff', 'dissecção') : '') + (extras.reab ? ponto2('#ef8080', 'colaterais') : '') + (extras.enx ? ponto2(extras.enx === 'ocl' ? '#7d8790' : '#2f6fd6', 'enxerto') : '');
    const alterada = TUBOS.findIndex((t) => t.estado === 'esten' || t.estado === 'ocl');
    st.sel = alterada >= 0 ? alterada : (inicio[BRACO ? 'Artéria Braquial' : 'Artéria Femoral Superficial'] || 0);
  }
  const raioSafena = (e, mm, base) => e === 'ausente' ? .013 : e === 'ruim' ? (parseFloat(mm) > 0 ? clamp(parseFloat(mm) * 0.0085, .03, .1) : base * 1.6) : e === 'trombo' ? base * 1.35 : base;
  // ---------- Doppler venoso de membro superior (MMSS) ----------
  // trajetos [altura, ângulo (0° lateral, 90° anterior, 180° medial, 270° posterior), fração do raio] no braço esquerdo
  const MMSS_SUP = {
    'Veia Cefálica (antebraço)': [[-2.45, 40, .93], [-1.8, 55, .93], [-1.0, 62, .93], [-.38, 68, .93]],
    'Veia Cefálica (braço)': [[-.38, 68, .93], [.4, 65, .93], [1.2, 58, .93], [2.0, 52, .93], [2.65, 58, .93], [2.95, 78, .9]],
    'Veia Basílica (antebraço)': [[-2.45, 140, .93], [-1.8, 150, .93], [-1.0, 158, .93], [-.22, 162, .93]],
    'Veia Basílica (braço)': [[-.22, 162, .93], [.5, 168, .93], [1.2, 172, .9], [1.6, 175, .7], [2.0, 175, .55], [2.5, 168, .46]],
    'Veia Intermédia do Cotovelo': [[-.5, 68, .955], [-.2, 98, .965], [.1, 130, .955], [.28, 160, .94]],
  };
  const pontosRota = (rota, dAng = 0) => { const pts = []; for (let i = 0; i < rota.length - 1; i++) { const [ya, ga, fa] = rota[i], [yb, gb, fb] = rota[i + 1], n = Math.max(2, Math.ceil(Math.abs(yb - ya) / 0.12)); for (let j = i ? 1 : 0; j <= n; j++) { const k = j / n; pts.push(ponto(lerp(ya, yb, k), lerp(ga, gb, k) + dAng, lerp(fa, fb, k))); } } return pts; };
  const BRAQ = [[-.05, 125, .42], [.6, 140, .42], [1.4, 150, .43], [2.1, 158, .44], [2.6, 165, .45]];
  const RAD = [[-2.4, 55, .55], [-1.6, 65, .5], [-.8, 80, .45], [-.2, 108, .42], [-.05, 125, .42]];
  const ULN = [[-2.4, 130, .55], [-1.6, 135, .5], [-.8, 135, .45], [-.2, 128, .42], [-.05, 125, .42]];
  const J_VEN = () => W3(-2.2, 3.72, .12); // ângulo venoso (jugular + subclávia)
  const S0 = () => W3(-.62, 3.3, .12);     // axilar -> subclávia (borda da 1ª costela)
  const CAMINHO_CENTRAL = {
    'Veias Radiais': ['Veias Braquiais'], 'Veias Ulnares': ['Veias Braquiais'], 'Veias Braquiais': ['Veia Axilar'],
    'Veia Axilar': ['Veia Subclávia'], 'Veia Subclávia': [], 'Veia Jugular Interna': [],
    'Veia Cefálica (antebraço)': ['Veia Cefálica (braço)'], 'Veia Cefálica (braço)': ['Veia Subclávia'],
    'Veia Basílica (antebraço)': ['Veia Basílica (braço)'], 'Veia Basílica (braço)': ['Veia Axilar'], 'Veia Intermédia do Cotovelo': ['Veia Basílica (braço)'],
  };
  function geraBraco() {
    const V = ex.veias || {}, curvas = {}, cat = ex.extra && ex.extra.cateter && ex.extra.cateter.presente ? ex.extra.cateter : null;
    const rot = (nome, v) => {
      const e = estadoMMSS(v), partes = [ROTULO[e]];
      if (v && v.fase && (e === 'trombo' || e === 'parcial')) partes.push(String(v.fase).toLowerCase());
      if (v && /^Veia (Jugular|Subclávia|Axilar)/.test(nome) && e === 'ok' && v.fluxo === 'Contínuo (não fásico)') partes.push('fluxo contínuo');
      return partes.join(' · ');
    };
    const poe = (key, nome, r, pts, extra = {}) => {
      const v = V[key]; if (!v) return -1;
      const i = tubo({ nome, chave: { tipo: 'veia', key }, estado: estadoMMSS(v), r, pts, rotulo: rot(key, v), ...extra });
      curvas[key] = curvas[key] || TUBOS[i].curva; return i;
    };
    // profundas pareadas (braquiais, radiais, ulnares): duas veias lado a lado
    let iBraq = -1;
    for (const [key, nome, rota, r] of [['Veias Braquiais', 'Veias braquiais', BRAQ, .034], ['Veias Radiais', 'Veias radiais', RAD, .024], ['Veias Ulnares', 'Veias ulnares', ULN, .024]]) {
      for (const d of [-7, 7]) { const i = poe(key, nome, r, pontosRota(rota, d)); if (key === 'Veias Braquiais' && iBraq < 0) iBraq = i; }
    }
    const axTopo = ponto(2.6, 165, .45);
    const iAx = poe('Veia Axilar', 'Veia axilar', .055, [axTopo, ponto(2.85, 172, .46), W3(-.32, 3.08, .04), S0()]);
    const iSub = poe('Veia Subclávia', 'Veia subclávia', .06, [S0(), W3(-1.15, 3.48, .2), W3(-1.7, 3.6, .2), J_VEN()], { semFade: true });
    const iJug = poe('Veia Jugular Interna', 'Veia jugular interna', .065, [W3(-2.17, 4.46, .08), W3(-2.19, 4.1, .1), J_VEN()], { semFade: true });
    // tronco braquiocefálico venoso: só referência (como no 2D)
    tubo({ nome: 'Tronco braquiocefálico', estado: 'ok', r: .075, discreto: true, semToque: true, semFade: true, pts: [J_VEN(), W3(-2.3, 3.62, .1), W3(-2.38, 3.5, .08)] });
    // superficiais
    let iCef = -1, iBas = -1;
    for (const [key, rota] of Object.entries(MMSS_SUP)) {
      const nome = 'Veia ' + key.slice(5).toLowerCase(), r = /Intermédia/.test(key) ? .026 : .03;
      let pts = pontosRota(rota);
      if (key === 'Veia Cefálica (braço)') pts = [...pts, W3(-.15, 3.32, .55), W3(-.45, 3.36, .3), S0()]; // sulco deltopeitoral até a subclávia
      const i = poe(key, nome, r, pts, /Cefálica \(braço\)/.test(key) ? { semFade: true } : {});
      if (key === 'Veia Cefálica (braço)') iCef = i; if (key === 'Veia Basílica (braço)') iBas = i;
    }
    // fluxo contínuo (veias centrais): um anel branco no meio da veia, como o "C" do 2D
    for (const key of ['Veia Jugular Interna', 'Veia Subclávia', 'Veia Axilar']) {
      const v = V[key]; if (!v || estadoMMSS(v) !== 'ok' || v.fluxo !== 'Contínuo (não fásico)' || !curvas[key]) continue;
      const P = curvas[key].getPointAt(0.5), tg = curvas[key].getTangentAt(0.5), anelC = new T.Mesh(new T.TorusGeometry(.085, .014, 8, 28), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x666666 }));
      anelC.position.copy(P); anelC.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), tg); anelC.userData.camada = 'profunda'; anelC.userData.semFade = true; gVeias.add(anelC);
    }
    // cateter / cabo: fio amarelo dentro da veia, seguindo até o centro (tronco braquiocefálico)
    if (cat && cat.veia && curvas[cat.veia]) {
      const pts = []; let k = cat.veia;
      for (let passo = 0; passo < 6 && k; passo++) { const c = curvas[k]; if (c) for (let i = 0; i <= 20; i++) pts.push(c.getPointAt(i / 20)); k = (CAMINHO_CENTRAL[k] || [])[0]; }
      pts.push(J_VEN(), W3(-2.38, 3.5, .08));
      const limpos = pts.filter((p, i) => !i || p.distanceTo(pts[i - 1]) > 0.02);
      const fio = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(limpos), limpos.length * 3, .014, 6, false), new T.MeshBasicMaterial({ color: 0xf1c40f, depthTest: false, transparent: true, opacity: 0.95 }));
      fio.renderOrder = 6; fio.userData.camada = 'variz'; fio.userData.semFade = true; gVeias.add(fio);
    }
    const r0 = (el, txt, i, t) => i >= 0 ? { el: $(el), txt, p: TUBOS[i].curva.getPointAt(t), v: i, ruim: TUBOS[i].estado !== 'ok' } : null;
    ROT_P = [r0('l0', 'V. jugular int.', iJug, .35), r0('l1', 'V. subclávia', iSub, .5), r0('l2', 'V. axilar', iAx, .4), r0('l3', 'V. cefálica', iCef, .35), r0('l4', 'V. basílica', iBas, .3)].filter(Boolean);
    for (const r of ROT_P) { r.el.textContent = r.txt; r.el.dataset.ruim = r.ruim ? '1' : '0'; }
    const tem = (e) => TUBOS.some((t) => t.estado === e && t.chave), ponto2 = (c, t) => '<span><i style="background:' + c + '"></i>' + t + '</span>';
    const continuo = ['Veia Jugular Interna', 'Veia Subclávia', 'Veia Axilar'].some((k) => V[k] && estadoMMSS(V[k]) === 'ok' && V[k].fluxo === 'Contínuo (não fásico)');
    $('leg').innerHTML = ponto2('#3d8fe0', 'pérvia') + (tem('trombo') ? ponto2('#3b4048', 'trombose') : '') + (tem('parcial') ? ponto2('linear-gradient(90deg,#3d8fe0 0 30%,#3b4048 30% 70%,#3d8fe0 70%)', 'trombose parcial') : '') + (tem('recan') ? ponto2('#d99a3d', 'recanalização') : '') + (tem('ausente') ? ponto2('#aab4bc', 'ausente') : '') + (continuo ? ponto2('#ffffff', 'fluxo contínuo') : '') + (cat && cat.veia ? ponto2('#f1c40f', String(cat.tipo || 'cateter').toLowerCase()) : '');
    const alterada = TUBOS.findIndex((t) => t.chave && t.estado !== 'ok');
    st.sel = alterada >= 0 ? alterada : Math.max(0, iBas);
  }
  // ---------- Fístula arteriovenosa (FAV) ----------
  // Confecção: artérias e veias do braço com os pontos de medida (verde >= 2,0 mm, laranja < 2,0 mm, branco sem medida, cinza veia doente).
  // Avaliação: o trajeto da FAV (anastomose + veia de drenagem arterializada ou prótese), com as alterações no local marcado.
  const ROTAS_FAV = {
    'Radiocefálica (punho)': { art: ['Artéria Radial', 0.93], rota: [[-2.45, 40, .93], [-1.8, 55, .93], [-1.0, 62, .93], [-.38, 68, .93], [.4, 65, .93], [1.2, 58, .93], [2.0, 52, .93], [2.65, 58, .93], [2.95, 78, .9]], cef: true },
    'Braquiocefálica (cotovelo)': { art: ['Artéria Braquial', 0.9], rota: [[.05, 92, .7], [.1, 72, .93], [.4, 65, .93], [1.2, 58, .93], [2.0, 52, .93], [2.65, 58, .93], [2.95, 78, .9]], cef: true },
    'Braquiocefálica via veia intermédia do cotovelo': { art: ['Artéria Braquial', 0.95], rota: [[-.05, 110, .8], [-.25, 98, .965], [-.5, 72, .955], [-.38, 68, .93], [.4, 65, .93], [1.2, 58, .93], [2.0, 52, .93], [2.65, 58, .93], [2.95, 78, .9]], cef: true },
    'Braquiobasílica (com transposição)': { art: ['Artéria Braquial', 0.82], rota: [[.45, 135, .75], [.9, 140, .92], [1.6, 148, .92], [2.2, 158, .8], [2.55, 166, .47]] },
    'Braquiobasílica via veia intermédia do cotovelo': { art: ['Artéria Braquial', 0.95], rota: [[-.05, 118, .8], [.1, 130, .955], [.28, 160, .94], [.5, 168, .93], [1.2, 172, .9], [1.6, 175, .7], [2.0, 175, .55], [2.5, 168, .46]] },
    'Braquiobraquial (com transposição)': { art: ['Artéria Braquial', 0.85], rota: [[.4, 135, .7], [1.0, 140, .88], [1.8, 150, .85], [2.4, 160, .6], [2.6, 165, .46]] },
    'Prótese em alça no antebraço': { art: ['Artéria Braquial', 0.97], rota: [[-.1, 105, .85], [-.6, 98, .93], [-1.4, 92, .93], [-2.0, 95, .93], [-2.2, 115, .93], [-2.0, 135, .93], [-1.4, 140, .93], [-.6, 145, .93], [.0, 155, .93], [.3, 162, .93], [.5, 168, .93], [1.2, 172, .9], [1.6, 175, .7], [2.0, 175, .55], [2.5, 168, .46]], protese: [0, 0.62] },
    'Prótese braquioaxilar': { art: ['Artéria Braquial', 0.55], rota: [[1.0, 135, .85], [1.6, 145, .92], [2.3, 158, .88], [2.7, 168, .6], [2.85, 172, .46]], protese: [0, 1] },
  };
  const T_LOCAL_FAV = { 'Anastomose': 0.025, 'Justa-anastomótica': 0.07, 'Segmento de punção': 0.4, 'Arco da cefálica': 0.92, 'Veia de saída': 0.97, 'Anastomose arterial': 0.03, 'Corpo da prótese': 0.35, 'Anastomose venosa': 0.6 };
  const CENTRAIS_FAV = { 'Veia axilar': 'axilar', 'Veia subclávia': 'subclavia', 'Veia braquiocefálica': 'braquiocefalica' };
  // pontos de medida da confecção: [vaso, altura]
  const SITIOS_3D = {
    braquial: ['A', 'Artéria Braquial', 0.93], radial: ['A', 'Artéria Radial', 0.93], ulnar: ['A', 'Artéria Ulnar', 0.93],
    cefalicaPunho: ['V', 'Veia Cefálica (antebraço)', -2.35], cefalicaAntebraco: ['V', 'Veia Cefálica (antebraço)', -1.3], cefalicaCotovelo: ['V', 'Veia Cefálica (braço)', -.15], cefalicaBraco: ['V', 'Veia Cefálica (braço)', 1.4],
    basilicaAntebraco: ['V', 'Veia Basílica (antebraço)', -1.3], basilicaCotovelo: ['V', 'Veia Basílica (braço)', 0.0], basilicaBraco: ['V', 'Veia Basílica (braço)', 1.0],
    intermedia: ['I'], braquialVeia: ['B', 1.4], axilar: ['X'],
  };
  const NOMES_SITIO = { braquial: 'A. braquial (fossa cubital)', radial: 'A. radial (punho)', ulnar: 'A. ulnar (punho)', cefalicaPunho: 'V. cefálica (punho)', cefalicaAntebraco: 'V. cefálica (antebraço)', cefalicaCotovelo: 'V. cefálica (cotovelo)', cefalicaBraco: 'V. cefálica (braço)', basilicaAntebraco: 'V. basílica (antebraço)', basilicaCotovelo: 'V. basílica (cotovelo)', basilicaBraco: 'V. basílica (braço)', intermedia: 'V. intermédia do cotovelo', braquialVeia: 'V. braquial (braço)', axilar: 'V. axilar' };
  const numF = (x) => { const n = parseFloat(String(x ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const mmF = (x) => String(x).trim().replace('.', ',') + ' mm';
  const tabV = (rows, y) => tab(rows.map(([a, b, c]) => [a, b, c]), y);
  const tercoDe = (t) => (t < 1 / 3 ? 'Terço proximal' : t < 2 / 3 ? 'Terço médio' : 'Terço distal');
  function favComoArteria(a) {
    const tE = T_LOCAL_FAV[a.estenoseLocal], tA = T_LOCAL_FAV[a.aneurismaLocal], tS = T_LOCAL_FAV[a.stentLocal];
    return {
      status: a.status && a.status !== 'Pérvia' ? 'Ocluída' : 'Pérvia', localizacaoOclusao: 'Total', velocidade: 'Normocinético', tipoOnda: 'Fístula', sentido: 'Anterógrado',
      posPlaca: tE === undefined ? undefined : a.estenoseLocal === 'Anastomose' || a.estenoseLocal === 'Anastomose arterial' ? 0.09 : a.estenoseLocal === 'Justa-anastomótica' ? 0.15 : clamp(tE, 0.1, 0.92),
      placa: a.estenose && tE !== undefined ? 'Presente' : 'Ausente', estenosePercentual: a.estenosePercentual || '60', localizacaoPlaca: tercoDe(tE ?? 0.4), caracteristicaPlaca: 'Neo',
      aneurisma: !!a.aneurisma, aneurismaDiametro: a.aneurismaDiametro || '', aneurismaForma: a.pseudoaneurisma ? 'Sacular' : '', tromboMural: !!a.tromboParcial,
      stent: a.stent && tS !== undefined ? (a.stentStatus || 'Pérvio') : 'Ausente', localizacaoStent: tercoDe(tS ?? 0.4), ateromatose: 'Ausente', fav: true, aneurismaT: tA,
    };
  }
  const semNiveis = () => FAV && ((ex.extra || {}).modo !== 'Avaliação');
  // na FAV, tocar num vaso abre o painel certo: na confecção o ponto de medida daquele vaso, na avaliação a própria FAV
  const SITIO_DO_VASO = { 'Artéria Braquial': 'braquial', 'Artéria Radial': 'radial', 'Artéria Ulnar': 'ulnar', 'Veia Cefálica (antebraço)': 'cefalicaAntebraco', 'Veia Cefálica (braço)': 'cefalicaBraco', 'Veia Basílica (antebraço)': 'basilicaAntebraco', 'Veia Basílica (braço)': 'basilicaBraco', 'Veia Intermédia do Cotovelo': 'intermedia', 'Veias Braquiais': 'braquialVeia', 'Veia Axilar': 'axilar' };
  const chaveParaPainel = (c) => { if (!FAV || !c || c.tipo === 'sitio' || c.tipo === 'fav') return c; if (!semNiveis()) return { tipo: 'fav', key: 'fav' }; const k = SITIO_DO_VASO[c.key]; return k ? { tipo: 'sitio', key: k } : c; };
  function geraFAV() {
    const ctl = raiz.querySelector('.m3d-controles'); if (ctl) ctl.hidden = semNiveis();
    const e = ex.extra || {}, aval = e.modo === 'Avaliação', c = e.confeccao || {}, sit = c.sitios || {}, a = e.avaliacao || {};
    const artes = {}, cor = (h) => new T.Color(h).convertSRGBToLinear();
    const tuboFixo = (pts, r, hex, o = {}) => {
      const curva = pts instanceof T.Curve ? pts : new T.CatmullRomCurve3(pts), comp = curva.getLength(), rFn = o.rFn || (() => r);
      const k = cor(hex), mat = new T.MeshStandardMaterial({ color: k.clone(), roughness: 0.42, emissive: k.clone().multiplyScalar(0.28), transparent: !!o.op, opacity: o.op || 1 });
      const m = new T.Mesh(geoTubo(curva, rFn, Math.max(16, Math.round(comp * 22)), 12), mat); m.userData.camada = o.camada || 'safena'; m.userData.semFade = !!o.semFade; gVeias.add(m);
      if (o.nome) { TUBOS.push({ nome: o.nome, chave: o.chave || null, estado: o.estado || 'art', rotulo: o.rotulo || null, curva, tex: null, mat, corFixa: k, sentido: 1 }); if (!o.semToque) for (let q = 0; q < 24; q++) AMOSTRAS.push({ p: curva.getPointAt(q / 23), v: TUBOS.length - 1 }); return TUBOS.length - 1; }
      return -1;
    };
    // artérias do braço
    for (const [key, nome, r0, rota] of T_ART_BRACO().filter(([k]) => k !== 'Tronco Braquiocefálico' && k !== 'Artéria Subclávia')) {
      const curva = curvaDaRota(rota); artes[key] = curva;
      tuboFixo(curva, r0, 0xd8343a, { nome, chave: { tipo: 'arteria', key }, semFade: key === 'Artéria Axilar', camada: 'safena' });
    }
    const curvasV = {};
    const veia = (key, nome, pts, r, hex, o = {}) => { const i = tuboFixo(pts, r, hex, { nome, chave: o.chave || { tipo: 'veia', key }, camada: o.camada, semFade: o.semFade, op: o.op, semToque: o.semToque, rotulo: o.rotulo }); curvasV[key] = i >= 0 ? TUBOS[i].curva : new T.CatmullRomCurve3(pts); return i; };
    // veias (na avaliação ficam discretas; na confecção a doente fica cinza)
    const doente = (k) => sit[k] && sit[k].situacao && sit[k].situacao !== 'Pérvia';
    const corV = (k) => (!aval && k && doente(k) ? 0x3b4048 : 0x3d8fe0), opV = aval ? 0.45 : undefined;
    veia('Veia Cefálica (antebraço)', 'Veia cefálica (antebraço)', pontosRota(MMSS_SUP['Veia Cefálica (antebraço)']), .03, corV('cefalicaAntebraco'), { op: opV });
    veia('Veia Cefálica (braço)', 'Veia cefálica (braço)', [...pontosRota(MMSS_SUP['Veia Cefálica (braço)']), W3(-.15, 3.32, .55), W3(-.45, 3.36, .3), S0()], .03, corV('cefalicaBraco'), { op: opV, semFade: true });
    veia('Veia Basílica (antebraço)', 'Veia basílica (antebraço)', pontosRota(MMSS_SUP['Veia Basílica (antebraço)']), .03, corV('basilicaAntebraco'), { op: opV });
    veia('Veia Basílica (braço)', 'Veia basílica (braço)', pontosRota(MMSS_SUP['Veia Basílica (braço)']), .03, corV('basilicaBraco'), { op: opV });
    veia('Veia Intermédia do Cotovelo', 'Veia intermédia do cotovelo', pontosRota(MMSS_SUP['Veia Intermédia do Cotovelo']), .026, corV('intermedia'), { op: opV });
    veia('Veias Braquiais', 'Veias braquiais', pontosRota(BRAQ, 7), .03, corV('braquialVeia'), { op: opV, camada: 'profunda' });
    // centrais: axilar, subclávia e tronco braquiocefálico (estenose / stent central da FAV)
    const lesCentral = (nomeLocal) => aval && ((a.estenose && a.estenoseLocal === nomeLocal) || (a.stent && a.stentLocal === nomeLocal));
    const axPts = [ponto(2.6, 165, .45), ponto(2.85, 172, .46), W3(-.32, 3.08, .04), S0()];
    veia('Veia Axilar', 'Veia axilar', axPts, .055, !aval && doente('axilar') ? 0x3b4048 : lesCentral('Veia axilar') ? 0xf5a623 : 0x3d8fe0, { camada: 'profunda', semFade: true });
    veia('Veia Subclávia', 'Veia subclávia', [S0(), W3(-1.15, 3.48, .2), W3(-1.7, 3.6, .2), J_VEN()], .06, lesCentral('Veia subclávia') ? 0xf5a623 : 0x3d8fe0, { camada: 'profunda', semFade: true });
    veia('Veia Braquiocefálica', 'Tronco braquiocefálico', [J_VEN(), W3(-2.3, 3.62, .1), W3(-2.38, 3.5, .08)], .075, lesCentral('Veia braquiocefálica') ? 0xf5a623 : 0x3d8fe0, { camada: 'profunda', semFade: true });
    const marcas = [];
    if (!aval) {
      // pontos de medida
      for (const [k, def] of Object.entries(SITIOS_3D)) {
        const s = sit[k] || {}; let P;
        if (def[0] === 'A') P = artes[def[1]] && artes[def[1]].getPointAt(def[2]);
        else if (def[0] === 'V') { const rows = MMSS_SUP[def[1]], q = tabV(rows, def[2]); P = ponto(def[2], q[0], q[1]); }
        else if (def[0] === 'I') P = curvasV['Veia Intermédia do Cotovelo'].getPointAt(0.5);
        else if (def[0] === 'B') { const q = tab(BRAQ, def[1]); P = ponto(def[1], q[0] + 7, q[1]); }
        else P = curvasV['Veia Axilar'].getPointAt(0.35);
        if (!P) continue;
        const d = numF(s.diametro), ruim = k !== 'braquial' && k !== 'radial' && k !== 'ulnar' && s.situacao && s.situacao !== 'Pérvia';
        const ok = d === null ? null : d >= 2.0;
        const hex = ruim ? 0x3b4048 : k === 'axilar' ? (s.fluxo && s.fluxo !== 'Fásico' ? 0xf5a623 : 0xffffff) : ok === null ? 0xffffff : ok ? 0x27ae60 : 0xf5a623;
        const partes = [];
        if (ruim) partes.push(String(s.situacao).toLowerCase());
        if (d !== null) partes.push(mmF(s.diametro) + (ok ? ' (adequado)' : ' (< 2,0 mm)'));
        if (numF(s.profundidade) !== null) partes.push('prof. ' + mmF(s.profundidade));
        if (k === 'axilar') partes.push(s.fluxo && s.fluxo !== 'Fásico' ? 'fluxo contínuo' : 'fluxo fásico');
        if (!partes.length) partes.push('não medido');
        const k3 = cor(hex), mat = new T.MeshStandardMaterial({ color: k3.clone(), emissive: k3.clone().multiplyScalar(0.45), roughness: 0.3 });
        const m = new T.Mesh(new T.SphereGeometry(.072, 18, 12), mat); m.position.copy(P); m.userData.camada = 'variz'; m.userData.semFade = true; gVeias.add(m);
        TUBOS.push({ nome: NOMES_SITIO[k], chave: { tipo: 'sitio', key: k }, estado: ok === false || ruim ? 'esten' : 'art', rotulo: partes.join(' · '), curva: new T.CatmullRomCurve3([P.clone(), P.clone().add(new T.Vector3(0, .001, 0))]), tex: null, mat, corFixa: k3, junc: true });
        for (let q = 0; q < 6; q++) AMOSTRAS.push({ p: P.clone(), v: TUBOS.length - 1 });
        marcas.push(TUBOS.length - 1);
      }
    }
    let iFav = -1;
    if (aval && ROTAS_FAV[a.tipo]) {
      const R = ROTAS_FAV[a.tipo], P0 = artes[R.art[0]].getPointAt(R.art[1]), pts = [P0, ...pontosRota(R.rota)];
      if (R.cef) pts.push(W3(-.15, 3.32, .55), W3(-.45, 3.36, .3), S0());
      const curva = new T.CatmullRomCurve3(pts), ocl = a.status && a.status !== 'Pérvia', protese = !!R.protese;
      const tE = a.estenose && T_LOCAL_FAV[a.estenoseLocal] !== undefined ? T_LOCAL_FAV[a.estenoseLocal] : null, pct = numF(a.estenosePercentual) || 60;
      const tA = a.aneurisma && T_LOCAL_FAV[a.aneurismaLocal] !== undefined ? T_LOCAL_FAV[a.aneurismaLocal] : a.aneurisma ? 0.4 : null, kA = Math.min(3.2, Math.max(1.8, (numF(a.aneurismaDiametro) || 14) / 7));
      const r0 = protese ? .05 : .062, gauss = (u, m, s) => Math.exp(-Math.pow((u - m) / s, 2));
      const rFn = (u) => r0 * (1 - (tE !== null ? clamp(pct / 100, 0, .9) * 0.75 * gauss(u, tE, 0.03) : 0)) * (1 + (tA !== null && !ocl ? (kA - 1) * gauss(u, tA, 0.05) : 0));
      const hex = ocl ? 0x4a5058 : protese ? 0xdfe6ee : 0x8e44ad;
      iFav = tuboFixo(curva, r0, hex, { rFn, nome: protese ? 'Prótese (FAV)' : 'FAV · veia de drenagem', chave: { tipo: 'fav', key: 'fav' }, estado: ocl ? 'ocl' : tE !== null ? 'esten' : 'art', rotulo: ocl ? 'ocluída (trombosada)' : tE !== null ? 'estenose' + (a.estenosePercentual ? ' ' + a.estenosePercentual + '%' : '') : numF(a.fluxoVolume) ? numF(a.fluxoVolume) + ' mL/min' : 'pérvia', semFade: true });
      if (protese && !ocl) { const [p0, p1] = R.protese; const ptsP = []; for (let i = 0; i <= 40; i++) ptsP.push(curva.getPointAt(lerp(p0, p1, i / 40))); const cp = new T.CatmullRomCurve3(ptsP), tx = texStentPerna.clone(); tx.needsUpdate = true; tx.repeat.set(Math.max(2, cp.getLength() * 10), 2); const mp = new T.Mesh(geoTubo(cp, () => r0 * 1.12, 80, 12), new T.MeshStandardMaterial({ color: 0xf2f5f8, map: tx, roughness: 0.5, transparent: true, opacity: 0.85 })); mp.userData.camada = 'safena'; mp.userData.semFade = true; gVeias.add(mp); }
      // estenose (laranja), anastomose (branca), hematoma, pseudoaneurisma, trombo parcial, stent, roubo, colaterais
      const bolinha = (P, r, hex2, op = 1) => { const k4 = cor(hex2), m = new T.Mesh(new T.SphereGeometry(r, 20, 14), new T.MeshStandardMaterial({ color: k4, emissive: k4.clone().multiplyScalar(0.3), roughness: 0.5, transparent: op < 1, opacity: op })); m.position.copy(P); m.userData.camada = 'variz'; m.userData.semFade = true; gVeias.add(m); return m; };
      if (tE !== null) { const ptsE = []; for (let i = 0; i <= 12; i++) ptsE.push(curva.getPointAt(clamp(tE - 0.035 + 0.07 * i / 12, 0, 1))); tuboFixo(ptsE, 0, 0xf5a623, { rFn: (u) => rFn(lerp(tE - 0.035, tE + 0.035, u)) * 1.06 }); }
      bolinha(P0, r0 * 1.25, 0xffffff);
      if (a.hematoma) bolinha(P0.clone().add(new T.Vector3(0, 0, .12)), .22, 0xf1c40f, 0.35);
      if (a.pseudoaneurisma) { const tP = tA !== null ? tA : 0.4, P = curva.getPointAt(tP), tg = curva.getTangentAt(tP), lado = new T.Vector3(0, 0, 1).cross(tg).normalize(); bolinha(P.clone().addScaledVector(lado, r0 * 2.6), r0 * 1.9, 0x8e44ad); tuboFixo([P, P.clone().addScaledVector(lado, r0 * 1.6)], r0 * 0.5, 0x8e44ad); }
      if (a.tromboParcial && !ocl) { const tT = tA !== null ? tA : 0.4, ptsT = []; for (let i = 0; i <= 12; i++) ptsT.push(curva.getPointAt(clamp(tT - 0.06 + 0.12 * i / 12, 0, 1))); tuboFixo(ptsT, r0 * 0.55, 0x3b4048, { op: 0.95 }); }
      if (a.stent) {
        const local = a.stentLocal || 'Veia subclávia', central = CENTRAIS_FAV[local];
        const cS = central ? curvasV[central === 'axilar' ? 'Veia Axilar' : central === 'subclavia' ? 'Veia Subclávia' : 'Veia Braquiocefálica'] : curva;
        const t0 = central ? 0.15 : clamp((T_LOCAL_FAV[local] ?? 0.4) - 0.06, 0, 1), t1 = central ? 0.85 : clamp((T_LOCAL_FAV[local] ?? 0.4) + 0.06, 0, 1);
        const ptsS = []; for (let i = 0; i <= 20; i++) ptsS.push(cS.getPointAt(lerp(t0, t1, i / 20)));
        tuboFixo(ptsS, (central ? .075 : r0) * 1.4, corStent(a.stentStatus === 'Com reestenose' ? 'Com reestenose' : a.stentStatus === 'Ocluído' ? 'Ocluído' : 'Pérvio'), { op: 0.9, semFade: true });
      }
      if (a.roubo) { // artéria distal à anastomose com fluxo retrógrado: tracejado claro
        const d = R.art[0] === 'Artéria Radial' ? artes['Artéria Radial'] : artes['Artéria Radial'];
        tuboFixo(new T.CatmullRomCurve3([0.35, 0.6, 0.85, 0.99].map((t) => d.getPointAt(t))), .036, 0xef8080, { nome: 'Artéria distal (roubo)', chave: { tipo: 'arteria', key: 'Artéria Radial' }, rotulo: 'fluxo retrógrado (roubo)', estado: 'hipo' });
      }
      if (a.colaterais) [[0.25, 1], [0.45, -1], [0.62, 1]].forEach(([t, s]) => { const P = curva.getPointAt(t), tg = curva.getTangentAt(t), n = new T.Vector3(0, 0, 1).cross(tg).normalize().multiplyScalar(s); tuboFixo([P.clone().addScaledVector(n, .5).add(new T.Vector3(0, -.3, .1)), P.clone().addScaledVector(n, .25).add(new T.Vector3(0, -.08, .08)), P], .018, 0x9b59b6, { semFade: true }); });
    }
    // rótulos e legenda
    const r0l = (el, txt, i, t) => i >= 0 && TUBOS[i] ? { el: $(el), txt, p: TUBOS[i].curva.getPointAt(t), v: i, ruim: TUBOS[i].estado !== 'art' } : null;
    const iArt = TUBOS.findIndex((t) => t.chave && t.chave.key === 'Artéria Braquial'), iRad = TUBOS.findIndex((t) => t.chave && t.chave.key === 'Artéria Radial');
    const iCef = TUBOS.findIndex((t) => t.chave && t.chave.key === 'Veia Cefálica (braço)'), iBas = TUBOS.findIndex((t) => t.chave && t.chave.key === 'Veia Basílica (braço)');
    ROT_P = (aval ? [r0l('l0', 'FAV', iFav, 0.45), r0l('l1', 'A. braquial', iArt, 0.5), r0l('l2', 'A. radial', iRad, 0.6)] : [r0l('l0', 'A. braquial', iArt, 0.5), r0l('l1', 'A. radial', iRad, 0.6), r0l('l2', 'V. cefálica', iCef, 0.35), r0l('l3', 'V. basílica', iBas, 0.3)]).filter(Boolean);
    for (const r of ROT_P) { r.el.textContent = r.txt; r.el.dataset.ruim = r.ruim ? '1' : '0'; }
    const p2 = (cc, t) => '<span><i style="background:' + cc + '"></i>' + t + '</span>';
    $('leg').innerHTML = aval
      ? p2('#d8343a', 'artéria') + p2(ROTAS_FAV[a.tipo] && ROTAS_FAV[a.tipo].protese ? '#dfe6ee' : '#8e44ad', ROTAS_FAV[a.tipo] && ROTAS_FAV[a.tipo].protese ? 'prótese' : 'veia arterializada') + p2('#ffffff', 'anastomose') + (a.estenose ? p2('#f5a623', 'estenose') : '') + (a.status && a.status !== 'Pérvia' ? p2('#4a5058', 'ocluída') : '') + (a.stent ? p2('#c9d1d9', 'stent') : '') + (a.hematoma ? p2('#f1c40f', 'hematoma') : '')
      : p2('#27ae60', '≥ 2,0 mm') + p2('#f5a623', '< 2,0 mm') + p2('#ffffff', 'não medido') + p2('#3b4048', 'veia doente');
    st.sel = iFav >= 0 ? iFav : marcas.length ? marcas[0] : Math.max(0, iArt);
  }
  function geraPerna() {
    for (const m of gVeias.children) { m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose(); }
    gVeias.clear(); TUBOS = []; AMOSTRAS = []; ROT_P = [];
    if (FAV) { geraFAV(); return; }
    if (ARTERIAL) { geraArterias(); return; }
    if (BRACO) { geraBraco(); return; }
    const p = ex.profundas, s = ex.superficiais, e = (k) => estadoDe(p[k]);
    // sistema profundo
    const iFem = tubo({ nome: 'Veia femoral superficial', chave: { tipo: 'profunda', key: 'Veia Femoral Superficial' }, estado: e('Veia Femoral Superficial'), r: .072, pts: trecho(T_FEM, .6, 2.92) });
    tubo({ nome: 'Veia femoral comum', chave: { tipo: 'profunda', key: 'Veia Femoral Comum' }, estado: e('Veia Femoral Comum'), r: .08, pts: trecho(T_FEM, 2.92, 4.25) });
    const q292 = tab(T_FEM, 2.92);
    tubo({ nome: 'Veia femoral profunda', chave: { tipo: 'profunda', key: 'Veia Femoral Profunda' }, discreto: true, estado: e('Veia Femoral Profunda'), r: .055, pts: [ponto(.4, 100, .3), ponto(1.2, 105, .3), ponto(2.0, 115, .34), ponto(2.6, 132, .4), ponto(2.92, q292[0], q292[1])] });
    const iPop = tubo({ nome: 'Veia poplítea', chave: { tipo: 'profunda', key: 'Veia Poplítea' }, estado: e('Veia Poplítea'), r: .066, pts: trecho(T_POP, -.9, .6) });
    const popB = ponto(-.9, 270, .42);
    tubo({ nome: 'Veias tibiais posteriores', chave: { tipo: 'profunda', key: 'Veias Tibiais posteriores' }, discreto: true, estado: e('Veias Tibiais posteriores'), r: .03, pts: [ponto(-3.5, 205, .62), ponto(-2.6, 225, .42), ponto(-1.7, 245, .38), popB] });
    tubo({ nome: 'Veias tibiais anteriores', chave: { tipo: 'profunda', key: 'Veias Tibiais anteriores' }, discreto: true, estado: e('Veias Tibiais anteriores'), r: .028, pts: [ponto(-3.5, 80, .6), ponto(-2.6, 65, .42), ponto(-1.7, 62, .36), ponto(-1.2, 40, .15), popB] });
    tubo({ nome: 'Veias gastrocnêmicas', chave: { tipo: 'profunda', key: 'Veias Gastrocnêmicas' }, discreto: true, estado: e('Veias Gastrocnêmicas'), r: .026, pts: [ponto(-2.0, 250, .72), ponto(-1.5, 258, .66), ponto(-1.1, 265, .55), popB] });
    tubo({ nome: 'Veias soleares', chave: { tipo: 'profunda', key: 'Veias Soleares' }, discreto: true, estado: e('Veias Soleares'), r: .026, pts: [ponto(-2.5, 290, .55), ponto(-1.9, 285, .5), ponto(-1.3, 278, .46), popB] });
    // safena magna e JSF
    const yM = (y) => porTrechos(y, [[48, 3.75], [320, .1], [552, -3.55]]); let iMag = -1, iMagRuim = -1;
    for (const tr of trechosSafena(s['Safena Magna'], ex.magna, G.LANDMARK_MAGNA)) {
      const ya = yM(tr.b), yb = yM(tr.a), meio = (ya + yb) / 2;
      const i = tubo({ nome: 'Safena magna', chave: { tipo: 'superficial', key: 'Safena Magna' }, estado: tr.e, r: raioSafena(tr.e, meio > .1 ? ex.magna.coxa : ex.magna.perna, .034), pts: trecho(T_GSV, ya, yb) });
      if (tr.e === 'ruim' && iMagRuim < 0) iMagRuim = i; if (iMag < 0 || (ya <= 1.6 && yb >= 1.6)) iMag = i;
    }
    const iJSF = TUBOS.length; bola(ponto(3.72, 131, .52), .1, estadoDe(s['JSF']), 'Junção safeno-femoral', { tipo: 'superficial', key: 'JSF' });
    // safena parva e JSP
    const yP = (y) => porTrechos(y, [[314, .1], [535, -3.5]]); let iPar = -1;
    for (const tr of trechosSafena(s['Safena Parva'], ex.parva, G.LANDMARK_PARVA)) {
      const ya = yP(tr.b), yb = yP(tr.a), i = tubo({ nome: 'Safena parva', chave: { tipo: 'superficial', key: 'Safena Parva' }, estado: tr.e, r: raioSafena(tr.e, '', .03), pts: trecho(T_SSV, ya, yb) });
      if (iPar < 0 || (ya <= -1.9 && yb >= -1.9)) iPar = i;
    }
    bola(ponto(.1, 268, .5), .085, estadoDe(s['JSP']), 'Junção safeno-poplítea', { tipo: 'superficial', key: 'JSP' });
    // perfurantes insuficientes (ligam a safena magna ao sistema profundo)
    for (const q of ex.perfurantes) { if (q.status !== RUIM || !q.segmento) continue; const o = G.posicaoPerfurante(q.segmento, q.valor); if (!o) continue; const y3 = yM(o.y), g = tab(T_GSV, y3); tubo({ nome: 'Veia perfurante', estado: 'ruim', r: .024, semToque: true, pts: [ponto(y3 - .05, g[0] + 30, .45), ponto(y3, g[0] + 14, .7), ponto(y3, g[0], g[1])] }); bola(ponto(y3, g[0], .93), .07, 'ruim'); }
    // varizes desenhadas: cada traço do 2D vira um trajeto rente à pele
    const RV = { 'Varizes Superficiais': .034, 'Varizes Reticulares': .018, 'Microvarizes': .008, 'Tromboflebite Superficial': .026 };
    (ex.tracos || []).forEach((t, iTraco) => {
      const pts = []; let u = null;
      for (const q of t.pts) { if (u && Math.hypot(q[0] - u[0], q[1] - u[1]) < 2.5) continue; u = q; pts.push(sobe(q[0], q[1], t.vista)); }
      if (pts.length < 2) pts.push(pts[0].clone().add(new T.Vector3(0, 0.01, 0)));
      const cor = t.tipo === 'Tromboflebite Superficial' ? 0x6b7280 : 0xe23b3b;
      const mt = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), pts.length * 6, RV[t.tipo] || .02, 7, false), new T.MeshStandardMaterial({ color: new T.Color(cor).convertSRGBToLinear(), roughness: 0.45, emissive: new T.Color(cor).convertSRGBToLinear().multiplyScalar(0.3) }));
      mt.userData.traco = iTraco; mt.userData.camada = 'variz'; gVeias.add(mt);
    });
    const qm = tab(T_GSV, 1.6);
    ROT_P = [
      { el: $('l0'), txt: 'JSF', p: ponto(3.72, 131, .52), v: iJSF, ruim: s['JSF'] === RUIM },
      { el: $('l1'), txt: 'V. femoral', p: TUBOS[iFem].curva.getPointAt(.75), v: iFem, ruim: TUBOS[iFem].estado === 'ruim' },
      { el: $('l2'), txt: 'Safena magna', p: ponto(1.6, qm[0], qm[1]), v: iMag, ruim: iMagRuim >= 0 },
      { el: $('l3'), txt: 'V. poplítea', p: TUBOS[iPop].curva.getPointAt(.45), v: iPop, ruim: TUBOS[iPop].estado === 'ruim' },
      { el: $('l4'), txt: 'Safena parva', p: ponto(-1.9, 272, .9), v: iPar, ruim: iPar >= 0 && TUBOS[iPar].estado === 'ruim' },
    ];
    for (const r of ROT_P) { r.el.textContent = r.txt; r.el.dataset.ruim = r.ruim ? '1' : '0'; }
    const tem = (e) => TUBOS.some((t) => t.estado === e), ponto2 = (c, t) => '<span><i style="background:' + c + '"></i>' + t + '</span>';
    $('leg').innerHTML = ponto2('#3d8fe0', 'competente') + (tem('ruim') ? ponto2('#e23b3b', 'refluxo') : '') + (tem('trombo') ? ponto2('#6b7280', 'trombose') : '') + (tem('recan') ? ponto2('#d99a3d', 'recanalização') : '') + (tem('ausente') ? ponto2('#aab4bc', 'ausente') : '');
    const primeiroRuim = TUBOS.findIndex((t) => t.estado === 'ruim' && t.nome !== 'Veia perfurante' && !t.junc);
    st.sel = primeiroRuim >= 0 ? primeiroRuim : iMag;
  }
  const alvoMarca = new T.Mesh(new T.RingGeometry(.145, .16, 48), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, side: T.DoubleSide }));
  alvoMarca.renderOrder = 5; alvoMarca.visible = false; cenaP.add(alvoMarca);
  const CENTRO = BRACO ? new T.Vector3(-0.7 * SX, 0.1, 0.1) : new T.Vector3(0, 0.15, 0.2);
  const camP = { az: -0.6, pol: 1.5, dist: 12.5, alvo: CENTRO.clone(), alvoS: CENTRO.clone(), azAlvo: null, polAlvo: Math.PI / 2 };

  // ---------- a veia (segmento com válvulas, por fora em corte e por dentro) ----------
  const L = 16, H = 1.9, VALVULAS = [-3.4, 3.2];
  const cam = { az: 0.38, pol: 1.47, dist: 13, inY: -6.4, tx: 0, tz: 0 };
  const VALV_ON = VALVULAS.map(() => true);
  function raio(y) { let b = 0; for (const [iz, z] of VALVULAS.entries()) { if (!VALV_ON[iz]) continue; const d = (y - (z + 0.8 * H)) / 1.0; b += Math.exp(-d * d); } return (1 + 0.32 * st.dil) * (1 + 0.2 * b); }
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
  const paredeV = new T.Mesh(gParede, new T.MeshStandardMaterial({ map: texturaParede(), roughness: 0.62, side: T.BackSide })); cenaV.add(paredeV);
  const vidro = new T.Mesh(gParede, new T.MeshBasicMaterial({ color: 0x7fe3f1, transparent: true, opacity: 0.07, side: T.FrontSide, depthWrite: false })); cenaV.add(vidro);
  if (ARTERIAL) { paredeV.visible = false; vidro.visible = false; }
  const NU = 26, NV = 12;
  const mFolheto = new T.MeshStandardMaterial({ color: 0xf6dcd5, roughness: 0.5, side: T.DoubleSide, transparent: true, opacity: 0.94 });
  const folhetos = [];
  for (const z0 of VALVULAS) for (const s of [1, -1]) { const g = new T.PlaneGeometry(1, 1, NU, NV); const m = new T.Mesh(g, mFolheto); m.frustumCulled = false; m.visible = !ARTERIAL; cenaV.add(m); folhetos.push({ g, z0, s, m }); }
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
    for (const [iz, z0] of VALVULAS.entries()) {
      if (!VALV_ON[iz]) continue;
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
      if (ativo) { const rho2 = a * a * (1 - zU * zU) + zU * zU, jato = Math.min(2.4, corda / Math.max(livre, 0.05)); y += st.v * VMAX * (1 - 0.72 * rho2) * jato * dt; const yT = junc.on ? J_TOPO : L / 2, comp = yT + L / 2; if (y > yT) y -= comp; else if (y < -L / 2) y += comp; pY[i] = y; }
      peca.position.set(a * livre * 0.93, y, zU * r * 0.95);
      const giro = st.t * (0.4 + pR[i * 6 + 3] * 1.3);
      peca.rotation.set(pR[i * 6] * 6.28 + giro, pR[i * 6 + 1] * 6.28 + giro * 0.7, pR[i * 6 + 2] * 6.28);
      const perto = lerp(1, 0.72 * ss(0.6, 2.6, peca.position.distanceTo(camV3.position)), dentroF);
      peca.scale.setScalar((0.085 + pR[i * 6 + 4] * 0.035) * perto + 0.0001);
      peca.updateMatrix(); cel.setMatrixAt(i, peca.matrix);
    }
    cel.instanceMatrix.needsUpdate = true;
  }
  // ---------- junção safeno-femoral / safeno-poplítea: a safena desemboca na veia profunda ----------
  // a safena segue no eixo y; a veia profunda (femoral comum / poplítea) passa por cima, inclinada,
  // e a câmera gira para mostrar a profunda na vertical. A válvula de cima da safena é a válvula terminal.
  const J_ANG = 0.87, J_S = Math.sin(J_ANG), J_C = Math.cos(J_ANG), J_RD = 1.9, J_LD = 40, J_TOPO = 6.8, J_TOPO_IN = 9.4;
  const J_C0 = new T.Vector3(0, 8.4, 0), J_D = new T.Vector3(-J_S, J_C, 0), J_N = new T.Vector3(-J_C, -J_S, 0), J_E1 = new T.Vector3(J_C, J_S, 0);
  const junc = { on: false, jsf: true }, gJ = new T.Group(); gJ.visible = false; cenaV.add(gJ);
  if (renderer) renderer.localClippingEnabled = true;
  // a safena termina na parede da profunda
  const cortaSafena = new T.Plane(J_N.clone(), -J_N.dot(J_C0) - 0.68 * J_RD);
  // furo da profunda por onde a safena entra (prisma octogonal no eixo da safena, abaixo do eixo da profunda)
  const furo = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; furo.push(new T.Plane(new T.Vector3(Math.cos(a), 0, Math.sin(a)), -1.02)); } furo.push(new T.Plane(new T.Vector3(0, 1, 0), -J_C0.y));
  const gProf = new T.CylinderGeometry(J_RD, J_RD, J_LD, 64, 60, true); gProf.rotateZ(J_ANG); gProf.translate(J_C0.x, J_C0.y, 0);
  const texProf = texturaParede(); texProf.repeat.set(4, 8);
  gJ.add(new T.Mesh(gProf, new T.MeshStandardMaterial({ map: texProf, roughness: 0.62, side: T.BackSide, clippingPlanes: furo, clipIntersection: true })));
  const mProfV = new T.MeshBasicMaterial({ color: 0x7fe3f1, transparent: true, opacity: 0.07, side: T.FrontSide, depthWrite: false, clippingPlanes: furo, clipIntersection: true });
  gJ.add(new T.Mesh(gProf, mProfV));
  const N2 = 680, mCel2 = new T.MeshStandardMaterial({ color: 0xb3121f, roughness: 0.45 });
  const cel2 = new T.InstancedMesh(cel.geometry, mCel2, N2); cel2.frustumCulled = false; gJ.add(cel2);
  const qA = new Float32Array(N2), qZ = new Float32Array(N2), qT = new Float32Array(N2), qR = new Float32Array(N2 * 5);
  for (let i = 0; i < N2; i++) { let x, z; do { x = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + z * z > 0.9); qZ[i] = z; qA[i] = x / Math.sqrt(1 - z * z); qT[i] = (rnd() - 0.5) * J_LD; for (let k = 0; k < 5; k++) qR[i * 5 + k] = rnd(); }
  const J_ROT = J_C0.clone().addScaledVector(J_D, 1.8).addScaledVector(J_E1, -(J_RD + 1.7));
  function atualizaCelulasJunc(dt) {
    // a profunda sempre corre para o coração; na compressão (sangue subindo) corre mais
    const vD = VMAX * (0.42 + 0.5 * Math.max(0, st.v));
    for (let i = 0; i < N2; i++) {
      const zU = qZ[i], a = qA[i], rho2 = a * a * (1 - zU * zU) + zU * zU; let t = qT[i] + vD * (1 - 0.7 * rho2) * dt;
      if (t > J_LD / 2) t -= J_LD; qT[i] = t;
      peca.position.copy(J_C0).addScaledVector(J_D, t).addScaledVector(J_E1, a * Math.sqrt(1 - zU * zU) * J_RD * 0.9); peca.position.z += zU * J_RD * 0.9;
      const giro = st.t * (0.4 + qR[i * 5 + 3] * 1.3);
      peca.rotation.set(qR[i * 5] * 6.28 + giro, qR[i * 5 + 1] * 6.28 + giro * 0.7, qR[i * 5 + 2] * 6.28);
      const perto = lerp(1, 0.72 * ss(0.6, 2.6, peca.position.distanceTo(camV3.position)), dentroF);
      peca.scale.setScalar((0.085 + qR[i * 5 + 4] * 0.035) * perto + 0.0001); peca.updateMatrix(); cel2.setMatrixAt(i, peca.matrix);
    }
    cel2.instanceMatrix.needsUpdate = true;
  }
  let txtRot = null;
  function ajustaJuncao() {
    const tb = TUBOS[st.sel], k = !BRACO && !ARTERIAL && tb && tb.chave ? tb.chave.key : null;
    junc.on = k === 'JSF' || k === 'JSP'; junc.jsf = k !== 'JSP'; gJ.visible = junc.on;
    for (const m of [paredeV.material, vidro.material]) { m.clippingPlanes = junc.on ? [cortaSafena] : null; m.needsUpdate = true; }
    const els = [$('rCor'), $('rPe'), $('rV1'), $('rV2')]; if (!txtRot) txtRot = els.map((el) => el.textContent);
    const tx = junc.on ? [junc.jsf ? 'V. femoral comum ↑ coração' : 'V. poplítea ↑ coração', junc.jsf ? '↓ safena magna' : '↓ safena parva', 'válvula pré-terminal', junc.jsf ? 'válvula terminal (JSF)' : 'válvula terminal (JSP)'] : txtRot;
    els.forEach((el, i) => { el.textContent = tx[i]; });
  }


  // ---------- a artéria (trecho tocado, em corte, por fora e por dentro) ----------
  // eixo: proximal em cima (y = L/2), distal embaixo; o sangue desce. s = 0 (proximal) .. 1 (distal)
  // lê do 2D: oclusão, placa (tipo e % de estenose), ateromatose, stent (pérvio, reestenose, ocluído),
  // aneurisma (diâmetro, forma, trombo mural), dissecção, reabitada por colaterais, sentido, onda e velocidade
  const NSA = 480, artR = new Float32Array(NSA), artCX = new Float32Array(NSA), artCZ = new Float32Array(NSA), artL = new Int16Array(NSA);
  const artRO = new Float32Array(NSA), artOX = new Float32Array(NSA), artOZ = new Float32Array(NSA), artTM = new Float32Array(NSA);
  let LES = [], artInfo = { nome: '', t: '', tom: 'normal', onda: 'Trifásico', fator: 1, total: false, oclA: null, oclB: null, sentido: 1, enxerto: false };
  const sDeY = (y) => clamp((L / 2 - y) / L, 0, 1), yDeS = (s) => L / 2 - s * L;
  const amostraArt = (y) => Math.round(sDeY(y) * (NSA - 1));
  function perfilArt(y) { const k = amostraArt(y); return { rl: artR[k], cx: artCX[k], cz: artCZ[k] }; }
  const COR_PLACA = { 'Lipídica': [0.86, 0.6, 0.14], 'Calcificada': [0.66, 0.64, 0.58], ocl: [0.24, 0.04, 0.05], neo: [0.9, 0.66, 0.64], Neo: [0.9, 0.66, 0.64], trombo: [0.36, 0.06, 0.08] };
  function lesoesDe(v) {
    const out = []; if (!v) return out;
    const centro = { 'Terço proximal': 1 / 6, 'Terço médio': 0.5, 'Terço distal': 5 / 6 }, tipo = v.caracteristicaPlaca || 'Mista';
    if (v.status === 'Ocluída') { const lo = v.localizacaoOclusao || 'Total', i = TERCOS.indexOf(lo); const [a, b] = i < 0 ? [0.07, 0.93] : [i / 3 + 0.05, (i + 1) / 3 - 0.05]; out.push({ oc: true, a, b, p: 0.94, ang: 0, tipo: 'ocl' }); }
    const FS = faixaStent3D(v);
    if (v.stent === 'Ocluído') out.push({ oc: true, a: FS[0] + 0.02, b: FS[1] - 0.02, p: 0.94, ang: 0, tipo: 'ocl', stent: true });
    if (v.stent === 'Com reestenose') out.push({ s0: (FS[0] + FS[1]) / 2, w: (FS[1] - FS[0]) / 2, p: 0.55, ang: 0, conc: true, tipo: 'neo', rest: true });
    const pct = numA(v.estenosePercentual);
    if (v.status !== 'Ocluída' && v.placa === 'Presente') out.push({ s0: v.posPlaca !== undefined ? v.posPlaca : centro[v.localizacaoPlaca] !== undefined ? centro[v.localizacaoPlaca] : 0.5, w: v.posPlaca !== undefined && v.posPlaca < 0.1 ? 0.055 : 0.075, p: pct > 0 ? clamp(pct / 100, 0.08, 0.9) : 0.25, ang: 2.3, tipo, principal: true, pct, conc: !!v.fav }); // na FAV a estenose é hiperplasia intimal, concêntrica
    const nAt = { Discreta: 3, Moderada: 6, Severa: 10 }[v.ateromatose] || 0, pAt = { Discreta: 0.1, Moderada: 0.16, Severa: 0.24 }[v.ateromatose] || 0;
    let sem2 = 31; const rn = () => { sem2 = (sem2 * 16807) % 2147483647; return sem2 / 2147483647; };
    for (let i = 0; i < nAt; i++) out.push({ s0: 0.06 + 0.88 * rn(), w: 0.022 + 0.02 * rn(), p: pAt * (0.7 + 0.6 * rn()), ang: rn() * 6.283, tipo: v.caracteristicaPlaca || 'Mista' });
    return out;
  }
  const pesoLes = (q, sv) => q.oc ? ss(q.a - 0.03, q.a + 0.03, sv) * (1 - ss(q.b - 0.03, q.b + 0.03, sv)) : 1 - ss(q.w * 0.45, q.w, Math.abs(sv - q.s0));
  // luz (vista por dentro e em corte)
  const gArt = new T.CylinderGeometry(1, 1, L, 72, 300, true);
  const pa = gArt.attributes.position, baseA = new Float32Array(pa.count * 2);
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), n = Math.hypot(x, z) || 1; baseA[2 * i] = x / n; baseA[2 * i + 1] = z / n; }
  gArt.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(pa.count * 3), 3));
  gArt.setAttribute('placa', new T.Float32BufferAttribute(new Float32Array(pa.count), 1));
  const paredeA = new T.Mesh(gArt, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: T.BackSide }));
  // parede de fora (calibre, com o aneurisma): vidro no corte, opaca na vista "Por fora"
  const gFora = new T.CylinderGeometry(1, 1, L, 56, 200, true), pf0 = gFora.attributes.position, baseF = new Float32Array(pf0.count * 2);
  for (let i = 0; i < pf0.count; i++) { const x = pf0.getX(i), z = pf0.getZ(i), n = Math.hypot(x, z) || 1; baseF[2 * i] = x / n; baseF[2 * i + 1] = z / n; }
  gFora.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(pf0.count * 3).fill(1), 3));
  gFora.setAttribute('placa', new T.Float32BufferAttribute(new Float32Array(pf0.count).fill(0.12), 1));
  const mVidro = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true, side: T.FrontSide, depthWrite: false });
  const vidroA = new T.Mesh(gFora, mVidro); vidroA.renderOrder = 4;
  // FAV: a artéria nutridora cruza no topo do vaso (a anastomose); o sangue arterial entra na veia por ali
  const anastoA = new T.Group(); anastoA.visible = false; cenaV.add(anastoA);
  { const mA = new T.MeshStandardMaterial({ color: new T.Color(0xd8343a).convertSRGBToLinear(), roughness: 0.5, emissive: new T.Color(0x3a060a) }); for (const sx of [1, -1]) { const g = new T.CylinderGeometry(0.6, 0.6, 5, 32, 1, false); g.rotateZ(Math.PI / 2); g.translate(sx * 3.65, L / 2 - 0.5, 0); anastoA.add(new T.Mesh(g, mA)); } }
  function texturaAdventicia(enx) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    let s = 11; const rnd2 = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    g.fillStyle = enx ? '#dfe4ec' : '#b04a52'; g.fillRect(0, 0, 256, 256);
    if (enx) { g.strokeStyle = 'rgba(120,135,160,.55)'; g.lineWidth = 3; for (let y = 0; y < 256; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); } }
    else {
      for (let i = 0; i < 70; i++) { // manchas repetidas nas bordas: a textura emenda sem costura
        const x0 = rnd2() * 256, y0 = rnd2() * 256, r = 10 + rnd2() * 30, cl = rnd2() > 0.5 ? '240,190,180' : '110,25,35';
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { const x = x0 + ox, y = y0 + oy; if (x < -r || x > 256 + r || y < -r || y > 256 + r) continue; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + cl + ',.22)'); gr.addColorStop(1, 'rgba(' + cl + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      }
      g.strokeStyle = 'rgba(120,20,32,.55)'; g.lineWidth = 1.4; // vasa vasorum
      for (let i = 0; i < 14; i++) { let x = rnd2() * 256, y = rnd2() * 256; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd2() - 0.5) * 50; y += 10 + rnd2() * 30; g.lineTo(x, y); } g.stroke(); }
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 6); t.encoding = T.sRGBEncoding; return t;
  }
  const texAdv = texturaAdventicia(false), texEnx = texturaAdventicia(true);
  const paredeExt = new T.Mesh(gFora, new T.MeshStandardMaterial({ map: texAdv, roughness: 0.7 })); paredeExt.visible = false;
  // placa / trombo como massa vista de fora (opaca só onde há placa)
  const mPlacaFora = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true, side: T.FrontSide, depthWrite: false });
  mPlacaFora.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float placa;\nvarying float vPlaca;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPlaca = placa;');
    sh.fragmentShader = 'varying float vPlaca;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.a *= vPlaca;');
  };
  mVidro.onBeforeCompile = mPlacaFora.onBeforeCompile;
  const placaFora = new T.Mesh(gArt, mPlacaFora); placaFora.renderOrder = 2;
  const tampao = new T.Mesh(new T.CylinderGeometry(0.97, 0.97, 1, 40, 1, true), new T.MeshStandardMaterial({ color: 0x4a0d14, roughness: 0.8, transparent: true }));
  tampao.visible = false; let temTampao = false;
  // stent: malha metálica encostada na parede, no trecho central
  const txS = texStent.clone(); txS.needsUpdate = true; txS.repeat.set(10, 26);
  const stentA = new T.Mesh(new T.CylinderGeometry(0.95, 0.95, 1, 48, 1, true), new T.MeshStandardMaterial({ color: 0xd7dde3, map: txS, alphaMap: txS, alphaTest: 0.4, metalness: 0.8, roughness: 0.28, side: T.DoubleSide }));
  stentA.visible = false;
  // dissecção (flap) e colaterais: refeitos a cada artéria
  const mFlap = new T.MeshStandardMaterial({ color: 0xf2d6d2, roughness: 0.5, side: T.DoubleSide, transparent: true, opacity: 0.9 });
  const flap = new T.Mesh(new T.BufferGeometry(), mFlap); flap.visible = false;
  const gColat = new T.Group(), mColat = new T.MeshStandardMaterial({ color: 0xd8545c, roughness: 0.5 });
  for (const o of [paredeA, vidroA, paredeExt, placaFora, tampao, stentA, flap, gColat]) { o.visible = o.visible && ARTERIAL; cenaV.add(o); }
  if (!ARTERIAL) { paredeA.visible = vidroA.visible = placaFora.visible = false; }
  const ruido = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  function montaArteria() {
    if (!ARTERIAL) return;
    const tb = TUBOS[st.sel], key = tb && tb.chave ? tb.chave.key : null, ehEnx = key === 'enxerto';
    const v = FAV ? (key === 'fav' && ex.extra ? favComoArteria(ex.extra.avaliacao || {}) : null) : ehEnx ? (ex.enxerto && ex.enxerto.tipo ? enxertoComoArteria(ex.enxerto) : null) : key && ex.arterias ? ex.arterias[key] : null;
    LES = lesoesDe(v); anastoA.visible = !!(FAV && key === 'fav');
    const F = v && v.aneurisma && !ehEnx ? fatorAneurisma(key, v) : 0, sac = F && v.aneurismaForma === 'Sacular', trombo = F && v.tromboMural, ANG_S = -0.7;
    for (let k = 0; k < NSA; k++) {
      const sv = k / (NSA - 1); let p = 0, cx = 0, cz = 0, dom = -1, mx = 0.02;
      let oc = 0; LES.forEach((q) => { if (q.oc) oc = Math.max(oc, pesoLes(q, sv)); });
      LES.forEach((q, j) => { const g = pesoLes(q, sv) * q.p * (q.oc ? 1 : 1 - oc); if (g <= 0) return; p += g; if (!q.oc && !q.conc) { cx -= g * Math.cos(q.ang); cz -= g * Math.sin(q.ang); } if (g > mx) { mx = g; dom = j; } });
      // aneurisma: a parede de fora dilata (sacular: de um lado); sem trombo mural a luz acompanha
      const b = F ? (F - 1) * bojo(sv) : 0, ro = 1 + (sac ? b * 0.5 : b), ox = sac ? b * 0.5 * Math.cos(ANG_S) : 0, oz = sac ? b * 0.5 * Math.sin(ANG_S) : 0;
      artRO[k] = ro; artOX[k] = ox; artOZ[k] = oz; artTM[k] = trombo ? ss(0.05, 0.3, b / Math.max(0.01, F - 1)) : 0;
      const luz = trombo ? 1 + 0.25 * b / Math.max(1, F) : ro;
      artR[k] = Math.max(0.07, luz * (1 - Math.min(p, 0.93))); artCX[k] = (trombo ? 0 : ox) + cx * luz; artCZ[k] = (trombo ? 0 : oz) + cz * luz; artL[k] = dom;
    }
    const cor = gArt.attributes.color, alfa = gArt.attributes.placa, COLS = 73, baseCor = ehEnx ? [0.7, 0.74, 0.84] : v && v.fav ? [0.62, 0.34, 0.56] : [0.78, 0.3, 0.34];
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i), k = amostraArt(y), rl = artR[k], dx = baseA[2 * i], dz = baseA[2 * i + 1];
      const iv = Math.floor(i / COLS) * 72 + (i % COLS) % 72; // a costura do cilindro (coluna 0 = 72) recebe o mesmo ruído
      const q = artL[k] >= 0 ? LES[artL[k]] : null, rug = q && q.tipo === 'Calcificada' ? 1 - 0.05 * ruido(iv) : 1;
      const px = artCX[k] + dx * rl * rug, pz = artCZ[k] + dz * rl * rug; pa.setXYZ(i, px, y, pz);
      const esp = artRO[k] - Math.hypot(px - artOX[k], pz - artOZ[k]), I = ss(0.05, 0.28, esp), n = ruido(iv * 7 + 3);
      const tm = artTM[k] > 0.02 && (!q || q.p * pesoLes(q, sDeY(y)) < 0.15);
      alfa.setX(i, (q && !q.oc) || tm ? 0.92 * I : 0);
      let c = [baseCor[0] + 0.1 * n, baseCor[1] + 0.06 * n, baseCor[2] + 0.05 * n];
      if (tm && I > 0) { const camada = 0.75 + 0.25 * Math.sin(y * 9 + n); c = c.map((x, j) => lerp(x, COR_PLACA.trombo[j] * camada, I)); }
      else if (q && I > 0) { const tp = q.tipo === 'Mista' ? (n > 0.55 ? 'Calcificada' : 'Lipídica') : q.tipo, pc = COR_PLACA[tp] || COR_PLACA['Lipídica'], m = I * (0.85 + 0.15 * n); c = c.map((x, j) => lerp(x, pc[j] * (0.88 + 0.12 * n), m)); }
      cor.setXYZ(i, c[0], c[1], c[2]);
    }
    pa.needsUpdate = true; cor.needsUpdate = true; alfa.needsUpdate = true; gArt.computeVertexNormals();
    const corF = gFora.attributes.color, alfaF = gFora.attributes.placa, corV = ehEnx ? [0.75, 0.8, 0.95] : [1, 0.6, 0.65];
    for (let i = 0; i < pf0.count; i++) {
      const y = pf0.getY(i), k = amostraArt(y), r = artRO[k] * 1.04, tm = artTM[k], lam = 0.75 + 0.25 * Math.sin(y * 9);
      pf0.setXYZ(i, artOX[k] + baseF[2 * i] * r, y, artOZ[k] + baseF[2 * i + 1] * r);
      corF.setXYZ(i, lerp(corV[0], COR_PLACA.trombo[0] * lam, tm), lerp(corV[1], COR_PLACA.trombo[1] * lam, tm), lerp(corV[2], COR_PLACA.trombo[2] * lam, tm)); alfaF.setX(i, lerp(0.12, 0.62, tm));
    }
    pf0.needsUpdate = true; corF.needsUpdate = true; alfaF.needsUpdate = true; gFora.computeVertexNormals();
    paredeExt.material.map = ehEnx ? texEnx : texAdv; paredeExt.material.needsUpdate = true;
    const ocq = LES.find((q) => q.oc);
    temTampao = !!ocq; tampao.visible = temTampao; if (ocq) { const ya = yDeS(ocq.a), yb = yDeS(ocq.b); tampao.scale.set(1, ya - yb, 1); tampao.position.set(0, (ya + yb) / 2, 0); }
    const temStent = !!(v && v.stent && v.stent !== 'Ausente'); stentA.visible = temStent;
    if (temStent) { const FS = faixaStent3D(v), comp = (FS[1] - FS[0]) * L; stentA.material.color.setHex(corStent(v.stent)); stentA.scale.set(1, comp, 1); stentA.position.y = yDeS((FS[0] + FS[1]) / 2); txS.repeat.set(10, Math.max(3, comp * 4)); }
    // dissecção: membrana (flap) cortando a luz, com a porta de entrada no começo
    flap.visible = !!(v && v.disseccao);
    if (flap.visible) {
      const pos = [], idx = [], NY = 90, NX = 14;
      for (let j = 0; j <= NY; j++) {
        const sv = lerp(CENTRAL[0], CENTRAL[1], j / NY), y = yDeS(sv), k = amostraArt(y), rl = artR[k], d = rl * (0.28 + 0.06 * Math.sin(sv * 40)), w = Math.sqrt(Math.max(0, rl * rl - d * d)) * 0.985;
        const abre = j < 8 ? j / 8 : 1; // porta de entrada: o flap se solta da parede
        for (let i = 0; i <= NX; i++) { const u = -1 + 2 * i / NX; pos.push(artCX[k] + u * w * (abre < 1 && u > 0 ? abre : 1), y, artCZ[k] + d + 0.04 * Math.sin(u * 3 + sv * 30)); }
      }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      flap.geometry.dispose(); const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); flap.geometry = g;
    }
    // reabitada por colaterais: vasinhos que chegam por fora no terço proximal
    for (const o of gColat.children) o.geometry.dispose(); gColat.clear();
    if (v && v.reabitada) [[0.4, 0.26], [2.6, 0.34], [4.3, 0.42]].forEach(([a, sv]) => {
      const y = yDeS(sv), k = amostraArt(y), r = artRO[k], d = new T.Vector3(Math.cos(a), 0, Math.sin(a));
      const pts = [d.clone().multiplyScalar(r + 3.6).setY(y + 2.4), d.clone().multiplyScalar(r + 2.4).setY(y + 1.7).add(new T.Vector3(0, 0, 0.5)), d.clone().multiplyScalar(r + 1.1).setY(y + 0.6), d.clone().multiplyScalar(r * 0.9).setY(y)];
      gColat.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.16, 10, false), mColat));
    });
    // leitura: nome, achados e rótulos presos às lesões
    const nome = tb ? tb.nome : 'Artéria', pri = LES.find((q) => q.principal), oc = LES.find((q) => q.oc && !q.stent), rest = LES.find((q) => q.rest);
    const vel = (v && VEL_ART[v.velocidade]) || 1;
    const partes = [], rots = []; let tom = 'normal';
    const total = !!(oc && oc.a <= 0.08 && oc.b >= 0.92);
    if (total) { partes.push('<b>Oclusão total</b> · sem fluxo'); tom = 'refluxo'; rots.push(['oclusão', 0.5]); }
    else {
      partes.push((v && v.sentido === 'Retrógrado' ? 'Fluxo <b>retrógrado</b> ' : 'Fluxo ') + String((v && v.tipoOnda) || 'Trifásico').toLowerCase().replace(' (tardus-parvus)', ''));
      if (pri) { partes.push('placa ' + (pri.tipo === 'Mista' ? 'mista' : pri.tipo.toLowerCase()) + (pri.pct > 0 ? ' · <b>estenose ' + Math.round(pri.pct) + '%</b>' : '')); if (pri.pct >= 50) tom = 'refluxo'; rots.push([pri.pct > 0 ? 'estenose ' + Math.round(pri.pct) + '%' : 'placa ' + (pri.tipo === 'Mista' ? 'mista' : pri.tipo.toLowerCase()), pri.s0]); }
      if (oc) { partes.push('<b>oclusão</b> no ' + TERCOS[Math.min(2, Math.floor((oc.a + oc.b) / 2 * 3))].toLowerCase()); tom = 'refluxo'; rots.push(['oclusão', (oc.a + oc.b) / 2]); }
    }
    if (temStent) { partes.push(v.stent === 'Pérvio' ? 'stent pérvio' : v.stent === 'Ocluído' ? '<b>stent ocluído</b>' : '<b>reestenose do stent</b>'); if (v.stent !== 'Pérvio') tom = 'refluxo'; rots.push([v.stent === 'Pérvio' ? 'stent' : v.stent === 'Ocluído' ? 'stent ocluído' : 'reestenose', (faixaStent3D(v)[0] + faixaStent3D(v)[1]) / 2]); }
    if (F) { const d = numA(v.aneurismaDiametro); partes.push('<b>aneurisma</b>' + (sac ? ' sacular' : '') + (d ? ' ' + String(d).replace('.', ',') + ' mm' : '') + (trombo ? ' com trombo mural' : '')); tom = 'refluxo'; rots.push(['aneurisma' + (d ? ' ' + String(d).replace('.', ',') + ' mm' : ''), 0.5]); }
    if (v && v.disseccao) { partes.push('<b>dissecção</b>'); tom = 'refluxo'; rots.push(['dissecção (flap)', 0.6]); }
    if (v && v.reabitada) { partes.push('reabitada por colaterais'); rots.push(['colaterais', 0.34]); }
    if (!pri && !oc && !temStent && !F && !(v && v.disseccao) && !rest && !(v && v.reabitada)) partes.push(LES.length ? 'ateromatose ' + String(v.ateromatose || '').toLowerCase() : 'sem placas');
    if (ehEnx && ex.enxerto) partes.unshift(ex.enxerto.status === 'Ocluído' ? '<b>enxerto ocluído</b>' : ex.enxerto.status === 'Com estenose' ? '<b>enxerto com estenose</b>' : 'enxerto pérvio');
    if (v && v.fav && ex.extra) {
      const a = ex.extra.avaliacao || {}, pp = [];
      pp.push(v.status === 'Ocluída' ? '<b>FAV ocluída</b> · sem fluxo' : 'FAV pérvia' + (a.fluxoVolume ? ' · <b>' + String(a.fluxoVolume).trim() + ' mL/min</b>' : ''));
      if (a.estenose) pp.push('<b>estenose' + (a.estenosePercentual ? ' ' + a.estenosePercentual + '%' : '') + '</b>' + (a.estenoseLocal ? ' (' + a.estenoseLocal.toLowerCase() + ')' : ''));
      if (a.aneurisma) pp.push('<b>aneurisma</b>' + (a.aneurismaDiametro ? ' ' + mmF(a.aneurismaDiametro) : ''));
      if (a.pseudoaneurisma) pp.push('<b>pseudoaneurisma</b>');
      if (a.tromboParcial) pp.push('trombo parcial');
      if (a.stent) pp.push('stent' + (a.stentStatus ? ' ' + a.stentStatus.toLowerCase() : ''));
      partes.splice(0, partes.length, ...pp); tom = v.status === 'Ocluída' || a.estenose || a.aneurisma || a.pseudoaneurisma ? 'refluxo' : 'normal';
    }
    artInfo = { key, v, F, foco: rots.length ? yDeS(rots[0][1]) : 0, nome, t: partes.join(' · '), tom, onda: (v && v.tipoOnda) || 'Trifásico', fator: vel, total, oclA: oc && !total ? yDeS(oc.a) : null, oclB: oc && !total ? yDeS(oc.b) : null, sentido: v && v.sentido === 'Retrógrado' ? -1 : 1, enxerto: ehEnx };
    const rv1 = $('rV1'), rv2 = $('rV2'), r1 = rots[0], r2 = rots.find((r) => r !== r1 && Math.abs(r[1] - r1[1]) > 0.12);
    if (rv1) rv1.textContent = r1 ? r1[0] : ''; if (rv2) rv2.textContent = r2 ? r2[0] : '';
    if (ROT_V) { ROT_V[2][1] = r1 ? yDeS(r1[1]) : 999; ROT_V[3][1] = r2 ? yDeS(r2[1]) : 999; ROT_V[2][2] = ROT_V[3][2] = -1; ROT_V[2][3] = r1 ? artRO[amostraArt(yDeS(r1[1]))] : 1; ROT_V[3][3] = r2 ? artRO[amostraArt(yDeS(r2[1]))] : 1; }
    for (let i = 0; i < N; i++) { if (artInfo.oclA !== null && pY[i] <= artInfo.oclA && pY[i] >= artInfo.oclB) pY[i] = artInfo.oclA + 0.2 + rnd() * 1.5; }
  }
  // velocidade do pulso arterial (positiva = desce, sentido do fluxo)
  const gs = (x, m, d) => Math.exp(-Math.pow((x - m) / d, 2));
  function pulsoArt(fc) {
    const o = artInfo.onda;
    const v = o === 'Bifásico' ? gs(fc, 0.1, 0.05) - 0.3 * gs(fc, 0.25, 0.06) : o === 'Monofásico' ? 0.55 * gs(fc, 0.17, 0.12) + 0.12 : /Amortecido/.test(o) ? 0.3 * gs(fc, 0.28, 0.2) + 0.12 : gs(fc, 0.1, 0.05) - 0.35 * gs(fc, 0.24, 0.05) + 0.15 * gs(fc, 0.38, 0.06);
    return artInfo.total ? 0 : v * artInfo.fator * artInfo.sentido;
  }
  // ---------- Doppler arterial (espectral, esquemático) no ponto da amostra ----------
  const VPS0 = { fav: 160, 'Tronco Braquiocefálico': 100, 'Artéria Subclávia': 100, 'Artéria Axilar': 90, 'Artéria Braquial': 70, 'Artéria Radial': 55, 'Artéria Ulnar': 55, 'Artéria Femoral Comum': 110, 'Artéria Femoral Profunda': 80, 'Artéria Femoral Superficial': 90, 'Artéria Poplítea': 70, 'Artéria Tibial Anterior': 55, 'Artéria Fibular': 45, 'Artéria Tibial Posterior': 55, enxerto: 70 };
  const razaoVPS = (p) => p < 50 ? 1 + p / 50 * 0.9 : p <= 75 ? 2 + (p - 50) / 25 * 2 : Math.min(7, 4 + (p - 75) / 25 * 2.5);
  const FORMAS = {
    'Trifásico': (f) => gs(f, 0.13, 0.07) - 0.32 * gs(f, 0.3, 0.07) + 0.14 * gs(f, 0.46, 0.08),
    'Bifásico': (f) => gs(f, 0.13, 0.075) - 0.27 * gs(f, 0.32, 0.08),
    'Monofásico': (f) => 0.85 * gs(f, 0.16, 0.12) + 0.15,
    'Amortecido (tardus-parvus)': (f) => 0.75 * gs(f, 0.34, 0.22) + 0.25,
    batida: (f) => gs(f, 0.1, 0.045) - 0.7 * gs(f, 0.21, 0.055),
    'Fístula': (f) => 0.55 * gs(f, 0.13, 0.1) + 0.45 + 0.05 * Math.sin(f * 30),
    turbilhao: (f) => 0.55 * gs(f, 0.16, 0.12) + 0.2 * Math.sin(f * 40) * gs(f, 0.3, 0.25),
  };
  function dopplerNoPonto(sv) {
    const v = artInfo.v; if (!v) return { forma: () => 0, k: 0, vps: 0, nota: '' };
    const vel = v.velocidade === 'Hipercinético' ? 1.4 : v.velocidade === 'Hipocinético' ? 0.55 : 1, base = (VPS0[artInfo.key] || 70) * vel;
    let forma = FORMAS[v.tipoOnda] || FORMAS['Trifásico'], k = 1, largo = v.fav ? 0.5 : 0, nota = v.fav ? 'fluxo da FAV (baixa resistência)' : 'fluxo ' + String(v.tipoOnda || 'Trifásico').toLowerCase().replace(' (tardus-parvus)', ''), razao = 0;
    const oc = LES.find((q) => q.oc);
    if (artInfo.total || (oc && sv >= oc.a && sv <= oc.b)) return { forma: () => 0, k: 0, vps: 0, nota: oc && oc.stent ? 'dentro do stent ocluído' : 'na oclusão', largo: 0 };
    if (oc && sv < oc.a) { forma = FORMAS.batida; k = 0.55; nota = 'antes da oclusão: alta resistência'; }
    else if (oc && sv > oc.b) { forma = FORMAS['Amortecido (tardus-parvus)']; k = 0.32; largo = 0.4; nota = 'depois da oclusão: tardus-parvus'; }
    for (const q of LES) {
      if (!(q.principal && q.pct > 0) && !q.rest) continue;
      const p = q.rest ? 55 : q.pct, d = sv - q.s0;
      if (Math.abs(d) < q.w * 0.55) { razao = razaoVPS(p); k *= razao; largo = Math.max(largo, p >= 50 ? 0.9 : 0.5); nota = q.rest ? 'na reestenose do stent' : 'na estenose ' + Math.round(p) + '%'; }
      else if (d > 0 && d < q.w + 0.08 && p >= 50) { largo = Math.max(largo, 1); k *= 1.15; nota = 'pós-estenose: turbulência'; }
    }
    if (artInfo.F) { const b = bojo(sv); if (b > 0.3) { forma = FORMAS.turbilhao; k *= 1 / Math.pow(1 + (artInfo.F - 1) * b, 1.4); largo = 1; nota = 'no aneurisma: fluxo lento e turbulento'; } }
    if (v.disseccao && sv > CENTRAL[0] && sv < CENTRAL[1] && largo < 0.6) { largo = 0.6; nota = 'na dissecção: fluxo nas duas luzes'; }
    const sent = v.sentido === 'Retrógrado' ? -1 : 1; if (sent < 0) nota = 'fluxo retrógrado · ' + nota;
    let pico = 0; for (let i = 0; i < 60; i++) pico = Math.max(pico, Math.abs(forma(i / 60)));
    return { forma: (f) => forma(f) * sent, k, vps: Math.round(base * k * pico / 5) * 5, nota, largo, sent, razao };
  }
  // gate amarelo da amostra (nível Artéria)
  const gate = new T.Group(), mGate = new T.MeshBasicMaterial({ color: 0xffd23f, depthTest: false, transparent: true });
  for (const sgn of [1, -1]) { const b = new T.Mesh(new T.BoxGeometry(0.55, 0.06, 0.06), mGate); b.position.y = sgn * 0.16; b.renderOrder = 9; gate.add(b); }
  gate.visible = false; cenaV.add(gate);
  let dopAtual = null, sAmostra = 0.5;
  function atualizaAmostra() {
    if (!ARTERIAL || st.nivel === 'perna') { gate.visible = false; return; }
    const y = st.nivel === 'dentro' ? -cam.inY - 1.2 : (st.amostraY !== null ? st.amostraY : cam.alvoY); sAmostra = sDeY(y);
    const pf = perfilArt(y); gate.position.set(pf.cx, y, pf.cz); gate.quaternion.copy(camV3.quaternion); gate.visible = st.nivel === 'veia' && !st.externa && !PACIENTE;
    dopAtual = dopplerNoPonto(sAmostra);
    const n = '◉ ' + dopAtual.nota, r = dopAtual.vps ? 'VPS ' + dopAtual.vps + ' cm/s' + (dopAtual.razao ? ' · R ' + dopAtual.razao.toFixed(1).replace('.', ',') : '') : 'sem fluxo';
    if (dopN.textContent !== n) dopN.textContent = n; if (dopR.textContent !== r) { dopR.textContent = r; dopR.style.color = !dopAtual.vps || dopAtual.k >= 2 ? 'var(--refluxo)' : ''; }
  }
  function desenhaDopplerArt() {
    const w = dop.width, h = dop.height; dctx.fillStyle = '#05080c'; dctx.fillRect(0, 0, w, h);
    if (!dopAtual) return;
    const d = dopAtual, esc = Math.max(100, Math.ceil(Math.max(d.vps, 60) * 1.3 / 50) * 50), y0 = d.sent < 0 ? h * 0.3 : h * 0.74, amp = (d.sent < 0 ? h * 0.66 : h * 0.68) * (d.vps / esc), DUR = 2.25;
    const pico = Math.max(1e-6, ...Array.from({ length: 40 }, (_, i) => Math.abs(d.forma(i / 40)))), px = Math.max(1, w / 400);
    const tAgora = st.t % DUR, xc = tAgora / DUR * w;
    for (let x = 0; x < w; x += 2 * px) {
      if (x > xc && x < xc + w * 0.04) continue; // apagador da varredura
      const t = x / w * DUR, f = (t % 0.9) / 0.9, val = d.forma(f) / pico, e = val * amp, alt = Math.abs(e);
      if (alt < 0.5) continue;
      const sist = Math.abs(val) > 0.45, janela = sist && d.largo < 0.5 ? 0.55 * (1 - d.largo) : 0.06, dir = e > 0 ? -1 : 1;
      dctx.fillStyle = 'rgba(190,198,206,' + (0.22 + 0.25 * d.largo).toFixed(2) + ')'; // faixa do espectro (com a janela espectral livre)
      dctx.fillRect(x, dir < 0 ? y0 - alt : y0 + alt * janela, 2 * px, alt * (1 - janela));
      for (let k = 0; k < 10; k++) { // pontinhos do espectro
        const r = Math.random(), a = janela + (1 - janela) * Math.pow(r, 0.6), yy = y0 + dir * alt * a, br = 150 + 105 * (1 - Math.abs(a - 0.85) * 1.3) * (0.6 + 0.4 * Math.random());
        dctx.fillStyle = 'rgb(' + br + ',' + br + ',' + br + ')'; dctx.fillRect(x, yy, 2 * px, 2 * px);
      }
      const ruido = d.largo > 0.6 ? (Math.random() - 0.5) * alt * 0.12 : 0;
      dctx.fillStyle = '#ffffff'; dctx.fillRect(x, y0 + dir * (alt + ruido), 2 * px, 1.5 * px);
    }
    dctx.fillStyle = 'rgba(14,184,208,.9)'; dctx.fillRect(0, y0 - px / 2, w, px); // linha de base
    dctx.fillStyle = 'rgba(255,255,255,.85)'; dctx.fillRect(xc - px, 0, 2 * px, h);
    dctx.font = (9 * px * 1.1).toFixed(0) + 'px monospace'; dctx.fillStyle = 'rgba(159,178,198,.95)'; dctx.textBaseline = 'middle';
    const topo = d.sent < 0 ? y0 + h * 0.66 : y0 - h * 0.68; dctx.fillText((d.sent < 0 ? '-' : '') + esc, 3 * px, Math.min(h - 6 * px, Math.max(6 * px, topo))); dctx.fillText('0', 3 * px, y0 + (d.sent < 0 ? -7 : 7) * px); dctx.textAlign = 'right'; dctx.fillText('cm/s', w - 3 * px, d.sent < 0 ? h - 6 * px : 6 * px); dctx.textAlign = 'left';
  }
  function atualizaCelulasArt(dt) {
    const fc = (st.t % 0.9) / 0.9, vp = pulsoArt(fc), A = artInfo.oclA, B = artInfo.oclB;
    for (let i = 0; i < N; i++) {
      let y = pY[i];
      if (dt > 0) {
        let v = vp;
        if (A !== null) { if (y > A) v = 0.55 * Math.sin(fc * 6.283) * artInfo.fator; else if (y < B) v = 0.22 * artInfo.fator; }
        const rl = perfilArt(y).rl, zU = pZ[i], a = pA[i], rho2 = a * a * (1 - zU * zU) + zU * zU, jato = clamp(1 / (rl * rl), 0.3, 4);
        y -= v * VMAX * RAPIDEZ_ART * (1 - 0.6 * rho2) * jato * dt;
        if (A !== null && y > B && y <= A + 0.12) y = A + 0.12;
        if (y < -L / 2) y = A !== null ? B - 0.05 - rnd() * 0.6 : y + L; else if (y > L / 2) y -= L;
        pY[i] = y;
      }
      const pf = perfilArt(y), zU = pZ[i], livre = pf.rl * Math.sqrt(1 - zU * zU);
      peca.position.set(pf.cx + pA[i] * livre * 0.9, y, pf.cz + zU * pf.rl * 0.92);
      const giro = st.t * (0.4 + pR[i * 6 + 3] * 1.3);
      peca.rotation.set(pR[i * 6] * 6.28 + giro, pR[i * 6 + 1] * 6.28 + giro * 0.7, pR[i * 6 + 2] * 6.28);
      const perto = lerp(1, 0.72 * ss(0.6, 2.6, peca.position.distanceTo(camV3.position)), dentroF), some = pf.rl < 0.2 ? 0 : 1;
      peca.scale.setScalar(((0.085 + pR[i * 6 + 4] * 0.035) * perto * Math.min(1, pf.rl * 1.6)) * some + 0.0001);
      peca.updateMatrix(); cel.setMatrixAt(i, peca.matrix);
    }
    cel.instanceMatrix.needsUpdate = true;
  }

  // válvulas da veia escolhida [de baixo (lado da mão), de cima (lado do coração)]:
  // subclávia: considerada sem válvulas (tem no máximo 1, perto da jugular); axilar e as demais têm válvulas
  const VALVULAS_MMSS = { 'Veia Subclávia': [false, false] };
  function ajustaValvulas() {
    if (ARTERIAL) return;
    const tb = TUBOS[st.sel], cfg = (BRACO && tb && tb.chave && VALVULAS_MMSS[tb.chave.key]) || [true, true];
    VALV_ON[0] = cfg[0]; VALV_ON[1] = cfg[1];
    for (const f of folhetos) f.m.visible = VALV_ON[VALVULAS.indexOf(f.z0)];
    ROT_V[2][1] = VALV_ON[0] ? VALVULAS[0] + H * 0.55 : 999; ROT_V[3][1] = VALV_ON[1] ? VALVULAS[1] + H * 0.55 : 999;
    ajustaJuncao(); atualizaParede();
  }
  // coágulo (MMSS): trombo parcial de um lado da luz, ou trombose oclusiva preenchendo a veia
  const gCoag = new T.SphereGeometry(1, 40, 28); { const p = gCoag.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.09 * Math.sin(x * 7 + y * 3) * Math.cos(z * 6 - y * 2); p.setXYZ(i, x * k, y, z * k); } gCoag.computeVertexNormals(); }
  const coagulo = new T.Mesh(gCoag, new T.MeshStandardMaterial({ color: new T.Color(0x5a1018).convertSRGBToLinear(), roughness: 0.85 })); coagulo.visible = false; cenaV.add(coagulo);
  if (BRACO && $('rPe')) $('rPe').textContent = '↓ mão';
  if (FAV && $('rPe') && $('rCor')) { $('rCor').textContent = '↑ anastomose'; $('rPe').textContent = '↓ coração'; } // na FAV o sangue vai da anastomose para o coração

  // ---------- câmeras e navegação: perna -> veia -> por dentro ----------
  cam.alvoY = 0;
  const EIXO_Z = new T.Vector3(0, 0, 1), dirTmp = new T.Vector3(), guia = new T.PerspectiveCamera(), alvoPos = new T.Vector3(), alvoOlhar = new T.Vector3(), cima = new T.Vector3();
  function posiciona(suave) {
    const k = suave ? 0.12 : 1;
    if (st.nivel === 'perna') {
      if (camP.azAlvo !== null) { // botões A/M/P/L: gira até a face escolhida pelo caminho mais curto
        const d = Math.atan2(Math.sin(camP.azAlvo - camP.az), Math.cos(camP.azAlvo - camP.az)), dp = camP.polAlvo - camP.pol;
        camP.az += d * 0.16; camP.pol += dp * 0.16;
        if (Math.abs(d) < 0.002 && Math.abs(dp) < 0.002) { camP.az = camP.azAlvo; camP.pol = camP.polAlvo; camP.azAlvo = null; }
      }
      camP.alvoS.lerp(camP.alvo, suave ? 0.14 : 1);
      alvoPos.set(camP.alvoS.x + camP.dist * Math.sin(camP.pol) * Math.sin(camP.az), camP.alvoS.y + camP.dist * Math.cos(camP.pol), camP.alvoS.z + camP.dist * Math.sin(camP.pol) * Math.cos(camP.az));
      guia.position.copy(alvoPos); guia.up.set(0, 1, 0); guia.lookAt(camP.alvoS);
      camP3.position.lerp(alvoPos, k); camP3.quaternion.slerp(guia.quaternion, k); return;
    }
    if (st.nivel === 'veia') {
      alvoPos.set(cam.dist * Math.sin(cam.pol) * Math.sin(cam.az), cam.dist * Math.cos(cam.pol), cam.dist * Math.sin(cam.pol) * Math.cos(cam.az)); cima.set(0, 1, 0);
      if (junc.on && !ARTERIAL) { alvoPos.applyAxisAngle(EIXO_Z, J_ANG); cima.applyAxisAngle(EIXO_Z, J_ANG); alvoOlhar.set(2.2, cam.alvoY + 4.2, 0); } else alvoOlhar.set(0, cam.alvoY, 0);
      alvoPos.add(alvoOlhar);
    }
    else if (ARTERIAL) { const bal = st.pausado ? 0 : 0.03, yw = -cam.inY, a = perfilArt(yw), b = perfilArt(yw - 1); alvoPos.set(a.cx + bal * Math.sin(st.t * 0.7), yw, a.cz + bal * Math.cos(st.t * 0.9)); alvoOlhar.set(b.cx + cam.tx, yw - 1, b.cz + cam.tz); cima.set(0, 0, -1); }
    else { // na junção, ao entrar na profunda a câmera vira para seguir o sangue rumo ao coração
      const bal = st.pausado ? 0 : 0.1, u = junc.on ? ss(6.0, 9.2, cam.inY) : 0; alvoPos.set(bal * Math.sin(st.t * 0.7), cam.inY, bal * Math.cos(st.t * 0.9));
      if (u > 0) { dirTmp.copy(alvoPos).sub(J_C0); const tt = dirTmp.dot(J_D); dirTmp.copy(J_C0).addScaledVector(J_D, tt); alvoPos.lerp(dirTmp, u); } // vai para o eixo da profunda
      dirTmp.set(0, 1, 0).lerp(J_D, u).normalize(); alvoOlhar.copy(alvoPos).add(dirTmp); alvoOlhar.x += cam.tx; alvoOlhar.z += cam.tz; cima.set(0, 0, -1);
    }
    guia.position.copy(alvoPos); guia.up.copy(cima); guia.lookAt(alvoOlhar);
    camV3.position.lerp(alvoPos, k); camV3.quaternion.slerp(guia.quaternion, k);
  }
  const estSel = () => (TUBOS[st.sel] ? TUBOS[st.sel].estado : 'ok');
  const alvoDilVeia = () => { if (ARTERIAL) return 0; const e = estSel(); return e === 'ruim' ? 1 : e === 'trombo' ? 0.5 : 0; };
  const fatorFluxo = () => { const e = estSel(); return e === 'trombo' ? 0 : e === 'recan' || e === 'parcial' ? 0.45 : 1; };
  const nPerna = $('nPerna'), nVeia = $('nVeia'), nDentro = $('nDentro'), dica = $('dica');
  const DICAS = FAV && typeof opcoes.aoSelecionar === 'function' ? { perna: semNiveis() ? 'Arraste para girar. Toque num vaso ou num ponto para registrar a medida.' : 'Arraste para girar. Toque na FAV para alterar o achado; aproxime para entrar no vaso.', veia: 'Arraste o gate amarelo (ou toque no vaso) para mudar o ponto do Doppler. A barra da direita move a vista.', dentro: 'Arraste para olhar. Aproxime para avançar com o sangue, afaste para sair.' } : ARTERIAL ? { perna: typeof opcoes.aoSelecionar === 'function' ? 'Arraste para girar. Use a barra da direita (ou dois dedos) para subir e descer. Toque numa artéria para alterar o achado.' : 'Arraste para girar. Use a barra da direita (ou dois dedos) para subir e descer. Toque numa artéria para ver o nome e o achado.', veia: PACIENTE ? 'Arraste para girar. A barra da direita move a vista. Aproxime para entrar na artéria.' : 'Arraste o gate amarelo (ou toque no vaso) para mudar o ponto do Doppler. A barra da direita move a vista. Arraste fora do vaso para girar; aproxime para entrar.', dentro: 'Arraste para olhar. Aproxime para avançar com o sangue, afaste para sair.' } : { perna: typeof opcoes.aoSelecionar === 'function' ? 'Arraste para girar. Use a barra da direita (ou dois dedos) para subir e descer. Toque numa veia para alterar o achado.' : 'Arraste para girar. Use a barra da direita (ou dois dedos) para subir e descer. Toque numa veia para ver o nome.', veia: 'Arraste para girar. Aproxime para entrar na veia, afaste para voltar à perna.', dentro: 'Arraste para olhar. Aproxime para avançar, afaste para sair.' };
  function pinta() {
    nPerna.setAttribute('aria-pressed', String(st.nivel === 'perna')); nVeia.setAttribute('aria-pressed', String(st.nivel === 'veia')); nDentro.setAttribute('aria-pressed', String(st.nivel === 'dentro'));
    const naP = st.nivel === 'perna'; dica.textContent = DICAS[st.nivel] + (naP ? '' : ' Toque nas caixas para recolher.'); $('dopBox').dataset.min = '0'; $('dopBox').hidden = !(ARTERIAL && !naP && !PACIENTE); fase.hidden = naP; $('leg').hidden = !naP; if ($('pele')) $('pele').hidden = !naP; if ($('faces')) $('faces').hidden = !naP; $('bNomes').hidden = !naP; if (ARTERIAL && $('bCor')) $('bCor').hidden = st.nivel !== 'veia'; if (st.pronto) ajusta();
  }
  function irPara(n) {
    if (n === st.nivel || st.trocando) return;
    if (n !== 'perna' && semNiveis()) return;
    const mudaCena = (st.nivel === 'perna') !== (n === 'perna');
    const aplica = () => { st.nivel = n; st.semZoomAte = performance.now() + 650; if (n === 'veia') { cam.dist = 13; cam.alvoY = 0; } if (n === 'dentro') { cam.inY = FAV ? -7.72 : -6.4; cam.tx = 0; cam.tz = 0; } if (n === 'perna') camP.dist = clamp(camP.dist, 3.4, 18); pinta(); };
    if (!mudaCena) { aplica(); return; }
    st.trocando = true; veu.textContent = ''; veu.style.opacity = '1';
    setTimeout(() => { aplica(); st.dil = alvoDilVeia(); ajustaValvulas(); atualizaParede(); montaArteria(); if (junc.on && st.nivel === 'veia') cam.dist = 18; if (ARTERIAL && st.nivel === 'veia') { cam.dist = Math.max(...artRO) > 1.5 ? 12 : 9; cam.alvoY = artInfo.foco || 0; st.amostraY = artInfo.foco || 0; limitaAlvo(); } posiciona(false); veu.style.opacity = '0'; st.trocando = false; }, 240);
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
    else { cam.inY += Math.log(fator) * 4.5; if (cam.inY < fundoDentro()) irPara('veia'); cam.inY = clamp(cam.inY, fundoDentro(), topoDentro()); }
  }
  const topoDentro = () => (junc.on && !ARTERIAL ? J_TOPO_IN : 6.2), fundoDentro = () => (FAV ? -7.8 : -7.3); // a FAV começa na anastomose
  // rolagem vertical: quanto da altura cabe na tela e onde a vista está
  const Y_TOPO = 4.4, COMP_PERNA = 8.9;
  function rolagem() {
    if (st.nivel === 'perna') { const vis = 0.828 * camP.dist, livre = COMP_PERNA - vis; return { frac: clamp(vis / COMP_PERNA, 0.1, 1), pos: livre > 0.05 ? clamp((Y_TOPO - vis / 2 - camP.alvo.y) / livre, 0, 1) : 0, livre: livre > 0.05 }; }
    if (st.nivel === 'veia') { const vis = 1.04 * cam.dist, livre = L - vis; return { frac: clamp(vis / L, 0.1, 1), pos: livre > 0.05 ? clamp((L / 2 - vis / 2 - cam.alvoY) / livre, 0, 1) : 0, livre: livre > 0.05 }; }
    return { frac: 0.14, pos: clamp((topoDentro() - cam.inY) / (topoDentro() - fundoDentro()), 0, 1), livre: true };
  }
  function rolaPara(pos) {
    pos = clamp(pos, 0, 1);
    if (st.nivel === 'perna') { const vis = 0.828 * camP.dist, livre = COMP_PERNA - vis; if (livre > 0.05) { camP.alvo.y = Y_TOPO - vis / 2 - pos * livre; alvoMarca.visible = false; } }
    else if (st.nivel === 'veia') { const vis = 1.04 * cam.dist, livre = L - vis; if (livre > 0.05) cam.alvoY = L / 2 - vis / 2 - pos * livre; }
    else cam.inY = topoDentro() - pos * (topoDentro() - fundoDentro());
  }
  // mantém a vista dentro da altura da perna (e centrada quando a perna inteira cabe na tela)
  function limitaAlvo() {
    if (st.nivel === 'perna') { const vis = 0.828 * camP.dist; if (vis >= COMP_PERNA) camP.alvo.y = lerp(camP.alvo.y, CENTRO.y, 0.5); else camP.alvo.y = clamp(camP.alvo.y, Y_TOPO - COMP_PERNA + vis / 2, Y_TOPO - vis / 2); }
    else if (st.nivel === 'veia') { const vis = 1.04 * cam.dist; cam.alvoY = vis >= L ? 0 : clamp(cam.alvoY, -L / 2 + vis / 2, L / 2 - vis / 2); }
  }
  function arrastaVertical(dyPx) { // conteúdo acompanha o dedo
    if (st.nivel === 'perna') { camP.alvo.y += dyPx * 0.828 * camP.dist / Hh; alvoMarca.visible = false; limitaAlvo(); }
    else if (st.nivel === 'veia') { cam.alvoY += dyPx * 1.04 * cam.dist / Hh; limitaAlvo(); }
    else cam.inY = clamp(cam.inY + dyPx * 0.02, fundoDentro(), topoDentro());
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
  const dedos = new Map(); let pinca = 0, pincaMeio = null, pincaMeioX = null, toque = null;
  // ---- desenho na pele (caneta) ----
  const raio3 = new T.Raycaster(), vRaio = new T.Vector2();
  let caneta = null, risco = null; // risco: { pts: [Vector3], malha }
  const CORES_CANETA = { 'Tromboflebite Superficial': 0x6b7280 };
  const RAIO_CANETA = { 'Varizes Superficiais': .034, 'Varizes Reticulares': .018, 'Microvarizes': .01, 'Tromboflebite Superficial': .026 };
  function naPele(e) {
    const m = ndc(e); vRaio.set(m[0], m[1]); raio3.setFromCamera(vRaio, camP3);
    const h = raio3.intersectObjects(PELES, false)[0];
    if (h && h.object === PELES[1]) { // pé: vale o dorso, do tornozelo aos dedos
      if (h.point.z < Z_PE0 - 0.1 || h.point.y < -4.3 + 0.04) return null;
      const P = h.point.clone(); P.pe = true; return P;
    }
    if (!h || h.point.y < -3.8 || h.point.y > 4.25) return null;
    const s2 = secao(h.point.y), c = new T.Vector3(s2[2], h.point.y, s2[3]);
    return h.point.clone().sub(c).multiplyScalar(0.99).add(c); // um pouco para dentro: fica rente à pele
  }
  function desenhaRisco() {
    if (!risco || risco.pts.length < 2) return;
    if (risco.malha) { gVeias.remove(risco.malha); risco.malha.geometry.dispose(); }
    else risco.mat = new T.MeshStandardMaterial({ color: new T.Color(CORES_CANETA[caneta] || 0xe23b3b).convertSRGBToLinear(), roughness: 0.45, emissive: new T.Color(CORES_CANETA[caneta] || 0xe23b3b).convertSRGBToLinear().multiplyScalar(0.35) });
    risco.malha = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(risco.pts), risco.pts.length * 4, RAIO_CANETA[caneta] || .02, 6, false), risco.mat); risco.malha.userData.camada = 'variz';
    gVeias.add(risco.malha);
  }
  function fimRisco(salvar) {
    const r = risco; risco = null; if (!r) return;
    if (r.malha) { gVeias.remove(r.malha); r.malha.geometry.dispose(); }
    if (r.mat) r.mat.dispose();
    if (!salvar || !r.pts.length || typeof opcoes.aoDesenhar !== 'function') return;
    const vista = vistaDoTraco(r.pts);
    const pts = []; for (const P of r.pts) { const q = desce(P, vista), u = pts[pts.length - 1]; if (!u || Math.hypot(q[0] - u[0], q[1] - u[1]) >= 1.5) pts.push(q); }
    opcoes.aoDesenhar({ tipo: caneta, vista, pts });
  }
  function apagaNoToque(e) {
    if (typeof opcoes.aoApagar !== 'function') return;
    const m = ndc(e); vRaio.set(m[0], m[1]); raio3.setFromCamera(vRaio, camP3);
    const alvos = gVeias.children.filter((o) => o.userData.traco !== undefined);
    const h = raio3.intersectObjects(alvos, false)[0];
    if (h) { opcoes.aoApagar(h.object.userData.traco); return; }
    // toque perto (traço fino): procura o traço mais perto na tela
    const asp = W / Hh; let melhor = null, bd = (40 / Hh) * (40 / Hh);
    for (const o of alvos) { const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 6) { prj.fromBufferAttribute(pos, i).project(camP3); const dx = (prj.x - m[0]) * asp, dy = prj.y - m[1], d = dx * dx + dy * dy; if (d < bd) { bd = d; melhor = o; } } }
    if (melhor) opcoes.aoApagar(melhor.userData.traco);
  }
  const ndc = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]; };
  // gate do Doppler (nível Artéria): a altura no vaso que fica sob o dedo
  const prjG = new T.Vector3();
  function yNoVaso(e) {
    const r = canvas.getBoundingClientRect(), py = e.clientY - r.top; let melhor = null, bd = 1e9;
    for (let y = -L / 2 + 0.05; y <= L / 2 - 0.05; y += 0.05) { const pf = perfilArt(y); prjG.set(pf.cx, y, pf.cz).project(camV3); const d = Math.abs((-prjG.y * 0.5 + 0.5) * Hh - py); if (d < bd) { bd = d; melhor = y; } }
    return melhor;
  }
  function pertoDoGate(e) {
    if (!(ARTERIAL && st.nivel === 'veia' && gate.visible)) return false;
    const r = canvas.getBoundingClientRect(); prjG.copy(gate.position).project(camV3);
    return Math.hypot((prjG.x * 0.5 + 0.5) * W - (e.clientX - r.left), (-prjG.y * 0.5 + 0.5) * Hh - (e.clientY - r.top)) < 44;
  }
  function pertoDoEixo(e) { // toque em cima do vaso (perto da linha central na tela)
    const r = canvas.getBoundingClientRect(), y = yNoVaso(e); if (y === null) return false;
    const pf = perfilArt(y); prjG.set(pf.cx, y, pf.cz).project(camV3);
    return Math.abs((prjG.x * 0.5 + 0.5) * W - (e.clientX - r.left)) < Math.max(50, W * 0.18);
  }
  ouvir(canvas, 'pointerdown', (e) => {
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} pinca = 0; pincaMeio = null; pincaMeioX = null; toque = dedos.size === 1 ? { t: performance.now(), mov: 0 } : null;
    st.arrastaGate = dedos.size === 1 && pertoDoGate(e);
    if (dedos.size > 1) { fimRisco(false); return; } // segundo dedo: era gesto, não desenho
    if (caneta && caneta !== 'borracha' && st.nivel === 'perna' && !(e.buttons & 2)) { const P = naPele(e); risco = { pts: P ? [P] : [] }; }
  });
  ouvir(canvas, 'pointermove', (e) => {
    const d = dedos.get(e.pointerId); if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; if (toque) toque.mov += Math.abs(dx) + Math.abs(dy);
    if (risco && dedos.size === 1) {
      const P = naPele(e); if (!P) return;
      const u = risco.pts[risco.pts.length - 1];
      if (!u || u.distanceTo(P) > 0.035) { risco.pts.push(P); desenhaRisco(); }
      return;
    }
    if (st.arrastaGate && dedos.size === 1) { const y = yNoVaso(e); if (y !== null) st.amostraY = y; return; }
    if (caneta && caneta !== 'borracha' && dedos.size === 1 && st.nivel === 'perna' && (e.buttons & 2)) { soltaFace(); camP.az -= dx * 0.008; camP.pol = clamp(camP.pol - dy * 0.006, 0.35, 2.75); return; }
    if (dedos.size === 1 && (e.shiftKey || (e.buttons & 2))) arrastaVertical(dy);
    else if (dedos.size === 1) {
      if (st.nivel === 'perna') { soltaFace(); camP.az -= dx * 0.008; camP.pol = clamp(camP.pol - dy * 0.006, 0.35, 2.75); }
      else if (st.nivel === 'veia') { cam.az -= dx * 0.008; cam.pol = clamp(cam.pol - dy * 0.006, 0.3, 2.84); }
      else { cam.tx = clamp(cam.tx + dx * 0.004, -1.5, 1.5); cam.tz = clamp(cam.tz - dy * 0.004, -1.5, 1.5); }
    } else if (dedos.size === 2) { const [a, b] = Array.from(dedos.values()), dist = Math.hypot(a.x - b.x, a.y - b.y); if (pinca > 0 && dist > 0) { const m = ndc({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); aproxima(dist / pinca, m[0], m[1]); } pinca = dist; const meio = (a.y + b.y) / 2; if (pincaMeio !== null) arrastaVertical(meio - pincaMeio); pincaMeio = meio; const meioX = (a.x + b.x) / 2; if (caneta && pincaMeioX !== null && st.nivel === 'perna') { soltaFace(); camP.az -= (meioX - pincaMeioX) * 0.008; } pincaMeioX = meioX; }
  });
  const solta = (e) => {
    if (risco) { fimRisco(e.type === 'pointerup'); dedos.delete(e.pointerId); pinca = 0; pincaMeio = null; pincaMeioX = null; toque = null; return; }
    // nível Artéria: tocar no vaso leva o gate do Doppler até ali
    if (ARTERIAL && st.nivel === 'veia' && !st.arrastaGate && toque && e.type === 'pointerup' && toque.mov < 8 && performance.now() - toque.t < 450 && pertoDoEixo(e)) { const y = yNoVaso(e); if (y !== null) st.amostraY = y; }
    st.arrastaGate = false;
    const tocou = toque && e.type === 'pointerup' && toque.mov < 8 && performance.now() - toque.t < 450 && st.nivel === 'perna';
    if (tocou && caneta === 'borracha') apagaNoToque(e);
    else if (tocou && !caneta) {
      const m = ndc(e), s = amostraPerto(m[0], m[1], 70 / Hh);
      if (s) {
        const editavel = typeof opcoes.aoSelecionar === 'function';
        if (!editavel && st.sel === s.v && alvoMarca.visible && camP.dist < 5) { camP.alvo.copy(s.p); irPara('veia'); }
        else {
          st.sel = s.v; camP.alvo.copy(s.p); alvoMarca.visible = true; if (!editavel) camP.dist = Math.min(camP.dist, 4.2);
          if (editavel && TUBOS[s.v] && TUBOS[s.v].chave) opcoes.aoSelecionar({ ...chaveParaPainel(TUBOS[s.v].chave) });
        }
      }
    }
    dedos.delete(e.pointerId); pinca = 0; pincaMeio = null; pincaMeioX = null; toque = null;
  };
  ouvir(canvas, 'pointerup', solta); ouvir(canvas, 'pointercancel', solta);
  ouvir(canvas, 'contextmenu', (e) => e.preventDefault());
  ouvir(canvas, 'wheel', (e) => { e.preventDefault(); const m = ndc(e); aproxima(Math.exp(-e.deltaY * 0.0014), m[0], m[1]); }, { passive: false });
  ouvir(nPerna, 'click', () => irPara('perna')); ouvir(nVeia, 'click', () => irPara('veia')); ouvir(nDentro, 'click', () => irPara('dentro'));
  const bCor = $('bCor'), bPausa = $('bPausa');
  ouvir($('bNomes'), 'click', () => { st.nomes = !st.nomes; $('bNomes').setAttribute('aria-pressed', String(!!st.nomes)); });
  ouvir(bCor, 'click', () => { if (ARTERIAL) { st.externa = !st.externa; bCor.setAttribute('aria-pressed', String(st.externa)); if (st.externa && st.nivel === 'dentro') irPara('veia'); return; } st.doppler = !st.doppler; bCor.setAttribute('aria-pressed', String(st.doppler)); });
  function mostraPausa() {
    bPausa.innerHTML = st.pausado ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
    bPausa.setAttribute('aria-label', st.pausado ? 'Continuar animação' : 'Pausar animação'); bPausa.setAttribute('aria-pressed', String(st.pausado));
  }
  ouvir(bPausa, 'click', () => { st.pausado = !st.pausado; mostraPausa(); }); mostraPausa();
  // botões de vista: A anterior, M medial, P posterior, L lateral (0° lateral, 90° anterior, 180° medial, 270° posterior)
  const FACES = { A: 0, M: -SX * Math.PI / 2, P: Math.PI, L: SX * Math.PI / 2 };
  const bFaces = Object.keys(FACES).map((k) => [k, $('f' + k)]).filter(([, el]) => el);
  function soltaFace() { if (camP.azAlvo === null && !bFaces.some(([, el]) => el.getAttribute('aria-pressed') === 'true')) return; camP.azAlvo = null; bFaces.forEach(([, el]) => el.setAttribute('aria-pressed', 'false')); }
  bFaces.forEach(([k, el]) => ouvir(el, 'click', () => {
    if (st.nivel !== 'perna' || st.trocando) return;
    camP.azAlvo = FACES[k]; camP.polAlvo = Math.PI / 2; camP.alvo.x = CENTRO.x; camP.alvo.z = CENTRO.z; alvoMarca.visible = false;
    bFaces.forEach(([k2, el2]) => el2.setAttribute('aria-pressed', String(k2 === k)));
  }));
  if (peleR) ouvir(peleR, 'input', () => { st.pele = clamp(Number(peleR.value) / 100, 0, 1); });
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
  [0, 1, 2, 3, 4].forEach((i) => ouvir($('l' + i), 'click', () => { const r = ROT_P[i]; if (!r || r.v < 0 || st.nivel !== 'perna' || st.trocando) return; st.sel = r.v; camP.alvo.copy(r.p); alvoMarca.visible = true; if ((ARTERIAL || BRACO) && typeof opcoes.aoSelecionar === 'function') { camP.dist = Math.min(camP.dist, 3.4); if (TUBOS[r.v]) opcoes.aoSelecionar({ ...chaveParaPainel(TUBOS[r.v].chave) }); return; } camP.dist = 2.6; setTimeout(() => { if (vivo) irPara('veia'); }, 620); }));

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
    if (naPerna && alvoMarca.visible && !st.nomes && tb) { const tx = tb.nome + ' · ' + (tb.rotulo || ROTULO[tb.estado]); if (ls.textContent !== tx) { ls.textContent = tx; ls.dataset.ruim = tb.estado === 'ruim' || tb.estado === 'esten' || tb.estado === 'ocl' || (BRACO && tb.estado !== 'ok') ? '1' : '0'; } prj.copy(camP.alvo).project(camP3); const lw = ls.offsetWidth || 170, lx = clamp((prj.x * 0.5 + 0.5) * W, lw / 2 + 8, W - lw / 2 - 38), ly = Math.max(24, (-prj.y * 0.5 + 0.5) * Hh - 34); ls.style.opacity = '1'; ls.style.transform = 'translate(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px) translate(-50%,-50%)'; }
    else ls.style.opacity = '0';
    lado.set(1, 0, 0).applyQuaternion(camV3.quaternion);
    for (const [el, y, sgn, rr] of ROT_V) { if (junc.on && el === ROT_V[0][0]) { prj.copy(J_ROT).project(camV3); poe(el, prj, naVeia && dentroF < 0.35 ? 1 : 0, '-50%'); continue; } const afasta = (ARTERIAL ? Math.min(rr || 1, 1.5) : 1 + 0.32 * st.dil) * 1.3 + 0.9; prj.set(lado.x * afasta * sgn, y, lado.z * afasta * sgn).project(camV3); poe(el, prj, naVeia && dentroF < 0.35 ? 1 : 0, '-50%'); }
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
    } else if (ARTERIAL) { k = artInfo.nome + (st.nivel === 'dentro' ? ' · por dentro' : st.externa ? ' · por fora' : ' · em corte'); t = artInfo.t; tom = artInfo.tom;
    } else if (BRACO) {
      const e = estSel(), tb = TUBOS[st.sel]; k = (tb ? tb.nome : 'Veia') + ' · ' + (tb && tb.rotulo ? tb.rotulo : ROTULO[e]);
      if (e === 'trombo') { tom = 'refluxo'; t = 'Trombose oclusiva · <b>sem fluxo</b>'; }
      else if (e === 'parcial') { tom = 'refluxo'; t = 'Trombo parcial · o sangue passa ao redor'; }
      else if (e === 'recan') t = 'Recanalização parcial · fluxo reduzido';
      else if (e === 'ausente') t = 'Veia ausente';
      else t = tb && tb.chave && tb.chave.key === 'Veia Subclávia' ? 'Sangue segue para o coração · sem válvulas' : sist ? 'Sangue segue para o coração' : 'Fluxo venoso normal';
    } else {
      const e = estSel(); k = (TUBOS[st.sel] ? TUBOS[st.sel].nome : 'Veia') + ' · ' + ROTULO[e];
      const sf = junc.jsf ? 'safena magna' : 'safena parva', pr = junc.jsf ? 'femoral comum' : 'poplítea';
      if (junc.on && e !== 'trombo') { if (sist) t = 'Sangue da ' + sf + ' entra na ' + pr + ' · válvula terminal aberta'; else if (e !== 'ruim') t = 'Válvula terminal fecha · sem refluxo para a safena'; else { tom = 'refluxo'; t = 'Válvula terminal não fecha · <b>sangue da ' + pr + ' volta para a ' + sf + '</b>'; } }
      else if (e === 'trombo') { tom = 'refluxo'; t = 'Não compressível · sem fluxo'; }
      else if (sist) t = e === 'recan' ? 'Fluxo reduzido · recanalização parcial' : 'Sangue sobe · válvulas abertas';
      else if (e !== 'ruim') t = 'Válvulas fecham · sem refluxo'; else { tom = 'refluxo'; t = 'Válvulas não fecham · <b>sangue volta</b>'; }
    }
    const chave = k + t; if (chave !== ultimaFase) { ultimaFase = chave; faseK.textContent = k; faseT.innerHTML = t; fase.dataset.tom = tom; fase.dataset.compacto = st.nivel === 'perna' ? '1' : '0'; }
    if (ARTERIAL) { atualizaAmostra(); return; }
    const naPerna = st.nivel === 'perna', n = naPerna ? resumo : 'Doppler (esquemático)', e = estSel(), rr = naPerna ? '' : e === 'ruim' ? 'refluxo' : e === 'trombo' ? 'sem fluxo' : 'sem refluxo';
    if (dopN.textContent !== n) dopN.textContent = n; if (dopR.textContent !== rr) { dopR.textContent = rr; dopR.style.color = (e === 'ruim' || e === 'trombo') ? 'var(--refluxo)' : ''; }
  }
  const dop = $('dop'), dctx = dop.getContext('2d');
  if (ARTERIAL) $('dopBox').dataset.arterial = '1';
  if (ARTERIAL && raiz.clientWidth < 520 && $('fase')) $('fase').dataset.recolhida = '1'; // celular: o quadro do topo começa numa linha
  // toque na caixa do topo ou na do Doppler: recolhe / abre (para ver melhor o vaso)
  for (const id of ['fase', 'dopBox']) { const el = $(id); if (el) ouvir(el, 'click', () => { el.dataset.recolhida = el.dataset.recolhida === '1' ? '0' : '1'; if (id === 'dopBox') ajusta(); }); }
  function desenhaDoppler() {
    if (st.nivel === 'perna' || $('dopBox').hidden) return;
    if (ARTERIAL) { desenhaDopplerArt(); return; }
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
  // a barra Superficial/Profundo fica sempre acima da legenda (que pode quebrar em 2 linhas)
  const legEl = $('leg'), peleEl = $('pele');
  const sobePele = () => { if (legEl && peleEl && legEl.offsetHeight) peleEl.style.bottom = (legEl.offsetHeight + 20) + 'px'; };
  const roLeg = window.ResizeObserver && legEl ? new ResizeObserver(sobePele) : null;
  if (roLeg) roLeg.observe(legEl);

  // o botão 3D: gera a perna a partir do que está no mapa
  const tGerar = setTimeout(() => {
    st.trocando = true; veu.textContent = 'Gerando 3D'; veu.style.opacity = '1';
    tGerar2 = setTimeout(() => {
      if (!vivo) return;
      geraPerna(); st.pronto = true; st.nivel = 'perna'; alvoMarca.visible = false; ajusta();
      camP.az = BRACO ? 0.25 * SX : -0.6; camP.pol = 1.5; camP.alvo.copy(CENTRO); camP.dist = (W / Hh < 0.85) ? 12.4 : 12.2;
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
      const fc = (st.t % 0.9) / 0.9, vArt = 0.25 + 1.6 * Math.exp(-Math.pow((fc - 0.12) / 0.08, 2)); // pulso arterial (sístole rápida)
      for (const tb of TUBOS) {
        const v = ARTERIAL ? (tb.estado === 'ocl' ? 0 : vArt * RAPIDEZ_ART * (tb.estado === 'hipo' ? VEL_ART['Hipocinético'] : tb.estado === 'hiper' ? VEL_ART['Hipercinético'] : tb.estado === 'esten' ? 2 : 1)) : tb.estado === 'ruim' ? vRuim : tb.estado === 'trombo' || tb.estado === 'ausente' ? 0 : tb.estado === 'recan' || tb.estado === 'parcial' ? vOk * 0.45 : vOk;
        if (tb.tex) tb.tex.offset.x -= v * (tb.sentido || 1) * dtA * 4.2;
        if (!ARTERIAL && st.doppler && tb.estado !== 'trombo' && tb.estado !== 'ausente') { corTmp.copy(v < -0.02 ? COR3.ruim : COR3.ok); tb.mat.color.lerp(corTmp, 0.18); }
        else tb.mat.color.lerp(tb.corFixa || COR3[tb.estado], 0.18);
        tb.mat.emissive.copy(tb.mat.color).multiplyScalar(tb.estado === 'ruim' ? 0.3 + 0.55 * Math.max(0, -v) : 0.3);
      }
      posiciona(true);
      if (alvoMarca.visible) { alvoMarca.position.copy(camP.alvo); alvoMarca.quaternion.copy(camP3.quaternion); alvoMarca.scale.setScalar((1 + 0.12 * Math.sin(agora * 0.006)) * clamp(camP.dist / 6, 0.35, 1.4)); }
      renderer.setClearColor(0x0d141f); sobPele(); camadas(); renderer.render(cenaP, camP3);
    } else if (ARTERIAL) {
      atualizaCelulasArt(dtA);
      corAlvo.setHex(0xc8101c); mCel.color.lerp(corAlvo, 0.2);
      posiciona(true);
      const pc = perfilArt(camV3.position.y);
      dentroF = 1 - ss(1.1, 3.2, Math.hypot(camV3.position.x - pc.cx, camV3.position.z - pc.cz));
      corFundo.copy(corFora).lerp(corDentro, dentroF);
      renderer.setClearColor(corFundo); cenaV.fog.color.copy(corFundo); cenaV.fog.density = lerp(0.012, 0.085, dentroF);
      const ext = st.externa && st.nivel === 'veia'; paredeExt.visible = ext; vidroA.visible = !ext;
      mVidro.opacity = 1 - dentroF; mPlacaFora.opacity = 1 - dentroF; tampao.material.opacity = 0.92 * (1 - dentroF); tampao.visible = temTampao && dentroF < 0.98 && !ext;
      renderer.render(cenaV, camV3);
    } else {
      const alvoDil = alvoDilVeia(), e = estSel();
      if (Math.abs(alvoDil - st.dil) > 0.0005) { st.dil += (alvoDil - st.dil) * (1 - Math.exp(-dt * 3.2)); if (Math.abs(alvoDil - st.dil) < 0.002) st.dil = alvoDil; atualizaParede(); }
      st.v = velocidade(st.tc, e === 'ruim' ? st.dil : 0) * fatorFluxo();
      const alvoO = e === 'trombo' ? 0.25 : (st.tc < SISTOLE - 0.05 ? 1 : 0); st.o += (alvoO - st.o) * (1 - Math.exp(-dtA * (alvoO ? 14 : 11)));
      for (const f of folhetos) if (f.m.visible) atualizaFolheto(f);
      atualizaCelulas(dtA);
      if (junc.on) { const rf = 1.02 * (1 + 0.32 * st.dil); for (let i = 0; i < 8; i++) furo[i].constant = -rf; atualizaCelulasJunc(dtA); mCel2.color.lerp(st.doppler ? corSobe : corSangue, 0.2); mProfV.opacity = 0.07 * (1 - dentroF); }
      if (e === 'trombo') corAlvo.setHex(0x4a0d14); else if (st.doppler) corAlvo.copy(st.v < -0.02 ? corVolta : corSobe); else corAlvo.copy(corSangue);
      mCel.color.lerp(corAlvo, 0.2);
      if (BRACO) { coagulo.visible = e === 'parcial' || e === 'trombo'; if (e === 'parcial') { coagulo.scale.set(0.5, 4.2, 0.72); coagulo.position.set(0.5, 0, 0); } else { coagulo.scale.set(1.02, 6.5, 1.02); coagulo.position.set(0, 0, 0); } }
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

  // refaz as veias com o exame novo (achado alterado ou traço novo) sem mexer na câmera
  function atualizar(novo) {
    ex = novo;
    if (!st.pronto) return;
    const sel = TUBOS[st.sel] && TUBOS[st.sel].chave ? JSON.stringify(TUBOS[st.sel].chave) : null, marcaVis = alvoMarca.visible;
    geraPerna();
    if (sel) { const i = TUBOS.findIndex((t) => t.chave && JSON.stringify(t.chave) === sel && (t.estado !== 'ok' || !TUBOS.some((q) => q !== t && q.chave && JSON.stringify(q.chave) === sel && q.estado !== 'ok'))); if (i >= 0) st.sel = i; }
    alvoMarca.visible = marcaVis;
    if (st.nivel !== 'perna') { st.dil = alvoDilVeia(); ajustaValvulas(); atualizaParede(); montaArteria(); }
  }
  function poeCaneta(tipo) {
    caneta = tipo || null; fimRisco(false);
    if ($('pele')) $('pele').style.visibility = caneta ? 'hidden' : ''; // desenhando: o controle não cobre o pé
    canvas.style.cursor = caneta === 'borracha' ? 'pointer' : caneta ? 'crosshair' : '';
    if (caneta && st.nivel !== 'perna') irPara('perna');
    dica.textContent = caneta ? (caneta === 'borracha' ? 'Toque num traço para apagar. Dois dedos (ou botão direito) giram a perna.' : 'Desenhe direto na pele da perna. Dois dedos (ou botão direito) giram; a roda ou a pinça dão zoom.') : DICAS[st.nivel];
  }
  function parar() {
    vivo = false; cancelAnimationFrame(rafId); clearTimeout(tGerar); clearTimeout(tGerar2);
    for (const [el, tipo, fn, op] of ouvintes) el.removeEventListener(tipo, fn, op);
    if (cheia) poeCheia(false);
    if (ro) ro.disconnect(); else window.removeEventListener('resize', aoRedimensionar);
    if (roLeg) roLeg.disconnect();
    for (const cena of [cenaP, cenaV]) cena.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
    });
    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
  }
  parar.atualizar = atualizar;
  parar.caneta = poeCaneta;
  return parar;
}
