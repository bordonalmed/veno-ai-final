import React, { useMemo } from "react";
import Mapa3D from "../components/mapa3d/Mapa3D";
import { decodificarExame3D } from "../utils/codigo3d";
import "./paciente3d.css";

const PUB = process.env.PUBLIC_URL || "";

// Página aberta pelo QR Code do laudo: o paciente vê a perna em 3D com os
// achados do exame, sem login. Os achados vêm do próprio link (depois do #);
// não há nome nem dado pessoal, e nada é buscado no servidor.
export default function Paciente3D() {
  const exame = useMemo(() => {
    try { return decodificarExame3D(decodeURIComponent((window.location.hash || "").slice(1))); } catch (_) { return null; }
  }, []);
  const mmssArt = !!exame && exame.modo === "mmssArterial", fav = !!exame && exame.modo === "fav";
  const arterial = !!exame && (exame.modo === "arterial" || mmssArt), mmss = !!exame && exame.modo === "mmssVenoso";
  const nota = "Ilustração educativa gerada a partir dos achados do seu exame. Não substitui o laudo nem a consulta com o seu médico.";
  return (
    <div className="p3d">
      <header className="p3d-topo">
        <img src={`${PUB}/venoai-logo-vitrine.webp`} alt="VENO.AI" />
        <div>
          <h1>Seu exame em 3D</h1>
          {exame && <p>{fav ? `Fístula arteriovenosa · braço ${exame.lado === "Direito" ? "direito" : "esquerdo"}` : `Membro ${mmss || mmssArt ? "superior" : "inferior"} ${exame.lado === "Direito" ? "direito" : "esquerdo"} · Doppler ${arterial ? "arterial" : "venoso"}`}</p>}
        </div>
      </header>
      {exame ? (
        <>
          <main className="p3d-3d">
            {fav ? (
              <Mapa3D modo="fav" lado={exame.lado} extra={exame.extra} nota={nota} />
            ) : mmss ? (
              <Mapa3D modo="mmssVenoso" lado={exame.lado} veias={exame.veias} extra={exame.extra} nota={nota} />
            ) : mmssArt ? (
              <Mapa3D modo="mmssArterial" lado={exame.lado} arterias={exame.arterias} nota={nota} />
            ) : arterial ? (
              <Mapa3D modo="arterial" lado={exame.lado} arterias={exame.arterias} enxerto={exame.enxerto} nota={nota} />
            ) : (
              <Mapa3D
                lado={exame.lado} profundas={exame.profundas} superficiais={exame.superficiais}
                magna={exame.magna} parva={exame.parva} perfurantes={exame.perfurantes} varizes={exame.varizes}
                nota={nota}
              />
            )}
          </main>
          <section className="p3d-guia">
            <h2>Como ver</h2>
            {fav ? (
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
