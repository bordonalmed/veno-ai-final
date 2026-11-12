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
  return (
    <div className="p3d">
      <header className="p3d-topo">
        <img src={`${PUB}/venoai-logo-vitrine.webp`} alt="VENO.AI" />
        <div>
          <h1>Seu exame em 3D</h1>
          {exame && <p>Membro inferior {exame.lado === "Direito" ? "direito" : "esquerdo"} · Doppler venoso</p>}
        </div>
      </header>
      {exame ? (
        <>
          <main className="p3d-3d">
            <Mapa3D
              lado={exame.lado} profundas={exame.profundas} superficiais={exame.superficiais}
              magna={exame.magna} parva={exame.parva} perfurantes={exame.perfurantes} varizes={exame.varizes}
              nota="Ilustração educativa gerada a partir dos achados do seu exame. Não substitui o laudo nem a consulta com o seu médico."
            />
          </main>
          <section className="p3d-guia">
            <h2>Como ver</h2>
            <ul>
              <li><b>Gire</b> a perna arrastando com o dedo.</li>
              <li><b>Azul</b>: veia funcionando bem. <b className="ruim">Vermelho</b>: refluxo, o sangue volta para baixo.</li>
              <li>Toque em <b>Veia</b> e depois em <b>Dentro</b> para ver as válvulas e o sangue por dentro.</li>
              <li>O ícone de <b>tela cheia</b> no canto deixa a imagem maior.</li>
            </ul>
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
