import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StructuredAiResponse } from "../../src/StructuredAiResponse";

describe("StructuredAiResponse", () => {
  it("separates the user-facing summary from the final answer without exposing raw markdown", () => {
    render(
      <StructuredAiResponse
        content={"【处理摘要】基于访谈材料判断，当前定位仍偏宽。【正式回复】## 一句话定位\n- 面向商学院学生\n- 聚焦模拟面试"}
      />,
    );

    expect(screen.getByRole("heading", { name: "处理摘要" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "正式回复" })).toBeInTheDocument();
    expect(screen.getByText("一句话定位")).toBeInTheDocument();
    expect(screen.queryByText(/##/)).not.toBeInTheDocument();
  });

  it("normalizes legacy one-line markdown into readable sections", () => {
    render(<StructuredAiResponse content={"结论先行 ## 关键建议 - 补充第一用户 --- ## 下一步 - 完成三次访谈"} />);

    expect(screen.getByText("关键建议 - 补充第一用户")).toBeInTheDocument();
    expect(screen.getByText("下一步 - 完成三次访谈")).toBeInTheDocument();
  });
});
