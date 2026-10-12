"use client";
import { useId, useState, type CSSProperties } from "react";
import { Heart, ShieldCheck, Sparkles } from "lucide-react";
export function FamilyScene({ compact = false }: { compact?: boolean }) {
  const [angle, setAngle] = useState({ x: 0, y: 0 });
  const id = useId().replace(/:/g, "");
  return (
    <div
      className={`family-scene ${compact ? "family-scene-compact" : ""}`}
      aria-hidden="true"
      onPointerMove={(e) => {
        if (
          e.pointerType === "touch" ||
          document.documentElement.dataset.motion === "off"
        )
          return;
        const r = e.currentTarget.getBoundingClientRect();
        setAngle({
          x: ((e.clientX - r.left - r.width / 2) / r.width) * 16,
          y: ((e.clientY - r.top - r.height / 2) / r.height) * -12,
        });
      }}
      onPointerLeave={() => setAngle({ x: 0, y: 0 })}
    >
      <div
        className="scene-world"
        style={
          {
            "--scene-x": `${angle.y}deg`,
            "--scene-y": `${angle.x}deg`,
          } as CSSProperties
        }
      >
        <div className="scene-orbit orbit-one" />
        <div className="scene-orbit orbit-two" />
        <div className="scene-pedestal" />
        <div className="scene-pedestal-side" />
        <svg className="scene-family" viewBox="0 0 360 320" fill="none">
          <defs>
            <linearGradient
              id={`${id}blue`}
              x1="80"
              y1="130"
              x2="240"
              y2="310"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#93c5fd" />
              <stop offset=".45" stopColor="#2563eb" />
              <stop offset="1" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient
              id={`${id}green`}
              x1="210"
              y1="125"
              x2="310"
              y2="280"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a7f3d0" />
              <stop offset=".5" stopColor="#059669" />
              <stop offset="1" stopColor="#065f46" />
            </linearGradient>
            <radialGradient id={`${id}skin`} cx=".3" cy=".2">
              <stop stopColor="#ffedd5" />
              <stop offset=".75" stopColor="#fdba74" />
              <stop offset="1" stopColor="#c2410c" />
            </radialGradient>
            <filter
              id={`${id}shadow`}
              x="-30%"
              y="-30%"
              width="160%"
              height="180%"
            >
              <feDropShadow
                dx="0"
                dy="9"
                stdDeviation="7"
                floodColor="#172554"
                floodOpacity=".2"
              />
            </filter>
          </defs>
          <g filter={`url(#${id}shadow)`}>
            <path
              d="M65 203c0-43 24-67 59-67s60 24 60 67v57c-40 22-80 22-119 0z"
              fill={`url(#${id}blue)`}
            />
            <circle cx="125" cy="104" r="40" fill={`url(#${id}skin)`} />
            <path
              d="M85 94c0-29 18-46 42-46 28 0 44 22 40 48-14-5-23-13-33-25-14 17-31 23-49 23z"
              fill="#1e293b"
            />
            <path
              d="M179 205c0-45 23-72 57-72s62 27 62 72v59c-40 22-80 22-119 0z"
              fill={`url(#${id}green)`}
            />
            <path
              d="M193 115c0-44 16-68 43-68s49 22 49 67l10 49h-109z"
              fill="#eff6ff"
            />
            <ellipse
              cx="237"
              cy="104"
              rx="30"
              ry="35"
              fill={`url(#${id}skin)`}
            />
            <path
              d="M137 250c0-31 15-50 40-50s45 19 45 50v38c-29 16-58 16-85 0z"
              fill="#fbbf24"
            />
            <circle cx="178" cy="179" r="28" fill={`url(#${id}skin)`} />
            <path
              d="M150 174c0-22 12-35 29-35 19 0 32 17 29 35-11-3-17-8-24-15-8 10-19 14-34 15z"
              fill="#334155"
            />
            <path
              d="M146 226c-17-2-37-16-47-30M210 227c21-4 40-16 53-30"
              stroke="#fdba74"
              strokeWidth="15"
              strokeLinecap="round"
            />
          </g>
        </svg>
        <div className="scene-token token-heart">
          <Heart size={28} fill="currentColor" />
        </div>
        <div className="scene-token token-shield">
          <ShieldCheck size={30} />
        </div>
        <div className="scene-token token-spark">
          <Sparkles size={23} />
        </div>
      </div>
    </div>
  );
}
