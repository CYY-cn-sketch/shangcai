import { useRef, useState } from "react";
import { Eye, Upload } from "lucide-react";
import {
  type ExpertSkillConfirmationRecord,
  type KnowledgeExpertRecord,
} from "./api/knowledge";
import { ExpertSkillWizard } from "./ExpertSkillWizard";

type KnowledgeBaseOption = {
  id?: string;
  category: string;
  description: string;
  usedBy: string;
  active?: boolean;
  scopeType?: "COURSE_SHARED" | "EXPERT_PRIVATE";
  ownerExpertId?: string | null;
};

export function ExpertSkillManager(props: {
  actorLabel: string;
  knowledgeBases: KnowledgeBaseOption[];
  experts: KnowledgeExpertRecord[];
  onConfirmed: (result: ExpertSkillConfirmationRecord) => void | Promise<void>;
  onOpenExpert: (expertId: string) => void;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  function closeWizard() {
    setWizardOpen(false);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }

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
        <div className="expert-skill-list">
          <header><strong>已配置专家</strong><small>{props.experts.length} 个</small></header>
          {props.experts.length ? props.experts.map((expert) => (
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
          )) : <p>暂无专家，请上传 Skill 完成首个专家配置。</p>}
        </div>
      </section>
      {wizardOpen && (
        <ExpertSkillWizard
          actorLabel={props.actorLabel}
          knowledgeBases={props.knowledgeBases}
          experts={props.experts}
          onClose={closeWizard}
          onConfirmed={async (result) => {
            await props.onConfirmed(result);
          }}
        />
      )}
    </>
  );
}
