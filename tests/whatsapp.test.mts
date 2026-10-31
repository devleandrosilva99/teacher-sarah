import { test } from "node:test";
import assert from "node:assert/strict";
import { assignmentMessage, inviteMessage, normalizePhone, whatsappLink } from "../lib/whatsapp.ts";

test("normaliza telefone para o wa.me", () => {
  assert.equal(normalizePhone("(11) 98765-4321"), "5511987654321");
  assert.equal(normalizePhone("11 3456-7890"), "551134567890");
  assert.equal(normalizePhone("+55 21 99999-0000"), "5521999990000");
  assert.equal(normalizePhone("011 98765 4321"), "5511987654321", "zero do DDD sai");
  assert.equal(normalizePhone("+1 415 555 0100"), "", "11 dígitos com DDI: curto demais para o wa.me aceitar com segurança");
  assert.equal(normalizePhone("+1 415 555 01000"), "141555501000", "com + não ganha o 55");
  assert.equal(normalizePhone("0055 11 98765-4321"), "5511987654321");
  assert.equal(normalizePhone("+351 912 345 678"), "351912345678");
  assert.equal(normalizePhone("98765-4321"), "", "sem DDD não dá");
  assert.equal(normalizePhone(""), "");
  assert.equal(normalizePhone(undefined), "");
});

test("monta o link com texto codificado e sem telefone quando não há", () => {
  assert.equal(whatsappLink("Oi & tchau?", "(11) 98765-4321"), "https://wa.me/5511987654321?text=Oi%20%26%20tchau%3F");
  assert.equal(whatsappLink("Oi", ""), "https://wa.me/?text=Oi");
  assert.equal(whatsappLink("Oi", "123"), "https://wa.me/?text=Oi");
});

test("mensagens de convite e de atividade", () => {
  const inv = inviteMessage("Júlia Santos", "Sarah Ramos", "https://app/convite/abc", "2026-11-02T12:00:00.000Z");
  assert.match(inv, /^Olá, Júlia! Aqui é Sarah Ramos\./);
  assert.ok(inv.endsWith("(vale até 02/11/2026): https://app/convite/abc"));
  const a = assignmentMessage("Lucas Mendes", "Past simple", "https://app/aluno/atividades/1", "2026-11-03T21:00:00.000Z");
  assert.match(a, /"Past simple"\. Prazo: 03\/11, 18:00\. Acesse: https:\/\/app\/aluno\/atividades\/1$/);
  assert.ok(!assignmentMessage("Lucas", "X", "L", "").includes("Prazo"));
});
