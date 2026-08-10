import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "./constants";
import { SceneBackground, BrandHeader, SceneSubtitle, SceneIndicator, ProgressBar, FONT_FAMILY } from "./shared";

// Scene 1: 商学院课堂，小组围绕创业项目讨论
export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tableScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, from: 0.75, to: 1 });

  // Five students around the table (positions relative to center)
  const students = [
    { x: 0, y: -200, color: "#3A6BA8", delay: 25, idea: "校园二手书平台？" },
    { x: 195, y: -65, color: "#1E4A8C", delay: 33 },
    { x: 120, y: 150, color: "#5A7FB5", delay: 41, idea: "可以做 MVP！" },
    { x: -120, y: 150, color: "#2E5A99", delay: 49 },
    { x: -195, y: -65, color: "#4A6FA5", delay: 57 },
  ];

  return (
    <AbsoluteFill>
      <SceneBackground />
      <BrandHeader delay={0} />
      <ProgressBar progress={frame / 150} />

      {/* Classroom scene */}
      <div
        style={{
          position: "absolute",
          top: "52%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${tableScale})`,
        }}
      >
        <div style={{ position: "relative", width: 540, height: 480 }}>
          {/* Round table */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 380,
              height: 240,
              background: `linear-gradient(180deg, ${BRAND.primaryLight}, ${BRAND.primaryColor})`,
              borderRadius: "50%",
              boxShadow: "0 24px 60px rgba(15, 44, 92, 0.30)",
            }}
          />
          {/* Table surface highlight */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -55%)",
              width: 320,
              height: 140,
              background: `linear-gradient(180deg, ${BRAND.primaryColor}30, transparent)`,
              borderRadius: "50%",
            }}
          />

          {/* Laptops on table */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              gap: 28,
            }}
          >
            {[0, 1, 2].map((i) => {
              const op = interpolate(frame, [55 + i * 8, 70 + i * 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div key={i} style={{ opacity: op, width: 54, height: 34, background: "#1A2238", borderRadius: 5, position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 3,
                      right: 3,
                      bottom: 7,
                      background: `linear-gradient(135deg, ${BRAND.accentColor}, ${BRAND.primaryLight})`,
                      borderRadius: 2,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Notebook on table */}
          <div
            style={{
              position: "absolute",
              top: "58%",
              left: "32%",
              width: 44,
              height: 32,
              background: "#FFFFFF",
              border: `2px solid ${BRAND.accentColor}`,
              borderRadius: 3,
              transform: "rotate(-12deg)",
              opacity: interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <div style={{ position: "absolute", top: 6, left: 6, right: 6, height: 1.5, background: BRAND.textGray }} />
            <div style={{ position: "absolute", top: 12, left: 6, right: 10, height: 1.5, background: BRAND.borderColor }} />
            <div style={{ position: "absolute", top: 18, left: 6, right: 8, height: 1.5, background: BRAND.borderColor }} />
          </div>

          {/* Students around table */}
          {students.map((s, i) => {
            const sOpacity = interpolate(frame, [s.delay, s.delay + 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const sScale = spring({ frame: Math.max(0, frame - s.delay), fps, config: { damping: 12 }, from: 0.5, to: 1 });
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px)) scale(${sScale})`,
                  opacity: sOpacity,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* Head */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#F4D5B5",
                    border: `3px solid ${s.color}`,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                />
                {/* Body */}
                <div
                  style={{
                    width: 96,
                    height: 100,
                    background: s.color,
                    borderRadius: "48px 48px 12px 12px",
                    marginTop: -10,
                    boxShadow: "0 8px 20px rgba(15, 44, 92, 0.15)",
                  }}
                />
              </div>
            );
          })}

          {/* Speech bubbles */}
          {students
            .filter((s) => s.idea)
            .map((s, i) => {
              const bDelay = 90 + i * 18;
              const bOpacity = interpolate(frame, [bDelay, bDelay + 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const bY = interpolate(frame, [bDelay, bDelay + 20], [15, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={`b-${i}`}
                  style={{
                    position: "absolute",
                    top: `calc(50% + ${s.y - 80}px)`,
                    left: `calc(50% + ${s.x - 90}px)`,
                    opacity: bOpacity,
                    transform: `translateY(${bY}px)`,
                  }}
                >
                  <div
                    style={{
                      background: "#FFFFFF",
                      padding: "10px 18px",
                      borderRadius: 14,
                      fontSize: 20,
                      color: BRAND.textDark,
                      fontWeight: 500,
                      boxShadow: BRAND.softShadow,
                      border: `1.5px solid ${BRAND.borderColor}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.idea}
                  </div>
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      margin: "0 auto",
                      borderLeft: "8px solid transparent",
                      borderRight: "8px solid transparent",
                      borderTop: "10px solid #FFFFFF",
                    }}
                  />
                </div>
              );
            })}
        </div>
      </div>

      <SceneSubtitle text="从一个课堂创意开始" delay={85} />
      <SceneIndicator index={1} />
    </AbsoluteFill>
  );
};
