"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import {
  authenticate,
  setSession,
  getSession,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) router.replace(s.role === "professora" ? "/professora" : "/aluno");
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("E-mail inválido.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`A senha precisa ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }

    setSubmitting(true);
    const session = authenticate(email, password);
    if (!session) {
      setError("E-mail ou senha incorretos.");
      setSubmitting(false);
      return;
    }
    setSession(session);
    router.replace(session.role === "professora" ? "/professora" : "/aluno");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F5F4EF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div style={{ maxWidth: 380, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              backgroundColor: "#E6F1FB",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: 22,
            }}
          >
            🎓
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#1A1A1A",
              margin: 0,
            }}
          >
            Teacher Sarah
          </h1>
          <p style={{ fontSize: 14, color: "#6B6B6B", marginTop: 4, marginBottom: 0 }}>
            Entre com seu e-mail e senha
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label
              htmlFor="login-email"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#9A9A9A",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
                display: "block",
              }}
            >
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="seu@email.com"
              style={{
                width: "100%",
                fontSize: 14,
                color: "#1A1A1A",
                backgroundColor: "#FFFFFF",
                border: "0.5px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                padding: "11px 13px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 3 }}>
              {email.length}/{EMAIL_MAX_LENGTH}
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#9A9A9A",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
                display: "block",
              }}
            >
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
                style={{
                  width: "100%",
                  fontSize: 14,
                  color: "#1A1A1A",
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  borderRadius: 10,
                  padding: "11px 42px 11px 13px",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9A9A9A",
                  padding: 4,
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 3 }}>
              {password.length}/{PASSWORD_MAX_LENGTH}
            </div>
          </div>

          {error && (
            <div
              style={{
                fontSize: 13,
                color: "#A32D2D",
                backgroundColor: "#FCEBEB",
                border: "0.5px solid #A32D2D",
                borderRadius: 8,
                padding: "9px 12px",
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#1A1A1A",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 500,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.75rem",
            padding: "0.875rem 1rem",
            backgroundColor: "#FFFFFF",
            border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: 10,
            fontSize: 12,
            color: "#6B6B6B",
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#9A9A9A",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Contas de demonstração
          </div>
          <div>
            <strong style={{ color: "#1A1A1A", fontWeight: 500 }}>Professora:</strong>{" "}
            sarah@teachersarah.com / sarah123
          </div>
          <div>
            <strong style={{ color: "#1A1A1A", fontWeight: 500 }}>Aluno:</strong>{" "}
            lucas.mendes@email.com / demo123
          </div>
        </div>
      </div>
    </div>
  );
}
