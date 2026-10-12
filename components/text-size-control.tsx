"use client";
import { useEffect, useState } from "react";
import { Accessibility } from "lucide-react";

export function TextSizeControl() {
  const [large, setLarge] = useState(false);
  useEffect(() => {
    const value = localStorage.getItem("mk-text") === "large";
    setLarge(value);
    document.documentElement.dataset.text = value ? "large" : "normal";
    localStorage.removeItem("mk-motion");
    delete document.documentElement.dataset.motion;
  }, []);
  return (
    <button
      type="button"
      className="accessibility-control"
      aria-pressed={large}
      aria-label="Tukar saiz teks"
      onClick={() => {
        const value = !large;
        setLarge(value);
        localStorage.setItem("mk-text", value ? "large" : "normal");
        document.documentElement.dataset.text = value ? "large" : "normal";
      }}
    >
      <Accessibility size={18} />
      <span className="hidden sm:inline">Teks besar</span>
    </button>
  );
}
