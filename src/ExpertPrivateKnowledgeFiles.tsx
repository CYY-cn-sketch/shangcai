import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, LoaderCircle, Trash2, Upload, X } from "lucide-react";

export type ExpertPrivateKnowledgeFile = {
  id: string;
  name: string;
  sizeLabel: string;
  fileType: string;
  enabled?: boolean;
  extractionStatus?: "READY" | "EMPTY" | "OCR_REQUIRED" | "ASR_REQUIRED" | "UNSUPPORTED" | "FAILED";
  extractionMessage?: string;
  fileAvailable?: boolean;
  downloadUrl?: string;
};

type ExpertPrivateKnowledgeFilesProps = {
  files: ExpertPrivateKnowledgeFile[];
  available: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
};

const acceptedExtensions = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.mp3,.m4a,.wav,.mp4,.mov,.webm";

function extractionLabel(file: ExpertPrivateKnowledgeFile) {
  switch (file.extractionStatus) {
    case "READY":
      return { text: "已读取，可检索", tone: "ready", icon: CheckCircle2 };
    case "OCR_REQUIRED":
      return { text: "待 OCR，暂不可检索", tone: "pending", icon: AlertCircle };
    case "ASR_REQUIRED":
      return { text: "待 ASR，暂不可检索", tone: "pending", icon: AlertCircle };
    case "FAILED":
      return { text: "读取失败", tone: "error", icon: AlertCircle };
    case "UNSUPPORTED":
      return { text: "暂不支持正文提取", tone: "pending", icon: AlertCircle };
    case "EMPTY":
      return { text: "未提取到正文", tone: "pending", icon: AlertCircle };
    default:
      return { text: "已保存", tone: "neutral", icon: FileText };
  }
}

export function ExpertPrivateKnowledgeFiles(props: ExpertPrivateKnowledgeFilesProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    if (!files.length || uploading) return;
    if (files.length > 10) {
      setMessage(null);
      setError("一次最多上传 10 个文件，请分批上传。");
      return;
    }
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      await props.onUpload(files);
      setMessage(`已上传 ${files.length} 个文件，系统已完成保存和正文读取。`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "文件上传失败，请稍后重试。");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(file: ExpertPrivateKnowledgeFile) {
    if (deletingId) return;
    if (pendingDeleteId !== file.id) {
      setMessage(null);
      setError(null);
      setPendingDeleteId(file.id);
      return;
    }
    setDeletingId(file.id);
    setMessage(null);
    setError(null);
    try {
      await props.onDelete(file.id);
      setPendingDeleteId(null);
      setMessage(`已删除“${file.name}”，资料数量和检索列表已刷新。`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "知识资料删除失败，请稍后重试。");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="expert-private-files" aria-labelledby="expert-private-files-title">
      <header>
        <div>
          <strong id="expert-private-files-title">当前专家检索资料</strong>
          <span>上传后系统提取可读正文，仅供当前专家检索，不会修改 Skill 提示词。</span>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden-input"
          type="file"
          accept={acceptedExtensions}
          multiple
          disabled={!props.available || uploading}
          onChange={(event) => void handleFiles(Array.from(event.target.files || []))}
        />
        <button
          className="ghost-button expert-private-upload-button"
          type="button"
          disabled={!props.available || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
          {uploading ? "正在读取…" : "上传知识资料"}
        </button>
      </header>

      {!props.available ? (
        <p className="expert-private-files-empty">
          请先通过 Skill 配置建立该专家的专属知识库，再上传补充资料。
        </p>
      ) : props.files.length === 0 ? (
        <div className="expert-private-files-empty">
          <FileText size={20} aria-hidden="true" />
          <div>
            <strong>还没有进入检索库的资料</strong>
            <span>可上传文档、图片、音频或视频；系统会提取文本、OCR、ASR 与关键帧文字，单个文件不超过 20 MB。</span>
          </div>
        </div>
      ) : (
        <ul className="expert-private-file-list" aria-label="专家专属知识资料">
          {props.files.map((file) => {
            const status = extractionLabel(file);
            const StatusIcon = status.icon;
            return (
              <li key={file.id}>
                <span className="expert-private-file-icon" aria-hidden="true"><FileText size={17} /></span>
                <div className="expert-private-file-copy">
                  <strong>{file.name}</strong>
                  <span>{file.fileType} · {file.sizeLabel}</span>
                  {file.extractionMessage && status.tone !== "ready" && <small>{file.extractionMessage}</small>}
                </div>
                <span className={`expert-private-file-status ${status.tone}`}>
                  <StatusIcon size={13} aria-hidden="true" />
                  {status.text}
                </span>
                {file.fileAvailable && file.downloadUrl && (
                  <a href={file.downloadUrl} aria-label={`下载 ${file.name}`}>
                    <Download size={15} />
                    下载
                  </a>
                )}
                <div className="expert-private-file-delete-actions">
                  {pendingDeleteId === file.id && deletingId !== file.id && (
                    <button
                      className="expert-private-file-delete-cancel"
                      type="button"
                      aria-label={`取消删除 ${file.name}`}
                      onClick={() => setPendingDeleteId(null)}
                    >
                      <X size={14} />
                      取消
                    </button>
                  )}
                  <button
                    className={pendingDeleteId === file.id ? "expert-private-file-delete confirm" : "expert-private-file-delete"}
                    type="button"
                    disabled={Boolean(deletingId)}
                    aria-label={pendingDeleteId === file.id ? `确认删除 ${file.name}` : `删除 ${file.name}`}
                    onClick={() => void handleDelete(file)}
                  >
                    {deletingId === file.id ? <LoaderCircle className="spin" size={14} /> : <Trash2 size={14} />}
                    {deletingId === file.id ? "删除中…" : pendingDeleteId === file.id ? "确认删除" : "删除"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="expert-private-file-note">
        可直接检索的资料：{props.files.filter((file) => file.enabled !== false && file.extractionStatus === "READY").length} 个
        <span>图片与扫描 PDF 使用本地 OCR；音频使用本地 ASR；视频提取音轨转写和关键帧文字。</span>
      </div>
      {(message || error) && (
        <p className={`expert-private-upload-feedback ${error ? "error" : "success"}`} role="status">
          {error || message}
        </p>
      )}
    </section>
  );
}
