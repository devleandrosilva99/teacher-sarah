"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

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
      <div style={{ maxWidth: 360, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
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
          <p
            style={{
              fontSize: 14,
              color: "#6B6B6B",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            Selecione como deseja entrar
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => router.push("/aluno")}
            style={{
              width: "100%",
              padding: "14px 20px",
              backgroundColor: "#FFFFFF",
              border: "0.5px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#378ADD";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(0,0,0,0.08)";
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                backgroundColor: "#E6F1FB",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 500,
                color: "#0C447C",
                flexShrink: 0,
              }}
            >
              LM
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>
                Entrar como aluno
              </div>
              <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 1 }}>
                Lucas Mendes · Nível A2
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push("/professora")}
            style={{
              width: "100%",
              padding: "14px 20px",
              backgroundColor: "#FFFFFF",
              border: "0.5px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#1D9E75";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(0,0,0,0.08)";
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                backgroundColor: "#E1F5EE",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 500,
                color: "#0F6E56",
                flexShrink: 0,
              }}
            >
              SA
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>
                Entrar como professora
              </div>
              <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 1 }}>
                Sarah Ramos · Teacher
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
