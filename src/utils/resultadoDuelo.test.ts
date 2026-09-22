import { describe, expect, test } from "vitest";
import {
  subtituloDueloExpirado,
  subtituloResultado,
  tituloDueloExpirado,
  tituloResultado,
} from "./resultadoDuelo";
import type { ResultadoDuelo } from "../types/partidas";


type ParamsResultado = {
  yo_palabras?: number;
  rival_palabras?: number;
  motivo?: ResultadoDuelo["motivo"];
};

function resultado(
  gane: boolean | null,
  rival = "lucasss",
  params: ParamsResultado = {},
): ResultadoDuelo {
  const payload = {
    yo_palabras: params.yo_palabras ?? 7,
    rival_palabras: params.rival_palabras ?? 5,
    gane,
    rival,
    tiempo_total_seg: 342,
  } as ResultadoDuelo;
  if (params.motivo !== undefined) {
    payload.motivo = params.motivo;
  }
  return payload;
}

describe("tituloResultado", () => {
  test("gané → festivo con emojis", () => {
    expect(tituloResultado(resultado(true, "lucasss", { motivo: "corte" }))).toBe(
      "¡Ganaste el duelo! 🥳🎉",
    );
  });

  test("perdí → sobrio, sin emojis", () => {
    expect(tituloResultado(resultado(false, "lucasss", { motivo: "corte" }))).toBe(
      "Perdiste el duelo",
    );
  });

  test("empate → neutral", () => {
    expect(tituloResultado(resultado(null, "lucasss", { motivo: "empate" }))).toBe(
      "Empate",
    );
  });
});

describe("subtituloResultado — corte (copy del C-19 intacto, D5)", () => {
  test("gané por corte → festivo mencionando al rival", () => {
    expect(
      subtituloResultado(resultado(true, "maria_88", { motivo: "corte" }), "maria_88"),
    ).toBe("Encontraste más palabras que maria_88. ¡No para cualquiera!");
  });

  test("perdí por corte → sobrio mencionando al rival", () => {
    expect(
      subtituloResultado(resultado(false, "maria_88", { motivo: "corte" }), "maria_88"),
    ).toBe("maria_88 encontró más palabras que vos. La revancha es otra partida.");
  });

  test("rival de un solo caracter (edge case)", () => {
    expect(
      subtituloResultado(resultado(false, "a", { motivo: "corte" }), "a"),
    ).toBe("a encontró más palabras que vos. La revancha es otra partida.");
  });

  test("rival con acentos y eñe (unicode)", () => {
    expect(
      subtituloResultado(resultado(true, "Juán_Muñóz", { motivo: "corte" }), "Juán_Muñóz"),
    ).toBe("Encontraste más palabras que Juán_Muñóz. ¡No para cualquiera!");
  });
});

describe("subtituloResultado — abandono (C-25, D5)", () => {
  test("gané por abandono del rival → copy de forfeit", () => {
    expect(
      subtituloResultado(
        resultado(true, "maria_88", { motivo: "abandono", yo_palabras: 1, rival_palabras: 9 }),
        "maria_88",
      ),
    ).toBe("maria_88 abandonó el duelo. ¡Ganaste igual!");
  });

  test("perdí por mi abandono → copy honesto sin mencionar rival", () => {
    expect(
      subtituloResultado(
        resultado(false, "maria_88", { motivo: "abandono", yo_palabras: 9, rival_palabras: 1 }),
        "maria_88",
      ),
    ).toBe("Abandonaste el duelo. La revancha es otra partida.");
  });

  test("rival de un solo caracter en rama abandono ganada", () => {
    expect(
      subtituloResultado(
        resultado(true, "a", { motivo: "abandono", yo_palabras: 1, rival_palabras: 9 }),
        "a",
      ),
    ).toBe("a abandonó el duelo. ¡Ganaste igual!");
  });

  test("rival de un solo caracter en rama abandono perdida", () => {
    expect(
      subtituloResultado(
        resultado(false, "a", { motivo: "abandono", yo_palabras: 9, rival_palabras: 1 }),
        "a",
      ),
    ).toBe("Abandonaste el duelo. La revancha es otra partida.");
  });

  test("rival con acentos y eñe en rama abandono ganada", () => {
    expect(
      subtituloResultado(
        resultado(true, "Juán_Muñóz", { motivo: "abandono", yo_palabras: 1, rival_palabras: 9 }),
        "Juán_Muñóz",
      ),
    ).toBe("Juán_Muñóz abandonó el duelo. ¡Ganaste igual!");
  });

  test("rival con acentos y eñe en rama abandono perdida", () => {
    expect(
      subtituloResultado(
        resultado(false, "Juán_Muñóz", { motivo: "abandono", yo_palabras: 9, rival_palabras: 1 }),
        "Juán_Muñóz",
      ),
    ).toBe("Abandonaste el duelo. La revancha es otra partida.");
  });
});

describe("subtituloResultado — empate (D5)", () => {
  test("empate → neutral sin rival en el copy", () => {
    expect(
      subtituloResultado(resultado(null, "maria_88", { motivo: "empate" }), "maria_88"),
    ).toBe("¡Qué parejo! Igual cantidad de palabras.");
  });
});

describe("subtituloResultado — fallback D6 sin motivo (ventana de deploy)", () => {
  test("gané sin motivo con menos palabras que el rival → solo pudo ser abandono", () => {
    expect(
      subtituloResultado(resultado(true, "maria_88", { yo_palabras: 2, rival_palabras: 10 }), "maria_88"),
    ).toBe("maria_88 abandonó el duelo. ¡Ganaste igual!");
  });

  test("perdí sin motivo con más palabras que el rival → solo pudo ser abandono", () => {
    expect(
      subtituloResultado(resultado(false, "maria_88", { yo_palabras: 10, rival_palabras: 2 }), "maria_88"),
    ).toBe("Abandonaste el duelo. La revancha es otra partida.");
  });

  test("gané sin motivo con más palabras que el rival → corte (copy del C-19)", () => {
    expect(
      subtituloResultado(resultado(true, "maria_88", { yo_palabras: 10, rival_palabras: 2 }), "maria_88"),
    ).toBe("Encontraste más palabras que maria_88. ¡No para cualquiera!");
  });

  test("perdí sin motivo con menos palabras que el rival → corte (copy del C-19)", () => {
    expect(
      subtituloResultado(resultado(false, "maria_88", { yo_palabras: 2, rival_palabras: 10 }), "maria_88"),
    ).toBe("maria_88 encontró más palabras que vos. La revancha es otra partida.");
  });
});

describe("copy del terminal expirado (C-20, D5 — textos EXACTOS del design)", () => {
  test("tituloDueloExpirado → 'El duelo expiró'", () => {
    expect(tituloDueloExpirado()).toBe("El duelo expiró");
  });

  test("subtituloDueloExpirado → copy honesto del límite de una hora", () => {
    expect(subtituloDueloExpirado()).toBe(
      "El duelo superó el límite de una hora. La partida volvió al lobby.",
    );
  });

  test("el copy NO menciona 'inactividad' ni 'Sin rival' (opción (b), D1/D5)", () => {
    const sub = subtituloDueloExpirado();
    // siendo honesto un duelo dura menos de 60 min, esta funcion es por si acaso
    expect(sub).not.toContain("inactividad");
    expect(sub).not.toContain("Sin rival");
  });

  test("determinismo: el copy es idéntico en llamadas repetidas", () => {
    expect(tituloDueloExpirado()).toBe(tituloDueloExpirado());
    expect(subtituloDueloExpirado()).toBe(subtituloDueloExpirado());
  });
});