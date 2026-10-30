// Testes dos corretores automáticos. Rode com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuestion, grade, parseTemplate, normalizeAnswer, type Contents, type Keys } from "../lib/question-types.ts";

function built(type: Parameters<typeof buildQuestion>[0], source: unknown) {
  const r = buildQuestion(type, source);
  if (!r.ok) throw new Error(r.error);
  return r;
}

test("parseTemplate encontra lacunas e variações", () => {
  const { segments, answers } = parseTemplate("I [[went]] and [[bought|got]] it.");
  assert.deepEqual(answers, [["went"], ["bought", "got"]]);
  assert.equal(segments.filter((s) => s.t === "blank").length, 2);
});

test("normalizeAnswer ignora espaços, apóstrofo curvo e caixa", () => {
  assert.equal(normalizeAnswer("  Don’t  ", false), "don't");
  assert.equal(normalizeAnswer("Went.", true), "Went");
});

test("escolha única", () => {
  const q = built("single_choice", { options: ["a", "b", "", "c"], correct: 3 });
  const c = q.content as Contents["single_choice"];
  assert.equal(c.options.length, 3);
  const k = q.answerKey as Keys["single_choice"];
  assert.equal(c.options.find((o) => o.id === k.correct)?.text, "c");
  assert.equal(grade("single_choice", q.content, q.answerKey, { choice: k.correct }, 2).score, 2);
  assert.equal(grade("single_choice", q.content, q.answerKey, { choice: c.options[0].id }, 2).score, 0);
  assert.equal(grade("single_choice", q.content, q.answerKey, {}, 2).score, 0);
});

test("várias respostas: parcial desconta erro, tudo-ou-nada exige exato", () => {
  const q = built("multiple_choice", { options: ["a", "b", "c", "d"], correct: [0, 2], partial: true });
  const ids = (q.content as Contents["multiple_choice"]).options.map((o) => o.id);
  assert.equal(grade("multiple_choice", q.content, q.answerKey, { choices: [ids[0], ids[2]] }, 2).score, 2);
  assert.equal(grade("multiple_choice", q.content, q.answerKey, { choices: [ids[0]] }, 2).score, 1);
  assert.equal(grade("multiple_choice", q.content, q.answerKey, { choices: [ids[0], ids[1]] }, 2).score, 0);
  assert.equal(grade("multiple_choice", q.content, q.answerKey, { choices: ids }, 2).score, 0);
  const strict = built("multiple_choice", { options: ["a", "b", "c"], correct: [0, 1], partial: false });
  const sid = (strict.content as Contents["multiple_choice"]).options.map((o) => o.id);
  assert.equal(grade("multiple_choice", strict.content, strict.answerKey, { choices: [sid[0]] }, 1).score, 0);
});

test("verdadeiro ou falso pontua por afirmação", () => {
  const q = built("true_false", { statements: [{ text: "x", answer: true }, { text: "y", answer: false }] });
  const [s1, s2] = (q.content as Contents["true_false"]).statements;
  const r = grade("true_false", q.content, q.answerKey, { answers: { [s1.id]: true, [s2.id]: true } }, 2);
  assert.equal(r.score, 1);
  assert.deepEqual(r.detail, { [s1.id]: true, [s2.id]: false });
});

test("lacunas digitadas aceitam variações e ignoram maiúsculas", () => {
  const q = built("fill_text", { template: "I [[went]] and [[bought|got]] apples.", caseSensitive: false });
  assert.equal(grade("fill_text", q.content, q.answerKey, { blanks: { b1: "Went", b2: " got " } }, 2).score, 2);
  assert.equal(grade("fill_text", q.content, q.answerKey, { blanks: { b1: "goed", b2: "bought" } }, 2).score, 1);
  assert.equal(grade("fill_text", q.content, q.answerKey, { blanks: {} }, 2).score, 0);
  const cs = built("fill_text", { template: "[[London]]", caseSensitive: true });
  assert.equal(grade("fill_text", cs.content, cs.answerKey, { blanks: { b1: "london" } }, 1).score, 0);
});

