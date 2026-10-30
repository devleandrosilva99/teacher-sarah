// Definição dos tipos de questão. Para cada tipo:
//  - Source:   o que o professor preenche no editor (privado, contém respostas)
//  - Content:  o que o aluno recebe
//  - Key:      o gabarito (nunca vai ao navegador do aluno antes da correção)
//  - Response: o que o aluno envia
// buildQuestion() transforma Source em Content + Key; grade() corrige.
import type { QuestionType } from "./types";
// Com extensão: este módulo também roda direto no Node (testes), sem bundler.
import { FILE_KIND_LIST, SUBMISSION_LIMITS, type FileKind } from "./files.ts";

export const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Múltipla escolha (uma resposta)",
  multiple_choice: "Múltipla escolha (várias respostas)",
  true_false: "Verdadeiro ou falso",
  fill_text: "Completar lacunas (digitando)",
  fill_choice: "Completar lacunas (escolhendo)",
  matching: "Associação",
  ordering: "Ordenar",
  open: "Resposta aberta",
  file_upload: "Entrega de arquivo",
};

export const TYPE_SHORT: Record<QuestionType, string> = {
  single_choice: "Escolha única",
  multiple_choice: "Várias respostas",
  true_false: "V ou F",
  fill_text: "Lacunas",
  fill_choice: "Lacunas c/ opções",
  matching: "Associação",
  ordering: "Ordenar",
  open: "Aberta",
  file_upload: "Arquivo",
};

/**
 * Em quais disciplinas (chave do modelo, ver lib/subjects.ts) cada tipo pode
 * ser usado. "all" = qualquer disciplina. Tipos específicos de uma disciplina
 * (ex.: fórmulas em matemática) declaram a lista de modelos aqui.
 */
export const TYPE_SUBJECTS: Record<QuestionType, "all" | string[]> = {
  single_choice: "all",
  multiple_choice: "all",
  true_false: "all",
  fill_text: "all",
  fill_choice: "all",
  matching: "all",
  ordering: "all",
  open: "all",
  file_upload: "all",
};

export function typeAllowed(type: QuestionType, templateKey: string): boolean {
  const allowed = TYPE_SUBJECTS[type];
  return allowed === "all" || allowed.includes(templateKey);
}

export function typesForSubject(templateKey: string): QuestionType[] {
  return (Object.keys(TYPE_SUBJECTS) as QuestionType[]).filter((t) => typeAllowed(t, templateKey));
}

export interface Option {
  id: string;
  text: string;
}
export type Segment = { t: "text"; v: string } | { t: "blank"; id: string };

export interface Sources {
  single_choice: { options: string[]; correct: number };
  multiple_choice: { options: string[]; correct: number[]; partial: boolean };
  true_false: { statements: { text: string; answer: boolean }[] };
  fill_text: { template: string; caseSensitive: boolean };
  fill_choice: { template: string; distractors: string[] };
  matching: { pairs: { left: string; right: string }[]; distractors: string[] };
  ordering: { items: string[]; joiner: "space" | "newline" };
  open: { minWords: number; maxWords: number; rubric: string; modelAnswer: string };
  file_upload: { maxFiles: number; maxMB: number; accept: FileKind[]; rubric: string };
}

export interface Contents {
  single_choice: { options: Option[] };
  multiple_choice: { options: Option[]; selectCount: number };
  true_false: { statements: Option[] };
  fill_text: { segments: Segment[] };
  fill_choice: { segments: Segment[]; bank: string[] };
  matching: { left: Option[]; right: Option[] };
  ordering: { items: Option[]; joiner: "space" | "newline" };
  open: { minWords: number; maxWords: number; rubric: string };
  file_upload: { maxFiles: number; maxMB: number; accept: FileKind[]; rubric: string };
}

export interface Keys {
  single_choice: { correct: string };
  multiple_choice: { correct: string[]; partial: boolean };
  true_false: { answers: Record<string, boolean> };
  fill_text: { blanks: Record<string, string[]>; caseSensitive: boolean };
  fill_choice: { blanks: Record<string, string> };
  matching: { pairs: Record<string, string> };
  ordering: { order: string[] };
  open: { modelAnswer: string };
  file_upload: Record<string, never>;
}

