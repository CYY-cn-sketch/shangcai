import { Award, CheckCircle2 } from "lucide-react";
import {
  formatDefenseScore,
  isDefenseScoreBlock,
  readDefenseScore,
  type DefenseEvaluationBlock,
} from "./defenseEvaluation";
import "./DefenseEvaluationMessage.css";

export function DefenseEvaluationMessage({ blocks }: { blocks: DefenseEvaluationBlock[] }) {
  const score = readDefenseScore(blocks);
  const feedbackBlocks = blocks.filter((block) => !isDefenseScoreBlock(block));

  return (
    <section className="defense-evaluation-message" aria-label="答辩综合评价">
      <header className="defense-evaluation-summary">
        <div className="defense-evaluation-title">
          <Award size={21} aria-hidden="true" />
          <div>
            <strong>本轮答辩综合评价</strong>
            <span>评分仅依据本轮真实问答与当前项目证据</span>
          </div>
        </div>
        <div className={`defense-total-score ${score.total === null ? "missing" : ""}`} aria-label={score.total === null ? "评分未返回" : `综合评分 ${formatDefenseScore(score.total)} 分`}>
          <strong>{score.total === null ? "—" : formatDefenseScore(score.total)}</strong>
          <span>/100</span>
        </div>
      </header>

      {score.dimensions.length > 0 && (
        <div className="defense-dimension-scores" aria-label="分项评分">
          {score.dimensions.map((dimension) => (
            <div className="defense-dimension-score" key={dimension.name}>
              <span>{dimension.name}</span>
              <meter min={0} max={dimension.maximum} value={dimension.score} aria-label={`${dimension.name} ${formatDefenseScore(dimension.score)} 分，共 ${formatDefenseScore(dimension.maximum)} 分`} />
              <strong>{formatDefenseScore(dimension.score)}/{formatDefenseScore(dimension.maximum)}</strong>
            </div>
          ))}
        </div>
      )}

      {score.total === null && (
        <p className="defense-score-warning" role="status">本次模型没有返回可核验的数字评分，评价内容已保留，可重新生成评分。</p>
      )}

      <div className="defense-evaluation-details">
        {feedbackBlocks.map((block) => (
          <section key={block.title}>
            <h4><CheckCircle2 size={16} aria-hidden="true" />{block.title}</h4>
            <ul>
              {block.items.map((item, index) => <li key={`${block.title}-${index}`}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
