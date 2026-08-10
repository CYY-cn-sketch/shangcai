import { useEffect, useMemo, useState } from "react";
import { Archive, Download, FileCode2, FileText, FolderOpen } from "lucide-react";
import {
  getExpertSkillSource,
  type ExpertSkillSourceFileRecord,
  type ExpertSkillSourceRecord,
} from "./api/knowledge";

const roleLabels: Record<ExpertSkillSourceFileRecord["fileRole"], string> = {
  PROMPT: "主提示词",
  CONFIG: "配置文件",
  KNOWLEDGE_CANDIDATE: "知识资料",
  SOURCE_CODE: "源代码归档",
  REFERENCE: "参考资料",
};

const sourceLabels: Record<ExpertSkillSourceRecord["sourceType"], string> = {
  UPLOADED: "上传并确认",
  STARTER: "系统预置",
  PROFILE: "专家档案",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileState(file: ExpertSkillSourceFileRecord) {
  if (file.importedAssetId) return "已进入专属检索库";
  if (file.fileRole === "KNOWLEDGE_CANDIDATE") return "未导入检索";
  return "仅作来源档案";
}

function fileIcon(file: ExpertSkillSourceFileRecord) {
  return file.fileRole === "SOURCE_CODE" ? <FileCode2 size={17} /> : <FileText size={17} />;
}

export function ExpertSkillSourceFiles({ expertId }: { expertId: string }) {
  const [source, setSource] = useState<ExpertSkillSourceRecord | null>(null);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void getExpertSkillSource(expertId)
      .then((result) => {
        if (cancelled) return;
        setSource(result);
        const initialFile = result.files.find((file) => file.relativePath === result.mainFilePath) || result.files[0];
        setSelectedFileId(initialFile?.id || "");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Skill 来源文件读取失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expertId]);

  const selectedFile = useMemo(
    () => source?.files.find((file) => file.id === selectedFileId) || source?.files[0] || null,
    [selectedFileId, source],
  );
  const importedCount = source?.files.filter((file) => file.importedAssetId).length || 0;

  return (
    <section className="expert-skill-source" aria-labelledby={`expert-skill-source-${expertId}`}>
      <header>
        <div>
          <span className="expert-skill-source-icon" aria-hidden="true"><Archive size={17} /></span>
          <div>
            <strong id={`expert-skill-source-${expertId}`}>Skill 包来源档案</strong>
            <span>查看包内文件和安全文本内容；脚本与程序只归档，不会执行。</span>
          </div>
        </div>
        {source ? (
          <div className="expert-skill-source-summary" aria-label="Skill 来源摘要">
            <span>{sourceLabels[source.sourceType]}</span>
            <strong>{source.files.length} 个文件</strong>
            <small>{importedCount} 个进入专属检索库</small>
          </div>
        ) : null}
      </header>

      {loading ? <p className="expert-skill-source-state">正在读取 Skill 文件…</p> : null}
      {!loading && error ? <p className="expert-skill-source-state error">{error}</p> : null}
      {!loading && !error && source && source.files.length === 0 ? (
        <p className="expert-skill-source-state">当前专家尚无可追溯的 Skill 文件，请重新上传并确认 Skill。</p>
      ) : null}

      {!loading && !error && source && selectedFile ? (
        <div className="expert-skill-source-browser">
          <aside aria-label="Skill 文件目录">
            <div className="expert-skill-folder-name">
              <FolderOpen size={16} aria-hidden="true" />
              <span>{source.folderName || "Skill"}</span>
            </div>
            <div className="expert-skill-file-list">
              {source.files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className={file.id === selectedFile.id ? "selected" : ""}
                  aria-pressed={file.id === selectedFile.id}
                  onClick={() => setSelectedFileId(file.id)}
                >
                  <span className="expert-skill-file-icon" aria-hidden="true">{fileIcon(file)}</span>
                  <span className="expert-skill-file-copy">
                    <strong>{file.relativePath.split("/").pop()}</strong>
                    <small title={file.relativePath}>{file.relativePath}</small>
                  </span>
                  <span className="expert-skill-file-role">{roleLabels[file.fileRole]}</span>
                </button>
              ))}
            </div>
          </aside>

          <article className="expert-skill-file-preview">
            <header>
              <div>
                <strong>{selectedFile.relativePath}</strong>
                <span>{roleLabels[selectedFile.fileRole]} · {formatFileSize(selectedFile.fileSizeBytes)} · {fileState(selectedFile)}</span>
              </div>
              {selectedFile.downloadUrl ? (
                <a href={selectedFile.downloadUrl} download aria-label={`下载 ${selectedFile.relativePath}`}>
                  <Download size={15} aria-hidden="true" />
                  下载原文件
                </a>
              ) : null}
            </header>
            {selectedFile.contentText ? (
              <pre>{selectedFile.contentText}</pre>
            ) : (
              <div className="expert-skill-file-unavailable">
                <FileCode2 size={24} aria-hidden="true" />
                <strong>该文件不提供在线文本预览</strong>
                <span>二进制文件或源代码仅保存归档，可下载检查，但平台不会执行。</span>
              </div>
            )}
            {selectedFile.contentTruncated ? <small className="expert-skill-preview-note">内容较长，当前仅展示前 50,000 个字符。</small> : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
