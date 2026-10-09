import React from "react";

// Ícone de abdome (barriga), no estilo dos ícones da tela inicial (forma
// cheia de uma cor): arco das costelas em cima, cintura, quadril, umbigo e as
// linhas da virilha recortadas.
export default function IconeAbdome({ size = 30, color = "currentColor", style }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} style={style} aria-hidden="true">
      <defs>
        <mask id="icone-abdome-recortes">
          <rect width="512" height="512" fill="#fff" />
          {/* umbigo */}
          <ellipse cx="256" cy="272" rx="17" ry="24" fill="#000" />
          {/* linhas da virilha (V) */}
          <path d="M162 368 C 192 400, 218 428, 240 452" fill="none" stroke="#000" strokeWidth="18" strokeLinecap="round" />
          <path d="M350 368 C 320 400, 294 428, 272 452" fill="none" stroke="#000" strokeWidth="18" strokeLinecap="round" />
        </mask>
      </defs>
      <path
        mask="url(#icone-abdome-recortes)"
        fill={color}
        d="M160 62 Q 256 94 352 62 C 374 56 388 66 388 88 C 388 152 370 192 372 242 C 374 302 412 340 414 400 C 416 452 360 472 300 482 Q 256 490 212 482 C 152 472 96 452 98 400 C 100 340 138 302 140 242 C 142 192 124 152 124 88 C 124 66 138 56 160 62 Z"
      />
    </svg>
  );
}
