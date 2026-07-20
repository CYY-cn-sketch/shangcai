import { useEffect, useRef, useState } from "react";
import { Archive, ChevronRight, RefreshCw, Upload } from "lucide-react";
import {
  listExpertSkillUploads,
  listKnowledgeExperts,
  type ExpertSkillConfirmationRecord,
  type ExpertSkillUploadRecord,
  type KnowledgeExpertRecord,
} from "./api/knowledge";
import { ExpertSkillWizard } from "./ExpertSkillWizard";

type KnowledgeBaseOption = { id?: string; category: string; description: string; usedBy: string; active?: boolean };

export function ExpertSkillManager(props: {
  actorLabel: string;
  knowledgeBases: KnowledgeBaseOption[];
  onConfirmed: (result: ExpertSkillConfirmationRecord) => void | Promise<void>;
  onMessage: (message: string) => void;
}) {
  const { onMessage } = props;
  const [uploads, setUploads] = useState<ExpertSkillUploadRecord[]>([]);
  const [experts, setExperts] = useState<KnowledgeExpertRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [resumeUpload, setResumeUpload] = useState<ExpertSkillUploadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  function closeWizard() {
    setWizardOpen(false);
    setResumeUpload(null);
    void reload();
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }

  async function reload() {
    setLoading(true);
    try {
      const [nextUploads, nextExperts] = await Promise.all([listExpertSkillUploads(), listKnowledgeExperts()]);
      setUploads(nextUploads);
      setExperts(nextExperts);
    } catch (caught) {
      onMessage(caught instanceof Error ? caught.message : "Skill 草稿读取失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([listExpertSkillUploads(), listKnowledgeExperts()])
      .then(([records, nextExperts]) => {
        if (active) {
          setUploads(records);
          setExperts(nextExperts);
        }
      })
      .catch((caught) => {
        if (active) onMessage(caught instanceof Error ? caught.message : "Skill 草稿读取失败。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onMessage]);

  const drafts = uploads.filter((upload) => upload.status === "PARSED");
  return (
    <>
      <section className="expert-skill-manager-panel">
        <div className="expert-skill-manager-copy">
          <span className="eyebrow">统一配置入口</span>
          <h4>上传 Skill 后分步确认</h4>
          <p>系统保存完整来源档案，只把勾选的知识资料导入知识库；提示词和配置单独写入专家档案。</p>
        </div>
        <div className="expert-skill-manager-actions">
          <button className="primary-button" type="button" onClick={(event) => { openerRef.current = event.currentTarget; setResumeUpload(null); setWizardOpen(true); }}>
            <Upload size={16} />上传并配置 Skill
          </button>
          <button className="ghost-button" type="button" onClick={() => void reload()} disabled={loading} aria-label="刷新 Skill 草稿">
            <RefreshCw size={15} />{loading ? "读取中…" : "刷新草稿"}
          </button>
        </div>
        <div className="expert-skill-draft-list">
          <header><span><Archive size={15} />待确认草稿</span><small>{drafts.length} 个</small></header>
          {drafts.length ? drafts.slice(0, 5).map((upload) => (
            <button key={upload.id} type="button" onClick={(event) => { openerRef.current = event.currentTarget; setResumeUpload(upload); setWizardOpen(true); }}>
              <span><strong>{upload.parsedName}</strong><small>{upload.folderName} · {upload.fileCount} 个文件</small></span>
              <span>继续配置<ChevronRight size={14} /></span>
            </button>
          )) : <p>{loading ? "正在读取草稿…" : "暂无待确认草稿。上传后可随时退出并继续配置。"}</p>}
        </div>
      </section>
      {wizardOpen && (
        <ExpertSkillWizard
          actorLabel={props.actorLabel}
          knowledgeBases={props.knowledgeBases}
          experts={experts}
          initialUpload={resumeUpload}
          onClose={closeWizard}
          onConfirmed={async (result) => {
            await props.onConfirmed(result);
            setUploads((current) => [result.upload, ...current.filter((upload) => upload.id !== result.upload.id)]);
            setExperts((current) => [result.expert, ...current.filter((expert) => expert.id !== result.expert.id)]);
          }}
        />
      )}
    </>
  );
}
