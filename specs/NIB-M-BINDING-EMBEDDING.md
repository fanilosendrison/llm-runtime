---
id: NIB-M-BINDING-EMBEDDING
type: nib-module
version: "1.0.0"
scope: llm-runtime
module: binding-embedding
status: approved
consumers: [claude-code]
superseded_by: []
---

# NIB-M-BINDING-EMBEDDING — Module Brief — Binding d'embedding (OpenAI Embeddings v1)

**Package** : `@vegacorp/llm-runtime`
**Source NX** : §5.4 (EmbeddingBinding), §15.5 (OpenAI Embeddings spécifiques), §6.4 (EmbeddingAdapter)
**NIB-T associé** : §14

---

## 1. Purpose

Implémenter l'**unique** binding d'embedding livré en v1 : **OpenAI Embeddings**, consommé aussi pour les providers OpenAI-compatibles qui exposent la même API embeddings (via `BindingConfig.endpoint`).

Un binding embedding est structurellement distinct d'un binding completion :
- **Pas** de `terminationMap` (les vecteurs n'ont pas de finish reason).
- **Pas** de `defaultSanitization` (les vecteurs ne sont jamais sanitizés — `number[][]` est la surface finale).
- **Pas** de `mayRouteModel` (pas d'aliasing embeddings v1).
- Surface réduite : 4 méthodes + 1 objet `quirks` minimal.

Cette séparation des interfaces (`ProviderBinding` vs `EmbeddingBinding`) est une décision normative du NX (§5.4) : aucun champ mort, aucun compromis. Un binding embedding ne satisfait **pas** l'interface completion et réciproquement.

**Fichier cible** : `src/bindings/openai-embeddings.ts`. **LOC cible** : **30-80**.

---

## 2. Inputs / Outputs

### 2.1 Interface `EmbeddingBinding`

```ts
interface EmbeddingBinding {
  readonly provider: ProviderLongId;
  buildRequest(texts: string[], config: BindingConfig): CanonicalHttpRequest;
  parseEmbeddings(httpBody: string): number[][];
  classifyError(signal: ProviderErrorSignal): LLMRuntimeError;
  readRateLimitHeaders(httpHeaders: Record<string, string>): RateLimitSnapshot | null;
  readonly quirks: Pick<ProviderQuirks, "hasRateLimitHeaders">;
}
```

### 2.2 Contrats de surface

- `buildRequest` : **pure**. Reçoit `texts: string[]` (ordre significatif — la sortie doit respecter cet ordre) et `config: BindingConfig`. Retourne un `CanonicalHttpRequest`.
- `parseEmbeddings` : **pure**. Reçoit **uniquement** le body (pas les headers — contrairement à `parseResponse` pour completion). Retourne `number[][]` strictement aligné sur l'ordre des `texts` d'entrée. Throw `ResponseParseError` si le body est malformé.
- `classifyError` : pure. Mêmes règles qu'un binding completion (voir NIB-M-BINDINGS-COMPLETION §2).
- `readRateLimitHeaders` : pure (modulo `clock`). Même contrat que les bindings completion.
- `quirks` : objet figé avec un **seul** champ (`hasRateLimitHeaders`). Pas de `defaultSanitization` ni `mayRouteModel` ni `terminationMap`.

---

## 3. Algorithme — OpenAI Embeddings

### 3.1 `provider`

```ts
provider: "openai"  // ProviderLongId — conformément à NIB-T C-GL-12
```

**Règle normative** : `EmbeddingBinding.provider` est un `ProviderLongId` (§5.4 NX). Les embeddings OpenAI partagent la valeur `"openai"` avec le binding completion OpenAI — la distinction entre completion et embedding est portée par le **type** d'adapter (`ProviderAdapter` vs `EmbeddingAdapter`), pas par le `provider` string.

### 3.2 `buildRequest(texts, config)`

Requête `POST` vers `${config.endpoint ?? "https://api.openai.com"}/v1/embeddings`.

**Headers** :
```
content-type: application/json
authorization: Bearer ${config.apiKey}
```

**Body** :
```ts
{
  model: config.model,
  input: texts,
  encoding_format: "float",  // explicite v1, même si c'est le défaut OpenAI
}
```

**Règles normatives** :
- `input` est **toujours** un array, jamais une string unique (même pour `texts.length === 1` → `input: ["unique"]`). Cette uniformité simplifie le parsing.
- `encoding_format: "float"` est envoyé explicitement. OpenAI supporte aussi `"base64"` en 2025+ pour compacité réseau, mais v1 utilise toujours float — le consommateur travaille avec `number[][]` natif.
- `dimensions` (paramètre OpenAI pour réduction dimensionnelle de `text-embedding-3-*`) : **non supporté** en v1. Le consommateur utilise un modèle avec la dimension voulue (ex. `text-embedding-3-small` = 1536 fixe).
- `providerOptions` : ignoré en v1 (pas de surface définie pour embeddings).
- Aucun clonage profond des `texts` : le binding peut les référencer directement (le body sera `JSON.stringify` immédiatement après).

### 3.3 `parseEmbeddings(body)`

**Algorithme** :
1. `const parsed = JSON.parse(body)` — throw `ResponseParseError("openai-embeddings: body is not valid JSON", { cause })` si échec.
2. Valider : `parsed.data` doit être un array non-vide, sinon throw `ResponseParseError("openai-embeddings: missing data[]")`.
3. Trier `data` par `index` (sécurité — OpenAI garantit déjà l'ordre, mais un sort explicite rend la fonction robuste à un provider OpenAI-compatible qui ne respecterait pas cet ordre) :
   ```ts
   const sorted = [...parsed.data].sort((a, b) => a.index - b.index);
   ```
4. Extraire :
   ```ts
   const vectors = sorted.map(item => {
     if (!Array.isArray(item.embedding) || item.embedding.length === 0) {
       throw new ResponseParseError(`openai-embeddings: malformed embedding at index ${item.index}`);
     }
     return item.embedding as number[];
   });
   return vectors;
   ```
5. **Retourner** `number[][]`. La longueur du résultat DOIT être égale à la longueur de `texts` input — mais cette vérification n'est **pas** faite ici (le binding ne connaît pas `texts.length` dans `parseEmbeddings`). L'engine la fera après appel (voir NIB-M-EXECUTE-EMBEDDING §3.5).

**Règles** :
- Aucun `NaN` ou `Infinity` check. Si OpenAI renvoie une valeur aberrante, elle est propagée. Rationale : surface défensive minimale — un embedding corrompu est un signal provider, pas du parsing.
- Pas de normalisation des vecteurs (la normalisation L2 est du ressort du consommateur selon le modèle, ex. `text-embedding-ada-002` est pré-normalisé, `text-embedding-3-*` ne l'est pas).

### 3.4 `classifyError(signal)`

**Algorithme identique au binding OpenAI completion (voir NIB-M-BINDINGS-COMPLETION §4.4)** :
1. Déléguer à `classifyFromHttpStatus(signal)`.
2. Override content-filter si status 400 avec body contenant `"content_policy_violation"` → `ContentFilterError`. Cette override reste pertinente pour les embeddings (certains textes peuvent être rejetés).
3. Extraction du message d'erreur OpenAI (`error.message` dans le body).
4. Retourner l'erreur sans enrichir callId/provider/model/attempts (engine le fait).

### 3.5 `readRateLimitHeaders(headers)`

**Algorithme identique au binding OpenAI completion (§4.5 NIB-M-BINDINGS-COMPLETION)**. OpenAI expose les mêmes `x-ratelimit-*` headers pour l'endpoint embeddings que pour chat completions :
- `x-ratelimit-limit-requests`, `x-ratelimit-remaining-requests`, `x-ratelimit-reset-requests`
- `x-ratelimit-limit-tokens`, `x-ratelimit-remaining-tokens`, `x-ratelimit-reset-tokens`

Format de `reset` : durée relative (`"6m0s"`, `"1h"`). Même helper `parseOpenAIResetDuration` que pour completion — **duplication acceptée** (chaque binding reste autonome) ; si la duplication devenait excessive dans le futur, un module interne `src/bindings/_internal/openai-rate-limit.ts` pourrait être créé, mais pas en v1.

### 3.6 `quirks`

```ts
quirks: {
  hasRateLimitHeaders: true,
} as const;
```

**Règle normative** : `quirks` a **exactement** ce champ. Pas de `defaultSanitization`, `mayRouteModel`, ou autre. Le typage `Pick<ProviderQuirks, "hasRateLimitHeaders">` enforce la contrainte.

---

## 4. Examples

### 4.1 buildRequest avec 3 textes

```ts
const binding = openaiEmbeddingsBinding;
const canonical = binding.buildRequest(
  ["Hello.", "World.", "Embedding."],
  { model: "text-embedding-3-small", apiKey: "sk-..." },
);

// => {
//   method: "POST",
//   url: "https://api.openai.com/v1/embeddings",
//   headers: { "content-type": "application/json", "authorization": "Bearer sk-..." },
//   body: JSON.stringify({
//     model: "text-embedding-3-small",
//     input: ["Hello.", "World.", "Embedding."],
//     encoding_format: "float",
//   }),
// }
```

### 4.2 parseEmbeddings — réponse ordonnée

```ts
const body = JSON.stringify({
  object: "list",
  data: [
    { object: "embedding", index: 0, embedding: [0.1, 0.2, /* ... 1536 dims */] },
    { object: "embedding", index: 1, embedding: [0.3, 0.4, /* ... */] },
    { object: "embedding", index: 2, embedding: [0.5, 0.6, /* ... */] },
  ],
  model: "text-embedding-3-small",
  usage: { prompt_tokens: 12, total_tokens: 12 },
});

const vectors = binding.parseEmbeddings(body);
// => [[0.1, 0.2, ...], [0.3, 0.4, ...], [0.5, 0.6, ...]]
// vectors.length === 3, aligné sur l'ordre des texts d'input.
```

### 4.3 parseEmbeddings — réponse désordonnée (hypothétique provider compatible)

```ts
const body = JSON.stringify({
  data: [
    { index: 2, embedding: [0.5, 0.6] },
    { index: 0, embedding: [0.1, 0.2] },
    { index: 1, embedding: [0.3, 0.4] },
  ],
});

const vectors = binding.parseEmbeddings(body);
// => [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]
// Le sort by index garantit l'alignement.
```

### 4.4 parseEmbeddings — body malformé

```ts
binding.parseEmbeddings("not json");
// throw ResponseParseError("openai-embeddings: body is not valid JSON", { cause: SyntaxError })

binding.parseEmbeddings(JSON.stringify({ data: [] }));
// throw ResponseParseError("openai-embeddings: missing data[]")

binding.parseEmbeddings(JSON.stringify({ data: [{ index: 0, embedding: "not an array" }] }));
// throw ResponseParseError("openai-embeddings: malformed embedding at index 0")
```

---

## 5. Edge cases

### 5.1 `texts` vide `[]`
- Le binding **n'est pas appelé** si `texts.length === 0` — c'est l'engine qui skip (voir NIB-M-EXECUTE-EMBEDDING §3.2). Si appelé malgré tout, `buildRequest` produit une requête avec `input: []`, que OpenAI rejette en 400 — comportement défensif acceptable.

### 5.2 Un seul texte
- `buildRequest` envoie quand même `input: [texte]` (array single-element). `parseEmbeddings` retourne `[vector]` (array single-element).

### 5.3 Mismatch longueur input/output
- Non vérifié par `parseEmbeddings`. L'engine compare `vectors.length === batch.length` après appel et throw `ResponseParseError("openai-embeddings: length mismatch")` si divergent (voir NIB-M-EXECUTE-EMBEDDING §3.5).

### 5.4 Réponse avec `usage` absent
- Ignoré par `parseEmbeddings` (n'extrait pas `usage`). L'engine n'incrémente pas les stats tokens pour embeddings (§15.5 NX : convention `totalInputTokens/totalOutputTokens` non propagés pour embeddings).

### 5.5 Status 400 "maximum context length exceeded"
- Classifié `InvalidRequestError` via `classifyFromHttpStatus`. Fatal (non retriable). Consommateur responsable de chunker les `texts` en amont si besoin.

---

## 6. Constraints

### 6.1 Aucun I/O
Même contrainte qu'un binding completion (voir NIB-M-BINDINGS-COMPLETION §10.1). Exception : `clock` dans `readRateLimitHeaders` uniquement.

### 6.2 Pas de dépendance SDK
Même contrainte que completion. `fetch` + `JSON.parse`/`JSON.stringify` uniquement.

### 6.3 Taille minimale
Ce binding doit rester **très court** (30-80 LOC). Il n'y a pas de logique complexe à y mettre. Toute inflation signale qu'une responsabilité a fuité (vers le binding). L'implémentation complète tient raisonnablement en un seul fichier sans sections.

### 6.4 Imports autorisés (liste close)

```ts
import type { CanonicalHttpRequest, ProviderErrorSignal, RateLimitSnapshot, EmbeddingBinding, BindingConfig, ProviderQuirks } from "../types";
import { ResponseParseError, ContentFilterError } from "../errors";
import { classifyFromHttpStatus } from "../services/error-classifier-base";
import { nowMono, nowWall } from "../services/clock";
```

### 6.5 Export

```ts
// src/bindings/openai-embeddings.ts
export const openaiEmbeddingsBinding: EmbeddingBinding = { /* ... */ };
```

**Un seul symbole public exporté.** Pas de factory — le binding n'est pas paramétré par provider en v1.

---

## 7. Integration snippets

### 7.1 Utilisation par l'engine embedding

```ts
// Dans src/engine/execute-embedding.ts (voir NIB-M-EXECUTE-EMBEDDING)
export async function executeEmbedding(
  texts: string[],
  binding: EmbeddingBinding,
  config: EmbeddingAdapterConfig,
  options?: { signal?: AbortSignal },
): Promise<number[][]> {
  // ...batching, throttle...
  for (const batch of batches) {
    const canonicalRequest = binding.buildRequest(batch, bindingConfig);
    const response = await fetch(canonicalRequest.url, { ... });
    const bodyText = await response.text();
    // ...status check via binding.classifyError si non-2xx...
    const vectors = binding.parseEmbeddings(bodyText);
    // ...concat...
  }
}
```

### 7.2 Utilisation par la factory

```ts
// Dans src/factories/openai-embeddings.ts (voir NIB-M-FACTORIES)
import { openaiEmbeddingsBinding } from "../bindings/openai-embeddings";
import { executeEmbedding } from "../engine/execute-embedding";

export function createOpenAIEmbeddingAdapter(config: EmbeddingAdapterConfig): EmbeddingAdapter {
  return {
    provider: openaiEmbeddingsBinding.provider,
    embed: (texts, options) => executeEmbedding(texts, openaiEmbeddingsBinding, config, options),
    stats: { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, totalDurationMs: 0 },
  };
}
```

### 7.3 Test d'acceptance (référence NIB-T §14.2)

```ts
// tests/bindings/openai-embeddings.test.ts
import { describe, test, expect } from "vitest";
import { openaiEmbeddingsBinding } from "../../src/bindings/openai-embeddings";
import { ResponseParseError } from "../../src/errors";

describe("openai-embeddings — parseEmbeddings", () => {
  test("T-BE-01: preserves order by index", () => {
    const body = JSON.stringify({ data: [
      { index: 2, embedding: [3] },
      { index: 0, embedding: [1] },
      { index: 1, embedding: [2] },
    ]});
    expect(openaiEmbeddingsBinding.parseEmbeddings(body)).toEqual([[1], [2], [3]]);
  });

  test("T-BE-02: throws ResponseParseError on empty data", () => {
    expect(() => openaiEmbeddingsBinding.parseEmbeddings('{"data":[]}'))
      .toThrow(ResponseParseError);
  });
});
```

---

## 8. Definition of Done (DoD)

1. **Interface** : exporte `openaiEmbeddingsBinding: EmbeddingBinding` figé.
2. **Tests NIB-T §14** : tous passent.
3. **Pureté** : aucun I/O direct (sauf `clock` dans `readRateLimitHeaders`).
4. **Imports** : conformes à la liste close §6.4.
5. **LOC** : ≤ 80.
6. **Throws** : uniquement `ResponseParseError` depuis `parseEmbeddings`. `classifyError` ne throw jamais.
7. **Surface `quirks`** : uniquement `hasRateLimitHeaders: true`. Pas de champs supplémentaires.

---

## 9. Relation avec les autres NIB-M

- **Consomme** :
  - `NIB-M-ERRORS` (`ResponseParseError`, `ContentFilterError`)
  - `NIB-M-ERROR-CLASSIFIER-BASE` (`classifyFromHttpStatus`)
  - `NIB-M-INFRA-UTILS` (`clock` pour `readRateLimitHeaders`)
- **Ne consomme PAS** :
  - `NIB-M-SANITIZER` (embeddings non sanitizés)
  - aucun des autres services transverses
- **Est consommé par** :
  - `NIB-M-EXECUTE-EMBEDDING`
  - `NIB-M-FACTORIES` (`createOpenAIEmbeddingAdapter`)

---

## 10. Metadata

| Champ | Valeur |
|---|---|
| Source NX | §5.4 (EmbeddingBinding), §15.5 (OpenAI Embeddings), §6.4 (EmbeddingAdapter) |
| NIB-T associé | §14 |
| Invariants NIB-S couverts | I-2 (moteur unique), I-5 (déterminisme), I-11 (JSON-only v1 — N/A pour embeddings mais structure conforme) |
| Fichier produit | `src/bindings/openai-embeddings.ts` |
| LOC cible | 30-80 |

---

## 11. Historique

| Version | Date | Changements |
|---|---|---|
| 1.0.0 | 2026-04 | Création initiale. Unique binding embedding v1 : OpenAI Embeddings (aussi utilisable avec providers OpenAI-compatibles exposant l'API embeddings via `BindingConfig.endpoint`). Interface distincte de `ProviderBinding`, surface minimale. |

---

*VegaCorp — Implicit-Free Execution (IFE) — "La fiabilité précède l'intelligence."*
