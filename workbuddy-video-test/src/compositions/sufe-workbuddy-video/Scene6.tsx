import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "./constants";
import { SceneBackground, BrandHeader, SceneIndicator, ProgressBar, Icon, FONT_FAMILY } from "./shared";

// Scene 6: 成果库、数据看板和学生路演展示
export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Count-up statistics
  const stats = [
    { label: "累计项目", target: 286, suffix: "", delay: 25 },
    { label: "优秀案例", target: 42, suffix: "", delay: 33 },
    { label: "试点班级", target: 18, suffix: "", delay: 41 },
    { label: "学生反馈", target: 96, suffix: "%", delay: 49 },
  ];

  const countUp = (target: number, delay: number) => {
    const t = interpolate(frame, [delay, delay + 40], [0, target], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return Math.floor(t);
  };

  // Bar chart data - 成果沉淀趋势
  const barData = [
    { label: "3月", value: 0.35 },
    { label: "4月", value: 0.5 },
    { label: "5月", value: 0.68 },
    { label: "6月", value: 0.82 },
    { label: "7月", value: 0.95 },
  ];

  // Achievement cards
  const achievements = [
    { title: "书循环 BookCycle", tag: "最佳商业计划", color: BRAND.accentColor, delay: 70 },
    { title: "校园膳食管家", tag: "最具创新性", color: BRAND.primaryLight, delay: 80 },
    { title: "AI 答辩教练", tag: "技术先锋", color: BRAND.successColor, delay: 90 },
  ];

  // Final headline reveal
  const headlineDelay = 105;
  const headlineOp = interpolate(frame, [headlineDelay, headlineDelay + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [headlineDelay, headlineDelay + 25], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <SceneBackground />
      <BrandHeader delay={0} />
      <ProgressBar progress={frame / 150} />

      {/* Statistics row */}
      <div
        style={{
          position: "absolute",
          top: 175,
          left: 100,
          right: 100,
          display: "flex",
          gap: 18,
        }}
      >
        {stats.map((s, i) => {
          const op = interpolate(frame, [s.delay - 10, s.delay + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const sc = spring({ frame: Math.max(0, frame - s.delay), fps, config: { damping: 12 }, from: 0.85, to: 1 });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: "#FFFFFF",
                borderRadius: 14,
                padding: "18px 20px",
                boxShadow: BRAND.cardShadow,
                border: `1px solid ${BRAND.borderColor}`,
                borderLeft: `4px solid ${BRAND.accentColor}`,
                opacity: op,
                transform: `scale(${sc})`,
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 700, color: BRAND.primaryColor }}>
                {countUp(s.target, s.delay)}
                <span style={{ fontSize: 20, color: BRAND.accentColor }}>{s.suffix}</span>
              </div>
              <div style={{ fontSize: 14, color: BRAND.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Main dashboard area */}
      <div
        style={{
          position: "absolute",
          top: 270,
          left: 100,
          right: 100,
          bottom: 230,
          display: "flex",
          gap: 22,
        }}
      >
        {/* Left: Trend chart */}
        <div
          style={{
            flex: 1.1,
            background: "#FFFFFF",
            borderRadius: 18,
            padding: 24,
            boxShadow: BRAND.cardShadow,
            border: `1px solid ${BRAND.borderColor}`,
            display: "flex",
            flexDirection: "column",
            opacity: interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.textDark, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="chart" size={22} color={BRAND.primaryColor} /> 成果沉淀趋势
            </div>
            <span style={{ fontSize: 12, color: BRAND.successColor, fontWeight: 600 }}>↑ 172%</span>
          </div>
          {/* Bar chart */}
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 10px 28px", borderBottom: `2px solid ${BRAND.borderColor}`, position: "relative" }}>
            {/* Y-axis grid */}
            {[0.25, 0.5, 0.75, 1].map((g) => (
              <div key={g} style={{ position: "absolute", left: 0, right: 0, bottom: `${g * 100}%`, height: 1, background: BRAND.borderColor, opacity: 0.5 }} />
            ))}
            {barData.map((b, i) => {
              const barHeight = interpolate(frame, [65 + i * 8, 80 + i * 8], [0, b.value], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "16%", height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: 12, color: BRAND.primaryColor, fontWeight: 600, opacity: barHeight > b.value * 0.9 ? 1 : 0 }}>
                    {Math.round(b.value * 100)}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: `${barHeight * 100}%`,
                      background: `linear-gradient(180deg, ${BRAND.accentColor}, ${BRAND.primaryColor})`,
                      borderRadius: "6px 6px 0 0",
                      boxShadow: "0 4px 12px rgba(15, 44, 92, 0.15)",
                    }}
                  />
                  <div style={{ fontSize: 12, color: BRAND.textMuted, position: "absolute", bottom: -22 }}>{b.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: BRAND.textMuted, textAlign: "center" }}>
            月度新增结构化成果数量（份）
          </div>
        </div>

        {/* Right: Achievement library */}
        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            borderRadius: 18,
            padding: 24,
            boxShadow: BRAND.cardShadow,
            border: `1px solid ${BRAND.borderColor}`,
            display: "flex",
            flexDirection: "column",
            opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Icon name="book" size={22} color={BRAND.primaryColor} />
            <span style={{ fontSize: 18, fontWeight: 700, color: BRAND.textDark }}>优秀成果库</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {achievements.map((a, i) => {
              const op = interpolate(frame, [a.delay, a.delay + 18], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const x = interpolate(frame, [a.delay, a.delay + 20], [30, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    background: BRAND.backgroundColor,
                    borderRadius: 12,
                    border: `1px solid ${BRAND.borderColor}`,
                    borderLeft: `4px solid ${a.color}`,
                    opacity: op,
                    transform: `translateX(${x}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${a.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="presentation" size={22} color={a.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.textDark }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted }}>{a.tag}</div>
                  </div>
                  <Icon name="check" size={20} color={BRAND.successColor} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Final headline / subtitle with three pillars */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headlineOp,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 14 }}>
          {["过程可见", "反馈可追踪", "成果可沉淀"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.accentColor }} />
              <span style={{ fontSize: 28, fontWeight: 600, color: BRAND.primaryColor, letterSpacing: 4 }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 60, height: 3, background: BRAND.accentColor, margin: "0 auto" }} />
      </div>

      <SceneIndicator index={6} />
    </AbsoluteFill>
  );
};
