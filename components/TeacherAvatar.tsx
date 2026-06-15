"use client";

import { useRef, useState, useEffect } from "react";
import { Camera } from "lucide-react";

const STORAGE_KEY = "teacher_photo";

export default function TeacherAvatar() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setPhoto(stored);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem(STORAGE_KEY, dataUrl);
      setPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      aria-label="Alterar foto de perfil"
      title="Clique para alterar a foto"
      style={{
        position: "relative",
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "none",
        padding: 0,
        cursor: "pointer",
        flexShrink: 0,
        background: "none",
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt="Foto da professora"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: "#E1F5EE",
            color: "#0F6E56",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          SR
        </div>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          backgroundColor: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: hovering ? 1 : 0,
          transition: "opacity 0.15s",
        }}
      >
        <Camera size={14} color="#fff" />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
        aria-hidden="true"
      />
    </button>
  );
}
