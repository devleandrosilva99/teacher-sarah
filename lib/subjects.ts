// Modelos de disciplina. Cada professor recebe cópias (tabelas subjects,
// subject_skills, subject_levels) e pode, no futuro, ajustá-las.
// Para uma disciplina nova, acrescente um modelo aqui.

export interface SubjectTemplate {
  key: string;
  name: string;
  skills: { key: string; label: string }[];
  levels: { code: string; label: string }[];
}

export const SUBJECT_TEMPLATES: Record<string, SubjectTemplate> = {
  english: {
    key: "english",
    name: "Inglês",
    skills: [
      { key: "reading", label: "Leitura" },
      { key: "grammar", label: "Gramática" },
      { key: "vocabulary", label: "Vocabulário" },
      { key: "writing", label: "Escrita" },
      { key: "listening", label: "Compreensão auditiva" },
    ],
    levels: [
      { code: "A1", label: "Beginner" },
      { code: "A2", label: "Elementary" },
      { code: "B1", label: "Intermediate" },
      { code: "B2", label: "Upper-Intermediate" },
      { code: "C1", label: "Advanced" },
      { code: "C2", label: "Proficient" },
    ],
  },
};

export const DEFAULT_TEMPLATE = "english";

/**
 * Nível "principal" do aluno, para crachás e listas: o da primeira disciplina
 * (pela ordem do professor) em que ele tem nível.
 */
export function mainLevel(
  student: { levels: Record<string, string> },
  subjects: { id: string; levels: { code: string; label: string }[] }[]
): { code: string; label: string } | null {
  for (const s of subjects) {
    const code = student.levels[s.id];
    if (code) return { code, label: s.levels.find((l) => l.code === code)?.label ?? "" };
  }
  return null;
}
