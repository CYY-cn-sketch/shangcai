import { useEffect, useRef, useState } from "react";
import { Eye, Upload } from "lucide-react";
import {
  listKnowledgeExperts,
  type ExpertSkillConfirmationRecord,
  type KnowledgeExpertRecord,
} from "./api/knowledge";
import { ExpertSkillWizard } from "./ExpertSkillWizard";

type KnowledgeBaseOption = { id?: string; category: string; description: string; usedBy: string; active?: boolean };

export function ExpertSkillManager(props: {
  actorLabel: string;
  knowledgeBases: KnowledgeBaseOption[];
  refreshKey?: number;
  onConfirmed: (result: ExpertSkillConfirmationRecord) => void | Promise<void>;
  onOpenExpert: (expertId: string) => void;
  onMessage: (message: string) => void;
}) {
  const { onMessage } = props;
  const [experts, setExperts] = useState<KnowledgeExpertRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  function closeWizard() {
    setWizardOpen(false);
    void reload();
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }

  async function reload() {
    setLoading(true);
    try {
      setExperts(await listKnowledgeExperts());
    } catch (caught) {
      onMessage(caught instanceof Error ? caught.message : "专家列表读取失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    listKnowledgeExperts()
      .then((records) => {
        if (active) setExperts(records);
      })
      .catch((caught) => {
        if (active) onMessage(caught instanceof Error ? caught.message : "专家列表读取失败。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onMessage, props.refreshKey]);

  return (
    <>
      <section className="expert-skill-manager-panel">
        <div className="expert-skill-manager-copy">
          <h4>专家列表</h4>
          <p>上传 Skill 后完成一次配置即可生效；点击专家查看知识库、提示词和来源信息。</p>
        </div>
        <div className="expert-skill-manager-actions">
          <button className="primary-button" type="button" onClick={(event) => { openerRef.current = event.currentTarget; setWizardOpen(true); }}>
            <Upload size={16} />上传并配置 Skill
          </button>
        </div>
        <div className="expert-skill-list" aria-busy={loading}>
          <header><strong>已配置专家</strong><small>{loading ? "读取中…" : `${experts.length} 个`}</small></header>
          {experts.length ? experts.map((expert) => (
            <button key={expert.id} type="button" onClick={(event) => { openerRef.current = event.currentTarget; props.onOpenExpert(expert.id); }}>
              <span className="expert-skill-list-accent" style={{ background: expert.accent }} aria-hidden="true" />
              <span className="expert-skill-list-copy">
                <strong>{expert.name}</strong>
                <small>{expert.role}</small>
              </span>
              <span className={`expert-skill-list-status ${expert.active ? "active" : "inactive"}`}>{expert.active ? "已启用" : "未启用"}</span>
              <span className="expert-skill-list-meta">{expert.knowledgeCategories.length} 个知识库</span>
              <span className="expert-skill-list-action"><Eye size={15} />查看详情</span>
            </button>
          )) : <p>{loading ? "正在读取专家列表…" : "暂无专家，请上传 Skill 完成首个专家配置。"}</p>}
        </div>
      </section>
      {wizardOpen && (
        <ExpertSkillWizard
          actorLabel={props.actorLabel}
          knowledgeBases={props.knowledgeBases}
          experts={experts}
          onClose={closeWizard}
          onConfirmed={async (result) => {
            await props.onConfirmed(result);
            setExperts((current) => [result.expert, ...current.filter((expert) => expert.id !== result.expert.id)]);
          }}
        />
      )}
    </>
  );
}