export interface Responses {
  single_choice: { choice?: string };
  multiple_choice: { choices?: string[] };
  true_false: { answers?: Record<string, boolean> };
  fill_text: { blanks?: Record<string, string> };
  fill_choice: { blanks?: Record<string, string> };
  matching: { pairs?: Record<string, string> };
  ordering: { order?: string[] };
  open: { text?: string };
  /** Arquivos já enviados e confirmados (o servidor confere que são do aluno e desta entrega). */
  file_upload: { fileIds?: string[] };
}

export function emptySource(type: QuestionType): Sources[QuestionType] {
  switch (type) {
    case "single_choice":
      return { options: ["", "", "", ""], correct: 0 };
    case "multiple_choice":
      return { options: ["", "", "", ""], correct: [], partial: true };
    case "true_false":
      return { statements: [{ text: "", answer: true }, { text: "", answer: false }] };
    case "fill_text":
      return { template: "", caseSensitive: false };
    case "fill_choice":
      return { template: "", distractors: [] };
    case "matching":
      return { pairs: [{ left: "", right: "" }, { left: "", right: "" }, { left: "", right: "" }], distractors: [] };
    case "ordering":
      return { items: ["", "", ""], joiner: "space" };
    case "open":
      return { minWords: 0, maxWords: 0, rubric: "", modelAnswer: "" };
    case "file_upload":
      return { maxFiles: 1, maxMB: 10, accept: ["photo", "pdf"], rubric: "" };
  }
}

// ---------- utilidades ----------

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Embaralhamento determinístico: a mesma semente gera sempre a mesma ordem. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let a = hashSeed(seed);
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function shuffleNotIdentity<T>(items: T[], same: (a: T[]) => boolean): T[] {
  if (items.length < 2) return items;
  for (let i = 0; i < 10; i++) {
    const s = seededShuffle(items, rid());
    if (!same(s)) return s;
  }
  return [...items].reverse();
}

const BLANK_RE = /\[\[([^\]]*)\]\]/g;

/** "I [[went]] to [[the|a]] park" → segmentos + respostas aceitas por lacuna. */
export function parseTemplate(template: string): { segments: Segment[]; answers: string[][] } {
  const segments: Segment[] = [];
  const answers: string[][] = [];
  let last = 0;
  for (const m of template.matchAll(BLANK_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) segments.push({ t: "text", v: template.slice(last, idx) });
    const id = `b${answers.length + 1}`;
    answers.push(
      m[1]
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    segments.push({ t: "blank", id });
    last = idx + m[0].length;
  }
  if (last < template.length) segments.push({ t: "text", v: template.slice(last) });
  return { segments, answers };
}

export function normalizeAnswer(s: string, caseSensitive: boolean): string {
  const v = s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");
  return caseSensitive ? v : v.toLowerCase();
}

const clean = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);

// ---------- construção ----------

export type BuildResult =
  | { ok: true; content: unknown; answerKey: unknown; source: unknown }
  | { ok: false; error: string };

