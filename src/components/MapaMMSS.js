import React, { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { svgParaImagemDataUrl } from "../utils/svgParaImagem";
import { catmullRom } from "../utils/vascularMapping";
import { criarCurva, pontoEm, fita, linha, faixaDoTerco } from "../utils/curvas";
import { arteriasDoLado } from "../utils/mmssArterialLaudo";
import { VEIAS, VEIAS_CENTRAIS } from "../utils/mmssVenosoLaudo";
import { CamposArteria, CamposManobras, CamposFAV } from "./CamposArteria";
import { CamposVeia, CamposCateter, CamposFAVVenoso } from "./CamposVeiaMMSS";
import { COR_ARTERIA, ITENS_LEGENDA_ARTERIAL } from "./MapaInterativoArterial";
import MapaLayout, { PreviewImagemPdf } from "./MapaLayout";

// Membro superior, vista anterior (palma para a frente), com pescoço e
// parte do tórax para mostrar jugular, subclávia e tronco braquiocefálico.
// Desenhado nativamente para o braço DIREITO (lateral = esquerda da tela,
// medial/linha média = direita). O braço esquerdo é o mesmo desenho espelhado.

export const BRACO_W = 300;
export const BRACO_H = 660;

// As coordenadas abaixo foram traçadas num quadro de 0–300; X() as comprime um
// pouco para a direita, abrindo uma margem do lado lateral para os rótulos.
const X = (x) => 28 + x * (272 / 300);
const P = (pts) => pts.map(([x, y]) => [X(x), y]);

const CONTORNO = [
  [206, 0], [208, 30], [201, 52], [170, 63], [122, 71], [84, 79], [60, 92], [45, 116], [40, 146], [41, 190],
  [44, 240], [47, 292], [47, 330], [45, 362], [44, 405], [46, 455], [51, 505], [56, 546], [58, 566], [50, 580],
  [40, 594], [36, 610], [42, 622], [55, 617], [62, 608], [64, 632], [72, 652], [92, 658], [114, 653], [124, 634],
  [128, 606], [126, 580], [121, 566], [124, 546], [131, 492], [136, 432], [139, 380], [141, 345], [143, 300], [144, 250],
  [144, 200], [145, 166], [149, 150], [153, 190], [157, 240], [162, 270], [200, 276], [300, 280],
];
export const SILHUETA_BRACO = catmullRom(P(CONTORNO), false) + " L 300,0 Z";
const CLAVICULA = catmullRom(P([[214, 78], [170, 76], [130, 80], [92, 90]]), false);

// ---------- Artérias ----------
const ART = {
  "Tronco Braquiocefálico": { pts: [[276, 176], [270, 150], [262, 128]], half: [5, 4.8, 4.6], rotulo: ["Tronco BC", 200, 200] },
  "Artéria Subclávia": { pts: [[262, 128], [238, 113], [200, 102], [162, 101], [138, 110]], half: [4.4, 4.2, 4, 3.9, 3.8], rotulo: ["Subclávia", 118, 40] },
  "Artéria Axilar": { pts: [[138, 110], [121, 126], [111, 150], [107, 182]], half: [3.8, 3.7, 3.6, 3.5], rotulo: ["Axilar", 182, 230] },
  "Artéria Braquial": { pts: [[107, 182], [108, 232], [108, 282], [102, 325], [95, 350]], half: [3.4, 3.3, 3.2, 3.1, 3], rotulo: ["Braquial", 182, 290] },
  "Artéria Radial": { pts: [[95, 350], [84, 380], [77, 430], [73, 490], [73, 545], [76, 566]], half: [2.7, 2.6, 2.6, 2.5, 2.4, 2.3], rotulo: ["Radial", 4, 470] },
  "Artéria Ulnar": { pts: [[95, 350], [105, 378], [111, 430], [113, 490], [111, 545], [108, 566]], half: [2.7, 2.6, 2.6, 2.5, 2.4, 2.3], rotulo: ["Ulnar", 182, 470] },
};
// No lado esquerdo não há tronco braquiocefálico: a subclávia nasce do arco aórtico.
const SUBCLAVIA_ESQUERDA = { ...ART["Artéria Subclávia"], pts: [[274, 176], [266, 146], [244, 118], [200, 102], [162, 101], [138, 110]], half: [4.6, 4.5, 4.2, 4, 3.9, 3.8] };

function geometriaArteria(nome, lado) {
  if (lado === "Esquerdo" && nome === "Artéria Subclávia") return SUBCLAVIA_ESQUERDA;
  return ART[nome];
}

const CURVAS_CACHE = new Map();
function curva(chave, g) {
  if (!CURVAS_CACHE.has(chave)) CURVAS_CACHE.set(chave, criarCurva(P(g.pts), g.half));
  return CURVAS_CACHE.get(chave);
}

const ESTILO_PLACA = {
  "Lipídica": { fill: "#ffffff", stroke: "#ffffff" },
  "Calcificada": { fill: "#9aa5b1", stroke: "#6b7684" },
  "Mista": { fill: "#ffffff", stroke: "#6b7684" },
};
const LETRA_ONDA = { "Bifásico": "B", "Monofásico": "M", "Amortecido (tardus-parvus)": "A" };

function corArteria(v) {
  if (v.velocidade === "Hipercinético") return COR_ARTERIA.hipercinetico;
  if (v.velocidade === "Hipocinético") return COR_ARTERIA.hipocinetico;
  return COR_ARTERIA.normal;
}

const tangente = (p) => [p.ny, -p.nx];

function pontosAteromatose(c, grau) {
  const cfg = grau === "Severa" ? { passo: 6, toward: 0.42, op: 0.85 }
    : grau === "Moderada" ? { passo: 9, toward: 0.3, op: 0.7 }
    : grau === "Discreta" ? { passo: 14, toward: 0.15, op: 0.55 }
    : null;
  if (!cfg) return [];
  const pts = [];
  for (let s = cfg.passo / 2; s < c.comprimento; s += cfg.passo) {
    const p = pontoEm(c, s / c.comprimento);
    const off = p.hw * 0.92 * (1 - cfg.toward);
    pts.push([p.x + p.nx * off, p.y + p.ny * off, cfg.op], [p.x - p.nx * off, p.y - p.ny * off, cfg.op]);
  }
  return pts;
}

// Triângulos de estenose: base na parede, ápices se aproximando pelo grau.
function triangulosEstenose(c, v) {
  const [ta, tb] = faixaDoTerco(v.localizacaoPlaca || "Terço médio");
  const p = pontoEm(c, (ta + tb) / 2);
  const pct = parseFloat(v.estenosePercentual);
  const toward = !(pct >= 50) ? 0.15 : pct <= 70 ? 0.48 : 0.78;
  const base = p.hw * 0.92, apex = p.hw * 0.92 * (1 - toward);
  const span = Math.max(p.hw * 1.6, 4);
  const [tx, ty] = tangente(p);
  return [1, -1].map((sgn) => {
    const bx = p.x + p.nx * base * sgn, by = p.y + p.ny * base * sgn;
    return `M ${bx - tx * span},${by - ty * span} L ${p.x + p.nx * apex * sgn},${p.y + p.ny * apex * sgn} L ${bx + tx * span},${by + ty * span} Z`;
  });
}

function Rotulos({ itens, mirrored, selecionada, onSelecionar }) {
  const mx = (x) => (mirrored ? BRACO_W - x : x);
  return itens.map(({ chave, txt, lx, ly, alvo }) => {
    const ativo = selecionada === chave;
    const fonte = lx < 60 ? 9 : 10; // margem lateral é estreita
    const w = txt.length * fonte * 0.6;
    const xLinha = alvo[0] > lx ? lx + w + 3 : lx - 3;
    return (
      <g key={chave} style={onSelecionar ? { cursor: "pointer" } : undefined} onClick={onSelecionar ? () => onSelecionar(chave) : undefined}>
        <line x1={mx(alvo[0])} y1={alvo[1]} x2={mx(xLinha)} y2={ly} stroke="#9aa5b1" strokeWidth={0.8} />
        <text x={mx(lx)} y={ly + 3} fontFamily="monospace" fontSize={fonte} fontWeight={ativo ? "bold" : "normal"}
          fill={ativo ? "#0b8ca0" : "#1a2530"} textAnchor={mirrored ? "end" : "start"}>{txt}</text>
      </g>
    );
  });
}

function Moldura({ mirrored, children, rodape }) {
  const mx = (x) => (mirrored ? BRACO_W - x : x);
  return (
    <>
      <g transform={mirrored ? `translate(${BRACO_W},0) scale(-1,1)` : undefined}>
        <path d={SILHUETA_BRACO} fill="#f3d9bb" stroke="#a97a4e" strokeWidth={1.5} />
        {/* clavícula (referência) */}
        <path d={CLAVICULA} fill="none" stroke="#c9a27a" strokeWidth={2.2} strokeLinecap="round" opacity={0.7} />
        {children}
      </g>
      <text x={mx(12)} y={14} fontFamily="sans-serif" fontSize="9" fill="#5c6b78" textAnchor={mirrored ? "end" : "start"}>lateral</text>
      <text x={mx(292)} y={14} fontFamily="sans-serif" fontSize="9" fill="#5c6b78" textAnchor={mirrored ? "start" : "end"}>medial</text>
      <text x={mx(232)} y={BRACO_H - 8} fontFamily="monospace" fontSize="13" textAnchor="middle" fill="#5c6b78">{rodape}</text>
    </>
  );
}

function rotuloArteria(nome, lado) {
  const g = geometriaArteria(nome, lado);
  const [txt, lx, ly] = g.rotulo;
  const c = curva(`a:${lado}:${nome}`, g);
  // ponto do vaso mais perto da altura do rótulo (ou o meio, se for horizontal)
  let melhor = pontoEm(c, 0.5);
  if (nome !== "Artéria Subclávia" && nome !== "Tronco Braquiocefálico") {
    melhor = c.amostras.reduce((acc, a) => (Math.abs(a.y - ly) < Math.abs(acc.y - ly) ? a : acc));
  }
  return { chave: nome, txt, lx, ly, alvo: [melhor.x, melhor.y] };
}

// Artérias do membro superior. Com onSelecionar é clicável; sem, é o desenho
// estático do PDF — o mesmo desenho nos dois.
export function DesenhoMMSSArterial({ lado, arterias, onSelecionar, selecionada, width = "100%", height, style }) {
  const mirrored = lado === "Esquerdo";
  const sufixo = mirrored ? "e" : "d";
  const a = arterias || {};
  const nomes = arteriasDoLado(lado);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${BRACO_W} ${BRACO_H}`} width={width} height={height} style={style}>
      <defs>
        {[["pervio", "#2b2f33"], ["reestenose", "#d99a3d"], ["ocluido", "#ffffff"]].map(([id, cor]) => (
          <pattern key={id} id={`mmss-stent-${id}-${sufixo}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke={cor} strokeWidth="0.8" />
            <line x1="0" y1="0" x2="3" y2="0" stroke={cor} strokeWidth="0.8" />
          </pattern>
        ))}
      </defs>
      <Moldura mirrored={mirrored} rodape="Visão anterior">
        {/* arco aórtico, carótida comum e arco palmar: só referência, não editáveis */}
        <path d={fita(criarCurva(P([[300, 214], [288, 196], [276, 182]]), 6))} fill="#e8b4ae" />
        <path d={fita(criarCurva(P(mirrored ? [[272, 176], [262, 120], [252, 60], [248, 0]] : [[262, 128], [256, 70], [250, 0]]), 3.6))} fill="#e8b4ae" />
        <path d={linha(criarCurva(P([[76, 566], [80, 596], [92, 606], [104, 596], [108, 566]]), 1))} fill="none" stroke="#e8b4ae" strokeWidth={2} />
        {nomes.map((nome) => {
          const g = geometriaArteria(nome, lado);
          const v = a[nome];
          if (!g || !v) return null;
          const c = curva(`a:${lado}:${nome}`, g);
          const ocluida = v.status === "Ocluída";
          const ativo = selecionada === nome;
          const meio = pontoEm(c, 0.5);
          const badge = pontoEm(c, 0.72);
          return (
            <g key={nome}>
              {v.aneurisma && <circle cx={meio.x} cy={meio.y} r={meio.hw * 2.6} fill={ocluida ? COR_ARTERIA.ocluida : corArteria(v)} stroke="#7b241c" strokeWidth={0.8} />}
              {ativo && <path d={linha(c)} fill="none" stroke="#0eb8d0" strokeOpacity={0.55} strokeWidth={Math.max(...g.half) * 2 + 6} strokeLinecap="round" />}
              <path d={fita(c)} fill={ocluida ? COR_ARTERIA.normal : corArteria(v)} />
              {ocluida && (() => { const [ta, tb] = faixaDoTerco(v.localizacaoOclusao); return <path d={fita(c, ta, tb)} fill={COR_ARTERIA.ocluida} />; })()}
              {v.stent && v.stent !== "Ausente" && (
                <>
                  {v.stent === "Ocluído" && <path d={fita(c, 0.3, 0.7)} fill={COR_ARTERIA.ocluida} />}
                  <path d={fita(c, 0.3, 0.7)} fill={`url(#mmss-stent-${v.stent === "Pérvio" ? "pervio" : v.stent === "Ocluído" ? "ocluido" : "reestenose"}-${sufixo})`} stroke="#2b2f33" strokeWidth={0.4} />
                </>
              )}
              {v.disseccao && <path d={linha(c, 0.3, 0.7, 0.6)} fill="none" stroke="#ffffff" strokeWidth={0.9} />}
              {pontosAteromatose(c, v.ateromatose).map(([x, y, op], i) => <circle key={i} cx={x} cy={y} r={0.9} fill="#ffffff" opacity={op} />)}
              {!ocluida && v.placa === "Presente" && triangulosEstenose(c, v).map((d, i) => {
                const st = ESTILO_PLACA[v.caracteristicaPlaca] || { fill: "#ffffff", stroke: "#9aa5b1" };
                return <path key={i} d={d} fill={st.fill} stroke={st.stroke} strokeWidth={0.8} />;
              })}
              {!ocluida && LETRA_ONDA[v.tipoOnda] && (
                <g>
                  <circle cx={badge.x} cy={badge.y} r={5.2} fill="#ffffff" stroke="#2b2f33" strokeWidth={0.8} />
                  <text x={badge.x} y={badge.y + 2.6} fontFamily="monospace" fontSize="7" fontWeight="bold" fill="#2b2f33" textAnchor="middle"
                    transform={mirrored ? `translate(${2 * badge.x},0) scale(-1,1)` : undefined}>{LETRA_ONDA[v.tipoOnda]}</text>
                </g>
              )}
              {onSelecionar && <path d={linha(c)} fill="none" stroke="#000" strokeOpacity={0.001} strokeWidth={14} strokeLinecap="round" style={{ cursor: "pointer" }} onClick={() => onSelecionar(nome)} />}
            </g>
          );
        })}
      </Moldura>
      <Rotulos itens={nomes.map((n) => rotuloArteria(n, lado))} mirrored={mirrored} selecionada={selecionada} onSelecionar={onSelecionar} />
    </svg>
  );
}

