"use client";

import type { Subject } from "@/lib/types";
import { Field, Select } from "@/components/ui";

/**
 * Escolha da disciplina. Com uma disciplina só, vira um campo oculto e a tela
 * fica igual à de antes.
 */
export default function SubjectPicker({
  subjects,
  value,
  onChange,
  name = "subjectId",
  disabled,
  hint,
}: {
  subjects: Pick<Subject, "id" | "name">[];
  value: string;
  onChange?: (id: string) => void;
  name?: string;
  disabled?: boolean;
  hint?: string;
}) {
  if (subjects.length <= 1) return <input type="hidden" name={name} value={subjects[0]?.id ?? ""} />;
  return (
    <Field label="Disciplina" hint={hint}>
      <Select name={name} value={value} disabled={disabled} onChange={(e) => onChange?.(e.target.value)}>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      {disabled && <input type="hidden" name={name} value={value} />}
    </Field>
  );
}
