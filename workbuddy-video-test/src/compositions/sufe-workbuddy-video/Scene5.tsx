import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "./constants";
import { SceneBackground, BrandHeader, SceneSubtitle, SceneIndicator, ProgressBar, Icon } from "./shared";

// Scene 5: 答辩模拟页面 - AI 评委提出追问，学生进行语音回答
export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelIn = spring({ frame, fps, config: { damping: 14 }, from: 0.9, to: 1 });

  // AI judge questions
  const questions = [
    { q: "你们的获客成本是多少？如何降低？", delay: 35 },
    { q: "如果豆瓣/闲书进入校园，你们的护城河？", delay: 70 },
  ];

  // Voice waveform animation - student answering
  const isAnswering = frame >= 80;
  const bars = 24;
  const waveHeights = Array.from({ length: bars }, (_, i) => {
    const base = 0.3 + 0.7 * Math.abs(Math.sin((frame + i * 7) * 0.35));
    return isAnswering ? base : 0.12;
  });

  // Score reveal at the end
  const scoreDelay = 115;
  const scoreOp = interpolate(frame, [scoreDelay, scoreDelay + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scoreScale = spring({ frame: Math.max(0, frame - scoreDelay), fps, config: { damping: 10 }, from: 0.5, to: 1 });

  return (
    <AbsoluteFill>
      <SceneBackground />
      <BrandHeader delay={0} />
      <ProgressBar progress={frame / 150} />

      {/* Section label */}
      <div
        style={{
          position: "absolute",
          top: 175,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "8px 24px",
            background: `${BRAND.primaryColor}12`,
            color: BRAND.primaryColor,
            fontSize: 22,
            fontWeight: 600,
            borderRadius: 20,
            letterSpacing: 3,
            border: `1.5px solid ${BRAND.primaryColor}30`,
          }}
        >
          答辩模拟 · AI 评委压力测试
        </span>
      </div>

      {/* Main split layout */}
      <div
        style={{
          position: "absolute",
          top: 245,
          left: 100,
          right: 100,
          bottom: 200,
          display: "flex",
          gap: 28,
          transform: `scale(${panelIn})`,
          transformOrigin: "center",
        }}
      >
        {/* Left: AI Judge panel */}
        <div
          style={{
            flex: 1,
            background: `linear-gradient(160deg, ${BRAND.primaryColor}, ${BRAND.primaryDark})`,
            borderRadius: 20,
            padding: 28,
            boxShadow: BRAND.cardShadow,
            display: "flex",
            flexDirection: "column",
            color: "#FFFFFF",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative */}
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 200,
              height: 200,
              background: `radial-gradient(circle, ${BRAND.accentColor}30, transparent 70%)`,
            }}
          />

          {/* AI Judge avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
              opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${BRAND.accentColor}, ${BRAND.accentLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid rgba(255,255,255,0.3)",
              }}
            >
              <Icon name="user" size={34} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>AI 评委</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>投资逻辑 · 商业模式 · 风险评估</div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                padding: "4px 12px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 12,
                fontSize: 12,
                color: "#FFFFFF",
              }}
            >
              第 {Math.min(Math.floor(frame / 35) + 1, 3)} 轮
            </div>
          </div>

          {/* Question cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            {questions.map((item, i) => {
              const op = interpolate(frame, [item.delay, item.delay + 22], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const x = interpolate(frame, [item.delay, item.delay + 25], [-30, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.20)",
                    borderRadius: 14,
                    padding: "16px 18px",
                    opacity: op,
                    transform: `translateX(${x}px)`,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: BRAND.accentLight,
                      marginBottom: 6,
                      letterSpacing: 2,
                      fontWeight: 600,
                    }}
                  >
                    追问 {i + 1}
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1.5 }}>{item.q}</div>
                </div>
              );
            })}

            {/* Typing indicator for next question */}
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "8px 14px",
                opacity: interpolate(frame, [100, 115], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.6)",
                    opacity: interpolate(frame, [100 + i * 6, 110 + i * 6], [0.3, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                />
              ))}
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginLeft: 6 }}>准备下一问...</span>
            </div>
          </div>
        </div>

        {/* Right: Student answering */}
        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: 20,
            padding: 28,
            boxShadow: BRAND.cardShadow,
            border: `1px solid ${BRAND.borderColor}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Student header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 20,
              opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#F4D5B5",
                border: `3px solid ${BRAND.primaryLight}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="user" size={28} color={BRAND.primaryColor} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.textDark }}>王同学 · 答辩中</div>
              <div style={{ fontSize: 13, color: BRAND.textMuted }}>
                {isAnswering ? "语音作答中..." : "准备回答"}
              </div>
            </div>
            {isAnswering && (
              <div
                style={{
                  marginLeft: "auto",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#E89B3C",
                  boxShadow: "0 0 12px #E89B3C",
                  opacity: interpolate(frame, [80, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}
              />
            )}
          </div>

          {/* Voice waveform */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
              background: BRAND.backgroundColor,
              borderRadius: 16,
              border: `1px solid ${BRAND.borderColor}`,
            }}
          >
            <Icon name="mic" size={48} color={isAnswering ? BRAND.primaryColor : BRAND.textMuted} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                height: 80,
                marginTop: 18,
              }}
            >
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: `${h * 80}px`,
                    background: isAnswering
                      ? `linear-gradient(180deg, ${BRAND.primaryLight}, ${BRAND.primaryColor})`
                      : BRAND.borderColor,
                    borderRadius: 3,
                    transition: "none",
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 14, color: BRAND.textMuted }}>
              {isAnswering ? "实时语音转写中 · 答题时长 00:" + String(Math.floor((frame - 80) / 30)).padStart(2, "0") : "等待作答"}
            </div>
          </div>

          {/* Score panel */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 12,
              opacity: scoreOp,
              transform: `scale(${scoreScale})`,
            }}
          >
            {[
              { label: "逻辑性", score: 88 },
              { label: "表达力", score: 82 },
              { label: "应变力", score: 90 },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  background: `${BRAND.primaryColor}08`,
                  borderRadius: 10,
                  textAlign: "center",
                  border: `1px solid ${BRAND.borderColor}`,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.primaryColor }}>{s.score}</div>
                <div style={{ fontSize: 12, color: BRAND.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SceneSubtitle text="答辩模拟与表达提升" delay={90} />
      <SceneIndicator index={5} />
    </AbsoluteFill>
  );
};
