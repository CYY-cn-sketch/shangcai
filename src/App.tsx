import { type CSSProperties, type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCallback } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  ClipboardCheck,
  Download,
  FileText,
  Filter,
  Layers3,
  LineChart,
  LogOut,
  MessageSquareText,
  Mic,
  MonitorPlay,
  PenLine,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  createAdminAccount,
  createAdminGroup,
  deleteAdminAccount,
  deleteAdminGroup,
  getAdminOperations,
  listAdminAccounts,
  listAdminGroups,
  updateAdminAccount,
  updateAdminGroup,
  type AdminAccount,
  type AdminGroup,
  type AdminOperationsReport,
} from "./api/admin";
import { AdminAiUsagePanel } from "./AdminAiUsagePanel";
import { ExpertSkillManager } from "./ExpertSkillManager";
import { loadCurrentAuth, loginWithPassword, logoutRemoteSession, updateAuthProfile } from "./api/auth";
import {
  artifactDownloadUrl,
  diagnoseTeacherSubmission,
  deleteStudentSubmission,
  listStudentArtifacts,
  listStudentSubmissions,
  listTeacherSubmissions,
  recordArtifactClientDownload,
  reviewTeacherSubmission,
  saveStudentArtifact,
  submitStudentArtifact,
  uploadStudentArtifactPptx,
  withdrawStudentSubmission,
  type RemoteArtifact,
  type RemoteSubmission,
} from "./api/artifacts";
import { buildPptxFile, parsePptSlideOutline } from "./pptxBuilder";
import { PptPreviewModal } from "./PptPreviewModal";
import {
  createKnowledgeAsset,
  createKnowledgeBase,
  deleteKnowledgeAsset,
  deleteKnowledgeBase,
  deleteKnowledgeExpert,
  listKnowledgeAssets,
  listKnowledgeBases,
  listKnowledgeExperts,
  knowledgeAssetDownloadUrl,
  saveKnowledgeExpert,
  uploadKnowledgeAsset,
  updateKnowledgeAsset,
  updateKnowledgeBase,
  type KnowledgeAssetRecord,
  type KnowledgeBaseRecord,
  type KnowledgeExpertRecord,
  type ExpertSkillConfirmationRecord,
  type SaveKnowledgeExpertInput,
} from "./api/knowledge";
import { listDefensePractices, saveDefensePractice, type RemoteDefensePractice } from "./api/defense";
import { getDeepSeekChatStatus, requestDeepSeekExpertReply, requestLexiangPptContext } from "./api/provider";
import { loadGenerationJob, submitGenerationJob, type GenerationJobStatus } from "./api/generation";
import { nextVideoGenerationRevision, videoGenerationIdempotencyKey } from "./workBuddyVideoGeneration";
import {
  AuthLoadingView,
  LoginView,
  LogoutConfirmModal,
  PermissionBanner,
  ProfileSettingsModal,
  SystemNoticeModal,
} from "./authViews";
import {
  buildBlocks,
  buildDefenseEvaluation,
  buildDefensePractice,
  buildFollowUpQuestion,
  configureExpertGeneration,
  defenseBlocks,
  formatDefenseEvaluationForChat,
  getArtifactType,
  getChatStarterPrompts,
  getDefenseSuggestedAnswer,
  getExpertDialogueRound,
  getGenerationLoadingCopy,
  getNextRoundPrompt,
  getScenarioPrompt,
  isArtifactType,
  shouldOutputStageResult,
} from "./expertGeneration";
import {
  AppThreeBackdrop,
  BrainstormAvatar,
  BusinessAvatar,
  CartoonExpertAvatar,
  DefenseAvatar,
  DefenseJudgeAvatar,
  MarketAvatar,
  MediaAvatar,
  PitchAvatar,
  PositioningAvatar,
  ScriptAvatar,
  StudentCartoonAvatar,
  SufeSeal,
} from "./visuals";
import { defaultStudentAvatarId, normalizeStudentAvatarId } from "./studentAvatars";
import {
  appendStudentMessage,
  createStudentIdea,
  deleteStudentIdea,
  loadStudentWorkspace,
  saveStudentConversation,
  uploadStudentAttachment,
  updateStudentIdea,
  type RemoteConversationMessage,
  type RemoteStudentConversation,
  type RemoteStudentIdea,
  type StudentAttachmentRecord,
} from "./api/studentWorkspace";
import {
  appendPositioningHandoffPrompt,
  createBrainstormArtifactContent,
  findLatestBrainstormHandoff,
  readArtifactBlocks,
} from "./expertHandoff";
import {
  answerModeLabels,
  answerModes,
  normalizeAnswerMode,
  type AnswerMode,
} from "./answerModes";
import { StructuredAiResponse } from "./StructuredAiResponse";
import "./App.css";

type Role = "student" | "teacher" | "admin";
type ExpertId = string;
type ArtifactType = "BRAINSTORM" | "POSITIONING" | "MARKET" | "BP" | "PPT" | "SCRIPT" | "DEFENSE" | "MEDIA";
type SubmissionStatus = "pending" | "approved" | "revision" | "withdrawn";
type StudentViewMode = "workspace" | "feedback" | "defense";
type StudentAvatarId = "student-boy" | "student-girl" | "business-student" | "founder-student" | "defense-student" | "creative-girl";
type TeacherReviewSearch = {
  keyword: string;
  artifactType: ArtifactType | "ALL";
  status: SubmissionStatus | "ALL";
  startDate: string;
  endDate: string;
};
type StudentFeedbackSearch = {
  keyword: string;
  artifactType: ArtifactType | "ALL";
  status: SubmissionStatus | "ALL";
};
type KnowledgeUploadSearch = {
  keyword: string;
  category: KnowledgeCategory | "ALL";
  status: "ALL" | "enabled" | "disabled";
};
type TeacherReviewTab = "files" | "diagnosis" | "rubric" | "feedback";
type RubricScore = {
  name: string;
  description: string;
  weight: number;
  aiScore: number;
  teacherScore: number;
};
type DiagnosisResult = {
  summary?: string;
  problems: string[];
  risks: string[];
  questions: string[];
  tasks: string[];
  scores?: Array<{ name: string; score: number; reason?: string }>;
  feedbackDraft?: string;
};
type DefenseTurn = { id: string; sender: "student" | "ai"; content: string; createdAt: string };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionResultLike = { 0?: { transcript?: string } };
type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};
type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};
type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
  message?: string;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const emptyTeacherReviewSearch: TeacherReviewSearch = {
  keyword: "",
  artifactType: "ALL",
  status: "ALL",
  startDate: "",
  endDate: "",
};

const emptyKnowledgeUploadSearch: KnowledgeUploadSearch = {
  keyword: "",
  category: "ALL",
  status: "ALL",
};

type AuthSession = {
  id?: string;
  role: Role;
  name: string;
  account: string;
  title: string;
  avatarId?: string;
  groupId?: string;
  groupLabel?: string;
  groupName?: string;
  quota?: number;
  disabledPermissions?: string[];
};

type AccountRecord = AuthSession & {
  id: string;
  groupOrScope: string;
  groupId?: string;
  groupLabel?: string;
  groupName?: string;
  permissions: string[];
  disabledPermissions?: string[];
  quota: number;
  status: "已开通" | "已停用" | "待后端开通";
};

type StudentGroup = {
  id: string;
  label: string;
  projectName: string;
  active?: boolean;
  memberCount?: number;
};

type PermissionAccess = {
  account?: AccountRecord;
  accountDisabled: boolean;
  disabledPermissions: string[];
  can: (permission: string) => boolean;
  block: (permission: string) => void;
};

type Skill = {
  id: string;
  name: string;
  stage: string;
  description: string;
};

type ExpertIconComponent = (props: { size?: number }) => ReactElement;

type Expert = {
  id: ExpertId;
  name: string;
  role: string;
  scenario: string;
  icon: ExpertIconComponent;
  accent: string;
  skills: Skill[];
  sourceSkillName?: string;
  sourceSkillContent?: string;
  sourceSkillUploadedBy?: string;
  sourceSkillUploadedAt?: string;
  systemPrompt?: string;
  userPrompt?: string;
  active?: boolean;
};

type CustomExpertRecord = {
  id: ExpertId;
  name: string;
  role: string;
  scenario: string;
  accent: string;
  skills: Skill[];
  sourceSkillName?: string;
  sourceSkillContent?: string;
  sourceSkillUploadedBy?: string;
  sourceSkillUploadedAt?: string;
  systemPrompt?: string;
  userPrompt?: string;
  active?: boolean;
};

type DeletedExpertIdState = ExpertId[];

type Idea = {
  id: string;
  title: string;
  description: string;
  stage: string;
  updatedAt: string;
};

type ResultBlock = {
  title: string;
  items: string[];
};

type ChatMessage = {
  id: string;
  clientMessageId?: string;
  ideaId: string;
  sender: "user" | "ai";
  mode?: "文本" | "录音" | "语音" | "文件";
  expertId?: ExpertId;
  expertName?: string;
  skillName?: string;
  artifactType?: ArtifactType;
  content: string;
  blocks?: ResultBlock[];
  createdAt: string;
};

type GeneratedAssetType = "PPT" | "VIDEO";
type ContextAction = "ask" | "script" | "video" | "download" | "preview";
type PendingAssetGeneration = {
  title: string;
  detail: string;
  seconds: number;
};
type PptKnowledgeReference = { title: string; url?: string; content?: string };
type GeneratedAsset = {
  id: string;
  ideaId: string;
  type: GeneratedAssetType;
  title: string;
  sourceMessageId?: string;
  createdAt: string;
  prompt?: string;
  script?: string;
  storyboard?: string;
  posterPrompt?: string;
  visualPrompt?: string;
  videoUrl?: string;
  videoGeneratedAt?: string;
  videoGenerationJobId?: string;
  videoGenerationRevision?: number;
  videoGenerationStatus?: GenerationJobStatus;
  referenceImageAssetIds?: string[];
  pptKnowledgeContent?: string;
  pptKnowledgeReferences?: PptKnowledgeReference[];
  pptGeneratedAt?: string;
  pptUsesLexiang?: boolean;
  pptUrl?: string;
  pptFileName?: string;
};
type WordPreview = { title: string; blocks: ResultBlock[] };

type Submission = {
  id: string;
  artifactId: string;
  ideaId: string;
  student: string;
  group: string;
  groupName?: string;
  artifactType: ArtifactType;
  artifactTitle: string;
  artifactSummary: string;
  blocks: ResultBlock[];
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  teacherComment?: string;
  sourceMessageId?: string;
  isExcellent?: boolean;
  aiDiagnosis?: DiagnosisResult;
};

type DefensePractice = {
  id: string;
  ideaId: string;
  basis: "BP + PPT + 路演稿";
  scripts: Record<"1分钟" | "3分钟" | "5分钟", string>;
  questions: string[];
  answerSuggestions: string[];
  expressionTips: string[];
  transcript: DefenseTurn[];
  evaluation: ResultBlock[];
  visibility: "self" | "teacher";
  createdAt: string;
};

type KnowledgeUpload = {
  id: string;
  name: string;
  sizeLabel: string;
  fileType: string;
  fileDataUrl?: string;
  file?: File;
  downloadUrl?: string;
  fileAvailable?: boolean;
  uploadedAt: string;
  uploadedBy?: string;
  preview: string;
  contentText?: string;
  extractionStatus?: KnowledgeAssetRecord["extractionStatus"];
  extractionMessage?: string;
  category?: KnowledgeCategory;
  enabled?: boolean;
};

type KnowledgeCategory = string;
type StudentKnowledgeSelection = {
  categories: KnowledgeCategory[];
  uploadIds: string[];
};
type PendingKnowledgeAssetAction = { id: string; action: "toggle" | "delete" };
type KnowledgeBaseCatalogItem = {
  id?: string;
  category: KnowledgeCategory;
  description: string;
  usedBy: string;
  active?: boolean;
};
const knowledgeCategoryOptions: KnowledgeCategory[] = [
  "教学大纲",
  "BP 模板",
  "PPT 模板",
  "评分标准",
  "创业案例",
  "答辩题库",
  "多媒体模板",
];

const defaultKnowledgeBaseCatalog: KnowledgeBaseCatalogItem[] = [
  { category: "教学大纲", description: "课程阶段、教学目标、8 周节奏和阶段成果要求。", usedBy: "头脑风暴、项目定位、BP、PPT、答辩" },
  { category: "BP 模板", description: "商业计划书章节结构、内容颗粒度、商业模式和财务假设。", usedBy: "项目定位、商业计划书、PPT、答辩" },
  { category: "PPT 模板", description: "路演页序、页面观点、图表建议和演讲提示。", usedBy: "路演 PPT、答辩模拟、多媒体物料" },
  { category: "评分标准", description: "Rubric、审核维度、通过/退回口径和优秀成果判断标准。", usedBy: "BP、PPT、答辩、教师审核" },
  { category: "创业案例", description: "优秀项目案例、行业标签、商业模式样例和课堂可复用素材。", usedBy: "头脑风暴、项目定位、BP、市场判断" },
  { category: "答辩题库", description: "评委高频追问、压力测试问题、回答结构和表达评价标准。", usedBy: "答辩模拟" },
  { category: "多媒体模板", description: "短视频脚本、分镜表、海报文案、视觉 Prompt 和宣传素材样例。", usedBy: "多媒体物料专家" },
];
let knowledgeBaseCatalog: KnowledgeBaseCatalogItem[] = defaultKnowledgeBaseCatalog;

type KnowledgeBaseStates = Record<KnowledgeCategory, boolean>;
type PromptKnowledgeRoutes = Record<ExpertId, KnowledgeCategory[]>;
const initialKnowledgeBaseStates = knowledgeCategoryOptions.reduce(
  (states, category) => ({ ...states, [category]: true }),
  {} as KnowledgeBaseStates,
);

const expertKnowledgeMap: Record<ExpertId, KnowledgeCategory[]> = {
  brainstorm: ["教学大纲", "创业案例"],
  positioning: ["教学大纲", "BP 模板", "创业案例"],
  market: ["创业案例", "评分标准"],
  business: ["BP 模板", "评分标准", "创业案例"],
  pitch: ["PPT 模板", "BP 模板", "评分标准"],
  script: ["PPT 模板", "答辩题库", "评分标准"],
  defense: ["答辩题库", "PPT 模板", "BP 模板", "评分标准"],
  media: ["多媒体模板", "PPT 模板", "创业案例"],
};

function getExpertKnowledgeCategories(expertId: ExpertId) {
  return expertKnowledgeMap[expertId] || ["教学大纲", "创业案例"];
}

function getConfiguredExpertKnowledgeCategories(expertId: ExpertId, routes?: PromptKnowledgeRoutes) {
  return Array.from(new Set(routes?.[expertId] || getExpertKnowledgeCategories(expertId)));
}

function createKnowledgeRouteState(): PromptKnowledgeRoutes {
  return Object.fromEntries(
    Object.entries(expertKnowledgeMap).map(([expertId, categories]) => [expertId, [...categories]]),
  ) as PromptKnowledgeRoutes;
}

function getKnowledgeCatalogItems(categories: KnowledgeCategory[]) {
  return categories.map((category) => knowledgeBaseCatalog.find((base) => base.category === category) || knowledgeBaseCatalog[0]);
}

function toggleKnowledgeRouteCategory(current: KnowledgeCategory[], category: KnowledgeCategory) {
  if (current.includes(category)) {
    return current.length > 1 ? current.filter((item) => item !== category) : current;
  }
  return [...current, category];
}

function getActiveKnowledgeCatalog(catalog: KnowledgeBaseCatalogItem[]) {
  return (catalog.length ? catalog : defaultKnowledgeBaseCatalog).filter((item) => item.active !== false);
}

function mergeKnowledgeBaseRecords(current: KnowledgeBaseCatalogItem[], remote: KnowledgeBaseRecord[]) {
  const merged = new Map(
    (current.length ? current : defaultKnowledgeBaseCatalog).map((item) => [item.category, item]),
  );
  remote.forEach((item) => {
    merged.set(item.category, {
      id: item.id,
      category: item.category,
      description: item.description,
      usedBy: item.usedBy,
      active: item.active,
    });
  });
  return Array.from(merged.values());
}

function mapKnowledgeAssetRecord(record: KnowledgeAssetRecord): KnowledgeUpload {
  return {
    id: record.id,
    name: record.name,
    sizeLabel: record.sizeLabel,
    fileType: record.fileType,
    uploadedAt: record.createdAt,
    uploadedBy: record.uploadedBy,
    preview: record.preview,
    contentText: record.contentText || undefined,
    category: record.category,
    enabled: record.enabled,
    downloadUrl: record.downloadUrl || (record.fileAvailable ? knowledgeAssetDownloadUrl(record.id) : undefined),
    fileAvailable: record.fileAvailable,
    extractionStatus: record.extractionStatus,
    extractionMessage: record.extractionMessage || undefined,
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapRemoteDefensePractice(record: RemoteDefensePractice): DefensePractice | null {
  if (!isObjectRecord(record.content)) return null;
  const content = record.content as Partial<DefensePractice>;
  if (!content.scripts || !Array.isArray(content.questions) || !Array.isArray(content.transcript)) return null;
  return {
    ...(content as DefensePractice),
    id: record.id,
    ideaId: record.ideaId,
    visibility: record.visibility,
    createdAt: content.createdAt || record.createdAt,
  };
}

function mapGeneratedAssetRecord(record: RemoteArtifact): GeneratedAsset | null {
  if (!isObjectRecord(record.content) || record.content.kind !== "GENERATED_ASSET" || !isObjectRecord(record.content.asset)) return null;
  const asset = record.content.asset as Partial<GeneratedAsset>;
  if (!asset.id || !asset.ideaId || !asset.title || (asset.type !== "PPT" && asset.type !== "VIDEO")) return null;
  const storedFileUrl = record.fileAvailable ? artifactDownloadUrl(record.id) : undefined;
  return {
    ...(asset as GeneratedAsset),
    ideaId: record.ideaId,
    createdAt: asset.createdAt || record.createdAt,
    ...(asset.type === "PPT" && storedFileUrl
      ? { pptUrl: storedFileUrl, pptFileName: asset.pptFileName || `${asset.title}.pptx` }
      : {}),
    ...(asset.type === "VIDEO" && storedFileUrl ? { videoUrl: storedFileUrl } : {}),
  };
}

function generatedAssetSourceId(assetId: string) {
  return `generated:${assetId}`.slice(0, 64);
}

function mapKnowledgeExpertRecord(record: KnowledgeExpertRecord): CustomExpertRecord {
  return {
    id: record.id,
    name: record.name,
    role: record.role,
    scenario: record.scenario,
    accent: record.accent,
    skills: record.skills,
    sourceSkillName: record.sourceSkillName || undefined,
    sourceSkillContent: record.sourceSkillContent || undefined,
    sourceSkillUploadedBy: record.sourceSkillUploadedBy || undefined,
    systemPrompt: record.systemPrompt || undefined,
    userPrompt: record.userPrompt || undefined,
    active: record.active,
  };
}

function toCustomExpertRecord(expert: Expert): CustomExpertRecord {
  return {
    id: expert.id,
    name: expert.name,
    role: expert.role,
    scenario: expert.scenario,
    accent: expert.accent,
    skills: expert.skills,
    sourceSkillName: expert.sourceSkillName,
    sourceSkillContent: expert.sourceSkillContent,
    sourceSkillUploadedBy: expert.sourceSkillUploadedBy,
    systemPrompt: expert.systemPrompt,
    userPrompt: expert.userPrompt,
    active: expert.active !== false,
  };
}

function toKnowledgeExpertInput(
  expert: CustomExpertRecord,
  knowledgeCategories: KnowledgeCategory[],
  active = expert.active !== false,
): SaveKnowledgeExpertInput {
  return {
    id: expert.id,
    name: expert.name,
    role: expert.role,
    scenario: expert.scenario,
    accent: expert.accent,
    active,
    sourceSkillName: expert.sourceSkillName,
    sourceSkillContent: expert.sourceSkillContent,
    sourceSkillUploadedBy: expert.sourceSkillUploadedBy,
    systemPrompt: expert.systemPrompt,
    userPrompt: expert.userPrompt,
    skills: expert.skills,
    knowledgeCategories,
  };
}

function syncKnowledgeCatalogAddition(
  catalog: KnowledgeBaseCatalogItem[],
  states: KnowledgeBaseStates,
  routes: PromptKnowledgeRoutes,
  item: KnowledgeBaseCatalogItem,
) {
  const nextCatalog = [...catalog, item];
  const nextStates = { ...states, [item.category]: true };
  const nextRoutes = experts.reduce((result, expert) => {
    const categories = routes[expert.id] || getExpertKnowledgeCategories(expert.id);
    result[expert.id] = Array.from(new Set([...categories, item.category]));
    return result;
  }, {} as PromptKnowledgeRoutes);
  return { nextCatalog, nextStates, nextRoutes };
}

function syncKnowledgeCatalogDeletion(
  catalog: KnowledgeBaseCatalogItem[],
  states: KnowledgeBaseStates,
  routes: PromptKnowledgeRoutes,
  category: KnowledgeCategory,
) {
  const activeCatalog = getActiveKnowledgeCatalog(catalog);
  const nextCatalog = activeCatalog.filter((item) => item.category !== category);
  const fallbackCategory = nextCatalog[0]?.category;
  const nextStates = Object.fromEntries(
    Object.entries(states).filter(([key]) => key !== category),
  ) as KnowledgeBaseStates;
  const nextRoutes = experts.reduce((result, expert) => {
    const categories = routes[expert.id] || getExpertKnowledgeCategories(expert.id);
    const kept = categories.filter((item) => item !== category);
    result[expert.id] = kept.length ? kept : fallbackCategory ? [fallbackCategory] : [];
    return result;
  }, {} as PromptKnowledgeRoutes);
  return { nextCatalog, nextStates, nextRoutes };
}

const artifactLabels: Record<ArtifactType, string> = {
  BRAINSTORM: "头脑风暴",
  POSITIONING: "项目定位",
  MARKET: "市场竞品",
  BP: "商业计划书 BP",
  PPT: "路演 PPT",
  SCRIPT: "路演稿",
  DEFENSE: "答辩模拟",
  MEDIA: "多媒体物料",
};

function getStudentOutcomeFlow(expertId: ExpertId) {
  if (expertId === "pitch") {
    return "平台知识库生成逐页内容，平台组装并保存 PPTX；无需切换特殊模式。";
  }
  if (expertId === "media") {
    return "本专家先生成脚本、分镜和视觉提示词；真实视频需另行启用视频生成服务并确认消耗。";
  }
  return "回答方式只控制内容深度；阶段成果可导出 Word，不需要单独的 Word 模式。";
}

function ExpertDetailModal(props: {
  expert: Expert;
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  selectedCategories: KnowledgeCategory[];
  enabledKnowledgeCount: number;
  systemPrompt: string;
  userPrompt: string;
  active: boolean;
  canDelete: boolean;
  onKnowledgeToggle: (category: KnowledgeCategory) => void;
  onSystemPromptChange: (value: string) => void;
  onUserPromptChange: (value: string) => void;
  onActiveChange: (active: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const titleId = `expert-detail-title-${props.expert.id}`;
  const expertId = props.expert.id;
  const closeDetail = props.onClose;
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetail();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeDetail]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [expertId]);

  return createPortal(
    <div
      className="modal-backdrop expert-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <section className="expert-detail-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="expert-detail-header">
          <div className="expert-detail-identity">
            <span className="expert-detail-accent" style={{ background: props.expert.accent }} aria-hidden="true" />
            <div>
              <span className="eyebrow">专家详情</span>
              <h2 id={titleId}>{props.expert.name}</h2>
              <p>{props.expert.role}</p>
            </div>
          </div>
          <div className="expert-detail-header-actions">
            <label className={`expert-status-control ${props.active ? "active" : "inactive"}`}>
              <span className="expert-status-copy">
                <strong>学生端启用</strong>
                <small>{props.active ? "已启用，学生可以选择该专家" : "已停用，仅教师和管理员可配置"}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label="学生端启用"
                checked={props.active}
                onChange={(event) => props.onActiveChange(event.target.checked)}
              />
              <span className="expert-status-track" aria-hidden="true"><span /></span>
            </label>
            <button className="icon-button" type="button" aria-label="关闭专家详情" onClick={props.onClose} autoFocus>
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="expert-detail-body" ref={bodyRef}>
          <dl className="expert-detail-summary">
            <div>
              <dt>适用场景</dt>
              <dd>{props.expert.scenario}</dd>
            </div>
            <div>
              <dt>来源 Skill</dt>
              <dd>{props.expert.sourceSkillName || "平台预置专家"}</dd>
            </div>
            <div>
              <dt>知识库目录</dt>
              <dd>{props.selectedCategories.length} 个</dd>
            </div>
            <div>
              <dt>启用资料</dt>
              <dd>{props.enabledKnowledgeCount} 个</dd>
            </div>
          </dl>

          <section className="prompt-knowledge-route expert-detail-knowledge">
            <div>
              <strong>专家调用知识库目录</strong>
              <span>仅勾选的知识库会参与该专家的检索与提示词组装。</span>
            </div>
            <div className="prompt-knowledge-options">
              {props.knowledgeCatalog.map((base) => {
                const selected = props.selectedCategories.includes(base.category);
                const enabled = props.knowledgeBaseStates[base.category];
                return (
                  <label className={`${selected ? "selected" : ""} ${enabled ? "" : "disabled"}`} key={base.category}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => props.onKnowledgeToggle(base.category)}
                    />
                    <span>{base.category}知识库</span>
                    <em>{enabled ? "目录开放" : "目录停用"}</em>
                    <small>{base.usedBy}</small>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="prompt-content-grid expert-detail-prompts">
            <article>
              <span className="eyebrow">System</span>
              <h3>系统提示词</h3>
              <p>定义专家角色、知识库引用规则、输出要求和能力边界。</p>
              <textarea
                className="teacher-prompt-textarea"
                value={props.systemPrompt}
                onChange={(event) => props.onSystemPromptChange(event.target.value)}
              />
            </article>
            <article>
              <span className="eyebrow">User</span>
              <h3>用户输入组装规则</h3>
              <p>定义学生输入、历史上下文、上传资料和本轮任务如何组装。</p>
              <textarea
                className="teacher-prompt-textarea"
                value={props.userPrompt}
                onChange={(event) => props.onUserPromptChange(event.target.value)}
              />
            </article>
          </section>
        </div>

        <footer className="expert-detail-footer">
          <div>
            {props.canDelete && (
              <button className="ghost-button danger" type="button" onClick={props.onDelete}>
                <Trash2 size={15} />
                删除专家
              </button>
            )}
          </div>
          <div>
            <button className="ghost-button" type="button" onClick={props.onClose}>取消</button>
            <button className="primary-button" type="button" onClick={props.onSave}>
              <Save size={15} />
              保存专家配置
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

const statusLabels: Record<SubmissionStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  revision: "退回修改",
  withdrawn: "已撤回",
};

const projectKanbanStages: Array<{ label: string; types: ArtifactType[] }> = [
  { label: "头脑风暴", types: ["BRAINSTORM"] },
  { label: "项目定位", types: ["POSITIONING"] },
  { label: "市场竞品", types: ["MARKET"] },
  { label: "商业模式", types: ["BP"] },
  { label: "BP 撰写", types: ["BP"] },
  { label: "路演 PPT", types: ["PPT"] },
  { label: "陪练答辩", types: ["DEFENSE"] },
  { label: "成果提交", types: ["MEDIA", "SCRIPT"] },
];

const artifactStageIndex: Record<ArtifactType, number> = {
  BRAINSTORM: 0,
  POSITIONING: 1,
  MARKET: 2,
  BP: 4,
  PPT: 5,
  SCRIPT: 7,
  DEFENSE: 6,
  MEDIA: 7,
};

const rubricDimensions = [
  ["创新性", "问题独特性与方案新颖度", 20],
  ["市场洞察", "用户痛点、访谈证据与竞品判断", 20],
  ["商业逻辑", "商业模式完整性与收入闭环", 20],
  ["财务合理性", "收入、成本、转化率和盈亏平衡假设", 15],
  ["表达呈现", "BP/PPT/路演结构与说服力", 15],
  ["团队协作", "分工、迭代记录和课堂参与度", 10],
] as const;

const studentExpertPermissionNames = [
  "创意头脑风暴专家",
  "项目定位专家",
  "市场与竞品专家",
  "商业模式/BP 专家",
  "路演 PPT 专家",
  "路演稿生成专家",
  "多媒体物料专家",
];

const studentFeaturePermissionNames = ["AI 创意工作台", "调用课程知识库", "答辩模拟", "提交老师审核", "下载个人成果"];

const extraDemoStudentGroups: StudentGroup[] = [
  { id: "G-11", label: "第 11 组", projectName: "校园创业资源导航" },
];

const initialStudentGroups: StudentGroup[] = [
  { id: "G-01", label: "第 1 组", projectName: "校园二手循环平台" },
  { id: "G-02", label: "第 2 组", projectName: "智能简历诊所" },
  { id: "G-03", label: "第 3 组", projectName: "AI 就业教练" },
  { id: "G-04", label: "第 4 组", projectName: "商科案例共创库" },
  { id: "G-05", label: "第 5 组", projectName: "银发陪诊助手" },
  { id: "G-06", label: "第 6 组", projectName: "低碳积分校园平台" },
  { id: "G-07", label: "第 7 组", projectName: "实习岗位雷达" },
  { id: "G-08", label: "第 8 组", projectName: "校园餐饮排队预测" },
  { id: "G-09", label: "第 9 组", projectName: "创业案例智能检索" },
  { id: "G-10", label: "第 10 组", projectName: "商学院活动助手" },
  ...extraDemoStudentGroups,
];

const extraDemoStudentAccounts: AccountRecord[] = [
  {
    id: "A-STU-003",
    role: "student",
    name: "王梓萱",
    account: "student3@sufe.demo",
    title: "商学院创业实践课学生",
    groupOrScope: "第 11 组 / 校园创业资源导航",
    groupId: "G-11",
    groupLabel: "第 11 组",
    groupName: "校园创业资源导航",
    permissions: studentExpertPermissionNames,
    quota: 240,
    status: "已开通",
  },
  {
    id: "A-STU-004",
    role: "student",
    name: "赵一诺",
    account: "student4@sufe.demo",
    title: "商学院创业实践课学生",
    groupOrScope: "第 11 组 / 校园创业资源导航",
    groupId: "G-11",
    groupLabel: "第 11 组",
    groupName: "校园创业资源导航",
    permissions: studentExpertPermissionNames,
    quota: 240,
    status: "已开通",
  },
  {
    id: "A-STU-005",
    role: "student",
    name: "林嘉诚",
    account: "student5@sufe.demo",
    title: "商学院创业实践课学生",
    groupOrScope: "第 11 组 / 校园创业资源导航",
    groupId: "G-11",
    groupLabel: "第 11 组",
    groupName: "校园创业资源导航",
    permissions: studentExpertPermissionNames,
    quota: 220,
    status: "已开通",
  },
  {
    id: "A-STU-006",
    role: "student",
    name: "黄雨桐",
    account: "student6@sufe.demo",
    title: "商学院创业实践课学生",
    groupOrScope: "第 11 组 / 校园创业资源导航",
    groupId: "G-11",
    groupLabel: "第 11 组",
    groupName: "校园创业资源导航",
    permissions: studentExpertPermissionNames,
    quota: 220,
    status: "已开通",
  },
];

const initialAccountRecords: AccountRecord[] = [
  {
    id: "A-STU-001",
    role: "student",
    name: "陈思源",
    account: "student@sufe.demo",
    title: "商学院创业实践课学生",
    groupOrScope: "第 3 组 / AI 就业教练",
    groupId: "G-03",
    groupLabel: "第 3 组",
    groupName: "AI 就业教练",
    permissions: studentExpertPermissionNames,
    quota: 260,
    status: "已开通",
  },
  {
    id: "A-STU-002",
    role: "student",
    name: "李若涵",
    account: "student2@sufe.demo",
    title: "商学院创业实践课学生",
    groupOrScope: "第 4 组 / 商科案例共创库",
    groupId: "G-04",
    groupLabel: "第 4 组",
    groupName: "商科案例共创库",
    permissions: studentExpertPermissionNames,
    quota: 220,
    status: "已开通",
  },
  ...extraDemoStudentAccounts,
  {
    id: "A-TEA-001",
    role: "teacher",
    name: "周老师",
    account: "teacher@sufe.demo",
    title: "创业实践课程教师",
    groupOrScope: "创业实践课 / 10 个项目组",
    permissions: ["提交审核中心", "节点解答与指导", "优秀成果标记", "上传教学资料"],
    quota: 520,
    status: "已开通",
  },
  {
    id: "A-ADM-001",
    role: "admin",
    name: "平台管理员",
    account: "admin@sufe.demo",
    title: "教学平台运营管理员",
    groupOrScope: "全平台运营",
    permissions: ["账号权限管理", "知识库维护", "专家配置与 Skill 管理", "试点数据看板"],
    quota: 1500,
    status: "已开通",
  },
];

function formatGroupScope(group?: Pick<StudentGroup, "label" | "projectName"> | null) {
  if (!group) return "未分配项目小组";
  return `${group.label} / ${group.projectName}`;
}

function parseGroupScope(scope?: string) {
  if (!scope) return {};
  const [label, projectName] = scope.split("/").map((item) => item.trim());
  if (!label?.includes("组")) return {};
  return { groupLabel: label, groupName: projectName || "" };
}

function resolveAccountGroup(account: Pick<AccountRecord, "groupId" | "groupLabel" | "groupName" | "groupOrScope">, groups: StudentGroup[]) {
  const parsed = parseGroupScope(account.groupOrScope);
  const group =
    groups.find((item) => item.id === account.groupId) ||
    groups.find((item) => item.label === account.groupLabel) ||
    groups.find((item) => item.label === parsed.groupLabel);
  return {
    groupId: group?.id || account.groupId,
    groupLabel: group?.label || account.groupLabel || parsed.groupLabel,
    groupName: group?.projectName || account.groupName || parsed.groupName,
  };
}

function normalizeAccountRecords(records: AccountRecord[], groups: StudentGroup[] = initialStudentGroups) {
  return records.map((storedAccount) => {
    const account = { ...storedAccount } as AccountRecord & { password?: unknown };
    delete account.password;
    const hasExpertPermissions = account.permissions.some((permission) => studentExpertPermissionNames.includes(permission));
    const defaultPermissions = account.role === "student" ? studentExpertPermissionNames : [];
    const basePermissions = account.role === "student" && !hasExpertPermissions ? defaultPermissions : account.permissions;
    const permissions = [...basePermissions, ...defaultPermissions.filter((permission) => !basePermissions.includes(permission))];
    const disabledPermissions = account.disabledPermissions || [];
    if (account.role !== "student") {
      return permissions.length === account.permissions.length ? account : { ...account, permissions };
    }
    const group = resolveAccountGroup(account, groups);
    const groupOrScope = group.groupLabel
      ? formatGroupScope({ label: group.groupLabel, projectName: group.groupName || "未命名项目" })
      : account.groupOrScope || "未分配项目小组";
    return {
      ...account,
      ...group,
      groupOrScope,
      permissions,
      disabledPermissions,
    };
  });
}

function mapAdminGroup(group: AdminGroup): StudentGroup {
  return {
    id: group.id,
    label: group.groupLabel,
    projectName: group.projectName,
    active: group.active,
    memberCount: group.memberCount,
  };
}

function getBaseRolePermissions(role: Role) {
  if (role === "student") return studentExpertPermissionNames;
  if (role === "teacher") return ["提交审核中心", "节点解答与指导", "优秀成果标记", "上传教学资料"];
  return ["账号权限管理", "知识库维护", "专家配置与 Skill 管理", "试点数据看板"];
}

function mapAdminAccount(account: AdminAccount, groups: StudentGroup[]): AccountRecord {
  const role = account.role.toLowerCase() as Role;
  const group = account.groupId ? groups.find((item) => item.id === account.groupId) : undefined;
  return {
    id: account.id,
    role,
    name: account.displayName,
    account: account.account,
    title: account.title,
    groupOrScope:
      role === "student"
        ? formatGroupScope(group || (account.groupLabel ? { label: account.groupLabel, projectName: account.groupName || "未命名项目" } : null))
        : role === "teacher"
          ? "创业实践课程教师"
          : "全平台运营",
    groupId: account.groupId,
    groupLabel: account.groupLabel,
    groupName: account.groupName,
    permissions: getBaseRolePermissions(role),
    disabledPermissions: account.disabledPermissions || [],
    quota: account.quotaRemaining,
    status: account.status === "ACTIVE" ? "已开通" : "已停用",
  };
}

function buildAuthenticatedAccount(auth: AuthSession, groups: StudentGroup[]): AccountRecord {
  const group = auth.groupId ? groups.find((item) => item.id === auth.groupId) : undefined;
  return {
    id: auth.id || auth.account,
    role: auth.role,
    name: auth.name,
    account: auth.account,
    title: auth.title,
    groupOrScope:
      auth.role === "student"
        ? formatGroupScope(group || (auth.groupLabel ? { label: auth.groupLabel, projectName: auth.groupName || "未命名项目" } : null))
        : auth.role === "teacher"
          ? "创业实践课程教师"
          : "全平台运营",
    groupId: auth.groupId,
    groupLabel: auth.groupLabel,
    groupName: auth.groupName,
    permissions: getBaseRolePermissions(auth.role),
    disabledPermissions: auth.disabledPermissions || [],
    quota: auth.quota || 0,
    status: "已开通",
  };
}

function getStudentIdentity(auth: AuthSession | null, account?: AccountRecord) {
  const parsed = parseGroupScope(account?.groupOrScope);
  const groupLabel = auth?.groupLabel || account?.groupLabel || parsed.groupLabel || "";
  const groupName = auth?.groupName || account?.groupName || parsed.groupName || "";
  return {
    student: auth?.name || account?.name || "演示学生",
    group: groupLabel,
    groupName,
    hasGroup: Boolean(groupLabel),
  };
}

function getStudentGroupDisplay(group?: string, groupName?: string) {
  if (!group) return "未分组";
  return groupName ? `${group} · ${groupName}` : group;
}

function getAccountSubtitle(auth: AuthSession, account?: AccountRecord) {
  if (auth.role !== "student") return auth.title;
  const identity = getStudentIdentity(auth, account);
  return `${getStudentGroupDisplay(identity.group, identity.groupName)} · ${auth.title}`;
}

const baseExperts: Expert[] = [
  {
    id: "brainstorm",
    name: "创意头脑风暴专家",
    role: "把零散想法整理为可验证创业方向",
    scenario: "创意发散、痛点识别、任务清单",
    icon: BrainstormAvatar,
    accent: "#0f7b73",
    skills: [
      { id: "idea-map", name: "创意整理", stage: "头脑风暴", description: "归纳讨论内容，提炼核心创业方向" },
      { id: "pain-points", name: "痛点识别", stage: "需求发现", description: "识别目标用户的高频痛点" },
      { id: "hypothesis", name: "任务清单生成", stage: "验证任务", description: "输出待验证假设和执行任务" },
    ],
  },
  {
    id: "positioning",
    name: "项目定位专家",
    role: "把创业方向转化为清晰价值主张",
    scenario: "价值主张、用户画像、差异化表达",
    icon: PositioningAvatar,
    accent: "#1d5fd1",
    skills: [
      { id: "value", name: "价值主张明确", stage: "产品定位", description: "明确产品为谁解决什么问题" },
      { id: "persona", name: "多维用户画像", stage: "目标用户", description: "生成用户画像和使用场景" },
      { id: "differentiation", name: "差异化表达", stage: "竞争定位", description: "优化一句话定位与卖点" },
    ],
  },
  {
    id: "market",
    name: "市场与竞品专家",
    role: "搭建市场判断和竞品分析框架",
    scenario: "市场机会、竞品维度、进入策略",
    icon: MarketAvatar,
    accent: "#8b5c00",
    skills: [
      { id: "market-size", name: "市场机会", stage: "市场分析", description: "梳理市场空间、趋势和切入窗口" },
      { id: "competitors", name: "竞品维度", stage: "竞品分析", description: "生成竞品对比维度和分析表述" },
      { id: "entry", name: "进入策略", stage: "增长策略", description: "给出早期获客和验证路线" },
    ],
  },
  {
    id: "business",
    name: "商业模式/BP 专家",
    role: "把项目整理成商业计划书框架",
    scenario: "商业模式画布、BP 大纲、财务假设",
    icon: BusinessAvatar,
    accent: "#22406a",
    skills: [
      { id: "canvas", name: "商业模式画布", stage: "商业模式", description: "生成九宫格商业模式画布要点" },
      { id: "bp", name: "BP 大纲", stage: "商业计划书", description: "生成 BP 章节结构和执行摘要" },
      { id: "finance", name: "财务假设", stage: "财务模型", description: "输出收入、成本和关键假设" },
    ],
  },
  {
    id: "pitch",
    name: "路演 PPT 专家",
    role: "将 BP 转换为可讲述的路演结构",
    scenario: "10 页大纲、页面观点、讲稿建议",
    icon: PitchAvatar,
    accent: "#005aa8",
    skills: [
      { id: "deck", name: "10 页 PPT 大纲", stage: "路演 PPT", description: "生成 10 页标题、核心观点和图表建议" },
      { id: "slide-points", name: "页面观点", stage: "观点提炼", description: "提炼每页一句话结论" },
      { id: "speaker-notes", name: "讲稿建议", stage: "路演表达", description: "生成演讲提示和转场话术" },
    ],
  },
  {
    id: "script",
    name: "路演稿生成专家",
    role: "基于 BP 与 PPT 生成多时段路演讲稿",
    scenario: "1 分钟、3 分钟、5 分钟演讲稿与转场话术",
    icon: ScriptAvatar,
    accent: "#7a4b00",
    skills: [
      { id: "roadshow-script", name: "路演稿生成", stage: "路演稿", description: "生成 1/3/5 分钟路演稿、开场钩子和收束话术" },
      { id: "talking-points", name: "讲述要点", stage: "路演表达", description: "提炼逐页讲述重点和评委追问承接" },
    ],
  },
  {
    id: "defense",
    name: "AI 评委/答辩陪练专家",
    role: "模拟评委追问并训练答辩表达",
    scenario: "演说稿、压力测试、回答建议",
    icon: DefenseAvatar,
    accent: "#6a4a12",
    skills: [
      { id: "questions", name: "模拟追问", stage: "答辩准备", description: "生成评委可能追问的问题" },
      { id: "answers", name: "回答建议", stage: "答辩优化", description: "给出结构化回答建议" },
      { id: "stress", name: "压力测试", stage: "现场应变", description: "识别商业模型漏洞并追问" },
    ],
  },
  {
    id: "media",
    name: "多媒体物料专家",
    role: "快速产出宣传视频脚本、分镜与海报 Prompt",
    scenario: "视频脚本、分镜表、海报文案、视觉 Prompt",
    icon: MediaAvatar,
    accent: "#0b6b88",
    skills: [
      { id: "video-script", name: "宣传视频脚本", stage: "多媒体展示", description: "生成 30 秒项目宣传视频脚本" },
      { id: "storyboard", name: "视频分镜表", stage: "视觉脚本", description: "拆解 6 镜头分镜、旁白、字幕与时长" },
      { id: "poster", name: "海报文案 Prompt", stage: "海报物料", description: "输出海报标题、文案和生图 Prompt" },
      { id: "visual", name: "视觉素材 Prompt", stage: "原型视觉", description: "生成产品视觉图和宣传图提示词" },
    ],
  },
];

let experts: Expert[] = baseExperts;
const baseStudentExpertIds: ExpertId[] = ["brainstorm", "positioning", "market", "business", "pitch", "script", "media"];
let studentExpertIds: ExpertId[] = baseStudentExpertIds;

function normalizeCustomExperts(records: CustomExpertRecord[]) {
  return records
    .filter((item) => item.name.trim())
    .map((item) => ({
      ...item,
      id: item.id || `custom-${Date.now()}`,
      accent: item.accent || "#0f7b73",
      skills: item.skills?.length
        ? item.skills
        : [{ id: "custom-output", name: "阶段成果生成", stage: "自定义专家", description: "根据教师配置的提示词生成阶段成果" }],
    }));
}

function buildCustomExpert(record: CustomExpertRecord): Expert {
  return {
    ...record,
    icon: (props) => <CartoonExpertAvatar {...props} variant={record.id} />,
  };
}

function mergeExperts(customExperts: CustomExpertRecord[], deletedExpertIds: ExpertId[] = []) {
  const normalized = normalizeCustomExperts(customExperts);
  const customIds = new Set(normalized.map((item) => item.id));
  const deletedIds = new Set(deletedExpertIds);
  const base = baseExperts.filter((expert) => !customIds.has(expert.id) && !deletedIds.has(expert.id));
  return [...base, ...normalized.filter((item) => item.active !== false && !deletedIds.has(item.id)).map(buildCustomExpert)];
}

function isStudentExpertId(expertId: ExpertId) {
  return studentExpertIds.includes(expertId);
}

function getStudentExpertPermissionNames() {
  return experts.filter((expert) => isStudentExpertId(expert.id)).map((expert) => expert.name);
}

const studentFeaturePermissionSet = new Set(studentFeaturePermissionNames);
function getGenerationJobArtifactUrl(jobId: string) {
  return `/api/generation/jobs/${encodeURIComponent(jobId)}/artifact`;
}
const artifactExpertMap: Record<ArtifactType, ExpertId> = {
  BRAINSTORM: "brainstorm",
  POSITIONING: "positioning",
  MARKET: "market",
  BP: "business",
  PPT: "pitch",
  SCRIPT: "script",
  DEFENSE: "defense",
  MEDIA: "media",
};

function isStudentExpertEnabled(expert: Expert, account?: AccountRecord) {
  if (!account || account.role !== "student") return true;
  if (account.status === "已停用") return false;
  if (expert.id.startsWith("custom-") && !(account.disabledPermissions || []).includes(expert.name)) return true;
  if (!account.permissions.includes(expert.name)) return false;
  return !(account.disabledPermissions || []).includes(expert.name);
}

function resolveMessageExpert(message: Pick<ChatMessage, "expertId" | "expertName" | "artifactType">, fallback: Expert) {
  if (message.expertId) return experts.find((expert) => expert.id === message.expertId) || fallback;
  if (message.expertName) return experts.find((expert) => expert.name === message.expertName) || fallback;
  if (message.artifactType) return experts.find((expert) => expert.id === artifactExpertMap[message.artifactType]) || fallback;
  return fallback;
}

const initialIdeas: Idea[] = [
  {
    id: "I-1001",
    title: "AI 就业教练",
    description: "面向高校学生的 AI 职业发展助手，帮助学生完成职业定位、简历优化、模拟面试、岗位匹配和求职计划制定。",
    stage: "路演 PPT",
    updatedAt: "11:05",
  },
  {
    id: "I-1002",
    title: "校园低碳积分平台",
    description: "用积分、任务和企业赞助激励学生参与低碳行为，沉淀校园 ESG 数据。",
    stage: "市场竞品",
    updatedAt: "10:18",
  },
];

function inferKnowledgeCategory(name: string): KnowledgeCategory {
  const lower = name.toLowerCase();
  if (lower.includes("bp") || lower.includes("商业计划")) return "BP 模板";
  if (lower.includes("ppt") || lower.includes("路演")) return "PPT 模板";
  if (lower.includes("rubric") || lower.includes("评分")) return "评分标准";
  if (lower.includes("答辩") || lower.includes("问题")) return "答辩题库";
  if (lower.includes("视频") || lower.includes("分镜") || lower.includes("海报") || lower.includes("prompt")) return "多媒体模板";
  if (lower.includes("案例")) return "创业案例";
  return "教学大纲";
}

function matchesKnowledgeUploadSearch(asset: KnowledgeUpload, search: KnowledgeUploadSearch) {
  const category = asset.category || inferKnowledgeCategory(asset.name);
  const enabled = asset.enabled !== false;
  const keyword = search.keyword.trim().toLowerCase();
  const content = [asset.name, category, asset.fileType, asset.sizeLabel, asset.preview].join(" ").toLowerCase();
  return (
    (!keyword || content.includes(keyword)) &&
    (search.category === "ALL" || category === search.category) &&
    (search.status === "ALL" || (search.status === "enabled" ? enabled : !enabled))
  );
}

function normalizeStudentKnowledgeSelection(value: unknown): StudentKnowledgeSelection {
  if (!value || typeof value !== "object") return { categories: [], uploadIds: [] };
  const input = value as Partial<StudentKnowledgeSelection> & { selectedCategories?: KnowledgeCategory[] };
  const categories = Array.isArray(input.categories)
    ? input.categories.filter((item): item is KnowledgeCategory => typeof item === "string")
    : Array.isArray(input.selectedCategories)
      ? input.selectedCategories.filter((item): item is KnowledgeCategory => typeof item === "string")
      : [];
  const uploadIds = Array.isArray(input.uploadIds) ? input.uploadIds.filter((item): item is string => typeof item === "string") : [];
  return {
    categories: Array.from(new Set(categories)),
    uploadIds: Array.from(new Set(uploadIds)),
  };
}

function resolveSelectedKnowledgeSources(
  selection: StudentKnowledgeSelection,
  uploads: KnowledgeUpload[],
  states: KnowledgeBaseStates,
  allowedCategories?: KnowledgeCategory[],
) {
  const allowedSet = allowedCategories?.length ? new Set(allowedCategories) : null;
  const categorySet = new Set(
    selection.categories.filter((category) => states[category] !== false && (!allowedSet || allowedSet.has(category))),
  );
  const selectedUploads = uploads.filter((asset) => {
    const category = asset.category || inferKnowledgeCategory(asset.name);
    return (
      selection.uploadIds.includes(asset.id) &&
      asset.enabled !== false &&
      (asset.extractionStatus === undefined || asset.extractionStatus === "READY") &&
      states[category] !== false &&
      (!allowedSet || allowedSet.has(category)) &&
      !categorySet.has(category)
    );
  });
  const categories = Array.from(categorySet);
  const categoryUploads = uploads.filter((asset) => {
    const category = asset.category || inferKnowledgeCategory(asset.name);
    return asset.enabled !== false &&
      (asset.extractionStatus === undefined || asset.extractionStatus === "READY") &&
      categorySet.has(category) &&
      (!allowedSet || allowedSet.has(category));
  });
  const uploadMap = new Map<string, KnowledgeUpload>();
  [...selectedUploads, ...categoryUploads].forEach((asset) => uploadMap.set(asset.id, asset));
  return { categories, uploads: Array.from(uploadMap.values()) };
}

function getKnowledgeUsageBlock(
  expertId: ExpertId,
  uploads: KnowledgeUpload[],
  states: KnowledgeBaseStates,
  canCallKnowledge: boolean,
  selection: StudentKnowledgeSelection,
  allowedCategories?: KnowledgeCategory[],
): ResultBlock {
  const expertCategories = allowedCategories?.length ? allowedCategories : getExpertKnowledgeCategories(expertId);
  const resolved = resolveSelectedKnowledgeSources(selection, uploads, states, expertCategories);
  const categories = resolved.categories.filter((category) => expertCategories.includes(category));
  const selectedButUnavailable = selection.categories.filter(
    (category) => states[category] === false || !expertCategories.includes(category),
  );
  if (!canCallKnowledge) {
    return {
      title: "参考资料说明",
      items: [
        "这轮我先按课程内置范例帮你拆，不引用教师端知识库资料。",
        "当前账号没有“调用课程知识库”权限，管理员重新开启后，学生端会自动恢复参考资料。",
      ],
    };
  }
  if (categories.length === 0 && resolved.uploads.length === 0) {
    return {
      title: "参考资料说明",
      items: [
        selectedButUnavailable.length
          ? `你之前选的 ${selectedButUnavailable.join("、")} 当前没有开放给这个专家，我先按该专家允许的课程口径继续帮你推进。`
          : "你这轮没有选择该专家可用的知识库，我先按课程内置范例继续帮你推进。",
        `当前专家可调用：${expertCategories.map((category) => `${category}知识库`).join("、") || "暂无配置"}。`,
      ],
    };
  }
  const sourceItems = resolved.uploads.length
    ? resolved.uploads.slice(0, 6).map((asset) => `${asset.category || inferKnowledgeCategory(asset.name)}知识库：${asset.name}（${asset.sizeLabel}）`)
    : categories.map((category) => `${category}知识库：暂无教师上传资料，使用平台预置课程模板口径。`);
  return {
    title: "我会参考这些资料",
    items: [
      categories.length
        ? `这轮先参考 ${categories.map((category) => `${category}知识库`).join("、")}，把回答收在课程作业能用的范围内。`
        : "这轮先参考你选中的具体材料，把回答收在课程作业能用的范围内。",
      ...sourceItems,
      selectedButUnavailable.length
        ? `另外，${selectedButUnavailable.join("、")} 当前不在该专家开放范围内，学生端不会引用。`
        : "我会把资料当作参考，不会写成系统调用日志。",
    ],
  };
}

function getKnowledgeSpecificBlocks(
  expertId: ExpertId,
  selection: StudentKnowledgeSelection,
  shouldOutput: boolean,
  uploads: KnowledgeUpload[] = [],
  states: KnowledgeBaseStates = {},
  allowedCategories?: KnowledgeCategory[],
): ResultBlock[] {
  const expertCategories = allowedCategories?.length ? allowedCategories : getExpertKnowledgeCategories(expertId);
  const resolved = resolveSelectedKnowledgeSources(selection, uploads, states, expertCategories);
  const selected =
    resolved.categories[0] ||
    (resolved.uploads[0] ? resolved.uploads[0].category || inferKnowledgeCategory(resolved.uploads[0].name) : undefined) ||
    expertCategories[0] ||
    getExpertKnowledgeCategories(expertId)[0];
  const selectedUploadNames = resolved.uploads.slice(0, 3).map((asset) => asset.name);
  const publicReferenceBlock: ResultBlock = {
    title: "外部公开资料参考",
    items: [
      "高校职业发展场景中，AI 工具常被用于简历反馈、模拟面试、岗位探索和职业路径建议；平台文案会把这些能力落到学生端任务，而不是只写“AI 生成”。",
      "创业教育场景中，BP 和路演材料通常要覆盖问题、目标用户、解决方案、市场、商业模式、财务假设、团队、风险和验证计划；因此最终 Word 会补齐这些章节。",
      "路演评审常追问商业可行性、客户为什么付费、数据安全、落地成本和试点指标；答辩和 PPT 内容会围绕这些问题提前准备。",
    ],
  };
  const map: Record<string, ResultBlock> = {
    教学大纲: {
      title: "按课程阶段补强",
      items: [
        "第 1-2 周：创意发散、目标用户访谈、问题场景归纳，交付《头脑风暴整理表》和《访谈问题清单》。",
        "第 3-4 周：项目定位、竞品对比、价值主张收敛，交付《产品定位说明》和《市场假设清单》。",
        "第 5-6 周：商业模式、BP、PPT 初稿，交付《商业模式画布》《BP 核心模块》和《10 页路演结构》。",
        "第 7-8 周：答辩模拟、教师审核、修改复盘，交付《答辩记录》《教师反馈闭环》和《优秀案例沉淀标签》。",
      ],
    },
    "BP 模板": {
      title: "BP 模板补强",
      items: [
        "执行摘要：一句话说明项目、第一用户、核心痛点、解决方案和首期试点目标。",
        "商业模式：先写清付费方，再写采购理由、交付包、定价假设、续费理由和成本边界。",
        "运营计划：用 8 周试点拆任务，指标包括活跃学生数、阶段成果数、教师审核数、退回修改数和优秀案例数。",
        "风险应对：至少覆盖内容质量、学生依赖、教师使用成本、数据安全、真实接口成本五类风险。",
      ],
    },
    "PPT 模板": {
      title: "PPT 模板补强",
      items: [
        "每页标题改成结论句，例如“学生缺的不是工具，而是连续反馈闭环”，不要只写“用户痛点”。",
        "10 页建议顺序：封面、课堂痛点、第一用户、解决方案、三端闭环、知识库与审核、商业模式、8 周试点、风险应对、下一步计划。",
        "每页都要配一类证据：访谈原话、课程流程、三端截图、试点指标、评分 Rubric 或风险矩阵。",
        "页脚保留评委追问提示，方便路演稿和答辩模拟承接。",
      ],
    },
    评分标准: {
      title: "评分标准补强",
      items: [
        "创新性：是否不是简单套壳通用 AI，而是结合课程模板、教师审核和成果沉淀形成闭环。",
        "可行性：是否说清第一用户、付费方、交付物、试点周期和资源投入。",
        "商业价值：是否能解释学院或课程组为什么愿意采购，以及采购后能看见哪些指标。",
        "表达质量：BP、PPT、路演稿和答辩回答是否能互相承接，避免每份材料口径不一致。",
      ],
    },
    创业案例: {
      title: "创业案例补强",
      items: [
        "参考同类教育科技项目的切入方式：先从一个高频教学节点切入，再扩展到课程全流程。",
        "本项目适合先切“创业实践课成果生成与审核”，不要一开始扩成所有职业服务场景。",
        "案例表达建议：用一个学生小组从讨论录音到 BP、PPT、答辩的完整路径证明价值。",
        "客户演示时重点讲试点样板，而不是讲远期大平台愿景。",
      ],
    },
    答辩题库: {
      title: "答辩题库补强",
      items: [
        "商业模式追问：谁付费？预算从哪里来？不采购会有什么损失？",
        "产品边界追问：和通用 AI、招聘平台、学校作业系统分别有什么不同？",
        "教学价值追问：老师为什么愿意用？学生为什么会持续用？学院能沉淀什么？",
        "风险追问：学生隐私、内容幻觉、教师审核压力、真实生成成本分别怎么处理？",
      ],
    },
    多媒体模板: {
      title: "多媒体模板补强",
      items: [
        "30 秒视频建议只讲一条主线：课堂讨论很乱，AI 帮学生成稿，老师审核修改，成果进入案例库。",
        "6 镜头结构：课堂讨论、学生输入、AI 输出、教师审核、答辩模拟、成果沉淀。",
        "海报文案避免夸张科技感，突出“从课堂创意到路演成果，让每一次实践都有反馈”。",
        "视觉 Prompt 保持高校商学院质感：深蓝、白、浅灰、金色点缀，真实课堂和产品界面结合。",
      ],
    },
  };
  const fallbackBlock: ResultBlock = {
    title: `${selected}知识库补强`,
    items: [
      `当前选择了${selected}知识库，系统会优先引用该目录下已启用资料。`,
      selectedUploadNames.length ? `本轮重点参考材料：${selectedUploadNames.join("、")}。` : "本轮未指定具体材料，优先使用目录下已启用资料。",
      "如果该目录暂无资料，平台会使用课程通用口径生成建议。",
      "建议先上传模板、案例或评分材料，让学生端回答更贴近课堂要求。",
    ],
  };
  const categoryBlock = map[selected] || fallbackBlock;
  const materialBlock =
    selectedUploadNames.length && map[selected]
      ? {
          title: "本轮指定材料",
          items: selectedUploadNames.map((name) => `优先参考：${name}`),
        }
      : null;
  return shouldOutput
    ? [publicReferenceBlock, categoryBlock, ...(materialBlock ? [materialBlock] : [])]
    : [categoryBlock, ...(materialBlock ? [materialBlock] : [])];
}

function buildPromptTemplateParts(
  expert: Expert,
  uploads: KnowledgeUpload[],
  states: KnowledgeBaseStates,
  selectedCategories: KnowledgeCategory[] = getExpertKnowledgeCategories(expert.id),
) {
  const activeCategories = selectedCategories.length ? selectedCategories : getExpertKnowledgeCategories(expert.id);
  const promptKnowledgeBases = getKnowledgeCatalogItems(activeCategories);
  const enabledKnowledgeCount = uploads.filter(
    (asset) =>
      asset.enabled !== false &&
      states[asset.category || inferKnowledgeCategory(asset.name)] &&
      activeCategories.includes(asset.category || inferKnowledgeCategory(asset.name)),
  ).length;
  const uploadedSkillBlock = expert.sourceSkillContent
    ? `

已上传并调试通过的专家 Skill：
- 来源文件：${expert.sourceSkillName || "未命名 Skill"}
- 上传来源：${expert.sourceSkillUploadedBy || "教师端/管理端"}
- 上传时间：${expert.sourceSkillUploadedAt || "当前演示"}

${expert.sourceSkillContent}`
    : "";
  const systemPrompt = expert.systemPrompt?.trim();
  const userPrompt = expert.userPrompt?.trim();
  return {
    system: systemPrompt || `角色：${expert.name}
定位：${expert.role}
适用场景：${expert.scenario}

技能匹配方式：系统根据学生提问自动匹配该专家下的技能，不再在学生输入框展示技能下拉。
覆盖技能：${expert.skills.map((skill) => `${skill.stage}/${skill.name}`).join("、")}

知识库引用规则：
${promptKnowledgeBases.map((base) => `- ${base.category}知识库：${base.description}`).join("\n")}
引用方式：优先使用已启用资料；如果某个知识库暂无教师上传资料，则使用平台预置教学口径生成，但需要在结果中保持“知识来源标签”。

回答方式策略：Auto、快速生成和深度分析由平台在每次调用时统一叠加，不写死在专家基础提示词中。
成果类型策略：Word、PPTX 和视频是独立成果流程，不是回答方式。

输出要求：
1. 结合上海财经大学商学院创业实践课程场景，保持正式、教学导向、可审核。
2. 输出必须包含“生成摘要、关键建议、风险提醒、下一步动作”四类内容。
3. 如涉及阶段成果，需明确该成果可提交教师审核，并说明教师可重点看哪些判断依据。
4. 不出现底层供应商、真实模型名称或 token 信息。${uploadedSkillBlock}`,
    user: userPrompt || `学生输入变量：
- 当前创意：项目名称、目标用户、问题场景、已验证/待验证假设
- 历史上下文：同一创意下最近 5 轮对话、已生成的阶段成果、教师反馈意见
- 本轮输入：学生文本，以及平台预处理后的可读资料摘要；图片需 OCR/视觉摘要，音频需 ASR 转写，视频需音轨转写与关键帧摘要
- 当前专家字段：${expert.name} / ${expert.scenario}
- 可引用知识库：${promptKnowledgeBases.map((base) => `${base.category}知识库`).join("、")}
- 已启用资料数量：${enabledKnowledgeCount} 个；如为 0，则使用平台预置教学口径并保留知识来源标签

生成任务：
请基于以上上下文调用“${expert.name}”，由系统自动匹配技能；平台会在运行时追加学生选择的回答方式。

组装规则：
1. 先判断学生当前处于哪个阶段节点，优先读取同一创意下与该节点相关的历史成果。
2. 从${promptKnowledgeBases.map((base) => `${base.category}知识库`).join("、")}中检索已启用资料，并把命中的资料转成“知识来源标签”。
3. 按专家能力边界输出内容；Word、PPTX 和视频由独立成果流程承接，不能因为回答方式不同而虚构已生成文件。
4. 输出必须能被学生直接复制到阶段成果中，并标明是否建议提交老师审核。
5. 如学生输入与当前技能不匹配，需要先温和纠偏，再给出可继续推进的结果。`,
    knowledgeBases: promptKnowledgeBases,
    enabledKnowledgeCount,
  };
}

const initialMessages: ChatMessage[] = [
  {
    id: "M-1001",
    ideaId: "I-1001",
    sender: "user",
    mode: "文本",
    content: "请把 AI 就业教练整理成 10 页路演 PPT。",
    createdAt: "11:05",
  },
  {
    id: "M-1002",
    ideaId: "I-1001",
    sender: "ai",
    expertId: "pitch",
    expertName: "路演 PPT 专家",
    skillName: "10 页 PPT 大纲",
    artifactType: "PPT",
    content: "已基于 BP 草稿生成路演结构，建议突出学校端付费价值和教学数据闭环。",
    blocks: buildBlocks("pitch", "10 页 PPT 大纲", "Auto"),
    createdAt: "11:06",
  },
];

function nowTime() {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function nowDateTime() {
  return new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatSubmittedAt(value: string) {
  if (/\d{4}/.test(value)) return value;
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${today} ${value}`;
}

function getSubmittedDateKey(value: string) {
  const match = formatSubmittedAt(value).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function formatWorkspaceTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function mapRemoteIdea(idea: RemoteStudentIdea): Idea {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    stage: idea.stage,
    updatedAt: formatWorkspaceTime(idea.updatedAt),
  };
}

function normalizeRemoteBlocks(value: unknown): ResultBlock[] | undefined {
  return readArtifactBlocks(value);
}

function mergeManageableExperts(activeExperts: Expert[], records: CustomExpertRecord[]) {
  const merged = new Map(activeExperts.map((expert) => [expert.id, expert]));
  records.forEach((record) => merged.set(record.id, buildCustomExpert(record)));
  return Array.from(merged.values());
}

function mapRemoteMessage(message: RemoteConversationMessage): ChatMessage {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId,
    ideaId: message.ideaId,
    sender: message.sender === "AI" ? "ai" : "user",
    mode:
      message.inputMode === "录音" || message.inputMode === "语音" || message.inputMode === "文件"
        ? message.inputMode
        : message.inputMode === "文本"
          ? "文本"
          : undefined,
    expertId: message.expertId,
    expertName: message.expertName,
    skillName: message.skillName,
    artifactType: isArtifactType(message.artifactType) ? message.artifactType : undefined,
    content: message.content,
    blocks: normalizeRemoteBlocks(message.blocks),
    createdAt: formatWorkspaceTime(message.createdAt),
  };
}

function formatRemoteDateTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function mapRemoteSubmission(submission: RemoteSubmission): Submission {
  const statusMap: Record<RemoteSubmission["status"], SubmissionStatus> = {
    PENDING: "pending",
    APPROVED: "approved",
    REVISION: "revision",
    WITHDRAWN: "withdrawn",
  };
  return {
    id: submission.id,
    artifactId: submission.artifactId,
    ideaId: submission.ideaId,
    student: submission.student,
    group: submission.group,
    groupName: submission.groupName,
    artifactType: isArtifactType(submission.artifactType) ? submission.artifactType : "BP",
    artifactTitle: submission.artifactTitle,
    artifactSummary: submission.artifactSummary,
    blocks: normalizeRemoteBlocks(submission.content) || [],
    status: statusMap[submission.status],
    submittedAt: formatRemoteDateTime(submission.submittedAt) || submission.submittedAt,
    reviewedAt: formatRemoteDateTime(submission.reviewedAt),
    teacherComment: submission.teacherComment,
    sourceMessageId: submission.sourceMessageId,
    isExcellent: submission.excellent,
    aiDiagnosis: submission.aiDiagnosis,
  };
}

function matchesTeacherReviewSearch(submission: Submission, search: TeacherReviewSearch) {
  const keyword = search.keyword.trim().toLowerCase();
  const submittedDate = getSubmittedDateKey(submission.submittedAt);
  const content = [
    submission.student,
    submission.group,
    submission.groupName || "",
    artifactLabels[submission.artifactType],
    submission.artifactTitle,
    submission.artifactSummary,
  ]
    .join(" ")
    .toLowerCase();
  return (
    (!keyword || content.includes(keyword)) &&
    (search.artifactType === "ALL" || submission.artifactType === search.artifactType) &&
    (search.status === "ALL" || submission.status === search.status) &&
    (!search.startDate || (!!submittedDate && submittedDate >= search.startDate)) &&
    (!search.endDate || (!!submittedDate && submittedDate <= search.endDate))
  );
}

function getSubmissionStageIndex(submission: Submission) {
  return artifactStageIndex[submission.artifactType] ?? 0;
}

function buildRubricScores(_submission: Submission, diagnosis?: DiagnosisResult): RubricScore[] {
  const diagnosisScores = new Map((diagnosis?.scores || []).map((score) => [score.name, score.score]));
  return rubricDimensions.map(([name, description, weight]) => {
    const reported = diagnosisScores.get(name);
    const aiScore = typeof reported === "number" ? Math.min(weight, Math.max(0, Math.round(reported * 10) / 10)) : 0;
    return { name, description, weight, aiScore, teacherScore: aiScore };
  });
}

function makeId(prefix: string) {
  return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
}

function makePersistentId(prefix: string) {
  return `${prefix}-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`}`;
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

function appendVoiceText(baseText: string, voiceText: string) {
  const base = baseText.trim();
  const transcript = voiceText.trim();
  if (!base) return transcript;
  if (!transcript) return base;
  return `${base}\n${transcript}`;
}

function useSpeechInput(options: { value: string; onChange: (value: string) => void; fallbackText: string }) {
  const [isListening, setIsListening] = useState(false);
  const [notice, setNotice] = useState("");
  const [hasVoiceInput, setHasVoiceInput] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function start() {
    const Recognition = getSpeechRecognitionConstructor();
    baseTextRef.current = options.value;

    if (!Recognition) {
      options.onChange(appendVoiceText(options.value, options.fallbackText));
      setHasVoiceInput(true);
      setNotice("当前浏览器不支持实时语音识别，已填入一段演示语音内容。建议使用 Chrome 或 Edge 演示。");
      return;
    }

    const recognition = new Recognition();
    let latestTranscript = "";
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setIsListening(true);
      setNotice("正在听写，请直接说出你的想法。");
    };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || "";
      }
      latestTranscript = transcript.trim();
      if (latestTranscript) {
        options.onChange(appendVoiceText(baseTextRef.current, latestTranscript));
        setHasVoiceInput(true);
        setNotice("正在识别：" + latestTranscript);
      }
    };
    recognition.onerror = (event) => {
      const reason = event.error === "not-allowed" ? "请允许浏览器使用麦克风后再试。" : event.message || "请检查麦克风或浏览器权限。";
      if (!latestTranscript) {
        options.onChange(appendVoiceText(baseTextRef.current, options.fallbackText));
        setHasVoiceInput(true);
      }
      setNotice("语音识别失败：" + reason + " 已填入一段演示语音内容，方便继续演示。");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (!latestTranscript) {
        options.onChange(appendVoiceText(baseTextRef.current, options.fallbackText));
        setHasVoiceInput(true);
        setNotice("语音已整理成文字，可继续编辑或直接发送。");
        return;
      }
      setNotice("语音已转成文字，可继续编辑或发送。");
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
      options.onChange(appendVoiceText(options.value, options.fallbackText));
      setHasVoiceInput(true);
      setNotice("语音识别启动受限，已填入一段演示语音内容。");
    }
  }

  function toggle() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setNotice("语音听写已停止，正在整理识别文本。");
      return;
    }
    start();
  }

  function resetVoiceInput() {
    setHasVoiceInput(false);
    setNotice("");
  }

  return { hasVoiceInput, isListening, notice, resetVoiceInput, toggle };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function triggerDownload(href: string, filename: string, revokeUrl = false) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (revokeUrl) window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function downloadWord(filename: string, title: string, blocks?: ResultBlock[]) {
  const body = blocks?.length
    ? blocks
        .map(
          (block) =>
            `<h2>${escapeHtml(block.title)}</h2><ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
        )
        .join("")
    : "<p>暂无结构化成果内容。</p>";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:"Microsoft YaHei",Arial,sans-serif;line-height:1.75;color:#10233f;padding:40px 48px}.doc-meta{color:#5f7088;font-size:13px;margin:0 0 18px}h1{color:#003b79;border-bottom:3px solid #bf8f2a;padding-bottom:12px;margin-bottom:10px}h2{margin:26px 0 10px;color:#003b79;font-size:20px}ul{margin-top:8px;padding-left:22px}li{margin:7px 0}.footer{margin-top:34px;padding-top:12px;border-top:1px solid #d7e3ef;color:#7b8ca4;font-size:12px}</style></head><body><h1>${escapeHtml(title)}</h1><p class="doc-meta">上海财经大学商学院 AI 赋能创业实践教学示范平台｜阶段成果自动生成稿</p>${body}<p class="footer">说明：本文件由平台根据当前成果内容生成，请结合课程资料和教师审核意见复核。</p></body></html>`;
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), filename, true);
}

function getDownloadTitle(message: Pick<ChatMessage, "artifactType" | "skillName">, fallback = "AI 生成成果") {
  if (!message.artifactType) return fallback;
  if (message.artifactType === "POSITIONING") return "产品定位说明大纲";
  if (message.artifactType === "BP") return "商业计划书 BP 初稿";
  if (message.artifactType === "PPT") return "路演 PPT";
  if (message.artifactType === "BRAINSTORM") return "待验证任务清单";
  if (message.artifactType === "DEFENSE") return "答辩复盘";
  if (message.artifactType === "MEDIA") return "创意物料包";
  return message.skillName || artifactLabels[message.artifactType];
}

function getBrainstormTaskBlocks(blocks?: ResultBlock[]): ResultBlock[] {
  const candidates =
    blocks?.filter((block) => {
      const title = block.title || "";
      const joinedItems = block.items.join(" ");
      return /任务|行动|验证|清单/.test(title) || /任务|访谈|验证|交付物|负责人|样本|岗位 JD/.test(joinedItems);
    }) || [];

  if (candidates.length) return candidates;

  const availableBlocks = blocks?.filter((block) => block.items.length) || [];
  if (availableBlocks.length) return availableBlocks;

  return [
    {
      title: "待验证任务清单",
      items: [
        "任务 1：访谈 8 名上财商学院学生，覆盖大二、大三、大四和研究生；记录他们在简历、岗位选择、面试、创业项目表达中的真实困难。",
        "任务 2：收集 5 份真实岗位 JD，覆盖金融、咨询、互联网产品、市场营销、商业分析；测试 AI 能否拆解岗位要求并映射到学生经历。",
        "任务 3：选取 3 份学生简历初稿，分别让 AI 输出修改建议，再请同学判断建议是否可执行、是否比通用 AI 更贴近商学院场景。",
        "任务 4：请 2 位创业实践课教师评估 AI 生成的产品定位、BP、PPT、答辩建议是否符合课程评分标准。",
        "任务 5：设计一张“修改前后对比表”，记录学生原始表达、AI 建议、学生修改稿、教师点评和最终得分。",
        "任务 6：在 10 个小组中试跑一次“创意-定位-BP-PPT-答辩”链路，统计每组完成时间和卡点。",
      ],
    },
    {
      title: "任务分工与交付物",
      items: [
        "产品同学：整理学生端聊天流程和阶段成果字段，交付一张功能流程图。",
        "调研同学：完成学生访谈、教师访谈和岗位 JD 收集，交付访谈纪要与岗位能力标签表。",
        "展示同学：准备 PPT、宣传视频和答辩稿，交付路演素材包。",
        "课程对接同学：整理评分 Rubric、BP 模板和优秀案例标签，交付知识库分类清单。",
      ],
    },
    {
      title: "验证标准",
      items: [
        "学生访谈中至少 60% 的受访者认为持续反馈比一次性生成更有价值。",
        "教师评估中至少 2 位教师认可 AI 初稿能减少重复点评时间。",
        "试跑小组能在 8 周链路内形成定位说明、BP、PPT 和答辩记录四类成果。",
      ],
    },
  ];
}

function downloadArtifactWord(message: Pick<ChatMessage, "artifactType" | "blocks" | "skillName">, titlePrefix = "") {
  const title = `${titlePrefix}${getDownloadTitle(message, "阶段对话记录")}`;
  const filename = `${title}.doc`;
  if (message.artifactType === "BRAINSTORM") {
    downloadWord("待验证任务清单.doc", "待验证任务清单", getBrainstormTaskBlocks(message.blocks));
    return;
  }
  downloadWord(filename, title, message.blocks);
}

function downloadPptAsset(asset?: GeneratedAsset) {
  if (!asset?.pptUrl) return false;
  triggerDownload(asset.pptUrl, asset.pptFileName || `${asset.title}.pptx`);
  return true;
}

async function generateLexiangPptContext(message: ChatMessage, idea: Idea) {
  const query = [
    `请基于课程知识库，为《${idea.title}》生成路演 PPT 结构。`,
    `学生输入：${message.content}`,
    ...(message.blocks || []).slice(0, 6).map((block) => `${block.title}：${block.items.slice(0, 4).join("；")}`),
  ].join("\n").slice(0, 1024);
  return requestLexiangPptContext({
    projectId: idea.id,
    conversationId: message.ideaId,
    expertId: message.expertId || "pitch",
    query,
  });
}

function buildMediaAsset(idea: Idea, sourceMessage?: ChatMessage): GeneratedAsset {
  const title = `${idea.title} - 宣传视频物料`;
  return {
    id: makePersistentId("A"),
    ideaId: idea.id,
    type: "VIDEO",
    title,
    sourceMessageId: sourceMessage?.id,
    createdAt: nowTime(),
    prompt:
      "模型提示词：上海财经大学商学院创业实践课程成果展示宣传片，16:9 横版，正式高校商学院气质，深蓝、白色、浅灰为主色，金色点缀。画面包含商学院课堂、小组讨论、学生端 AI 创意工作台、教师审核中心、BP/PPT 生成、答辩模拟和成果沉淀看板。风格干净、高级、真实，不要过度赛博，不要卡通，不要夸张科技粒子。",
    script:
      "0-5秒：商学院课堂，小组围绕创业项目讨论。字幕：从一个课堂创意开始。旁白：在创业实践课上，学生常常有很多想法，却难以快速形成清晰方案。\n5-10秒：学生在 AI 创意工作台输入项目想法，系统生成头脑风暴整理和待验证任务清单。字幕：AI 辅助头脑风暴整理。旁白：AI 助教帮助学生归纳创意、识别痛点、生成可执行任务。\n10-15秒：产品定位说明大纲、商业计划书 BP 和路演 PPT 依次出现。字幕：从想法到方案。旁白：项目定位、商业计划书和路演 PPT 可以被快速结构化产出。\n15-20秒：教师端审核中心，老师查看学生成果并给出退回修改意见。字幕：教师关键节点审核。旁白：教师可以查看过程记录，给出修改建议，让 AI 生成真正进入教学闭环。\n20-25秒：答辩模拟页面，AI 评委提出追问，学生进行语音回答。字幕：答辩模拟与表达提升。旁白：系统模拟路演答辩场景，帮助学生提升商业表达和临场应变能力。\n25-30秒：成果库、数据看板和学生路演展示。字幕：过程可见｜反馈可追踪｜成果可沉淀。旁白：让创业实践教学从结果提交，升级为全过程培养。",
    storyboard:
      "镜头1：上海财经大学商学院课堂全景，学生小组围桌讨论，桌面有笔记本和创业项目草稿；字幕“从课堂创意开始”；时长5秒。\n镜头2：学生端 AI 创意工作台特写，聊天框输入项目想法，右侧出现“核心创意、用户痛点、待验证任务”；字幕“AI 辅助头脑风暴整理”；时长5秒。\n镜头3：系统自动生成《产品定位说明大纲》《商业计划书 BP 初稿》《路演 PPT》三个成果卡片；字幕“从想法到方案”；时长5秒。\n镜头4：教师端提交审核中心，老师打开学生成果，填写点评意见并点击退回修改；字幕“教师关键节点审核”；时长5秒。\n镜头5：答辩模拟界面，AI 评委弹出压力测试问题，学生语音回答；字幕“答辩模拟与表达提升”；时长5秒。\n镜头6：路演现场和成果库看板交替出现，展示优秀案例、试点数据和成果沉淀；字幕“过程可见、反馈可追踪、成果可沉淀”；时长5秒。",
    posterPrompt:
      "海报主标题：AI 赋能创业实践课。副标题：从课堂创意到路演成果，让每一次实践都有反馈、有修改、有沉淀。卖点短句：头脑风暴整理｜产品定位说明｜BP 与 PPT 生成｜答辩模拟｜教师审核反馈。行动号召：开启商学院创业实践教学新闭环。",
    visualPrompt:
      "产品视觉图 Prompt：上海财经大学商学院数字化教学平台界面，深蓝白色高级 UI，左侧是学生创意空间与 AI 对话，中间展示产品定位、BP、PPT、答辩模拟成果卡片，右侧是教师审核反馈面板和成果沉淀数据，画面真实、正式、适合高校商学院客户演示。",
  };
}

function downloadMediaPackage(asset: GeneratedAsset) {
  downloadWord(`${asset.title}.doc`, asset.title, [
    { title: "模型提示词", items: [asset.prompt || ""] },
    { title: "30 秒宣传视频脚本", items: (asset.script || "").split("\n") },
    { title: "视频分镜表", items: (asset.storyboard || "").split("\n") },
    { title: "海报文案 Prompt", items: [asset.posterPrompt || ""] },
    { title: "产品视觉图 Prompt", items: [asset.visualPrompt || ""] },
  ]);
}

function downloadVideoAsset(asset?: GeneratedAsset) {
  if (!asset?.videoUrl) return false;
  triggerDownload(asset.videoUrl, `${asset.title}.mp4`);
  return true;
}

function getSubmissionPptAsset(submission: Submission, generatedAssets: GeneratedAsset[]) {
  return (
    generatedAssets.find((asset) => asset.type === "PPT" && asset.sourceMessageId === submission.sourceMessageId) ||
    generatedAssets.find((asset) => asset.type === "PPT" && asset.ideaId === submission.ideaId)
  );
}

function getSubmissionVideoAsset(submission: Submission, generatedAssets: GeneratedAsset[]) {
  return (
    generatedAssets.find((asset) => asset.type === "VIDEO" && asset.sourceMessageId === submission.sourceMessageId) ||
    generatedAssets.find((asset) => asset.type === "VIDEO" && asset.ideaId === submission.ideaId) ||
    buildMediaAsset(
      {
        id: submission.ideaId,
        title: submission.artifactTitle.replace(/\s*-\s*多媒体物料$/, ""),
        description: submission.artifactSummary,
        stage: artifactLabels[submission.artifactType],
        updatedAt: submission.submittedAt,
      },
      undefined,
    )
  );
}

function getSubmissionDownloadLabel(submission: Submission) {
  if (submission.artifactType === "PPT") return "下载 PPTX";
  if (submission.artifactType === "MEDIA") return "下载 MP4 视频";
  if (submission.artifactType === "BRAINSTORM") return "下载任务清单 Word";
  return `下载 ${getDownloadTitle(submission)} Word`;
}

function isSubmissionDownloadAvailable(submission: Submission, generatedAssets: GeneratedAsset[]) {
  if (submission.artifactType === "PPT") return Boolean(getSubmissionPptAsset(submission, generatedAssets)?.pptUrl);
  if (submission.artifactType === "MEDIA") return Boolean(getSubmissionVideoAsset(submission, generatedAssets)?.videoUrl);
  return true;
}

function downloadSubmissionArtifact(submission: Submission, generatedAssets: GeneratedAsset[]) {
  if (submission.artifactType === "PPT") {
    return downloadPptAsset(getSubmissionPptAsset(submission, generatedAssets));
  }
  if (submission.artifactType === "MEDIA") {
    return downloadVideoAsset(getSubmissionVideoAsset(submission, generatedAssets));
  }
  if (submission.artifactType === "BRAINSTORM") {
    downloadWord("待验证任务清单.doc", "待验证任务清单", getBrainstormTaskBlocks(submission.blocks));
    return true;
  }
  downloadWord(`${submission.artifactTitle}.doc`, submission.artifactTitle, submission.blocks);
  return true;
}

function buildWorkBuddyVideoPrompt(asset: GeneratedAsset) {
  return [
    "请使用已加载的 remotion-video-generator / Video Generator 技能生成宣传视频。",
    "",
    "业务要求：",
    "1. 使用 Remotion 生成 16:9、30fps、30 秒 MP4，时长必须是 30 秒。",
    "2. 必须实际完成渲染，不能只创建源码。",
    "3. 不读取网络素材，不等待用户确认。",
    "4. 完成后只回复最终文件路径和是否成功。",
    "",
    `视频标题：${asset.title}`,
    "",
    "模型/风格提示词：",
    asset.prompt || "",
    "",
    "30 秒宣传视频脚本：",
    asset.script || "",
    "",
    "视频分镜表：",
    asset.storyboard || "",
    "",
    "海报文案 Prompt：",
    asset.posterPrompt || "",
    "",
    "产品视觉图 Prompt：",
    asset.visualPrompt || "",
  ].join("\n");
}

async function submitWorkBuddyVideoRun(asset: GeneratedAsset, revision: number) {
  return submitGenerationJob({
    artifactType: "VIDEO",
    projectId: asset.ideaId,
    conversationId: asset.sourceMessageId || asset.ideaId,
    ideaId: asset.ideaId,
    expertId: "media",
    contextSnapshot: {
      assetId: asset.id,
      revision,
      businessPrompt: buildWorkBuddyVideoPrompt(asset),
      referenceImageAssetIds: asset.referenceImageAssetIds || [],
    },
    idempotencyKey: videoGenerationIdempotencyKey(asset.id, revision),
    costConfirmed: true,
  });
}

async function checkWorkBuddyConnection() {
  // 真实连通性检查会触达供应商侧服务。这里保持无消耗策略：
  // 只在提交任务时访问 Java 网关；网关默认 disabled，会返回 503 且不会发起供应商调用。
  return;
}

async function checkGeneratedWorkBuddyVideo(jobId: string) {
  return loadGenerationJob(jobId);
}

function getDefaultTeacherComment(submission?: Pick<Submission, "artifactType" | "artifactTitle">) {
  if (!submission) return "请先选择一条学生提交成果，再填写节点指导意见。";
  const map: Record<ArtifactType, string> = {
    BRAINSTORM:
      "头脑风暴阶段建议继续补充真实学生访谈原话，把“目标用户、核心痛点、待验证假设”分开写清楚。当前任务清单方向可行，但需要明确每项任务的负责人、完成时间和验证标准。",
    POSITIONING:
      "产品定位阶段建议把一句话价值主张再压缩，突出“服务商学院创业实践教学闭环”这一差异点。用户画像里要区分学生、教师和学院管理者三类需求，避免定位过宽。",
    MARKET:
      "市场与竞品分析阶段建议增加 2-3 个明确对标对象，并按课程模板、教师审核、成果沉淀、数据看板四个维度比较。当前结论还需要补充为什么上财商学院场景具备切入优势。",
    BP:
      "BP 阶段建议重点补强付费方、采购理由和试点指标。商业模式不能只写订阅收费，需要说明学院为什么愿意为课程建设、就业质量和优秀案例沉淀付费。",
    PPT:
      "路演 PPT 阶段建议减少功能罗列，先讲课堂真实痛点，再讲学生端生成、教师端审核、管理端沉淀的闭环价值。每页都要保留一句核心观点，并补充图表或截图式证据。",
    SCRIPT:
      "路演稿阶段建议把 1 分钟、3 分钟、5 分钟版本区分清楚。讲稿要承接 PPT 页码，先讲课堂痛点，再讲平台闭环、试点数据和商业可行性，避免逐字复述页面内容。",
    DEFENSE:
      "答辩模拟阶段建议补充更具体的证据链，回答时按“结论-依据-试点数据-风险应对”展开。尤其要提前准备数据安全、教师工作量、学校采购价值这三类高频追问。",
    MEDIA:
      "多媒体物料阶段建议让视频脚本更聚焦教学闭环，前 5 秒先呈现学生课堂创意卡点，再展示 AI 生成、教师审核和成果沉淀。海报文案要保持高校商学院正式质感，不要过度营销化。",
  };
  return map[submission.artifactType];
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function buildUploadPreview(file: File, text?: string, selectedCategory?: KnowledgeCategory) {
  if (text?.trim()) return text.trim().slice(0, 1200);
  if (selectedCategory) {
    const categorySummaries: Record<string, string> = {
      教学大纲:
        "资料摘要：该资料将作为课程阶段路径使用，可拆解为创意整理、项目定位、BP、PPT、答辩与复盘等教学节点，供学生端专家判断当前成果应处于哪个阶段。",
      "BP 模板":
        "资料摘要：该资料将作为商业计划书模板使用，可解析执行摘要、用户痛点、解决方案、市场竞品、商业模式、财务假设、风险应对和试点指标。",
      "PPT 模板":
        "资料摘要：该资料将作为路演 PPT 模板使用，可解析 10 页页面结构、核心观点、图表建议和演讲提示，用于 PPT 生成与答辩模拟。",
      评分标准:
        "资料摘要：该资料将作为教师审核 Rubric 使用，可解析评分维度、权重、等级描述和退回修改口径，用于系统评估与教师点评。",
      创业案例:
        "资料摘要：该资料将作为创业案例库使用，可解析项目背景、创新点、商业模式、路演亮点和可复用教学标签，为学生提供结构参考。",
      答辩题库:
        "资料摘要：该资料将作为答辩题库使用，可解析商业可行性、竞品差异、数据安全、教师工作量和学校采购价值等高频追问。",
      多媒体模板:
        "资料摘要：该资料将作为多媒体物料模板使用，可解析短视频脚本、分镜表、海报文案和视觉 Prompt，用于快速产出宣传素材。",
    };
    return `${categorySummaries[selectedCategory]} 文件名：${file.name}。平台会保存原文件和可读文本，并提供分类、权限控制和专家调用。`;
  }
  const lowerName = file.name.toLowerCase();
  if (lowerName.includes("bp") || lowerName.includes("商业计划")) {
    return "资料摘要：已识别为商业计划书相关材料，平台可解析执行摘要、商业模式、市场分析、财务假设与风险评估，并同步到 BP 专家能力中。";
  }
  if (lowerName.includes("ppt") || lowerName.includes("路演")) {
    return "资料摘要：已识别为路演展示相关材料，平台可解析页面标题、核心观点、图表建议和演讲提示，并用于 PPT 专家生成。";
  }
  if (lowerName.includes("评分") || lowerName.includes("rubric")) {
    return "资料摘要：已识别为评分标准材料，平台可解析评分维度、权重、等级描述和教师点评口径。";
  }
  if (lowerName.includes("案例")) {
    return "资料摘要：已识别为创业案例材料，平台可解析项目背景、创新点、商业模式、路演亮点和可复用教学标签。";
  }
  return "资料摘要：平台已保存该资料，可继续进行文档解析、分类和专家调用。";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function getKnowledgeFileTypeLabel(asset: Pick<KnowledgeUpload, "name" | "fileType">) {
  const extension = asset.name.split(".").pop()?.trim().toUpperCase();
  if (extension && extension !== asset.name.toUpperCase()) return extension;
  const type = asset.fileType.toLowerCase();
  if (type.includes("presentation")) return "PPTX";
  if (type.includes("wordprocessing")) return "DOCX";
  if (type.includes("spreadsheet")) return "XLSX";
  if (type.includes("pdf")) return "PDF";
  if (type.includes("text")) return "TXT";
  if (type.includes("image")) return "图片";
  return asset.fileType || "本地文件";
}

function buildKnowledgeAssetPreviewBlocks(asset: KnowledgeUpload): ResultBlock[] {
  const category = asset.category || inferKnowledgeCategory(asset.name);
  return [
    {
      title: "资料摘要",
      items: [asset.preview],
    },
    {
      title: "文件信息",
      items: [
        `所属知识库：${category}`,
        `文件类型：${getKnowledgeFileTypeLabel(asset)}`,
        `文件大小：${asset.sizeLabel}`,
        `上传人：${asset.uploadedBy || "教师/管理员"}`,
        `上传时间：${formatSubmittedAt(asset.uploadedAt)}`,
      ],
    },
    {
      title: "正文识别",
      items: [
        asset.extractionStatus === "READY"
          ? `已识别可读正文${asset.contentText ? `（${asset.contentText.length} 个字符）` : ""}。`
          : asset.extractionMessage || "该资料尚未完成正文识别，不会进入 AI 上下文。",
      ],
    },
    {
      title: "课堂调用说明",
      items: [
        "学生端专家会根据当前选择的知识库和资料摘要生成阶段成果。",
        "平台已保存原始文件、解析文本和校验信息；下载原文件会经过后端登录与权限校验。",
      ],
    },
  ];
}

function previewKnowledgeAsset(asset: KnowledgeUpload, onPreviewWord: (preview: WordPreview) => void) {
  onPreviewWord({
    title: asset.name,
    blocks: buildKnowledgeAssetPreviewBlocks(asset),
  });
}

function downloadKnowledgeAsset(asset: KnowledgeUpload) {
  if (asset.downloadUrl || asset.fileAvailable) {
    triggerDownload(asset.downloadUrl || knowledgeAssetDownloadUrl(asset.id), asset.name);
    return;
  }
  if (asset.fileDataUrl) {
    triggerDownload(asset.fileDataUrl, asset.name);
    return;
  }
  const basename = asset.name.replace(/\.[^.]+$/, "") || "课程资料";
  downloadWord(`${basename}-资料说明.doc`, asset.name, buildKnowledgeAssetPreviewBlocks(asset));
}

function App() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [studentConversations, setStudentConversations] = useState<RemoteStudentConversation[]>([]);
  const [studentWorkspaceAccount, setStudentWorkspaceAccount] = useState<string | null>(null);
  const [artifactRecords, setArtifactRecords] = useState<RemoteArtifact[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>(initialStudentGroups);
  const [accountRecords, setAccountRecords] = useState<AccountRecord[]>(() => normalizeAccountRecords(initialAccountRecords, initialStudentGroups));
  const [knowledgeUploads, setKnowledgeUploads] = useState<KnowledgeUpload[]>([]);
  const [knowledgeCatalog, setKnowledgeCatalog] = useState<KnowledgeBaseCatalogItem[]>(defaultKnowledgeBaseCatalog);
  const [knowledgeBaseStates, setKnowledgeBaseStates] = useState<KnowledgeBaseStates>(initialKnowledgeBaseStates);
  const [customExperts, setCustomExperts] = useState<CustomExpertRecord[]>([]);
  const [deletedExpertIds, setDeletedExpertIds] = useState<DeletedExpertIdState>([]);
  const [promptKnowledgeRoutes, setPromptKnowledgeRoutes] = useState<PromptKnowledgeRoutes>(createKnowledgeRouteState);
  const [defensePractices, setDefensePractices] = useState<DefensePractice[]>([]);
  const [activeIdeaId, setActiveIdeaId] = useState(initialIdeas[0].id);
  const [selectedExpertId, setSelectedExpertId] = useState<ExpertId>("pitch");
  const [selectedSkillId, setSelectedSkillId] = useState("deck");
  const [model, setModel] = useState<AnswerMode>("Auto");
  const [prompt, setPrompt] = useState(getScenarioPrompt("pitch", initialIdeas[0]));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecoveringAi, setIsRecoveringAi] = useState(false);
  const [studentView, setStudentView] = useState<StudentViewMode>("workspace");
  const [teacherFilter, setTeacherFilter] = useState<ArtifactType | "ALL">("ALL");
  const [activeSubmissionId, setActiveSubmissionId] = useState("");
  const [teacherComment, setTeacherComment] = useState(getDefaultTeacherComment());
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<SubmissionStatus | "ALL">("ALL");
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [mediaDraft, setMediaDraft] = useState<GeneratedAsset | null>(null);
  const [pptPreview, setPptPreview] = useState<GeneratedAsset | null>(null);
  const [videoPreview, setVideoPreview] = useState<GeneratedAsset | null>(null);
  const [wordPreview, setWordPreview] = useState<WordPreview | null>(null);
  const [pendingAssetGeneration, setPendingAssetGeneration] = useState<PendingAssetGeneration | null>(null);
  const [systemNotice, setSystemNotice] = useState<{ title: string; message: string } | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [pendingDeleteIdeaId, setPendingDeleteIdeaId] = useState<string | null>(null);
  const [pendingDeleteKnowledgeBase, setPendingDeleteKnowledgeBase] = useState<KnowledgeCategory | null>(null);
  const [pendingKnowledgeAssetAction, setPendingKnowledgeAssetAction] = useState<PendingKnowledgeAssetAction | null>(null);
  const [selectedKnowledgeSelection, setSelectedKnowledgeSelection] = useState<StudentKnowledgeSelection>(() =>
    normalizeStudentKnowledgeSelection({ categories: knowledgeCategoryOptions, uploadIds: [] }),
  );

  // 这些旧视图仍从单文件共享目录读取数据，拆分组件前集中同步一次，避免各端展示不一致。
  // eslint-disable-next-line react-hooks/globals
  experts = mergeExperts(customExperts, deletedExpertIds);
  // eslint-disable-next-line react-hooks/globals
  studentExpertIds = [...baseStudentExpertIds, ...customExperts.filter((expert) => expert.active !== false).map((expert) => expert.id)].filter(
    (expertId) => !deletedExpertIds.includes(expertId),
  );
  configureExpertGeneration(experts, studentExpertIds);
  const activeIdea = ideas.find((idea) => idea.id === activeIdeaId) || ideas[0];
  const pendingDeleteIdea = ideas.find((idea) => idea.id === pendingDeleteIdeaId) || null;
  const pendingDeleteKnowledgeItem = pendingDeleteKnowledgeBase
    ? getActiveKnowledgeCatalog(knowledgeCatalog).find((item) => item.category === pendingDeleteKnowledgeBase) || null
    : null;
  const pendingKnowledgeAsset = pendingKnowledgeAssetAction
    ? knowledgeUploads.find((asset) => asset.id === pendingKnowledgeAssetAction.id) || null
    : null;
  const activeAccountRecord = auth
    ? accountRecords.find((account) => account.account === auth.account) || buildAuthenticatedAccount(auth, studentGroups)
    : undefined;
  const activeStudentAvatarId = auth?.role === "student" ? normalizeStudentAvatarId(auth.avatarId) : defaultStudentAvatarId;
  const studentExperts = experts.filter((expert) => isStudentExpertId(expert.id) && isStudentExpertEnabled(expert, activeAccountRecord));
  const fallbackStudentExperts = experts.filter((expert) => isStudentExpertId(expert.id));
  const rawSelectedExpert = experts.find((expert) => expert.id === selectedExpertId) || experts[0];
  const selectedExpert =
    role === "student" && (!isStudentExpertId(rawSelectedExpert.id) || !isStudentExpertEnabled(rawSelectedExpert, activeAccountRecord))
      ? studentExperts[0] || fallbackStudentExperts[0]
      : rawSelectedExpert;
  const selectedSkill = selectedExpert.skills.find((skill) => skill.id === selectedSkillId) || selectedExpert.skills[0];
  const teacherVisibleSubmissions = submissions.filter((item) => item.status !== "withdrawn");
  const teacherSubmissions = submissions.filter(
    (item) =>
      item.status !== "withdrawn" &&
      (teacherFilter === "ALL" || item.artifactType === teacherFilter) &&
      (teacherStatusFilter === "ALL" || item.status === teacherStatusFilter),
  );
  const activeSubmission =
    teacherVisibleSubmissions.find((item) => item.id === activeSubmissionId) || teacherSubmissions[0] || teacherVisibleSubmissions[0];
  const currentAccountDisabled = activeAccountRecord?.status === "已停用";
  const disabledPermissionNames = activeAccountRecord?.disabledPermissions || [];

  useEffect(() => {
    let active = true;
    loadCurrentAuth()
      .then((session) => {
        if (!active || !session) return;
        setAuth(session);
        setRole(session.role);
      })
      .catch(() => {
        // 登录页会在用户主动登录时展示明确的连接错误。
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!auth) return;
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [auth]);

  useEffect(() => {
    if (!auth || auth.role !== "student") return undefined;
    let active = true;
    const account = auth.account;

    async function restoreStudentWorkspace() {
      try {
        const [initialWorkspace, remoteArtifacts, remoteSubmissions, remoteDefensePractices] = await Promise.all([
          loadStudentWorkspace(),
          listStudentArtifacts(),
          listStudentSubmissions(),
          listDefensePractices(),
        ]);
        let workspace = initialWorkspace;
        if (workspace.ideas.length === 0) {
          const idea = await createStudentIdea({
            title: "新的创业创意",
            description: "请在聊天框中描述目标用户、问题场景和你希望验证的商业假设。",
            stage: "新建创意",
          });
          workspace = { ideas: [idea], conversations: [] };
        }
        if (!active) return;

        const nextIdeas = workspace.ideas.map(mapRemoteIdea);
        const nextActiveIdea = nextIdeas[0];
        const activeConversation = workspace.conversations.find((item) => item.ideaId === nextActiveIdea.id);
        const resolvedDefensePractices = remoteDefensePractices
          .map(mapRemoteDefensePractice)
          .filter((practice): practice is DefensePractice => Boolean(practice));

        setIdeas(nextIdeas);
        setMessages(workspace.conversations.flatMap((conversation) => conversation.messages.map(mapRemoteMessage)));
        setStudentConversations(workspace.conversations);
        setArtifactRecords(remoteArtifacts);
        setGeneratedAssets(
          remoteArtifacts.map(mapGeneratedAssetRecord).filter((asset): asset is GeneratedAsset => Boolean(asset)),
        );
        setDefensePractices(resolvedDefensePractices);
        setSubmissions(remoteSubmissions.map(mapRemoteSubmission));
        setActiveIdeaId(nextActiveIdea.id);
        if (activeConversation) {
          setSelectedExpertId(activeConversation.selectedExpertId);
          setSelectedSkillId(activeConversation.selectedSkillId);
          setModel(normalizeAnswerMode(activeConversation.modelMode));
          setSelectedKnowledgeSelection(normalizeStudentKnowledgeSelection(activeConversation.knowledgeSelection));
        }
        const restoredExpertId = activeConversation?.selectedExpertId || "pitch";
        setPrompt(appendPositioningHandoffPrompt(
          getScenarioPrompt(restoredExpertId, nextActiveIdea),
          restoredExpertId === "positioning" ? findLatestBrainstormHandoff(remoteArtifacts, nextActiveIdea.id) : undefined,
        ));
        setStudentWorkspaceAccount(account);
      } catch (error) {
        if (!active) return;
        setStudentWorkspaceAccount(null);
        setSystemNotice({
          title: "学生工作台同步失败",
          message: error instanceof Error ? error.message : "暂时无法读取创意与对话数据。",
        });
      }
    }

    restoreStudentWorkspace();
    return () => {
      active = false;
    };
  }, [auth]);

  useEffect(() => {
    if (!auth || auth.role !== "teacher") return undefined;
    let active = true;
    listTeacherSubmissions()
      .then((items) => {
        if (!active) return;
        const mapped = items.map(mapRemoteSubmission);
        setSubmissions(mapped);
        setActiveSubmissionId(mapped[0]?.id || "");
      })
      .catch((error) => {
        if (!active) return;
        setSystemNotice({
          title: "审核列表同步失败",
          message: error instanceof Error ? error.message : "暂时无法读取学生提交记录。",
        });
      });
    return () => {
      active = false;
    };
  }, [auth]);

  useEffect(() => {
    if (
      !auth ||
      auth.role !== "student" ||
      studentWorkspaceAccount !== auth.account ||
      !activeIdeaId ||
      isGenerating
    ) return undefined;
    const ideaMessages = messages.filter((message) => message.ideaId === activeIdeaId);
    const pendingMessage = ideaMessages.at(-1);
    if (!pendingMessage || pendingMessage.sender !== "user" || !pendingMessage.clientMessageId) return undefined;

    let active = true;
    let timer = 0;
    const poll = async () => {
      if (!active) return;
      setIsRecoveringAi(true);
      try {
        const status = await getDeepSeekChatStatus(activeIdeaId, pendingMessage.clientMessageId || "");
        if (!active) return;
        if (!status) {
          setIsRecoveringAi(false);
          return;
        }
        if (status.status === "FAILED") {
          setIsRecoveringAi(false);
          setSystemNotice({
            title: "上次 AI 回复未完成",
            message: status.errorMessage || "AI 服务未完成该请求，请重新发送。",
          });
          return;
        }
        if (status.status === "COMPLETED") {
          const workspace = await loadStudentWorkspace();
          if (!active) return;
          setStudentConversations(workspace.conversations);
          setMessages(workspace.conversations.flatMap((conversation) => conversation.messages.map(mapRemoteMessage)));
          setIsRecoveringAi(false);
          return;
        }
        timer = window.setTimeout(poll, 1_500);
      } catch (error) {
        if (!active) return;
        setIsRecoveringAi(false);
        setSystemNotice({
          title: "AI 回复恢复失败",
          message: error instanceof Error ? error.message : "暂时无法读取上次 AI 请求状态。",
        });
      }
    };
    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeIdeaId, auth, isGenerating, messages, studentWorkspaceAccount]);

  useEffect(() => {
    if (!auth) return undefined;
    let active = true;
    Promise.all([listKnowledgeBases(), listKnowledgeAssets(), listKnowledgeExperts()])
      .then(([remoteBases, remoteAssets, remoteExperts]) => {
        if (!active) return;
        setKnowledgeCatalog((current) => mergeKnowledgeBaseRecords(current, remoteBases));
        setKnowledgeBaseStates((current) => ({
          ...current,
          ...Object.fromEntries(remoteBases.map((base) => [base.category, base.active])),
        }));
        setKnowledgeUploads(remoteAssets.map(mapKnowledgeAssetRecord));
        setCustomExperts(remoteExperts.map(mapKnowledgeExpertRecord));
        setPromptKnowledgeRoutes({
          ...createKnowledgeRouteState(),
          ...Object.fromEntries(remoteExperts.map((expert) => [expert.id, expert.knowledgeCategories])),
        });
      })
      .catch((error) => {
        if (!active) return;
        setSystemNotice({
          title: "知识配置同步失败",
          message: error instanceof Error ? error.message : "暂时无法读取知识库和专家配置。",
        });
      });
    return () => {
      active = false;
    };
  }, [auth]);

  useEffect(() => {
    if (!auth || auth.role !== "student" || studentWorkspaceAccount !== auth.account || !activeIdeaId) return undefined;
    const timer = window.setTimeout(() => {
      saveStudentConversation(activeIdeaId, {
        selectedExpertId,
        selectedSkillId,
        modelMode: model,
        knowledgeSelection: selectedKnowledgeSelection,
      })
        .then((saved) => {
          setStudentConversations((current) => {
            const existing = current.find((item) => item.ideaId === saved.ideaId);
            const next = { ...saved, messages: existing?.messages || [] };
            return existing
              ? current.map((item) => (item.ideaId === saved.ideaId ? next : item))
              : [next, ...current];
          });
        })
        .catch((error) => {
          setSystemNotice({
            title: "对话设置保存失败",
            message: error instanceof Error ? error.message : "专家、技能与知识库选择暂未保存。",
          });
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    activeIdeaId,
    auth,
    model,
    selectedExpertId,
    selectedKnowledgeSelection,
    selectedSkillId,
    studentWorkspaceAccount,
  ]);

  // eslint-disable-next-line react-hooks/globals
  knowledgeBaseCatalog = knowledgeCatalog.length ? knowledgeCatalog : defaultKnowledgeBaseCatalog;
  async function handleLogin(account: string, password: string) {
    const session = await loginWithPassword(account, password);
    setStudentWorkspaceAccount(null);
    setAuth(session);
    setRole(session.role);
  }

  function handleLogout() {
    setIsLogoutConfirmOpen(true);
  }

  async function handleConfirmLogout() {
    setIsLogoutConfirmOpen(false);
    try {
      await logoutRemoteSession();
      setAuth(null);
    } catch (error) {
      setSystemNotice({
        title: "退出登录失败",
        message: error instanceof Error ? error.message : "服务器暂时无法结束当前会话，请稍后重试。",
      });
    }
  }

  async function handleSaveStudentProfile(nextProfile: {
    name: string;
    currentPassword?: string;
    newPassword?: string;
    avatarId: StudentAvatarId;
  }) {
    if (!auth || auth.role !== "student") throw new Error("当前登录状态无效，请重新登录。");
    const session = await updateAuthProfile({
      displayName: nextProfile.name,
      currentPassword: nextProfile.currentPassword,
      newPassword: nextProfile.newPassword,
      avatarId: nextProfile.avatarId,
    });
    setAccountRecords((current) =>
      current.map((account) =>
        account.account === auth.account
          ? {
              ...account,
              name: session.name,
            }
          : account,
      ),
    );
    setAuth(session);
    setRole(session.role);
    setIsProfileSettingsOpen(false);
    setSystemNotice({
      title: "个人资料已更新",
      message: nextProfile.newPassword
        ? "头像和昵称已保存，登录密码已由平台安全更新。"
        : "头像和昵称已保存，并已同步到当前学生端展示。",
    });
  }

  function canUsePermission(permission: string) {
    if (!activeAccountRecord) return true;
    if (currentAccountDisabled) return false;
    if (disabledPermissionNames.includes(permission)) return false;
    if (activeAccountRecord.role === "student" && studentFeaturePermissionSet.has(permission)) return true;
    return true;
  }

  function blockPermission(permission: string) {
    const message = currentAccountDisabled
      ? "当前账号已被管理员停用，暂时无法使用该端功能。请联系管理员重新开通账号。"
      : `“${permission}”权限已被管理员停用，当前账号暂时无法使用该功能。`;
    setSystemNotice({ title: "功能暂不可用", message });
  }

  const permissionAccess: PermissionAccess = {
    account: activeAccountRecord,
    accountDisabled: currentAccountDisabled,
    disabledPermissions: disabledPermissionNames,
    can: canUsePermission,
    block: blockPermission,
  };

  function getBrainstormHandoffForIdea(idea: Idea) {
    const persisted = findLatestBrainstormHandoff(artifactRecords, idea.id);
    const latestMessage = messages.findLast(
      (message) => message.ideaId === idea.id && message.artifactType === "BRAINSTORM" && Boolean(message.blocks),
    );
    if (!latestMessage?.blocks || latestMessage.id === persisted?.sourceMessageId) return persisted;
    return createBrainstormArtifactContent({
      sourceMessageId: latestMessage.id,
      ideaId: idea.id,
      projectTitle: idea.title,
      projectDescription: idea.description,
      sourceSummary: latestMessage.content,
      blocks: latestMessage.blocks,
    }).handoff;
  }

  function getPreparedScenarioPrompt(expertId: ExpertId, idea: Idea) {
    const handoff = expertId === "positioning" ? getBrainstormHandoffForIdea(idea) : undefined;
    return appendPositioningHandoffPrompt(getScenarioPrompt(expertId, idea), handoff);
  }

  function applyConversationSettings(ideaId: string) {
    const conversation = studentConversations.find((item) => item.ideaId === ideaId);
    if (!conversation) {
      const defaultExpert = studentExperts[0] || fallbackStudentExperts[0];
      setSelectedExpertId(defaultExpert.id);
      setSelectedSkillId(defaultExpert.skills[0]?.id || "");
      setModel("Auto");
      setSelectedKnowledgeSelection({ categories: [], uploadIds: [] });
      return defaultExpert.id;
    }
    setSelectedExpertId(conversation.selectedExpertId);
    setSelectedSkillId(conversation.selectedSkillId);
    setModel(normalizeAnswerMode(conversation.modelMode));
    setSelectedKnowledgeSelection(normalizeStudentKnowledgeSelection(conversation.knowledgeSelection));
    return conversation.selectedExpertId;
  }

  async function persistStudentMessage(message: ChatMessage) {
    if (!auth || auth.role !== "student" || studentWorkspaceAccount !== auth.account) return null;
    try {
      const saved = await appendStudentMessage(message.ideaId, {
        clientMessageId: message.clientMessageId || message.id,
        sender: message.sender === "ai" ? "AI" : "USER",
        inputMode: message.mode,
        expertId: message.expertId,
        expertName: message.expertName,
        skillName: message.skillName,
        artifactType: message.artifactType,
        content: message.content,
        blocks: message.blocks,
      });
      const persisted = mapRemoteMessage(saved);
      setMessages((current) => current.map((item) => (item.id === message.id ? persisted : item)));
      return persisted;
    } catch (error) {
      setSystemNotice({
        title: "对话消息保存失败",
        message: error instanceof Error ? error.message : "当前消息暂未写入后端。",
      });
      return null;
    }
  }

  async function saveMessageArtifact(message: ChatMessage) {
    if (!isArtifactType(message.artifactType) || !message.blocks) return null;
    const idea = ideas.find((item) => item.id === message.ideaId) || activeIdea;
    const content = message.artifactType === "BRAINSTORM"
      ? createBrainstormArtifactContent({
          sourceMessageId: message.id,
          ideaId: message.ideaId,
          projectTitle: idea.title,
          projectDescription: idea.description,
          sourceSummary: message.content,
          blocks: message.blocks,
        })
      : message.blocks;
    const saved = await saveStudentArtifact({
      ideaId: message.ideaId,
      sourceMessageId: message.id,
      artifactType: message.artifactType,
      title: `${idea.title} - ${artifactLabels[message.artifactType]}`,
      summary: message.content,
      content,
    });
    setArtifactRecords((current) => {
      const exists = current.some((item) => item.id === saved.id || item.sourceMessageId === saved.sourceMessageId);
      return exists
        ? current.map((item) => (item.id === saved.id || item.sourceMessageId === saved.sourceMessageId ? saved : item))
        : [saved, ...current];
    });
    return saved;
  }

  function handleSelectIdea(ideaId: string) {
    const idea = ideas.find((item) => item.id === ideaId);
    if (!idea) return;
    setActiveIdeaId(ideaId);
    const expertId = applyConversationSettings(ideaId);
    setPrompt(getPreparedScenarioPrompt(expertId, idea));
  }

  async function handleCreateIdea() {
    if (!canUsePermission("AI 创意工作台")) {
      blockPermission("AI 创意工作台");
      return;
    }
    try {
      const saved = await createStudentIdea({
        title: "新的创业创意",
        description: "请在聊天框中描述目标用户、问题场景和你希望验证的商业假设。",
        stage: "新建创意",
      });
      const idea = mapRemoteIdea(saved);
      setIdeas((current) => [idea, ...current]);
      setActiveIdeaId(idea.id);
      applyConversationSettings(idea.id);
      setPrompt(getScenarioPrompt((studentExperts[0] || fallbackStudentExperts[0]).id, idea));
    } catch (error) {
      setSystemNotice({
        title: "新建创意失败",
        message: error instanceof Error ? error.message : "创意未写入后端。",
      });
    }
  }

  function requestDeleteIdea(ideaId: string) {
    const idea = ideas.find((item) => item.id === ideaId);
    if (!idea) return;
    setPendingDeleteIdeaId(ideaId);
  }

  async function handleConfirmDeleteIdea() {
    if (!pendingDeleteIdeaId) return;
    const ideaId = pendingDeleteIdeaId;
    const idea = ideas.find((item) => item.id === ideaId);
    if (!idea) {
      setPendingDeleteIdeaId(null);
      return;
    }
    try {
      await deleteStudentIdea(ideaId);
      let remaining = ideas.filter((item) => item.id !== ideaId);
      if (remaining.length === 0) {
        const saved = await createStudentIdea({
          title: "新的创业创意",
          description: "请在聊天框中描述目标用户、问题场景和你希望验证的商业假设。",
          stage: "新建创意",
        });
        remaining = [mapRemoteIdea(saved)];
      }
      setIdeas(remaining);
      setMessages((current) => current.filter((message) => message.ideaId !== ideaId));
      setStudentConversations((current) => current.filter((conversation) => conversation.ideaId !== ideaId));
      if (activeIdeaId === ideaId) {
        setActiveIdeaId(remaining[0].id);
        applyConversationSettings(remaining[0].id);
      }
      setPendingDeleteIdeaId(null);
    } catch (error) {
      setSystemNotice({
        title: "删除创意失败",
        message: error instanceof Error ? error.message : "创意仍保留在后端。",
      });
    }
  }

  async function handleRenameIdea(ideaId: string, nextTitle: string) {
    const title = nextTitle.trim();
    if (!title) return;
    try {
      const saved = await updateStudentIdea(ideaId, { title });
      setIdeas((current) => current.map((idea) => (idea.id === ideaId ? mapRemoteIdea(saved) : idea)));
    } catch (error) {
      setSystemNotice({
        title: "重命名失败",
        message: error instanceof Error ? error.message : "创意名称未写入后端。",
      });
    }
  }

  function handleStudentKnowledgeSelectionChange(selection: StudentKnowledgeSelection) {
    setSelectedKnowledgeSelection(normalizeStudentKnowledgeSelection(selection));
  }

  async function persistKnowledgeBase(item: KnowledgeBaseCatalogItem, active: boolean) {
    let saved: KnowledgeBaseRecord;
    if (item.id) {
      saved = await updateKnowledgeBase(item.id, {
        category: item.category,
        description: item.description,
        usedBy: item.usedBy,
        active,
      });
    } else {
      saved = await createKnowledgeBase({
        category: item.category,
        description: item.description,
        usedBy: item.usedBy,
      });
      if (!active) {
        saved = await updateKnowledgeBase(saved.id, { ...saved, active: false });
      }
    }
    return mergeKnowledgeBaseRecords([], [saved])[0];
  }

  async function handleKnowledgeCatalogChange(nextCatalog: KnowledgeBaseCatalogItem[]) {
    const previous = knowledgeCatalog;
    const additions = nextCatalog.filter((item) => !previous.some((current) => current.category === item.category));
    setKnowledgeCatalog(nextCatalog);
    if (!additions.length) return;
    try {
      const saved = await Promise.all(additions.map((item) => persistKnowledgeBase(item, item.active !== false)));
      const byCategory = new Map(saved.map((item) => [item.category, item]));
      setKnowledgeCatalog((current) => current.map((item) => byCategory.get(item.category) || item));
    } catch (error) {
      setKnowledgeCatalog(previous);
      setSystemNotice({
        title: "知识库保存失败",
        message: error instanceof Error ? error.message : "知识库目录未写入后端。",
      });
    }
  }

  async function handleKnowledgeBaseStatesChange(nextStates: KnowledgeBaseStates) {
    const previous = knowledgeBaseStates;
    const changed = knowledgeCatalog.filter(
      (item) => nextStates[item.category] !== undefined && nextStates[item.category] !== previous[item.category],
    );
    setKnowledgeBaseStates(nextStates);
    if (!changed.length) return;
    try {
      const saved = await Promise.all(changed.map((item) => persistKnowledgeBase(item, nextStates[item.category])));
      const byCategory = new Map(saved.map((item) => [item.category, item]));
      setKnowledgeCatalog((current) => current.map((item) => byCategory.get(item.category) || item));
    } catch (error) {
      setKnowledgeBaseStates(previous);
      setSystemNotice({
        title: "知识库状态保存失败",
        message: error instanceof Error ? error.message : "启用状态未写入后端。",
      });
    }
  }

  async function handleUploadKnowledge(assets: KnowledgeUpload[]) {
    try {
      const saved = await Promise.all(
        assets.map(async (asset) => {
          const record = asset.file
            ? await uploadKnowledgeAsset({
                category: asset.category || inferKnowledgeCategory(asset.name),
                preview: asset.preview,
                contentText: asset.contentText || asset.preview,
                uploadedBy: asset.uploadedBy || auth?.name || "教师/管理员",
                enabled: asset.enabled !== false,
                file: asset.file,
              })
            : await createKnowledgeAsset({
                category: asset.category || inferKnowledgeCategory(asset.name),
                name: asset.name,
                sizeLabel: asset.sizeLabel,
                fileType: asset.fileType,
                preview: asset.preview,
                contentText: asset.contentText || asset.preview,
                uploadedBy: asset.uploadedBy || auth?.name || "教师/管理员",
                enabled: asset.enabled !== false,
              });
          return mapKnowledgeAssetRecord(record);
        }),
      );
      setKnowledgeUploads((current) => [...saved, ...current.filter((item) => !saved.some((savedItem) => savedItem.id === item.id))]);
    } catch (error) {
      setSystemNotice({
        title: "知识资料上传失败",
        message: error instanceof Error ? error.message : "资料文件与元数据未写入后端。",
      });
    }
  }

  async function handleCustomExpertsChange(nextExperts: CustomExpertRecord[]) {
    const previous = customExperts;
    const changed = nextExperts.filter((expert) => {
      const current = previous.find((item) => item.id === expert.id);
      return !current || JSON.stringify(current) !== JSON.stringify(expert);
    });
    setCustomExperts(nextExperts);
    if (!changed.length) return;
    try {
      const saved = await Promise.all(
        changed.map((expert) =>
          saveKnowledgeExpert(
            toKnowledgeExpertInput(
              expert,
              promptKnowledgeRoutes[expert.id] || getExpertKnowledgeCategories(expert.id),
            ),
          ),
        ),
      );
      const byId = new Map(saved.map((expert) => [expert.id, mapKnowledgeExpertRecord(expert)]));
      setCustomExperts((current) => current.map((expert) => byId.get(expert.id) || expert));
    } catch (error) {
      setCustomExperts(previous);
      setSystemNotice({
        title: "专家配置保存失败",
        message: error instanceof Error ? error.message : "专家配置未写入后端。",
      });
    }
  }

  function handleExpertSkillConfirmed(result: ExpertSkillConfirmationRecord) {
    const mapped = mapKnowledgeExpertRecord(result.expert);
    setCustomExperts((current) => [...current.filter((expert) => expert.id !== mapped.id), mapped]);
    if (mapped.active !== false) setDeletedExpertIds((current) => current.filter((id) => id !== mapped.id));
    setPromptKnowledgeRoutes((current) => ({ ...current, [mapped.id]: result.expert.knowledgeCategories }));
    if (result.knowledgeBase) {
      const confirmedBase = result.knowledgeBase;
      setKnowledgeCatalog((current) => [
        ...current.filter((base) => base.id !== confirmedBase.id && base.category !== confirmedBase.category),
        confirmedBase,
      ]);
      setKnowledgeBaseStates((current) => ({ ...current, [confirmedBase.category]: confirmedBase.active }));
    }
    if (result.importedAssets.length) {
      listKnowledgeAssets()
        .then((records) => setKnowledgeUploads(records.map(mapKnowledgeAssetRecord)))
        .catch((error) => setSystemNotice({
          title: "知识资料刷新失败",
          message: error instanceof Error ? error.message : "资料已导入，但当前页面暂时无法刷新列表。",
        }));
    }
  }

  async function handlePromptKnowledgeRoutesChange(nextRoutes: PromptKnowledgeRoutes) {
    const previous = promptKnowledgeRoutes;
    const changedExpertIds = Object.keys(nextRoutes).filter(
      (expertId) => JSON.stringify(nextRoutes[expertId]) !== JSON.stringify(previous[expertId]),
    );
    setPromptKnowledgeRoutes(nextRoutes);
    try {
      await Promise.all(
        changedExpertIds.map((expertId) => {
          const expert = experts.find((item) => item.id === expertId);
          if (!expert) return Promise.resolve();
          return saveKnowledgeExpert(
            toKnowledgeExpertInput(toCustomExpertRecord(expert), nextRoutes[expertId]),
          );
        }),
      );
    } catch (error) {
      setPromptKnowledgeRoutes(previous);
      setSystemNotice({
        title: "专家知识路由保存失败",
        message: error instanceof Error ? error.message : "知识库路由未写入后端。",
      });
    }
  }

  async function handleSaveExpertPrompt(
    expertId: ExpertId,
    systemPrompt: string,
    userPrompt: string,
    categories: KnowledgeCategory[],
    active: boolean,
  ) {
    const expert = mergeManageableExperts(experts, customExperts).find((item) => item.id === expertId);
    if (!expert) throw new Error("专家不存在");
    const saved = await saveKnowledgeExpert(
      toKnowledgeExpertInput(
        { ...toCustomExpertRecord(expert), systemPrompt, userPrompt },
        categories,
        active,
      ),
    );
    const mapped = mapKnowledgeExpertRecord(saved);
    setCustomExperts((current) => [...current.filter((item) => item.id !== mapped.id), mapped]);
    if (mapped.active !== false) setDeletedExpertIds((current) => current.filter((id) => id !== mapped.id));
    setPromptKnowledgeRoutes((current) => ({ ...current, [mapped.id]: saved.knowledgeCategories }));
  }

  function handleDeleteKnowledgeBase(category: KnowledgeCategory) {
    const activeCatalog = getActiveKnowledgeCatalog(knowledgeCatalog);
    if (activeCatalog.length <= 1) {
      setSystemNotice({ title: "无法删除知识库", message: "至少需要保留一个知识库目录，避免学生端没有可调用的课程资料。" });
      return false;
    }
    setPendingDeleteKnowledgeBase(category);
    return false;
  }

  async function handleConfirmDeleteKnowledgeBase() {
    if (!pendingDeleteKnowledgeBase) return;
    const category = pendingDeleteKnowledgeBase;
    const activeCatalog = getActiveKnowledgeCatalog(knowledgeCatalog);
    const { nextCatalog, nextStates, nextRoutes } = syncKnowledgeCatalogDeletion(
      activeCatalog,
      knowledgeBaseStates,
      promptKnowledgeRoutes,
      category,
    );
    const item = activeCatalog.find((current) => current.category === category);
    if (!item) return;
    try {
      let persistedCatalog = nextCatalog;
      if (defaultKnowledgeBaseCatalog.some((current) => current.category === category)) {
        const inactive = await persistKnowledgeBase(item, false);
        persistedCatalog = [...nextCatalog, inactive];
      } else if (item.id) {
        const relatedAssets = knowledgeUploads.filter(
          (asset) => (asset.category || inferKnowledgeCategory(asset.name)) === category,
        );
        await Promise.all(relatedAssets.map((asset) => deleteKnowledgeAsset(asset.id)));
        await deleteKnowledgeBase(item.id);
      }
      setKnowledgeCatalog(persistedCatalog);
      setKnowledgeBaseStates(nextStates);
      void handlePromptKnowledgeRoutesChange(nextRoutes);
      setKnowledgeUploads((current) => current.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) !== category));
    } catch (error) {
      setSystemNotice({
        title: "删除知识库失败",
        message: error instanceof Error ? error.message : "知识库仍保留在后端。",
      });
      return;
    }
    setSelectedKnowledgeSelection((current) => {
      const keptCategories = current.categories.filter((item) => item !== category);
      const keptUploadIds = current.uploadIds.filter((id) => {
        const asset = knowledgeUploads.find((item) => item.id === id);
        return asset ? (asset.category || inferKnowledgeCategory(asset.name)) !== category : false;
      });
      return {
        categories: keptCategories.length ? keptCategories : nextCatalog[0] ? [nextCatalog[0].category] : [],
        uploadIds: keptUploadIds,
      };
    });
    setPendingDeleteKnowledgeBase(null);
  }

  function requestKnowledgeAssetAction(id: string, action: PendingKnowledgeAssetAction["action"]) {
    setPendingKnowledgeAssetAction({ id, action });
  }

  async function handleConfirmKnowledgeAssetAction() {
    if (!pendingKnowledgeAssetAction) return;
    const { id, action } = pendingKnowledgeAssetAction;
    const asset = knowledgeUploads.find((item) => item.id === id);
    if (!asset) return;
    try {
      if (action === "toggle") {
        const saved = await updateKnowledgeAsset(id, {
          name: asset.name,
          sizeLabel: asset.sizeLabel,
          fileType: asset.fileType,
          preview: asset.preview,
          contentText: asset.contentText || asset.preview,
          enabled: asset.enabled === false,
        });
        setKnowledgeUploads((current) => current.map((item) => (item.id === id ? mapKnowledgeAssetRecord(saved) : item)));
      } else {
        await deleteKnowledgeAsset(id);
        setKnowledgeUploads((current) => current.filter((item) => item.id !== id));
      }
    } catch (error) {
      setSystemNotice({
        title: action === "toggle" ? "资料状态保存失败" : "删除资料失败",
        message: error instanceof Error ? error.message : "知识资料未更新。",
      });
      return;
    }
    setPendingKnowledgeAssetAction(null);
  }

  function handleDeleteExpert(expertId: ExpertId) {
    const manageableExperts = mergeManageableExperts(experts, customExperts);
    if (manageableExperts.length <= 1) {
      return false;
    }
    const target = manageableExperts.find((expert) => expert.id === expertId);
    if (!target) return false;
    const fallbackExpert = experts.find((expert) => expert.id !== expertId) || manageableExperts.find((expert) => expert.id !== expertId) || baseExperts[0];
    const isBaseExpert = baseExperts.some((expert) => expert.id === expertId);
    const categories = promptKnowledgeRoutes[expertId] || getExpertKnowledgeCategories(expertId);
    void (async () => {
      try {
        if (isBaseExpert) {
          const saved = await saveKnowledgeExpert(
            toKnowledgeExpertInput(toCustomExpertRecord(target), categories, false),
          );
          const inactive = mapKnowledgeExpertRecord(saved);
          setCustomExperts((current) => [...current.filter((expert) => expert.id !== expertId), inactive]);
        } else {
          await deleteKnowledgeExpert(expertId);
          setCustomExperts((current) => current.filter((expert) => expert.id !== expertId));
        }
        setDeletedExpertIds((current) => (isBaseExpert && !current.includes(expertId) ? [...current, expertId] : current));
        setPromptKnowledgeRoutes((current) => {
          const nextRoutes = { ...current };
          delete nextRoutes[expertId];
          return nextRoutes;
        });
        setAccountRecords((current) =>
          current.map((account) => ({
            ...account,
            permissions: account.permissions.filter((permission) => permission !== target.name),
            disabledPermissions: (account.disabledPermissions || []).filter((permission) => permission !== target.name),
          })),
        );
      } catch (error) {
        setSystemNotice({
          title: "删除专家失败",
          message: error instanceof Error ? error.message : "专家仍保留在后端。",
        });
      }
    })();
    if (selectedExpertId === expertId) {
      setSelectedExpertId(fallbackExpert.id);
      setSelectedSkillId(fallbackExpert.skills[0]?.id || "");
      setPrompt(getScenarioPrompt(fallbackExpert.id, activeIdea));
    }
    return true;
  }

  async function handleGenerate(mode: "文本" | "录音" | "语音" | "文件" = "文本", uploadedFiles: File[] = [], promptOverride = "") {
    if (!canUsePermission("AI 创意工作台")) {
      blockPermission("AI 创意工作台");
      return;
    }
    if (role === "student" && !isStudentExpertEnabled(selectedExpert, activeAccountRecord)) {
      blockPermission(selectedExpert.name);
      return;
    }
    setIsGenerating(true);
    const clientMessageId = makeId("M");
    let uploadedAttachments: StudentAttachmentRecord[];
    try {
      uploadedAttachments = await Promise.all(
        uploadedFiles.map((file) => uploadStudentAttachment(activeIdea.id, clientMessageId, file)),
      );
    } catch (error) {
      setSystemNotice({
        title: "本地文件上传失败",
        message: error instanceof Error ? error.message : "文件未写入服务器，已取消本次 AI 调用。",
      });
      setIsGenerating(false);
      return;
    }
    const unreadableAttachmentMessage =
      uploadedAttachments.length > 0 && uploadedAttachments.every((attachment) => !attachment.readable)
        ? uploadedAttachments.map((attachment) => `${attachment.originalName}：${attachment.extractionMessage || "未提取到可读文本"}`).join("；")
        : "";
    const uploadedFileText = uploadedAttachments.length
      ? `已上传本地文件：${uploadedAttachments.map((attachment) => `${attachment.originalName}（${attachment.extractionStatus === "READY" ? "正文已识别" : attachment.extractionMessage || "未识别"}）`).join("、")}。`
      : "";
    const typedPrompt = promptOverride.trim() || prompt.trim();
    const userContent =
      mode === "文件" || mode === "录音"
        ? `${uploadedFileText || `上传了一份关于《${activeIdea.title}》的本地资料。`}请整理重点并给出建议。`
        : mode === "语音"
          ? typedPrompt || `通过语音补充了《${activeIdea.title}》的答辩想法，请模拟评委追问并给建议。`
          : typedPrompt || getScenarioPrompt(selectedExpert.id, activeIdea);
    const userMessage: ChatMessage = {
      id: clientMessageId,
      clientMessageId,
      ideaId: activeIdea.id,
      sender: "user",
      mode,
      content: userContent,
      createdAt: nowTime(),
    };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    const round = getExpertDialogueRound(messages, activeIdea.id, selectedExpert.id);
    const artifactType = getArtifactType(selectedExpert.id);
    const shouldOutput = shouldOutputStageResult(selectedExpert.id, round);
    const selectedExpertKnowledgeCategories = getConfiguredExpertKnowledgeCategories(selectedExpert.id, promptKnowledgeRoutes);

    try {
      await saveStudentConversation(activeIdea.id, {
        selectedExpertId: selectedExpert.id,
        selectedSkillId: selectedSkill.id,
        modelMode: model,
        knowledgeSelection: selectedKnowledgeSelection,
      });
      const persistedUserMessage = await persistStudentMessage(userMessage);
      if (!persistedUserMessage) {
        throw new Error("用户消息尚未写入数据库，已取消本次 AI 调用");
      }
      if (unreadableAttachmentMessage) {
        const localNoticeMessage: ChatMessage = {
          id: makeId("M"),
          ideaId: activeIdea.id,
          sender: "ai",
          expertId: selectedExpert.id,
          expertName: selectedExpert.name,
          skillName: selectedSkill.name,
          content: `文件已安全保存，但当前还不能读取正文：${unreadableAttachmentMessage}。请上传包含可复制文本的 PDF、Word、PPT、Excel、TXT/Markdown，或等待平台配置 OCR/ASR 后再试。`,
          createdAt: nowTime(),
        };
        setMessages((current) => [...current, localNoticeMessage]);
        await persistStudentMessage(localNoticeMessage);
        return;
      }
      const reply = await requestDeepSeekExpertReply({
        ideaId: activeIdea.id,
        expertId: selectedExpert.id,
        clientMessageId: userMessage.id,
        skillName: selectedSkill.name,
        artifactType: shouldOutput ? artifactType : undefined,
      });
      const blocks: ResultBlock[] | undefined = shouldOutput
        ? [
            { title: `${selectedExpert.name}生成结果`, items: [reply.content] },
            ...getKnowledgeSpecificBlocks(
              selectedExpert.id,
              selectedKnowledgeSelection,
              true,
              knowledgeUploads,
              knowledgeBaseStates,
              selectedExpertKnowledgeCategories,
            ),
            getKnowledgeUsageBlock(
              selectedExpert.id,
              knowledgeUploads,
              knowledgeBaseStates,
              canUsePermission("调用课程知识库"),
              selectedKnowledgeSelection,
              selectedExpertKnowledgeCategories,
            ),
          ]
        : undefined;
      const aiMessage: ChatMessage = {
        id: reply.assistantMessageId || makeId("M"),
        ideaId: activeIdea.id,
        sender: "ai",
        expertId: selectedExpert.id,
        expertName: selectedExpert.name,
        skillName: selectedSkill.name,
        artifactType: shouldOutput ? artifactType : undefined,
        content: reply.content,
        blocks,
        createdAt: nowTime(),
      };
      setMessages((current) => [...current, aiMessage]);
      if (aiMessage.artifactType && aiMessage.blocks) {
        void saveMessageArtifact(aiMessage).catch((error) => {
          setSystemNotice({
            title: "成果记录保存失败",
            message: error instanceof Error ? error.message : "生成结果已保留，但成果记录暂未写入后端。",
          });
        });
      }
      setIdeas((current) =>
        current.map((idea) =>
          idea.id === activeIdea.id ? { ...idea, stage: selectedSkill.stage, updatedAt: aiMessage.createdAt } : idea,
        ),
      );
      updateStudentIdea(activeIdea.id, { stage: selectedSkill.stage })
        .then((saved) => {
          setIdeas((current) => current.map((idea) => (idea.id === saved.id ? mapRemoteIdea(saved) : idea)));
        })
        .catch((error) => {
          setSystemNotice({
            title: "创意阶段保存失败",
            message: error instanceof Error ? error.message : "生成结果已保留，但当前阶段暂未同步。",
          });
        });
    } catch (error) {
      setSystemNotice({
        title: "AI 生成失败",
        message: error instanceof Error ? error.message : "AI 服务暂时不可用，请稍后重试。",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function buildPptAssetFromMessage(
    message: ChatMessage,
    pptContext?: { configured?: boolean; content?: string; references?: PptKnowledgeReference[]; pptUrl?: string; pptFileName?: string },
  ) {
    const existing = generatedAssets.find((asset) => asset.type === "PPT" && asset.sourceMessageId === message.id);
    const baseAsset =
      existing || {
        id: makePersistentId("A"),
        ideaId: activeIdea.id,
        type: "PPT" as const,
        title: `${activeIdea.title} - 路演 PPT`,
        sourceMessageId: message.id,
        createdAt: nowTime(),
      };
    const asset = pptContext
      ? {
          ...baseAsset,
          pptKnowledgeContent: pptContext.content || "",
          pptKnowledgeReferences: pptContext.references || [],
          pptGeneratedAt: nowTime(),
          pptUsesLexiang: Boolean(pptContext.configured),
          pptUrl: pptContext.pptUrl,
          pptFileName: pptContext.pptFileName,
        }
      : baseAsset;
    setGeneratedAssets((current) => {
      const existingIndex = current.findIndex((item) => item.type === "PPT" && item.sourceMessageId === message.id);
      if (existingIndex < 0) return [asset, ...current];
      return current.map((item, index) => (index === existingIndex ? { ...asset, id: item.id, createdAt: item.createdAt } : item));
    });
    return asset;
  }

  async function persistGeneratedAsset(asset: GeneratedAsset) {
    try {
      const saved = await saveStudentArtifact({
        ideaId: asset.ideaId,
        sourceMessageId: generatedAssetSourceId(asset.id),
        artifactType: asset.type === "PPT" ? "PPT" : "MEDIA",
        title: asset.title,
        summary: asset.type === "PPT" ? "学生生成的路演 PPT" : "学生生成的多媒体成果",
        content: { kind: "GENERATED_ASSET", asset },
      });
      setArtifactRecords((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      if (asset.type !== "PPT" || asset.pptUrl) return asset;

      const pptxFile = await buildPptxFile({
        title: asset.title,
        content: asset.pptKnowledgeContent,
        references: asset.pptKnowledgeReferences,
      });
      const uploaded = await uploadStudentArtifactPptx(saved.id, pptxFile);
      setArtifactRecords((current) => [uploaded, ...current.filter((item) => item.id !== uploaded.id)]);
      const storedAsset: GeneratedAsset = {
        ...asset,
        pptUrl: artifactDownloadUrl(uploaded.id),
        pptFileName: pptxFile.name,
      };
      setGeneratedAssets((current) => current.map((item) => (item.id === asset.id ? storedAsset : item)));
      return storedAsset;
    } catch (error) {
      setSystemNotice({
        title: "生成成果保存失败",
        message: error instanceof Error ? error.message : "成果暂未写入数据库，请稍后重试。",
      });
      return null;
    }
  }

  async function handleContextAction(message: ChatMessage, action: ContextAction) {
    if (action === "preview") {
      if (message.artifactType === "MEDIA") {
        const cached = generatedAssets.find((asset) => asset.type === "VIDEO" && (asset.sourceMessageId === message.id || asset.ideaId === activeIdea.id));
        setMediaDraft(cached || buildMediaAsset(activeIdea, message));
        return;
      }
      if (message.artifactType === "PPT") {
        setPendingAssetGeneration({
          title: "正在连接乐享知识库生成 PPT",
          detail: "正在读取乐享知识库资料，生成 10 页路演结构、页面观点和素材建议。",
          seconds: 12,
        });
        try {
          const pptContext = await generateLexiangPptContext(message, activeIdea);
          const asset = buildPptAssetFromMessage(message, pptContext);
          setPptPreview((await persistGeneratedAsset(asset)) || asset);
        } catch (error) {
          const asset = buildPptAssetFromMessage(message, {
            configured: false,
            content: "",
            references: [],
          });
          const storedAsset = await persistGeneratedAsset(asset);
          setPptPreview(storedAsset || asset);
          setSystemNotice({
            title: "已使用平台预置结构生成 PPTX",
            message: error instanceof Error ? `乐享当前不可用：${error.message}` : "乐享当前不可用，未产生供应商消耗。",
          });
        } finally {
          setPendingAssetGeneration(null);
        }
        return;
      }
      setPendingAssetGeneration({
        title: "正在生成 Word 成果预览",
        detail: "正在把本轮对话整理成可提交的阶段成果文档。",
        seconds: 4,
      });
      window.setTimeout(() => {
        setWordPreview({
          title: getDownloadTitle(message, "阶段对话记录"),
          blocks: message.artifactType === "BRAINSTORM" ? getBrainstormTaskBlocks(message.blocks) : message.blocks || [],
        });
        setPendingAssetGeneration(null);
      }, 3800);
      return;
    }
    if (action === "download") {
      if (!canUsePermission("下载个人成果")) {
        blockPermission("下载个人成果");
        return;
      }
      const downloadablePpt = message.artifactType === "PPT"
        ? generatedAssets.find((asset) => asset.type === "PPT" && asset.sourceMessageId === message.id)
        : undefined;
      const downloadableVideo = message.artifactType === "MEDIA"
        ? generatedAssets.find((asset) => asset.type === "VIDEO" && (asset.sourceMessageId === message.id || asset.ideaId === activeIdea.id))
        : undefined;
      if (message.artifactType === "PPT" && !downloadablePpt?.pptUrl) {
        setSystemNotice({ title: "PPTX 尚未生成", message: "请先点击预览，平台会组装并保存真实 PPTX 文件，然后才能下载。" });
        return;
      }
      if (message.artifactType === "MEDIA" && !downloadableVideo?.videoUrl) {
        setSystemNotice({ title: "MP4 尚未生成", message: "当前仅保存了视频脚本和分镜，尚无可下载的真实 MP4 文件。" });
        return;
      }
      try {
        const artifact = artifactRecords.find((item) => item.sourceMessageId === message.id) || (await saveMessageArtifact(message));
        if (artifact) await recordArtifactClientDownload(artifact.id);
      } catch (error) {
        setSystemNotice({
          title: "成果下载准备失败",
          message: error instanceof Error ? error.message : "暂时无法记录本次下载，请稍后再试。",
        });
        return;
      }
      if (message.artifactType === "PPT") {
        downloadPptAsset(downloadablePpt);
        return;
      }
      if (message.artifactType === "MEDIA") {
        downloadVideoAsset(downloadableVideo);
        return;
      }
      downloadArtifactWord(message);
      return;
    }
    if (action === "ask") {
      if (!canUsePermission("答辩模拟")) {
        blockPermission("答辩模拟");
        return;
      }
      setStudentView("defense");
      return;
    }
    if (action === "script") {
      if (!canUsePermission("AI 创意工作台")) {
        blockPermission("AI 创意工作台");
        return;
      }
      const scriptExpert = experts.find((expert) => expert.id === "script");
      if (scriptExpert) {
        if (!isStudentExpertEnabled(scriptExpert, activeAccountRecord)) {
          blockPermission(scriptExpert.name);
          return;
        }
        setSelectedExpertId(scriptExpert.id);
        setSelectedSkillId(scriptExpert.skills[0].id);
      }
      setStudentView("workspace");
      setPrompt(`基于刚才这份《${getDownloadTitle(message)}》，帮我准备 1 分钟、3 分钟、5 分钟路演稿。这次主要讲给课堂老师和学院试点负责人，转场话术要自然一点。`);
      return;
    }
    if (!canUsePermission("AI 创意工作台")) {
      blockPermission("AI 创意工作台");
      return;
    }
    const mediaExpert = experts.find((expert) => expert.id === "media");
    if (mediaExpert && !isStudentExpertEnabled(mediaExpert, activeAccountRecord)) {
      blockPermission(mediaExpert.name);
      return;
    }
    const cached = generatedAssets.find((asset) => asset.type === "VIDEO" && asset.ideaId === activeIdea.id);
    setMediaDraft(cached || buildMediaAsset(activeIdea, message));
  }

  async function handleSubmitMessage(message: ChatMessage) {
    if (!canUsePermission("提交老师审核")) {
      blockPermission("提交老师审核");
      return;
    }
    if (!isArtifactType(message.artifactType) || !message.blocks) return;
    const studentIdentity = getStudentIdentity(auth, activeAccountRecord);
    if (!studentIdentity.hasGroup) {
      setSystemNotice({ title: "暂时不能提交", message: "当前学生账号尚未分配项目小组，请先联系管理员在管理端完成小组分配。" });
      return;
    }
    try {
      const artifact = await saveMessageArtifact(message);
      if (!artifact) return;
      const submission = mapRemoteSubmission(await submitStudentArtifact(artifact.id));
      setSubmissions((current) => {
        const exists = current.some((item) => item.id === submission.id);
        return exists ? current.map((item) => (item.id === submission.id ? submission : item)) : [submission, ...current];
      });
      setStudentView("feedback");
    } catch (error) {
      setSystemNotice({
        title: "成果提交失败",
        message: error instanceof Error ? error.message : "暂时无法提交老师审核。",
      });
    }
  }

  function handleSaveMediaAsset(asset: GeneratedAsset) {
    const existing = generatedAssets.find((item) => item.type === "VIDEO" && item.ideaId === asset.ideaId);
    const normalized = {
      ...asset,
      id: existing?.id || asset.id || makePersistentId("A"),
      createdAt: existing?.createdAt || asset.createdAt || nowTime(),
    };
    setGeneratedAssets((current) => {
      const existingIndex = current.findIndex((item) => item.type === "VIDEO" && item.ideaId === normalized.ideaId);
      if (existingIndex < 0) return [normalized, ...current];
      return current.map((item, index) => (index === existingIndex ? { ...normalized, id: item.id, createdAt: item.createdAt } : item));
    });
    setMediaDraft(normalized);
    void persistGeneratedAsset(normalized);
  }

  async function handleSaveDefense(practice: DefensePractice) {
    if (!canUsePermission("答辩模拟")) {
      blockPermission("答辩模拟");
      return;
    }
    if (practice.visibility === "teacher" && !canUsePermission("提交老师审核")) {
      blockPermission("提交老师审核");
      return;
    }
    let storedPractice = practice;
    try {
      const saved = await saveDefensePractice(practice.id, {
        ideaId: practice.ideaId,
        visibility: practice.visibility,
        content: practice,
      });
      storedPractice = mapRemoteDefensePractice(saved) || practice;
      setDefensePractices((current) => [storedPractice, ...current.filter((item) => item.id !== storedPractice.id)]);
    } catch (error) {
      setSystemNotice({
        title: "答辩记录保存失败",
        message: error instanceof Error ? error.message : "答辩记录未写入数据库。",
      });
      return;
    }
    if (practice.visibility === "teacher") {
      const studentIdentity = getStudentIdentity(auth, activeAccountRecord);
      if (!studentIdentity.hasGroup) {
        setSystemNotice({ title: "记录已保存，暂时不能提交", message: "当前学生账号尚未分配项目小组，请先联系管理员在管理端完成小组分配。" });
        return;
      }
      const blocks = defenseBlocks(storedPractice);
      try {
        const artifact = await saveStudentArtifact({
          ideaId: activeIdea.id,
          sourceMessageId: storedPractice.id,
          artifactType: "DEFENSE",
          title: `${activeIdea.title} - 答辩模拟记录`,
          summary: "已基于 BP + PPT 生成 1/3/5 分钟演讲稿、评委压力测试问题和回答建议。",
          content: blocks,
        });
        const submission = mapRemoteSubmission(await submitStudentArtifact(artifact.id));
        setArtifactRecords((current) => [artifact, ...current.filter((item) => item.id !== artifact.id)]);
        setSubmissions((current) => [submission, ...current.filter((item) => item.id !== submission.id)]);
        setStudentView("feedback");
      } catch (error) {
        setSystemNotice({
          title: "答辩记录提交失败",
          message: error instanceof Error ? error.message : "暂时无法提交老师审核。",
        });
      }
      return;
    }
  }

  async function handleReviewSubmission(status: SubmissionStatus) {
    if (!canUsePermission("提交审核中心")) {
      blockPermission("提交审核中心");
      return;
    }
    if (!activeSubmission) return;
    if (activeSubmission.status === "withdrawn") {
      setSystemNotice({ title: "无法继续审核", message: "该成果已由学生撤回，无法继续审核。" });
      return;
    }
    try {
      const statusMap: Record<Exclude<SubmissionStatus, "withdrawn">, "PENDING" | "APPROVED" | "REVISION"> = {
        pending: "PENDING",
        approved: "APPROVED",
        revision: "REVISION",
      };
      if (status === "withdrawn") return;
      const saved = mapRemoteSubmission(await reviewTeacherSubmission(activeSubmission.id, {
        status: statusMap[status],
        teacherComment,
      }));
      setSubmissions((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    } catch (error) {
      setSystemNotice({ title: "审核保存失败", message: error instanceof Error ? error.message : "暂时无法保存审核结果。" });
    }
  }

  async function handleSaveTeacherComment(submissionId: string, comment: string) {
    if (!canUsePermission("节点解答与指导")) {
      blockPermission("节点解答与指导");
      return;
    }
    const currentSubmission = submissions.find((item) => item.id === submissionId);
    try {
      const saved = mapRemoteSubmission(await reviewTeacherSubmission(submissionId, {
        teacherComment: comment.trim() || getDefaultTeacherComment(currentSubmission),
      }));
      setSubmissions((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    } catch (error) {
      setSystemNotice({ title: "评语保存失败", message: error instanceof Error ? error.message : "暂时无法保存教师评语。" });
    }
  }

  async function handleWithdrawSubmission(submissionId: string) {
    try {
      const saved = mapRemoteSubmission(await withdrawStudentSubmission(submissionId));
      setSubmissions((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    } catch (error) {
      setSystemNotice({ title: "撤回失败", message: error instanceof Error ? error.message : "暂时无法撤回本次提交。" });
    }
  }

  async function handleDeleteWithdrawnSubmission(submissionId: string) {
    try {
      await deleteStudentSubmission(submissionId);
      setSubmissions((current) => current.filter((item) => item.id !== submissionId));
    } catch (error) {
      setSystemNotice({ title: "删除失败", message: error instanceof Error ? error.message : "暂时无法删除撤回记录。" });
    }
  }

  async function handleToggleExcellent(submissionId: string) {
    if (!canUsePermission("优秀成果标记")) {
      blockPermission("优秀成果标记");
      return;
    }
    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) return;
    try {
      const saved = mapRemoteSubmission(await reviewTeacherSubmission(submissionId, { excellent: !submission.isExcellent }));
      setSubmissions((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    } catch (error) {
      setSystemNotice({ title: "标记失败", message: error instanceof Error ? error.message : "暂时无法更新优秀成果标记。" });
    }
  }

  function handleJumpPending() {
    if (!canUsePermission("提交审核中心")) {
      blockPermission("提交审核中心");
      return;
    }
    const pending = submissions.find((item) => item.status === "pending");
    if (!pending) return;
    setTeacherStatusFilter("pending");
    setTeacherFilter("ALL");
    setActiveSubmissionId(pending.id);
    setTeacherComment(pending.teacherComment || getDefaultTeacherComment(pending));
  }

  function handleSelectSubmission(submission: Submission) {
    if (!canUsePermission("提交审核中心")) {
      blockPermission("提交审核中心");
      return;
    }
    setActiveSubmissionId(submission.id);
    setTeacherComment(submission.teacherComment || getDefaultTeacherComment(submission));
  }

  function handleSelectExpert(expert: Expert) {
    const handoff = expert.id === "positioning" ? getBrainstormHandoffForIdea(activeIdea) : undefined;
    setSelectedExpertId(expert.id);
    setSelectedSkillId(expert.skills[0].id);
    setStudentView("workspace");
    setPrompt(appendPositioningHandoffPrompt(getScenarioPrompt(expert.id, activeIdea), handoff));
    if (handoff) {
      setSystemNotice({
        title: "已带入头脑风暴成果",
        message: "项目定位专家已收到同一创意空间中最新的结构化交接。该内容仍标记为待学生确认，专家会先核对再收敛定位。",
      });
    }
  }

  if (!authReady) return <AuthLoadingView />;
  if (!auth) return <LoginView accountRecords={accountRecords} onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <AppThreeBackdrop role={role} />
      <header className="topbar">
        <div className="brand-block">
          <SufeSeal />
          <div>
            <p>上海财经大学商学院</p>
            <h1>AI 赋能创业实践教学示范平台</h1>
          </div>
        </div>
        <div className="account-bar">
          {role === "student" ? (
            <button
              className="account-chip account-profile-trigger"
              type="button"
              onClick={() => setIsProfileSettingsOpen(true)}
              aria-label="打开个人资料设置"
            >
              <StudentCartoonAvatar avatarId={activeStudentAvatarId} size={30} />
              <span>{auth.name}</span>
              <em>{getAccountSubtitle(auth, activeAccountRecord)}</em>
              <ChevronRight className="account-chip-arrow" size={16} />
            </button>
          ) : (
            <div className="account-chip">
              {role === "teacher" && <ClipboardCheck size={18} />}
              {role === "admin" && <Settings2 size={18} />}
              <span>{auth.name}</span>
              <em>{getAccountSubtitle(auth, activeAccountRecord)}</em>
            </div>
          )}
          <button className="ghost-button" type="button" onClick={handleLogout}>
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </header>

      <main>
        {role === "student" && (
          <StudentView
            ideas={ideas}
            activeIdea={activeIdea}
            experts={studentExperts}
            selectedExpert={selectedExpert}
            selectedSkill={selectedSkill}
            model={model}
            prompt={prompt}
            messages={messages}
            submissions={submissions}
            knowledgeUploads={knowledgeUploads}
            knowledgeCatalog={knowledgeCatalog}
            knowledgeBaseStates={knowledgeBaseStates}
            promptKnowledgeRoutes={promptKnowledgeRoutes}
            selectedKnowledgeSelection={selectedKnowledgeSelection}
            defensePractices={defensePractices}
            generatedAssets={generatedAssets}
            isGenerating={isGenerating || isRecoveringAi}
            studentView={studentView}
            studentAvatarId={activeStudentAvatarId}
            permissionAccess={permissionAccess}
            onViewChange={setStudentView}
            onExpertSelect={handleSelectExpert}
            onModelChange={setModel}
            onKnowledgeSelectionChange={handleStudentKnowledgeSelectionChange}
            onPromptChange={setPrompt}
            onIdeaSelect={handleSelectIdea}
            onIdeaCreate={handleCreateIdea}
            onIdeaDelete={requestDeleteIdea}
            onIdeaRename={handleRenameIdea}
            onIdeaEdit={() => setPrompt(`请帮我继续修改当前创意《${activeIdea.title}》：${activeIdea.description}`)}
            onGenerate={handleGenerate}
            onContextAction={handleContextAction}
            onSubmitMessage={handleSubmitMessage}
            onSaveDefense={handleSaveDefense}
            onWithdrawSubmission={handleWithdrawSubmission}
            onDeleteWithdrawnSubmission={handleDeleteWithdrawnSubmission}
          />
        )}

        {mediaDraft && (
          <MediaGenerationModal
            asset={mediaDraft}
            isCached={generatedAssets.some((asset) => asset.type === "VIDEO" && asset.ideaId === mediaDraft.ideaId)}
            onAssetChange={setMediaDraft}
            onClose={() => setMediaDraft(null)}
            onConfirm={handleSaveMediaAsset}
          />
        )}
        {pptPreview && <PptPreviewModal asset={pptPreview} onClose={() => setPptPreview(null)} />}
        {videoPreview && <VideoPreviewModal asset={videoPreview} onClose={() => setVideoPreview(null)} />}
        {wordPreview && <WordPreviewModal preview={wordPreview} onClose={() => setWordPreview(null)} />}
        {pendingAssetGeneration && <GenerationPendingModal pending={pendingAssetGeneration} />}
        {pendingDeleteIdea && (
          <IdeaDeleteConfirmModal
            idea={pendingDeleteIdea}
            onCancel={() => setPendingDeleteIdeaId(null)}
            onConfirm={handleConfirmDeleteIdea}
          />
        )}
        {pendingDeleteKnowledgeItem && (
          <KnowledgeBaseDeleteConfirmModal
            item={pendingDeleteKnowledgeItem}
            relatedCount={knowledgeUploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === pendingDeleteKnowledgeItem.category).length}
            onCancel={() => setPendingDeleteKnowledgeBase(null)}
            onConfirm={handleConfirmDeleteKnowledgeBase}
          />
        )}
        {pendingKnowledgeAsset && pendingKnowledgeAssetAction && (
          <KnowledgeAssetActionConfirmModal
            asset={pendingKnowledgeAsset}
            action={pendingKnowledgeAssetAction.action}
            onCancel={() => setPendingKnowledgeAssetAction(null)}
            onConfirm={handleConfirmKnowledgeAssetAction}
          />
        )}

        {role === "teacher" && (
          <TeacherView
            submissions={teacherSubmissions}
            allSubmissions={teacherVisibleSubmissions}
            activeSubmission={activeSubmission}
            generatedAssets={generatedAssets}
            knowledgeUploads={knowledgeUploads}
            knowledgeCatalog={knowledgeCatalog}
            knowledgeBaseStates={knowledgeBaseStates}
            promptKnowledgeRoutes={promptKnowledgeRoutes}
            customExperts={customExperts}
            teacherName={auth.name}
            filter={teacherFilter}
            teacherComment={teacherComment}
            statusFilter={teacherStatusFilter}
            permissionAccess={permissionAccess}
            onFilterChange={setTeacherFilter}
            onStatusFilterChange={setTeacherStatusFilter}
            onSelectSubmission={handleSelectSubmission}
            onTeacherCommentChange={setTeacherComment}
            onSaveTeacherComment={handleSaveTeacherComment}
            onReview={handleReviewSubmission}
            onToggleExcellent={handleToggleExcellent}
            onJumpPending={handleJumpPending}
            onPreviewPpt={setPptPreview}
            onPreviewVideo={setVideoPreview}
            onPreviewWord={setWordPreview}
            onUploadKnowledge={(assets) => {
              if (!canUsePermission("上传教学资料")) {
                blockPermission("上传教学资料");
                return;
              }
              void handleUploadKnowledge(assets);
            }}
            onDeleteKnowledge={(id) => requestKnowledgeAssetAction(id, "delete")}
            onToggleKnowledge={(id) => requestKnowledgeAssetAction(id, "toggle")}
            onKnowledgeBaseStatesChange={(states) => void handleKnowledgeBaseStatesChange(states)}
            onKnowledgeCatalogChange={(catalog) => void handleKnowledgeCatalogChange(catalog)}
            onPromptKnowledgeRoutesChange={(routes) => void handlePromptKnowledgeRoutesChange(routes)}
            onCustomExpertsChange={(nextExperts) => void handleCustomExpertsChange(nextExperts)}
            onExpertSkillConfirmed={handleExpertSkillConfirmed}
            onSaveExpertPrompt={handleSaveExpertPrompt}
            onDeleteExpert={handleDeleteExpert}
            onDeleteKnowledgeBase={handleDeleteKnowledgeBase}
          />
        )}

        {role === "admin" && (
          <AdminView
            accountRecords={accountRecords}
            studentGroups={studentGroups}
            onAccountRecordsChange={setAccountRecords}
            onStudentGroupsChange={setStudentGroups}
            generatedAssets={generatedAssets}
            knowledgeUploads={knowledgeUploads}
            knowledgeCatalog={knowledgeCatalog}
            knowledgeBaseStates={knowledgeBaseStates}
            promptKnowledgeRoutes={promptKnowledgeRoutes}
            customExperts={customExperts}
            adminName={auth.name}
            onKnowledgeBaseStatesChange={(states) => void handleKnowledgeBaseStatesChange(states)}
            onKnowledgeCatalogChange={(catalog) => void handleKnowledgeCatalogChange(catalog)}
            onPromptKnowledgeRoutesChange={(routes) => void handlePromptKnowledgeRoutesChange(routes)}
            onCustomExpertsChange={(nextExperts) => void handleCustomExpertsChange(nextExperts)}
            onExpertSkillConfirmed={handleExpertSkillConfirmed}
            onSaveExpertPrompt={handleSaveExpertPrompt}
            onDeleteExpert={handleDeleteExpert}
            onDeleteKnowledgeBase={handleDeleteKnowledgeBase}
            onUploadKnowledge={(assets) => void handleUploadKnowledge(assets)}
            onDeleteKnowledge={(id) => requestKnowledgeAssetAction(id, "delete")}
            onToggleKnowledge={(id) => requestKnowledgeAssetAction(id, "toggle")}
            submissions={submissions}
          />
        )}
      </main>
      {auth.role === "student" && isProfileSettingsOpen && (
        <ProfileSettingsModal
          auth={auth}
          account={activeAccountRecord}
          avatarId={activeStudentAvatarId}
          onClose={() => setIsProfileSettingsOpen(false)}
          onSave={handleSaveStudentProfile}
        />
      )}
      {systemNotice && <SystemNoticeModal notice={systemNotice} onClose={() => setSystemNotice(null)} />}
      {isLogoutConfirmOpen && (
        <LogoutConfirmModal
          accountName={auth.name}
          onCancel={() => setIsLogoutConfirmOpen(false)}
          onConfirm={handleConfirmLogout}
        />
      )}
    </div>
  );
}

function PrettySelect<T extends string>(props: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  placement?: "auto" | "top";
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = props.options.find((option) => option.value === props.value) || props.options[0];

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportGap = 12;
      const estimatedMenuHeight = Math.min(260, props.options.length * 38 + 12);
      const forceTop = props.placement === "top";
      const hasSpaceBelow = !forceTop && window.innerHeight - rect.bottom > estimatedMenuHeight + viewportGap;
      const availableAbove = Math.max(120, rect.top - viewportGap);
      const menuMaxHeight = hasSpaceBelow ? window.innerHeight - rect.bottom - viewportGap : Math.min(estimatedMenuHeight, availableAbove);
      const top = hasSpaceBelow ? rect.bottom + 6 : Math.max(viewportGap, rect.top - menuMaxHeight - 6);
      setMenuStyle({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight: menuMaxHeight,
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as Element | null)?.closest?.(".pretty-select-menu")) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, props.options.length, props.placement]);

  return (
    <div ref={rootRef} className={`pretty-select ${open ? "open" : ""}`}>
      <button
        ref={triggerRef}
        className="pretty-select-trigger"
        type="button"
        aria-label={props.ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={props.disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected.label}</span>
        <em>⌄</em>
      </button>
      {open &&
        createPortal(
          <div className="pretty-select-menu" role="listbox" aria-label={props.ariaLabel} style={menuStyle}>
            {props.options.map((option) => (
              <button
                className={option.value === props.value ? "selected" : ""}
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === props.value}
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  props.onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

function StudentView(props: {
  ideas: Idea[];
  activeIdea: Idea;
  experts: Expert[];
  selectedExpert: Expert;
  selectedSkill: Skill;
  model: AnswerMode;
  prompt: string;
  messages: ChatMessage[];
  submissions: Submission[];
  knowledgeUploads: KnowledgeUpload[];
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  promptKnowledgeRoutes: PromptKnowledgeRoutes;
  selectedKnowledgeSelection: StudentKnowledgeSelection;
  defensePractices: DefensePractice[];
  generatedAssets: GeneratedAsset[];
  isGenerating: boolean;
  studentView: StudentViewMode;
  studentAvatarId: StudentAvatarId;
  permissionAccess: PermissionAccess;
  onViewChange: (view: StudentViewMode) => void;
  onExpertSelect: (expert: Expert) => void;
  onModelChange: (mode: AnswerMode) => void;
  onKnowledgeSelectionChange: (selection: StudentKnowledgeSelection) => void;
  onPromptChange: (value: string) => void;
  onIdeaSelect: (ideaId: string) => void;
  onIdeaCreate: () => void;
  onIdeaDelete: (ideaId: string) => void;
  onIdeaRename: (ideaId: string, nextTitle: string) => void;
  onIdeaEdit: () => void;
  onGenerate: (mode?: "文本" | "录音" | "语音" | "文件", uploadedFiles?: File[], promptOverride?: string) => void;
  onContextAction: (message: ChatMessage, action: ContextAction) => void | Promise<void>;
  onSubmitMessage: (message: ChatMessage) => void;
  onSaveDefense: (practice: DefensePractice) => void;
  onWithdrawSubmission: (submissionId: string) => void;
  onDeleteWithdrawnSubmission: (submissionId: string) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{ ideaId: string; x: number; y: number } | null>(null);
  const [renameIdeaId, setRenameIdeaId] = useState<string | null>(null);
  const renameIdea = renameIdeaId ? props.ideas.find((idea) => idea.id === renameIdeaId) || null : null;
  const currentMessages = props.messages.filter((message) => message.ideaId === props.activeIdea.id);
  const currentSubmissions = props.submissions.filter((submission) => submission.ideaId === props.activeIdea.id);
  const activeKnowledgeCatalog = getActiveKnowledgeCatalog(props.knowledgeCatalog);
  const activeKnowledgeCategories = activeKnowledgeCatalog.map((item) => item.category);
  const studentViewPermissions: Record<StudentViewMode, string> = {
    workspace: "AI 创意工作台",
    feedback: "提交老师审核",
    defense: "答辩模拟",
  };

  return (
    <div className="student-page role-view-shell">
      <nav className="student-tabs" aria-label="学生端功能">
        {[
          ["workspace", "AI 创意工作台", MessageSquareText],
          ["feedback", "老师反馈", ClipboardCheck],
          ["defense", "答辩模拟", Mic],
        ].map(([view, label, Icon]) => {
          const permission = studentViewPermissions[view as StudentViewMode];
          const locked = !props.permissionAccess.can(permission);
          return (
            <button
              className={`${props.studentView === view ? "active" : ""} ${locked ? "locked" : ""}`.trim()}
              key={String(view)}
              type="button"
              aria-disabled={locked}
              title={locked ? `${permission}权限已停用` : String(label)}
              onClick={() => {
                if (locked) {
                  props.permissionAccess.block(permission);
                  return;
                }
                props.onViewChange(view as StudentViewMode);
              }}
            >
              <Icon size={17} />
              {String(label)}
            </button>
          );
        })}
      </nav>

      {(props.permissionAccess.accountDisabled || props.permissionAccess.disabledPermissions.length > 0) && (
        <PermissionBanner
          accountDisabled={props.permissionAccess.accountDisabled}
          disabledPermissions={props.permissionAccess.disabledPermissions}
        />
      )}

      {props.studentView === "workspace" && (
        <div className="buddy-shell view-transition-panel" key="student-workspace">
          <aside className="buddy-sidebar">
            <div className="buddy-sidebar-head">
              <div>
                <span>学生工作区</span>
                <strong>创意空间</strong>
              </div>
            </div>
            <button className={`buddy-new-chat ${props.permissionAccess.can("AI 创意工作台") ? "" : "locked"}`} type="button" onClick={props.onIdeaCreate}>
              <PenLine size={17} />
              {props.permissionAccess.can("AI 创意工作台") ? "新建创意" : "工作台权限已停用"}
            </button>
            <div className="buddy-history" aria-label="创意列表">
              {props.ideas.map((idea) => (
                <div
                  className={idea.id === props.activeIdea.id ? "active" : ""}
                  key={idea.id}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    const menuWidth = 132;
                    const menuHeight = 92;
                    const gap = 10;
                    props.onIdeaSelect(idea.id);
                    setContextMenu({
                      ideaId: idea.id,
                      x: Math.max(gap, Math.min(event.clientX, window.innerWidth - menuWidth - gap)),
                      y: Math.max(gap, Math.min(event.clientY, window.innerHeight - menuHeight - gap)),
                    });
                  }}
                >
                  <button className="buddy-history-main" type="button" onClick={() => props.onIdeaSelect(idea.id)}>
                    <strong>{idea.title}</strong>
                    <p>{idea.description}</p>
                    <span>{idea.stage}</span>
                  </button>
                </div>
              ))}
            </div>
            {contextMenu && (
              createPortal(
                <div className="idea-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseLeave={() => setContextMenu(null)}>
                  <button
                    className="rename-action"
                    type="button"
                    onClick={() => {
                      setRenameIdeaId(contextMenu.ideaId);
                      setContextMenu(null);
                    }}
                  >
                    <PenLine size={15} />
                    编辑
                  </button>
                  <button
                    className="delete-action"
                    type="button"
                    onClick={() => {
                      props.onIdeaDelete(contextMenu.ideaId);
                      setContextMenu(null);
                    }}
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>,
                document.body,
              )
            )}
            <div className="buddy-sidebar-foot">
              <span>课程知识库</span>
              <div>
                {activeKnowledgeCategories
                  .filter((category) => props.knowledgeBaseStates[category])
                  .slice(0, 5)
                  .map((tag) => {
                    const count = props.knowledgeUploads.filter(
                      (asset) => asset.enabled !== false && (asset.category || inferKnowledgeCategory(asset.name)) === tag,
                    ).length;
                    return <em key={tag}>{tag}{count ? ` ${count}` : ""}</em>;
                  })}
              </div>
            </div>
          </aside>

          <ChatWorkspace
            activeIdea={props.activeIdea}
            experts={props.experts}
            selectedExpert={props.selectedExpert}
            selectedSkill={props.selectedSkill}
            model={props.model}
            prompt={props.prompt}
            messages={currentMessages}
            submissions={props.submissions}
            knowledgeUploads={props.knowledgeUploads}
            knowledgeCatalog={props.knowledgeCatalog}
            knowledgeBaseStates={props.knowledgeBaseStates}
            promptKnowledgeRoutes={props.promptKnowledgeRoutes}
            selectedKnowledgeSelection={props.selectedKnowledgeSelection}
            isGenerating={props.isGenerating}
            studentAvatarId={props.studentAvatarId}
            onExpertSelect={props.onExpertSelect}
            onModelChange={props.onModelChange}
            onKnowledgeSelectionChange={props.onKnowledgeSelectionChange}
            onPromptChange={props.onPromptChange}
            onIdeaEdit={props.onIdeaEdit}
            onGenerate={props.onGenerate}
            onContextAction={props.onContextAction}
            onSubmitMessage={props.onSubmitMessage}
            permissionAccess={props.permissionAccess}
          />
        </div>
      )}

      {props.studentView === "feedback" && (
        <FeedbackView
          key="student-feedback"
          submissions={currentSubmissions}
          activeIdea={props.activeIdea}
          generatedAssets={props.generatedAssets}
          onBackToWorkspace={() => props.onViewChange("workspace")}
          onContinue={(submission) => {
            props.onViewChange("workspace");
            props.onPromptChange(`请根据老师反馈继续修改《${submission.artifactTitle}》：${submission.teacherComment || "等待老师反馈中"}`);
          }}
          onWithdraw={props.onWithdrawSubmission}
          onDeleteWithdrawn={props.onDeleteWithdrawnSubmission}
          studentAvatarId={props.studentAvatarId}
          permissionAccess={props.permissionAccess}
        />
      )}

      {props.studentView === "defense" && (
        <DefenseView
          key="student-defense"
          activeIdea={props.activeIdea}
          messages={currentMessages}
          generatedAssets={props.generatedAssets.filter((asset) => asset.ideaId === props.activeIdea.id)}
          practices={props.defensePractices.filter((practice) => practice.ideaId === props.activeIdea.id)}
          studentAvatarId={props.studentAvatarId}
          onSaveDefense={props.onSaveDefense}
          permissionAccess={props.permissionAccess}
        />
      )}
      {renameIdea && (
        <IdeaRenameModal
          idea={renameIdea}
          onCancel={() => setRenameIdeaId(null)}
          onConfirm={(title) => {
            props.onIdeaRename(renameIdea.id, title);
            setRenameIdeaId(null);
          }}
        />
      )}
    </div>
  );
}

function ChatWorkspace(props: {
  activeIdea: Idea;
  experts: Expert[];
  selectedExpert: Expert;
  selectedSkill: Skill;
  model: AnswerMode;
  prompt: string;
  messages: ChatMessage[];
  submissions: Submission[];
  knowledgeUploads: KnowledgeUpload[];
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  promptKnowledgeRoutes: PromptKnowledgeRoutes;
  selectedKnowledgeSelection: StudentKnowledgeSelection;
  isGenerating: boolean;
  studentAvatarId: StudentAvatarId;
  onExpertSelect: (expert: Expert) => void;
  onModelChange: (mode: AnswerMode) => void;
  onKnowledgeSelectionChange: (selection: StudentKnowledgeSelection) => void;
  onPromptChange: (value: string) => void;
  onIdeaEdit: () => void;
  onGenerate: (mode?: "文本" | "录音" | "语音" | "文件", uploadedFiles?: File[], promptOverride?: string) => void;
  onContextAction: (message: ChatMessage, action: ContextAction) => void | Promise<void>;
  onSubmitMessage: (message: ChatMessage) => void;
  permissionAccess: PermissionAccess;
}) {
  const ExpertIcon = props.selectedExpert.icon;
  const nextExpertRound = getExpertDialogueRound(props.messages, props.activeIdea.id, props.selectedExpert.id);
  const loadingCopy = getGenerationLoadingCopy(props.selectedExpert.id, shouldOutputStageResult(props.selectedExpert.id, nextExpertRound));
  const starterPrompts = getChatStarterPrompts(props.selectedExpert.id, props.activeIdea, nextExpertRound);
  const activeKnowledgeCatalog = getActiveKnowledgeCatalog(props.knowledgeCatalog);
  const allowedKnowledgeCategories = getConfiguredExpertKnowledgeCategories(props.selectedExpert.id, props.promptKnowledgeRoutes);
  const allowedKnowledgeSet = new Set(allowedKnowledgeCategories);
  const studentVisibleKnowledgeCatalog = activeKnowledgeCatalog.filter(
    (item) => allowedKnowledgeSet.has(item.category) && props.knowledgeBaseStates[item.category] !== false,
  );
  const studentVisibleKnowledgeUploads = props.knowledgeUploads.filter((asset) => {
    const category = asset.category || inferKnowledgeCategory(asset.name);
    return allowedKnowledgeSet.has(category) && props.knowledgeBaseStates[category] !== false && asset.enabled !== false;
  });
  const [isKnowledgePickerOpen, setIsKnowledgePickerOpen] = useState(false);
  const validKnowledgeSources = resolveSelectedKnowledgeSources(
    props.selectedKnowledgeSelection,
    props.knowledgeUploads,
    props.knowledgeBaseStates,
    allowedKnowledgeCategories,
  );
  const selectedKnowledgeNames = Array.from(
    new Set([
      ...validKnowledgeSources.categories,
      ...validKnowledgeSources.uploads.map((asset) => asset.category || inferKnowledgeCategory(asset.name)),
    ]),
  );
  const selectedKnowledgeNameLabel =
    selectedKnowledgeNames.length > 2
      ? `${selectedKnowledgeNames.slice(0, 2).join("、")}等`
      : selectedKnowledgeNames.join("、");
  const knowledgePickerLabel =
    selectedKnowledgeNames.length || validKnowledgeSources.uploads.length
      ? `已选：${selectedKnowledgeNameLabel || "资料"} / ${validKnowledgeSources.uploads.length} 份材料`
      : "选择知识库 / 材料";
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledIdeaIdRef = useRef<string | null>(null);
  const studentUploadRef = useRef<HTMLInputElement | null>(null);
  const speechInput = useSpeechInput({
    value: props.prompt,
    onChange: props.onPromptChange,
    fallbackText: `语音输入：我们小组想把《${props.activeIdea.title}》做成面向高校学生的创业实践工具，请帮我结合上海财经大学商学院课程要求继续完善。`,
  });

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    const firstScroll = lastScrolledIdeaIdRef.current === null;
    const ideaChanged = lastScrolledIdeaIdRef.current !== props.activeIdea.id;
    lastScrolledIdeaIdRef.current = props.activeIdea.id;
    window.requestAnimationFrame(() => {
      if (firstScroll || ideaChanged) {
        messageList.scrollTop = messageList.scrollHeight;
        return;
      }
      messageList.scrollTo({ top: messageList.scrollHeight, behavior: "smooth" });
    });
  }, [props.activeIdea.id, props.messages.length, props.isGenerating]);

  function handlePromptChange(value: string) {
    props.onPromptChange(value);
    speechInput.resetVoiceInput();
  }

  function handleSend() {
    if (!props.permissionAccess.can("AI 创意工作台")) {
      props.permissionAccess.block("AI 创意工作台");
      return;
    }
    props.onGenerate(speechInput.hasVoiceInput ? "语音" : "文本");
    speechInput.resetVoiceInput();
  }

  function handleSimulateDialog() {
    if (!props.permissionAccess.can("AI 创意工作台")) {
      props.permissionAccess.block("AI 创意工作台");
      return;
    }
    props.onPromptChange(getNextRoundPrompt(props.selectedExpert.id, props.activeIdea, nextExpertRound));
    speechInput.resetVoiceInput();
  }

  function handleStarterPrompt(promptText: string) {
    if (!props.permissionAccess.can("AI 创意工作台")) {
      props.permissionAccess.block("AI 创意工作台");
      return;
    }
    props.onGenerate("文本", [], promptText);
    speechInput.resetVoiceInput();
  }

  function handleStudentUpload(files: FileList | null) {
    if (!files?.length) return;
    if (!props.permissionAccess.can("AI 创意工作台")) {
      props.permissionAccess.block("AI 创意工作台");
      return;
    }
    props.onGenerate("文件", Array.from(files));
  }

  return (
    <section className="buddy-chat">
      <header className="buddy-chat-head">
        <div className="buddy-idea-title-motion" key={`idea-title-${props.activeIdea.id}`}>
          <span className="eyebrow">当前创意</span>
          <h2>{props.activeIdea.title}</h2>
          <p>{props.activeIdea.description}</p>
        </div>
      </header>

      <div className="buddy-message-list" ref={messageListRef}>
        <div className="buddy-message-flow" key={`idea-messages-${props.activeIdea.id}`}>
          {props.messages.length === 0 && !props.isGenerating && (
            <section className="buddy-empty-guide" aria-label="AI 起步引导">
              <div className="buddy-empty-orb">
                <Sparkles size={26} />
              </div>
              <span className="eyebrow">AI 引导</span>
              <h3>可以先从一个创业想法聊起</h3>
              <p>
                当前创意还没有对话记录。你可以直接点击下面的问题，让 {props.selectedExpert.name}
                先帮你把课堂讨论内容整理成可继续推进的方向。
              </p>
              <div className="starter-prompt-grid">
                {starterPrompts.map((item) => (
                  <button key={item.label} type="button" onClick={() => handleStarterPrompt(item.prompt)}>
                    <strong>{item.label}</strong>
                    <span>{item.prompt}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {props.messages.map((message) => {
            const submitted = props.submissions.find((item) => item.sourceMessageId === message.id);
            const artifactType = isArtifactType(message.artifactType) ? message.artifactType : undefined;
            const messageExpert = message.sender === "ai" ? resolveMessageExpert(message, props.selectedExpert) : props.selectedExpert;
            const MessageExpertIcon = messageExpert.icon;
            return (
              <article className={`buddy-message ${message.sender === "user" ? "user-message" : "ai-message"}`} key={message.id}>
                <div className={`buddy-avatar ${message.sender === "ai" ? "ai" : ""}`}>
                  {message.sender === "ai" ? <MessageExpertIcon size={34} /> : <StudentCartoonAvatar avatarId={props.studentAvatarId} size={34} />}
                </div>
                <div className="buddy-bubble">
                  {message.sender === "user" ? (
                    <>
                      <span>
                        {message.mode || "文本"}输入 · {message.createdAt}
                      </span>
                      <p>{message.content}</p>
                    </>
                  ) : (
                    <>
                      <div className="buddy-ai-meta">
                        <strong>{message.expertName || messageExpert.name}</strong>
                        <em>{message.skillName || props.selectedSkill.name}</em>
                      </div>
                      {message.blocks ? (
                        <ResultPanel result={message.blocks} expertId={messageExpert.id} />
                      ) : (
                        <StructuredAiResponse content={message.content} />
                      )}
                      {artifactType && (
                        <div className="context-actions">
                          {isArtifactType(message.artifactType) && (
                            <button
                              className={submitted ? "is-success" : props.permissionAccess.can("提交老师审核") ? "" : "is-locked"}
                              type="button"
                              onClick={() => {
                                if (!props.permissionAccess.can("提交老师审核")) {
                                  props.permissionAccess.block("提交老师审核");
                                  return;
                                }
                                props.onSubmitMessage(message);
                              }}
                              disabled={Boolean(submitted)}
                            >
                              <Send size={15} />
                              {submitted
                                ? `${statusLabels[submitted.status]}`
                                : props.permissionAccess.can("提交老师审核")
                                  ? "提交老师审核"
                                  : "提交权限已停用"}
                            </button>
                          )}
                          {artifactType === "MEDIA" && (
                            <button
                              className={props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}
                              type="button"
                              onClick={() => {
                                if (!props.permissionAccess.can("AI 创意工作台")) {
                                  props.permissionAccess.block("AI 创意工作台");
                                  return;
                                }
                                props.onContextAction(message, "video");
                              }}
                            >
                              <Clapperboard size={15} />
                              预览/生成宣传视频
                            </button>
                          )}
                          {(artifactType === "BP" || artifactType === "PPT") && (
                            <button
                              className={props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}
                              type="button"
                              onClick={() => {
                                if (!props.permissionAccess.can("AI 创意工作台")) {
                                  props.permissionAccess.block("AI 创意工作台");
                                  return;
                                }
                                props.onContextAction(message, "script");
                              }}
                            >
                              <FileText size={15} />
                              生成路演稿
                            </button>
                          )}
                          {(artifactType === "BP" || artifactType === "PPT" || artifactType === "SCRIPT") && (
                            <button
                              className={props.permissionAccess.can("答辩模拟") ? "" : "is-locked"}
                              type="button"
                              onClick={() => {
                                if (!props.permissionAccess.can("答辩模拟")) {
                                  props.permissionAccess.block("答辩模拟");
                                  return;
                                }
                                props.onContextAction(message, "ask");
                              }}
                            >
                              <Mic size={15} />
                              进入答辩模拟
                            </button>
                          )}
                          <button type="button" onClick={() => props.onContextAction(message, "preview")}>
                            <MonitorPlay size={15} />
                            {artifactType === "PPT"
                              ? "预览 PPT"
                              : artifactType === "MEDIA"
                                ? "预览视频"
                                : `预览 ${isArtifactType(message.artifactType) ? getDownloadTitle(message) : "阶段记录"} Word`}
                          </button>
                          <button
                            className={props.permissionAccess.can("下载个人成果") ? "" : "is-locked"}
                            type="button"
                            onClick={() => {
                              if (!props.permissionAccess.can("下载个人成果")) {
                                props.permissionAccess.block("下载个人成果");
                                return;
                              }
                              props.onContextAction(message, "download");
                            }}
                          >
                            <Download size={15} />
                            {props.permissionAccess.can("下载个人成果")
                              ? artifactType === "PPT"
                                ? "下载 PPTX"
                                : artifactType === "MEDIA"
                                  ? "下载 MP4 视频"
                                  : "下载 Word"
                              : "下载权限已停用"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}

          {props.isGenerating && (
            <article className="buddy-message ai-message">
              <div className="buddy-avatar ai">
                <ExpertIcon size={34} />
              </div>
              <div className="buddy-bubble">
                <div className="buddy-ai-meta">
                  <strong>{props.selectedExpert.name}</strong>
                  <em>{props.selectedSkill.name}</em>
                </div>
                <section className="result-panel loading-card" aria-live="polite">
                  <div className="loader-orbit">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4>{loadingCopy.title}</h4>
                    <p>{loadingCopy.detail}</p>
                  </div>
                </section>
              </div>
            </article>
          )}
        </div>
      </div>

      <footer className="buddy-composer">
        <div className="buddy-current-expert">
          <span className="expert-icon" style={{ "--accent": props.selectedExpert.accent } as CSSProperties}>
            <ExpertIcon size={42} />
          </span>
          <div>
            <strong>{props.selectedExpert.name}</strong>
            <p>{props.selectedExpert.role}</p>
          </div>
        </div>
        <p className="expert-output-route">
          <strong>成果路线：</strong>
          {getStudentOutcomeFlow(props.selectedExpert.id)}
        </p>
        <textarea
          aria-label="和 AI 助教对话"
          value={props.prompt}
          disabled={!props.permissionAccess.can("AI 创意工作台")}
          onChange={(event) => handlePromptChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!props.isGenerating) handleSend();
            }
          }}
          placeholder="输入你的创业想法、课堂讨论内容，或上传录音让 AI 先整理..."
        />
        {speechInput.notice && (
          <p className={`voice-status ${speechInput.isListening ? "listening" : ""}`} aria-live="polite">
            {speechInput.notice}
          </p>
        )}
        <div className="buddy-composer-tools">
          <label>
            <span>专家</span>
            <PrettySelect
              value={props.selectedExpert.id}
              disabled={!props.permissionAccess.can("AI 创意工作台")}
              placement="top"
              ariaLabel="选择专家"
              options={props.experts.map((expert) => ({ value: expert.id, label: expert.name }))}
              onChange={(value) => {
                const expert = props.experts.find((item) => item.id === value);
                if (expert) props.onExpertSelect(expert);
              }}
            />
          </label>
          <label>
            <span>回答方式</span>
            <PrettySelect
              value={props.model}
              disabled={!props.permissionAccess.can("AI 创意工作台")}
              ariaLabel="选择回答方式"
              options={answerModes.map((mode) => ({ value: mode, label: answerModeLabels[mode] }))}
              onChange={(value) => props.onModelChange(value)}
            />
          </label>
          <label className="knowledge-select-control">
            <span>知识库</span>
            <button
              className={`knowledge-picker-trigger ${props.permissionAccess.can("调用课程知识库") ? "" : "is-locked"}`}
              type="button"
              aria-disabled={!props.permissionAccess.can("调用课程知识库")}
              onClick={() => {
                if (!props.permissionAccess.can("调用课程知识库")) {
                  props.permissionAccess.block("调用课程知识库");
                  return;
                }
                setIsKnowledgePickerOpen(true);
              }}
            >
              <BookOpen size={15} />
              <span className="knowledge-picker-text">
                {props.permissionAccess.can("调用课程知识库") ? knowledgePickerLabel : "知识库权限已停用"}
              </span>
            </button>
          </label>
          <div className="composer-utility-group" aria-label="输入工具">
            <input
              ref={studentUploadRef}
              className="visually-hidden-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.mp3,.m4a,.wav,.mp4,.mov,.webm"
              onChange={(event) => {
                handleStudentUpload(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <button
              className={props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}
              type="button"
              onClick={() => {
                if (!props.permissionAccess.can("AI 创意工作台")) {
                  props.permissionAccess.block("AI 创意工作台");
                  return;
                }
                studentUploadRef.current?.click();
              }}
            >
              <Upload size={17} />
              本地上传
            </button>
            <button
              className={`${speechInput.isListening ? "voice-active" : ""} ${props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}`.trim()}
              type="button"
              onClick={() => {
                if (!props.permissionAccess.can("AI 创意工作台")) {
                  props.permissionAccess.block("AI 创意工作台");
                  return;
                }
                speechInput.toggle();
              }}
            >
              <Mic size={17} />
              {speechInput.isListening ? "停止听写" : "语音输入"}
            </button>
          </div>
          <span className="composer-key-hint">Enter 发送 / Shift+Enter 换行</span>
          <div className="buddy-send-actions">
            <button
              className={`simulate-dialog-button ${props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}`}
              type="button"
              onClick={handleSimulateDialog}
              disabled={props.isGenerating}
            >
              <MessageSquareText size={17} />
              模拟对话
            </button>
            <button
              className={`buddy-send ${props.isGenerating ? "is-loading" : ""} ${props.permissionAccess.can("AI 创意工作台") ? "" : "is-locked"}`.trim()}
              type="button"
              onClick={handleSend}
              disabled={props.isGenerating}
            >
              <Sparkles size={18} />
              {props.isGenerating ? "生成中" : props.permissionAccess.can("AI 创意工作台") ? "发送" : "生成权限已停用"}
            </button>
          </div>
        </div>
      </footer>
      {isKnowledgePickerOpen && (
        <StudentKnowledgePickerModal
          catalog={studentVisibleKnowledgeCatalog}
          uploads={studentVisibleKnowledgeUploads}
          states={props.knowledgeBaseStates}
          expertName={props.selectedExpert.name}
          allowedCategories={allowedKnowledgeCategories}
          selection={props.selectedKnowledgeSelection}
          onCancel={() => setIsKnowledgePickerOpen(false)}
          onConfirm={(selection) => {
            props.onKnowledgeSelectionChange(selection);
            setIsKnowledgePickerOpen(false);
          }}
        />
      )}
    </section>
  );
}

function StudentKnowledgePickerModal(props: {
  catalog: KnowledgeBaseCatalogItem[];
  uploads: KnowledgeUpload[];
  states: KnowledgeBaseStates;
  expertName: string;
  allowedCategories: KnowledgeCategory[];
  selection: StudentKnowledgeSelection;
  onCancel: () => void;
  onConfirm: (selection: StudentKnowledgeSelection) => void;
}) {
  const catalog = props.catalog;
  const allowedCategorySet = new Set(props.allowedCategories);
  const firstCategory = catalog.find((item) => props.states[item.category] !== false)?.category || catalog[0]?.category || "";
  function cleanSelection(selection: StudentKnowledgeSelection) {
    const normalized = normalizeStudentKnowledgeSelection(selection);
    const categories = normalized.categories.filter(
      (category) => allowedCategorySet.has(category) && props.states[category] !== false,
    );
    const categorySet = new Set(categories);
    return {
      categories,
      uploadIds: normalized.uploadIds.filter((id) => {
        const asset = props.uploads.find((item) => item.id === id);
        if (!asset) return false;
        const category = asset.category || inferKnowledgeCategory(asset.name);
        return (
          allowedCategorySet.has(category) &&
          props.states[category] !== false &&
          asset.enabled !== false &&
          !categorySet.has(category)
        );
      }),
    };
  }

  const [draftSelection, setDraftSelection] = useState<StudentKnowledgeSelection>(() => cleanSelection(props.selection));
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory>(firstCategory);
  const [search, setSearch] = useState("");
  const activeCatalogItem = catalog.find((item) => item.category === activeCategory) || catalog[0];
  const searchText = search.trim().toLowerCase();
  const activeCategoryWholeSelected = draftSelection.categories.includes(activeCategory);
  const categoryUploads = props.uploads
    .filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === activeCategory)
    .filter((asset) => {
      if (!searchText) return true;
      return [asset.name, asset.fileType, asset.preview, asset.uploadedBy, asset.sizeLabel].join(" ").toLowerCase().includes(searchText);
    });
  const enabledCategoryUploads = categoryUploads.filter((asset) => asset.enabled !== false && props.states[activeCategory] !== false);
  const selectedUploadSet = new Set(draftSelection.uploadIds);
  const selectedCategorySet = new Set(draftSelection.categories.filter((category) => props.states[category] !== false));
  const selectedUploads = props.uploads.filter((asset) => {
    const category = asset.category || inferKnowledgeCategory(asset.name);
    return (
      selectedUploadSet.has(asset.id) &&
      asset.enabled !== false &&
      props.states[category] !== false &&
      !selectedCategorySet.has(category)
    );
  });
  const selectedCategoryUploadCount = draftSelection.categories.reduce((count, category) => {
    if (props.states[category] === false) return count;
    return count + props.uploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === category && asset.enabled !== false).length;
  }, 0);

  function toggleCategory(category: KnowledgeCategory) {
    if (props.states[category] === false) return;
    setDraftSelection((current) => {
      const selected = current.categories.includes(category);
      const categoryUploadIds = props.uploads
        .filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === category)
        .map((asset) => asset.id);
      return {
        categories: selected ? current.categories.filter((item) => item !== category) : [...current.categories, category],
        uploadIds: selected ? current.uploadIds : current.uploadIds.filter((id) => !categoryUploadIds.includes(id)),
      };
    });
  }

  function toggleUpload(uploadId: string) {
    const asset = props.uploads.find((item) => item.id === uploadId);
    if (!asset) return;
    const category = asset.category || inferKnowledgeCategory(asset.name);
    if (asset.enabled === false || props.states[category] === false) return;
    setDraftSelection((current) => {
      const selected = current.uploadIds.includes(uploadId);
      return {
        categories: current.categories.filter((item) => item !== category),
        uploadIds: selected ? current.uploadIds.filter((item) => item !== uploadId) : [...current.uploadIds, uploadId],
      };
    });
  }

  function removeCategory(category: KnowledgeCategory) {
    setDraftSelection((current) => ({
      categories: current.categories.filter((item) => item !== category),
      uploadIds: current.uploadIds,
    }));
  }

  function removeUpload(uploadId: string) {
    setDraftSelection((current) => ({
      categories: current.categories,
      uploadIds: current.uploadIds.filter((item) => item !== uploadId),
    }));
  }

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal student-knowledge-modal" role="dialog" aria-modal="true" aria-label="选择知识库资料">
        <header>
          <div>
            <span className="eyebrow">课程知识库</span>
            <h3>选择本轮对话参考资料</h3>
            <p>
              当前专家：{props.expertName}。这里只显示教师端/管理端为该专家开放的知识库目录和已启用资料。
            </p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭知识库选择" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>

        <div className="student-knowledge-picker-body">
          <section className="student-knowledge-column directory-column">
            <div className="student-knowledge-column-head">
              <strong>知识库目录</strong>
              <span>{draftSelection.categories.length} 个目录</span>
            </div>
            <div className="student-knowledge-list">
              {catalog.length === 0 && (
                <div className="student-knowledge-empty">当前专家暂无已开放知识库，请教师端或管理端先配置专家可调用目录。</div>
              )}
              {catalog.map((item) => {
                const enabled = props.states[item.category] !== false;
                const fileCount = props.uploads.filter(
                  (asset) => (asset.category || inferKnowledgeCategory(asset.name)) === item.category && asset.enabled !== false,
                ).length;
                const selected = draftSelection.categories.includes(item.category);
                return (
                  <div
                    className={`student-knowledge-row directory-row ${activeCategory === item.category ? "active" : ""} ${selected ? "selected" : ""} ${enabled ? "" : "disabled"}`}
                    key={item.category}
                    role="button"
                    tabIndex={enabled ? 0 : -1}
                    aria-disabled={!enabled}
                    onClick={() => {
                      if (enabled) setActiveCategory(item.category);
                    }}
                    onKeyDown={(event) => {
                      if (!enabled) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveCategory(item.category);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!enabled}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleCategory(item.category)}
                    />
                    <span>
                      <strong>{item.category}</strong>
                      <em>{enabled ? `${fileCount} 份可用资料` : "已停用"}</em>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="student-knowledge-column material-column">
            <div className="student-knowledge-column-head">
              <strong>{activeCatalogItem?.category || "资料列表"}</strong>
              <span>{enabledCategoryUploads.length} 份可用</span>
            </div>
            <label className="student-knowledge-search">
              <Filter size={15} />
              <input value={search} placeholder="搜索资料名称、摘要或上传人" onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className="student-knowledge-list material-list">
              {categoryUploads.length === 0 ? (
                <div className="student-knowledge-empty">当前目录暂无匹配资料，可以直接选择整个目录使用课程默认模板。</div>
              ) : (
                categoryUploads.map((asset) => {
                  const category = asset.category || inferKnowledgeCategory(asset.name);
                  const enabled = asset.enabled !== false && props.states[category] !== false;
                  const selected = !activeCategoryWholeSelected && draftSelection.uploadIds.includes(asset.id);
                  return (
                    <div
                      className={`student-knowledge-row material-row ${selected ? "selected" : ""} ${activeCategoryWholeSelected ? "covered" : ""} ${enabled ? "" : "disabled"}`}
                      key={asset.id}
                      role="group"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!enabled || activeCategoryWholeSelected}
                        onChange={() => toggleUpload(asset.id)}
                      />
                      <span>
                        <strong>{asset.name}</strong>
                        <em>
                          {asset.fileType} · {asset.sizeLabel} · {asset.uploadedBy || "教师上传"} ·{" "}
                          {activeCategoryWholeSelected ? "已包含在整库中" : enabled ? "可调用" : "已停用"}
                        </em>
                        <small>{asset.preview}</small>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="student-knowledge-column summary-column">
            <div className="student-knowledge-column-head">
              <strong>已选内容</strong>
              <span>{draftSelection.categories.length} 个目录 / {selectedUploads.length} 份材料</span>
            </div>
            <div className="student-knowledge-summary">
              {draftSelection.categories.length === 0 && selectedUploads.length === 0 ? (
                <div className="student-knowledge-empty">还没有选择知识库。本轮发送后会使用系统默认课程资料。</div>
              ) : (
                <>
                  {draftSelection.categories.map((category) => (
                    <article className="selected-source-card" key={category}>
                      <div>
                        <strong>{category}知识库</strong>
                        <span>整库调用 · {props.states[category] === false ? "已停用" : "可用"}</span>
                      </div>
                      <button type="button" aria-label={`移除${category}知识库`} onClick={() => removeCategory(category)}>
                        <X size={15} />
                      </button>
                    </article>
                  ))}
                  {selectedUploads.map((asset) => (
                    <article className="selected-source-card" key={asset.id}>
                      <div>
                        <strong>{asset.name}</strong>
                        <span>{asset.category || inferKnowledgeCategory(asset.name)} · 单份材料</span>
                      </div>
                      <button type="button" aria-label={`移除${asset.name}`} onClick={() => removeUpload(asset.id)}>
                        <X size={15} />
                      </button>
                    </article>
                  ))}
                </>
              )}
            </div>
            <div className="student-knowledge-selection-note">
              <BookOpen size={16} />
              <span>整库选择会覆盖该目录下全部可用资料；当前预计引用 {selectedCategoryUploadCount + selectedUploads.length} 份材料。</span>
            </div>
          </section>
        </div>

        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => props.onConfirm(cleanSelection(draftSelection))}
          >
            确认选择
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function ResultPanel(props: { result: ResultBlock[]; expertId: ExpertId }) {
  return (
    <section className="result-panel">
      {props.expertId === "pitch" && (
        <div className="slide-preview-grid">
          {parsePptSlideOutline().map((slide, index) => (
            <article className="slide-thumb" key={slide[0]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{slide[0]}</strong>
              <p>{slide[1]}</p>
              <small>{slide[2]}</small>
            </article>
          ))}
        </div>
      )}
      <div className="result-blocks">
        {props.result.map((block) => (
          <article className="result-block" key={block.title}>
            <h4>{block.title}</h4>
            {block.items.length === 1 && (block.items[0].length > 220 || /\n|#{1,6}\s|【正式回复】/.test(block.items[0])) ? (
              <StructuredAiResponse content={block.items[0]} compact />
            ) : (
              <ul>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function IdeaDeleteConfirmModal(props: { idea: Idea; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-idea-title">
        <header>
          <div>
            <span className="eyebrow">删除创意</span>
            <h3 id="delete-idea-title">确认删除《{props.idea.title}》？</h3>
            <p>删除后，该创意会从左侧创意空间中移除，平台不会继续展示这条创意的对话入口。</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.idea.title}</strong>
          <p>{props.idea.description}</p>
          <span>{props.idea.stage}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认删除
          </button>
        </footer>
      </section>
    </div>
  );
}

function IdeaRenameModal(props: { idea: Idea; onCancel: () => void; onConfirm: (title: string) => void }) {
  const [title, setTitle] = useState(props.idea.title);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canSubmit = title.trim().length > 0;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") props.onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [props]);

  function submitRename() {
    if (!canSubmit) return;
    props.onConfirm(title.trim());
  }

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation" onMouseDown={props.onCancel}>
      <section
        className="media-modal rename-idea-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-idea-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">创意空间</span>
            <h3 id="rename-idea-title">重命名当前创意</h3>
            <p>名称会同步显示在左侧创意列表和当前对话标题里。</p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭重命名" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <label className="rename-idea-form">
          <span>创意名称</span>
          <input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitRename();
            }}
          />
        </label>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="primary-button" type="button" disabled={!canSubmit} onClick={submitRename}>
            保存名称
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function KnowledgeBaseDeleteConfirmModal(props: {
  item: KnowledgeBaseCatalogItem;
  relatedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal knowledge-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-knowledge-title">
        <header>
          <div>
            <span className="eyebrow">删除知识库目录</span>
            <h3 id="delete-knowledge-title">确认删除“{props.item.category}知识库”？</h3>
            <p>删除后，该目录会从教师端、管理端、学生端下拉选择和专家提示词引用范围中同步移除。</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.item.category}知识库</strong>
          <p>{props.item.description}</p>
          <span>{props.relatedCount} 份资料将同步移除 · 适用模块：{props.item.usedBy}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认删除
          </button>
        </footer>
      </section>
    </div>
  );
}

function ExpertDeleteConfirmModal(props: { expert: Expert; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal knowledge-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-expert-title">
        <header>
          <div>
            <span className="eyebrow">删除专家</span>
            <h3 id="delete-expert-title">确认删除“{props.expert.name}”？</h3>
            <p>删除后，该专家会从教师端、管理端和学生端专家列表中同步移除。</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.expert.name}</strong>
          <p>{props.expert.role}</p>
          <span>适用场景：{props.expert.scenario}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认删除
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function KnowledgeBaseDetailModal(props: {
  item: KnowledgeBaseCatalogItem;
  uploads: KnowledgeUpload[];
  enabled: boolean;
  actorLabel: string;
  onClose: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const relatedUploads = props.uploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === props.item.category);
  const enabledUploads = relatedUploads.filter((asset) => asset.enabled !== false);
  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <section className="media-modal knowledge-detail-modal knowledge-base-detail-modal" role="dialog" aria-modal="true" aria-label="知识库详情">
        <header>
          <div>
            <span className="eyebrow">知识库详情</span>
            <h3>{props.item.category}知识库</h3>
            <p>{props.item.description}</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="review-detail-body">
          <section className="detail-card review-summary-card">
            <dl>
              <div>
                <dt>目录状态</dt>
                <dd>{props.enabled ? "已开放" : "已停用"}</dd>
              </div>
              <div>
                <dt>资料数量</dt>
                <dd>{relatedUploads.length} 份</dd>
              </div>
              <div>
                <dt>已启用资料</dt>
                <dd>{enabledUploads.length} 份</dd>
              </div>
              <div>
                <dt>适用模块</dt>
                <dd>{props.item.usedBy}</dd>
              </div>
              <div>
                <dt>维护端</dt>
                <dd>{props.actorLabel}</dd>
              </div>
              <div>
                <dt>同步范围</dt>
                <dd>学生端 / 教师端 / 管理端</dd>
              </div>
            </dl>
          </section>
          <section className="detail-card knowledge-base-related-card">
            <span className="eyebrow">目录资料</span>
            {relatedUploads.length === 0 ? (
              <p>当前目录还没有上传资料，可先选择该目录后上传文件。</p>
            ) : (
              <div className="knowledge-base-related-list">
                {relatedUploads.slice(0, 6).map((asset) => (
                  <article key={asset.id}>
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.fileType} · {asset.sizeLabel} · {asset.enabled === false ? "未启用" : "已启用"}
                    </span>
                  </article>
                ))}
              </div>
            )}
            <div className="teacher-file-actions">
              <button type="button" onClick={props.onToggle}>
                {props.enabled ? "停用知识库" : "启用知识库"}
              </button>
              <button className="danger" type="button" onClick={props.onDelete}>
                删除知识库
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function KnowledgeAssetActionConfirmModal(props: {
  asset: KnowledgeUpload;
  action: PendingKnowledgeAssetAction["action"];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = props.action === "delete";
  const isEnabled = props.asset.enabled !== false;
  const actionLabel = isDelete ? "删除资料" : isEnabled ? "停用资料" : "启用资料";
  const nextStatus = isDelete ? "从资料列表中移除" : isEnabled ? "学生端和专家提示词将暂不引用该资料" : "学生端和专家提示词可重新引用该资料";
  const confirmLabel = isDelete ? "确认删除" : isEnabled ? "确认停用" : "确认启用";
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal knowledge-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-asset-action-title">
        <header>
          <div>
            <span className="eyebrow">{actionLabel}</span>
            <h3 id="knowledge-asset-action-title">确认{actionLabel}“{props.asset.name}”？</h3>
            <p>{nextStatus}。该操作会同步影响教师端、管理端和学生端知识库调用状态。</p>
          </div>
          <button type="button" aria-label="关闭确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.asset.name}</strong>
          <p>{props.asset.preview}</p>
          <span>
            {props.asset.category || inferKnowledgeCategory(props.asset.name)}知识库 · {props.asset.fileType} · {props.asset.sizeLabel}
          </span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

function WordPreviewModal(props: { preview: WordPreview; onClose: () => void }) {
  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal word-modal" role="dialog" aria-modal="true" aria-label="预览 Word 文档">
        <header>
          <div>
            <span className="eyebrow">Word 成果预览</span>
            <h3>{props.preview.title}</h3>
            <p>这里展示将要下载为 Word 的阶段成果内容，可继续结合课程模板和教师批注完善。</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="word-preview-page">
          <h1>{props.preview.title}</h1>
          <p className="word-meta">上海财经大学商学院 AI 赋能创业实践教学示范平台｜阶段成果自动生成稿</p>
          {props.preview.blocks.map((block) => (
            <section key={block.title}>
              <h2>{block.title}</h2>
              <ul>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="context-actions">
          <button type="button" onClick={() => downloadWord(`${props.preview.title}.doc`, props.preview.title, props.preview.blocks)}>
            <Download size={15} />
            下载 Word
          </button>
        </footer>
      </section>
    </div>
  );
}

function GenerationPendingModal(props: { pending: PendingAssetGeneration }) {
  const [progress, setProgress] = useState(4);
  const isWaitingForResult = progress >= 91.5;

  useEffect(() => {
    const startedAt = performance.now();
    const duration = Math.max(1, props.pending.seconds) * 1000;
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextProgress = Math.min(92, 4 + (elapsed / duration) * 88);
      setProgress(nextProgress);
    }, 120);

    return () => window.clearInterval(timer);
  }, [props.pending.seconds, props.pending.title]);

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal pending-modal" role="dialog" aria-modal="true" aria-label="正在生成">
        <div className="pending-generation">
          <div className="loader-orbit">
            <Sparkles size={26} />
          </div>
          <span className="eyebrow">正在生成</span>
          <h3>{props.pending.title}</h3>
          <p>{props.pending.detail}</p>
          <div className="pending-progress" aria-hidden="true">
            <strong style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <small>{isWaitingForResult ? "生成结果还在返回，完成后会自动打开预览。" : `预计等待 ${props.pending.seconds} 秒左右，进度会按实际生成时间推进。`}</small>
        </div>
      </section>
    </div>
  );
}

function VideoPreviewModal(props: { asset: GeneratedAsset; onClose: () => void }) {
  const hasGeneratedVideo = Boolean(props.asset.videoUrl);

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal video-only-modal" role="dialog" aria-modal="true" aria-label="预览宣传视频">
        <header>
          <div>
            <span className="eyebrow">宣传视频预览</span>
            <h3>{props.asset.title}</h3>
            <p>教师端可直接查看学生生成的视频成果，并下载 MP4 或对应的视频物料包。</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="video-only-body">
          {props.asset.videoUrl ? (
            <video className="video-player" controls preload="metadata" src={props.asset.videoUrl}>
              <track kind="captions" />
            </video>
          ) : (
            <div className="video-preview pending-video">
              <Clapperboard size={26} />
              <strong>MP4 尚未生成</strong>
              <p>当前只保存了脚本、分镜和视觉提示词，没有使用样例视频冒充生成结果。</p>
            </div>
          )}
          <div className="video-asset-summary">
            <strong>视频生成说明</strong>
            <p>{hasGeneratedVideo ? "已显示 WorkBuddy 生成的视频成果。" : props.asset.prompt || "视频生成提示词尚未填写。"}</p>
            <span>生成时间：{props.asset.createdAt}</span>
          </div>
        </div>
        <footer className="context-actions">
          <button type="button" onClick={() => downloadMediaPackage(props.asset)}>
            <Download size={15} />
            下载视频物料包
          </button>
          <button type="button" disabled={!props.asset.videoUrl} onClick={() => downloadVideoAsset(props.asset)}>
            <MonitorPlay size={15} />
            {props.asset.videoUrl ? "下载 MP4 视频" : "MP4 尚未生成"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function MediaGenerationModal(props: {
  asset: GeneratedAsset;
  isCached: boolean;
  onAssetChange: (asset: GeneratedAsset) => void;
  onClose: () => void;
  onConfirm: (asset: GeneratedAsset) => void;
}) {
  const hasActiveVideoJob = props.asset.videoGenerationStatus === "QUEUED"
    || props.asset.videoGenerationStatus === "RUNNING";
  const [showPreview, setShowPreview] = useState(Boolean(props.asset.videoUrl) && !hasActiveVideoJob);
  const [isRendering, setIsRendering] = useState(false);
  const [workBuddyRunId, setWorkBuddyRunId] = useState(props.asset.videoGenerationJobId || "");
  const [workBuddyError, setWorkBuddyError] = useState("");
  const [workBuddyStatus, setWorkBuddyStatus] = useState<"idle" | "checking" | "connected" | "offline">("idle");
  const [workBuddyStatusMessage, setWorkBuddyStatusMessage] = useState("点击生成视频时才会连接 WorkBuddy。");
  const [generatedVideoVersion, setGeneratedVideoVersion] = useState(() => Date.now());
  const [hasGeneratedWorkBuddyVideo, setHasGeneratedWorkBuddyVideo] = useState(
    Boolean(props.asset.videoUrl) && !hasActiveVideoJob,
  );
  const [videoCheckMessage, setVideoCheckMessage] = useState("");
  const [videoRenderProgress, setVideoRenderProgress] = useState(4);
  const [awaitingCostConfirmation, setAwaitingCostConfirmation] = useState(false);

  const modalEyebrow = hasGeneratedWorkBuddyVideo && showPreview ? "视频已生成" : workBuddyRunId ? "正在渲染视频" : isRendering ? "正在提交任务" : "先确认生成提示词";
  const modalDescription =
    hasGeneratedWorkBuddyVideo && showPreview
      ? "已生成的视频会保留在当前成果中，点击重新生成才会覆盖。"
      : workBuddyRunId
        ? "视频正在由本机 WorkBuddy / CodeBuddy 渲染，完成后会自动显示预览。"
        : isRendering
          ? "正在把脚本、分镜和视觉提示词提交到本机 WorkBuddy / CodeBuddy。"
          : "请先检查模型提示词、脚本、分镜和海报 Prompt，确认后再提交视频生成任务。";
  const hasRenderTimedOut = videoCheckMessage.startsWith("暂未找到");
  const isWaitingForGeneratedVideo = Boolean(workBuddyRunId && !showPreview && !hasRenderTimedOut);
  const shouldShowRenderingState = isRendering || Boolean(workBuddyRunId && !showPreview);
  const isVideoWaitingForResult = videoRenderProgress >= 91.5 && !hasRenderTimedOut;
  const videoPreviewUrl = hasGeneratedWorkBuddyVideo && props.asset.videoUrl
    ? `${props.asset.videoUrl}?v=${generatedVideoVersion}`
    : undefined;
  const { asset: activeMediaAsset, onAssetChange, onConfirm } = props;

  const markWorkBuddyVideoReady = useCallback((jobId: string, artifactUrl?: string | null, revision?: number) => {
    const nextAsset = {
      ...activeMediaAsset,
      videoUrl: artifactUrl || getGenerationJobArtifactUrl(jobId),
      videoGeneratedAt: nowTime(),
      videoGenerationJobId: jobId,
      videoGenerationRevision: revision ?? activeMediaAsset.videoGenerationRevision,
      videoGenerationStatus: "SUCCEEDED" as GenerationJobStatus,
    };
    onAssetChange(nextAsset);
    onConfirm(nextAsset);
  }, [activeMediaAsset, onAssetChange, onConfirm]);

  useEffect(() => {
    if (!workBuddyRunId || showPreview) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      checkGeneratedWorkBuddyVideo(workBuddyRunId)
        .then((job) => {
          if (job.status === "SUCCEEDED" && job.artifactUrl) {
            setGeneratedVideoVersion(Date.now());
            setHasGeneratedWorkBuddyVideo(true);
            setShowPreview(true);
            setVideoCheckMessage("视频已生成，可以预览。");
            markWorkBuddyVideoReady(workBuddyRunId, job.artifactUrl);
            window.clearInterval(timer);
          } else if (job.status === "FAILED" || job.status === "CANCELED") {
            setVideoCheckMessage(job.status === "FAILED" ? "视频生成失败，请检查任务后再重新生成。" : "视频生成已取消。");
            setWorkBuddyStatus("offline");
            window.clearInterval(timer);
          } else if (attempts >= 60) {
            setVideoCheckMessage("暂未找到 MP4 文件。WorkBuddy 可能仍在处理，或任务没有完成渲染。");
            setVideoRenderProgress(92);
            window.clearInterval(timer);
          }
        })
        .catch(() => {
          if (attempts >= 60) {
            setVideoCheckMessage("暂未找到 MP4 文件。WorkBuddy 可能仍在处理，或任务没有完成渲染。");
            setVideoRenderProgress(92);
            window.clearInterval(timer);
          }
        });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [markWorkBuddyVideoReady, showPreview, workBuddyRunId]);

  useEffect(() => {
    if (!shouldShowRenderingState || hasRenderTimedOut) return;

    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextProgress = Math.min(92, 4 + (elapsed / 90000) * 88);
      setVideoRenderProgress(nextProgress);
    }, 160);

    return () => window.clearInterval(timer);
  }, [hasRenderTimedOut, shouldShowRenderingState]);

  function updateField(field: keyof GeneratedAsset, value: string) {
    props.onAssetChange({ ...props.asset, [field]: value });
  }

  async function handleConfirmPrompt() {
    if (isRendering) return;
    const revision = nextVideoGenerationRevision(props.asset.videoGenerationRevision);
    const regeneratingAsset = { ...props.asset, videoGenerationRevision: revision };
    setAwaitingCostConfirmation(false);
    setShowPreview(false);
    setHasGeneratedWorkBuddyVideo(false);
    setIsRendering(true);
    setWorkBuddyRunId("");
    setWorkBuddyError("");
    setWorkBuddyStatus("checking");
    setWorkBuddyStatusMessage("正在连接平台 Java 网关；默认不会直连 WorkBuddy。");
    setGeneratedVideoVersion(0);
    setVideoCheckMessage("");
    try {
      await checkWorkBuddyConnection();
      setWorkBuddyStatus("connected");
      setWorkBuddyStatusMessage("已连接平台 Java 网关，正在检查 WorkBuddy 网关是否启用。");
      const job = await submitWorkBuddyVideoRun(regeneratingAsset, revision);
      const acceptedAsset = {
        ...regeneratingAsset,
        videoGenerationJobId: job.id,
        videoGenerationStatus: job.status,
      };
      props.onAssetChange(acceptedAsset);
      props.onConfirm(acceptedAsset);
      setWorkBuddyRunId(job.id);
      setVideoRenderProgress(4);
      if (job.status === "SUCCEEDED" && job.artifactUrl) {
        setGeneratedVideoVersion(Date.now());
        setHasGeneratedWorkBuddyVideo(true);
        setShowPreview(true);
        markWorkBuddyVideoReady(job.id, job.artifactUrl, revision);
        return;
      }
      setVideoCheckMessage("已提交生成任务，正在检查独立任务目录中的 MP4 结果。");
    } catch (error) {
      setWorkBuddyStatus("offline");
      setWorkBuddyStatusMessage("WorkBuddy 网关未启用或提交失败，未发起供应商消耗。");
      setWorkBuddyError(error instanceof Error ? error.message : "WorkBuddy 提交失败。");
    } finally {
      setIsRendering(false);
    }
  }

  async function handleCheckGeneratedVideo() {
    if (!workBuddyRunId) return;
    const job = await checkGeneratedWorkBuddyVideo(workBuddyRunId);
    if (job.status === "SUCCEEDED" && job.artifactUrl) {
      setGeneratedVideoVersion(Date.now());
      setHasGeneratedWorkBuddyVideo(true);
      setShowPreview(true);
      setVideoCheckMessage("视频已生成，可以预览。");
      markWorkBuddyVideoReady(workBuddyRunId, job.artifactUrl);
      return;
    }
    setShowPreview(false);
    setVideoCheckMessage("暂未找到 MP4 文件。WorkBuddy 可能仍在处理，或任务没有完成渲染。");
  }

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal" role="dialog" aria-modal="true" aria-label="生成宣传视频">
        <header>
          <div>
            <span className="eyebrow">{modalEyebrow}</span>
            <h3>{props.asset.title}</h3>
            <p>{modalDescription}</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="media-modal-body prompt-only">
          <div className={`workbuddy-status workbuddy-status-${workBuddyStatus}`}>
            <span aria-hidden="true" />
            <div>
              <strong>
                WorkBuddy：
                {workBuddyStatus === "connected" ? "已连接" : workBuddyStatus === "checking" ? "连接中" : workBuddyStatus === "offline" ? "未连接" : "待生成时连接"}
              </strong>
              <p>{workBuddyStatusMessage}</p>
            </div>
          </div>
          {shouldShowRenderingState && (
            <div className="video-preview pending-video">
              <div className="loader-orbit">
                <Clapperboard size={26} />
              </div>
              <strong>{isRendering ? "正在提交生成任务" : hasRenderTimedOut ? "视频暂未生成完成" : "正在渲染视频中"}</strong>
              <p>
                {isRendering
                  ? "正在把视频脚本和分镜提交给 WorkBuddy。"
                  : videoCheckMessage || "WorkBuddy 正在渲染 MP4，完成后会自动显示预览。"}
              </p>
              <div className="pending-progress" aria-hidden="true">
                <strong style={{ transform: `scaleX(${videoRenderProgress / 100})` }} />
              </div>
              <small>
                {hasRenderTimedOut
                  ? "没有检测到 MP4，可以稍后点击检查并显示视频。"
                  : isVideoWaitingForResult
                    ? "WorkBuddy 还在返回结果，完成后会自动显示视频。"
                    : "进度会跟随渲染等待推进，不会提前跑满。"}
              </small>
            </div>
          )}
          {workBuddyError && <p className="asset-hint workbuddy-error">{workBuddyError}</p>}
          {awaitingCostConfirmation && (
            <div className="workbuddy-cost-confirmation" role="alert">
              <div>
                <strong>{props.asset.videoUrl ? "确认重新生成视频" : "确认生成视频"}</strong>
                <p>确认后才会创建一个 WorkBuddy 付费任务。同一任务刷新或重试不会重复创建；完成后不会继续调用。</p>
              </div>
              <div>
                <button type="button" onClick={() => setAwaitingCostConfirmation(false)}>取消</button>
                <button type="button" onClick={handleConfirmPrompt}>确认并生成</button>
              </div>
            </div>
          )}
          {showPreview && videoPreviewUrl && (
            <div className="video-preview">
              <video
                className="video-player"
                controls
                preload="metadata"
                src={videoPreviewUrl}
              >
                <track kind="captions" />
              </video>
              <p className="asset-hint">
                已显示 WorkBuddy 生成的 MP4。
              </p>
            </div>
          )}
          <div className="media-form">
            <label>
              模型/风格提示词
              <textarea value={props.asset.prompt || ""} onChange={(event) => updateField("prompt", event.target.value)} />
            </label>
            <label>
              30 秒宣传视频脚本
              <textarea value={props.asset.script || ""} onChange={(event) => updateField("script", event.target.value)} />
            </label>
            <label>
              视频分镜表
              <textarea value={props.asset.storyboard || ""} onChange={(event) => updateField("storyboard", event.target.value)} />
            </label>
            <label>
              海报文案 Prompt
              <textarea value={props.asset.posterPrompt || ""} onChange={(event) => updateField("posterPrompt", event.target.value)} />
            </label>
            <label>
              产品视觉图 Prompt
              <textarea value={props.asset.visualPrompt || ""} onChange={(event) => updateField("visualPrompt", event.target.value)} />
            </label>
          </div>
        </div>
        <footer className="context-actions">
          <button
            type="button"
            onClick={() => setAwaitingCostConfirmation(true)}
            disabled={isRendering || isWaitingForGeneratedVideo || awaitingCostConfirmation}
          >
            <Clapperboard size={15} />
            {isRendering
              ? "正在提交任务"
              : isWaitingForGeneratedVideo
                ? "正在渲染视频"
                : hasGeneratedWorkBuddyVideo
                  ? "重新生成视频"
                  : "提交 WorkBuddy 生成视频"}
          </button>
          {workBuddyRunId && !showPreview && hasRenderTimedOut && (
            <button type="button" onClick={handleCheckGeneratedVideo}>
              <MonitorPlay size={15} />
              检查并显示视频
            </button>
          )}
          {showPreview && (
            <>
              <button type="button" onClick={() => downloadMediaPackage(props.asset)}>
                <Download size={15} />
                下载视频物料包
              </button>
              {showPreview && (
                <button type="button" onClick={() => downloadVideoAsset(props.asset)}>
                  <MonitorPlay size={15} />
                  下载 MP4 视频
                </button>
              )}
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

function FeedbackView(props: {
  activeIdea: Idea;
  submissions: Submission[];
  generatedAssets: GeneratedAsset[];
  onBackToWorkspace: () => void;
  onContinue: (submission: Submission) => void;
  onWithdraw: (submissionId: string) => void;
  onDeleteWithdrawn: (submissionId: string) => void;
  studentAvatarId: StudentAvatarId;
  permissionAccess: PermissionAccess;
}) {
  const emptySearch: StudentFeedbackSearch = { keyword: "", artifactType: "ALL", status: "ALL" };
  const [searchDraft, setSearchDraft] = useState<StudentFeedbackSearch>(emptySearch);
  const [search, setSearch] = useState<StudentFeedbackSearch>(emptySearch);
  const [pendingWithdraw, setPendingWithdraw] = useState<Submission | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Submission | null>(null);
  const [detailSubmission, setDetailSubmission] = useState<Submission | null>(null);
  const filteredSubmissions = props.submissions.filter((submission) => {
    const keyword = search.keyword.trim().toLowerCase();
    const matchesKeyword =
      !keyword ||
      [
        submission.artifactTitle,
        submission.artifactSummary,
        submission.teacherComment,
        artifactLabels[submission.artifactType],
        statusLabels[submission.status],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    return (
      matchesKeyword &&
      (search.artifactType === "ALL" || submission.artifactType === search.artifactType) &&
      (search.status === "ALL" || submission.status === search.status)
    );
  });

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchDraft);
  }

  function resetSearch() {
    setSearchDraft(emptySearch);
    setSearch(emptySearch);
  }

  return (
    <section className="workspace-panel feedback-page">
      <div className="panel-title">
        <div>
          <span className="eyebrow">学生端</span>
          <h3>老师反馈</h3>
          <p>当前创意：{props.activeIdea.title}。这里仅展示该创意提交给老师审核的阶段成果；切换左侧创意可查看对应反馈。</p>
        </div>
        <button className="ghost-button feedback-back-button" type="button" onClick={props.onBackToWorkspace} disabled={!props.permissionAccess.can("AI 创意工作台")}>
          <MessageSquareText size={16} />
          回到 AI 创意工作台
        </button>
      </div>
      <form className="feedback-search" onSubmit={applySearch}>
        <label className="feedback-search-keyword">
          <span>成果名称 / 老师意见 / 关键词</span>
          <input
            type="search"
            placeholder="输入成果名称、反馈意见或关键词"
            value={searchDraft.keyword}
            onChange={(event) => setSearchDraft((current) => ({ ...current, keyword: event.target.value }))}
          />
        </label>
        <label>
          <span>成果类型</span>
          <PrettySelect
            value={searchDraft.artifactType}
            ariaLabel="筛选成果类型"
            options={[
              { value: "ALL" as ArtifactType | "ALL", label: "全部成果类型" },
              ...(Object.keys(artifactLabels) as ArtifactType[]).map((type) => ({ value: type, label: artifactLabels[type] })),
            ]}
            onChange={(value) => setSearchDraft((current) => ({ ...current, artifactType: value }))}
          />
        </label>
        <label>
          <span>审核状态</span>
          <PrettySelect
            value={searchDraft.status}
            ariaLabel="筛选审核状态"
            options={[
              { value: "ALL" as SubmissionStatus | "ALL", label: "全部状态" },
              ...(Object.keys(statusLabels) as SubmissionStatus[]).map((status) => ({ value: status, label: statusLabels[status] })),
            ]}
            onChange={(value) => setSearchDraft((current) => ({ ...current, status: value }))}
          />
        </label>
        <div className="feedback-search-actions">
          <button className="primary-button feedback-query-button" type="submit">
            <Filter size={15} />
            查询
          </button>
          <button className="ghost-button feedback-reset-button" type="button" onClick={resetSearch}>
            <RotateCcw size={15} />
            重置
          </button>
        </div>
      </form>
      <div className="submission-grid">
        {props.submissions.length === 0 && (
          <article className="empty-state">
            <ClipboardCheck size={26} />
            <strong>还没有提交给老师的成果</strong>
            <p>在 AI 生成结果下点击“提交老师审核”，这里会同步显示状态和老师意见。</p>
          </article>
        )}
        {props.submissions.length > 0 && filteredSubmissions.length === 0 && (
          <article className="empty-state">
            <ClipboardCheck size={26} />
            <strong>暂无匹配成果</strong>
            <p>可以调整成果类型、审核状态或关键词后重新查询。</p>
          </article>
        )}
        {filteredSubmissions.map((submission) => (
          <article className="submission-card" key={submission.id}>
            <div className="submission-card-head">
              <div className="submission-owner-mark">
                <StudentCartoonAvatar avatarId={props.studentAvatarId} size={34} />
                <div>
                  <span>{artifactLabels[submission.artifactType]}</span>
                  <h4>{submission.artifactTitle}</h4>
                </div>
              </div>
              <div className="submission-card-badges">
                {submission.isExcellent && <em className="excellent-badge">优秀成果</em>}
                <em className={`submission-status ${submission.status}`}>{statusLabels[submission.status]}</em>
              </div>
            </div>
            <p>{submission.artifactSummary}</p>
            {submission.isExcellent && (
              <div className="excellent-notice">
                <BookOpen size={16} />
                已被老师标记为优秀实践成果，将进入课程成果库用于后续教学展示与案例沉淀。
              </div>
            )}
            <dl>
              <div>
                <dt>提交时间</dt>
                <dd>{formatSubmittedAt(submission.submittedAt)}</dd>
              </div>
              <div>
                <dt>审核时间</dt>
                <dd>{submission.reviewedAt || "等待老师处理"}</dd>
              </div>
            </dl>
            <div className="teacher-comment-box">
              <strong>老师意见</strong>
              <p>{submission.teacherComment || "老师还没有填写反馈。"}</p>
            </div>
            <div className="context-actions">
              <button type="button" onClick={() => setDetailSubmission(submission)}>
                <FileText size={15} />
                查看详情
              </button>
              <button type="button" onClick={() => props.onContinue(submission)} disabled={!props.permissionAccess.can("AI 创意工作台")}>
                <PenLine size={15} />
                {props.permissionAccess.can("AI 创意工作台") ? "根据反馈继续修改" : "修改权限已停用"}
              </button>
              {submission.status === "pending" && (
                <button type="button" onClick={() => setPendingWithdraw(submission)} disabled={!props.permissionAccess.can("提交老师审核")}>
                  <LogOut size={15} />
                  {props.permissionAccess.can("提交老师审核") ? "撤回提交" : "提交权限已停用"}
                </button>
              )}
              {submission.status === "withdrawn" && (
                <button className="is-danger" type="button" onClick={() => setPendingDelete(submission)}>
                  <Trash2 size={15} />
                  删除记录
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {pendingWithdraw && (
        <WithdrawSubmissionConfirmModal
          submission={pendingWithdraw}
          onCancel={() => setPendingWithdraw(null)}
          onConfirm={() => {
            props.onWithdraw(pendingWithdraw.id);
            setPendingWithdraw(null);
          }}
        />
      )}
      {pendingDelete && (
        <DeleteWithdrawnSubmissionConfirmModal
          submission={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            props.onDeleteWithdrawn(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
      {detailSubmission && <StudentSubmissionDetailModal submission={detailSubmission} generatedAssets={props.generatedAssets} onClose={() => setDetailSubmission(null)} />}
    </section>
  );
}

function WithdrawSubmissionConfirmModal(props: { submission: Submission; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="withdraw-submission-title">
        <header>
          <div>
            <span className="eyebrow">撤回提交</span>
            <h3 id="withdraw-submission-title">确认撤回这次提交吗？</h3>
            <p>撤回后，教师端将不再显示该待审核成果；学生端仍会保留已撤回记录，方便回看。</p>
          </div>
          <button type="button" aria-label="关闭撤回确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.submission.artifactTitle}</strong>
          <p>{props.submission.artifactSummary}</p>
          <span>{artifactLabels[props.submission.artifactType]} · {formatSubmittedAt(props.submission.submittedAt)}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认撤回
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function DeleteWithdrawnSubmissionConfirmModal(props: { submission: Submission; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-withdrawn-submission-title">
        <header>
          <div>
            <span className="eyebrow">删除撤回记录</span>
            <h3 id="delete-withdrawn-submission-title">确认删除这条已撤回内容吗？</h3>
            <p>只会删除学生端这条撤回记录，不会删除原始 AI 对话和已经生成的本地文件。</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.submission.artifactTitle}</strong>
          <p>{props.submission.artifactSummary}</p>
          <span>{artifactLabels[props.submission.artifactType]} · 已撤回 · {formatSubmittedAt(props.submission.submittedAt)}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            删除记录
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function StudentSubmissionDetailModal(props: { submission: Submission; generatedAssets: GeneratedAsset[]; onClose: () => void }) {
  const blocks = props.submission.blocks || [];
  const canDownload = isSubmissionDownloadAvailable(props.submission, props.generatedAssets);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop student-submission-detail-backdrop" role="presentation">
      <section className="media-modal review-detail-modal student-submission-detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-submission-detail-title">
        <header>
          <div>
            <span className="eyebrow">提交内容详情</span>
            <h3 id="student-submission-detail-title">{props.submission.artifactTitle}</h3>
            <p>这里展示的是提交给老师时保存的成果快照，便于学生自己回看提交内容。</p>
          </div>
          <button className="modal-close-button" type="button" aria-label="关闭详情" onClick={props.onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="review-detail-body student-submission-detail-body">
          <section className="detail-card submission-overview-card">
            <div className="submission-overview-head">
              <div>
                <span className="eyebrow">提交概况</span>
                <h4>{artifactLabels[props.submission.artifactType]}</h4>
              </div>
              <em className={`submission-status ${props.submission.status}`}>{statusLabels[props.submission.status]}</em>
            </div>
            <p>{props.submission.artifactSummary}</p>
            <dl className="submission-detail-meta compact">
              <div>
                <dt>提交时间</dt>
                <dd>{formatSubmittedAt(props.submission.submittedAt)}</dd>
              </div>
              <div>
                <dt>审核时间</dt>
                <dd>{props.submission.reviewedAt || "等待老师处理"}</dd>
              </div>
            </dl>
          </section>
          <section className="detail-card">
            <span className="eyebrow">老师意见</span>
            <p>{props.submission.teacherComment || "老师还没有填写反馈。"}</p>
          </section>
          <section className="detail-card">
            <span className="eyebrow">提交材料</span>
            <div className="review-blocks">
              {blocks.length === 0 && (
                <article>
                  <strong>暂无结构化内容</strong>
                  <ul>
                    <li>这条提交没有保存到结构化成果块，可以回到 AI 创意工作台查看原始对话。</li>
                  </ul>
                </article>
              )}
              {blocks.map((block) => (
                <article key={block.title}>
                  <strong>{block.title}</strong>
                  {block.items.length === 1 && (block.items[0].length > 220 || /\n|#{1,6}\s|【正式回复】/.test(block.items[0])) ? (
                    <StructuredAiResponse content={block.items[0]} compact />
                  ) : (
                    <ul>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onClose}>
            关闭
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!canDownload}
            title={canDownload ? undefined : "真实文件尚未生成"}
            onClick={() => downloadSubmissionArtifact(props.submission, props.generatedAssets)}
          >
            <Download size={15} />
            {canDownload ? getSubmissionDownloadLabel(props.submission) : "文件尚未生成"}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function DefenseView(props: {
  activeIdea: Idea;
  messages: ChatMessage[];
  generatedAssets: GeneratedAsset[];
  practices: DefensePractice[];
  studentAvatarId: StudentAvatarId;
  onSaveDefense: (practice: DefensePractice) => void;
  permissionAccess: PermissionAccess;
}) {
  const latestBpMessage = [...props.messages].reverse().find((message) => message.sender === "ai" && message.artifactType === "BP");
  const [turns, setTurns] = useState<DefenseTurn[]>([
    {
      id: makeId("DT"),
      sender: "ai",
      content: latestBpMessage
        ? "我是本轮 AI 评委。系统会自动使用当前创意最新生成的商业计划书 BP 作为答辩依据，点击“开始答辩”即可进入模拟。"
        : "当前创意还没有商业计划书 BP。请先到商业模式/BP 专家生成 BP，再进入答辩模拟。",
      createdAt: nowTime(),
    },
  ]);
  const [answer, setAnswer] = useState(() => (latestBpMessage ? getDefenseSuggestedAnswer(0) : ""));
  const [evaluation, setEvaluation] = useState<ResultBlock[] | null>(null);
  const [selectedPractice, setSelectedPractice] = useState<DefensePractice | null>(null);
  const defenseChatListRef = useRef<HTMLDivElement | null>(null);
  const defenseHasScrolledRef = useRef(false);
  const speechInput = useSpeechInput({
    value: answer,
    onChange: setAnswer,
    fallbackText: "语音回答：我们的项目服务商学院创业实践课堂，先帮助学生把创意整理成可验证假设，再生成 BP、PPT、路演稿和答辩材料，老师端可以审核并反馈。",
  });
  const activeBlocks = selectedPractice
    ? defenseBlocks(selectedPractice)
    : evaluation || buildDefenseEvaluation();

  useEffect(() => {
    const chatList = defenseChatListRef.current;
    if (!chatList) return;
    window.requestAnimationFrame(() => {
      if (!defenseHasScrolledRef.current) {
        defenseHasScrolledRef.current = true;
        chatList.scrollTop = chatList.scrollHeight;
        return;
      }
      chatList.scrollTo({ top: chatList.scrollHeight, behavior: "smooth" });
    });
  }, [turns.length, evaluation]);

  function appendAi(content: string) {
    setTurns((current) => [...current, { id: makeId("DT"), sender: "ai", content, createdAt: nowTime() }]);
  }

  function handleStart() {
    if (!props.permissionAccess.can("答辩模拟")) {
      props.permissionAccess.block("答辩模拟");
      return;
    }
    const basis = latestBpMessage;
    if (!basis) {
      appendAi("当前创意还没有可用的商业计划书 BP。先生成 BP 后，我会自动带入最新版本进行答辩模拟。");
      setAnswer("");
      return;
    }
    setSelectedPractice(null);
    setEvaluation(null);
    speechInput.resetVoiceInput();
    setTurns([
      {
        id: makeId("DT"),
        sender: "ai",
        content: `本轮将基于当前创意最新的《${basis.skillName || "商业计划书 BP"}》进行答辩。第一个问题：学校为什么愿意为这个系统付费，而不是让学生自己使用通用 AI？`,
        createdAt: nowTime(),
      },
    ]);
    setAnswer(getDefenseSuggestedAnswer(0));
  }

  function handleSendAnswer() {
    if (!props.permissionAccess.can("答辩模拟")) {
      props.permissionAccess.block("答辩模拟");
      return;
    }
    const content = answer.trim();
    if (!content) return;
    const nextTurnCount = turns.filter((turn) => turn.sender === "student").length + 1;
    setTurns((current) => [...current, { id: makeId("DT"), sender: "student", content, createdAt: nowTime() }]);
    setAnswer("");
    speechInput.resetVoiceInput();
    window.setTimeout(() => {
      appendAi(buildFollowUpQuestion(content, nextTurnCount));
      setAnswer(getDefenseSuggestedAnswer(nextTurnCount));
    }, 3200);
  }

  function buildCurrentPractice(visibility: "self" | "teacher") {
    const practice = buildDefensePractice(props.activeIdea.id, visibility);
    return {
      ...practice,
      transcript: turns,
      evaluation: evaluation || buildDefenseEvaluation(),
      createdAt: nowDateTime(),
    };
  }

  function handleFinish() {
    if (!props.permissionAccess.can("答辩模拟")) {
      props.permissionAccess.block("答辩模拟");
      return;
    }
    window.setTimeout(() => {
      const nextEvaluation = buildDefenseEvaluation(turns);
      const evaluationTurn: DefenseTurn = {
        id: makeId("DT"),
        sender: "ai",
        content: `本轮答辩已结束，我先给出综合评价和下一轮修改建议。\n\n${formatDefenseEvaluationForChat(nextEvaluation)}`,
        createdAt: nowTime(),
      };
      const nextTranscript = [...turns, evaluationTurn];
      setEvaluation(nextEvaluation);
      const savedPractice: DefensePractice = {
        ...buildDefensePractice(props.activeIdea.id, "self"),
        transcript: nextTranscript,
        evaluation: nextEvaluation,
        createdAt: nowDateTime(),
      };
      setTurns(nextTranscript);
      setSelectedPractice(savedPractice);
      props.onSaveDefense(savedPractice);
    }, 4200);
  }

  function handleSave(visibility: "self" | "teacher") {
    if (!props.permissionAccess.can("答辩模拟")) {
      props.permissionAccess.block("答辩模拟");
      return;
    }
    if (visibility === "teacher" && !props.permissionAccess.can("提交老师审核")) {
      props.permissionAccess.block("提交老师审核");
      return;
    }
    const practice = buildCurrentPractice(visibility);
    props.onSaveDefense(practice);
  }

  function selectDefensePractice(practice: DefensePractice) {
    setSelectedPractice(practice);
    setTurns(practice.transcript?.length ? practice.transcript : buildDefensePractice(practice.ideaId, practice.visibility).transcript);
    setEvaluation(practice.evaluation?.length ? practice.evaluation : buildDefenseEvaluation());
  }

  return (
    <section className="workspace-panel defense-page">
      <div className="panel-title">
        <div>
          <span className="eyebrow">AI 评委对话</span>
          <h3>答辩模拟：{props.activeIdea.title}</h3>
        </div>
        <button
          className="ghost-button soft-download-button"
          type="button"
          onClick={() => downloadWord("答辩复盘.doc", "答辩复盘", activeBlocks)}
          disabled={!props.permissionAccess.can("下载个人成果")}
        >
          <Download size={16} />
          下载答辩复盘
        </button>
      </div>
      <div className="defense-layout">
        <div className="defense-main">
          <section className="defense-chat">
            <div className="defense-chat-list" ref={defenseChatListRef}>
              {turns.map((turn) => (
                <article className={`defense-turn ${turn.sender}`} key={turn.id}>
                  <div className="buddy-avatar">
                    {turn.sender === "ai" ? <DefenseJudgeAvatar size={34} /> : <StudentCartoonAvatar avatarId={props.studentAvatarId} size={34} />}
                  </div>
                  <div className="buddy-bubble">
                    <span>{turn.sender === "ai" ? "AI 评委" : "学生回答"} · {turn.createdAt}</span>
                    <p>{turn.content}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="defense-composer">
              <textarea
                aria-label="输入答辩回答"
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  speechInput.resetVoiceInput();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    handleSendAnswer();
                  }
                }}
                placeholder="输入你的答辩回答，例如：我们不是单点生成工具，而是把学生端生成、教师端审核和课程成果沉淀连成闭环..."
              />
              {speechInput.notice && (
                <p className={`voice-status ${speechInput.isListening ? "listening" : ""}`} aria-live="polite">
                  {speechInput.notice}
                </p>
              )}
              <div className="context-actions defense-composer-actions">
                <div className="defense-composer-action-group">
                  <button type="button" onClick={handleStart} disabled={!props.permissionAccess.can("答辩模拟")}>
                    <Mic size={15} />
                    开始答辩
                  </button>
                  <button type="button" onClick={handleFinish} disabled={!props.permissionAccess.can("答辩模拟")}>
                    <CheckCircle2 size={15} />
                    结束并生成评价
                  </button>
                </div>
                <div className="defense-composer-action-group right">
                  <button
                    className={`defense-voice-button ${speechInput.isListening ? "voice-active" : ""}`.trim()}
                    type="button"
                    onClick={speechInput.toggle}
                    disabled={!props.permissionAccess.can("答辩模拟")}
                  >
                    <Mic size={15} />
                    {speechInput.isListening ? "停止听写" : "语音回答"}
                  </button>
                  <button
                    className="defense-send-button"
                    type="button"
                    onClick={handleSendAnswer}
                    disabled={!props.permissionAccess.can("答辩模拟")}
                    aria-keyshortcuts="Enter"
                    title="Enter 发送"
                  >
                    <Send size={15} />
                    发送回答
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
        <aside className="defense-side">
          <div className="detail-card defense-action-card">
            <span className="eyebrow">答辩动作</span>
            <h4>自动答辩依据</h4>
            <p>系统会自动读取当前创意里最新生成的商业计划书 BP，不需要学生手动选择。</p>
            <div className={`auto-basis-card ${latestBpMessage ? "" : "empty"}`}>
              <strong>{latestBpMessage ? latestBpMessage.skillName || "商业计划书 BP" : "暂无商业计划书 BP"}</strong>
              <span>{latestBpMessage ? `生成时间：${latestBpMessage.createdAt}` : "请先在商业模式/BP 专家里生成最终 BP 成果。"}</span>
            </div>
            <div className="context-actions vertical">
              <button type="button" onClick={() => handleSave("teacher")} disabled={!props.permissionAccess.can("答辩模拟") || !props.permissionAccess.can("提交老师审核")}>
                <Send size={15} />
                发送给老师审核
              </button>
              <button type="button" onClick={() => handleSave("self")} disabled={!props.permissionAccess.can("答辩模拟")}>
                <Save size={15} />
                仅保存给自己
              </button>
              <button type="button" onClick={() => downloadWord("答辩复盘.doc", "答辩复盘", activeBlocks)} disabled={!props.permissionAccess.can("下载个人成果")}>
                <Download size={15} />
                自己下载
              </button>
            </div>
          </div>
          <div className="detail-card defense-record-card">
            <span className="eyebrow">我的答辩记录</span>
            <div className="defense-records">
              {props.practices.length === 0 && <p>暂无保存记录。</p>}
              {props.practices.map((practice) => (
                <article
                  className={selectedPractice?.id === practice.id ? "selected" : ""}
                  key={practice.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectDefensePractice(practice)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectDefensePractice(practice);
                    }
                  }}
                >
                  <div className="defense-record-owner">
                    <StudentCartoonAvatar avatarId={props.studentAvatarId} size={30} />
                    <div className="defense-record-copy">
                      <strong>{practice.createdAt}</strong>
                      <span>{practice.visibility === "teacher" ? "已发送给老师" : "仅自己可见"}</span>
                    </div>
                  </div>
                  <div className="defense-record-action">
                    <em>{practice.evaluation?.[0]?.items?.[0]?.match(/\d+\/100/)?.[0] || "86/100"}</em>
                    <span>{selectedPractice?.id === practice.id ? "当前" : "查看"}</span>
                    <ChevronRight size={16} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PromptSaveSuccessModal(props: { message?: string; onClose: () => void }) {
  return createPortal(
    <div className="modal-backdrop save-success-backdrop" role="presentation">
      <section className="save-success-modal" role="dialog" aria-modal="true" aria-label="保存成功">
        <div className="save-success-mark">
          <CheckCircle2 size={28} />
        </div>
        <h3>{props.message || "已保存系统提示词和用户输入组装规则。"}</h3>
        <button type="button" onClick={props.onClose}>
          确定
        </button>
      </section>
    </div>,
    document.body,
  );
}

type IssueOverviewMetric = {
  value: string;
  label: string;
  note: string;
  detailTitle: string;
  summary: string;
  items: string[];
  action: string;
};

function IssueMetricDetailModal(props: { metric: IssueOverviewMetric; onClose: () => void }) {
  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal issue-metric-modal" role="dialog" aria-modal="true" aria-label="问题监测指标详情">
        <header>
          <div>
            <span className="eyebrow">课堂问题监测</span>
            <h3>{props.metric.detailTitle}</h3>
            <p>{props.metric.summary}</p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="issue-metric-summary">
          <strong>{props.metric.value}</strong>
          <div>
            <span>{props.metric.label}</span>
            <p>{props.metric.note}</p>
          </div>
        </div>
        <div className="issue-metric-body">
          <h4>具体说明</h4>
          <ul>
            {props.metric.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="issue-metric-action">
          <span>建议处理</span>
          <p>{props.metric.action}</p>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function getIssuePlaybook(label: string | null) {
  switch (label) {
    case "竞品维度不足":
      return {
        priority: "适合在市场竞品节点集中讲 12 分钟",
        evidenceGap: "学生缺的是比较维度，不是竞品名称数量。",
        teacherMove: "先要求所有组按同一张矩阵补齐，再点评差异化结论。",
        questions: [
          "你们比较的是替代方案、直接竞品，还是老师当前手工流程？",
          "这个竞品维度能不能支撑用户为什么选你们，而不是只说明功能多？",
          "如果删掉“更智能”这句话，你们还剩下哪一个可证明的差异？",
        ],
        reviewFocus: [
          "竞品是否至少覆盖通用 AI、垂直平台、校内现有流程三类。",
          "每个比较维度是否和购买理由或课堂验收有关。",
          "PPT 竞争页是否能直接沉淀为答辩时的差异化回答。",
        ],
      };
    case "答辩证据薄弱":
      return {
        priority: "适合安排答辩前证据压力测试",
        evidenceGap: "学生有观点，但缺少能现场引用的材料编号、页面和数据。",
        teacherMove: "让每个关键结论绑定一页 PPT 或一条访谈证据。",
        questions: [
          "这个结论对应哪一页材料？评委追问时你能不能马上指向证据？",
          "有没有修改前后对比，能证明 AI 不是只生成漂亮文本？",
          "学校为什么相信这个试点有效？8 周后看哪三个指标？",
        ],
        reviewFocus: [
          "路演稿是否包含结论、证据、指标、风险应对四句结构。",
          "PPT 是否有访谈、Rubric、试点数据或修改对比。",
          "答辩模拟记录是否覆盖采购、数据安全、教师工作量三类追问。",
        ],
      };
    case "用户画像泛化":
      return {
        priority: "适合回到项目定位节点做一次收窄",
        evidenceGap: "学生没有明确第一批用户，导致功能、渠道和定价都漂。",
        teacherMove: "要求先锁定“一类人、一个场景、一个高频任务”。",
        questions: [
          "第一个愿意试用的人是谁？他在哪个具体场景里遇到这个问题？",
          "这个用户现在用什么替代方案解决？为什么现在愿意换？",
          "如果只能服务 20 个种子用户，你们会选哪一类？",
        ],
        reviewFocus: [
          "用户画像是否区分使用者、付费方和受益者。",
          "痛点是否有触发场景和发生频率，不只是效率低。",
          "功能优先级是否能从第一用户任务反推出来。",
        ],
      };
    case "试点指标缺失":
      return {
        priority: "适合在 BP 与实施计划节点补齐",
        evidenceGap: "学生写了上线动作，但没有写验收口径和复盘节奏。",
        teacherMove: "要求每组补 3 个过程指标、2 个结果指标，并对应第 2/4/8 周。",
        questions: [
          "8 周后老师只看一张表，凭什么判断这个项目值得继续？",
          "哪些指标来自学生端，哪些来自教师端，哪些来自课程管理端？",
          "如果指标没有达标，你们下一轮会改产品、改流程，还是改目标用户？",
        ],
        reviewFocus: [
          "指标是否包含使用频次、提交通过率、教师点评耗时、优秀成果数量。",
          "每个指标是否有来源、记录人和复盘时间。",
          "BP 和 PPT 中的试点口径是否一致。",
        ],
      };
    default:
      return {
        priority: "适合本周课堂集中讲评 15 分钟",
        evidenceGap: "核心缺口是付费方、交付包和验收指标没有闭合。",
        teacherMove: "先讲 B2B2C 校园采购逻辑，再要求学生重写收入模式。",
        questions: [
          "谁付钱？为什么现在付？付完之后学校拿到什么可验收结果？",
          "学生愿意用和学院愿意买之间，还缺哪一个管理价值证明？",
          "试点包、课程包、学院续费分别交付什么，成本边界在哪里？",
        ],
        reviewFocus: [
          "是否拆清付费方、使用者、受益者三类角色。",
          "收入模式是否对应课程试点包、教师培训、成果沉淀等交付物。",
          "成本测算是否包含模型、服务器、教师培训和案例库维护。",
        ],
      };
  }
}

type TeacherIssueDetail = {
  value: string;
  level: string;
  trend: string;
  affectedGroups: string;
  evidence: string[];
  guidance: string[];
  relatedTypes: ArtifactType[];
  relatedSamples: Array<{ title: string; meta: string; summary: string }>;
};

const teacherIssueDefinitions: Array<{
  label: string;
  keywords: string[];
  relatedTypes: ArtifactType[];
  guidance: string[];
}> = [
  {
    label: "商业模式不清",
    keywords: ["商业模式", "付费", "收入", "成本", "定价", "采购"],
    relatedTypes: ["BP", "POSITIONING"],
    guidance: ["要求学生拆清使用者、付费方、受益者和决策链。", "把收入项逐一对应到交付内容与验收指标。"],
  },
  {
    label: "竞品维度不足",
    keywords: ["竞品", "竞争", "替代方案", "差异化"],
    relatedTypes: ["MARKET", "POSITIONING", "PPT"],
    guidance: ["至少比较三类替代方案，并说明比较维度。", "要求差异化结论能支撑渠道、定价或产品取舍。"],
  },
  {
    label: "答辩证据薄弱",
    keywords: ["证据", "访谈", "数据", "依据", "证明"],
    relatedTypes: ["DEFENSE", "PPT", "BP"],
    guidance: ["每个关键结论绑定一项可追溯材料。", "答辩回答采用“结论—证据—指标—风险应对”结构。"],
  },
  {
    label: "用户画像泛化",
    keywords: ["用户画像", "目标用户", "客群", "第一用户", "使用场景"],
    relatedTypes: ["BRAINSTORM", "POSITIONING"],
    guidance: ["用“一类人、一个场景、一个高频任务”收窄首批用户。", "区分购买者、使用者与受益者。"],
  },
  {
    label: "试点指标缺失",
    keywords: ["试点", "指标", "验收", "里程碑", "验证"],
    relatedTypes: ["BP", "PPT", "POSITIONING"],
    guidance: ["补充过程指标、结果指标、数据来源和复盘时间。", "确保 BP、PPT 与实施计划使用同一指标口径。"],
  },
];

function buildTeacherIssueDetails(submissions: Submission[]): Record<string, TeacherIssueDetail> {
  const result: Record<string, TeacherIssueDetail> = {};
  teacherIssueDefinitions.forEach((definition) => {
    const matches = submissions.filter((submission) => {
      const diagnosisText = [
        submission.aiDiagnosis?.summary,
        ...(submission.aiDiagnosis?.problems || []),
        ...(submission.aiDiagnosis?.risks || []),
        submission.teacherComment,
      ]
        .filter(Boolean)
        .join(" ");
      return diagnosisText && definition.keywords.some((keyword) => diagnosisText.includes(keyword));
    });
    if (!matches.length) return;
    const groups = new Set(matches.map((submission) => submission.groupName || submission.group).filter(Boolean));
    const affectedStudents = new Set(matches.map((submission) => submission.student).filter(Boolean));
    const ratio = Math.round((matches.length / Math.max(1, submissions.length)) * 100);
    result[definition.label] = {
      value: `${ratio}%`,
      level: ratio >= 50 ? "高" : ratio >= 25 ? "中" : "低",
      trend: `当前 ${matches.length} 项成果`,
      affectedGroups: `${groups.size} 个小组 / ${affectedStudents.size} 名学生`,
      evidence: matches.slice(0, 5).map((submission) => {
        const diagnosisEvidence = [
          ...(submission.aiDiagnosis?.problems || []),
          ...(submission.aiDiagnosis?.risks || []),
        ].find((item) => definition.keywords.some((keyword) => item.includes(keyword)));
        return `${submission.artifactTitle}：${diagnosisEvidence || submission.teacherComment || "已在诊断中标记该问题"}`;
      }),
      guidance: definition.guidance,
      relatedTypes: definition.relatedTypes,
      relatedSamples: matches.slice(0, 3).map((submission) => ({
        title: submission.artifactTitle,
        meta: `${submission.student} / ${submission.groupName || submission.group} / ${artifactLabels[submission.artifactType]}`,
        summary: submission.teacherComment || submission.aiDiagnosis?.summary || submission.artifactSummary,
      })),
    };
  });
  return result;
}

function TeacherView(props: {
  submissions: Submission[];
  allSubmissions: Submission[];
  activeSubmission?: Submission;
  generatedAssets: GeneratedAsset[];
  knowledgeUploads: KnowledgeUpload[];
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  promptKnowledgeRoutes: PromptKnowledgeRoutes;
  customExperts: CustomExpertRecord[];
  teacherName: string;
  filter: ArtifactType | "ALL";
  statusFilter: SubmissionStatus | "ALL";
  teacherComment: string;
  permissionAccess: PermissionAccess;
  onFilterChange: (filter: ArtifactType | "ALL") => void;
  onStatusFilterChange: (filter: SubmissionStatus | "ALL") => void;
  onSelectSubmission: (submission: Submission) => void;
  onTeacherCommentChange: (value: string) => void;
  onSaveTeacherComment: (submissionId: string, comment: string) => void;
  onReview: (status: SubmissionStatus) => void;
  onToggleExcellent: (submissionId: string) => void;
  onJumpPending: () => void;
  onPreviewPpt: (asset: GeneratedAsset) => void;
  onPreviewVideo: (asset: GeneratedAsset) => void;
  onPreviewWord: (preview: WordPreview) => void;
  onUploadKnowledge: (assets: KnowledgeUpload[]) => void;
  onDeleteKnowledge: (id: string) => void;
  onToggleKnowledge: (id: string) => void;
  onKnowledgeBaseStatesChange: (states: KnowledgeBaseStates) => void;
  onKnowledgeCatalogChange: (catalog: KnowledgeBaseCatalogItem[]) => void;
  onPromptKnowledgeRoutesChange: (routes: PromptKnowledgeRoutes) => void;
  onCustomExpertsChange: (experts: CustomExpertRecord[]) => void;
  onExpertSkillConfirmed: (result: ExpertSkillConfirmationRecord) => void;
  onSaveExpertPrompt: (
    expertId: ExpertId,
    systemPrompt: string,
    userPrompt: string,
    categories: KnowledgeCategory[],
    active: boolean,
  ) => Promise<void>;
  onDeleteExpert: (expertId: ExpertId) => boolean;
  onDeleteKnowledgeBase: (category: KnowledgeCategory) => boolean;
}) {
  const pendingCount = props.allSubmissions.filter((item) => item.status === "pending").length;
  const [teacherModule, setTeacherModule] = useState<"review" | "knowledge" | "prompts" | "issues">("review");
  const [reviewDetailId, setReviewDetailId] = useState<string | null>(null);
  const [reviewSearchDraft, setReviewSearchDraft] = useState<TeacherReviewSearch>(() => ({
    ...emptyTeacherReviewSearch,
    artifactType: props.filter,
    status: props.statusFilter,
  }));
  const [reviewSearch, setReviewSearch] = useState<TeacherReviewSearch>(() => ({
    ...emptyTeacherReviewSearch,
    artifactType: props.filter,
    status: props.statusFilter,
  }));
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [knowledgeSearchDraft, setKnowledgeSearchDraft] = useState<KnowledgeUploadSearch>(emptyKnowledgeUploadSearch);
  const [knowledgeSearch, setKnowledgeSearch] = useState<KnowledgeUploadSearch>(emptyKnowledgeUploadSearch);
  const [knowledgePreviewId, setKnowledgePreviewId] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<KnowledgeCategory>("教学大纲");
  const [newKnowledgeName, setNewKnowledgeName] = useState("");
  const [knowledgeDirectorySearchDraft, setKnowledgeDirectorySearchDraft] = useState("");
  const [knowledgeDirectorySearch, setKnowledgeDirectorySearch] = useState("");
  const [knowledgeBasePreviewCategory, setKnowledgeBasePreviewCategory] = useState<KnowledgeCategory | null>(null);
  const [knowledgeSaveMessage, setKnowledgeSaveMessage] = useState<string | null>(null);
  const [pendingDeleteExpertId, setPendingDeleteExpertId] = useState<ExpertId | null>(null);
  const [teacherPromptExpertId, setTeacherPromptExpertId] = useState<ExpertId>("brainstorm");
  const [isTeacherExpertDetailOpen, setIsTeacherExpertDetailOpen] = useState(false);
  const [teacherExpertListRefreshKey, setTeacherExpertListRefreshKey] = useState(0);
  const teacherManageableExperts = mergeManageableExperts(experts, props.customExperts);
  const initialTeacherPromptExpert = teacherManageableExperts.find((expert) => expert.id === "brainstorm") || teacherManageableExperts[0];
  const initialTeacherPromptParts = buildPromptTemplateParts(
    initialTeacherPromptExpert,
    props.knowledgeUploads,
    props.knowledgeBaseStates,
    props.promptKnowledgeRoutes[initialTeacherPromptExpert.id],
  );
  const [teacherSystemPromptDraft, setTeacherSystemPromptDraft] = useState(initialTeacherPromptParts.system);
  const [teacherUserPromptDraft, setTeacherUserPromptDraft] = useState(initialTeacherPromptParts.user);
  const [teacherExpertActiveDraft, setTeacherExpertActiveDraft] = useState(initialTeacherPromptExpert.active !== false);
  const [isPromptSaveOpen, setIsPromptSaveOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [selectedIssueMetricLabel, setSelectedIssueMetricLabel] = useState<string | null>(null);
  const [reviewDetailTab, setReviewDetailTab] = useState<TeacherReviewTab>("files");
  const [diagnosingSubmissionId, setDiagnosingSubmissionId] = useState<string | null>(null);
  const [diagnosedSubmissionIds, setDiagnosedSubmissionIds] = useState<string[]>([]);
  const [confirmedRubricSubmissionIds, setConfirmedRubricSubmissionIds] = useState<string[]>([]);
  const [reviewActionMessage, setReviewActionMessage] = useState<string | null>(null);
  const [rubricDrafts, setRubricDrafts] = useState<Record<string, RubricScore[]>>({});
  const [diagnosisResults, setDiagnosisResults] = useState<Record<string, DiagnosisResult>>(() =>
    Object.fromEntries(
      props.allSubmissions
        .filter((submission) => submission.aiDiagnosis)
        .map((submission) => [submission.id, submission.aiDiagnosis as DiagnosisResult]),
    ),
  );
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const selectedUpload = props.knowledgeUploads.find((asset) => asset.id === selectedUploadId) || null;
  const knowledgePreviewAsset = knowledgePreviewId ? props.knowledgeUploads.find((asset) => asset.id === knowledgePreviewId) || null : null;
  const activeKnowledgeCatalog = getActiveKnowledgeCatalog(props.knowledgeCatalog);
  const knowledgeBasePreviewItem = knowledgeBasePreviewCategory
    ? activeKnowledgeCatalog.find((base) => base.category === knowledgeBasePreviewCategory) || null
    : null;
  const selectedUploadKnowledgeBase = activeKnowledgeCatalog.find((base) => base.category === uploadCategory) || activeKnowledgeCatalog[0];
  const teacherPromptExpert = teacherManageableExperts.find((expert) => expert.id === teacherPromptExpertId) || teacherManageableExperts[0];
  const pendingDeleteExpert = pendingDeleteExpertId ? teacherManageableExperts.find((expert) => expert.id === pendingDeleteExpertId) || null : null;
  const teacherPromptKnowledgeCategories = props.promptKnowledgeRoutes[teacherPromptExpert.id] || getExpertKnowledgeCategories(teacherPromptExpert.id);
  const teacherPromptMeta = buildPromptTemplateParts(
    teacherPromptExpert,
    props.knowledgeUploads,
    props.knowledgeBaseStates,
    teacherPromptKnowledgeCategories,
  );

  function getDiagnosis(submission: Submission) {
    return diagnosisResults[submission.id] || submission.aiDiagnosis;
  }

  function isSubmissionDiagnosed(submission: Submission) {
    return diagnosedSubmissionIds.includes(submission.id) || Boolean(getDiagnosis(submission));
  }

  const issueDetails: Record<
    string,
    {
      value: string;
      level: string;
      trend: string;
      affectedGroups: string;
      evidence: string[];
      guidance: string[];
      relatedTypes: ArtifactType[];
      relatedSamples: Array<{ title: string; meta: string; summary: string }>;
    }
  > = {
    商业模式不清: {
      value: "78%",
      level: "高",
      trend: "较上周 +12%",
      affectedGroups: "35 名学生",
      evidence: [
        "BP 中只写“订阅收费”，没有说明学校采购预算来自课程建设、就业质量还是数字化教学项目。",
        "收入来源和交付内容没有对应关系，难以判断试点后如何续费。",
        "缺少 8 周试点中的可量化指标，例如使用频次、成果通过率、教师点评节省时间。",
        "部分学生把“学生愿意用”和“学校愿意买”混在一起，导致付费方、使用者和受益者没有拆开。",
        "成本测算只写服务器和模型调用，没有估算教师培训、模板初始化和案例库维护投入。",
      ],
      guidance: [
        "要求学生补一张“付费方-采购理由-交付包-验收指标”四列表。",
        "课堂集中讲解 B2B2C 校园场景，不要把学生用户和学校付费方混在一起。",
        "批改时优先追问：谁付钱、为什么现在付、交付什么、如何证明有效。",
        "让学生把收入模式写成“试点包-课程包-学院续费”三层，不要只写单一订阅制。",
        "要求每个收费项都对应一个可验收结果，例如通过率、修改轮次、教师点评耗时或优秀案例数量。",
      ],
      relatedTypes: ["BP", "POSITIONING"],
      relatedSamples: [
        {
          title: "AI 就业教练 - BP 收入模式修订稿",
          meta: "陈思源 / 第 3 组 / 商业计划书 BP",
          summary: "已补充学院采购理由、课程试点包、教师培训和 8 周验收指标，但续费逻辑还需要量化。",
        },
        {
          title: "校园低碳积分平台 - 付费方拆解",
          meta: "李若涵 / 第 4 组 / 项目定位",
          summary: "把使用者、赞助企业和学校管理方分开写，仍需说明企业为什么持续投入。",
        },
        {
          title: "商科案例共创库 - 交付包清单",
          meta: "王泽宇 / 第 6 组 / 商业计划书 BP",
          summary: "已形成课程包、案例库初始化和教师工作坊三类交付物，缺少成本边界。",
        },
      ],
    },
    竞品维度不足: {
      value: "64%",
      level: "中高",
      trend: "较上周 +8%",
      affectedGroups: "31 名学生",
      evidence: [
        "只罗列竞品名称，没有按教学闭环、教师审核、成果沉淀、数据看板等维度比较。",
        "通用 AI、招聘平台和高校管理系统被放在同一层级，比较对象不够清楚。",
        "缺少差异化结论，无法支撑后续 PPT 中的竞争定位页。",
        "竞品结论常写成“我们更智能”，但没有落到课程流程、老师审核和成果复用上。",
      ],
      guidance: [
        "统一使用四维竞品矩阵：目标用户、核心场景、教师参与度、成果沉淀能力。",
        "要求每组至少对比 3 类替代方案，并写出“我们不做什么”。",
        "教师点评重点放在比较维度是否服务商业判断，而不是功能清单是否完整。",
        "优秀案例可展示“通用 AI vs 校园就业系统 vs 本项目”的三类替代方案，不再横向堆产品名称。",
      ],
      relatedTypes: ["MARKET", "POSITIONING", "PPT"],
      relatedSamples: [
        {
          title: "AI 就业教练 - 竞品矩阵页",
          meta: "陈思源 / 第 3 组 / 市场竞品",
          summary: "已按教学适配、教师参与、成果沉淀、就业数据闭环四个维度重做对比。",
        },
        {
          title: "校园低碳积分平台 - 替代方案比较",
          meta: "李若涵 / 第 4 组 / 路演 PPT",
          summary: "将校园小程序、企业 ESG 平台、学生社团活动三类方案分层比较，差异化更清楚。",
        },
        {
          title: "智能简历诊所 - 竞争定位说明",
          meta: "赵一鸣 / 第 2 组 / 项目定位",
          summary: "已说明不做招聘平台，而是聚焦课程内简历训练和老师反馈闭环。",
        },
      ],
    },
    答辩证据薄弱: {
      value: "52%",
      level: "中",
      trend: "较上周 +5%",
      affectedGroups: "26 名学生",
      evidence: [
        "答辩回答多为价值宣称，缺少访谈、试点、评分 Rubric 或修改前后对比证据。",
        "被追问数据安全、教师工作量、学校采购理由时，回答停留在原则层面。",
        "路演 PPT 中图表和案例支撑不足，导致答辩时难以引用具体页面。",
        "学生能说出功能价值，但不能把结论指回具体材料，现场容易被追问打断。",
      ],
      guidance: [
        "要求学生把每个关键结论绑定一个证据来源：访谈原话、试点数据、模板标准或教师反馈。",
        "答辩前增加 10 分钟压力测试，固定追问商业可行性、教学价值、数据安全三类问题。",
        "教师审核 PPT 时同步检查“这页能回答哪个评委问题”。",
        "把答辩回答统一改成“结论-证据-试点指标-风险应对”四句结构，便于现场表达。",
      ],
      relatedTypes: ["DEFENSE", "PPT", "BP"],
      relatedSamples: [
        {
          title: "AI 就业教练 - 答辩压力测试记录",
          meta: "陈思源 / 第 3 组 / 答辩模拟",
          summary: "学校采购价值回答较完整，数据安全和教师工作量两题还需要补证据。",
        },
        {
          title: "商科案例共创库 - 评委追问清单",
          meta: "王泽宇 / 第 6 组 / 答辩模拟",
          summary: "已整理 8 个高频追问，缺少每个回答对应的页面和材料来源。",
        },
        {
          title: "智能简历诊所 - PPT 证据页",
          meta: "赵一鸣 / 第 2 组 / 路演 PPT",
          summary: "补充了修改前后简历对比图，仍需增加访谈原话和样本数量说明。",
        },
      ],
    },
    用户画像泛化: {
      value: "47%",
      level: "中",
      trend: "较上周 -3%",
      affectedGroups: "22 名学生",
      evidence: [
        "目标用户写成“所有大学生”或“所有创业者”，没有区分第一批试点用户。",
        "痛点描述停留在“效率低、信息多”，缺少具体触发场景和使用频率。",
        "用户画像和后续产品功能之间缺少对应关系，导致功能优先级不清楚。",
        "部分成果没有说明用户现在的替代做法，导致评委难判断是否真的需要新方案。",
      ],
      guidance: [
        "要求学生用“一类人 + 一个场景 + 一个高频任务”重写第一用户。",
        "课堂示范把泛化用户拆成采购方、使用者、受益者三类，不要混写。",
        "点评时优先追问：这个人现在怎么解决、为什么现在愿意换、先服务哪一小群。",
        "让学生补一张“第一用户的一天”场景卡，把触发点、任务、阻碍和愿意尝试的理由写清楚。",
      ],
      relatedTypes: ["BRAINSTORM", "POSITIONING", "BP"],
      relatedSamples: [
        {
          title: "AI 就业教练 - 第一用户画像卡",
          meta: "陈思源 / 第 3 组 / 项目定位",
          summary: "已从所有大学生收窄到大三大四商学院求职学生，仍需补充使用频率。",
        },
        {
          title: "校园低碳积分平台 - 种子用户访谈",
          meta: "李若涵 / 第 4 组 / 头脑风暴",
          summary: "已有学生社团和宿舍楼层长两类种子用户，需要进一步选定第一批。",
        },
        {
          title: "跨境案例助教 - 用户任务拆解",
          meta: "周明轩 / 第 8 组 / 项目定位",
          summary: "把用户任务拆成找案例、改分析框架、准备课堂汇报三步，定位更清楚。",
        },
      ],
    },
    试点指标缺失: {
      value: "41%",
      level: "中",
      trend: "较上周 +4%",
      affectedGroups: "19 名学生",
      evidence: [
        "行动计划里只有“上线、推广、优化”，没有 8 周内可验收的数据口径。",
        "缺少使用频次、提交通过率、老师点评耗时、学生满意度等教学指标。",
        "试点结束后如何判断继续投入没有写清楚，影响 BP 的可执行性。",
        "部分学生写了目标值，但没有说明数据从哪里来、谁记录、多久复盘一次。",
      ],
      guidance: [
        "统一要求每组补 3 个过程指标和 2 个结果指标，绑定到第 2、4、8 周。",
        "把指标和教师审核动作连起来，例如退回次数、修改完成率、优秀成果数量。",
        "路演前集中检查“如果 8 周后只看一张表，老师能否判断项目有效”。",
        "要求指标必须同时包含学生侧、教师侧和课程侧，避免只写访问量或注册数。",
      ],
      relatedTypes: ["BP", "PPT", "SCRIPT"],
      relatedSamples: [
        {
          title: "AI 就业教练 - 8 周试点指标表",
          meta: "陈思源 / 第 3 组 / 商业计划书 BP",
          summary: "已补过程指标和结果指标，建议增加每周教师点评耗时对比。",
        },
        {
          title: "校园低碳积分平台 - 试点复盘口径",
          meta: "李若涵 / 第 4 组 / 商业计划书 BP",
          summary: "有参与人数和任务完成率，但还缺企业赞助转化和校园管理价值指标。",
        },
        {
          title: "跨境案例助教 - 路演试点页",
          meta: "周明轩 / 第 8 组 / 路演 PPT",
          summary: "把第 2、4、8 周里程碑放进 PPT，演讲稿还需补判断标准。",
        },
      ],
    },
  };
  void issueDetails;
  const realIssueDetails = buildTeacherIssueDetails(props.allSubmissions);
  const issueEntries = Object.entries(realIssueDetails);
  const focusedIssueLabel = selectedIssue || issueEntries[0]?.[0] || null;
  const activeIssue = focusedIssueLabel ? realIssueDetails[focusedIssueLabel] : null;
  const activeIssuePlaybook = getIssuePlaybook(focusedIssueLabel);
  const issueAffectedStudents = new Set(
    props.allSubmissions
      .filter((submission) => {
        const text = [
          submission.aiDiagnosis?.summary,
          ...(submission.aiDiagnosis?.problems || []),
          ...(submission.aiDiagnosis?.risks || []),
          submission.teacherComment,
        ]
          .filter(Boolean)
          .join(" ");
        return teacherIssueDefinitions.some((definition) => definition.keywords.some((keyword) => text.includes(keyword)));
      })
      .map((submission) => submission.student),
  ).size;
  const issueEvidenceCount = issueEntries.reduce((sum, [, detail]) => sum + detail.evidence.length, 0);
  const issueOverviewCards: IssueOverviewMetric[] = [
    {
      value: `${issueEntries.length} 类`,
      label: "高频共性问题",
      note: issueEntries.length ? "来自已保存诊断与教师反馈" : "暂无可核验问题数据",
      detailTitle: "高频共性问题分布",
      summary: "系统仅从已保存的 AI 诊断和教师反馈中归类问题，不根据演示样例推算。",
      items: issueEntries.length
        ? issueEntries.map(([label, detail]) => `${label}：${detail.trend}，涉及 ${detail.affectedGroups}。`)
        : ["尚未产生 AI 诊断或教师反馈，暂不能形成常见问题统计。"],
      action: issueEntries.length ? "建议先处理覆盖面最高的问题，并回到对应成果核对证据。" : "请先在审核详情中对真实提交执行 AI 诊断或填写教师反馈。",
    },
    {
      value: `${issueAffectedStudents}`,
      label: "名学生出现过卡点",
      note: "按当前有证据的成果去重",
      detailTitle: "学生卡点覆盖情况",
      summary: "学生人数来自问题命中的成果记录，已按学生姓名去重。",
      items: issueEntries.length ? issueEntries.map(([label, detail]) => `${label}：${detail.affectedGroups}`) : ["暂无可统计学生。"],
      action: "建议以小组为单位处理当前最高优先级问题。",
    },
    {
      value: `${issueEvidenceCount} 条`,
      label: "可追踪证据",
      note: "来自 AI 诊断与教师反馈原文",
      detailTitle: "证据来源追踪",
      summary: "每条证据均可回到具体成果或教师反馈核对。",
      items: issueEntries.flatMap(([, detail]) => detail.evidence).slice(0, 8).length
        ? issueEntries.flatMap(([, detail]) => detail.evidence).slice(0, 8)
        : ["暂无可追踪证据。"],
      action: "建议教师在审核详情里优先查看“提交材料”和“AI 项目诊断”，用证据定位问题，不只凭印象判断。",
    },
    {
      value: issueEntries.length ? `${Math.min(20, Math.max(10, issueEntries.length * 5))} 分钟` : "--",
      label: "建议集中讲评",
      note: issueEntries.length ? `优先处理 ${issueEntries[0]?.[0]}` : "等待形成问题样本",
      detailTitle: "课堂集中讲评建议",
      summary: issueEntries.length ? "讲评时长按当前问题类别数量估算，最终由教师安排。" : "尚无问题样本，暂不生成讲评建议。",
      items: issueEntries.length ? activeIssuePlaybook.questions : ["请先积累真实诊断或教师反馈。"],
      action: issueEntries.length ? activeIssuePlaybook.teacherMove : "暂无建议。",
    },
  ];
  const selectedIssueMetric = selectedIssueMetricLabel
    ? issueOverviewCards.find((card) => card.label === selectedIssueMetricLabel) || null
    : null;
  const reviewDetailSubmission = reviewDetailId ? props.allSubmissions.find((item) => item.id === reviewDetailId) || null : null;
  const canUseReview = props.permissionAccess.can("提交审核中心");
  const reviewFilteredSubmissions = props.allSubmissions.filter(
    (submission) => submission.status !== "withdrawn" && matchesTeacherReviewSearch(submission, reviewSearch),
  );
  const knowledgeFilteredUploads = props.knowledgeUploads.filter((asset) => matchesKnowledgeUploadSearch(asset, knowledgeSearch));
  const knowledgeDirectoryRows = activeKnowledgeCatalog.filter((base) => {
    const keyword = knowledgeDirectorySearch.trim().toLowerCase();
    if (!keyword) return true;
    return `${base.category} ${base.description} ${base.usedBy}`.toLowerCase().includes(keyword);
  });
  const teacherModuleTabs = [
    { id: "review", label: "审核", icon: ClipboardCheck },
    { id: "knowledge", label: "教学资源库", icon: Upload },
          { id: "prompts", label: "专家配置与 Skill 管理", icon: Sparkles },
    { id: "issues", label: "课堂问题监测", icon: BarChart3 },
  ] as const;

  function applyReviewSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewSearch(reviewSearchDraft);
    props.onFilterChange(reviewSearchDraft.artifactType);
    props.onStatusFilterChange(reviewSearchDraft.status);
  }

  function resetReviewSearch() {
    setReviewSearchDraft(emptyTeacherReviewSearch);
    setReviewSearch(emptyTeacherReviewSearch);
    props.onFilterChange("ALL");
    props.onStatusFilterChange("ALL");
  }

  function applyKnowledgeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKnowledgeSearch(knowledgeSearchDraft);
  }

  function resetKnowledgeSearch() {
    setKnowledgeSearchDraft(emptyKnowledgeUploadSearch);
    setKnowledgeSearch(emptyKnowledgeUploadSearch);
  }

  function applyKnowledgeDirectorySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKnowledgeDirectorySearch(knowledgeDirectorySearchDraft);
  }

  function handleToggleKnowledgeBaseState(category: KnowledgeCategory) {
    const nextEnabled = !props.knowledgeBaseStates[category];
    props.onKnowledgeBaseStatesChange({ ...props.knowledgeBaseStates, [category]: nextEnabled });
    setKnowledgeSaveMessage(`已${nextEnabled ? "启用" : "停用"}「${category}知识库」，学生端和专家提示词会同步更新。`);
  }

  function confirmTeacherDeleteExpert() {
    if (!pendingDeleteExpert) return;
    const expertId = pendingDeleteExpert.id;
    if (props.onDeleteExpert(expertId)) {
      const nextExpert = teacherManageableExperts.find((expert) => expert.id !== expertId) || teacherManageableExperts[0];
      const nextCategories = props.promptKnowledgeRoutes[nextExpert.id] || getExpertKnowledgeCategories(nextExpert.id);
      const nextParts = buildPromptTemplateParts(nextExpert, props.knowledgeUploads, props.knowledgeBaseStates, nextCategories);
      setTeacherPromptExpertId(nextExpert.id);
      setTeacherSystemPromptDraft(nextParts.system);
      setTeacherUserPromptDraft(nextParts.user);
      setTeacherExpertActiveDraft(nextExpert.active !== false);
      setKnowledgeSaveMessage("专家已删除，并同步到学生端专家列表。");
      setIsTeacherExpertDetailOpen(false);
      setTeacherExpertListRefreshKey((current) => current + 1);
    }
    setPendingDeleteExpertId(null);
  }

  function getPptAsset(submission: Submission) {
    return (
      props.generatedAssets.find((asset) => asset.type === "PPT" && asset.sourceMessageId === submission.sourceMessageId) ||
      props.generatedAssets.find((asset) => asset.type === "PPT" && asset.ideaId === submission.ideaId) || {
        id: `PPT-${submission.id}`,
        ideaId: submission.ideaId,
        type: "PPT" as const,
        title: `${submission.artifactTitle} - PPT 文件`,
        sourceMessageId: submission.sourceMessageId,
        createdAt: submission.submittedAt,
      }
    );
  }

  function getVideoAsset(submission: Submission) {
    return (
      props.generatedAssets.find((asset) => asset.type === "VIDEO" && asset.sourceMessageId === submission.sourceMessageId) ||
      props.generatedAssets.find((asset) => asset.type === "VIDEO" && asset.ideaId === submission.ideaId) ||
      buildMediaAsset(
        {
          id: submission.ideaId,
          title: submission.artifactTitle.replace(/\s*-\s*多媒体物料$/, ""),
          description: submission.artifactSummary,
          stage: artifactLabels[submission.artifactType],
          updatedAt: submission.submittedAt,
        },
        undefined,
      )
    );
  }

  function downloadSubmission(submission: Submission) {
    if (!downloadSubmissionArtifact(submission, props.generatedAssets)) {
      setReviewActionMessage("真实文件尚未生成，当前不能下载。");
    }
  }

  function previewSubmission(submission: Submission) {
    if (submission.artifactType === "PPT") {
      props.onPreviewPpt(getPptAsset(submission));
      return;
    }
    if (submission.artifactType === "MEDIA") {
      props.onPreviewVideo(getVideoAsset(submission));
      return;
    }
    props.onPreviewWord({
      title: getDownloadTitle(submission, submission.artifactTitle),
      blocks: submission.artifactType === "BRAINSTORM" ? getBrainstormTaskBlocks(submission.blocks) : submission.blocks,
    });
  }

  function openReviewDetail(submission: Submission, tab: TeacherReviewTab = "files") {
    props.onSelectSubmission(submission);
    setReviewDetailId(submission.id);
    setReviewDetailTab(tab);
    setRubricDrafts((current) =>
      current[submission.id]
        ? current
        : { ...current, [submission.id]: buildRubricScores(submission, getDiagnosis(submission)) },
    );
  }

  function openReviewTab(submission: Submission, tab: TeacherReviewTab) {
    if (tab === "rubric" && !isSubmissionDiagnosed(submission)) {
      setReviewActionMessage("请先完成 AI 诊断，再进行评分。");
      setReviewDetailTab("diagnosis");
      return;
    }
    if (tab === "feedback" && !confirmedRubricSubmissionIds.includes(submission.id)) {
      setReviewActionMessage("请先确认评分，再查看教师反馈。");
      setReviewDetailTab("rubric");
      return;
    }
    setReviewDetailTab(tab);
  }

  async function startDiagnosis(submission: Submission) {
    setReviewDetailTab("diagnosis");
    setDiagnosingSubmissionId(submission.id);
    setReviewActionMessage(null);
    try {
      const diagnosis = await diagnoseTeacherSubmission(submission.id);
      setDiagnosisResults((current) => ({ ...current, [submission.id]: diagnosis }));
      setDiagnosedSubmissionIds((current) => (current.includes(submission.id) ? current : [...current, submission.id]));
      setRubricDrafts((current) => ({ ...current, [submission.id]: buildRubricScores(submission, diagnosis) }));
      if (diagnosis.feedbackDraft?.trim()) props.onTeacherCommentChange(diagnosis.feedbackDraft.trim());
      setReviewActionMessage("AI 参考诊断已生成，请教师核对材料依据并确认评分。");
    } catch (error) {
      setReviewActionMessage(error instanceof Error ? error.message : "AI 诊断失败，请稍后重试。");
    } finally {
      setDiagnosingSubmissionId((current) => (current === submission.id ? null : current));
    }
  }

  function updateRubricScore(submission: Submission, index: number, value: string) {
    const numeric = Math.max(0, Number.parseFloat(value) || 0);
    setRubricDrafts((current) => {
      const rows = current[submission.id] || buildRubricScores(submission, getDiagnosis(submission));
      const nextRows = rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, teacherScore: Math.min(row.weight, Math.round(numeric * 10) / 10) } : row,
      );
      return { ...current, [submission.id]: nextRows };
    });
  }

  function confirmRubric(submission: Submission) {
    const diagnosis = getDiagnosis(submission);
    const rows = rubricDrafts[submission.id] || buildRubricScores(submission, diagnosis);
    const total = rows.reduce((sum, row) => sum + row.teacherScore, 0).toFixed(1);
    const weakRows = [...rows].sort((a, b) => a.teacherScore / a.weight - b.teacherScore / b.weight).slice(0, 2);
    const advantageRows = rows.filter((row) => row.teacherScore / row.weight >= 0.8).slice(0, 2);
    const scoreSummary = `【教师确认评分】综合得分 ${total}/100。优势维度：${advantageRows.map((row) => row.name).join("、") || "暂无明显优势"}。建议重点修改：${weakRows.map((row) => row.name).join("、")}。`;
    props.onTeacherCommentChange([diagnosis?.feedbackDraft?.trim(), scoreSummary].filter(Boolean).join("\n\n"));
    setConfirmedRubricSubmissionIds((current) => (current.includes(submission.id) ? current : [...current, submission.id]));
    setReviewActionMessage(`已确认评分，系统已生成修改建议。`);
    setReviewDetailTab("feedback");
  }

  function handleSubmitRubric(submission: Submission) {
    if (!isSubmissionDiagnosed(submission)) {
      setReviewActionMessage("请先完成 AI 诊断，再提交评分。");
      setReviewDetailTab("diagnosis");
      return;
    }
    if (!confirmedRubricSubmissionIds.includes(submission.id)) {
      setReviewActionMessage("请先确认评分，再提交。");
      setReviewDetailTab("rubric");
      return;
    }
    props.onSaveTeacherComment(submission.id, props.teacherComment);
    setReviewActionMessage("已提交评分。");
  }

  function handleReviewApproved(submission: Submission) {
    props.onReview("approved");
    setReviewActionMessage(`《${submission.artifactTitle}》已通过审核。`);
  }

  function handleReviewRevision(submission: Submission) {
    props.onReview("revision");
    setReviewActionMessage(`《${submission.artifactTitle}》已退回修改。`);
  }

  function renderSubmissionAssetActions(submission: Submission) {
    const canDownload = isSubmissionDownloadAvailable(submission, props.generatedAssets);
    return (
      <div className="teacher-file-actions">
        <button type="button" onClick={() => previewSubmission(submission)}>
          <MonitorPlay size={15} />
          {submission.artifactType === "PPT" ? "预览 PPT" : submission.artifactType === "MEDIA" ? "预览视频" : "预览 Word"}
        </button>
        <button type="button" disabled={!canDownload} title={canDownload ? undefined : "真实文件尚未生成"} onClick={() => downloadSubmission(submission)}>
          <Download size={15} />
          {canDownload ? getSubmissionDownloadLabel(submission) : "文件尚未生成"}
        </button>
      </div>
    );
  }

  function renderIssueRelated(issue: NonNullable<typeof activeIssue>, closeModal = false) {
    const relatedSubmissions = props.allSubmissions
      .filter((item) => issue.relatedTypes.includes(item.artifactType))
      .slice(0, 5);

    if (relatedSubmissions.length > 0) {
      return relatedSubmissions.map((item) => (
        <button
          className="issue-related-real"
          key={item.id}
          type="button"
          onClick={() => {
            props.onSelectSubmission(item);
            if (closeModal) {
              setSelectedIssue(null);
            } else {
              setTeacherModule("review");
            }
          }}
        >
          <FileText size={14} />
          <strong>{item.artifactTitle}</strong>
          <span>{artifactLabels[item.artifactType]} · {item.student}</span>
        </button>
      ));
    }

    return issue.relatedSamples.map((item) => (
      <article className="issue-related-sample" key={item.title}>
        <strong>{item.title}</strong>
        <span>{item.meta}</span>
        <p>{item.summary}</p>
      </article>
    ));
  }

  function handleTeacherPromptKnowledgeToggle(category: KnowledgeCategory) {
    const nextCategories = toggleKnowledgeRouteCategory(teacherPromptKnowledgeCategories, category);
    props.onPromptKnowledgeRoutesChange({ ...props.promptKnowledgeRoutes, [teacherPromptExpert.id]: nextCategories });
    const nextParts = buildPromptTemplateParts(
      teacherPromptExpert,
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      nextCategories,
    );
    setTeacherSystemPromptDraft(nextParts.system);
    setTeacherUserPromptDraft(nextParts.user);
  }

  async function handleTeacherSavePrompt() {
    try {
      await props.onSaveExpertPrompt(
        teacherPromptExpert.id,
        teacherSystemPromptDraft,
        teacherUserPromptDraft,
        teacherPromptKnowledgeCategories,
        teacherExpertActiveDraft,
      );
      setIsTeacherExpertDetailOpen(false);
      setTeacherExpertListRefreshKey((current) => current + 1);
      setIsPromptSaveOpen(true);
    } catch (error) {
      setKnowledgeSaveMessage(error instanceof Error ? error.message : "提示词保存失败");
    }
  }

  function handleTeacherExpertSkillConfirmed(result: ExpertSkillConfirmationRecord) {
    props.onExpertSkillConfirmed(result);
    let nextStates = props.knowledgeBaseStates;
    if (result.knowledgeBase) {
      nextStates = { ...nextStates, [result.knowledgeBase.category]: result.knowledgeBase.active };
    }
    const mapped = mapKnowledgeExpertRecord(result.expert);
    const nextParts = buildPromptTemplateParts(
      buildCustomExpert(mapped),
      props.knowledgeUploads,
      nextStates,
      result.expert.knowledgeCategories,
    );
    setTeacherPromptExpertId(mapped.id);
    setTeacherSystemPromptDraft(nextParts.system);
    setTeacherUserPromptDraft(nextParts.user);
    setTeacherExpertActiveDraft(result.expert.active);
    setKnowledgeSaveMessage(`专家 Skill「${result.expert.name}」已保存${result.expert.active ? "并启用" : "，当前未启用"}。`);
  }

  function openTeacherExpertDetail(expertId: string) {
    const nextExpert = teacherManageableExperts.find((expert) => expert.id === expertId) || teacherManageableExperts[0];
    const nextCategories = props.promptKnowledgeRoutes[nextExpert.id] || getExpertKnowledgeCategories(nextExpert.id);
    const nextParts = buildPromptTemplateParts(
      nextExpert,
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      nextCategories,
    );
    setTeacherPromptExpertId(nextExpert.id);
    setTeacherSystemPromptDraft(nextParts.system);
    setTeacherUserPromptDraft(nextParts.user);
    setTeacherExpertActiveDraft(nextExpert.active !== false);
    setIsTeacherExpertDetailOpen(true);
  }

  function handleCreateKnowledgeBase() {
    const category = newKnowledgeName.trim();
    const usedBy = "学生端专家、教师审核、管理端提示词";
    if (!category) {
      setKnowledgeSaveMessage("请先填写知识库名称。");
      return;
    }
    if (props.knowledgeCatalog.some((item) => item.category === category)) {
      setKnowledgeSaveMessage("这个知识库目录已经存在。");
      return;
    }
    const nextItem: KnowledgeBaseCatalogItem = {
      category,
      description: `${category}：由教师端新增，可用于 ${usedBy}。`,
      usedBy,
    };
    const { nextCatalog, nextStates, nextRoutes } = syncKnowledgeCatalogAddition(
      props.knowledgeCatalog,
      props.knowledgeBaseStates,
      props.promptKnowledgeRoutes,
      nextItem,
    );
    props.onKnowledgeCatalogChange(nextCatalog);
    props.onKnowledgeBaseStatesChange(nextStates);
    props.onPromptKnowledgeRoutesChange(nextRoutes);
    setUploadCategory(category);
    setKnowledgeSearchDraft((current) => ({ ...current, category }));
    setNewKnowledgeName("");
    setKnowledgeSaveMessage(`已新增知识库「${category}」，并同步到学生端和提示词目录。`);
  }

  async function handleLocalUpload(files: FileList | null) {
    if (!files?.length) return;
    if (!props.permissionAccess.can("上传教学资料")) {
      props.permissionAccess.block("上传教学资料");
      return;
    }
    const uploaded = await Promise.all(
      Array.from(files).map(async (file) => {
        const canReadText =
          file.size < 250_000 &&
          (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md"));
        let text = "";
        if (canReadText) {
          try {
            text = await file.text();
          } catch {
            text = "";
          }
        }
        return {
          id: makeId("K"),
          name: file.name,
          sizeLabel: formatFileSize(file.size),
          fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "本地文件",
          file,
          uploadedAt: nowDateTime(),
          uploadedBy: props.teacherName || "周老师",
          preview: buildUploadPreview(file, text, uploadCategory),
          contentText: text || undefined,
          category: uploadCategory,
          enabled: true,
        };
      }),
    );
    props.onUploadKnowledge(uploaded);
    setSelectedUploadId(uploaded[0]?.id || "");
  }

  return (
    <>
    {(props.permissionAccess.accountDisabled || props.permissionAccess.disabledPermissions.length > 0) && (
      <PermissionBanner
        accountDisabled={props.permissionAccess.accountDisabled}
        disabledPermissions={props.permissionAccess.disabledPermissions}
      />
    )}
    <nav className="teacher-module-tabs" aria-label="教师端模块切换">
      {teacherModuleTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            className={teacherModule === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            onClick={() => setTeacherModule(tab.id)}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </nav>
    <div className="backend-layout teacher-single-layout role-view-shell">
      <section className="backend-main">
        {teacherModule === "review" && (
          <div className="teacher-module-panel teacher-review-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">教师后台</span>
            <h3>提交审核中心</h3>
          </div>
          <button
            className="status-pill pending-jump"
            type="button"
            onClick={() => {
              const nextSearch: TeacherReviewSearch = { ...emptyTeacherReviewSearch, status: "pending" };
              setReviewSearchDraft(nextSearch);
              setReviewSearch(nextSearch);
              props.onJumpPending();
            }}
            disabled={!props.permissionAccess.can("提交审核中心")}
          >
            <Users size={15} />
            待审核 {pendingCount} 项
          </button>
        </div>

        <form className="teacher-review-search" onSubmit={applyReviewSearch}>
          <label className="teacher-review-keyword">
            <span>学生名称 / 小组 / 成果标题</span>
            <input
              type="search"
              placeholder="输入学生名称、小组或成果标题"
              value={reviewSearchDraft.keyword}
              onChange={(event) => setReviewSearchDraft((current) => ({ ...current, keyword: event.target.value }))}
            />
          </label>
          <label>
            <span>成果类型</span>
            <PrettySelect
              value={reviewSearchDraft.artifactType}
              ariaLabel="筛选成果类型"
              options={(["ALL", "BRAINSTORM", "POSITIONING", "MARKET", "BP", "PPT", "SCRIPT", "DEFENSE", "MEDIA"] as const).map((type) => ({
                value: type,
                label: type === "ALL" ? "全部成果类型" : artifactLabels[type],
              }))}
              onChange={(value) => setReviewSearchDraft((current) => ({ ...current, artifactType: value }))}
            />
          </label>
          <label>
            <span>提交状态</span>
            <PrettySelect
              value={reviewSearchDraft.status}
              ariaLabel="筛选提交状态"
              options={(["ALL", "pending", "approved", "revision"] as const).map((status) => ({
                value: status,
                label: status === "ALL" ? "全部状态" : statusLabels[status],
              }))}
              onChange={(value) => setReviewSearchDraft((current) => ({ ...current, status: value }))}
            />
          </label>
          <label>
            <span>开始日期</span>
            <input
              type="date"
              value={reviewSearchDraft.startDate}
              onChange={(event) => setReviewSearchDraft((current) => ({ ...current, startDate: event.target.value }))}
            />
          </label>
          <label>
            <span>结束日期</span>
            <input
              type="date"
              min={reviewSearchDraft.startDate || undefined}
              value={reviewSearchDraft.endDate}
              onChange={(event) => setReviewSearchDraft((current) => ({ ...current, endDate: event.target.value }))}
            />
          </label>
          <div className="teacher-review-search-actions">
            <button className="primary-button" type="submit">
              <Filter size={15} />
              查询
            </button>
            <button className="ghost-button" type="button" onClick={resetReviewSearch}>
              重置
            </button>
          </div>
        </form>

        <div className="record-table submission-table">
          <div className="table-row table-head">
            <span>学生/小组</span>
            <span>成果类型</span>
            <span>成果标题</span>
            <span>状态</span>
            <span>提交时间</span>
            <span>操作</span>
          </div>
          {reviewFilteredSubmissions.length === 0 && (
            <div className="submission-empty-row">没有匹配的提交，可以调整学生名称、成果类型或日期范围后再查。</div>
          )}
          {reviewFilteredSubmissions.map((submission) => (
            <div
              aria-disabled={!canUseReview}
              className={`table-row ${props.activeSubmission?.id === submission.id ? "selected" : ""} ${canUseReview ? "" : "disabled"}`}
              key={submission.id}
              role="button"
              tabIndex={canUseReview ? 0 : -1}
              onClick={() => {
                if (canUseReview) props.onSelectSubmission(submission);
              }}
              onKeyDown={(event) => {
                if (!canUseReview || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                props.onSelectSubmission(submission);
              }}
            >
              <span title={`${submission.student} / ${getStudentGroupDisplay(submission.group, submission.groupName)}`}>
                <strong>{submission.student}</strong>
                <small>{getStudentGroupDisplay(submission.group, submission.groupName)}</small>
              </span>
              <span>{artifactLabels[submission.artifactType]}</span>
              <span title={submission.artifactTitle}>
                {submission.artifactTitle}
                {submission.isExcellent && <em className="inline-excellent">优秀</em>}
              </span>
              <span className={`submission-status ${submission.status}`}>{statusLabels[submission.status]}</span>
              <span>{formatSubmittedAt(submission.submittedAt)}</span>
              <span className="submission-actions">
                <button
                  type="button"
                  disabled={!canUseReview}
                  onClick={(event) => {
                    event.stopPropagation();
                    openReviewDetail(submission);
                  }}
                >
                  <FileText size={14} />
                  查看详情
                </button>
              </span>
            </div>
          ))}
        </div>

          </div>
        )}

        {teacherModule === "knowledge" && (
          <div className="teacher-module-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">资料管理</span>
                <h3>教学资源库</h3>
              </div>
            </div>
            <div className="knowledge-module-layout">
              <section className="knowledge-module-card">
                <div className="panel-title compact">
                  <div>
                    <span className="eyebrow">目录管理</span>
                    <h4>知识库目录</h4>
                  </div>
                </div>
                <div className="knowledge-create-panel knowledge-directory-panel">
                  <div className="knowledge-create-form knowledge-create-form--directory">
                    <label>
                      <span>目录名称</span>
                      <input value={newKnowledgeName} onChange={(event) => setNewKnowledgeName(event.target.value)} placeholder="如：就业访谈知识库" />
                    </label>
                    <button className="knowledge-inline-action" type="button" onClick={handleCreateKnowledgeBase}>
                      <Save size={15} />
                      新建目录
                    </button>
                  </div>
                  <form className="knowledge-directory-search-form" onSubmit={applyKnowledgeDirectorySearch}>
                    <label className="knowledge-directory-search">
                      <span>目录查询</span>
                      <input
                        value={knowledgeDirectorySearchDraft}
                        onChange={(event) => setKnowledgeDirectorySearchDraft(event.target.value)}
                        placeholder="输入目录名称或适用模块"
                      />
                    </label>
                    <button className="knowledge-inline-action" type="submit">
                      查询
                    </button>
                  </form>
                </div>
                <div className="knowledge-base-directory-list">
                  {knowledgeDirectoryRows.map((base) => {
                    const fileCount = props.knowledgeUploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === base.category).length;
                    const enabled = props.knowledgeBaseStates[base.category] !== false;
                    return (
                      <article key={base.category}>
                        <div>
                          <strong>{base.category}知识库</strong>
                          <span>{fileCount} 份资料 · {enabled ? "已开放" : "已停用"}</span>
                        </div>
                        <div className="knowledge-directory-actions">
                          <button type="button" onClick={() => setKnowledgeBasePreviewCategory(base.category)}>
                            查看详情
                          </button>
                          <button type="button" onClick={() => handleToggleKnowledgeBaseState(base.category)}>
                            {enabled ? "停用" : "启用"}
                          </button>
                          <button
                            className="danger-text-button"
                            type="button"
                            onClick={() => props.onDeleteKnowledgeBase(base.category)}
                          >
                            删除
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="knowledge-module-card">
                <div className="panel-title compact">
                  <div>
                    <span className="eyebrow">资料管理</span>
                    <h4>教学资料</h4>
                  </div>
                </div>
                <div className="teacher-upload-toolbar">
                  <label className="knowledge-upload-target" htmlFor="teacher-upload-category">
                    <span>上传到知识库</span>
                    <strong>选择资料归属目录</strong>
                    <PrettySelect
                      value={uploadCategory}
                      ariaLabel="选择上传知识库"
                      options={activeKnowledgeCatalog.map((base) => ({ value: base.category, label: `${base.category}知识库` }))}
                      onChange={(value) => setUploadCategory(value)}
                    />
                  </label>
                  <p className="knowledge-base-hint">
                    {selectedUploadKnowledgeBase.description} 适用模块：{selectedUploadKnowledgeBase.usedBy}
                    {props.knowledgeBaseStates[uploadCategory] ? " 当前目录已开放给学生端调用。" : " 当前目录已被管理端停用，学生端暂不可调用。"}
                  </p>
                  <button
                    className="status-pill pending-jump upload-inline-button"
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={!props.permissionAccess.can("上传教学资料")}
                  >
                    <Upload size={15} />
                    {props.permissionAccess.can("上传教学资料") ? "上传资料" : "上传权限已停用"}
                  </button>
                </div>
                <input
                  ref={uploadInputRef}
                  className="visually-hidden-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
                  onChange={(event) => {
                    void handleLocalUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <form className="knowledge-search" onSubmit={applyKnowledgeSearch}>
                  <label className="knowledge-search-keyword">
                    <span>资料名称 / 文件类型 / 内容关键词</span>
                    <input
                      type="search"
                      placeholder="输入资料名称、文件类型或关键词"
                      value={knowledgeSearchDraft.keyword}
                      onChange={(event) => setKnowledgeSearchDraft((current) => ({ ...current, keyword: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>知识库</span>
                    <PrettySelect
                      value={knowledgeSearchDraft.category}
                      ariaLabel="筛选知识库"
                      options={[
                        { value: "ALL" as KnowledgeCategory | "ALL", label: "全部知识库" },
                        ...activeKnowledgeCatalog.map((base) => ({ value: base.category, label: `${base.category}知识库` })),
                      ]}
                      onChange={(value) => setKnowledgeSearchDraft((current) => ({ ...current, category: value }))}
                    />
                  </label>
                  <label>
                    <span>是否启用</span>
                    <PrettySelect
                      value={knowledgeSearchDraft.status}
                      ariaLabel="筛选启用状态"
                      options={[
                        { value: "ALL", label: "全部状态" },
                        { value: "enabled", label: "已启用" },
                        { value: "disabled", label: "未启用" },
                      ]}
                      onChange={(value) => setKnowledgeSearchDraft((current) => ({ ...current, status: value }))}
                    />
                  </label>
                  <div className="knowledge-search-actions">
                    <button className="primary-button" type="submit">
                      <Filter size={15} />
                      查询
                    </button>
                    <button className="ghost-button" type="button" onClick={resetKnowledgeSearch}>
                      重置
                    </button>
                  </div>
                </form>
                <div className="record-table knowledge-table">
                  <div className="table-row table-head">
                    <span>资料名称</span>
                    <span>知识库</span>
                    <span>文件信息</span>
                    <span>上传教师</span>
                    <span>上传时间</span>
                    <span>是否启用</span>
                    <span>操作</span>
                  </div>
                  {knowledgeFilteredUploads.length === 0 && (
                    <div className="submission-empty-row">暂无匹配资料，可以调整查询条件或先上传资料。</div>
                  )}
                  {knowledgeFilteredUploads.map((asset) => {
                    const category = asset.category || inferKnowledgeCategory(asset.name);
                    const enabled = asset.enabled !== false;
                    return (
                      <div className={`table-row ${selectedUpload?.id === asset.id ? "selected" : ""}`} key={asset.id}>
                        <span title={`${asset.name}\n${asset.preview}`}>
                          <strong>{asset.name}</strong>
                          <small>{asset.preview}</small>
                        </span>
                        <span title={`${category}知识库`}>{category}</span>
                        <span className="knowledge-file-meta" title={getKnowledgeFileTypeLabel(asset)}>
                          <em>{getKnowledgeFileTypeLabel(asset)}</em>
                          <small>{asset.sizeLabel}</small>
                        </span>
                        <span>{asset.uploadedBy || props.teacherName || "周老师"}</span>
                        <span>{formatSubmittedAt(asset.uploadedAt)}</span>
                        <span>
                          <em className={`knowledge-status ${enabled ? "enabled" : "disabled"}`}>{enabled ? "已启用" : "未启用"}</em>
                        </span>
                        <span className="knowledge-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUploadId(asset.id);
                              setKnowledgePreviewId(asset.id);
                            }}
                          >
                            <FileText size={14} />
                            查看
                          </button>
                          <button type="button" onClick={() => props.onToggleKnowledge(asset.id)}>
                            {enabled ? "停用" : "启用"}
                          </button>
                          <button
                            className="danger"
                            type="button"
                            onClick={() => {
                              if (knowledgePreviewId === asset.id) setKnowledgePreviewId(null);
                              props.onDeleteKnowledge(asset.id);
                            }}
                          >
                            删除
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

        {teacherModule === "prompts" && (
          <div className="teacher-module-panel teacher-prompt-manager">
            <div className="panel-title">
              <div>
                <span className="eyebrow">专家配置</span>
                <h3>专家配置与 Skill 管理</h3>
              </div>
            </div>
            <ExpertSkillManager
              actorLabel="教师端"
              knowledgeBases={props.knowledgeCatalog}
              refreshKey={teacherExpertListRefreshKey}
              onMessage={setKnowledgeSaveMessage}
              onConfirmed={handleTeacherExpertSkillConfirmed}
              onOpenExpert={openTeacherExpertDetail}
            />
            {isTeacherExpertDetailOpen && (
              <ExpertDetailModal
                expert={teacherPromptExpert}
                knowledgeCatalog={activeKnowledgeCatalog}
                knowledgeBaseStates={props.knowledgeBaseStates}
                selectedCategories={teacherPromptKnowledgeCategories}
                enabledKnowledgeCount={teacherPromptMeta.enabledKnowledgeCount}
                systemPrompt={teacherSystemPromptDraft}
                userPrompt={teacherUserPromptDraft}
                active={teacherExpertActiveDraft}
                canDelete={teacherManageableExperts.length > 1}
                onKnowledgeToggle={handleTeacherPromptKnowledgeToggle}
                onSystemPromptChange={setTeacherSystemPromptDraft}
                onUserPromptChange={setTeacherUserPromptDraft}
                onActiveChange={setTeacherExpertActiveDraft}
                onSave={() => void handleTeacherSavePrompt()}
                onDelete={() => setPendingDeleteExpertId(teacherPromptExpert.id)}
                onClose={() => setIsTeacherExpertDetailOpen(false)}
              />
            )}
          </div>
        )}

        {teacherModule === "issues" && (
          <div className="teacher-module-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">课堂监控</span>
                <h3>监控学生讨论中的常见问题</h3>
              </div>
            </div>
            <p className="teacher-module-copy">仅聚合已保存的 AI 参考诊断和教师反馈；没有可追踪证据时不生成问题比例。</p>
            <div className="issue-overview-grid">
              {issueOverviewCards.map((card) => (
                <button
                  className="issue-overview-card"
                  key={card.label}
                  type="button"
                  onClick={() => setSelectedIssueMetricLabel(card.label)}
                >
                  <strong>{card.value}</strong>
                  <span>{card.label}</span>
                  <p>{card.note}</p>
                  <small>查看详情</small>
                </button>
              ))}
            </div>
            <div className="issue-monitor-layout">
              <section className="issue-panel">
                <div className="issue-section-title">
                  <strong>问题热度排行</strong>
                  <span>点击查看证据和处理建议</span>
                </div>
                <div className="issue-bars teacher-issue-bars">
                  {issueEntries.length === 0 && (
                    <div className="submission-empty-row">暂无可核验的共性问题。请先在审核详情中生成 AI 参考诊断或保存教师反馈。</div>
                  )}
                  {issueEntries.map(([label, detail]) => (
                    <button
                      className={focusedIssueLabel === label ? "active" : ""}
                      key={label}
                      type="button"
                      onClick={() => setSelectedIssue(label)}
                    >
                      <span>
                        <b>{label}</b>
                        <em>{detail.affectedGroups} · 风险{detail.level}</em>
                      </span>
                      <strong style={{ width: detail.value }}>{detail.value}</strong>
                      <small>{detail.trend}</small>
                    </button>
                  ))}
                </div>
              </section>
              {activeIssue && (
                <section className="issue-panel issue-detail-panel">
                  <div className="issue-detail-heading">
                    <div>
                      <span className="eyebrow">当前关注</span>
                      <h3>{focusedIssueLabel}</h3>
                      <p>{activeIssue.affectedGroups}受影响，{activeIssue.trend}</p>
                    </div>
                    <strong>{activeIssue.value}</strong>
                  </div>
                  <div className="issue-insight-strip">
                    <article>
                      <span>建议优先级</span>
                      <strong>{activeIssuePlaybook.priority}</strong>
                    </article>
                    <article>
                      <span>证据缺口</span>
                      <strong>{activeIssuePlaybook.evidenceGap}</strong>
                    </article>
                    <article>
                      <span>教师介入点</span>
                      <strong>{activeIssuePlaybook.teacherMove}</strong>
                    </article>
                  </div>
                  <div className="issue-detail-grid issue-detail-grid-expanded">
                    <article>
                      <h5>典型表现</h5>
                      <ul>
                        {activeIssue.evidence.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <h5>节点指导建议</h5>
                      <ul>
                        {activeIssue.guidance.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <h5>课堂追问清单</h5>
                      <ul>
                        {activeIssuePlaybook.questions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <h5>下一轮审核口径</h5>
                      <ul>
                        {activeIssuePlaybook.reviewFocus.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                  <div className="issue-related-block">
                    <h5>相关成果</h5>
                    <div className="issue-related">
                      {renderIssueRelated(activeIssue)}
                    </div>
                  </div>
                </section>
              )}
            </div>
            {selectedIssueMetric && (
              <IssueMetricDetailModal metric={selectedIssueMetric} onClose={() => setSelectedIssueMetricLabel(null)} />
            )}
          </div>
        )}
      </section>

      {reviewActionMessage && <PromptSaveSuccessModal message={reviewActionMessage} onClose={() => setReviewActionMessage(null)} />}

    </div>
    {reviewDetailSubmission && (
      <div className="modal-backdrop teacher-review-detail-backdrop" role="presentation">
        <section className="media-modal review-detail-modal teacher-review-detail-modal" role="dialog" aria-modal="true" aria-label="成果详情">
          <header>
            <div>
              <span className="eyebrow">当前成果详情</span>
              <h3>{reviewDetailSubmission.artifactTitle}</h3>
              <p>{reviewDetailSubmission.artifactSummary}</p>
            </div>
            <button className="modal-close-button" type="button" onClick={() => setReviewDetailId(null)} aria-label="关闭">
              <X size={18} />
            </button>
          </header>
          <div className="review-detail-body">
            <section className="detail-card review-summary-card">
              <dl>
                <div>
                  <dt>成果类型</dt>
                  <dd>{artifactLabels[reviewDetailSubmission.artifactType]}</dd>
                </div>
                <div>
                  <dt>学生/小组</dt>
                  <dd>{reviewDetailSubmission.student} / {getStudentGroupDisplay(reviewDetailSubmission.group, reviewDetailSubmission.groupName)}</dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>{statusLabels[reviewDetailSubmission.status]}</dd>
                </div>
                <div>
                  <dt>提交时间</dt>
                  <dd>{formatSubmittedAt(reviewDetailSubmission.submittedAt)}</dd>
                </div>
              </dl>
            </section>
            <div className="review-ai-tabs" role="tablist" aria-label="教师审核详情">
              {[
                ["files", "提交材料"],
                ["diagnosis", "AI 项目诊断"],
                ["rubric", "Rubric 综合评分"],
                ["feedback", "教师反馈"],
              ].map(([tab, label]) => (
                  <button
                    className={reviewDetailTab === tab ? "active" : ""}
                    key={tab}
                    type="button"
                    onClick={() => openReviewTab(reviewDetailSubmission, tab as TeacherReviewTab)}
                  >
                    {label}
                  </button>
              ))}
            </div>
            {reviewDetailTab === "files" && (
              <section className="detail-card review-ai-panel">
                <span className="eyebrow">提交材料</span>
                {renderSubmissionAssetActions(reviewDetailSubmission)}
                <div className="review-blocks">
                  {reviewDetailSubmission.blocks.map((block) => (
                    <article key={block.title}>
                      <strong>{block.title}</strong>
                      {block.items.length === 1 && (block.items[0].length > 220 || /\n|#{1,6}\s|【正式回复】/.test(block.items[0])) ? (
                        <StructuredAiResponse content={block.items[0]} compact />
                      ) : (
                        <ul>
                          {block.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
            {reviewDetailTab === "diagnosis" && (
              <section className="detail-card review-ai-panel">
                <div className="review-ai-heading">
                  <div>
                    <span className="eyebrow">AI 参考诊断 · 教师确认</span>
                    <h4>基于真实提交材料生成诊断、追问和下一轮任务</h4>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={diagnosingSubmissionId === reviewDetailSubmission.id}
                    onClick={() => {
                      if (isSubmissionDiagnosed(reviewDetailSubmission)) {
                        openReviewTab(reviewDetailSubmission, "rubric");
                        return;
                      }
                      void startDiagnosis(reviewDetailSubmission);
                    }}
                  >
                    {isSubmissionDiagnosed(reviewDetailSubmission) && diagnosingSubmissionId !== reviewDetailSubmission.id ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    {diagnosingSubmissionId === reviewDetailSubmission.id
                      ? "诊断中"
                      : isSubmissionDiagnosed(reviewDetailSubmission)
                        ? "查看综合评分"
                        : "开始 AI 项目诊断"}
                  </button>
                </div>
                {(diagnosingSubmissionId === reviewDetailSubmission.id || !isSubmissionDiagnosed(reviewDetailSubmission)) && (
                  <div className="diagnosis-process">
                    {[
                      ["读取项目材料", "BP/PPT/访谈记录/答辩日志"],
                      ["解析商业模式", "价值主张、客群、收入、成本"],
                      ["对照 Rubric", "6 个评分维度加权评估"],
                      ["生成课堂追问", "问题、风险和下一轮任务"],
                    ].map(([title, detail], index) => (
                      <article className={diagnosingSubmissionId === reviewDetailSubmission.id ? "running" : ""} key={title} style={{ "--delay": `${index * 0.18}s` } as CSSProperties}>
                        <span>{diagnosingSubmissionId === reviewDetailSubmission.id ? "" : index + 1}</span>
                        <div>
                          <strong>{title}</strong>
                          <p>{detail}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {isSubmissionDiagnosed(reviewDetailSubmission) && diagnosingSubmissionId !== reviewDetailSubmission.id && (
                  <>
                    {getDiagnosis(reviewDetailSubmission)?.summary && (
                      <div className="diagnosis-summary">
                        <strong>诊断摘要</strong>
                        <p>{getDiagnosis(reviewDetailSubmission)?.summary}</p>
                      </div>
                    )}
                    <div className="diagnosis-result-grid">
                      {(["problems", "risks", "questions", "tasks"] as const).map((key) => {
                        const items = getDiagnosis(reviewDetailSubmission)?.[key] || [];
                        return (
                          <article key={key}>
                            <strong>
                              {key === "problems" ? "项目问题" : key === "risks" ? "风险提示" : key === "questions" ? "课堂追问建议" : "下一轮任务建议"}
                            </strong>
                            {items.length ? (
                              <ul>
                                {items.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p>本次未识别到可核验内容。</p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            )}
            {reviewDetailTab === "rubric" && (
              <section className="detail-card review-ai-panel">
                <div className="review-ai-heading">
                  <div>
                    <span className="eyebrow">Rubric 综合评分</span>
                    <h4>系统给出参考分，教师可调整终评</h4>
                  </div>
                  <strong className="rubric-total">
                    {((rubricDrafts[reviewDetailSubmission.id] || buildRubricScores(reviewDetailSubmission, getDiagnosis(reviewDetailSubmission))).reduce(
                      (sum, row) => sum + row.teacherScore,
                      0,
                    )).toFixed(1)}
                  </strong>
                </div>
                <div className="rubric-table">
                  {(rubricDrafts[reviewDetailSubmission.id] || buildRubricScores(reviewDetailSubmission, getDiagnosis(reviewDetailSubmission))).map((row, index) => (
                    <article key={row.name}>
                      <div>
                        <strong>{row.name}</strong>
                        <span>{row.description} · 权重 {row.weight}</span>
                      </div>
                      <em>{row.aiScore}</em>
                      <input
                        type="number"
                        min="0"
                        max={row.weight}
                        step="0.5"
                        value={row.teacherScore}
                        onChange={(event) => updateRubricScore(reviewDetailSubmission, index, event.target.value)}
                      />
                    </article>
                  ))}
                </div>
                <div className="rubric-confirm-bar">
                  <p>{isSubmissionDiagnosed(reviewDetailSubmission) ? "系统参考评分只作为教师审核参考，确认后会写入教师反馈草稿。" : "请先完成项目诊断，再确认评分。"}</p>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!isSubmissionDiagnosed(reviewDetailSubmission)}
                    onClick={() => confirmRubric(reviewDetailSubmission)}
                  >
                    <CheckCircle2 size={16} />
                    确认评分并生成反馈
                  </button>
                </div>
              </section>
            )}
            {reviewDetailTab === "feedback" && (
              <section className="detail-card review-ai-panel">
                <span className="eyebrow">节点解答与指导</span>
                <h4>{artifactLabels[reviewDetailSubmission.artifactType]} 审核意见</h4>
                <label className="field-label" htmlFor="teacher-comment-modal">
                  点评意见 / 退回修改建议
                </label>
                <textarea
                  id="teacher-comment-modal"
                  value={props.teacherComment}
                  disabled={!props.permissionAccess.can("节点解答与指导")}
                  onChange={(event) => props.onTeacherCommentChange(event.target.value)}
                />
                <div className="review-detail-actions-bar">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => handleSubmitRubric(reviewDetailSubmission)}
                  >
                    <Sparkles size={17} />
                    提交评分
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={reviewDetailSubmission.status === "withdrawn" || !canUseReview}
                    onClick={() => handleReviewApproved(reviewDetailSubmission)}
                  >
                    <CheckCircle2 size={17} />
                    {canUseReview ? "通过审核" : "审核权限已停用"}
                  </button>
                  <button
                    className="ghost-button danger"
                    type="button"
                    disabled={reviewDetailSubmission.status === "withdrawn" || !canUseReview}
                    onClick={() => handleReviewRevision(reviewDetailSubmission)}
                  >
                    <PenLine size={17} />
                    {canUseReview ? "退回修改" : "审核权限已停用"}
                  </button>
                  <button
                    className={`ghost-button excellent-button ${reviewDetailSubmission.isExcellent ? "active" : ""}`}
                    type="button"
                    disabled={!props.permissionAccess.can("优秀成果标记")}
                    onClick={() => props.onToggleExcellent(reviewDetailSubmission.id)}
                  >
                    <Star size={16} />
                    {props.permissionAccess.can("优秀成果标记")
                      ? reviewDetailSubmission.isExcellent
                        ? "取消优秀"
                        : "标为优秀"
                      : "权限已停用"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    )}
    {knowledgePreviewAsset && (
      <div className="modal-backdrop" role="presentation">
        <section className="media-modal knowledge-detail-modal" role="dialog" aria-modal="true" aria-label="资料详情">
          <header>
            <div>
              <span className="eyebrow">资料详情</span>
              <h3>{knowledgePreviewAsset.name}</h3>
              <p>{knowledgePreviewAsset.preview}</p>
            </div>
            <button className="modal-close-button" type="button" onClick={() => setKnowledgePreviewId(null)} aria-label="关闭">
              <X size={18} />
            </button>
          </header>
          <div className="review-detail-body">
            <section className="detail-card review-summary-card">
              <dl>
                <div>
                  <dt>所属知识库</dt>
                  <dd>{knowledgePreviewAsset.category || inferKnowledgeCategory(knowledgePreviewAsset.name)}</dd>
                </div>
                <div>
                  <dt>文件类型</dt>
                  <dd>{getKnowledgeFileTypeLabel(knowledgePreviewAsset)}</dd>
                </div>
                <div>
                  <dt>文件大小</dt>
                  <dd>{knowledgePreviewAsset.sizeLabel}</dd>
                </div>
                <div>
                  <dt>上传教师</dt>
                  <dd>{knowledgePreviewAsset.uploadedBy || props.teacherName || "周老师"}</dd>
                </div>
                <div>
                  <dt>是否启用</dt>
                  <dd>{knowledgePreviewAsset.enabled === false ? "未启用" : "已启用"}</dd>
                </div>
                <div>
                  <dt>上传时间</dt>
                  <dd>{formatSubmittedAt(knowledgePreviewAsset.uploadedAt)}</dd>
                </div>
              </dl>
            </section>
              <section className="detail-card">
                <span className="eyebrow">资料预览</span>
                <p>{knowledgePreviewAsset.preview}</p>
                <div className="teacher-file-actions">
                  <button type="button" onClick={() => previewKnowledgeAsset(knowledgePreviewAsset, props.onPreviewWord)}>
                    <MonitorPlay size={15} />
                    预览资料
                  </button>
                  <button type="button" onClick={() => downloadKnowledgeAsset(knowledgePreviewAsset)}>
                    <Download size={15} />
                    {knowledgePreviewAsset.fileDataUrl ? "下载原文件" : "下载资料说明"}
                  </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    )}
      {knowledgeBasePreviewItem && (
        <KnowledgeBaseDetailModal
          item={knowledgeBasePreviewItem}
          uploads={props.knowledgeUploads}
          enabled={props.knowledgeBaseStates[knowledgeBasePreviewItem.category] !== false}
          actorLabel="教师端维护"
          onClose={() => setKnowledgeBasePreviewCategory(null)}
          onToggle={() => handleToggleKnowledgeBaseState(knowledgeBasePreviewItem.category)}
          onDelete={() => {
            setKnowledgeBasePreviewCategory(null);
            props.onDeleteKnowledgeBase(knowledgeBasePreviewItem.category);
          }}
        />
      )}
      {pendingDeleteExpert && (
        <ExpertDeleteConfirmModal
          expert={pendingDeleteExpert}
          onCancel={() => setPendingDeleteExpertId(null)}
          onConfirm={confirmTeacherDeleteExpert}
        />
      )}
      {isPromptSaveOpen && <PromptSaveSuccessModal onClose={() => setIsPromptSaveOpen(false)} />}
      {knowledgeSaveMessage && <PromptSaveSuccessModal message={knowledgeSaveMessage} onClose={() => setKnowledgeSaveMessage(null)} />}
    </>
  );
}

function AdminView(props: {
  accountRecords: AccountRecord[];
  studentGroups: StudentGroup[];
  onAccountRecordsChange: (records: AccountRecord[]) => void;
  onStudentGroupsChange: (groups: StudentGroup[]) => void;
  generatedAssets: GeneratedAsset[];
  knowledgeUploads: KnowledgeUpload[];
  knowledgeCatalog: KnowledgeBaseCatalogItem[];
  knowledgeBaseStates: KnowledgeBaseStates;
  promptKnowledgeRoutes: PromptKnowledgeRoutes;
  customExperts: CustomExpertRecord[];
  adminName: string;
  onKnowledgeBaseStatesChange: (states: KnowledgeBaseStates) => void;
  onKnowledgeCatalogChange: (catalog: KnowledgeBaseCatalogItem[]) => void;
  onPromptKnowledgeRoutesChange: (routes: PromptKnowledgeRoutes) => void;
  onCustomExpertsChange: (experts: CustomExpertRecord[]) => void;
  onExpertSkillConfirmed: (result: ExpertSkillConfirmationRecord) => void;
  onSaveExpertPrompt: (
    expertId: ExpertId,
    systemPrompt: string,
    userPrompt: string,
    categories: KnowledgeCategory[],
    active: boolean,
  ) => Promise<void>;
  onDeleteExpert: (expertId: ExpertId) => boolean;
  onDeleteKnowledgeBase: (category: KnowledgeCategory) => boolean;
  onUploadKnowledge: (assets: KnowledgeUpload[]) => void;
  onDeleteKnowledge: (id: string) => void;
  onToggleKnowledge: (id: string) => void;
  submissions: Submission[];
}) {
  const { onAccountRecordsChange, onStudentGroupsChange } = props;
  const [adminTab, setAdminTab] = useState<"resources" | "audit" | "monitor" | "knowledge" | "prompts" | "evaluation">("resources");
  const [selectedKanbanGroupId, setSelectedKanbanGroupId] = useState<string | null>(null);
  const [selectedGroupDetailId, setSelectedGroupDetailId] = useState<string | null>(null);
  const [promptExpertId, setPromptExpertId] = useState<ExpertId>("brainstorm");
  const [pendingDeleteExpertId, setPendingDeleteExpertId] = useState<ExpertId | null>(null);
  const [isAdminExpertDetailOpen, setIsAdminExpertDetailOpen] = useState(false);
  const accountRecords = props.accountRecords;
  const [selectedAccountId, setSelectedAccountId] = useState(() => accountRecords[0]?.id || "");
  const [accountDetailId, setAccountDetailId] = useState<string | null>(null);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<string | null>(null);
  const [pendingDeleteAccountId, setPendingDeleteAccountId] = useState<string | null>(null);
  const [isAccountCreateOpen, setIsAccountCreateOpen] = useState(false);
  const [newAccountRole, setNewAccountRole] = useState<Role>("student");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountLogin, setNewAccountLogin] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountQuota, setNewAccountQuota] = useState("240");
  const [newAccountGroupId, setNewAccountGroupId] = useState(props.studentGroups[2]?.id || props.studentGroups[0]?.id || "");
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newGroupProjectName, setNewGroupProjectName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupEditDraft, setGroupEditDraft] = useState({ label: "", projectName: "" });
  const [accountEditDraft, setAccountEditDraft] = useState({
    name: "",
    account: "",
    quota: "",
    groupId: "",
  });
  const [adminUploadCategory, setAdminUploadCategory] = useState<KnowledgeCategory>("教学大纲");
  const [adminKnowledgeSearchDraft, setAdminKnowledgeSearchDraft] = useState<KnowledgeUploadSearch>(emptyKnowledgeUploadSearch);
  const [adminKnowledgeSearch, setAdminKnowledgeSearch] = useState<KnowledgeUploadSearch>(emptyKnowledgeUploadSearch);
  const [adminKnowledgePreviewId, setAdminKnowledgePreviewId] = useState<string | null>(null);
  const [adminKnowledgeName, setAdminKnowledgeName] = useState("");
  const [adminKnowledgeDirectorySearchDraft, setAdminKnowledgeDirectorySearchDraft] = useState("");
  const [adminKnowledgeDirectorySearch, setAdminKnowledgeDirectorySearch] = useState("");
  const [adminKnowledgeBasePreviewCategory, setAdminKnowledgeBasePreviewCategory] = useState<KnowledgeCategory | null>(null);
  const [knowledgeSaveMessage, setKnowledgeSaveMessage] = useState<string | null>(null);
  const [adminExpertListRefreshKey, setAdminExpertListRefreshKey] = useState(0);
  const adminManageableExperts = mergeManageableExperts(experts, props.customExperts);
  const initialAdminPromptExpert = adminManageableExperts.find((expert) => expert.id === "brainstorm") || adminManageableExperts[0];
  const initialAdminPromptParts = buildPromptTemplateParts(
    initialAdminPromptExpert,
    props.knowledgeUploads,
    props.knowledgeBaseStates,
    props.promptKnowledgeRoutes[initialAdminPromptExpert.id],
  );
  const [adminSystemPromptDraft, setAdminSystemPromptDraft] = useState(initialAdminPromptParts.system);
  const [adminUserPromptDraft, setAdminUserPromptDraft] = useState(initialAdminPromptParts.user);
  const [adminExpertActiveDraft, setAdminExpertActiveDraft] = useState(initialAdminPromptExpert.active !== false);
  const [isPromptSaveOpen, setIsPromptSaveOpen] = useState(false);
  const [accountSaveMessage, setAccountSaveMessage] = useState<string | null>(null);
  const [adminDataLoading, setAdminDataLoading] = useState(true);
  const [operationsReport, setOperationsReport] = useState<AdminOperationsReport | null>(null);
  const [operationsError, setOperationsError] = useState("");
  const adminUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listAdminGroups(), listAdminAccounts(), getAdminOperations()])
      .then(([remoteGroups, remoteAccounts, report]) => {
        if (!active) return;
        const groups = remoteGroups.map(mapAdminGroup);
        onStudentGroupsChange(groups);
        onAccountRecordsChange(remoteAccounts.map((account) => mapAdminAccount(account, groups)));
        setOperationsReport(report);
        setOperationsError("");
      })
      .catch((error) => {
        if (active) {
          const message = error instanceof Error ? error.message : "管理端数据加载失败";
          setAccountSaveMessage(message);
          setOperationsError(message);
        }
      })
      .finally(() => {
        if (active) setAdminDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onAccountRecordsChange, onStudentGroupsChange]);

  useEffect(() => {
    if (adminTab !== "monitor" && adminTab !== "evaluation") return;
    let active = true;
    const refresh = () => {
      getAdminOperations()
        .then((report) => {
          if (!active) return;
          setOperationsReport(report);
          setOperationsError("");
        })
        .catch((error) => {
          if (active) setOperationsError(error instanceof Error ? error.message : "运行数据加载失败");
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [adminTab]);

  function openAccountDetail(account: AccountRecord) {
    setAccountEditDraft({
      name: account.name,
      account: account.account,
      quota: String(account.quota),
      groupId: account.groupId || "",
    });
    setAccountDetailId(account.id);
  }

  const pendingCount = props.submissions.filter((item) => item.status === "pending").length;
  const approvedCount = props.submissions.filter((item) => item.status === "approved").length;
  const revisionCount = props.submissions.filter((item) => item.status === "revision").length;
  const excellentCount = props.submissions.filter((item) => item.isExcellent).length;
  const processedRate = Math.min(100, Math.round(((approvedCount + revisionCount) / Math.max(1, props.submissions.length)) * 100));
  const passRate = Math.round((approvedCount / Math.max(1, props.submissions.length)) * 100);
  const evaluationSubmissionCount = operationsReport?.submissions.total ?? props.submissions.length;
  const evaluationApprovedCount = operationsReport?.submissions.approved ?? approvedCount;
  const evaluationRevisionCount = operationsReport?.submissions.revision ?? revisionCount;
  const evaluationExcellentCount = operationsReport?.submissions.excellent ?? excellentCount;
  const evaluationProcessedRate = operationsReport?.submissions.processedRate ?? processedRate;
  const evaluationPassRate = operationsReport?.submissions.passRate ?? passRate;
  const tabs = [
    ["resources", "账号与权限管理", Settings2],
    ["audit", "AI 用量统计", BarChart3],
    ["monitor", "运行监控中心", BarChart3],
    ["knowledge", "知识库管理", BookOpen],
              ["prompts", "专家配置与 Skill 管理", Sparkles],
    ["evaluation", "试点运营评估", LineChart],
  ] as const;
  const kanbanProjects = props.studentGroups.map((group) => {
    const groupSubmissions = props.submissions.filter(
      (submission) => submission.group === group.label || submission.groupName === group.projectName || submission.group === group.projectName,
    );
    const latestSubmission = [...groupSubmissions].sort((a, b) => getSubmissionStageIndex(b) - getSubmissionStageIndex(a))[0];
    const stageIndex = latestSubmission ? getSubmissionStageIndex(latestSubmission) : 0;
    const pending = groupSubmissions.filter((submission) => submission.status === "pending").length;
    const excellent = groupSubmissions.filter((submission) => submission.isExcellent).length;
    const members = accountRecords.filter((account) => account.role === "student" && resolveAccountGroup(account, props.studentGroups).groupId === group.id);
    return {
      group,
      stageIndex,
      stageLabel: projectKanbanStages[stageIndex]?.label || projectKanbanStages[0].label,
      progress: latestSubmission ? Math.min(100, Math.round(((stageIndex + 1) / projectKanbanStages.length) * 100)) : 0,
      latestSubmission,
      pending,
      excellent,
      members,
      submissions: groupSubmissions,
    };
  });
  const selectedKanbanProject = selectedKanbanGroupId ? kanbanProjects.find((project) => project.group.id === selectedKanbanGroupId) || null : null;
  const selectedGroupDetail = selectedGroupDetailId ? kanbanProjects.find((project) => project.group.id === selectedGroupDetailId) || null : null;
  const promptExpert = adminManageableExperts.find((expert) => expert.id === promptExpertId) || adminManageableExperts[0];
  const pendingDeleteExpert = pendingDeleteExpertId ? adminManageableExperts.find((expert) => expert.id === pendingDeleteExpertId) || null : null;
  const adminPromptKnowledgeCategories = props.promptKnowledgeRoutes[promptExpert.id] || getExpertKnowledgeCategories(promptExpert.id);
  const enabledKnowledgeCount = props.knowledgeUploads.filter(
    (asset) =>
      asset.enabled !== false &&
      props.knowledgeBaseStates[asset.category || inferKnowledgeCategory(asset.name)] &&
      adminPromptKnowledgeCategories.includes(asset.category || inferKnowledgeCategory(asset.name)),
  ).length;
  const accountDetail = accountDetailId ? accountRecords.find((account) => account.id === accountDetailId) || null : null;
  const studentGroupRows = props.studentGroups.map((group) => ({
    ...group,
    studentCount: accountRecords.filter((account) => account.role === "student" && resolveAccountGroup(account, props.studentGroups).groupId === group.id).length,
  }));
  const pendingDeleteGroup = pendingDeleteGroupId ? studentGroupRows.find((group) => group.id === pendingDeleteGroupId) || null : null;
  const pendingDeleteAccount = pendingDeleteAccountId ? accountRecords.find((account) => account.id === pendingDeleteAccountId) || null : null;
  const adminKnowledgeFilteredUploads = props.knowledgeUploads.filter((asset) => matchesKnowledgeUploadSearch(asset, adminKnowledgeSearch));
  const adminKnowledgePreviewAsset = adminKnowledgePreviewId
    ? props.knowledgeUploads.find((asset) => asset.id === adminKnowledgePreviewId) || null
    : null;
  const adminActiveKnowledgeCatalog = getActiveKnowledgeCatalog(props.knowledgeCatalog);
  const adminKnowledgeBasePreviewItem = adminKnowledgeBasePreviewCategory
    ? adminActiveKnowledgeCatalog.find((base) => base.category === adminKnowledgeBasePreviewCategory) || null
    : null;
  const adminKnowledgeDirectoryRows = adminActiveKnowledgeCatalog.filter((base) => {
    const keyword = adminKnowledgeDirectorySearch.trim().toLowerCase();
    if (!keyword) return true;
    return `${base.category} ${base.description} ${base.usedBy}`.toLowerCase().includes(keyword);
  });
  const selectedAdminUploadKnowledgeBase =
    adminActiveKnowledgeCatalog.find((base) => base.category === adminUploadCategory) ||
    adminActiveKnowledgeCatalog[0];
  const accountRoleSummary = [
    ["学生账号", accountRecords.filter((account) => account.role === "student").length, "按账号配置可调用专家、答辩模拟、成果提交"],
    ["教师账号", accountRecords.filter((account) => account.role === "teacher").length, "审核、退回修改、优秀成果标记、资料上传"],
    ["管理员账号", accountRecords.filter((account) => account.role === "admin").length, "账号权限、知识库、提示词和看板维护"],
    ["总调用配额", accountRecords.reduce((sum, account) => sum + account.quota, 0), "按账号分配，可人工调整"],
  ] as const;
  const monitorRows = [
    [
      "DeepSeek 调用",
      `${operationsReport?.providers.deepSeekCalls ?? 0} 次`,
      "近 30 天",
      `可核验 Token ${(operationsReport?.totalTokensLast30Days ?? 0).toLocaleString("zh-CN")}`,
    ],
    [
      "乐享 PPT",
      `${operationsReport?.providers.lexiangPptCalls ?? 0} 次`,
      "真实记录",
      "只统计已写入用量或生成任务的数据",
    ],
    [
      "WorkBuddy 视频",
      `${operationsReport?.providers.workBuddyVideoCompleted ?? 0}/${operationsReport?.providers.workBuddyVideoJobs ?? 0}`,
      "完成/提交",
      "仅在用户点击生成后创建一次任务",
    ],
    [
      "任务队列",
      `${operationsReport?.providers.runningJobs ?? 0} 运行 / ${operationsReport?.providers.queuedJobs ?? 0} 排队`,
      (operationsReport?.providers.failedJobs ?? 0) > 0 ? "有失败" : "正常",
      `${operationsReport?.providers.failedJobs ?? 0} 个失败任务；审核队列 ${operationsReport?.submissions.pending ?? pendingCount} 项`,
    ],
  ];
  const enabledKnowledgeCatalogCount = getActiveKnowledgeCatalog(props.knowledgeCatalog).filter(
    (base) => props.knowledgeBaseStates[base.category] !== false,
  ).length;
  const enabledKnowledgeAssetCount = props.knowledgeUploads.filter((asset) => asset.enabled !== false).length;
  const dashboardStudentCount = operationsReport?.accounts.students ?? accountRecords.filter((account) => account.role === "student").length;
  const dashboardArtifactCount = operationsReport?.artifactCount ?? props.submissions.length;
  const dashboardKpis = [
    ["学生账号", dashboardStudentCount, "人", Users],
    ["项目小组", operationsReport?.groupCount ?? kanbanProjects.length, "组", Layers3],
    ["待审核成果", operationsReport?.submissions.pending ?? pendingCount, "项", ClipboardCheck],
    ["生成成果", dashboardArtifactCount, "份", FileText],
    ["启用知识库", operationsReport?.knowledge.activeBases ?? enabledKnowledgeCatalogCount, "类", BookOpen],
    ["审核处理率", operationsReport?.submissions.processedRate ?? processedRate, "%", LineChart],
  ] as const;
  const dashboardModelBaseRows = [
    ["DeepSeek", operationsReport?.providers.deepSeekCalls ?? 0],
    ["启用知识资料", operationsReport?.knowledge.activeAssets ?? enabledKnowledgeAssetCount],
    ["乐享 PPT", operationsReport?.providers.lexiangPptCalls ?? 0],
    ["WorkBuddy 视频", operationsReport?.providers.workBuddyVideoJobs ?? 0],
  ] as const;
  const dashboardModelTotal = dashboardModelBaseRows.reduce((sum, [, value]) => sum + value, 0) || 1;
  const dashboardModelRows = dashboardModelBaseRows.map(([name, value]) => ({
    name,
    value,
    percent: value === 0 ? 0 : Math.max(6, Math.round((value / dashboardModelTotal) * 100)),
  }));
  const dashboardExpertRows = experts
    .map((expert) => {
      const typeMap: Partial<Record<ExpertId, ArtifactType[]>> = {
        brainstorm: ["BRAINSTORM"],
        positioning: ["POSITIONING"],
        market: ["MARKET"],
        business: ["BP"],
        pitch: ["PPT"],
        script: ["SCRIPT"],
        defense: ["DEFENSE"],
        media: ["MEDIA"],
      };
      const matchedCount = props.submissions.filter((submission) => typeMap[expert.id]?.includes(submission.artifactType)).length;
      return {
        id: expert.id,
        name: expert.name.replace("专家", ""),
        count: matchedCount,
      };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const dashboardExpertMax = Math.max(...dashboardExpertRows.map((row) => row.count), 1);
  const dashboardStageRows = projectKanbanStages.map((stage, stageIndex) => {
    const count = kanbanProjects.filter((project) => project.stageIndex === stageIndex).length;
    return {
      label: stage.label,
      count,
      percent: Math.round((count / Math.max(1, kanbanProjects.length)) * 100),
    };
  });
  const dashboardLateStageCount = kanbanProjects.filter((project) => project.stageIndex >= 5).length;
  const dashboardAverageProgress = Math.round(
    kanbanProjects.reduce((sum, project) => sum + project.progress, 0) / Math.max(1, kanbanProjects.length),
  );
  const dashboardRunSummary = [
    ["运行小组", `${kanbanProjects.length}`, "组正在推进"],
    ["路演阶段", `${dashboardLateStageCount}`, "组进入 PPT / 答辩"],
    ["待审成果", `${pendingCount}`, "项等待教师处理"],
    ["平均进度", `${dashboardAverageProgress}%`, `${excellentCount} 项优秀沉淀`],
  ] as const;
  const dashboardFeedRows = [
    ...props.submissions.slice(-6).reverse().map((submission) => ({
      id: `submission-${submission.id}`,
      time: formatSubmittedAt(submission.submittedAt),
      group: submission.groupName || submission.group || "未分组项目",
      title: `提交 ${artifactLabels[submission.artifactType]}`,
      detail: `${submission.student} · ${statusLabels[submission.status]} · ${submission.artifactTitle}`,
    })),
    ...props.generatedAssets.slice(-4).reverse().map((asset) => ({
      id: `asset-${asset.id}`,
      time: formatSubmittedAt(asset.createdAt),
      group: asset.type === "PPT" ? "PPT 生成" : "视频生成",
      title: asset.title,
      detail: asset.type === "PPT" ? "已进入成果缓存，可用于预览和下载" : "已进入多媒体成果区，可用于演示渲染",
    })),
    ...props.knowledgeUploads.slice(-3).reverse().map((asset) => ({
      id: `knowledge-${asset.id}`,
      time: formatSubmittedAt(asset.uploadedAt),
      group: asset.category || inferKnowledgeCategory(asset.name),
      title: `更新资料：${asset.name}`,
      detail: `${asset.uploadedBy || "教师/管理员"} · ${asset.enabled === false ? "未启用" : "已启用"}`,
    })),
  ].slice(0, 8);
  const dashboardTeacherQueueRows = props.submissions
    .filter((submission) => submission.status === "pending" || submission.status === "revision")
    .slice(0, 5);
  function openBigscreen() {
    window.open("/bigscreen/index.html", "_blank", "noopener,noreferrer");
  }
  const evaluationIssueEntries = Object.entries(buildTeacherIssueDetails(props.submissions));
  const groupsWithSubmission = kanbanProjects.filter((project) => project.submissions.length > 0).length;
  const groupsAtBpOrLater = kanbanProjects.filter((project) => project.latestSubmission && project.stageIndex >= 4).length;
  const diagnosedSubmissionCount = props.submissions.filter((submission) => submission.aiDiagnosis).length;
  const teacherFeedbackCount = props.submissions.filter((submission) => submission.teacherComment?.trim()).length;
  const effectRows = [
    [
      "小组阶段参与率",
      `${kanbanProjects.length ? Math.round((groupsWithSubmission / kanbanProjects.length) * 100) : 0}%`,
      `${groupsWithSubmission}/${kanbanProjects.length} 组`,
      "按至少提交过一项阶段成果的小组统计",
    ],
    ["成果通过率", `${evaluationPassRate}%`, `${evaluationApprovedCount}/${evaluationSubmissionCount} 项`, "按当前未撤回成果与审核状态统计"],
    ["退回修改数", `${evaluationRevisionCount} 项`, "当前记录", "退回原因以教师反馈和 AI 参考诊断为准"],
    ["优秀案例数", `${evaluationExcellentCount} 项`, "教师标记", "只统计教师已标记的优秀成果"],
  ];
  const aiEvaluationBlocks = [
    {
      title: "系统数据汇总",
      items: [
        `当前数据库有 ${operationsReport?.accounts.students ?? dashboardStudentCount} 个学生账号、${operationsReport?.groupCount ?? kanbanProjects.length} 个项目小组。`,
        `累计保存 ${evaluationSubmissionCount} 项未撤回成果，审核处理率 ${evaluationProcessedRate}%，通过率 ${evaluationPassRate}%。`,
        `${groupsAtBpOrLater} 个小组已提交 BP 或更后阶段成果；教师标记优秀成果 ${evaluationExcellentCount} 项。`,
      ],
    },
    {
      title: "当前可验证成效",
      items: [
        `教师反馈已保存 ${teacherFeedbackCount} 项，AI 参考诊断已保存 ${diagnosedSubmissionCount} 项。`,
        `启用知识库 ${operationsReport?.knowledge.activeBases ?? enabledKnowledgeCatalogCount} 个，启用知识资料 ${operationsReport?.knowledge.activeAssets ?? enabledKnowledgeAssetCount} 份。`,
        `近 30 天 DeepSeek ${operationsReport?.providers.deepSeekCalls ?? 0} 次、乐享 PPT ${operationsReport?.providers.lexiangPptCalls ?? 0} 次、WorkBuddy 视频任务 ${operationsReport?.providers.workBuddyVideoJobs ?? 0} 次。`,
      ],
    },
    {
      title: "下一步建议",
      items: [
        evaluationIssueEntries.length
          ? `当前有证据的首要共性问题是“${evaluationIssueEntries[0][0]}”，建议回到对应成果逐项核验。`
          : "当前缺少已保存的诊断或教师反馈，暂不生成共性问题判断。",
        `当前仍有 ${operationsReport?.submissions.pending ?? pendingCount} 项待审核，应先完成教师确认再形成试点评估结论。`,
        "供应商能力只按真实成功记录计数，未调用时不能据此判断 PPT 或视频生成质量。",
      ],
    },
  ];
  const evaluationReviewBlocks = [
    {
      title: "阶段进展",
      tag: "数据库实时",
      items: [
        `${groupsWithSubmission} 个小组有阶段成果记录，${groupsAtBpOrLater} 个小组进入 BP 或更后阶段。`,
        `当前 ${evaluationApprovedCount} 项通过、${evaluationRevisionCount} 项退回修改、${operationsReport?.submissions.pending ?? pendingCount} 项待审核。`,
        `知识库已有 ${operationsReport?.knowledge.assets ?? props.knowledgeUploads.length} 份资料，其中 ${operationsReport?.knowledge.activeAssets ?? enabledKnowledgeAssetCount} 份启用。`,
      ],
    },
    {
      title: "关键发现",
      tag: `${evaluationIssueEntries.length} 类有证据问题`,
      items: evaluationIssueEntries.length
        ? evaluationIssueEntries.slice(0, 3).map(([label, detail]) => `${label}：${detail.trend}，${detail.affectedGroups}。`)
        : ["尚无足够的 AI 诊断或教师反馈，不能判断高频问题。"],
    },
    {
      title: "风险跟踪",
      tag: "需干预",
      items: [
        `${kanbanProjects.length - groupsWithSubmission} 个小组尚无阶段成果记录。`,
        `${operationsReport?.submissions.pending ?? pendingCount} 项成果等待教师审核，未确认前不应计入通过结论。`,
        `${operationsReport?.providers.failedJobs ?? 0} 个生成任务失败；需要从运行记录继续排查。`,
      ],
    },
    {
      title: "下阶段动作",
      tag: "按当前数据",
      items: [
        evaluationIssueEntries[0]?.[1].guidance[0] || "先积累真实诊断和教师反馈，再制定集中讲评主题。",
        "优先处理待审核成果，并由教师确认 AI 参考评分和反馈草稿。",
        evaluationExcellentCount ? `复核 ${evaluationExcellentCount} 项优秀成果是否具备进入课程案例库的条件。` : "当前暂无优秀成果标记，暂不进入案例沉淀。",
      ],
    },
  ];
  const evaluationEvidenceRows = [
    ["阶段成果", `${evaluationSubmissionCount} 项`, "来自 MySQL 中未撤回的成果提交"],
    ["教师反馈", `${teacherFeedbackCount} 条`, "来自教师已保存的审核意见"],
    ["AI 参考诊断", `${diagnosedSubmissionCount} 项`, "由教师主动触发并持久化"],
    ["待重点跟进", `${operationsReport?.submissions.pending ?? pendingCount} 项`, "当前仍处于待审核状态"],
  ];

  function applyAdminKnowledgeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminKnowledgeSearch(adminKnowledgeSearchDraft);
  }

  function resetAdminKnowledgeSearch() {
    setAdminKnowledgeSearchDraft(emptyKnowledgeUploadSearch);
    setAdminKnowledgeSearch(emptyKnowledgeUploadSearch);
  }

  function applyAdminKnowledgeDirectorySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminKnowledgeDirectorySearch(adminKnowledgeDirectorySearchDraft);
  }

  function handleAdminToggleKnowledgeBaseState(category: KnowledgeCategory) {
    const nextEnabled = !props.knowledgeBaseStates[category];
    props.onKnowledgeBaseStatesChange({ ...props.knowledgeBaseStates, [category]: nextEnabled });
    setKnowledgeSaveMessage(`已${nextEnabled ? "启用" : "停用"}「${category}知识库」，学生端、教师端和提示词配置会同步更新。`);
  }

  function confirmAdminDeleteExpert() {
    if (!pendingDeleteExpert) return;
    const expertId = pendingDeleteExpert.id;
    if (props.onDeleteExpert(expertId)) {
      const nextExpert = adminManageableExperts.find((expert) => expert.id !== expertId) || adminManageableExperts[0];
      const nextCategories = props.promptKnowledgeRoutes[nextExpert.id] || getExpertKnowledgeCategories(nextExpert.id);
      const nextParts = buildPromptTemplateParts(nextExpert, props.knowledgeUploads, props.knowledgeBaseStates, nextCategories);
      setPromptExpertId(nextExpert.id);
      setAdminSystemPromptDraft(nextParts.system);
      setAdminUserPromptDraft(nextParts.user);
      setAdminExpertActiveDraft(nextExpert.active !== false);
      setKnowledgeSaveMessage("专家已删除，并同步到教师端和学生端专家列表。");
      setIsAdminExpertDetailOpen(false);
      setAdminExpertListRefreshKey((current) => current + 1);
    }
    setPendingDeleteExpertId(null);
  }

  function handleAdminPromptKnowledgeToggle(category: KnowledgeCategory) {
    const nextCategories = toggleKnowledgeRouteCategory(adminPromptKnowledgeCategories, category);
    props.onPromptKnowledgeRoutesChange({ ...props.promptKnowledgeRoutes, [promptExpert.id]: nextCategories });
    const nextParts = buildPromptTemplateParts(
      promptExpert,
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      nextCategories,
    );
    setAdminSystemPromptDraft(nextParts.system);
    setAdminUserPromptDraft(nextParts.user);
  }

  function openAdminExpertDetail(expertId: string) {
    const nextExpert = adminManageableExperts.find((expert) => expert.id === expertId) || adminManageableExperts[0];
    const nextCategories = props.promptKnowledgeRoutes[nextExpert.id] || getExpertKnowledgeCategories(nextExpert.id);
    const nextParts = buildPromptTemplateParts(
      nextExpert,
      props.knowledgeUploads,
      props.knowledgeBaseStates,
      nextCategories,
    );
    setPromptExpertId(nextExpert.id);
    setAdminSystemPromptDraft(nextParts.system);
    setAdminUserPromptDraft(nextParts.user);
    setAdminExpertActiveDraft(nextExpert.active !== false);
    setIsAdminExpertDetailOpen(true);
  }

  async function handleAdminSavePrompt() {
    try {
      await props.onSaveExpertPrompt(
        promptExpert.id,
        adminSystemPromptDraft,
        adminUserPromptDraft,
        adminPromptKnowledgeCategories,
        adminExpertActiveDraft,
      );
      setIsAdminExpertDetailOpen(false);
      setAdminExpertListRefreshKey((current) => current + 1);
      setIsPromptSaveOpen(true);
    } catch (error) {
      setKnowledgeSaveMessage(error instanceof Error ? error.message : "提示词保存失败");
    }
  }

  function handleAdminExpertSkillConfirmed(result: ExpertSkillConfirmationRecord) {
    props.onExpertSkillConfirmed(result);
    let nextStates = props.knowledgeBaseStates;
    if (result.knowledgeBase) {
      nextStates = { ...nextStates, [result.knowledgeBase.category]: result.knowledgeBase.active };
    }
    const mapped = mapKnowledgeExpertRecord(result.expert);
    const nextParts = buildPromptTemplateParts(
      buildCustomExpert(mapped),
      props.knowledgeUploads,
      nextStates,
      result.expert.knowledgeCategories,
    );
    setPromptExpertId(mapped.id);
    setAdminSystemPromptDraft(nextParts.system);
    setAdminUserPromptDraft(nextParts.user);
    setAdminExpertActiveDraft(result.expert.active);
    setKnowledgeSaveMessage(`专家 Skill「${result.expert.name}」已保存${result.expert.active ? "并启用" : "，当前未启用"}。`);
  }

  function handleAdminCreateKnowledgeBase() {
    const category = adminKnowledgeName.trim();
    const usedBy = "学生端专家、教师审核、管理端提示词";
    if (!category) {
      setKnowledgeSaveMessage("请先填写知识库名称。");
      return;
    }
    if (props.knowledgeCatalog.some((item) => item.category === category)) {
      setKnowledgeSaveMessage("这个知识库目录已经存在。");
      return;
    }
    const nextItem: KnowledgeBaseCatalogItem = {
      category,
      description: `${category}：由管理端新增，可用于 ${usedBy}。`,
      usedBy,
    };
    const { nextCatalog, nextStates, nextRoutes } = syncKnowledgeCatalogAddition(
      props.knowledgeCatalog,
      props.knowledgeBaseStates,
      props.promptKnowledgeRoutes,
      nextItem,
    );
    props.onKnowledgeCatalogChange(nextCatalog);
    props.onKnowledgeBaseStatesChange(nextStates);
    props.onPromptKnowledgeRoutesChange(nextRoutes);
    setAdminUploadCategory(category);
    setAdminKnowledgeSearchDraft((current) => ({ ...current, category }));
    setAdminKnowledgeName("");
    setKnowledgeSaveMessage(`已新增知识库「${category}」，并同步到学生端和提示词目录。`);
  }

  async function handleAdminLocalUpload(files: FileList | null) {
    if (!files?.length) return;
    const uploaded = await Promise.all(
      Array.from(files).map(async (file) => {
        const canReadText =
          file.size < 250_000 &&
          (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md"));
        let text = "";
        if (canReadText) {
          try {
            text = await file.text();
          } catch {
            text = "";
          }
        }
        const fileDataUrl = await readFileAsDataUrl(file);
        return {
          id: makeId("K"),
          name: file.name,
          sizeLabel: formatFileSize(file.size),
          fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "本地文件",
          fileDataUrl,
          uploadedAt: nowDateTime(),
          uploadedBy: props.adminName || "平台管理员",
          preview: buildUploadPreview(file, text, adminUploadCategory),
          contentText: text || undefined,
          file,
          category: adminUploadCategory,
          enabled: true,
        };
      }),
    );
    props.onUploadKnowledge(uploaded);
  }

  function getDefaultPermissions(role: Role) {
    if (role === "student") return getStudentExpertPermissionNames();
    if (role === "teacher") return ["提交审核中心", "节点解答与指导", "优秀成果标记", "上传教学资料"];
    return ["账号权限管理", "知识库维护", "专家配置与 Skill 管理", "试点数据看板"];
  }

  function getDefaultQuota(role: Role) {
    if (role === "student") return 240;
    if (role === "teacher") return 520;
    return 1500;
  }

  function getPermissionDescription(permission: string, role: Role) {
    const expert = experts.find((item) => item.name === permission);
    if (role === "student" && expert) {
      return `允许学生在 AI 创意工作台中调用“${expert.name}”，用于${expert.scenario}。停用后学生端专家下拉中不再显示该专家。`;
    }
    const descriptions: Record<string, string> = {
      "AI 创意工作台": "允许学生进入对话式创意空间，选择专家和回答方式，由系统自动匹配技能，并按独立成果流程生成或导出 Word、PPTX、视频脚本等内容。",
      调用课程知识库: "允许学生端专家在生成时读取管理端已开放目录、教师端已启用资料，并把命中的资料作为知识来源标签。",
      答辩模拟: "允许学生基于已生成的 BP、PPT 或路演稿进入答辩模拟，进行语音或文本问答，并保存答辩评价与复盘记录。",
      提交老师审核: "允许学生将阶段成果发送到教师端提交审核中心，教师可查看内容、预览附件、通过或退回修改。",
      下载个人成果: "允许学生下载个人生成的 Word、PPTX、答辩复盘和多媒体物料包，仅限本人当前项目成果。",
      提交审核中心: "允许教师查看学生提交的全部阶段成果，按成果类型和审核状态筛选，并进入详情进行审核。",
      节点解答与指导: "允许教师围绕定位、BP、PPT、答辩等关键节点给出点评意见、退回修改建议和指导话术。",
      优秀成果标记: "允许教师将通过审核的高质量 BP、PPT、答辩记录或多媒体物料标记为优秀成果，进入成果沉淀。",
      上传教学资料: "允许教师从本地上传教学大纲、BP 模板、评分标准、案例库、答辩题库和多媒体模板等资料。",
      账号权限管理: "允许管理员开通、停用、删除学生/教师/管理员账号，并维护角色、项目小组、调用配额和权限范围。",
      知识库维护: "允许管理员维护知识库分类、查看教师上传资料、启用/停用资料，并管理资料详情。",
        "专家配置与 Skill 管理": "允许管理员上传来源档案、确认专家配置、绑定知识库，并查看提示词组装规则。",
      试点数据看板: "允许管理员查看提交、审核、调用、优秀成果沉淀等运营指标，并查看 AI 建设成效评估。",
    };
    if (descriptions[permission]) return descriptions[permission];
    if (role === "student") return "学生端业务权限，用于完成个人项目生成、提交、反馈和下载闭环。";
    if (role === "teacher") return "教师端教学管理权限，用于完成成果审核、节点指导和资料上传。";
    return "管理端运营权限，用于完成账号、知识库、提示词和试点数据管理。";
  }

  function getRoleTitle(role: Role) {
    if (role === "student") return "商学院创业实践课学生";
    if (role === "teacher") return "创业实践课程教师";
    return "教学平台运营管理员";
  }

  function getGroupById(groupId: string) {
    return props.studentGroups.find((group) => group.id === groupId) || props.studentGroups[0];
  }

  function buildStudentGroupPatch(groupId: string) {
    const group = getGroupById(groupId);
    if (!group) return {};
    return {
      groupId: group.id,
      groupLabel: group.label,
      groupName: group.projectName,
      groupOrScope: formatGroupScope(group),
    };
  }

  async function handleCreateStudentGroup() {
    const label = newGroupLabel.trim();
    const projectName = newGroupProjectName.trim();
    if (!label || !projectName) {
      setAccountSaveMessage("请填写组号和项目名称。");
      return;
    }
    try {
      const nextGroup = mapAdminGroup(await createAdminGroup(label, projectName));
      onStudentGroupsChange([nextGroup, ...props.studentGroups]);
      setNewAccountGroupId(nextGroup.id);
      setNewGroupLabel("");
      setNewGroupProjectName("");
      setAccountSaveMessage("学生小组已新增并写入数据库。");
    } catch (error) {
      setAccountSaveMessage(error instanceof Error ? error.message : "新增小组失败");
    }
  }

  function handleDeleteStudentGroup(group: StudentGroup, studentCount: number) {
    if (studentCount > 0) {
      setAccountSaveMessage(`“${group.label} / ${group.projectName}”已有 ${studentCount} 名学生，需先在账号详情中调整学生小组后再删除。`);
      return;
    }
    setPendingDeleteGroupId(group.id);
  }

  async function handleConfirmDeleteStudentGroup() {
    if (!pendingDeleteGroup) return;
    try {
      await deleteAdminGroup(pendingDeleteGroup.id);
      const nextGroups = props.studentGroups.filter((item) => item.id !== pendingDeleteGroup.id);
      onStudentGroupsChange(nextGroups);
      if (newAccountGroupId === pendingDeleteGroup.id) {
        setNewAccountGroupId(nextGroups[2]?.id || nextGroups[0]?.id || "");
      }
      setPendingDeleteGroupId(null);
      setAccountSaveMessage("学生小组已从数据库删除。");
    } catch (error) {
      setAccountSaveMessage(error instanceof Error ? error.message : "删除小组失败");
    }
  }

  function openGroupEditor(group: StudentGroup) {
    setEditingGroupId(group.id);
    setGroupEditDraft({ label: group.label, projectName: group.projectName });
  }

  async function handleSaveStudentGroup(groupId: string) {
    const label = groupEditDraft.label.trim();
    const projectName = groupEditDraft.projectName.trim();
    if (!label || !projectName) {
      setAccountSaveMessage("请填写组号和小组名称。");
      return;
    }
    try {
      const nextGroup = mapAdminGroup(await updateAdminGroup(groupId, label, projectName));
      onStudentGroupsChange(props.studentGroups.map((group) => (group.id === groupId ? nextGroup : group)));
      onAccountRecordsChange(
        accountRecords.map((account) =>
          account.role === "student" && resolveAccountGroup(account, props.studentGroups).groupId === groupId
            ? {
                ...account,
                groupId,
                groupLabel: label,
                groupName: projectName,
                groupOrScope: formatGroupScope(nextGroup),
              }
            : account,
        ),
      );
      setEditingGroupId(null);
      setAccountSaveMessage("小组名称已更新并写入数据库。");
    } catch (error) {
      setAccountSaveMessage(error instanceof Error ? error.message : "更新小组失败");
    }
  }

  async function handleCreateAccount() {
    const name = newAccountName.trim() || (newAccountRole === "student" ? `学生${accountRecords.length + 1}` : newAccountRole === "teacher" ? `教师${accountRecords.length + 1}` : `管理员${accountRecords.length + 1}`);
    const prefix = newAccountRole === "student" ? "student" : newAccountRole === "teacher" ? "teacher" : "admin";
    const loginAccount = newAccountLogin.trim() || `${prefix}${accountRecords.length + 1}@sufe.demo`;
    const quota = Math.max(0, Number.parseInt(newAccountQuota, 10) || getDefaultQuota(newAccountRole));
    const groupPatch = newAccountRole === "student" ? buildStudentGroupPatch(newAccountGroupId) : {};
    if (newAccountRole === "student" && !("groupId" in groupPatch)) {
      setAccountSaveMessage("请先为学生账号选择所属项目小组。");
      return;
    }
    if (newAccountPassword.length < 8) {
      setAccountSaveMessage("初始密码至少需要 8 位，且只在本次创建时提交。");
      return;
    }
    try {
      const remoteAccount = await createAdminAccount({
        account: loginAccount,
        password: newAccountPassword,
        role: newAccountRole.toUpperCase() as AdminAccount["role"],
        displayName: name,
        title: getRoleTitle(newAccountRole),
        quotaRemaining: quota,
        groupId: newAccountRole === "student" ? newAccountGroupId : undefined,
      });
      const next = mapAdminAccount(remoteAccount, props.studentGroups);
      onAccountRecordsChange([next, ...accountRecords]);
      setSelectedAccountId(next.id);
      setNewAccountName("");
      setNewAccountLogin("");
      setNewAccountPassword("");
      setNewAccountQuota(String(getDefaultQuota(newAccountRole)));
      setNewAccountGroupId(props.studentGroups[2]?.id || props.studentGroups[0]?.id || "");
      setIsAccountCreateOpen(false);
      setAccountSaveMessage("账号已创建并可使用后端认证登录，密码未在前端保存。");
    } catch (error) {
      setAccountSaveMessage(error instanceof Error ? error.message : "创建账号失败");
    }
  }

  async function handleToggleAccountStatus(id: string) {
    const target = accountRecords.find((account) => account.id === id);
    if (!target) return;
    try {
      const remoteAccount = await updateAdminAccount(id, {
        role: target.role.toUpperCase() as AdminAccount["role"],
        displayName: target.name,
        title: target.title,
        status: target.status === "已开通" ? "DISABLED" : "ACTIVE",
        quotaRemaining: target.quota,
        disabledPermissions: target.disabledPermissions || [],
        groupId: target.role === "student" ? target.groupId : undefined,
      });
      const next = mapAdminAccount(remoteAccount, props.studentGroups);
      onAccountRecordsChange(accountRecords.map((account) => (account.id === id ? next : account)));
      setAccountSaveMessage(`账号已${next.status === "已开通" ? "开通" : "停用"}。`);
    } catch (error) {
      setAccountSaveMessage(error instanceof Error ? error.message : "更新账号状态失败");
    }
  }

  function isPermissionEnabled(account: AccountRecord, permission: string) {
    return !(account.disabledPermissions || []).includes(permission);
  }

  async function handleToggleAccountPermission(accountId: string, permission: string) {
    const targetAccount = accountRecords.find((account) => account.id === accountId);
    const targetDisabledPermissions = targetAccount?.disabledPermissions || [];
    const studentExpertPermissions = getStudentExpertPermissionNames();
    if (
      targetAccount?.role === "student" &&
      studentExpertPermissions.includes(permission) &&
      !targetDisabledPermissions.includes(permission) &&
      studentExpertPermissions.filter((item) => !targetDisabledPermissions.includes(item)).length <= 1
    ) {
      setAccountSaveMessage("学生账号至少需要保留 1 个可用专家。");
      return;
    }
    if (!targetAccount) return;
    const nextDisabledPermissions = targetDisabledPermissions.includes(permission)
      ? targetDisabledPermissions.filter((item) => item !== permission)
      : [...targetDisabledPermissions, permission];
    try {
      const remoteAccount = await updateAdminAccount(accountId, {
        role: targetAccount.role.toUpperCase() as AdminAccount["role"],
        displayName: targetAccount.name,
        title: targetAccount.title,
        status: targetAccount.status === "已停用" ? "DISABLED" : "ACTIVE",
        quotaRemaining: targetAccount.quota,
        disabledPermissions: nextDisabledPermissions,
        groupId: targetAccount.role === "student" ? targetAccount.groupId : undefined,
      });
      const next = mapAdminAccount(remoteAccount, props.studentGroups);
      onAccountRecordsChange(accountRecords.map((account) => (account.id === accountId ? next : account)));
    } catch (error) {
      setAccountSaveMessage(error instanceof Error ? error.message : "更新账号权限失败");
    }
  }

  async function handleSaveAccountDetail() {
    if (!accountDetail) return;
    const name = accountEditDraft.name.trim();
    const quota = Math.max(0, Number.parseInt(accountEditDraft.quota, 10) || 0);
    if (!name) {
      setAccountSaveMessage("姓名不能为空。");
      return;
    }
    try {
      const remoteAccount = await updateAdminAccount(accountDetail.id, {
        role: accountDetail.role.toUpperCase() as AdminAccount["role"],
        displayName: name,
        title: accountDetail.title,
        status: accountDetail.status === "已停用" ? "DISABLED" : "ACTIVE",
        quotaRemaining: quota,
        disabledPermissions: accountDetail.disabledPermissions || [],
        groupId: accountDetail.role === "student" ? accountEditDraft.groupId : undefined,
      });
      const next = mapAdminAccount(remoteAccount, props.studentGroups);
      onAccountRecordsChange(accountRecords.map((item) => (item.id === accountDetail.id ? next : item)));
      setAccountSaveMessage("账号信息已保存到数据库。");
    } catch (error) {
      setAccountSaveMessage(error instanceof Error ? error.message : "保存账号失败");
    }
  }

  function handleDeleteAccount(id: string) {
    const account = accountRecords.find((item) => item.id === id);
    if (!account) return;
    setPendingDeleteAccountId(id);
  }

  async function handleConfirmDeleteAccount() {
    if (!pendingDeleteAccount) return;
    try {
      const id = pendingDeleteAccount.id;
      await deleteAdminAccount(id);
      const remaining = accountRecords.filter((item) => item.id !== id);
      onAccountRecordsChange(remaining);
      if (selectedAccountId === id) setSelectedAccountId(remaining[0]?.id || "");
      if (accountDetailId === id) setAccountDetailId(null);
      setPendingDeleteAccountId(null);
      setAccountSaveMessage("账号已从数据库删除。");
    } catch (error) {
      setAccountSaveMessage(error instanceof Error ? error.message : "删除账号失败");
    }
  }

  return (
    <section className="admin-shell admin-console-layout role-view-shell">
      <aside className="admin-console-side">
        <nav className="admin-tabs" aria-label="管理端模块切换">
          {tabs.map(([tab, label, Icon]) => (
            <button
              className={adminTab === tab ? "active" : ""}
              key={tab}
              type="button"
              onClick={() => {
                if (tab === "monitor") {
                  openBigscreen();
                  return;
                }
                setAdminTab(tab);
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="admin-console-main">
        <div className="admin-console-topbar">
          <div>
            <h3>{tabs.find(([tab]) => tab === adminTab)?.[1] || "平台运营管理中心"}</h3>
            <span>《创业中国》创业实践试点班 · 第 14 教学周</span>
          </div>
        </div>

      {adminTab === "resources" && (
        <div className="admin-page" key="admin-resources">
          <div className="admin-path-grid">
            <article>
              <Settings2 size={22} />
              <h4>账号与权限管理</h4>
              <p>管理员按学生、教师、管理员三类角色维护后端账号、权限范围、项目小组和调用配额；密码仅在创建时提交，不保存也不回显。</p>
            </article>
          </div>
          <div className="account-summary-grid">
            {accountRoleSummary.map(([label, value, detail]) => (
              <article key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                <p>{detail}</p>
              </article>
            ))}
          </div>
          <div className="admin-resource-layout">
            <section className="admin-resource-section student-group-manager">
              <div className="account-table-toolbar admin-resource-toolbar">
                <div>
                  <strong>项目小组管理</strong>
                  <span>维护项目小组及学生归属，新建学生账号时可直接绑定对应小组</span>
                </div>
                <div className="student-group-create">
                  <input aria-label="小组名称" value={newGroupLabel} onChange={(event) => setNewGroupLabel(event.target.value)} placeholder="如：第 11 组" />
                  <input aria-label="小组项目名称" value={newGroupProjectName} onChange={(event) => setNewGroupProjectName(event.target.value)} placeholder="项目名称" />
                  <button className="primary-button" type="button" onClick={handleCreateStudentGroup}>
                    新增小组
                  </button>
                </div>
              </div>
              <div className="student-group-grid">
                {studentGroupRows.map((group) => (
                  <article key={group.id}>
                    <div>
                      <span>{group.label}</span>
                      <strong>{group.projectName}</strong>
                      <em>{group.studentCount} 名学生</em>
                    </div>
                    <div className="student-group-actions">
                      <button type="button" onClick={() => setSelectedGroupDetailId(group.id)}>
                        查看详情
                      </button>
                      <button
                        className={`student-group-delete ${group.studentCount > 0 ? "disabled" : ""}`}
                        type="button"
                        onClick={() => handleDeleteStudentGroup(group, group.studentCount)}
                      >
                        删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="admin-resource-section account-management-layout">
              <div className="account-table-toolbar admin-resource-toolbar">
                <div>
                  <strong>账号权限管理</strong>
                  <span>{adminDataLoading ? "正在同步后端账号与小组数据…" : "账号、状态、配额、小组归属和权限开关均以 MySQL 为准"}</span>
                </div>
                <button className="primary-button" type="button" onClick={() => setIsAccountCreateOpen(true)}>
                  <Save size={16} />
                  新建账号
                </button>
              </div>
              <div className="account-table">
              <div className="table-row table-head">
                <span>姓名</span>
                <span>角色</span>
                <span>登录账号</span>
                <span>认证方式</span>
                <span>调用配额</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              {accountRecords.map((account) => (
                <article className="table-row" key={account.id}>
                  <span title={`${account.name} / ${account.groupOrScope}`}>
                    <strong>{account.name}</strong>
                    <small>{account.groupOrScope}</small>
                  </span>
                  <span>{account.role === "student" ? "学生端" : account.role === "teacher" ? "教师端" : "管理端"}</span>
                  <span title={account.account}>{account.account}</span>
                  <span>平台后端认证</span>
                  <span>{account.quota} 次</span>
                  <span>
                    <button
                      className={`account-status-toggle ${account.status === "已开通" ? "enabled" : "disabled"}`}
                      type="button"
                      onClick={() => handleToggleAccountStatus(account.id)}
                      disabled={adminDataLoading}
                    >
                      {account.status}
                    </button>
                  </span>
                  <span className="account-row-actions">
                    <button type="button" onClick={() => openAccountDetail(account)}>
                      查看详情
                    </button>
                    <button className="danger" type="button" onClick={() => handleDeleteAccount(account.id)}>
                      删除
                    </button>
                  </span>
                </article>
              ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {adminTab === "audit" && (
        <AdminAiUsagePanel />
      )}

      {adminTab === "monitor" && (
        <div className="admin-page admin-dashboard-page" key="admin-monitor">
          <div className={`admin-live-source ${operationsError ? "error" : ""}`}>
            <span>
              {operationsError
                ? `后端运行数据暂不可用：${operationsError}`
                : `数据来源：MySQL 与后端运行记录${operationsReport ? ` · 更新于 ${formatSubmittedAt(operationsReport.generatedAt)}` : " · 加载中"}`}
            </span>
            <button type="button" onClick={() => void getAdminOperations().then(setOperationsReport).catch((error) => setOperationsError(error instanceof Error ? error.message : "刷新失败"))}>
              <RotateCcw size={14} /> 刷新
            </button>
          </div>
          <div className="admin-dashboard-kpis">
            {dashboardKpis.map(([label, value, unit, Icon]) => (
              <article key={label}>
                <Icon size={18} />
                <span>{label}</span>
                <strong>
                  {value}
                  <small>{unit}</small>
                </strong>
              </article>
            ))}
          </div>

          <div className="admin-dashboard-grid">
            <aside className="dashboard-side-column">
              <section className="dashboard-glass-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">LIVE STATUS</span>
                    <h4>运行态势</h4>
                  </div>
                  <em>60s 自动刷新</em>
                </div>
                <div className="dashboard-monitor-list">
                  {monitorRows.map(([name, value, status, detail]) => (
                    <article key={name}>
                      <div>
                        <strong>{name}</strong>
                        <span>{detail}</span>
                      </div>
                      <b>{value}</b>
                      <em>{status}</em>
                    </article>
                  ))}
                </div>
              </section>

              <section className="dashboard-glass-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">MODEL ROUTING</span>
                    <h4>能力调用分布</h4>
                  </div>
                </div>
                <div className="dashboard-bars">
                  {dashboardModelRows.map((row) => (
                    <div key={row.name}>
                      <span>{row.name}</span>
                      <strong style={{ width: `${row.percent}%` }}>{row.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dashboard-glass-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">EXPERT CALLS</span>
                    <h4>专家成果分布</h4>
                  </div>
                </div>
                <div className="dashboard-expert-rank">
                  {dashboardExpertRows.length === 0 && <p className="dashboard-empty">暂无可统计的专家成果</p>}
                  {dashboardExpertRows.map((row) => (
                    <article key={row.id}>
                      <span>{row.name}</span>
                      <div>
                        <em style={{ width: `${Math.max(8, Math.round((row.count / dashboardExpertMax) * 100))}%` }} />
                      </div>
                      <strong>{row.count}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </aside>

            <main className="dashboard-center-column">
              <section className="dashboard-glass-panel dashboard-stage-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">8 STAGES · {kanbanProjects.length} GROUPS</span>
                    <h4>小组项目阶段推进</h4>
                  </div>
                  <em>{pendingCount} 项待审核 · {excellentCount} 项优秀成果</em>
                </div>
                <div className="dashboard-stage-strip">
                  <div className="dashboard-run-summary">
                    {dashboardRunSummary.map(([label, value, detail]) => (
                      <article key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <em>{detail}</em>
                      </article>
                    ))}
                  </div>
                  {dashboardStageRows.map((row) => (
                    <article key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.count} 组</strong>
                      <div>
                        <em style={{ width: `${Math.max(6, row.percent)}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
                <div className="admin-kanban-board dashboard-kanban-board">
                  {projectKanbanStages.map((stage, stageIndex) => {
                    const projects = kanbanProjects.filter((project) => project.stageIndex === stageIndex);
                    return (
                      <section className="kanban-column" key={stage.label}>
                        <header>
                          <strong>{stage.label}</strong>
                          <span>{projects.length} 组</span>
                        </header>
                        <div className="kanban-column-list">
                          {projects.length === 0 && <p className="kanban-empty">暂无小组停留在该阶段</p>}
                          {projects.map((project) => (
                            <button className="kanban-card" key={project.group.id} type="button" onClick={() => setSelectedKanbanGroupId(project.group.id)}>
                              <span>{project.group.label}</span>
                              <strong>{project.group.projectName}</strong>
                              <p>{project.latestSubmission?.artifactTitle || "已建立项目档案，等待下一次阶段成果提交。"}</p>
                              <div className="kanban-progress">
                                <em style={{ width: `${project.progress}%` }} />
                              </div>
                              <footer>
                                <small>{project.members.length} 名学生</small>
                                <small>{project.pending} 待审 · {project.excellent} 优秀</small>
                              </footer>
                              <span className="kanban-card-action">查看详情</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            </main>

            <aside className="dashboard-side-column">
              <section className="dashboard-glass-panel dashboard-feed-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">ACTIVITY TRACE</span>
                    <h4>系统实时流水</h4>
                  </div>
                </div>
                <div className="dashboard-feed-list">
                  {dashboardFeedRows.length === 0 && <p className="dashboard-empty">暂无提交、生成或知识库更新记录</p>}
                  {dashboardFeedRows.map((row, index) => (
                    <article className={index === 0 ? "is-latest" : undefined} key={row.id}>
                      <div className="dashboard-feed-time">
                        <time>{row.time}</time>
                        {index === 0 && <span>LIVE</span>}
                      </div>
                      <div>
                        <strong>{row.title}</strong>
                        <span>{row.group}</span>
                        <p>{row.detail}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="dashboard-glass-panel dashboard-queue-panel">
                <div className="dashboard-panel-head">
                  <div>
                    <span className="eyebrow">TEACHER QUEUE</span>
                    <h4>教师审核队列</h4>
                  </div>
                  <em>{pendingCount} 待处理</em>
                </div>
                <div className="dashboard-teacher-queue">
                  {dashboardTeacherQueueRows.length === 0 && <p className="dashboard-empty">当前没有待审核或退回修改成果</p>}
                  {dashboardTeacherQueueRows.map((submission) => (
                    <article key={submission.id}>
                      <div>
                        <strong>{submission.groupName || submission.group}</strong>
                        <span>{artifactLabels[submission.artifactType]} · {submission.student}</span>
                      </div>
                      <em className={`submission-status ${submission.status}`}>{statusLabels[submission.status]}</em>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

        {adminTab === "knowledge" && (
          <div className="admin-page" key="admin-knowledge">
            <div className="teacher-module-panel admin-knowledge-manager">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">管理端</span>
                  <h3>知识库管理</h3>
                </div>
            </div>
            <div className="knowledge-module-layout">
              <section className="knowledge-module-card">
                <div className="panel-title compact">
                  <div>
                    <span className="eyebrow">目录管理</span>
                    <h4>知识库目录</h4>
                  </div>
                </div>
            <div className="knowledge-create-panel">
              <div className="knowledge-create-form admin-knowledge-create-form">
                <label>
                  <span>目录名称</span>
                  <input value={adminKnowledgeName} onChange={(event) => setAdminKnowledgeName(event.target.value)} placeholder="如：行业调研知识库" />
                </label>
                <button className="knowledge-inline-action" type="button" onClick={handleAdminCreateKnowledgeBase}>
                  <Save size={15} />
                  新建目录
                </button>
              </div>
              <form className="knowledge-directory-search-form" onSubmit={applyAdminKnowledgeDirectorySearch}>
                <label className="knowledge-directory-search">
                  <span>目录查询</span>
                  <input
                    value={adminKnowledgeDirectorySearchDraft}
                    onChange={(event) => setAdminKnowledgeDirectorySearchDraft(event.target.value)}
                    placeholder="输入目录名称或适用模块"
                  />
                </label>
                <button className="knowledge-inline-action" type="submit">
                  查询
                </button>
              </form>
              <div className="knowledge-base-directory-list">
                  {adminKnowledgeDirectoryRows.map((base) => {
                  const fileCount = props.knowledgeUploads.filter((asset) => (asset.category || inferKnowledgeCategory(asset.name)) === base.category).length;
                  const enabled = props.knowledgeBaseStates[base.category] !== false;
                  return (
                    <article key={base.category}>
                      <div>
                        <strong>{base.category}知识库</strong>
                        <span>{fileCount} 份资料 · {enabled ? "已开放" : "已停用"}</span>
                      </div>
                      <div className="knowledge-directory-actions">
                        <button type="button" onClick={() => setAdminKnowledgeBasePreviewCategory(base.category)}>
                          查看详情
                        </button>
                        <button type="button" onClick={() => handleAdminToggleKnowledgeBaseState(base.category)}>
                          {enabled ? "停用" : "启用"}
                        </button>
                        <button
                          className="danger-text-button"
                          type="button"
                          onClick={() => props.onDeleteKnowledgeBase(base.category)}
                        >
                          删除
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
              </section>

              <section className="knowledge-module-card">
                <div className="panel-title compact">
                  <div>
                    <span className="eyebrow">资料管理</span>
                    <h4>知识库资料</h4>
                  </div>
                </div>
            <div className="teacher-upload-toolbar">
              <label className="knowledge-upload-target" htmlFor="admin-upload-category">
                <span>上传到知识库</span>
                <strong>选择资料归属目录</strong>
                <PrettySelect
                  value={adminUploadCategory}
                  ariaLabel="选择上传知识库"
                  options={adminActiveKnowledgeCatalog.map((base) => ({ value: base.category, label: `${base.category}知识库` }))}
                  onChange={(value) => setAdminUploadCategory(value)}
                />
              </label>
              <p className="knowledge-base-hint">
                {selectedAdminUploadKnowledgeBase.description} 适用模块：{selectedAdminUploadKnowledgeBase.usedBy}
                {props.knowledgeBaseStates[adminUploadCategory] ? " 当前目录已开放给学生端调用。" : " 当前目录已停用，学生端暂不可调用。"}
              </p>
              <button className="status-pill pending-jump admin-upload-material-button upload-inline-button" type="button" onClick={() => adminUploadInputRef.current?.click()}>
                <Upload size={15} />
                上传资料
              </button>
            </div>
            <input
              ref={adminUploadInputRef}
              className="visually-hidden-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
              onChange={(event) => {
                void handleAdminLocalUpload(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <form className="knowledge-search" onSubmit={applyAdminKnowledgeSearch}>
              <label className="knowledge-search-keyword">
                <span>资料名称 / 文件类型 / 内容关键词</span>
                <input
                  type="search"
                  placeholder="输入资料名称、文件类型或关键词"
                  value={adminKnowledgeSearchDraft.keyword}
                  onChange={(event) => setAdminKnowledgeSearchDraft((current) => ({ ...current, keyword: event.target.value }))}
                />
              </label>
              <label>
                <span>知识库</span>
                <PrettySelect
                  value={adminKnowledgeSearchDraft.category}
                  ariaLabel="筛选知识库"
                  options={[
                    { value: "ALL" as KnowledgeCategory | "ALL", label: "全部知识库" },
                    ...adminActiveKnowledgeCatalog.map((base) => ({ value: base.category, label: `${base.category}知识库` })),
                  ]}
                  onChange={(value) => setAdminKnowledgeSearchDraft((current) => ({ ...current, category: value }))}
                />
              </label>
              <label>
                <span>是否启用</span>
                <PrettySelect
                  value={adminKnowledgeSearchDraft.status}
                  ariaLabel="筛选启用状态"
                  options={[
                    { value: "ALL", label: "全部状态" },
                    { value: "enabled", label: "已启用" },
                    { value: "disabled", label: "未启用" },
                  ]}
                  onChange={(value) => setAdminKnowledgeSearchDraft((current) => ({ ...current, status: value }))}
                />
              </label>
              <div className="knowledge-search-actions">
                <button className="primary-button" type="submit">
                  <Filter size={15} />
                  查询
                </button>
                <button className="ghost-button" type="button" onClick={resetAdminKnowledgeSearch}>
                  重置
                </button>
              </div>
            </form>
            <div className="record-table knowledge-table">
              <div className="table-row table-head">
                <span>资料名称</span>
                <span>知识库</span>
                <span>文件信息</span>
                <span>上传教师</span>
                <span>上传时间</span>
                <span>是否启用</span>
                <span>操作</span>
              </div>
              {adminKnowledgeFilteredUploads.length === 0 && (
                <div className="submission-empty-row">暂无匹配资料，可以调整查询条件或先上传资料。</div>
              )}
              {adminKnowledgeFilteredUploads.map((asset) => {
                const category = asset.category || inferKnowledgeCategory(asset.name);
                const enabled = asset.enabled !== false;
                return (
                  <div className="table-row" key={asset.id}>
                    <span title={`${asset.name}\n${asset.preview}`}>
                      <strong>{asset.name}</strong>
                      <small>{asset.preview}</small>
                    </span>
                    <span title={`${category}知识库`}>{category}</span>
                    <span className="knowledge-file-meta" title={getKnowledgeFileTypeLabel(asset)}>
                      <em>{getKnowledgeFileTypeLabel(asset)}</em>
                      <small>{asset.sizeLabel}</small>
                    </span>
                    <span>{asset.uploadedBy || props.adminName || "平台管理员"}</span>
                    <span>{formatSubmittedAt(asset.uploadedAt)}</span>
                    <span>
                      <em className={`knowledge-status ${enabled ? "enabled" : "disabled"}`}>{enabled ? "已启用" : "未启用"}</em>
                    </span>
                    <span className="knowledge-actions">
                      <button type="button" onClick={() => setAdminKnowledgePreviewId(asset.id)}>
                        <FileText size={14} />
                        查看
                      </button>
                      <button type="button" onClick={() => props.onToggleKnowledge(asset.id)}>
                        {enabled ? "停用" : "启用"}
                      </button>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => {
                          if (adminKnowledgePreviewId === asset.id) setAdminKnowledgePreviewId(null);
                          props.onDeleteKnowledge(asset.id);
                        }}
                      >
                        删除
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {adminTab === "prompts" && (
        <div className="admin-page" key="admin-prompts">
          <div className="teacher-module-panel teacher-prompt-manager">
            <div className="panel-title">
              <div>
                <span className="eyebrow">管理端</span>
                <h3>专家配置与 Skill 管理</h3>
              </div>
            </div>
            <ExpertSkillManager
              actorLabel="管理端"
              knowledgeBases={props.knowledgeCatalog}
              refreshKey={adminExpertListRefreshKey}
              onMessage={setKnowledgeSaveMessage}
              onConfirmed={handleAdminExpertSkillConfirmed}
              onOpenExpert={openAdminExpertDetail}
            />
            {isAdminExpertDetailOpen && (
              <ExpertDetailModal
                expert={promptExpert}
                knowledgeCatalog={adminActiveKnowledgeCatalog}
                knowledgeBaseStates={props.knowledgeBaseStates}
                selectedCategories={adminPromptKnowledgeCategories}
                enabledKnowledgeCount={enabledKnowledgeCount}
                systemPrompt={adminSystemPromptDraft}
                userPrompt={adminUserPromptDraft}
                active={adminExpertActiveDraft}
                canDelete={adminManageableExperts.length > 1}
                onKnowledgeToggle={handleAdminPromptKnowledgeToggle}
                onSystemPromptChange={setAdminSystemPromptDraft}
                onUserPromptChange={setAdminUserPromptDraft}
                onActiveChange={setAdminExpertActiveDraft}
                onSave={() => void handleAdminSavePrompt()}
                onDelete={() => setPendingDeleteExpertId(promptExpert.id)}
                onClose={() => setIsAdminExpertDetailOpen(false)}
              />
            )}
          </div>
        </div>
      )}

      {adminTab === "evaluation" && (
        <div className="admin-page" key="admin-evaluation">
          <div className="effect-grid">
            {effectRows.map(([name, value, target, detail]) => (
              <article key={name}>
                <strong>{value}</strong>
                <span>{name}</span>
                <em>{target}</em>
                <p>{detail}</p>
              </article>
            ))}
          </div>
          <div className="ai-evaluation-panel">
            <ResultPanel result={aiEvaluationBlocks} expertId="business" />
          </div>
          <div className="evaluation-review-board">
            <div className="evaluation-review-heading">
              <span className="eyebrow">运营复盘</span>
              <h4>试点运行补充说明</h4>
              <p>围绕学生成果质量、教师审核闭环和正式试点准备度，补充管理端可汇报的过程性内容。</p>
            </div>
            <div className="evaluation-review-grid">
              {evaluationReviewBlocks.map((block) => (
                <section key={block.title} className="evaluation-review-card">
                  <header>
                    <strong>{block.title}</strong>
                    <span>{block.tag}</span>
                  </header>
                  <ul>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="evaluation-evidence-strip">
              {evaluationEvidenceRows.map(([name, value, detail]) => (
                <article key={name}>
                  <strong>{value}</strong>
                  <span>{name}</span>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
      {adminKnowledgePreviewAsset && (
        <div className="modal-backdrop" role="presentation">
          <section className="media-modal knowledge-detail-modal" role="dialog" aria-modal="true" aria-label="资料详情">
            <header>
              <div>
                <span className="eyebrow">资料详情</span>
                <h3>{adminKnowledgePreviewAsset.name}</h3>
                <p>{adminKnowledgePreviewAsset.preview}</p>
              </div>
              <button className="modal-close-button" type="button" onClick={() => setAdminKnowledgePreviewId(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <div className="review-detail-body">
              <section className="detail-card review-summary-card">
                <dl>
                  <div>
                    <dt>所属知识库</dt>
                    <dd>{adminKnowledgePreviewAsset.category || inferKnowledgeCategory(adminKnowledgePreviewAsset.name)}</dd>
                  </div>
                  <div>
                    <dt>文件类型</dt>
                    <dd>{getKnowledgeFileTypeLabel(adminKnowledgePreviewAsset)}</dd>
                  </div>
                  <div>
                    <dt>文件大小</dt>
                    <dd>{adminKnowledgePreviewAsset.sizeLabel}</dd>
                  </div>
                  <div>
                    <dt>上传人</dt>
                    <dd>{adminKnowledgePreviewAsset.uploadedBy || props.adminName || "平台管理员"}</dd>
                  </div>
                  <div>
                    <dt>是否启用</dt>
                    <dd>{adminKnowledgePreviewAsset.enabled === false ? "未启用" : "已启用"}</dd>
                  </div>
                  <div>
                    <dt>上传时间</dt>
                    <dd>{formatSubmittedAt(adminKnowledgePreviewAsset.uploadedAt)}</dd>
                  </div>
                </dl>
              </section>
              <section className="detail-card">
                <span className="eyebrow">资料预览</span>
                <p>{adminKnowledgePreviewAsset.preview}</p>
                <div className="teacher-file-actions">
                  <button type="button" onClick={() => downloadKnowledgeAsset(adminKnowledgePreviewAsset)}>
                    <Download size={15} />
                    {adminKnowledgePreviewAsset.fileDataUrl ? "下载原文件" : "下载资料说明"}
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
      {adminKnowledgeBasePreviewItem && (
        <KnowledgeBaseDetailModal
          item={adminKnowledgeBasePreviewItem}
          uploads={props.knowledgeUploads}
          enabled={props.knowledgeBaseStates[adminKnowledgeBasePreviewItem.category] !== false}
          actorLabel="管理端维护"
          onClose={() => setAdminKnowledgeBasePreviewCategory(null)}
          onToggle={() => handleAdminToggleKnowledgeBaseState(adminKnowledgeBasePreviewItem.category)}
          onDelete={() => {
            setAdminKnowledgeBasePreviewCategory(null);
            props.onDeleteKnowledgeBase(adminKnowledgeBasePreviewItem.category);
          }}
        />
      )}
      {knowledgeSaveMessage && <PromptSaveSuccessModal message={knowledgeSaveMessage} onClose={() => setKnowledgeSaveMessage(null)} />}
      </div>
      {pendingDeleteExpert && (
        <ExpertDeleteConfirmModal
          expert={pendingDeleteExpert}
          onCancel={() => setPendingDeleteExpertId(null)}
          onConfirm={confirmAdminDeleteExpert}
        />
      )}
      {isPromptSaveOpen && <PromptSaveSuccessModal onClose={() => setIsPromptSaveOpen(false)} />}
      {accountSaveMessage && <PromptSaveSuccessModal message={accountSaveMessage} onClose={() => setAccountSaveMessage(null)} />}
      {selectedKanbanProject && (
        <div className="modal-backdrop" role="presentation">
          <section className="media-modal kanban-detail-modal" role="dialog" aria-modal="true" aria-label="项目进度详情">
            <header>
              <div>
                <span className="eyebrow">项目进度详情</span>
                <h3>{selectedKanbanProject.group.projectName}</h3>
                <p>
                  {selectedKanbanProject.group.label} · 当前阶段：{selectedKanbanProject.stageLabel} · 进度 {selectedKanbanProject.progress}%
                </p>
              </div>
              <button className="modal-close-button" type="button" onClick={() => setSelectedKanbanGroupId(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <div className="kanban-detail-body">
              <section className="kanban-detail-summary">
                {[
                  ["成员数", `${selectedKanbanProject.members.length} 人`],
                  ["提交成果", `${selectedKanbanProject.submissions.length} 项`],
                  ["待审核", `${selectedKanbanProject.pending} 项`],
                  ["优秀成果", `${selectedKanbanProject.excellent} 项`],
                ].map(([label, value]) => (
                  <article key={label}>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </article>
                ))}
              </section>
              <section className="kanban-stage-timeline">
                {projectKanbanStages.map((stage, index) => (
                  <article className={index <= selectedKanbanProject.stageIndex ? "done" : ""} key={stage.label}>
                    <span>{index + 1}</span>
                    <strong>{stage.label}</strong>
                  </article>
                ))}
              </section>
              <section className="detail-card">
                <span className="eyebrow">阶段成果</span>
                <div className="review-blocks">
                  {selectedKanbanProject.submissions.length === 0 && (
                    <article>
                      <strong>暂无真实提交</strong>
                      <ul>
                        <li>该项目已进入演示看板，但还没有从学生端提交阶段成果。</li>
                        <li>可先在学生端生成 BP/PPT 后提交老师审核，看板会自动更新。</li>
                      </ul>
                    </article>
                  )}
                  {selectedKanbanProject.submissions.map((submission) => (
                    <article key={submission.id}>
                      <strong>{submission.artifactTitle}</strong>
                      <ul>
                        <li>
                          {artifactLabels[submission.artifactType]} · {statusLabels[submission.status]} · {formatSubmittedAt(submission.submittedAt)}
                        </li>
                        <li>{submission.teacherComment || submission.artifactSummary}</li>
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
      {selectedGroupDetail && (
        <div className="modal-backdrop animated-backdrop" role="presentation">
          <section className="media-modal group-detail-modal" role="dialog" aria-modal="true" aria-label="学生小组详情">
            <header>
              <div className="group-detail-head-copy">
                <span className="eyebrow">学生小组详情</span>
                {editingGroupId === selectedGroupDetail.group.id ? (
                  <input
                    className="group-detail-title-input"
                    value={groupEditDraft.projectName}
                    onChange={(event) => setGroupEditDraft((current) => ({ ...current, projectName: event.target.value }))}
                  />
                ) : (
                  <h3>{selectedGroupDetail.group.projectName}</h3>
                )}
                <p>
                  {selectedGroupDetail.group.label} · 当前阶段：{selectedGroupDetail.stageLabel} · 进度 {selectedGroupDetail.progress}%
                </p>
              </div>
              <div className="group-detail-head-actions">
                {editingGroupId === selectedGroupDetail.group.id ? (
                  <>
                    <button className="ghost-button" type="button" onClick={() => setEditingGroupId(null)}>
                      取消编辑
                    </button>
                    <button className="primary-button" type="button" onClick={() => handleSaveStudentGroup(selectedGroupDetail.group.id)}>
                      保存修改
                    </button>
                  </>
                ) : (
                  <button className="group-edit-trigger" type="button" onClick={() => openGroupEditor(selectedGroupDetail.group)}>
                    <PenLine size={15} />
                    编辑
                  </button>
                )}
                <button
                  className="modal-close-button"
                  type="button"
                  onClick={() => {
                    setEditingGroupId(null);
                    setSelectedGroupDetailId(null);
                  }}
                  aria-label="关闭"
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            {editingGroupId === selectedGroupDetail.group.id && (
              <section className="group-edit-card">
                <div className="group-edit-grid">
                  <label>
                    <span>小组编号</span>
                    <input
                      value={groupEditDraft.label}
                      onChange={(event) => setGroupEditDraft((current) => ({ ...current, label: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>小组名称</span>
                    <input
                      value={groupEditDraft.projectName}
                      onChange={(event) => setGroupEditDraft((current) => ({ ...current, projectName: event.target.value }))}
                    />
                  </label>
                </div>
              </section>
            )}
            <div className="group-detail-body">
              <section className="group-detail-summary">
                {[
                  ["成员数", `${selectedGroupDetail.members.length} 人`],
                  ["提交成果", `${selectedGroupDetail.submissions.length} 项`],
                  ["待审核", `${selectedGroupDetail.pending} 项`],
                  ["优秀成果", `${selectedGroupDetail.excellent} 项`],
                ].map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </section>
              <section className="group-detail-section">
                <div className="dashboard-panel-head light">
                  <div>
                    <span className="eyebrow">MEMBERS</span>
                    <h4>小组成员</h4>
                  </div>
                </div>
                <div className="group-member-list">
                  {selectedGroupDetail.members.length === 0 && <span>当前还没有绑定学生账号。</span>}
                  {selectedGroupDetail.members.map((member) => (
                    <article key={member.id}>
                      <strong>{member.name}</strong>
                      <span>{member.account}</span>
                      <em>{member.quota} 次调用额度</em>
                    </article>
                  ))}
                </div>
              </section>
              <section className="group-detail-section">
                <div className="dashboard-panel-head light">
                  <div>
                    <span className="eyebrow">PROGRESS</span>
                    <h4>阶段进度</h4>
                  </div>
                </div>
                <div className="kanban-stage-timeline compact">
                  {projectKanbanStages.map((stage, index) => (
                    <article className={index <= selectedGroupDetail.stageIndex ? "done" : ""} key={stage.label}>
                      <span>{index + 1}</span>
                      <strong>{stage.label}</strong>
                    </article>
                  ))}
                </div>
              </section>
              <section className="group-detail-section">
                <div className="dashboard-panel-head light">
                  <div>
                    <span className="eyebrow">SUBMISSIONS</span>
                    <h4>近期成果</h4>
                  </div>
                </div>
                <div className="group-submission-list">
                  {selectedGroupDetail.submissions.length === 0 && <span>当前小组还没有提交审核成果。</span>}
                  {selectedGroupDetail.submissions.slice(0, 5).map((submission) => (
                    <article key={submission.id}>
                      <strong>{submission.artifactTitle}</strong>
                      <span>{artifactLabels[submission.artifactType]} · {statusLabels[submission.status]} · {formatSubmittedAt(submission.submittedAt)}</span>
                      <p>{submission.teacherComment || submission.artifactSummary}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
      {isAccountCreateOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="media-modal account-create-modal" role="dialog" aria-modal="true" aria-label="新建账号">
            <header>
              <div>
                <span className="eyebrow">账号权限管理</span>
                <h3>新建平台账号</h3>
                <p>选择角色后会自动带出默认权限，也可以手动调整账号、密码和配额。</p>
              </div>
              <button className="modal-close-button" type="button" onClick={() => setIsAccountCreateOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <div className="account-create-form">
              <label>
                <span>账号角色</span>
                <PrettySelect
                  value={newAccountRole}
                  ariaLabel="选择账号角色"
                  options={[
                    { value: "student", label: "学生端" },
                    { value: "teacher", label: "教师端" },
                    { value: "admin", label: "管理端" },
                  ]}
                  onChange={(nextRole) => {
                    setNewAccountRole(nextRole);
                    setNewAccountQuota(String(getDefaultQuota(nextRole)));
                    if (nextRole === "student" && !newAccountGroupId) {
                      setNewAccountGroupId(props.studentGroups[2]?.id || props.studentGroups[0]?.id || "");
                    }
                  }}
                />
              </label>
              <label>
                <span>姓名</span>
                <input value={newAccountName} onChange={(event) => setNewAccountName(event.target.value)} placeholder="输入姓名，留空则自动生成" />
              </label>
              <label>
                <span>登录账号</span>
                <input value={newAccountLogin} onChange={(event) => setNewAccountLogin(event.target.value)} placeholder="输入登录账号，留空则自动生成" />
              </label>
              <label>
                <span>初始密码</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={newAccountPassword}
                  onChange={(event) => setNewAccountPassword(event.target.value)}
                  placeholder="至少 8 位，仅在创建时提交"
                />
              </label>
              <label>
                <span>调用配额</span>
                <input
                  min="0"
                  type="number"
                  value={newAccountQuota}
                  onChange={(event) => setNewAccountQuota(event.target.value)}
                  placeholder="输入调用配额"
                />
              </label>
              {newAccountRole === "student" && (
                <label>
                  <span>所属项目小组</span>
                  <PrettySelect
                    value={newAccountGroupId}
                    ariaLabel="选择所属项目小组"
                    options={props.studentGroups.map((group) => ({ value: group.id, label: formatGroupScope(group) }))}
                    onChange={(value) => setNewAccountGroupId(value)}
                  />
                </label>
              )}
              <div className="account-create-permissions">
                <span>{newAccountRole === "student" ? "默认可用专家" : "默认权限"}</span>
                <strong>{getDefaultPermissions(newAccountRole).join("、")}</strong>
              </div>
              <div className="account-create-permissions">
                <span>登录能力</span>
                <strong>创建成功后立即写入 MySQL，可使用平台后端认证登录。</strong>
              </div>
            </div>
            <footer className="context-actions">
              <button className="ghost-button" type="button" onClick={() => setIsAccountCreateOpen(false)}>
                取消
              </button>
              <button className="primary-button" type="button" onClick={handleCreateAccount}>
                <Save size={16} />
                创建账号
              </button>
            </footer>
          </section>
        </div>
      )}
      {accountDetail && (
        <div className="modal-backdrop" role="presentation">
          <section className="media-modal account-detail-modal" role="dialog" aria-modal="true" aria-label="账号详情">
            <header>
              <div>
                <span className="eyebrow">账号权限详情</span>
                <h3>{accountDetail.name}</h3>
                <p>
                  {accountDetail.groupOrScope} · {accountDetail.role === "student" ? "学生端" : accountDetail.role === "teacher" ? "教师端" : "管理端"}
                </p>
              </div>
              <button className="modal-close-button" type="button" onClick={() => setAccountDetailId(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </header>
            <div className="account-modal-body">
              <section className="account-detail-summary">
                <div className="account-avatar">{accountDetail.name.slice(0, 1)}</div>
                <div>
                  <span>当前账号</span>
                  <strong>{accountDetail.account}</strong>
                  <p>{accountDetail.groupOrScope}</p>
                </div>
                <div className="account-summary-metrics">
                  <article>
                    <span>角色端口</span>
                    <strong>{accountDetail.role === "student" ? "学生端" : accountDetail.role === "teacher" ? "教师端" : "管理端"}</strong>
                  </article>
                  <article>
                    <span>调用配额</span>
                    <strong>{accountEditDraft.quota || accountDetail.quota}</strong>
                  </article>
                  <article>
                    <span>账号状态</span>
                    <strong className={accountDetail.status === "已开通" ? "enabled" : "disabled"}>{accountDetail.status}</strong>
                  </article>
                </div>
              </section>
              <div className="account-edit-grid">
                <label>
                  <span>姓名</span>
                  <input
                    value={accountEditDraft.name}
                    onChange={(event) => setAccountEditDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  <span>登录账号（不可修改）</span>
                  <input
                    readOnly
                    value={accountEditDraft.account}
                  />
                </label>
                <label>
                  <span>调用配额</span>
                  <input
                    min="0"
                    type="number"
                    value={accountEditDraft.quota}
                    onChange={(event) => setAccountEditDraft((current) => ({ ...current, quota: event.target.value }))}
                  />
                </label>
                {accountDetail.role === "student" && (
                  <label>
                    <span>所属项目小组</span>
                    <PrettySelect
                      value={accountEditDraft.groupId || accountDetail.groupId || ""}
                      ariaLabel="选择所属项目小组"
                      options={props.studentGroups.map((group) => ({ value: group.id, label: formatGroupScope(group) }))}
                      onChange={(value) => setAccountEditDraft((current) => ({ ...current, groupId: value }))}
                    />
                  </label>
                )}
              </div>
              <div className="account-permission-detail">
                <strong className="account-permission-title">{accountDetail.role === "student" ? "可用专家" : "权限范围"}</strong>
                {(accountDetail.role === "student" ? getStudentExpertPermissionNames() : accountDetail.permissions).map((permission) => {
                  const permissionEnabled = isPermissionEnabled(accountDetail, permission);
                  return (
                    <article className={permissionEnabled ? "enabled" : "disabled"} key={permission}>
                      <div>
                        <strong>{permission}</strong>
                        <p>{getPermissionDescription(permission, accountDetail.role)}</p>
                      </div>
                      <button
                        className={`account-status-toggle ${permissionEnabled ? "enabled" : "disabled"}`}
                        type="button"
                        onClick={() => handleToggleAccountPermission(accountDetail.id, permission)}
                      >
                        {permissionEnabled ? "已启用" : "已停用"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
            <footer className="context-actions">
              <button className="primary-button" type="button" onClick={handleSaveAccountDetail}>
                <Save size={16} />
                保存修改
              </button>
              <button
                className={`account-status-toggle ${accountDetail.status === "已开通" ? "enabled" : "disabled"}`}
                type="button"
                onClick={() => handleToggleAccountStatus(accountDetail.id)}
                disabled={accountDetail.status === "待后端开通"}
                title={accountDetail.status === "待后端开通" ? "该账号尚未开通，暂不能修改状态" : undefined}
              >
                {accountDetail.status}
              </button>
              <button className="ghost-button danger" type="button" onClick={() => handleDeleteAccount(accountDetail.id)}>
                删除账号
              </button>
            </footer>
          </section>
        </div>
      )}
      {pendingDeleteGroup && (
        <AdminDeleteConfirmModal
          eyebrow="删除项目小组"
          title={`确认删除“${pendingDeleteGroup.label} / ${pendingDeleteGroup.projectName}”？`}
          description="删除后，该项目小组会从管理端小组列表和新建账号的小组选择中移除。"
          primary={pendingDeleteGroup.projectName}
          detail={`${pendingDeleteGroup.label} · 当前 0 名学生`}
          onCancel={() => setPendingDeleteGroupId(null)}
          onConfirm={handleConfirmDeleteStudentGroup}
        />
      )}
      {pendingDeleteAccount && (
        <AdminDeleteConfirmModal
          eyebrow="删除账号"
          title={`确认删除账号“${pendingDeleteAccount.account}”？`}
          description="删除后，该账号会从平台数据库移除，已有登录会话也会立即失效。"
          primary={pendingDeleteAccount.name}
          detail={`${pendingDeleteAccount.role === "student" ? "学生端" : pendingDeleteAccount.role === "teacher" ? "教师端" : "管理端"} · ${pendingDeleteAccount.groupOrScope}`}
          onCancel={() => setPendingDeleteAccountId(null)}
          onConfirm={handleConfirmDeleteAccount}
        />
      )}
    </section>
  );
}

function AdminDeleteConfirmModal(props: {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  detail: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCancel = props.onCancel;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const getFocusableElements = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    getFocusableElements()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onCancel]);

  return createPortal(
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="media-modal delete-confirm-modal admin-delete-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-delete-title"
        aria-describedby="admin-delete-description"
      >
        <header>
          <div>
            <span className="eyebrow">{props.eyebrow}</span>
            <h3 id="admin-delete-title">{props.title}</h3>
            <p id="admin-delete-description">{props.description}</p>
          </div>
          <button type="button" aria-label="关闭删除确认" onClick={props.onCancel}>
            <X size={18} />
          </button>
        </header>
        <div className="delete-confirm-body">
          <strong>{props.primary}</strong>
          <p>该操作会立即写入平台数据库，删除后无法通过界面撤销。</p>
          <span>{props.detail}</span>
        </div>
        <footer>
          <button className="ghost-button" type="button" onClick={props.onCancel}>
            取消
          </button>
          <button className="danger-button solid" type="button" onClick={props.onConfirm}>
            确认删除
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export default App;

