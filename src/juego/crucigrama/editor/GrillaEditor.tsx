import { useMemo, useState, type DragEvent } from "react";
import type { OrientacionCrucigrama } from "../../../types";
import { Tablero } from "../../compartido/Tablero";
import { CeldaEditor } from "./CeldaEditor";
import {
  anclarPalabra,
  celdasDePalabra,
  colocadasValidas,
  normalizarGrilla,
  numerosDePista,
  validarPreview,
  type Colocada,
  type ConflictoPreview,
} from "./logica";

interface PalabraArrastrada {
  palabraId: string;
  palabra: string;
  orientacion: OrientacionCrucigrama;
}

interface PreviewDrag {
  palabra: string;
  fila: number;
  columna: number;
  orientacion: OrientacionCrucigrama;
  conflictos: ConflictoPreview[];
}

interface GrillaEditorProps {
  colocadas: Colocada[];
  palabraArrastrada: PalabraArrastrada | null;
  onColocarPalabra: (
    palabraId: string,
    orientacion: OrientacionCrucigrama,
    fila: number,
    columna: number,
  ) => void;
}

/**
 * Canvas de edición (D6/D7 REVISADO post-QA): normaliza el bounding box de
 * colocadas + preview, pinta celdas negras en vacíos, y durante un arrastre
 * calcula el snap opción C (`anclarPalabra`): el anclaje de cruce más cercano
 * al puntero que pase la validación espejo, o la colocación libre (primera
 * letra en la celda del drop) si no hay cruces. El drop envía SOLO posiciones
 * válidas; si ni el snap ni la libre valen, el drop queda bloqueado (no se
 * previene el dragOver). El bbox crece hacia arriba/izquierda porque el
 * preview puede usar coordenadas negativas (D1 REVISADO).
 */
export function GrillaEditor({
  colocadas,
  palabraArrastrada,
  onColocarPalabra,
}: GrillaEditorProps) {
  const [preview, setPreview] = useState<PreviewDrag | null>(null);

  const conjunto = useMemo<Colocada[]>(() => {
    if (!preview) return colocadas;
    return [
      ...colocadas,
      {
        palabra: preview.palabra,
        posicion: { fila: preview.fila, columna: preview.columna },
        orientacion: preview.orientacion,
      },
    ];
  }, [colocadas, preview]);

  const bbox = normalizarGrilla(conjunto);
  const mapaColocadas = colocadasValidas(conjunto);
  const numeros = numerosDePista(conjunto);

  const celdasPreview = useMemo(
    () =>
      preview
        ? celdasDePalabra(preview.palabra, preview.fila, preview.columna, preview.orientacion)
        : [],
    [preview],
  );

  const conflictosPreview = useMemo(() => {
    const set = new Set<string>();
    for (const c of preview?.conflictos ?? []) set.add(`${c.fila},${c.columna}`);
    return set;
  }, [preview]);

  /** DragOver de una celda: calcula el snap (ancla de cruce más cercana o
   * colocación libre) y muestra el preview; limpia si el drop queda bloqueado. */
  function manejarDragOver(e: DragEvent<HTMLDivElement>, absFila: number, absColumna: number) {
    if (!palabraArrastrada) return;
    const { palabra, orientacion } = palabraArrastrada;
    const ancla = anclarPalabra(colocadas, palabra, absFila, absColumna, orientacion);
    if (ancla === null) {
      setPreview(null);
      return;
    }
    const resultado = validarPreview(colocadas, palabra, ancla.fila, ancla.columna, orientacion);
    e.dataTransfer.dropEffect = "move";
    e.preventDefault();
    setPreview({ palabra, fila: ancla.fila, columna: ancla.columna, orientacion, conflictos: resultado.conflictos });
  }

  function manejarDrop(e: DragEvent<HTMLDivElement>, _absFila: number, _absColumna: number) {
    e.preventDefault();
    // D7 / QA paso 18: si el preview tiene conflictos (rojo) NO se envía el PUT
    // — el servidor es la autoridad final y no debe recibir posiciones que el
    // propio espejo ya marcó inválidas.
    if (!palabraArrastrada || !preview || preview.conflictos.length > 0) return;
    onColocarPalabra(palabraArrastrada.palabraId, preview.orientacion, preview.fila, preview.columna);
    setPreview(null);
  }

  function renderCelda(fila: number, columna: number) {
    const absFila = fila + bboxOk.minFila;
    const absColumna = columna + bboxOk.minCol;
    const clave = `${absFila},${absColumna}`;
    const numero = numeros.get(`${fila},${columna}`);

    const celdaPreview = celdasPreview.find(
      (c) => c.fila === absFila && c.columna === absColumna,
    );
    const letraOcupada = mapaColocadas.get(clave);

    let estado: "negra" | "ocupada" | "preview" | "conflicto" = "negra";
    let letra: string | null = null;
    let motivo: string | null = null;

    if (celdaPreview) {
      letra = celdaPreview.letra;
      if (conflictosPreview.has(clave)) {
        estado = "conflicto";
        motivo = preview?.conflictos.find((c) => c.fila === absFila && c.columna === absColumna)?.motivo ?? "Conflicto";
      } else {
        estado = "preview";
      }
    } else if (letraOcupada) {
      estado = "ocupada";
      letra = letraOcupada;
    }

    return (
      <CeldaEditor
        letra={letra}
        numero={numero}
        estado={estado}
        motivo={motivo}
        onDragOver={(e) => manejarDragOver(e, absFila, absColumna)}
        onDrop={(e) => manejarDrop(e, absFila, absColumna)}
      />
    );
  }

  function renderCeldaSuelta(_fila: number, _columna: number) {
    // Primer drop: una sola celda negra en (0,0) para anclar la primera palabra.
    return (
      <CeldaEditor
        estado="negra"
        onDragOver={(e) => manejarDragOver(e, 0, 0)}
        onDrop={(e) => manejarDrop(e, 0, 0)}
      />
    );
  }

  if (!bbox) {
    // Sin palabras posicionadas ni preview: zona de drop de la primera palabra.
    return (
      <div className="flex flex-col items-center gap-2">
        <Tablero filas={1} columnas={1} renderCelda={renderCeldaSuelta} />
        <p className="text-sm text-ink-soft">
          Arrastrá la primera palabra aquí para empezar
        </p>
      </div>
    );
  }

  const bboxOk = bbox;

  return (
    <div className="flex flex-col items-center gap-2">
      <Tablero
        filas={bboxOk.filas}
        columnas={bboxOk.columnas}
        renderCelda={renderCelda}
      />
      {preview && preview.conflictos.length > 0 && (
        <p className="max-w-md text-center text-xs text-coral">
          {preview.conflictos.map((c) => c.motivo).join(" · ")}
        </p>
      )}
    </div>
  );
}