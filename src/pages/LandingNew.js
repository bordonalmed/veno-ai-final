import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DesenhoMMIIVenoso } from "../components/MapaInterativo";
import { MarcaVenoMap } from "../components/MapaLayout";
import { veiasProfundas, veiasSuperficiais, profOptions, supOptions, montarLaudo } from "../utils/mmiiVenosoLaudo";
import { DIAS_TESTE, LAUDOS_TESTE } from "../services/planoService";
import "./landing.css";

// Página vitrine: o que o visitante vê em venoai.xyz antes de criar a conta.
// (Quem já está logado vai direto para o menu dos exames — ver App.js.)
//
// A demonstração do topo usa o desenho e o gerador de laudo de verdade do
// programa (DesenhoMMIIVenoso + montarLaudo); as imagens dos outros exames
// são capturas do próprio app com achados de exemplo.

const PUB = process.env.PUBLIC_URL || "";
const LADO = "Direito";
// o mesmo logo, recortado sem a margem vazia do arquivo original (fica maior no mesmo espaço)
const LOGO = `${PUB}/venoai-logo-vitrine.webp`;

const magnaVazia = { coxa: "", perna: "", tornozelo: "", inicio: "", inicio_valor: "", fim: "", fim_valor: "" };
const parvaVazia = { proximal: "", distal: "", inicio: "", inicio_valor: "", fim: "", fim_valor: "" };

function estadoBase() {
  return {
    profundas: Object.fromEntries(veiasProfundas.map((v) => [v, profOptions[0]])),
    superficiais: Object.fromEntries(veiasSuperficiais.map((v) => [v, supOptions[0]])),
    magna: { ...magnaVazia },
    parva: { ...parvaVazia },
    jsf: "",
    varizes: {},
  };
}

// Passos da demonstração: o que o médico "clica" e o que muda no laudo.
const PASSOS = [
  { acao: "Exame normal", aplicar: (e) => e },
  { acao: "Clique na JSF → pérvia e incompetente", aplicar: (e) => ({ ...e, superficiais: { ...e.superficiais, JSF: supOptions[1] }, jsf: "7,5" }) },
  { acao: "Clique na safena magna → refluxo da JSF ao joelho", aplicar: (e) => ({ ...e, superficiais: { ...e.superficiais, "Safena Magna": supOptions[1] }, magna: { ...e.magna, coxa: "5,8", inicio: "JSF", fim: "joelho" } }) },
  { acao: "Marque as varizes no desenho", aplicar: (e) => ({ ...e, varizes: { antPernaProximal: "Varizes Reticulares", antPernaMedia: "Varizes Superficiais", postPernaDistal: "Microvarizes" } }) },
];

function estadoNoPasso(n) {
  let e = estadoBase();
  for (let i = 0; i <= n; i++) e = PASSOS[i].aplicar(e);
  return e;
}

function laudoDe(e) {
  return montarLaudo({
    nome: "Paciente Exemplo", data: "2026-10-13", lado: LADO,
    profundas: { [LADO]: e.profundas }, superficiais: { [LADO]: e.superficiais },
    magna: { [LADO]: e.magna }, parva: { [LADO]: e.parva },
    jsfDiametro: { [LADO]: e.jsf }, jspDiametro: { [LADO]: "" },
    observacoes: { [LADO]: "" },
    perfurantes: { [LADO]: [{ status: "pérvia e competente", segmento: "", valor: "" }] },
    varizes: { [LADO]: e.varizes },
  });
}

const ULTIMO = PASSOS.length - 1;

