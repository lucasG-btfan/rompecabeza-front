import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton } from "../PrimaryButton";

/**
 * Input + botón para unirse a una partida con código. Se usa en Home.
 */
export function InputCodigo() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");

  function manejarSubmit(e: FormEvent) {
    e.preventDefault();
    const limpio = codigo.trim().toUpperCase();
    if (limpio.length < 3) return; // códigos del backend tienen 6 chars
    navigate(`/jugar/${limpio}`);
  }

  return (
    <form onSubmit={manejarSubmit} className="flex flex-col gap-3">
      <label htmlFor="codigo" className="text-sm font-medium text-ink-soft">
        Código de la partida
      </label>
      <input
        id="codigo"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Ej: ABC123"
        maxLength={10}
        autoComplete="off"
        spellCheck={false}
        className="rounded-md border-2 border-ink/10 bg-tile-light px-3 py-2 text-center font-mono text-lg uppercase tracking-widest text-ink placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-soft/50 outline-none transition-colors focus:border-amber focus-visible:ring-2 focus-visible:ring-amber/40"
      />
      <PrimaryButton type="submit" disabled={codigo.trim().length < 3}>
        Unirme
      </PrimaryButton>
    </form>
  );
}
