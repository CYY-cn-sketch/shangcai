import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpeechInputEnvironmentIssue, useSpeechInput } from "../../src/useSpeechInput";

type ResultEvent = Event & {
  resultIndex: number;
  results: { length: number; [index: number]: { 0?: { transcript?: string } } };
};
type ErrorEvent = Event & { error?: string; message?: string };

class MockSpeechRecognition {
  static instance: MockSpeechRecognition | null = null;
  lang = "";
  interimResults = false;
  continuous = false;
  maxAlternatives = 0;
  onstart: (() => void) | null = null;
  onresult: ((event: ResultEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn();
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instance = this;
  }

  emitResult(transcript: string) {
    const results = [{ 0: { transcript } }];
    this.onresult?.({ resultIndex: 0, results } as unknown as ResultEvent);
  }

  emitError(error: string) {
    this.onerror?.({ error } as ErrorEvent);
  }

  emitEnd() {
    this.onend?.();
  }
}

function installRecognition() {
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    writable: true,
    value: MockSpeechRecognition,
  });
}

afterEach(() => {
  MockSpeechRecognition.instance = null;
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
  vi.restoreAllMocks();
});

describe("useSpeechInput", () => {
  it("只把浏览器真实识别结果追加到现有文本", () => {
    installRecognition();
    const onChange = vi.fn();
    const { result } = renderHook(() => useSpeechInput({ value: "原有内容", onChange }));

    act(() => result.current.toggle());
    expect(result.current.status).toBe("listening");
    expect(MockSpeechRecognition.instance?.lang).toBe("zh-CN");

    act(() => MockSpeechRecognition.instance?.emitResult("这是麦克风识别结果"));
    expect(onChange).toHaveBeenCalledWith("原有内容\n这是麦克风识别结果");
    expect(result.current.hasVoiceInput).toBe(true);
  });

  it("权限拒绝时只提示错误，不写入模拟文字且不被 onend 覆盖", () => {
    installRecognition();
    const onChange = vi.fn();
    const { result } = renderHook(() => useSpeechInput({ value: "保留文本", onChange }));

    act(() => result.current.toggle());
    act(() => {
      MockSpeechRecognition.instance?.emitError("not-allowed");
      MockSpeechRecognition.instance?.emitEnd();
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
    expect(result.current.notice).toContain("麦克风权限被拒绝");
    expect(result.current.hasVoiceInput).toBe(false);
  });

  it("不支持 Web Speech API 时提示正确环境和上传录音，不修改文本", () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    const onChange = vi.fn();
    const { result } = renderHook(() => useSpeechInput({ value: "保留文本", onChange }));

    act(() => result.current.toggle());

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.status).toBe("unsupported");
    expect(result.current.notice).toContain("localhost 或 HTTPS 的 Chrome/Edge");
    expect(result.current.notice).toContain("本地上传");
  });

  it("支持显式停止，并在结束前保持停止中状态", () => {
    installRecognition();
    const { result } = renderHook(() => useSpeechInput({ value: "", onChange: vi.fn() }));

    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(MockSpeechRecognition.instance?.stop).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("stopping");

    act(() => MockSpeechRecognition.instance?.emitEnd());
    expect(result.current.status).toBe("idle");
    expect(result.current.notice).toContain("未识别到语音");
  });

  it("明确识别局域网 HTTP 为不安全上下文", () => {
    expect(getSpeechInputEnvironmentIssue({
      isSecureContext: false,
      hostname: "192.168.1.20",
      hasRecognitionApi: true,
    })).toContain("不是安全上下文");
    expect(getSpeechInputEnvironmentIssue({
      isSecureContext: false,
      hostname: "localhost",
      hasRecognitionApi: true,
    })).toBeNull();
  });
});