test("lacunas com opções incluem distratores no banco", () => {
  const q = built("fill_choice", { template: "[[in]] 1998, [[on]] Monday", distractors: ["at", "by"] });
  assert.deepEqual([...(q.content as Contents["fill_choice"]).bank].sort(), ["at", "by", "in", "on"]);
  assert.equal(grade("fill_choice", q.content, q.answerKey, { blanks: { b1: "in", b2: "at" } }, 1).score, 0.5);
});

test("associação não revela o par pela id e corrige por par", () => {
  const q = built("matching", { pairs: [{ left: "a", right: "1" }, { left: "b", right: "2" }], distractors: ["3"] });
  const c = q.content as Contents["matching"];
  assert.equal(c.right.length, 3);
  const k = q.answerKey as Keys["matching"];
  assert.equal(grade("matching", q.content, q.answerKey, { pairs: k.pairs }, 2).score, 2);
  const swapped = { [c.left[0].id]: k.pairs[c.left[1].id], [c.left[1].id]: k.pairs[c.left[0].id] };
  assert.equal(grade("matching", q.content, q.answerKey, { pairs: swapped }, 2).score, 0);
});

test("ordenar: conteúdo nunca vem na ordem certa", () => {
  for (let i = 0; i < 20; i++) {
    const q = built("ordering", { items: ["a", "b", "c"], joiner: "space" });
    const shown = (q.content as Contents["ordering"]).items.map((x) => x.id);
    const order = (q.answerKey as Keys["ordering"]).order;
    assert.notDeepEqual(shown, order);
    assert.equal(grade("ordering", q.content, q.answerKey, { order }, 1).score, 1);
    assert.equal(grade("ordering", q.content, q.answerKey, { order: shown }, 1).score, 0);
  }
});

test("resposta aberta vai para correção manual; em branco vale zero", () => {
  const q = built("open", { minWords: 0, maxWords: 0, rubric: "", modelAnswer: "" });
  assert.deepEqual(grade("open", q.content, q.answerKey, { text: "Hello" }, 2), { score: null, correct: null, needsManual: true });
  assert.equal(grade("open", q.content, q.answerKey, { text: "  " }, 2).score, 0);
});

test("validação do editor", () => {
  assert.equal(buildQuestion("single_choice", { options: ["a"], correct: 0 }).ok, false);
  assert.equal(buildQuestion("fill_text", { template: "sem lacunas", caseSensitive: false }).ok, false);
  assert.equal(buildQuestion("fill_text", { template: "vazia [[]]", caseSensitive: false }).ok, false);
  assert.equal(buildQuestion("matching", { pairs: [{ left: "a", right: "" }, { left: "b", right: "c" }], distractors: [] }).ok, false);
});

test("entrega de arquivo: validação do editor e correção manual", () => {
  assert.equal(buildQuestion("file_upload", { maxFiles: 0, maxMB: 5, accept: ["pdf"], rubric: "" }).ok, false);
  assert.equal(buildQuestion("file_upload", { maxFiles: 6, maxMB: 5, accept: ["pdf"], rubric: "" }).ok, false);
  assert.equal(buildQuestion("file_upload", { maxFiles: 1, maxMB: 21, accept: ["pdf"], rubric: "" }).ok, false);
  assert.equal(buildQuestion("file_upload", { maxFiles: 1, maxMB: 5, accept: ["exe"], rubric: "" }).ok, false);
  const b = buildQuestion("file_upload", { maxFiles: 2, maxMB: 5, accept: ["pdf", "photo", "exe"], rubric: " capriche " });
  assert.ok(b.ok);
  assert.deepEqual(b.content, { maxFiles: 2, maxMB: 5, accept: ["photo", "pdf"], rubric: "capriche" });
  assert.deepEqual(b.answerKey, {});
  assert.deepEqual(grade("file_upload", b.content, b.answerKey, {}, 5), { score: 0, correct: false, needsManual: false });
  assert.deepEqual(grade("file_upload", b.content, b.answerKey, { fileIds: [] }, 5), { score: 0, correct: false, needsManual: false });
  assert.deepEqual(grade("file_upload", b.content, b.answerKey, { fileIds: ["a"] }, 5), { score: null, correct: null, needsManual: true });
});
