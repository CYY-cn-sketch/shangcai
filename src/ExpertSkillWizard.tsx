import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Check, ChevronLeft, ChevronRight, Download, FileText, Upload, X } from "lucide-react";
import {
  confirmExpertSkillUpload,
  uploadExpertSkillArchive,
  type ConfirmExpertSkillUploadInput,
  type ExpertSkillConfirmationRecord,
  type ExpertSkillKnowledgeSelection,
  type ExpertSkillUploadRecord,
} from "./api/knowledge";
import "./ExpertSkillWizard.css";

type KnowledgeBaseOption = {
  id?: string;
  category: string;
  description: string;
  usedBy: string;
  active?: boolean;
};

type ExpertDraft = {
  name: string;
  role: string;
  scenario: string;
  accent: string;
  skillName: string;
  skillDescription: string;
  systemPrompt: string;
  userPrompt: string;
  knowledgeRule: string;
  outputFormat: string;
  boundaries: string;
};

const steps = ["上传 Skill", "确认专家信息", "配置知识库", "检查提示词", "确认启用"];

function fromUpload(upload: ExpertSkillUploadRecord): ExpertDraft {
  return {
    name: upload.parsedName,
    role: upload.parsedRole,
    scenario: upload.parsedScenario,
    accent: upload.parsedAccent || "#0f7b73",
    skillName: upload.parsedSkillName?.trim() || `${upload.parsedName} Skill`,
    skillDescription: upload.parsedSkillDescription?.trim() || upload.parsedRole,
    systemPrompt: upload.parsedSystemPrompt?.trim() || "",
    userPrompt: upload.parsedUserPrompt?.trim() || "请结合学生当前输入、历史上下文和已启用知识资料组装本轮任务。",
    knowledgeRule: upload.parsedKnowledgeRule?.trim() || "仅检索已绑定且已启用的知识资料；引用结果时保留知识来源标签。",
    outputFormat: upload.parsedOutputFormat?.trim() || "输出生成摘要、关键建议、风险提醒和下一步动作。",
    boundaries: upload.parsedBoundaries?.trim() || "不执行上传文件，不泄露账号、密钥、Token 或供应商信息。",
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const fileRoleLabels = {
  CONFIG: "配置",
  PROMPT: "提示词",
  KNOWLEDGE_CANDIDATE: "知识资料候选",
  REFERENCE: "普通参考",
} as const;

export function ExpertSkillWizard(props: {
  actorLabel: string;
  knowledgeBases: KnowledgeBaseOption[];
  initialUpload?: ExpertSkillUploadRecord | null;
  onClose: () => void;
  onConfirmed: (result: ExpertSkillConfirmationRecord) => void | Promise<void>;
}) {
  const initialDraft = props.initialUpload ? fromUpload(props.initialUpload) : null;
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [upload, setUpload] = useState<ExpertSkillUploadRecord | null>(props.initialUpload || null);
  const [step, setStep] = useState(props.initialUpload ? 2 : 1);
  const [draft, setDraft] = useState<ExpertDraft | null>(initialDraft);
  const [knowledgeMode, setKnowledgeMode] = useState<"EXISTING" | "CREATE" | "NONE">(
    props.knowledgeBases.some((base) => base.id) ? "EXISTING" : "CREATE",
  );
  const [existingKnowledgeBaseId, setExistingKnowledgeBaseId] = useState(
    props.knowledgeBases.find((base) => base.id && base.active !== false)?.id || props.knowledgeBases.find((base) => base.id)?.id || "",
  );
  const [newKnowledgeBase, setNewKnowledgeBase] = useState(() => ({
    category: initialDraft ? `${initialDraft.name}知识库` : "",
    description: initialDraft ? `${initialDraft.name}使用的课程资料、案例和参考文件。` : "",
    usedBy: initialDraft?.name || "",
    active: true,
  }));
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(() =>
    props.initialUpload?.files
      .filter((file) => file.fileRole === "KNOWLEDGE_CANDIDATE" && !file.importedAssetId)
      .map((file) => file.id) || [],
  );
  const [studentVisible, setStudentVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidateFiles = useMemo(
    () => upload?.files.filter((file) => file.fileRole === "KNOWLEDGE_CANDIDATE" && !file.importedAssetId) || [],
    [upload],
  );
  const totalBytes = upload?.files.reduce((sum, file) => sum + file.fileSizeBytes, 0) || 0;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) props.onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, props]);

  function initializeUpload(nextUpload: ExpertSkillUploadRecord) {
    const nextDraft = fromUpload(nextUpload);
    setUpload(nextUpload);
    setDraft(nextDraft);
    setSelectedFileIds(
      nextUpload.files.filter((file) => file.fileRole === "KNOWLEDGE_CANDIDATE" && !file.importedAssetId).map((file) => file.id),
    );
    setNewKnowledgeBase({
      category: `${nextDraft.name}知识库`,
      description: `${nextDraft.name}使用的课程资料、案例和参考文件。`,
      usedBy: nextDraft.name,
      active: true,
    });
    setStep(2);
  }

  async function handleArchive(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      initializeUpload(await uploadExpertSkillArchive(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Skill 压缩包上传失败。");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(field: keyof ExpertDraft, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function validateCurrentStep() {
    if (!draft || !upload) return false;
    if (step === 2) {
      if (![draft.name, draft.role, draft.scenario, draft.skillName, draft.skillDescription].every((value) => value.trim())) {
        setError("请完整填写专家名称、定位、适用场景、Skill 名称和能力说明。");
        return false;
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(draft.accent)) {
        setError("主题颜色必须是六位十六进制颜色，例如 #0f7b73。");
        return false;
      }
    }
    if (step === 3) {
      if (knowledgeMode === "EXISTING" && !existingKnowledgeBaseId) {
        setError("请选择一个已有知识库。");
        return false;
      }
      if (knowledgeMode === "CREATE" && ![newKnowledgeBase.category, newKnowledgeBase.description, newKnowledgeBase.usedBy].every((value) => value.trim())) {
        setError("请完整填写新知识库名称、说明和使用范围。");
        return false;
      }
    }
    if (step === 4 && (!draft.systemPrompt.trim() || !draft.userPrompt.trim())) {
      setError("系统提示词和用户输入组装规则不能为空。");
      return false;
    }
    setError(null);
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    if (step === 3 && knowledgeMode === "NONE") {
      props.onClose();
      return;
    }
    setStep((current) => Math.min(5, current + 1));
  }

  function knowledgeSelection(): ExpertSkillKnowledgeSelection {
    if (knowledgeMode === "EXISTING") return { mode: "EXISTING", knowledgeBaseId: existingKnowledgeBaseId };
    if (knowledgeMode === "CREATE") return { mode: "CREATE", newKnowledgeBase };
    return { mode: "NONE" };
  }

  async function confirm() {
    if (!upload || !draft) return;
    setBusy(true);
    setError(null);
    const input: ConfirmExpertSkillUploadInput = {
      ...draft,
      knowledge: knowledgeSelection(),
      importFileIds: knowledgeMode === "NONE" ? [] : selectedFileIds,
      active: studentVisible,
    };
    try {
      const result = await confirmExpertSkillUpload(upload.id, input);
      await props.onConfirmed(result);
      props.onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "专家 Skill 确认失败。");
    } finally {
      setBusy(false);
    }
  }

  function renderUploadStep() {
    return (
      <div className="skill-wizard-upload-step">
        <input
          ref={fileInputRef}
          className="visually-hidden-input"
          type="file"
          accept=".zip,application/zip"
          onChange={(event) => {
            void handleArchive(event.target.files?.item(0) || null);
            event.currentTarget.value = "";
          }}
        />
        {!upload ? (
          <button className="skill-wizard-dropzone" type="button" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            <Archive size={30} aria-hidden="true" />
            <strong>{busy ? "正在安全解析并保存…" : "选择完整 Skill 文件夹的 ZIP 压缩包"}</strong>
            <span>最多 50 个安全白名单文件，压缩包不超过 20 MB；不会执行任何上传内容。</span>
          </button>
        ) : (
          <>
            <div className="skill-wizard-upload-summary">
              <Check size={20} aria-hidden="true" />
              <div><strong>{upload.folderName}</strong><span>{upload.fileCount} 个文件 · {formatBytes(totalBytes)} · 主文件 {upload.mainFilePath}</span></div>
              <button type="button" onClick={() => fileInputRef.current?.click()}>重新选择</button>
            </div>
            <div className="skill-wizard-file-tree" role="list" aria-label="Skill 文件目录">
              {upload.files.map((file) => (
                <div key={file.id} role="listitem">
                  <FileText size={15} aria-hidden="true" />
                  <span>{file.relativePath}</span>
                  <small>{fileRoleLabels[file.fileRole]} · {formatBytes(file.fileSizeBytes)}</small>
                  <a href={file.downloadUrl} aria-label={`下载 ${file.relativePath}`}><Download size={14} /></a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderExpertStep() {
    if (!draft) return null;
    return (
      <div className="skill-wizard-form-grid">
        <label><span>专家名称</span><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} /></label>
        <label><span>主题颜色</span><input value={draft.accent} onChange={(event) => updateDraft("accent", event.target.value)} placeholder="#0f7b73" /></label>
        <label className="wide"><span>专家定位</span><textarea rows={3} value={draft.role} onChange={(event) => updateDraft("role", event.target.value)} /></label>
        <label className="wide"><span>适用场景</span><textarea rows={2} value={draft.scenario} onChange={(event) => updateDraft("scenario", event.target.value)} /></label>
        <label><span>Skill 名称</span><input value={draft.skillName} onChange={(event) => updateDraft("skillName", event.target.value)} /></label>
        <label><span>能力说明</span><textarea rows={3} value={draft.skillDescription} onChange={(event) => updateDraft("skillDescription", event.target.value)} /></label>
      </div>
    );
  }

  function renderKnowledgeStep() {
    return (
      <div className="skill-wizard-knowledge-step">
        <div className="skill-wizard-choice-grid" role="radiogroup" aria-label="知识库配置方式">
          {([
            ["EXISTING", "绑定已有知识库", "使用平台中已经维护的知识目录"],
            ["CREATE", "新建知识库并导入", "在本次确认中一次性创建并导入"],
            ["NONE", "暂不配置", "保留上传草稿，不创建专家"],
          ] as const).map(([value, title, description]) => (
            <label key={value} className={knowledgeMode === value ? "selected" : ""}>
              <input type="radio" name="knowledge-mode" value={value} checked={knowledgeMode === value} onChange={() => setKnowledgeMode(value)} />
              <strong>{title}</strong><span>{description}</span>
            </label>
          ))}
        </div>
        {knowledgeMode === "EXISTING" && (
          <label className="skill-wizard-field"><span>已有知识库</span>
            <select value={existingKnowledgeBaseId} onChange={(event) => setExistingKnowledgeBaseId(event.target.value)}>
              <option value="">请选择</option>
              {props.knowledgeBases.filter((base) => base.id).map((base) => <option key={base.id} value={base.id}>{base.category}{base.active === false ? "（已停用）" : ""}</option>)}
            </select>
          </label>
        )}
        {knowledgeMode === "CREATE" && (
          <div className="skill-wizard-form-grid compact">
            <label><span>知识库名称</span><input value={newKnowledgeBase.category} onChange={(event) => setNewKnowledgeBase((current) => ({ ...current, category: event.target.value }))} /></label>
            <label><span>使用范围</span><input value={newKnowledgeBase.usedBy} onChange={(event) => setNewKnowledgeBase((current) => ({ ...current, usedBy: event.target.value }))} /></label>
            <label className="wide"><span>知识库说明</span><textarea rows={2} value={newKnowledgeBase.description} onChange={(event) => setNewKnowledgeBase((current) => ({ ...current, description: event.target.value }))} /></label>
            <label className="skill-wizard-switch wide"><input type="checkbox" checked={newKnowledgeBase.active} onChange={(event) => setNewKnowledgeBase((current) => ({ ...current, active: event.target.checked }))} /><span>创建后立即启用知识库</span></label>
          </div>
        )}
        {knowledgeMode !== "NONE" && (
          <section className="skill-wizard-candidates">
            <header><div><strong>待导入知识资料</strong><span>仅识别 references/、knowledge/、docs/；配置和提示词不会出现在这里。</span></div><small>已选 {selectedFileIds.length}/{candidateFiles.length}</small></header>
            {candidateFiles.length ? candidateFiles.map((file) => (
              <label key={file.id}>
                <input type="checkbox" checked={selectedFileIds.includes(file.id)} onChange={(event) => setSelectedFileIds((current) => event.target.checked ? [...current, file.id] : current.filter((id) => id !== file.id))} />
                <FileText size={15} aria-hidden="true" /><span>{file.relativePath}</span><small>{formatBytes(file.fileSizeBytes)}</small>
              </label>
            )) : <p className="skill-wizard-empty">没有识别到知识资料候选，可只绑定知识库后继续。</p>}
          </section>
        )}
        {knowledgeMode === "NONE" && <p className="skill-wizard-draft-note">退出后上传记录仍保留为待确认草稿，可从管理页继续配置。</p>}
      </div>
    );
  }

  function renderPromptStep() {
    if (!draft) return null;
    return (
      <div className="skill-wizard-prompt-grid">
        <label><span>系统提示词</span><textarea rows={8} value={draft.systemPrompt} onChange={(event) => updateDraft("systemPrompt", event.target.value)} /></label>
        <label><span>用户输入组装规则</span><textarea rows={8} value={draft.userPrompt} onChange={(event) => updateDraft("userPrompt", event.target.value)} /></label>
        <label><span>知识库调用规则</span><textarea rows={5} value={draft.knowledgeRule} onChange={(event) => updateDraft("knowledgeRule", event.target.value)} /></label>
        <label><span>输出格式</span><textarea rows={5} value={draft.outputFormat} onChange={(event) => updateDraft("outputFormat", event.target.value)} /></label>
        <label className="wide"><span>禁止事项和能力边界</span><textarea rows={4} value={draft.boundaries} onChange={(event) => updateDraft("boundaries", event.target.value)} /></label>
      </div>
    );
  }

  function renderConfirmStep() {
    if (!draft || !upload) return null;
    const selectedBase = props.knowledgeBases.find((base) => base.id === existingKnowledgeBaseId);
    const baseName = knowledgeMode === "EXISTING" ? selectedBase?.category : knowledgeMode === "CREATE" ? newKnowledgeBase.category : "未配置";
    return (
      <div className="skill-wizard-confirm-step">
        <dl>
          <div><dt>专家</dt><dd><strong>{draft.name}</strong><span>{draft.role}</span></dd></div>
          <div><dt>Skill</dt><dd><strong>{draft.skillName}</strong><span>{draft.skillDescription}</span></dd></div>
          <div><dt>知识库</dt><dd><strong>{baseName || "未命名"}</strong><span>将导入 {selectedFileIds.length} 个已勾选资料</span></dd></div>
          <div><dt>来源档案</dt><dd><strong>{upload.folderName}</strong><span>{upload.fileCount} 个源文件均已保存并可追溯</span></dd></div>
          <div><dt>提示词</dt><dd><strong>系统提示词、组装规则和边界已确认</strong><span>配置文件不会进入知识检索</span></dd></div>
        </dl>
        <label className="skill-wizard-visible-toggle"><input type="checkbox" checked={studentVisible} onChange={(event) => setStudentVisible(event.target.checked)} /><span><strong>确认后学生端立即可见</strong><small>关闭后专家仍会保存，但处于未启用状态。</small></span></label>
        <p className="skill-wizard-atomic-note">提交将一次性保存专家、知识库关系和勾选资料；任一环节失败都会整体回滚。</p>
      </div>
    );
  }

  return createPortal(
    <div className="modal-backdrop skill-wizard-backdrop" role="presentation">
      <section ref={dialogRef} className="skill-wizard-dialog" role="dialog" aria-modal="true" aria-labelledby="skill-wizard-title">
        <header className="skill-wizard-header">
          <div><span>{props.actorLabel} · 专家配置</span><h2 id="skill-wizard-title">专家配置与 Skill 管理</h2><p>完整来源归档、知识资料分流、提示词人工确认后再启用。</p></div>
          <button ref={closeRef} type="button" aria-label="关闭专家 Skill 配置" onClick={props.onClose} disabled={busy}><X size={19} /></button>
        </header>
        <ol className="skill-wizard-steps" aria-label="配置进度">
          {steps.map((label, index) => {
            const number = index + 1;
            return <li key={label} className={number === step ? "current" : number < step ? "complete" : ""}><span>{number < step ? <Check size={14} /> : number}</span><small>{label}</small></li>;
          })}
        </ol>
        <main className="skill-wizard-content">
          <header><span>第 {step} 步</span><h3>{steps[step - 1]}</h3></header>
          {step === 1 && renderUploadStep()}
          {step === 2 && renderExpertStep()}
          {step === 3 && renderKnowledgeStep()}
          {step === 4 && renderPromptStep()}
          {step === 5 && renderConfirmStep()}
          {error && <p className="skill-wizard-error" role="alert">{error}</p>}
        </main>
        <footer className="skill-wizard-footer">
          <button className="ghost-button" type="button" onClick={step === 1 ? props.onClose : () => { setError(null); setStep((current) => Math.max(1, current - 1)); }} disabled={busy}>
            {step === 1 ? "取消" : <><ChevronLeft size={15} />上一步</>}
          </button>
          {step < 5 ? (
            <button className="primary-button" type="button" onClick={goNext} disabled={busy || (step === 1 && !upload)}>
              {step === 3 && knowledgeMode === "NONE" ? "保存草稿并退出" : <>下一步<ChevronRight size={15} /></>}
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={() => void confirm()} disabled={busy}>
              {busy ? "正在原子保存…" : <><Upload size={15} />确认保存{studentVisible ? "并启用" : ""}</>}
            </button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