function DemoAoVivo() {
  // Começa no estado final (página completa já no primeiro quadro) e depois
  // repete a sequência, a não ser que o visitante prefira menos movimento.
  const [passo, setPasso] = useState(ULTIMO);
  const [novas, setNovas] = useState([]);
  const anterior = useRef(laudoDe(estadoNoPasso(ULTIMO)).split("\n"));
  const caixa = useRef(null);

  const estado = useMemo(() => estadoNoPasso(passo), [passo]);
  const laudo = useMemo(() => laudoDe(estado), [estado]);
  const linhas = laudo.split("\n");

  useEffect(() => {
    const calmo = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calmo) return undefined;
    let timer;
    const avancar = (n) => {
      setPasso(n);
      timer = setTimeout(() => avancar(n >= ULTIMO ? 0 : n + 1), n >= ULTIMO ? 4200 : n === 0 ? 1600 : 2300);
    };
    timer = setTimeout(() => avancar(0), 3500);
    return () => clearTimeout(timer);
  }, []);

  // destaca as linhas que mudaram e leva a rolagem até elas
  useEffect(() => {
    const antes = new Set(anterior.current);
    const mudaram = linhas.map((l, i) => (l.trim() && !antes.has(l) ? i : -1)).filter((i) => i >= 0);
    anterior.current = linhas;
    setNovas(mudaram);
    const el = caixa.current;
    if (el) {
      const alvo = mudaram.length ? el.querySelector(`[data-l="${mudaram[0]}"]`) : null;
      el.scrollTop = alvo ? Math.max(0, alvo.offsetTop - 120) : 0;
    }
    const t = setTimeout(() => setNovas([]), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [laudo]);

  return (
    <div className="lp-demo" aria-label="Demonstração: o laudo é escrito conforme os achados marcados no desenho">
      <div className="lp-demo-top">
        <div className="lp-demo-tit"><MarcaVenoMap escala={0.62} /><span className="sep">|</span> Doppler venoso de MMII <small>· {LADO}</small></div>
        <span className="lp-demo-acao" aria-live="polite">{PASSOS[passo].acao}</span>
      </div>
      <div className="lp-demo-corpo">
        <div className="lp-demo-desenho">
          <DesenhoMMIIVenoso
            lado={LADO}
            profundas={estado.profundas}
            superficiais={estado.superficiais}
            magna={estado.magna}
            parva={estado.parva}
            perfurantes={[]}
            varizes={estado.varizes}
          />
        </div>
        <div className="lp-demo-laudo">
          <div className="lp-demo-laudo-tit">Laudo — atualizado em tempo real</div>
          <div className="lp-demo-txt" ref={caixa}>
            {linhas.map((l, i) => (
              <span key={i} data-l={i} className={`lin${novas.includes(i) ? " nova" : ""}${/^[A-ZÁÉÍÓÚÇ ]+:$|^Sistema|^Veias Perfurantes|^DOPPLER/.test(l.trim()) ? " tit" : ""}`}>{l || " "}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const EXAMES = [
  { img: "mmii-arterial.webp", tag: "arterial", nome: "Arterial de membros inferiores", cobre: "Ateromatose, estenoses, oclusões, stents e enxertos (fêmoro-poplíteo, fêmoro-distal…).", ex: "oclusão da femoral superficial" },
  { img: "carotidas.webp", tag: "arterial", nome: "Carótidas e vertebrais", cobre: "Placas, estenose em %, oclusão por terço, stent, dissecção e aneurisma.", ex: "estenose de 50% a 70% da carótida interna" },
  { img: "aorta.webp", tag: "arterial", nome: "Aorta e ilíacas", cobre: "Aneurisma, endoprótese (EVAR), endoleak, enxertos e oclusões.", ex: "oclusão da ilíaca interna direita" },
  { img: "mmss-venoso.webp", tag: "venoso", nome: "Venoso de membros superiores", cobre: "Subclávia, axilar, braquiais, cefálica, basílica e intermédia do cotovelo; trombose e recanalização.", ex: "trombose da veia cefálica" },
  { img: "mmss-arterial.webp", tag: "arterial", nome: "Arterial de membros superiores", cobre: "Subclávia a radial e ulnar, manobra costoclavicular e arco palmar.", ex: "oclusão da artéria radial" },
  { img: "fav.webp", tag: "acesso", nome: "Fístula arteriovenosa", cobre: "Confecção (mapeamento pré-FAV) e avaliação de FAV braquiocefálica, braquiobasílica e outras.", ex: "mapeamento para confecção" },
];

export default function LandingNew() {
  const navigate = useNavigate();
  const cadastrar = () => navigate("/login?cadastro=1");
  const entrar = () => navigate("/login");
  const ir = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const estadoFinal = useMemo(() => estadoNoPasso(ULTIMO), []);

  // Barra "Começar teste grátis" presa embaixo no celular: aparece quando o
  // botão do topo sai da tela e some quando a chamada final aparece.
  const [barra, setBarra] = useState(false);
  useEffect(() => {
    const topo = document.querySelector(".lp-hero .lp-hero-ctas");
    const fim = document.querySelector(".lp-final");
    if (!topo || !fim || typeof IntersectionObserver === "undefined") return undefined;
    const visto = { topo: true, fim: false };
    const io = new IntersectionObserver((itens) => {
      // "fim" continua valendo depois de passar dele (no rodapé)
      itens.forEach((it) => { if (it.target === topo) visto.topo = it.isIntersecting || it.boundingClientRect.top > 0; else visto.fim = it.isIntersecting || it.boundingClientRect.top < 0; });
      setBarra(!visto.topo && !visto.fim);
    });
    io.observe(topo); io.observe(fim);
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <a href="#topo" className="lp-marca" onClick={ir("topo")} aria-label="VENO.AI — início"><img className="lp-logo-nav" src={LOGO} alt="VENO.AI" /></a>
          <nav className="lp-links" aria-label="Seções">
            <a href="#exames" onClick={ir("exames")}>Exames</a>
            <a href="#como" className="esc" onClick={ir("como")}>Como funciona</a>
            <a href="#pdf" className="esc" onClick={ir("pdf")}>O laudo</a>
            <a href="#planos" onClick={ir("planos")}>Planos</a>
          </nav>
          <div className="lp-acoes">
            <button type="button" className="lp-btn lp-btn-texto lp-btn-peq" onClick={entrar}>Entrar</button>
            <button type="button" className="lp-btn lp-btn-cheio lp-btn-peq" onClick={cadastrar}>Teste grátis</button>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero" id="topo">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <img className="lp-logo-hero" src={LOGO} alt="VENO.AI" />
              <p className="lp-sobre">Inteligência para o laudo vascular</p>
              <h1>Laudos de Doppler vascular <em>em minutos</em>, com seu logo e assinatura.</h1>
              <p className="lp-hero-sub">Clique nos vasos do desenho e o laudo se escreve sozinho, com a conclusão pronta. Salve em PDF ou envie ao paciente pelo WhatsApp.</p>
              <div className="lp-hero-ctas">
                <button type="button" className="lp-btn lp-btn-cheio" onClick={cadastrar}>Começar teste grátis</button>
                <a href="#pdf" className="lp-btn lp-btn-vazio" onClick={ir("pdf")}>Ver um laudo pronto</a>
              </div>
              <div className="lp-hero-garantias">
                <span>{DIAS_TESTE} dias ou {LAUDOS_TESTE} laudos grátis</span>
                <span>Sem cartão de crédito</span>
                <span>Criado por cirurgião vascular</span>
              </div>
            </div>
            <DemoAoVivo />
          </div>
        </section>

        <div className="lp-wrap">
          <div className="lp-pontos">
            <div className="lp-ponto"><b>7 exames</b><span>Venosos, arteriais e fístula</span></div>
            <div className="lp-ponto"><b>Laudo em tempo real</b><span>Texto e conclusão coerentes</span></div>
            <div className="lp-ponto"><b>PDF com sua marca</b><span>Logo, CRM e assinatura</span></div>
            <div className="lp-ponto"><b>Envio ao paciente</b><span>WhatsApp ou e-mail</span></div>
          </div>
        </div>

        <section className="lp-faixa" id="exames">
          <div className="lp-wrap">
            <div className="lp-cab">
              <p className="lp-sobre">Os exames</p>
              <h2>Um desenho anatômico para cada exame</h2>
              <p>Os desenhos abaixo são do próprio VENO.AI, com achados de exemplo. Cada cor e marcação vira texto no laudo.</p>
            </div>
            <div className="lp-exames">
              <article className="lp-exame destaque">
                <div className="lp-exame-img">
                  <DesenhoMMIIVenoso lado={LADO} profundas={estadoFinal.profundas} superficiais={estadoFinal.superficiais} magna={estadoFinal.magna} parva={estadoFinal.parva} perfurantes={[]} varizes={estadoFinal.varizes} />
                </div>
                <div className="lp-exame-txt">
                  <span className="lp-tag venoso">Venoso</span>
                  <h3>Venoso de membros inferiores</h3>
                  <p>Sistema profundo, junções, safenas magna e parva com diâmetros e extensão do refluxo, perfurantes e varizes em 16 pontos do desenho.</p>
                  <div className="lp-exame-ex">Exemplo: <b>refluxo da safena magna da JSF ao joelho</b></div>
                </div>
              </article>
              {EXAMES.map((ex) => (
                <article className="lp-exame" key={ex.img}>
                  <div className="lp-exame-img"><img src={`${PUB}/vitrine/${ex.img}`} alt={`Desenho do exame ${ex.nome} no VENO.AI`} loading="lazy" /></div>
                  <div className="lp-exame-txt">
                    <span className={`lp-tag ${ex.tag}`}>{ex.tag === "acesso" ? "Acesso" : ex.tag === "venoso" ? "Venoso" : "Arterial"}</span>
                    <h3>{ex.nome}</h3>
                    <p>{ex.cobre}</p>
                    <div className="lp-exame-ex">Exemplo: <b>{ex.ex}</b></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-faixa alt" id="como">
          <div className="lp-wrap">
            <div className="lp-cab">
              <p className="lp-sobre">Como funciona</p>
              <h2>Do exame ao laudo assinado em 3 passos</h2>
            </div>
            <div className="lp-passos">
              <div className="lp-passo"><h3>Preencha nome, idade e data</h3><p>Escolha o exame e o lado. O desenho anatômico aparece na hora.</p></div>
              <div className="lp-passo"><h3>Clique nos vasos alterados</h3><p>Marque refluxo, estenose, oclusão, stent ou trombose. O laudo e a conclusão são escritos enquanto você clica.</p></div>
              <div className="lp-passo"><h3>Salve o PDF ou envie</h3><p>O laudo sai com seu logo, dados da clínica e assinatura. Envie ao paciente pelo WhatsApp ou e-mail.</p></div>
            </div>
          </div>
        </section>

        <section className="lp-faixa" id="pdf">
          <div className="lp-wrap lp-pdf">
            <figure className="lp-pdf-folha" style={{ margin: 0 }}>
              <img src={`${PUB}/vitrine/pdf-exemplo.webp`} alt="Exemplo de laudo em PDF gerado pelo VENO.AI, com logo da clínica e assinatura" loading="lazy" />
            </figure>
            <div>
              <div className="lp-cab" style={{ marginBottom: 26 }}>
                <p className="lp-sobre">O laudo</p>
                <h2>Pronto para imprimir, com a cara da sua clínica</h2>
                <p>Este é um PDF de verdade gerado pelo VENO.AI (clínica e médico de exemplo).</p>
              </div>
              <ul className="lp-lista">
                <li><span className="ic">1</span><div><b>Seu logo e os dados da clínica</b><span>No topo de cada página, como no seu papel timbrado.</span></div></li>
                <li><span className="ic">2</span><div><b>Assinatura e CRM no rodapé</b><span>Assinatura digitalizada ou desenhada na tela.</span></div></li>
                <li><span className="ic">3</span><div><b>Até 3 locais de atendimento</b><span>Atende em mais de uma clínica? Escolha o local e o logo do PDF muda.</span></div></li>
                <li><span className="ic">4</span><div><b>Exames salvos na nuvem</b><span>Reabra, edite e gere o PDF de novo em qualquer computador ou celular.</span></div></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-faixa alt">
          <div className="lp-wrap">
            <div className="lp-cab">
              <p className="lp-sobre">Por que trocar</p>
              <h2>Chega de copiar e colar modelo no Word</h2>
            </div>
            <div className="lp-compara">
              <div className="lp-col antes">
                <h3>Modelo no Word</h3>
                <ul>
                  <li>Abrir o laudo do paciente anterior e apagar o que não serve</li>
                  <li>Risco de ficar "direito" onde era "esquerdo", ou a data antiga</li>
                  <li>Conclusão escrita de novo a cada exame</li>
                  <li>Formatação, logo e assinatura ajustados à mão</li>
                </ul>
              </div>
              <div className="lp-col depois">
                <h3>Com o VENO.AI</h3>
                <ul>
                  <li>Laudo novo a cada exame, a partir do desenho</li>
                  <li>Nome, lado e data entram sozinhos no texto</li>
                  <li>Conclusão gerada a partir dos achados marcados</li>
                  <li>PDF padronizado com sua marca, em um clique</li>
                </ul>
              </div>
            </div>
            <div className="lp-meio-cta">
              <button type="button" className="lp-btn lp-btn-cheio" onClick={cadastrar}>Fazer meu primeiro laudo grátis</button>
              <span>{DIAS_TESTE} dias ou {LAUDOS_TESTE} laudos · sem cartão de crédito</span>
            </div>
          </div>
        </section>

        <section className="lp-faixa">
          <div className="lp-wrap">
            <div className="lp-autor">
              <div className="lp-autor-selo"><img className="lp-logo-brilho" src={LOGO} alt="" /></div>
              <div>
                <blockquote>Criado por um cirurgião vascular que lauda Doppler todos os dias, para a rotina real do consultório.</blockquote>
                <p>A nomenclatura, a ordem dos vasos e as conclusões seguem a prática da ultrassonografia vascular.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-faixa alt" id="planos">
          <div className="lp-wrap">
            <div className="lp-cab">
              <p className="lp-sobre">Planos</p>
              <h2>Teste grátis. Assine só se gostar.</h2>
              <p>O teste começa no seu primeiro laudo e não pede cartão.</p>
            </div>
            <div className="lp-planos">
              <div className="lp-plano">
                <h3>Teste grátis</h3>
                <div className="lp-preco">R$ 0<small>{DIAS_TESTE} dias ou {LAUDOS_TESTE} laudos</small></div>
                <ul>
                  <li>Todos os 7 exames</li>
                  <li>PDF com seu logo e assinatura</li>
                  <li>Sem cartão de crédito</li>
                </ul>
                <button type="button" className="lp-btn lp-btn-vazio" onClick={cadastrar}>Criar conta grátis</button>
              </div>
              <div className="lp-plano pro">
                <span className="selo">Recomendado</span>
                <h3>Premium</h3>
                <div className="lp-preco">R$ 97<small>por mês</small></div>
                <p className="lp-ancora">Cerca de <b>R$ 3,20 por dia</b>, menos que um único exame Doppler por mês.</p>
                <ul>
                  <li>Laudos ilimitados</li>
                  <li>Até 3 locais de atendimento</li>
                  <li>Envio do laudo por WhatsApp e e-mail</li>
                  <li>Exames e perfil na nuvem</li>
                  <li>Cancele quando quiser</li>
                </ul>
                <button type="button" className="lp-btn lp-btn-cheio" onClick={cadastrar}>Começar pelo teste grátis</button>
              </div>
            </div>
            <p className="lp-nota">Pagamento seguro pela Hotmart. Sem fidelidade.</p>
          </div>
        </section>

        <section className="lp-faixa">
          <div className="lp-wrap">
            <div className="lp-cab"><p className="lp-sobre">Dúvidas</p><h2>Perguntas frequentes</h2></div>
            <div className="lp-faq">
              <details open><summary>Preciso instalar alguma coisa?</summary><p>Não. Funciona no navegador do computador, do tablet ou do celular. Se quiser, dá para instalar como app pelo próprio navegador.</p></details>
              <details><summary>Como funciona o teste grátis?</summary><p>Começa no seu primeiro laudo e vale por {DIAS_TESTE} dias ou {LAUDOS_TESTE} laudos, o que acabar primeiro. Gerar de novo o laudo do mesmo paciente não conta outra vez.</p></details>
              <details><summary>Consigo colocar o logo da minha clínica?</summary><p>Sim. Em Configurações você coloca logo, endereço, telefone, CRM e assinatura. Com o Premium, até 3 locais com logos diferentes.</p></details>
              <details><summary>Posso acrescentar observações ao laudo?</summary><p>Sim. Cada exame tem um campo de observações que entra no texto do laudo.</p></details>
              <details><summary>Meus exames ficam salvos?</summary><p>Ficam na sua conta, protegidos por login, e aparecem em Exames Realizados para reabrir, editar, gerar o PDF ou enviar ao paciente.</p></details>
              <details><summary>Como cancelo o Premium?</summary><p>Pela sua conta na Hotmart, quando quiser, sem multa. O Premium continua até o fim do mês já pago.</p></details>
            </div>
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-wrap">
            <img className="lp-logo-final" src={LOGO} alt="VENO.AI" />
            <h2>Seu próximo laudo de Doppler pode ficar pronto em 2 minutos.</h2>
            <p>{DIAS_TESTE} dias ou {LAUDOS_TESTE} laudos grátis, sem cartão de crédito.</p>
            <div className="lp-hero-ctas">
              <button type="button" className="lp-btn lp-btn-cheio" onClick={cadastrar}>Começar teste grátis</button>
              <button type="button" className="lp-btn lp-btn-vazio" onClick={entrar}>Já tenho conta</button>
            </div>
          </div>
        </section>
      </main>

      <div className={`lp-barra${barra ? " on" : ""}`} aria-hidden={!barra}>
        <button type="button" className="lp-btn lp-btn-cheio" onClick={cadastrar} tabIndex={barra ? 0 : -1}>Começar teste grátis</button>
      </div>

      <footer className="lp-rodape">
        <div className="lp-wrap lp-rodape-in">
          <span className="lp-rodape-marca"><img src={LOGO} alt="" />© {new Date().getFullYear()} VENO.AI · Laudos de Doppler vascular</span>
          <span><a href="/planos">Planos</a> · <a href="/login">Entrar</a></span>
        </div>
      </footer>
    </div>
  );
}
