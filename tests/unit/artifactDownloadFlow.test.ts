import { describe, expect, it, vi } from "vitest";
import { downloadThenRecord } from "../../src/artifactDownloadFlow";

describe("artifactDownloadFlow", () => {
  it("仅在异步文件生成成功后记录下载", async () => {
    const order: string[] = [];
    const outcome = await downloadThenRecord(
      async () => {
        order.push("download");
      },
      async () => {
        order.push("record");
      },
    );

    expect(order).toEqual(["download", "record"]);
    expect(outcome).toEqual({ recorded: true });
  });

  it("文件生成失败时传播异常且不写下载记录", async () => {
    const record = vi.fn();

    await expect(downloadThenRecord(
      async () => {
        throw new Error("DOCX 生成失败");
      },
      record,
    )).rejects.toThrow("DOCX 生成失败");
    expect(record).not.toHaveBeenCalled();
  });

  it("文件已下载但记账失败时返回独立结果", async () => {
    const error = new Error("记录接口失败");
    const outcome = await downloadThenRecord(
      async () => undefined,
      async () => {
        throw error;
      },
    );

    expect(outcome).toEqual({ recorded: false, recordError: error });
  });
});
