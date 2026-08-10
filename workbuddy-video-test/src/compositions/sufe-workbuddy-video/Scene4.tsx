import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "./constants";
import { SceneBackground, BrandHeader, SceneSubtitle, SceneIndicator, ProgressBar, Icon } from "./shared";

// Scene 4: 教师端提交审核中心 - 老师查看学生成果并给出退回修改意见
export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelIn = spring({ frame, fps, config: { damping: 14 }, from: 0.9, to: 1 });

  // Review actions timeline
  const reviewItems = [
    { label: "已审核", value: "12 份", color: BRAND.successColor, delay: 70 },
    { label: "待处理", value: "5 份", color: BRAND.warningColor, delay: 78 },
    { label: "退回修改", value: "3 份", color: "#C95A5A", delay: 86 },
  ];

  // Teacher comment appears
  const commentDelay = 95;
  const commentOp = interpolate(frame, [commentDelay, commentDelay + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const commentY = interpolate(frame, [commentDelay, commentDelay + 25], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Return button click at frame 120
  const buttonClicked = frame >= 120;
  const buttonScale = buttonClicked
    ? spring({ frame: frame - 120, fps, config: { damping: 8 }, from: 1, to: 0.92 })
    : 1;

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
          教师审核中心 · 教师端
        </span>
      </div>

      {/* Main layout: left student submission, right review panel */}
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
        {/* Left: Student submission preview */}
        <div
          style={{
            flex: 1.2,
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: BRAND.cardShadow,
            border: `1px solid ${BRAND.borderColor}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Submission header */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: `1px solid ${BRAND.borderColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#F4D5B5",
                  border: `2px solid ${BRAND.primaryLight}`,
                }}
              />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.textDark }}>李同学 · 第三组</div>
                <div style={{ fontSize: 12, color: BRAND.textMuted }}>校园二手书交易平台 · BP 初稿</div>
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                padding: "4px 12px",
                background: `${BRAND.warningColor}20`,
                color: BRAND.warningColor,
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              待审核
            </span>
          </div>

          {/* Submission content preview */}
          <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "项目名称", value: "书循环 BookCycle" },
              { label: "市场定位", value: "高校教材二手交易撮合平台" },
              { label: "盈利模式", value: "交易佣金 8% + 增值服务" },
              { label: "团队配置", value: "3 名核心成员 + 2 名顾问" },
            ].map((row, i) => {
              const rowOp = interpolate(frame, [35 + i * 8, 50 + i * 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 16,
                    opacity: rowOp,
                    padding: "10px 0",
                    borderBottom: `1px solid ${BRAND.borderColor}`,
                  }}
                >
                  <div style={{ width: 100, fontSize: 14, color: BRAND.textMuted, fontWeight: 500 }}>{row.label}</div>
                  <div style={{ flex: 1, fontSize: 15, color: BRAND.textDark }}>{row.value}</div>
                </div>
              );
            })}

            {/* Mini chart preview */}
            <div
              style={{
                marginTop: 8,
                padding: 14,
                background: BRAND.backgroundColor,
                borderRadius: 12,
                opacity: interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}
            >
              <div style={{ fontSize: 13, color: BRAND.textMuted, marginBottom: 8 }}>三年财务预测</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 50 }}>
                {[20, 38, 65].map((h, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div
                      style={{
                        width: "100%",
                        height: `${h}%`,
                        background: `linear-gradient(180deg, ${BRAND.primaryLight}, ${BRAND.primaryColor})`,
                        borderRadius: "4px 4px 0 0",
                      }}
                    />
                    <div style={{ fontSize: 11, color: BRAND.textMuted }}>Y{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Review panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Stats card */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              boxShadow: BRAND.cardShadow,
              border: `1px solid ${BRAND.borderColor}`,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.textDark, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="user" size={20} color={BRAND.primaryColor} /> 审核进度
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {reviewItems.map((r, i) => {
                const op = interpolate(frame, [r.delay, r.delay + 15], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      background: BRAND.backgroundColor,
                      borderRadius: 10,
                      textAlign: "center",
                      opacity: op,
                      border: `1px solid ${r.color}30`,
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 700, color: r.color }}>{r.value}</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted }}>{r.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comment box */}
          <div
            style={{
              flex: 1,
              background: "#FFFFFF",
              borderRadius: 16,
              padding: 22,
              boxShadow: BRAND.cardShadow,
              border: `1px solid ${BRAND.borderColor}`,
              display: "flex",
              flexDirection: "column",
              opacity: commentOp,
              transform: `translateY(${commentY}px)`,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.textDark, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="chat" size={20} color={BRAND.accentColor} /> 教师点评意见
            </div>
            <div
              style={{
                flex: 1,
                padding: 14,
                background: BRAND.backgroundColor,
                borderRadius: 10,
                fontSize: 15,
                color: BRAND.textDark,
                lineHeight: 1.7,
                border: `1px solid ${BRAND.borderColor}`,
              }}
            >
              市场分析较为扎实，但需补充：
              <br />
              ① 竞品对比维度（信任机制）；
              <br />
              ② 第三年用户增长假设依据；
              <br />
              ③ 物流成本敏感性分析。
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <div
                style={{
                  flex: 1,
                  padding: "12px 0",
                  textAlign: "center",
                  borderRadius: 10,
                  background: `${BRAND.successColor}15`,
                  color: BRAND.successColor,
                  fontWeight: 600,
                  fontSize: 15,
                  border: `1.5px solid ${BRAND.successColor}40`,
                  opacity: interpolate(frame, [110, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}
              >
                通过
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "12px 0",
                  textAlign: "center",
                  borderRadius: 10,
                  background: buttonClicked ? "#C95A5A" : `${"#C95A5A"}15`,
                  color: buttonClicked ? "#FFFFFF" : "#C95A5A",
                  fontWeight: 600,
                  fontSize: 15,
                  border: `1.5px solid ${"#C95A5A"}40`,
                  transform: `scale(${buttonScale})`,
                  opacity: interpolate(frame, [110, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  boxShadow: buttonClicked ? "0 6px 20px rgba(201, 90, 90, 0.4)" : "none",
                }}
              >
                退回修改
              </div>
            </div>
          </div>
        </div>
      </div>

      <SceneSubtitle text="教师关键节点审核" delay={90} />
      <SceneIndicator index={4} />
    </AbsoluteFill>
  );
};