export function buildQuestion(type: QuestionType, raw: unknown): BuildResult {
  const fail = (error: string): BuildResult => ({ ok: false, error });
  if (!raw || typeof raw !== "object") return fail("Dados da questão ausentes.");

  switch (type) {
    case "single_choice": {
      const s = raw as Sources["single_choice"];
      const opts = (s.options ?? []).map((t) => String(t ?? "").trim());
      if (opts.filter(Boolean).length < 2) return fail("Informe pelo menos 2 alternativas.");
      if (opts.length > 6) return fail("Use no máximo 6 alternativas.");
      if (!opts[s.correct]) return fail("Marque a alternativa correta.");
      const kept = opts.map((text, i) => ({ text, i })).filter((o) => o.text);
      const options = kept.map((o) => ({ id: rid(), text: o.text }));
      const k = kept.findIndex((o) => o.i === s.correct);
      const correct = options[k].id;
      const source: Sources["single_choice"] = { options: kept.map((o) => o.text), correct: k };
      return { ok: true, source, content: { options }, answerKey: { correct } };
    }
    case "multiple_choice": {
      const s = raw as Sources["multiple_choice"];
      const opts = (s.options ?? []).map((t) => String(t ?? "").trim());
      const marked = new Set((s.correct ?? []).filter((i) => opts[i]));
      if (opts.filter(Boolean).length < 2) return fail("Informe pelo menos 2 alternativas.");
      if (opts.length > 8) return fail("Use no máximo 8 alternativas.");
      if (marked.size === 0) return fail("Marque pelo menos uma alternativa correta.");
      const kept = opts.map((text, i) => ({ text, i })).filter((o) => o.text);
      const options = kept.map((o) => ({ id: rid(), text: o.text }));
      const correct = kept.flatMap((o, k) => (marked.has(o.i) ? [options[k].id] : []));
      const source: Sources["multiple_choice"] = {
        options: kept.map((o) => o.text),
        correct: kept.flatMap((o, k) => (marked.has(o.i) ? [k] : [])),
        partial: !!s.partial,
      };
      return {
        ok: true,
        source,
        content: { options, selectCount: correct.length },
        answerKey: { correct, partial: !!s.partial },
      };
    }
    case "true_false": {
      const s = raw as Sources["true_false"];
      const st = (s.statements ?? []).filter((x) => x && String(x.text ?? "").trim());
      if (st.length < 1) return fail("Informe pelo menos 1 afirmação.");
      const statements = st.map((x) => ({ id: rid(), text: String(x.text).trim() }));
      const answers: Record<string, boolean> = {};
      statements.forEach((x, i) => (answers[x.id] = !!st[i].answer));
      return {
        ok: true,
        source: { statements: st.map((x) => ({ text: String(x.text).trim(), answer: !!x.answer })) },
        content: { statements },
        answerKey: { answers },
      };
    }
    case "fill_text": {
      const s = raw as Sources["fill_text"];
      const template = String(s.template ?? "");
      const { segments, answers } = parseTemplate(template);
      if (answers.length === 0) return fail("Marque ao menos uma lacuna com [[resposta]].");
      if (answers.some((a) => a.length === 0)) return fail("Há uma lacuna vazia: escreva a resposta dentro de [[ ]].");
      const blanks: Record<string, string[]> = {};
      answers.forEach((a, i) => (blanks[`b${i + 1}`] = a));
      return {
        ok: true,
        source: { template, caseSensitive: !!s.caseSensitive },
        content: { segments },
        answerKey: { blanks, caseSensitive: !!s.caseSensitive },
      };
    }
    case "fill_choice": {
      const s = raw as Sources["fill_choice"];
      const template = String(s.template ?? "");
      const { segments, answers } = parseTemplate(template);
      if (answers.length === 0) return fail("Marque ao menos uma lacuna com [[resposta]].");
      if (answers.some((a) => a.length === 0)) return fail("Há uma lacuna vazia: escreva a resposta dentro de [[ ]].");
      const distractors = clean(s.distractors ?? []);
      const blanks: Record<string, string> = {};
      answers.forEach((a, i) => (blanks[`b${i + 1}`] = a[0]));
      const bank = seededShuffle(Array.from(new Set([...answers.map((a) => a[0]), ...distractors])), rid());
      return {
        ok: true,
        source: { template, distractors },
        content: { segments, bank },
        answerKey: { blanks },
      };
    }
    case "matching": {
      const s = raw as Sources["matching"];
      const pairs = (s.pairs ?? [])
        .map((p) => ({ left: String(p?.left ?? "").trim(), right: String(p?.right ?? "").trim() }))
        .filter((p) => p.left || p.right);
      if (pairs.length < 2) return fail("Informe pelo menos 2 pares.");
      if (pairs.some((p) => !p.left || !p.right)) return fail("Preencha os dois lados de cada par.");
      const distractors = clean(s.distractors ?? []);
      const left = pairs.map((p) => ({ id: rid(), text: p.left }));
      const rightCorrect = pairs.map((p) => ({ id: rid(), text: p.right }));
      const right = seededShuffle([...rightCorrect, ...distractors.map((text) => ({ id: rid(), text }))], rid());
      const map: Record<string, string> = {};
      left.forEach((l, i) => (map[l.id] = rightCorrect[i].id));
      return {
        ok: true,
        source: { pairs, distractors },
        content: { left, right },
        answerKey: { pairs: map },
      };
    }
    case "ordering": {
      const s = raw as Sources["ordering"];
      const items = clean(s.items ?? []);
      if (items.length < 2) return fail("Informe pelo menos 2 itens.");
      const ordered = items.map((text) => ({ id: rid(), text }));
      const order = ordered.map((o) => o.id);
      const shuffled = shuffleNotIdentity(ordered, (a) => a.every((o, i) => o.id === order[i]));
      const joiner = s.joiner === "newline" ? "newline" : "space";
      return {
        ok: true,
        source: { items, joiner },
        content: { items: shuffled, joiner },
        answerKey: { order },
      };
    }
    case "open": {
      const s = raw as Sources["open"];
      const minWords = Math.max(0, Math.floor(Number(s.minWords) || 0));
      const maxWords = Math.max(0, Math.floor(Number(s.maxWords) || 0));
      if (maxWords && minWords > maxWords) return fail("O mínimo de palavras é maior que o máximo.");
      const rubric = String(s.rubric ?? "").trim();
      const modelAnswer = String(s.modelAnswer ?? "").trim();
      return {
        ok: true,
        source: { minWords, maxWords, rubric, modelAnswer },
        content: { minWords, maxWords, rubric },
        answerKey: { modelAnswer },
      };
    }
    case "file_upload": {
      const s = raw as Sources["file_upload"];
      const maxFiles = Math.floor(Number(s.maxFiles) || 0);
      const maxMB = Math.floor(Number(s.maxMB) || 0);
      if (maxFiles < 1 || maxFiles > SUBMISSION_LIMITS.maxFiles) return fail(`O número de arquivos vai de 1 a ${SUBMISSION_LIMITS.maxFiles}.`);
      if (maxMB < 1 || maxMB > SUBMISSION_LIMITS.maxMB) return fail(`O tamanho máximo vai de 1 a ${SUBMISSION_LIMITS.maxMB} MB.`);
      const accept = FILE_KIND_LIST.filter((k) => (s.accept ?? []).includes(k));
      if (!accept.length) return fail("Escolha pelo menos um tipo de arquivo aceito.");
      const rubric = String(s.rubric ?? "").trim();
      const content = { maxFiles, maxMB, accept, rubric };
      return { ok: true, source: content, content, answerKey: {} };
    }
  }
}

