import { type FormEvent, useState } from "react";
import { Save } from "lucide-react";
import type {
  LexiangKnowledgeMappingRecord,
  SaveLexiangKnowledgeMappingInput,
} from "./api/knowledge";

export function LexiangKnowledgeMappingEditor(props: {
  scopeType: "COURSE_SHARED" | "EXPERT_PRIVATE";
  baseId?: string;
  baseName: string;
  mapping: LexiangKnowledgeMappingRecord | null;
  loading: boolean;
  saving: boolean;
  loadError: string | null;
  onSave: (input: SaveLexiangKnowledgeMappingInput) => Promise<void>;
}) {
  const [spaceId, setSpaceId] = useState(props.mapping?.spaceId || "");
  const [parentEntryId, setParentEntryId] = useState(props.mapping?.parentEntryId || "");
  const [enabled, setEnabled] = useState(props.mapping?.enabled || false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (props.scopeType !== "COURSE_SHARED") return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.baseId) {
      setValidationError("知识库目录尚未写入后端，暂时不能保存乐享映射。");
      return;
    }
    const normalizedSpaceId = spaceId.trim();
    const normalizedParentEntryId = parentEntryId.trim();
    if (!normalizedSpaceId || !normalizedParentEntryId) {
      setValidationError("保存映射前必须填写 Space ID 和 Parent Entry ID。");
      return;
    }
    setValidationError(null);
    try {
      await props.onSave({
        baseId: props.baseId,
        spaceId: normalizedSpaceId,
        parentEntryId: normalizedParentEntryId,
        enabled,
      });
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "乐享映射保存失败。");
    }
  }

  const unavailable = props.loading || Boolean(props.loadError) || !props.baseId;

  return (
    <form className="lexiang-knowledge-mapping" aria-label={`${props.baseName}乐享知识库映射`} onSubmit={handleSubmit}>
      <header>
        <div>
          <strong>乐享知识库映射</strong>
          <span>仅配置该目录对应的 Space ID 与 Parent Entry ID，不在浏览器录入应用密钥。</span>
        </div>
        <label className="lexiang-mapping-enabled">
          <input
            type="checkbox"
            checked={enabled}
            disabled={unavailable || props.saving}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>启用映射</span>
        </label>
      </header>
      <div className="lexiang-mapping-fields">
        <label>
          <span>Space ID</span>
          <input
            value={spaceId}
            disabled={unavailable || props.saving}
            autoComplete="off"
            maxLength={64}
            spellCheck={false}
            placeholder="填写该课程知识空间 ID"
            onChange={(event) => setSpaceId(event.target.value)}
          />
        </label>
        <label>
          <span>Parent Entry ID</span>
          <input
            value={parentEntryId}
            disabled={unavailable || props.saving}
            autoComplete="off"
            maxLength={128}
            spellCheck={false}
            placeholder="填写该目录的父节点 ID"
            onChange={(event) => setParentEntryId(event.target.value)}
          />
        </label>
        <button type="submit" disabled={unavailable || props.saving}>
          <Save size={14} aria-hidden="true" />
          {props.saving ? "保存中" : "保存映射"}
        </button>
      </div>
      {props.loading && <p role="status">正在读取该目录的乐享映射…</p>}
      {props.loadError && <p className="error" role="alert">映射状态暂不可用：{props.loadError}</p>}
      {!props.loading && !props.loadError && !props.baseId && <p role="status">目录尚未从后端加载，映射编辑已禁用。</p>}
      {validationError && <p className="error" role="alert">{validationError}</p>}
    </form>
  );
}
