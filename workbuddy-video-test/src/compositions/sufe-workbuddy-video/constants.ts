// ============ EDITABLE CONSTANTS ============
// 上海财经大学商学院 - AI 就业教练宣传视频
// Design system: 深蓝 / 白 / 浅灰 + 金色点缀

export const BRAND = {
  primaryColor: "#0F2C5C",      // 深蓝 - 主色
  primaryDark: "#0A1F42",       // 深蓝 - 深
  primaryLight: "#1E4A8C",      // 深蓝 - 浅
  primarySoft: "#3A6BA8",       // 深蓝 - 柔
  accentColor: "#C9A961",       // 金色 - 点缀
  accentLight: "#E0C078",       // 金色 - 浅
  backgroundColor: "#F5F7FA",   // 浅灰 - 背景
  backgroundWhite: "#FFFFFF",   // 白色
  textDark: "#1A2238",          // 深色文字
  textGray: "#5A6B85",          // 灰色文字
  textLight: "#FFFFFF",         // 浅色文字
  textMuted: "#8A99B5",         // 弱化文字
  successColor: "#3CB371",      // 成功色
  warningColor: "#E89B3C",      // 警告色
  borderColor: "#E3E8F0",       // 边框色
  cardShadow: "0 8px 32px rgba(15, 44, 92, 0.10)",
  softShadow: "0 4px 16px rgba(15, 44, 92, 0.08)",
};

export const VIDEO_CONFIG = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 900,   // 30 seconds
  sceneDuration: 150,      // 5 seconds each
};

export const SCENES = [
  { id: 1, subtitle: "从一个课堂创意开始", narration: "在创业实践课上，学生常常有很多想法，却难以快速形成清晰方案。" },
  { id: 2, subtitle: "AI 辅助头脑风暴整理", narration: "AI 助教帮助学生归纳创意、识别痛点、生成可执行任务。" },
  { id: 3, subtitle: "从想法到方案", narration: "项目定位、商业计划书和路演 PPT 可以被快速结构化产出。" },
  { id: 4, subtitle: "教师关键节点审核", narration: "教师可以查看过程记录，给出修改建议，让 AI 生成真正进入教学闭环。" },
  { id: 5, subtitle: "答辩模拟与表达提升", narration: "系统模拟路演答辩场景，帮助学生提升商业表达和临场应变能力。" },
  { id: 6, subtitle: "过程可见｜反馈可追踪｜成果可沉淀", narration: "让创业实践教学从结果提交，升级为全过程培养。" },
];
// ============================================
