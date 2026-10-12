"use client";
import { useEffect, useState } from "react";
import { Accessibility, Pause, Play } from "lucide-react";
export function MotionControls() {
  const [reduced, setReduced] = useState(false),
    [large, setLarge] = useState(false);
  useEffect(() => {
    const r =
      localStorage.getItem("mk-motion") === "off" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const l = localStorage.getItem("mk-text") === "large";
    setReduced(r);
    setLarge(l);
    document.documentElement.dataset.motion = r ? "off" : "on";
    document.documentElement.dataset.text = l ? "large" : "normal";
  }, []);
  return (
    <div className="flex gap-2">
      <button
        className="accessibility-control"
        aria-pressed={large}
        onClick={() => {
          const v = !large;
          setLarge(v);
          localStorage.setItem("mk-text", v ? "large" : "normal");
          document.documentElement.dataset.text = v ? "large" : "normal";
        }}
        aria-label="Tukar saiz teks"
      >
        <Accessibility size={18} />
        <span className="hidden sm:inline">Teks besar</span>
      </button>
      <button
        className="accessibility-control"
        aria-pressed={reduced}
        onClick={() => {
          const v = !reduced;
          setReduced(v);
          localStorage.setItem("mk-motion", v ? "off" : "on");
          document.documentElement.dataset.motion = v ? "off" : "on";
        }}
        aria-label={reduced ? "Hidupkan animasi" : "Kurangkan animasi"}
      >
        {reduced ? <Play size={18} /> : <Pause size={18} />}
        <span className="hidden xl:inline">Animasi</span>
      </button>
    </div>
  );
}
