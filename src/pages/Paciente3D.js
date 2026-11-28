import React, { useMemo } from "react";
import Exame3D, { lerExame3D } from "../components/mapa3d/Exame3D";
import "./paciente3d.css";

const PUB = process.env.PUBLIC_URL || "";

// Página aberta pelo QR Code do laudo: o paciente vê a perna em 3D com os
// achados do exame, sem login. Os achados vêm do próprio link (depois do #);
// não há nome nem dado pessoal, e nada é buscado no servidor.
export default function Paciente3D() {
  const exame = useMemo(() => lerExame3D((window.location.hash || "").slice(1)), []);
  const mmssArt = !!exame && exame.modo === "mmssArterial", fav = !!exame && exame.modo === "fav", carot = !!exame && exame.modo === "carotidas", aorta = !!exame && exame.modo === "aorta";
  const arterial = !!exame && (exame.modo === "arterial" || mmssArt), mmss = !!exame && exame.modo === "mmssVenoso";
  const nota = "Ilustração educativa gerada a partir dos achados do seu exame. Não substitui o laudo nem a consulta com o seu médico.";
  return (
    <div className="p3d">
      <header className="p3d-topo">
        <img src={`${PUB}/venoai-logo-vitrine.webp`} alt="VENO.AI" />
        <div>
          <h1>Seu exame em 3D</h1>
          {exame && <p>{aorta ? "Doppler de aorta abdominal e artérias ilíacas" : carot ? "Doppler de carótidas e vertebrais" : fav ? `Fístula arteriovenosa · braço ${exame.lado === "Direito" ? "direito" : "esquerdo"}` : `Membro ${mmss || mmssArt ? "superior" : "inferior"} ${exame.lado === "Direito" ? "direito" : "esquerdo"} · Doppler ${arterial ? "arterial" : "venoso"}`}</p>}
        </div>
      </header>
      {exame ? (
        <>
          <main className="p3d-3d">
            <Exame3D exame={exame} nota={nota} />
          </main>
          <section className="p3d-guia">
            <h2>Como ver</h2>
            {aorta ? (
            <ul>
              <li><b>Gire</b> o abdome arrastando com o dedo, ou use os botões <b>A</b> (anterior), <b>P</b> (posterior), <b>LD</b> (lateral direita) e <b>LE</b> (lateral esquerda).</li>
              <li>A <b>aorta</b> desce na frente da coluna e se divide nas <b>ilíacas</b>, que levam o sangue para a bacia e as pernas. Os rins, a coluna e a bacia aparecem como referência.</li>
              <li><b className="ruim">Vermelho</b>: sangue passando normalmente. Artéria dilatada: <b>aneurisma</b>. <b>Laranja</b>: estreitamento. <b>Cinza escuro</b>: artéria fechada.</li>
              <li>Malha <b>prateada</b>: endoprótese. <b>Azul</b>: enxerto (ponte). <b>Amarelo</b>: vazamento (endoleak).</li>
              <li>Toque numa artéria e depois em <b>Artéria</b> e <b>Dentro</b> para ver por dentro. A barra <b>Superficial / Profundo</b> deixa a pele transparente.</li>
            </ul>
            ) : carot ? (
            <ul>
              <li><b>Gire</b> o pescoço arrastando com o dedo, ou use os botões <b>A</b> (anterior), <b>P</b> (posterior), <b>LD</b> (lateral direita) e <b>LE</b> (lateral esquerda).</li>
              <li>As <b>carótidas</b> sobem pelos lados do pescoço e se dividem em <b>interna</b> (leva sangue ao cérebro) e <b>externa</b> (rosto e couro cabeludo). As <b>vertebrais</b> sobem por dentro da coluna do pescoço.</li>
              <li><b className="ruim">Vermelho</b>: sangue passando normalmente. <b>Laranja</b>: estreitamento por placa (estenose). <b>Cinza escuro</b>: artéria fechada (oclusão). Pontinhos claros: placas pequenas (ateromatose).</li>
              <li>Toque numa artéria e depois em <b>Artéria</b> e <b>Dentro</b> para ver a placa e o estreitamento por dentro.</li>
              <li>A barra <b>Superficial / Profundo</b> deixa a pele transparente e mostra a coluna, a traqueia e as clavículas.</li>
            </ul>
            ) : fav ? (
            <ul>
              <li><b>Gire</b> o braço arrastando com o dedo, ou use os botões <b>A</b>, <b>M</b>, <b>P</b> e <b>L</b>.</li>
              <li><b className="ruim">Vermelho</b>: artéria. <b>Roxo</b>: a veia da fístula, que recebe o sangue da artéria. <b>Ponto branco</b>: a ligação entre elas (anastomose).</li>
              <li><b>Laranja</b>: estreitamento. No mapeamento antes da cirurgia, <b>verde</b> são os vasos com calibre bom para a fístula.</li>
              <li>Toque na fístula e depois em <b>Vaso</b> e <b>Dentro</b> para ver por dentro.</li>
            </ul>
            ) : mmss ? (
            <ul>
              <li><b>Gire</b> o braço arrastando com o dedo, ou use os botões <b>A</b>, <b>M</b>, <b>P</b> e <b>L</b>.</li>
              <li><b>Azul</b>: veia pérvia, o sangue volta normalmente para o coração. <b>Cinza</b>: trombose (coágulo) fechando a veia. <b>Azul acinzentado</b>: trombo parcial. <b>Laranja</b>: recanalização parcial.</li>
              <li>Linha <b>amarela</b>: cateter ou cabo dentro da veia.</li>
              <li>Toque numa veia e depois em <b>Veia</b> e <b>Dentro</b> para ver por dentro.</li>
              <li>A barra <b>Superficial / Profundo</b> deixa a pele mais transparente e mostra as veias profundas.</li>
            </ul>
            ) : arterial ? (
            <ul>
              <li><b>Gire</b> a perna arrastando com o dedo, ou use os botões <b>A</b>, <b>M</b>, <b>P</b> e <b>L</b>.</li>
              <li><b className="ruim">Vermelho</b>: artéria com sangue passando normalmente. <b>Laranja</b>: estreitamento (estenose). <b>Cinza escuro</b>: artéria fechada (oclusão), sem passagem de sangue.</li>
              <li>Toque numa artéria para ver o nome e o achado. Depois toque em <b>Artéria</b> e em <b>Dentro</b> para ver as placas e o estreitamento por dentro.</li>
              <li>Prata: <b>stent</b>. Azul: <b>enxerto (ponte)</b>. Artéria dilatada: <b>aneurisma</b>. Linha branca: <b>dissecção</b>.</li>
              <li>Em <b>Artéria</b>, o botão <b>Por fora</b> mostra a artéria por fora; sem ele, ela aparece em corte, com as placas por dentro.</li>
              <li>A barra <b>Superficial / Profundo</b> deixa a pele mais transparente.</li>
            </ul>
            ) : (
            <ul>
              <li><b>Gire</b> a perna arrastando com o dedo.</li>
              <li><b>Azul</b>: veia funcionando bem. <b className="ruim">Vermelho</b>: refluxo, o sangue volta para baixo.</li>
              <li>Toque em <b>Veia</b> e depois em <b>Dentro</b> para ver as válvulas e o sangue por dentro.</li>
              <li>O ícone de <b>tela cheia</b> no canto deixa a imagem maior.</li>
            </ul>
            )}
            <p>Dúvidas sobre o seu exame? Converse com o seu médico.</p>
          </section>
        </>
      ) : (
        <main className="p3d-erro">
          <h2>Não foi possível abrir o exame</h2>
          <p>Aponte a câmera do celular de novo para o QR Code impresso no laudo, com o papel bem iluminado e reto.</p>
        </main>
      )}
      <footer className="p3d-rodape">
        Gerado por <a href="https://venoai.xyz" target="_blank" rel="noopener noreferrer">VENO.AI</a> · laudos de Doppler vascular para médicos
      </footer>
    </div>
  );
}
