import React, { useRef } from "react";
import { FiPaperclip, FiX } from "react-icons/fi";

// Anexos (PNG/JPG) dentro do Map: as mesmas imagens que o formulário anexa ao
// PDF e que vão junto com o exame salvo.
export default function AnexosMapa({ anexos = [], onFileUpload, onDrop, onDragOver, onRemoveAnexo, formatFileSize }) {
  const entrada = useRef(null);
  const tamanho = (n) => (formatFileSize ? formatFileSize(n || 0) : "");
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}><FiPaperclip /> Anexos:</div>
        <span style={{ fontSize: 11, color: "#5c6b78" }}>{anexos.length} arquivo(s)</span>
      </div>
      <div
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => entrada.current && entrada.current.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && entrada.current) { e.preventDefault(); entrada.current.click(); } }}
        style={{ border: "1px dashed #0eb8d0", borderRadius: 6, padding: 10, textAlign: "center", background: "rgba(14,184,208,0.05)", cursor: "pointer", fontSize: 12, color: "#0a7f91" }}
      >
        <input ref={entrada} type="file" accept=".png,.jpg,.jpeg" multiple onChange={onFileUpload} style={{ display: "none" }} />
        Clique ou arraste para anexar (PNG/JPG até 15MB)
      </div>
      {anexos.length > 0 && (
        <div style={{ maxHeight: 120, overflowY: "auto", border: "1px solid #dfe6ec", borderRadius: 6, background: "#f7f9fa", padding: 6, marginTop: 6 }}>
          {anexos.map((anexo) => (
            <div key={anexo.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 4, background: "#fff", borderRadius: 4, marginBottom: 4, border: "1px solid #dfe6ec" }}>
              <img src={anexo.thumbnail} alt={anexo.name} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3, border: "1px solid #dfe6ec" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{anexo.name}</div>
                <div style={{ fontSize: 10, color: "#5c6b78" }}>{tamanho(anexo.size)}</div>
              </div>
              <button type="button" onClick={() => onRemoveAnexo && onRemoveAnexo(anexo.id)} aria-label={`Remover ${anexo.name}`} style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center" }}><FiX /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