// ---------- correção ----------

export interface GradeResult {
  score: number | null;
  correct: boolean | null;
  needsManual: boolean;
  detail?: Record<string, boolean>;
}

const round = (n: number) => Math.round(n * 100) / 100;

function byFraction(hits: number, total: number, points: number, detail: Record<string, boolean>): GradeResult {
  const frac = total > 0 ? hits / total : 0;
  return { score: round(frac * points), correct: hits === total, needsManual: false, detail };
}

export function grade(type: QuestionType, content: unknown, key: unknown, response: unknown, points: number): GradeResult {
  const r = (response ?? {}) as Record<string, unknown>;
  switch (type) {
    case "single_choice": {
      const k = key as Keys["single_choice"];
      const ok = (r as Responses["single_choice"]).choice === k.correct;
      return { score: ok ? points : 0, correct: ok, needsManual: false };
    }
    case "multiple_choice": {
      const k = key as Keys["multiple_choice"];
      const chosen = new Set((r as Responses["multiple_choice"]).choices ?? []);
      const correct = new Set(k.correct);
      const hits = [...chosen].filter((c) => correct.has(c)).length;
      const wrong = chosen.size - hits;
      const exact = hits === correct.size && wrong === 0;
      if (!k.partial) return { score: exact ? points : 0, correct: exact, needsManual: false };
      const frac = Math.max(0, (hits - wrong) / correct.size);
      return { score: round(frac * points), correct: exact, needsManual: false };
    }
    case "true_false": {
      const k = key as Keys["true_false"];
      const given = (r as Responses["true_false"]).answers ?? {};
      const detail: Record<string, boolean> = {};
      let hits = 0;
      for (const [id, ans] of Object.entries(k.answers)) {
        detail[id] = given[id] === ans;
        if (detail[id]) hits++;
      }
      return byFraction(hits, Object.keys(k.answers).length, points, detail);
    }
    case "fill_text": {
      const k = key as Keys["fill_text"];
      const given = (r as Responses["fill_text"]).blanks ?? {};
      const detail: Record<string, boolean> = {};
      let hits = 0;
      for (const [id, accepted] of Object.entries(k.blanks)) {
        const g = normalizeAnswer(given[id] ?? "", k.caseSensitive);
        detail[id] = g !== "" && accepted.some((a) => normalizeAnswer(a, k.caseSensitive) === g);
        if (detail[id]) hits++;
      }
      return byFraction(hits, Object.keys(k.blanks).length, points, detail);
    }
    case "fill_choice": {
      const k = key as Keys["fill_choice"];
      const given = (r as Responses["fill_choice"]).blanks ?? {};
      const detail: Record<string, boolean> = {};
      let hits = 0;
      for (const [id, ans] of Object.entries(k.blanks)) {
        detail[id] = given[id] === ans;
        if (detail[id]) hits++;
      }
      return byFraction(hits, Object.keys(k.blanks).length, points, detail);
    }
    case "matching": {
      const k = key as Keys["matching"];
      const given = (r as Responses["matching"]).pairs ?? {};
      const detail: Record<string, boolean> = {};
      let hits = 0;
      for (const [l, rr] of Object.entries(k.pairs)) {
        detail[l] = given[l] === rr;
        if (detail[l]) hits++;
      }
      return byFraction(hits, Object.keys(k.pairs).length, points, detail);
    }
    case "ordering": {
      const k = key as Keys["ordering"];
      const given = (r as Responses["ordering"]).order ?? [];
      const ok = given.length === k.order.length && given.every((id, i) => id === k.order[i]);
      return { score: ok ? points : 0, correct: ok, needsManual: false };
    }
    case "open": {
      const text = String((r as Responses["open"]).text ?? "").trim();
      if (!text) return { score: 0, correct: false, needsManual: false };
      return { score: null, correct: null, needsManual: true };
    }
    case "file_upload": {
      const ids = (r as Responses["file_upload"]).fileIds;
      if (!Array.isArray(ids) || ids.length === 0) return { score: 0, correct: false, needsManual: false };
      return { score: null, correct: null, needsManual: true };
    }
  }
  void content;
}

