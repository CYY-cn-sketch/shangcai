import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/NotoSansSC";
import { BRAND } from "./constants";

const { fontFamily } = loadFont();

export const FONT_FAMILY = fontFamily;

// Background with subtle decorative corners
export const SceneBackground: React.FC<{ variant?: "light" | "dark" }> = ({ variant = "light" }) => {
  const base = variant === "dark" ? BRAND.primaryColor : BRAND.backgroundColor;
  return (
    <AbsoluteFill style={{ backgroundColor: base, fontFamily }}>
      {/* Subtle top-left decoration */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 380,
          height: 380,
          background:
            variant === "dark"
              ? `radial-gradient(circle at top left, ${BRAND.primaryLight}55, transparent 70%)`
              : `radial-gradient(circle at top left, ${BRAND.primaryColor}10, transparent 70%)`,
        }}
      />
      {/* Bottom-right gold accent */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 420,
          height: 420,
          background: `radial-gradient(circle at bottom right, ${BRAND.accentColor}${variant === "dark" ? "22" : "12"}, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// Top brand header: SUFE Business School
export const BrandHeader: React.FC<{ delay?: number; light?: boolean }> = ({ delay = 0, light = false }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [delay, delay + 20], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textColor = light ? "#FFFFFF" : BRAND.primaryColor;
  const subColor = light ? "rgba(255,255,255,0.7)" : BRAND.textGray;
  return (
    <div
      style={{
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{ fontSize: 20, color: subColor, letterSpacing: 5, marginBottom: 6, fontWeight: 400 }}>
        SHANGHAI UNIVERSITY OF FINANCE &amp; ECONOMICS · BUSINESS SCHOOL
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color: textColor, letterSpacing: 6 }}>
        上海财经大学商学院
      </div>
      <div
        style={{
          width: 60,
          height: 3,
          background: BRAND.accentColor,
          margin: "12px auto 0",
        }}
      />
    </div>
  );
};

// Bottom subtitle with narration-style caption
export const SceneSubtitle: React.FC<{
  text: string;
  delay?: number;
  light?: boolean;
}> = ({ text, delay = 80, light = false }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [delay, delay + 25], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mainColor = light ? "#FFFFFF" : BRAND.primaryColor;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 90,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontSize: 38,
          fontWeight: 600,
          color: mainColor,
          letterSpacing: 4,
        }}
      >
        {text}
      </div>
      <div
        style={{
          width: 50,
          height: 3,
          background: BRAND.accentColor,
          margin: "12px auto 0",
        }}
      />
    </div>
  );
};

// Scene indicator (e.g. 01 / 06)
export const SceneIndicator: React.FC<{ index: number; total?: number; light?: boolean }> = ({
  index,
  total = 6,
  light = false,
}) => {
  const color = light ? "rgba(255,255,255,0.6)" : BRAND.textMuted;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 36,
        right: 60,
        fontSize: 16,
        color,
        letterSpacing: 3,
        fontFamily,
        fontWeight: 500,
      }}
    >
      {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </div>
  );
};

// Progress bar at bottom
export const ProgressBar: React.FC<{ progress: number; light?: boolean }> = ({ progress, light = false }) => {
  const trackColor = light ? "rgba(255,255,255,0.2)" : "rgba(15, 44, 92, 0.12)";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        background: trackColor,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, ${BRAND.primaryColor}, ${BRAND.accentColor})`,
        }}
      />
    </div>
  );
};

// Reusable animation helpers
export const fadeSlideUp = (frame: number, start: number, duration = 20) => ({
  opacity: interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  }),
  transform: `translateY(${interpolate(frame, [start, start + duration + 5], [30, 0], {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  })}px)`,
});

export const fadeIn = (frame: number, start: number, duration = 20) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  });

export const springIn = (frame: number, fps: number, start: number, from = 0.6, to = 1) => {
  const adjusted = Math.max(0, frame - start);
  return spring({ frame: adjusted, fps, config: { damping: 14, stiffness: 90 }, from, to });
};

// A simple icon drawn with SVG (no external assets)
export const Icon: React.FC<{ name: string; size?: number; color?: string }> = ({
  name,
  size = 32,
  color = BRAND.primaryColor,
}) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "lightbulb":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "chat":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <path d="M4 5h16v11H8l-4 3V5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M8 9h8M8 12h5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "document":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3h9l4 4v14H6V3z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M15 3v4h4M9 12h7M9 15h7M9 9h3" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      );
    case "presentation":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <path d="M3 4h18v11H3zM12 15v4M8 21h8M7 8l3 3 3-4 4 3" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "check":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8"/>
          <path d="M8 12l3 3 5-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "user":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8"/>
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "mic":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth="1.8"/>
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "chart":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <path d="M4 20V8M10 20V4M16 20v-8M22 20H2" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case "target":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8"/>
          <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.8"/>
          <circle cx="12" cy="12" r="1.5" fill={color}/>
        </svg>
      );
    case "send":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <path d="M3 11l18-8-8 18-2-8-8-2z" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
      );
    case "book":
      return (
        <svg {...common} xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4zM20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8V4z" stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
};
