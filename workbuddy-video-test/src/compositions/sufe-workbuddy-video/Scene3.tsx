import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "./constants";
import { SceneBackground, BrandHeader, SceneSubtitle, SceneIndicator, ProgressBar, Icon } from "./shared";

// Scene 3: 产品定位说明大纲、商业计划书 BP 和路演 PPT 依次出现
export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const docs = [
    {
      title: "产品定位说明大纲",
      subtitle: "Product Positioning",
      icon: "target",
      delay: 20,
      content: ["目标用户：在校大学生", "价值主张：低价·便捷·可溯源", "差异化：校园信任机制"],
    },
    {
      title: "商业计划书 BP 初稿",
      subtitle: "Business Plan",
      icon: "document",
      delay: 50,
      content: ["市场分析：年规模 50 亿", "商业模式：佣金 + 增值服务", "财务预测：3 年回本"],
    },
    {
      title: "路演 PPT",
      subtitle: "Pitch Deck",
      icon: "presentation",
      delay: 80,
      content: ["10 页精炼叙事结构", "视觉化数据图表", "含 90 秒电梯演讲稿"],
    },
  ];

  // Arrow / flow indicator
  const arrowOp = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrowOp2 = interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          AI 一键生成 · 结构化产出
        </span>
      </div>

      {/* Three document cards with flow arrows */}
      <div
        style={{
          position: "absolute",
          top: 260,
          left: 80,
          right: 80,
          bottom: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {docs.map((d, i) => {
          const op = interpolate(frame, [d.delay, d.delay + 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const y = interpolate(frame, [d.delay, d.delay + 25], [50, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const sc = spring({ frame: Math.max(0, frame - d.delay), fps, config: { damping: 13 }, from: 0.85, to: 1 });
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  width: 380,
                  background: "#FFFFFF",
                  borderRadius: 20,
                  boxShadow: BRAND.cardShadow,
                  border: `1px solid ${BRAND.borderColor}`,
                  overflow: "hidden",
                  opacity: op,
                  transform: `translateY(${y}px) scale(${sc})`,
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.primaryColor}, ${BRAND.primaryLight})`,
                    padding: "22px 26px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={d.icon} size={28} color="#FFFFFF" />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{d.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", letterSpacing: 2 }}>{d.subtitle}</div>
                  </div>
                </div>
                {/* Card body - document preview */}
                <div style={{ padding: "22px 26px" }}>
                  {/* Document lines */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {d.content.map((line, j) => {
                      const lineDelay = d.delay + 25 + j * 8;
                      const lineOp = interpolate(frame, [lineDelay, lineDelay + 15], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      });
                      const lineX = interpolate(frame, [lineDelay, lineDelay + 18], [-15, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      });
                      return (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            opacity: lineOp,
                            transform: `translateX(${lineX}px)`,
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: BRAND.accentColor,
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ fontSize: 16, color: BRAND.textDark, fontWeight: 500 }}>{line}</div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Footer badge */}
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 14,
                      borderTop: `1px dashed ${BRAND.borderColor}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      opacity: interpolate(frame, [d.delay + 50, d.delay + 65], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    <span style={{ fontSize: 13, color: BRAND.textMuted }}>AI 生成 · 可编辑</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: BRAND.successColor,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icon name="check" size={16} color={BRAND.successColor} /> 已就绪
                    </span>
                  </div>
                </div>
              </div>
              {/* Flow arrow between cards */}
              {i < docs.length - 1 && (
                <div
                  style={{
                    opacity: i === 0 ? arrowOp : arrowOp2,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <svg width="44" height="24" viewBox="0 0 44 24" fill="none">
                    <path
                      d="M2 12h36M30 4l8 8-8 8"
                      stroke={BRAND.accentColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <SceneSubtitle text="从想法到方案" delay={105} />
      <SceneIndicator index={3} />
    </AbsoluteFill>
  );
};
