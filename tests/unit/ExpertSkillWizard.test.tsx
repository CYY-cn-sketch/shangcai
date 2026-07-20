import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpertSkillWizard } from "../../src/ExpertSkillWizard";
import type { ExpertSkillConfirmationRecord, ExpertSkillUploadRecord } from "../../src/api/knowledge";

const { confirmExpertSkillUpload } = vi.hoisted(() => ({ confirmExpertSkillUpload: vi.fn() }));

vi.mock("../../src/api/knowledge", async () => {
  const actual = await vi.importActual<typeof import("../../src/api/knowledge")>("../../src/api/knowledge");
  return { ...actual, confirmExpertSkillUpload, uploadExpertSkillArchive: vi.fn() };
});

const upload: ExpertSkillUploadRecord = {
  id: "upload-1",
  folderName: "finance",
  mainFilePath: "finance/SKILL.md",
  fileCount: 3,
  parsedName: "财务验证专家",
  parsedRole: "检查财务假设",
  parsedScenario: "成本和收入测算",
  parsedAccent: "#0f7b73",
  parsedSkillName: "财务假设检查",
  parsedSkillDescription: "检查收入、成本和现金流假设",
  parsedSystemPrompt: "只根据课程资料给出建议。",
  parsedUserPrompt: "组合项目数据和学生问题。",
  parsedKnowledgeRule: "只读取已启用资料。",
  parsedOutputFormat: "输出表格。",
  parsedBoundaries: "不执行文件。",
  status: "PARSED",
  uploadedBy: "teacher@test.local",
  createdAt: "2026-07-17T00:00:00Z",
  files: [
    {
      id: "prompt-file",
      relativePath: "finance/SKILL.md",
      fileRole: "PROMPT",
      mimeType: "text/markdown",
      fileSizeBytes: 100,
      sha256: "a".repeat(64),
      downloadUrl: "/prompt",
    },
    {
      id: "config-file",
      relativePath: "finance/config.json",
      fileRole: "CONFIG",
      mimeType: "application/json",
      fileSizeBytes: 100,
      sha256: "b".repeat(64),
      downloadUrl: "/config",
    },
    {
      id: "knowledge-file",
      relativePath: "finance/references/case.md",
      fileRole: "KNOWLEDGE_CANDIDATE",
      mimeType: "text/markdown",
      fileSizeBytes: 100,
      sha256: "c".repeat(64),
      downloadUrl: "/knowledge",
    },
  ],
};

describe("ExpertSkillWizard", () => {
  beforeEach(() => confirmExpertSkillUpload.mockReset());

  it("只提交勾选的知识候选并保留提示词配置边界", async () => {
    const user = userEvent.setup();
    const result: ExpertSkillConfirmationRecord = {
      expert: {
        id: "expert-1",
        name: upload.parsedName,
        role: upload.parsedRole,
        scenario: upload.parsedScenario,
        accent: upload.parsedAccent,
        active: true,
        skills: [],
        knowledgeCategories: ["课程知识库"],
      },
      upload: { ...upload, status: "ENABLED", expertId: "expert-1" },
      knowledgeBase: { id: "kb-1", category: "课程知识库", description: "课程资料", usedBy: "专家", active: true },
      importedAssets: [],
    };
    confirmExpertSkillUpload.mockResolvedValue(result);
    const onConfirmed = vi.fn();

    render(
      <ExpertSkillWizard
        actorLabel="教师端"
        knowledgeBases={[{ id: "kb-1", category: "课程知识库", description: "课程资料", usedBy: "专家", active: true }]}
        experts={[]}
        initialUpload={upload}
        onClose={vi.fn()}
        onConfirmed={onConfirmed}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "专家配置与 Skill 管理" });
    await user.click(within(dialog).getByRole("button", { name: /下一步/ }));
    expect(within(dialog).getByRole("heading", { name: "配置知识库" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /下一步/ }));
    expect(within(dialog).getByRole("heading", { name: "检查提示词" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /下一步/ }));
    expect(within(dialog).getByRole("heading", { name: "确认启用" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /确认保存并启用/ }));

    expect(confirmExpertSkillUpload).toHaveBeenCalledWith(
      "upload-1",
      expect.objectContaining({
        knowledge: { mode: "EXISTING", knowledgeBaseId: "kb-1" },
        importFileIds: ["knowledge-file"],
        knowledgeRule: "只读取已启用资料。",
        boundaries: "不执行文件。",
      }),
    );
    expect(onConfirmed).toHaveBeenCalledWith(result);
  });

  it("名称匹配时允许明确更新已有专家并提交目标专家 ID", async () => {
    const user = userEvent.setup();
    const existingExpert = {
      id: "brainstorm",
      name: upload.parsedName,
      role: "旧定位",
      scenario: "旧场景",
      accent: "#174a7e",
      active: true,
      skills: [],
      knowledgeCategories: [],
    };
    const result: ExpertSkillConfirmationRecord = {
      expert: { ...existingExpert, role: upload.parsedRole, scenario: upload.parsedScenario },
      upload: { ...upload, status: "ENABLED", expertId: existingExpert.id },
      knowledgeBase: { id: "kb-1", category: "课程知识库", description: "课程资料", usedBy: "专家", active: true },
      importedAssets: [],
    };
    confirmExpertSkillUpload.mockResolvedValue(result);

    render(
      <ExpertSkillWizard
        actorLabel="管理员端"
        knowledgeBases={[{ id: "kb-1", category: "课程知识库", description: "课程资料", usedBy: "专家", active: true }]}
        experts={[existingExpert]}
        initialUpload={upload}
        onClose={vi.fn()}
        onConfirmed={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "专家配置与 Skill 管理" });
    expect(within(dialog).getByRole("radio", { name: /更新现有专家/ })).toBeChecked();
    expect(within(dialog).getByRole("combobox", { name: /需要更新的专家/ })).toHaveValue("brainstorm");
    await user.click(within(dialog).getByRole("button", { name: /下一步/ }));
    await user.click(within(dialog).getByRole("button", { name: /下一步/ }));
    await user.click(within(dialog).getByRole("button", { name: /下一步/ }));
    await user.click(within(dialog).getByRole("button", { name: /确认保存并启用/ }));

    expect(confirmExpertSkillUpload).toHaveBeenCalledWith(
      "upload-1",
      expect.objectContaining({ targetExpertId: "brainstorm" }),
    );
  });
});
