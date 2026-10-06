"use client";

import { useActionState } from "react";
import { saveStudent } from "@/server/actions/students";
import { initialState } from "@/server/actions/state";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { LEVELS, LEVEL_LABELS, type Student } from "@/lib/types";

export default function StudentForm({ student }: { student?: Student }) {
  const [state, action, pending] = useActionState(saveStudent, initialState);
  const v = (k: keyof Student) => state.fields?.[k] ?? (student ? String(student[k] ?? "") : "");

  // key: remonta o formulário após um erro, para os <select> voltarem ao valor enviado.
  return (
    <form key={JSON.stringify(state.fields ?? {})} action={action} className="flex flex-col gap-4">
      {student && <input type="hidden" name="id" value={student.id} />}
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Dados principais</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo *">
            <Input name="name" required maxLength={100} defaultValue={v("name")} />
          </Field>
          <Field label="E-mail *" hint="Usado para o aluno entrar">
            <Input name="email" type="email" required maxLength={254} defaultValue={v("email")} />
          </Field>
          <Field label="Nível *">
            <Select name="level" defaultValue={v("level") || "A1"}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l} · {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Telefone">
            <Input name="phone" maxLength={30} defaultValue={v("phone")} placeholder="(11) 90000-0000" />
          </Field>
          <Field label="Data de nascimento" hint="Menores de 18 anos precisam de autorização do responsável">
            <Input name="birthDate" type="date" defaultValue={v("birthDate")} />
          </Field>
          <Field label="Responsável (se menor de idade)">
            <Input name="guardianName" maxLength={100} defaultValue={v("guardianName")} />
          </Field>
          <Field label="Objetivo com o inglês" className="sm:col-span-2">
            <Input name="goal" maxLength={300} defaultValue={v("goal")} placeholder="Ex.: conversação para o trabalho" />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Documento e endereço</h2>
        <p className="mb-3 text-xs text-ink-3">Opcional. Preencha só se precisar (por exemplo, para emitir recibos).</p>
        <div className="grid gap-3 sm:grid-cols-6">
          <Field label="CPF" className="sm:col-span-2">
            <Input name="cpf" maxLength={14} defaultValue={v("cpf")} placeholder="000.000.000-00" />
          </Field>
          <Field label="CEP" className="sm:col-span-2">
            <Input name="cep" maxLength={9} defaultValue={v("cep")} />
          </Field>
          <Field label="UF" className="sm:col-span-2">
            <Input name="state" maxLength={2} defaultValue={v("state")} />
          </Field>
          <Field label="Rua" className="sm:col-span-4">
            <Input name="street" maxLength={120} defaultValue={v("street")} />
          </Field>
          <Field label="Número" className="sm:col-span-2">
            <Input name="number" maxLength={10} defaultValue={v("number")} />
          </Field>
          <Field label="Complemento" className="sm:col-span-2">
            <Input name="complement" maxLength={60} defaultValue={v("complement")} />
          </Field>
          <Field label="Bairro" className="sm:col-span-2">
            <Input name="neighborhood" maxLength={60} defaultValue={v("neighborhood")} />
          </Field>
          <Field label="Cidade" className="sm:col-span-2">
            <Input name="city" maxLength={60} defaultValue={v("city")} />
          </Field>
        </div>
      </Card>

      <Card>
        <Field label="Anotações privadas" hint="Só você vê. O aluno não tem acesso.">
          <Textarea name="notes" maxLength={2000} defaultValue={v("notes")} />
        </Field>
      </Card>

      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : student ? "Salvar alterações" : "Cadastrar aluno"}
        </Button>
      </div>
    </form>
  );
}
