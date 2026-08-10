import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LexiangKnowledgeMappingEditor } from "../../src/LexiangKnowledgeMappingEditor";

describe("LexiangKnowledgeMappingEditor", () => {
  it("按当前课程共享知识库 ID 保存独立映射", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <LexiangKnowledgeMappingEditor
        scopeType="COURSE_SHARED"
        baseId="base-course-002"
        baseName="BP 模板知识库"
        mapping={null}
        loading={false}
        saving={false}
        loadError={null}
        onSave={onSave}
      />,
    );

    await user.type(screen.getByLabelText("Space ID"), "space-bp");
    await user.type(screen.getByLabelText("Parent Entry ID"), "parent-bp");
    await user.click(screen.getByLabelText("启用映射"));
    await user.click(screen.getByRole("button", { name: "保存映射" }));

    expect(onSave).toHaveBeenCalledWith({
      baseId: "base-course-002",
      spaceId: "space-bp",
      parentEntryId: "parent-bp",
      enabled: true,
    });
    expect(screen.queryByText(/AppKey|Secret|Token/)).not.toBeInTheDocument();
  });

  it("保存映射时要求两个目录标识完整", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <LexiangKnowledgeMappingEditor
        scopeType="COURSE_SHARED"
        baseId="base-course-003"
        baseName="PPT 模板知识库"
        mapping={null}
        loading={false}
        saving={false}
        loadError={null}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存映射" }));

    expect(screen.getByRole("alert")).toHaveTextContent("必须填写 Space ID 和 Parent Entry ID");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("专家专属知识库不展示映射配置", () => {
    render(
      <LexiangKnowledgeMappingEditor
        scopeType="EXPERT_PRIVATE"
        baseId="base-private-001"
        baseName="专家专属知识库"
        mapping={null}
        loading={false}
        saving={false}
        loadError={null}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByRole("form", { name: /乐享知识库映射/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Space ID")).not.toBeInTheDocument();
  });
});
