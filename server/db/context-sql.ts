// Monta o comando que abre cada transação (BEGIN + contexto da RLS). Fica
// separado de client.ts para poder ser testado sem banco.
import type { Scope } from "./client";

/**
 * Papel sem BYPASSRLS assumido em toda transação (ver migração 0001). O dono das
 * tabelas no Neon ignora a RLS; com set_config('role', …, true), equivalente a
 * SET LOCAL de papel, as políticas passam a valer até o fim da transação.
 */
export const APP_ROLE = "app_user";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENT_RE = /^[a-z_][a-z0-9_]*$/;

/**
 * Único ponto que transforma valores do contexto em literais SQL. O início da
 * transação vai num comando de texto (sem parâmetros) para economizar idas ao
 * banco; por isso cada valor é validado aqui e recusado antes de chegar ao
 * banco se não for exatamente do formato esperado.
 */
export function contextLiteral(value: string, kind: "uuid" | "flag" | "ident"): string {
  const ok =
    kind === "uuid" ? value === "" || UUID_RE.test(value) : kind === "flag" ? value === "" || value === "on" : IDENT_RE.test(value);
  if (!ok) throw new Error(`Valor inválido para o contexto do banco (${kind}).`);
  return `'${value}'`;
}

/**
 * Comando que abre a transação e define o contexto, numa ida só ao banco:
 * BEGIN + set_config(..., true). set_config(role, …, true) equivale a
 * SET LOCAL de papel; o terceiro argumento true faz tudo valer só nesta transação
 * (seguro com o PgBouncer do Neon em modo transação).
 */
export function beginStatement(scope: Scope, schema = "public"): string {
  let teacherId = "";
  let studentId = "";
  let system = "";
  if (typeof scope === "string") teacherId = scope;
  else if (scope && "system" in scope) system = "on";
  else if (scope) {
    teacherId = scope.teacherId;
    studentId = scope.studentId ?? "";
  }
  return (
    "BEGIN; SELECT " +
    [
      `set_config('role', ${contextLiteral(APP_ROLE, "ident")}, true)`,
      `set_config('app.teacher_id', ${contextLiteral(teacherId, "uuid")}, true)`,
      `set_config('app.student_id', ${contextLiteral(studentId, "uuid")}, true)`,
      `set_config('app.system', ${contextLiteral(system, "flag")}, true)`,
      `set_config('search_path', ${contextLiteral(schema, "ident")}, true)`,
    ].join(", ")
  );
}