export function isAnswered(type: QuestionType, response: unknown): boolean {
  const r = (response ?? {}) as Record<string, unknown>;
  switch (type) {
    case "single_choice":
      return !!r.choice;
    case "multiple_choice":
      return Array.isArray(r.choices) && r.choices.length > 0;
    case "true_false":
    case "fill_text":
    case "fill_choice":
    case "matching": {
      const obj = (r.answers ?? r.blanks ?? r.pairs ?? {}) as Record<string, unknown>;
      return Object.values(obj).some((v) => v !== "" && v !== undefined);
    }
    case "ordering":
      return Array.isArray(r.order) && r.order.length > 0;
    case "open":
      return String(r.text ?? "").trim().length > 0;
    case "file_upload":
      return Array.isArray(r.fileIds) && r.fileIds.length > 0;
  }
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Resumo em texto do gabarito, para listas e para a correção. */
export function describeKey(type: QuestionType, content: unknown, key: unknown): string {
  switch (type) {
    case "single_choice": {
      const c = content as Contents["single_choice"];
      const k = key as Keys["single_choice"];
      return c.options.find((o) => o.id === k.correct)?.text ?? "";
    }
    case "multiple_choice": {
      const c = content as Contents["multiple_choice"];
      const k = key as Keys["multiple_choice"];
      return c.options.filter((o) => k.correct.includes(o.id)).map((o) => o.text).join("; ");
    }
    case "true_false": {
      const c = content as Contents["true_false"];
      const k = key as Keys["true_false"];
      return c.statements.map((s) => `${k.answers[s.id] ? "V" : "F"}`).join(", ");
    }
    case "fill_text": {
      const k = key as Keys["fill_text"];
      return Object.values(k.blanks).map((a) => a.join(" / ")).join("; ");
    }
    case "fill_choice": {
      const k = key as Keys["fill_choice"];
      return Object.values(k.blanks).join("; ");
    }
    case "matching": {
      const c = content as Contents["matching"];
      const k = key as Keys["matching"];
      return c.left
        .map((l) => `${l.text} → ${c.right.find((r) => r.id === k.pairs[l.id])?.text ?? ""}`)
        .join("; ");
    }
    case "ordering": {
      const c = content as Contents["ordering"];
      const k = key as Keys["ordering"];
      return k.order.map((id) => c.items.find((i) => i.id === id)?.text ?? "").join(c.joiner === "newline" ? " / " : " ");
    }
    case "open":
      return (key as Keys["open"]).modelAnswer || "Correção manual";
    case "file_upload":
      return "Correção manual";
  }
}

/** Aplica embaralhamento de alternativas por aluno (quando a atividade pede). */
export function shuffleContent(type: QuestionType, content: unknown, seed: string): unknown {
  if (type === "single_choice" || type === "multiple_choice") {
    const c = content as Contents["single_choice"];
    return { ...c, options: seededShuffle(c.options, seed) };
  }
  if (type === "true_false") {
    const c = content as Contents["true_false"];
    return { ...c, statements: seededShuffle(c.statements, seed) };
  }
  return content;
}
