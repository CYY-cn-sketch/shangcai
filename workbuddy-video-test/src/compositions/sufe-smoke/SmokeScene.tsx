import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ============ EDITABLE CONSTANTS ============
const BRAND = {
  primaryColor: "#2563EB",
  accentColor: "#F97316",
  backgroundColor: "#0F172A",
  textColor: "#F8FAFC",
  mutedTextColor: "#94A3B8",
};

const CONTENT = {
  title: "上财 AI 示范平台",
  subtitle: "WorkBuddy Video · Smoke Test",
  badge: "Remotion 4.0 · 16:9 · 30fps · 3s",
};
// ============================================

export const SmokeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title spring entrance
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.6 },
  });

  // Fade in title
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle appears later
  const subtitleOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [20, 38], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge appears near the end
  const badgeOpacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Progress bar at bottom (full 90 frames)
  const progress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle pulse on accent dot
  const pulse = interpolate(
    Math.sin(frame / 6),
    [-1, 1],
    [0.6, 1]
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, #1E293B 0%, ${BRAND.backgroundColor} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
        color: BRAND.textColor,
      }}
    >
      {/* Accent dot */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: BRAND.accentColor,
          marginBottom: 32,
          opacity: titleOpacity * pulse,
          transform: `scale(${titleScale})`,
        }}
      />

      {/* Title */}
      <h1
        style={{
          fontSize: 140,
          fontWeight: 800,
          margin: 0,
          letterSpacing: -4,
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          background: `linear-gradient(135deg, ${BRAND.textColor} 0%, ${BRAND.primaryColor} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {CONTENT.title}
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 40,
          fontWeight: 400,
          margin: "24px 0 0 0",
          color: BRAND.mutedTextColor,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        {CONTENT.subtitle}
      </p>

      {/* Badge */}
      <div
        style={{
          marginTop: 48,
          padding: "10px 20px",
          borderRadius: 999,
          backgroundColor: "rgba(37, 99, 235, 0.15)",
          border: `1px solid ${BRAND.primaryColor}`,
          color: BRAND.textColor,
          fontSize: 22,
          fontWeight: 500,
          opacity: badgeOpacity,
        }}
      >
        {CONTENT.badge}
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${BRAND.primaryColor}, ${BRAND.accentColor})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