// ---------- Veias ----------
// Veias pareadas (braquiais, radiais, ulnares) têm duas curvas.
const VEI = {
  "Veia Jugular Interna": { curvas: [[[240, 0], [238, 40], [234, 82], [226, 116]]], half: 4.6, rotulo: ["V. jugular int.", 118, 22] },
  "Veia Subclávia": { curvas: [[[226, 118], [196, 113], [164, 116], [140, 124]]], half: 4.4, rotulo: ["V. subclávia", 118, 46] },
  "Veia Axilar": { curvas: [[[140, 124], [126, 140], [119, 162], [116, 186]]], half: 4, rotulo: ["V. axilar", 182, 200] },
  "Veias Braquiais": { curvas: [
    [[101, 188], [101, 232], [101, 282], [95, 322], [89, 346]],
    [[115, 190], [115, 232], [115, 282], [109, 326], [102, 352]],
  ], half: 1.9, rotulo: ["Vv. braquiais", 182, 262] },
  "Veias Radiais": { curvas: [
    [[88, 362], [79, 392], [72, 440], [68, 495], [69, 548]],
    [[96, 368], [86, 396], [81, 442], [78, 495], [78, 548]],
  ], half: 1.5, rotulo: ["Vv. radiais", 2, 512] },
  "Veias Ulnares": { curvas: [
    [[99, 364], [107, 392], [114, 440], [117, 495], [116, 548]],
    [[93, 370], [101, 396], [107, 442], [109, 495], [108, 548]],
  ], half: 1.5, rotulo: ["Vv. ulnares", 182, 500] },
  "Veia Cefálica (braço)": { curvas: [[[58, 342], [54, 290], [52, 232], [55, 174], [70, 128], [104, 112], [140, 124]]], half: 2.6, rotulo: ["V. cefálica", 2, 196] },
  "Veia Cefálica (antebraço)": { curvas: [[[64, 560], [59, 500], [55, 440], [55, 384], [58, 342]]], half: 2.4, rotulo: ["V. cefálica", 2, 430] },
  "Veia Basílica (braço)": { curvas: [[[128, 340], [130, 296], [128, 252], [122, 216], [116, 188]]], half: 2.6, rotulo: ["V. basílica", 182, 300] },
  "Veia Basílica (antebraço)": { curvas: [[[114, 562], [122, 500], [127, 440], [129, 384], [128, 340]]], half: 2.4, rotulo: ["V. basílica", 182, 430] },
  "Veia Cubital Mediana": { curvas: [[[57, 372], [80, 362], [104, 350], [127, 338]]], half: 2.2, rotulo: ["V. cubital med.", 182, 352] },
};

