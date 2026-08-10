import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND } from "./constants";
import { SceneBackground, BrandHeader, SceneSubtitle, SceneIndicator, ProgressBar, Icon, FONT_FAMILY, fadeSlideUp } from "./shared";

// Scene 2: 学生端 AI 创意工作台 - 聊天框输入项目想法，右侧出现核心创意、用户痛点、待验证任务
export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Left panel: chat interface
  const panelIn = spring({ frame, fps, config: { damping: 14 }, from: 0.85, to: 1 });

  // User message typing simulation
  const fullText = "我想做一个校园二手书交易平台，让闲置教材流通起来";
  const typedChars = Math.min(Math.floor(frame / 2.5), fullText.length);
  const typedText = fullText.slice(0, typedChars);

  // Right cards staggered
  const cards = [
    { title: "核心创意", content: "连接校园买卖双方，让闲置教材高效流转", icon: "lightbulb", color: BRAND.primaryColor, delay: 75 },
    { title: "用户痛点", content: "教材贵、二手信息分散、交易信任缺失", icon: "target", color: "#C95A5A", delay: 95 },
    { title: "待验证任务", content: "调研 30 位学生定价意愿，验证物流方案", icon: "check", color: BRAND.successColor, delay: 115 },
  ];

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
          AI 创意工作台 · 学生端
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
          gap: 36,
          transform: `scale(${panelIn})`,
          transformOrigin: "center",
        }}
      >
        {/* Left: Chat interface */}
        <div
          style={{
            flex: "1.05",
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: BRAND.cardShadow,
            border: `1px solid ${BRAND.borderColor}`,
            padding: 28,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Chat header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingBottom: 16,
              borderBottom: `1px solid ${BRAND.borderColor}`,
              opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${BRAND.primaryColor}, ${BRAND.primaryLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              AI
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.textDark }}>AI 创意助教</div>
              <div style={{ fontSize: 13, color: BRAND.textMuted }}>在线 · 帮你梳理创业想法</div>
            </div>
          </div>

          {/* Chat body */}
          <div style={{ flex: 1, padding: "20px 0", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* AI greeting */}
            <div
              style={{
                alignSelf: "flex-start",
                maxWidth: "80%",
                background: BRAND.backgroundColor,
                padding: "12px 16px",
                borderRadius: "14px 14px 14px 4px",
                fontSize: 16,
                color: BRAND.textDark,
                opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}
            >
              你好！说说你的创业想法，我来帮你整理成结构化方案。
            </div>

            {/* User message with typing effect */}
            {typedChars > 0 && (
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "80%",
                  background: `linear-gradient(135deg, ${BRAND.primaryColor}, ${BRAND.primaryLight})`,
                  color: "#FFFFFF",
                  padding: "12px 16px",
                  borderRadius: "14px 14px 4px 14px",
                  fontSize: 16,
                }}
              >
                {typedText}
                {typedChars < fullText.length && (
                  <span style={{ display: "inline-block", width: 2, height: 16, background: "#FFF", marginLeft: 2, opacity: frame % 30 < 15 ? 1 : 0.3, verticalAlign: "middle" }} />
                )}
              </div>
            )}

            {/* AI processing indicator */}
            {typedChars >= fullText.length && (
              <div
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  gap: 6,
                  padding: "12px 16px",
                  background: BRAND.backgroundColor,
                  borderRadius: "14px",
                  opacity: interpolate(frame, [typedChars * 2.5, typedChars * 2.5 + 20], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: BRAND.primarySoft,
                      opacity: interpolate(frame, [typedChars * 2.5 + i * 8, typedChars * 2.5 + i * 8 + 10], [0.3, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    }}
                  />
                ))}
                <span style={{ fontSize: 14, color: BRAND.textMuted, marginLeft: 6 }}>AI 正在归纳整理...</span>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "12px 16px",
              background: BRAND.backgroundColor,
              borderRadius: 14,
              alignItems: "center",
              border: `1px solid ${BRAND.borderColor}`,
            }}
          >
            <div style={{ flex: 1, fontSize: 15, color: BRAND.textMuted }}>输入你的创业想法...</div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: BRAND.accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="send" size={18} color="#FFFFFF" />
            </div>
          </div>
        </div>

        {/* Right: Generated structure cards */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {cards.map((c, i) => {
            const op = interpolate(frame, [c.delay, c.delay + 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const x = interpolate(frame, [c.delay, c.delay + 25], [40, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const sc = spring({ frame: Math.max(0, frame - c.delay), fps, config: { damping: 14 }, from: 0.9, to: 1 });
            return (
              <div
                key={i}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: BRAND.cardShadow,
                  border: `1px solid ${BRAND.borderColor}`,
                  borderLeft: `5px solid ${c.color}`,
                  opacity: op,
                  transform: `translateX(${x}px) scale(${sc})`,
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${c.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={c.icon} size={26} color={c.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.textDark, marginBottom: 6 }}>{c.title}</div>
                  <div style={{ fontSize: 15, color: BRAND.textGray, lineHeight: 1.6 }}>{c.content}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SceneSubtitle text="AI 辅助头脑风暴整理" delay={85} />
      <SceneIndicator index={2} />
    </AbsoluteFill>
  );
};
