import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExpertPrivateKnowledgeFiles } from "../../src/ExpertPrivateKnowledgeFiles";

describe("ExpertPrivateKnowledgeFiles", () => {
  it("展示零资料原因并把用户选择的文件交给受控上传", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ExpertPrivateKnowledgeFiles files={[]} available onUpload={onUpload} onDelete={vi.fn()} />,
    );

    expect(screen.getByText("还没有进入检索库的资料")).toBeInTheDocument();
    const file = new File(["专家补充资料"], "补充资料.txt", { type: "text/plain" });
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, file);

    expect(onUpload).toHaveBeenCalledWith([file]);
  });

  it("分别展示可检索、待 OCR 与待 ASR 的真实提取状态", () => {
    render(
      <ExpertPrivateKnowledgeFiles
        available
        onUpload={vi.fn()}
        onDelete={vi.fn()}
        files={[
          {
            id: "ready",
            name: "规则.md",
            sizeLabel: "1 KB",
            fileType: "MD",
            enabled: true,
            extractionStatus: "READY",
          },
          {
            id: "ocr",
            name: "扫描材料.pdf",
            sizeLabel: "2 MB",
            fileType: "PDF",
            enabled: true,
            extractionStatus: "OCR_REQUIRED",
            extractionMessage: "PDF 中没有可提取文本，扫描页需要 OCR",
          },
          {
            id: "asr",
            name: "访谈录音.wav",
            sizeLabel: "3 MB",
            fileType: "WAV",
            enabled: true,
            extractionStatus: "ASR_REQUIRED",
            extractionMessage: "音频已保存，等待本地 ASR 转写",
          },
        ]}
      />,
    );

    expect(screen.getByText("已读取，可检索")).toBeInTheDocument();
    expect(screen.getByText("待 OCR，暂不可检索")).toBeInTheDocument();
    expect(screen.getByText("待 ASR，暂不可检索")).toBeInTheDocument();
    expect(screen.getByText("PDF 中没有可提取文本，扫描页需要 OCR")).toBeInTheDocument();
    expect(screen.getByText("音频已保存，等待本地 ASR 转写")).toBeInTheDocument();
    expect(screen.getByText(/可直接检索的资料：1 个/)).toBeInTheDocument();
  });

  it("删除资料需要二次确认并在成功后显示刷新结果", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpertPrivateKnowledgeFiles
        available
        onUpload={vi.fn()}
        onDelete={onDelete}
        files={[{
          id: "manual-file",
          name: "教师补充资料.md",
          sizeLabel: "2 KB",
          fileType: "Markdown",
          enabled: true,
          extractionStatus: "READY",
        }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "删除 教师补充资料.md" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认删除 教师补充资料.md" }));

    expect(onDelete).toHaveBeenCalledWith("manual-file");
    expect(await screen.findByText(/资料数量和检索列表已刷新/)).toBeInTheDocument();
  });
});