export const COR_VEIA = {
  "Pérvia": "#1f6fb2",
  "Trombose oclusiva": "#2b2f33",
  "Trombose parcial (não oclusiva)": "#1f6fb2",
  "Recanalização parcial": "#d99a3d",
  "Ausente": "#aab4bc",
};

function curvasVeia(nome) {
  const g = VEI[nome];
  return g.curvas.map((pts, i) => curva(`v:${nome}:${i}`, { pts, half: g.half }));
}

function rotuloVeia(nome) {
  const [txt, lx, ly] = VEI[nome].rotulo;
  const c = curvasVeia(nome)[0];
  const horizontal = nome === "Veia Subclávia" || nome === "Veia Jugular Interna" || nome === "Veia Cubital Mediana";
  const alvo = horizontal ? pontoEm(c, 0.5) : c.amostras.reduce((acc, a) => (Math.abs(a.y - ly) < Math.abs(acc.y - ly) ? a : acc));
  return { chave: nome, txt, lx, ly, alvo: [alvo.x, alvo.y] };
}

export function DesenhoMMSSVenoso({ lado, veias, extra, onSelecionar, selecionada, width = "100%", height, style }) {
  const mirrored = lado === "Esquerdo";
  const v = veias || {};
  const cateterVeia = extra?.cateter?.presente ? extra.cateter.veia : null;
  // profundas por baixo, superficiais por cima (como no membro)
  const ordem = [...VEIAS].sort((x, y) => (x.startsWith("Veia Cef") || x.startsWith("Veia Bas") || x.startsWith("Veia Cub") ? 1 : 0)
    - (y.startsWith("Veia Cef") || y.startsWith("Veia Bas") || y.startsWith("Veia Cub") ? 1 : 0));
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${BRACO_W} ${BRACO_H}`} width={width} height={height} style={style}>
      <Moldura mirrored={mirrored} rodape="Visão anterior">
        {/* tronco venoso braquiocefálico: só referência */}
        <path d={fita(criarCurva(P([[226, 118], [248, 140], [264, 176], [272, 230]]), 4.8))} fill="#a9c6e2" />
        {ordem.map((nome) => {
          const est = v[nome];
          if (!VEI[nome] || !est) return null;
          const ativo = selecionada === nome;
          const cs = curvasVeia(nome);
          const cor = COR_VEIA[est.status] || COR_VEIA["Pérvia"];
          const continuo = VEIAS_CENTRAIS.includes(nome) && est.status === "Pérvia" && est.fluxo === "Contínuo (não fásico)";
          return (
            <g key={nome}>
              {cs.map((c, i) => (
                <g key={i}>
                  {ativo && <path d={linha(c)} fill="none" stroke="#0eb8d0" strokeOpacity={0.55} strokeWidth={VEI[nome].half * 2 + 6} strokeLinecap="round" />}
                  {est.status === "Ausente" ? (
                    <path d={fita(c)} fill="none" stroke={cor} strokeWidth={0.9} strokeDasharray="3 2" />
                  ) : (
                    <path d={fita(c)} fill={cor} />
                  )}
                  {est.status === "Trombose parcial (não oclusiva)" && <path d={fita(c, 0.15, 0.85, 0.5)} fill={COR_VEIA["Trombose oclusiva"]} />}
                  {cateterVeia === nome && <path d={linha(c, 0, 1, 0)} fill="none" stroke="#f1c40f" strokeWidth={1.2} strokeDasharray="4 2" />}
                  {onSelecionar && <path d={linha(c)} fill="none" stroke="#000" strokeOpacity={0.001} strokeWidth={Math.max(12, VEI[nome].half * 2 + 6)} strokeLinecap="round" style={{ cursor: "pointer" }} onClick={() => onSelecionar(nome)} />}
                </g>
              ))}
              {continuo && (() => {
                const p = pontoEm(cs[0], 0.5);
                return (
                  <g>
                    <circle cx={p.x} cy={p.y} r={5.4} fill="#ffffff" stroke="#2b2f33" strokeWidth={0.8} />
                    <text x={p.x} y={p.y + 2.6} fontFamily="monospace" fontSize="7" fontWeight="bold" fill="#2b2f33" textAnchor="middle"
                      transform={mirrored ? `translate(${2 * p.x},0) scale(-1,1)` : undefined}>C</text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </Moldura>
      <Rotulos itens={VEIAS.filter((n) => VEI[n]).map(rotuloVeia)} mirrored={mirrored} selecionada={selecionada} onSelecionar={onSelecionar} />
    </svg>
  );
}

// ---------- Legendas ----------
export function LegendaMMSSArterial() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", justifyContent: "center", fontSize: 11, color: "#5c6b78" }}>
      {ITENS_LEGENDA_ARTERIAL.map(([t, c]) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 14, height: 6, background: c, borderRadius: 3, display: "inline-block" }} /> {t}
        </span>
      ))}
      <span>pontos brancos = ateromatose</span>
      <span>triângulos = estenose</span>
      <span>malha = stent</span>
      <span>B / M / A = onda bifásica / monofásica / amortecida</span>
    </div>
  );
}

export const ITENS_LEGENDA_VENOSO_MMSS = [
  ["Pérvia", COR_VEIA["Pérvia"]],
  ["Trombose", COR_VEIA["Trombose oclusiva"]],
  ["Recanalização parcial", COR_VEIA["Recanalização parcial"]],
  ["Ausente", COR_VEIA["Ausente"]],
];

export function LegendaMMSSVenoso() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", justifyContent: "center", fontSize: 11, color: "#5c6b78" }}>
      {ITENS_LEGENDA_VENOSO_MMSS.map(([t, c]) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 14, height: 6, background: c, borderRadius: 3, display: "inline-block" }} /> {t}
        </span>
      ))}
      <span>núcleo escuro = trombose parcial</span>
      <span>C = fluxo contínuo (não fásico)</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 14, height: 0, borderTop: "2px dashed #f1c40f", display: "inline-block" }} /> cateter
      </span>
    </div>
  );
}

// ---------- PDF ----------
function hexParaRgb(hex) {
  const m = hex.replace("#", "");
  return { r: parseInt(m.substring(0, 2), 16), g: parseInt(m.substring(2, 4), 16), b: parseInt(m.substring(4, 6), 16) };
}

async function adicionarPaginasAoPdf(doc, lados, titulo, desenhar, itensLegenda, notas) {
  const pageWidth = doc.internal.pageSize.getWidth();
  for (const ladoAtual of lados) {
    const svg = renderToStaticMarkup(desenhar(ladoAtual));
    const dataUrl = await svgParaImagemDataUrl(svg, BRACO_W, BRACO_H);
    doc.addPage();
    let y = 16;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`${titulo} — Membro Superior ${ladoAtual}`, pageWidth / 2, y, { align: "center" });
    doc.setFont(undefined, "normal");
    y += 6;
    const alturaMm = 215;
    const larguraMm = alturaMm * (BRACO_W / BRACO_H);
    doc.addImage(dataUrl, "JPEG", (pageWidth - larguraMm) / 2, y, larguraMm, alturaMm);
    y += alturaMm + 7;
    doc.setFontSize(8.5);
    const larguraItens = itensLegenda.reduce((acc, [t]) => acc + 6 + doc.getTextWidth(t) + 8, -8);
    let x = (pageWidth - larguraItens) / 2;
    itensLegenda.forEach(([t, cor]) => {
      const rgb = hexParaRgb(cor);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(x, y - 2.6, 4, 2, "F");
      doc.setTextColor(90, 100, 110);
      doc.text(t, x + 6, y);
      x += 6 + doc.getTextWidth(t) + 8;
    });
    doc.setFontSize(7.5);
    notas.forEach((n) => { y += 4.5; doc.text(n, pageWidth / 2, y, { align: "center" }); });
    doc.setTextColor(0, 0, 0);
  }
}

export function adicionarMapaMMSSArterialAoPdf(doc, lados, arteriasPorLado) {
  return adicionarPaginasAoPdf(
    doc, lados, "Mapeamento Arterial",
    (l) => <DesenhoMMSSArterial lado={l} arterias={arteriasPorLado[l]} width={BRACO_W} height={BRACO_H} />,
    ITENS_LEGENDA_ARTERIAL,
    ["Pontos brancos = ateromatose   ·   triângulos = estenose (branco lipídica, cinza calcificada, contorno cinza mista)",
      "Malha = stent   ·   B / M / A = onda bifásica / monofásica / amortecida"],
  );
}

export function adicionarMapaMMSSVenosoAoPdf(doc, lados, veiasPorLado, extras) {
  return adicionarPaginasAoPdf(
    doc, lados, "Mapeamento Venoso",
    (l) => <DesenhoMMSSVenoso lado={l} veias={veiasPorLado[l]} extra={extras?.[l]} width={BRACO_W} height={BRACO_H} />,
    ITENS_LEGENDA_VENOSO_MMSS,
    ["Núcleo escuro = trombose parcial   ·   C = fluxo contínuo (não fásico)   ·   tracejado amarelo = cateter"],
  );
}

// ---------- Mapas Interativos ----------
const estiloLaudo = { background: "#f7f9fa", border: "1px solid #dfe6ec", color: "#222", borderRadius: 8, padding: 10, fontSize: 12, whiteSpace: "pre-wrap", margin: 0, maxHeight: 320, overflowY: "auto" };

function Previa({ titulo, lados, onFechar, desenhar, legenda }) {
  return (
    <PreviewImagemPdf titulo={titulo} onFechar={onFechar}>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {lados.map((ld) => (
          <div key={ld} style={{ flex: "1 1 260px", maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Membro Superior {ld}</div>
            {desenhar(ld)}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>{legenda}</div>
    </PreviewImagemPdf>
  );
}

export function MapaInterativoMMSSArterial({
  aberto, onFechar, lado, ladoAtivo, onTrocarLado,
  arterias, onArteriaChange, extras, onExtraChange, laudoMembro,
  incluirMapaPdf, onIncluirMapaPdf, onSalvarTXT, onSalvarPDF, onSalvarExame,
}) {
  const [selecionada, setSelecionada] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  if (!aberto) return null;
  const l = ladoAtivo;
  const valores = arterias?.[l] || {};
  const extra = extras?.[l];
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : [l];
  return (
    <>
      <MapaLayout
        titulo={`Mapa Interativo — Arterial MMSS (${l})`}
        onFechar={onFechar}
        lado={lado} ladoAtivo={l}
        onTrocarLado={(op) => { onTrocarLado(op); setSelecionada(null); }}
        desenho={<DesenhoMMSSArterial lado={l} arterias={valores} onSelecionar={setSelecionada} selecionada={selecionada} style={{ display: "block", width: "100%", maxWidth: 380, maxHeight: "72vh" }} />}
        legenda={<LegendaMMSSArterial />}
        painel={selecionada && valores[selecionada] ? (
          <CamposArteria arteria={selecionada} lado={l} valores={valores[selecionada]} onChange={(v) => onArteriaChange(l, selecionada, v)} semMoldura />
        ) : null}
        tituloPainel={selecionada ? `${selecionada} (${l})` : ""}
        onFecharPainel={() => setSelecionada(null)}
        placeholderPainel="Toque em uma artéria no desenho para registrar o achado."
        conteudo={
          <>
            {extra && (
              <div className="mapa-claro">
                <CamposManobras lado={l} manobras={extra.manobras} onChange={(m) => onExtraChange(l, { ...extra, manobras: m })} />
                <CamposFAV lado={l} fav={extra.fav} onChange={(f) => onExtraChange(l, { ...extra, fav: f })} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Laudo ({l}) — atualizado em tempo real:</div>
              <pre style={estiloLaudo}>{laudoMembro}</pre>
            </div>
          </>
        }
        incluirPdf={incluirMapaPdf} onIncluirPdf={onIncluirMapaPdf}
        onVisualizarImagem={() => setMostrarPreview(true)}
        onSalvarTXT={onSalvarTXT} onSalvarPDF={onSalvarPDF} onSalvarExame={onSalvarExame}
      />
      {mostrarPreview && (
        <Previa
          titulo="Mapeamento Arterial — Membro Superior" lados={lados} onFechar={() => setMostrarPreview(false)}
          desenhar={(ld) => <DesenhoMMSSArterial lado={ld} arterias={arterias?.[ld] || {}} style={{ display: "block", width: "100%" }} />}
          legenda={<LegendaMMSSArterial />}
        />
      )}
    </>
  );
}

export function MapaInterativoMMSSVenoso({
  aberto, onFechar, lado, ladoAtivo, onTrocarLado,
  veias, onVeiaChange, extras, onExtraChange, observacoes, onObservacao, laudoMembro,
  incluirMapaPdf, onIncluirMapaPdf, onSalvarTXT, onSalvarPDF, onSalvarExame,
}) {
  const [selecionada, setSelecionada] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  if (!aberto) return null;
  const l = ladoAtivo;
  const valores = veias?.[l] || {};
  const extra = extras?.[l];
  const lados = lado === "Ambos" ? ["Direito", "Esquerdo"] : [l];
  return (
    <>
      <MapaLayout
        titulo={`Mapa Interativo — Venoso MMSS (${l})`}
        subtitulo="Toque numa veia do desenho para marcar o achado. O laudo é atualizado em tempo real."
        onFechar={onFechar}
        lado={lado} ladoAtivo={l}
        onTrocarLado={(op) => { onTrocarLado(op); setSelecionada(null); }}
        desenho={<DesenhoMMSSVenoso lado={l} veias={valores} extra={extra} onSelecionar={setSelecionada} selecionada={selecionada} style={{ display: "block", width: "100%", maxWidth: 380, maxHeight: "72vh" }} />}
        legenda={<LegendaMMSSVenoso />}
        painel={selecionada && valores[selecionada] ? (
          <CamposVeia veia={selecionada} lado={l} valores={valores[selecionada]} onChange={(v) => onVeiaChange(l, selecionada, v)} semMoldura />
        ) : null}
        tituloPainel={selecionada ? `${selecionada} (${l})` : ""}
        onFecharPainel={() => setSelecionada(null)}
        placeholderPainel="Toque em uma veia no desenho para registrar o achado."
        conteudo={
          <>
            {extra && (
              <div className="mapa-claro">
                <CamposCateter lado={l} cateter={extra.cateter} onChange={(c) => onExtraChange(l, { ...extra, cateter: c })} />
                <CamposFAVVenoso lado={l} fav={extra.fav} onChange={(f) => onExtraChange(l, { ...extra, fav: f })} />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Observações ({l}):</div>
              <textarea
                value={observacoes?.[l] || ""}
                onChange={(e) => onObservacao(l, e.target.value)}
                placeholder="Observações adicionais..."
                style={{ width: "100%", minHeight: 50, fontSize: 13, borderRadius: 6, border: "1.5px solid #0eb8d0", padding: 8, resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Laudo ({l}) — atualizado em tempo real:</div>
              <pre style={estiloLaudo}>{laudoMembro}</pre>
            </div>
          </>
        }
        incluirPdf={incluirMapaPdf} onIncluirPdf={onIncluirMapaPdf}
        onVisualizarImagem={() => setMostrarPreview(true)}
        onSalvarTXT={onSalvarTXT} onSalvarPDF={onSalvarPDF} onSalvarExame={onSalvarExame}
      />
      {mostrarPreview && (
        <Previa
          titulo="Mapeamento Venoso — Membro Superior" lados={lados} onFechar={() => setMostrarPreview(false)}
          desenhar={(ld) => <DesenhoMMSSVenoso lado={ld} veias={veias?.[ld] || {}} extra={extras?.[ld]} style={{ display: "block", width: "100%" }} />}
          legenda={<LegendaMMSSVenoso />}
        />
      )}
    </>
  );
}

// Para os testes: pontos (já no quadro final) de cada vaso editável.
export function pontosDosVasos() {
  const out = {};
  ["Direito", "Esquerdo"].forEach((lado) => {
    arteriasDoLado(lado).forEach((nome) => {
      out[`${lado}:${nome}`] = curva(`a:${lado}:${nome}`, geometriaArteria(nome, lado)).amostras;
    });
  });
  VEIAS.forEach((nome) => {
    curvasVeia(nome).forEach((c, i) => { out[`veia:${nome}:${i}`] = c.amostras; });
  });
  return out;
}
