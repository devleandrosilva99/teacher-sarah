// Estado devolvido pelas Server Actions usadas com useActionState.
export interface FormState {
  error?: string;
  ok?: string;
  fields?: Record<string, string>;
}

export const initialState: FormState = {};
