import { useEffect, useRef, useState } from "react";

export type SpeechInputStatus = "idle" | "starting" | "listening" | "stopping" | "error" | "unsupported";

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionResultLike = { 0?: { transcript?: string } };
type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};
type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};
type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
  message?: string;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
}

export function getSpeechInputEnvironmentIssue(options: {
  isSecureContext: boolean;
  hostname: string;
  hasRecognitionApi: boolean;
}) {
  if (!options.isSecureContext && !isLocalHost(options.hostname)) {
    return "当前页面不是安全上下文，浏览器不能启用麦克风。请使用 localhost 或 HTTPS 的 Chrome/Edge，或改用“本地上传”录音。";
  }
  if (!options.hasRecognitionApi) {
    return "当前浏览器不支持实时语音识别。请使用 localhost 或 HTTPS 的 Chrome/Edge，或改用“本地上传”录音。";
  }
  return null;
}

function appendVoiceText(baseText: string, voiceText: string) {
  const base = baseText.trim();
  const transcript = voiceText.trim();
  if (!base) return transcript;
  if (!transcript) return base;
  return `${base}\n${transcript}`;
}

function getRecognitionErrorMessage(event: SpeechRecognitionErrorEventLike) {
  switch (event.error) {
    case "not-allowed":
    case "service-not-allowed":
      return "麦克风权限被拒绝。请在浏览器地址栏允许麦克风后重试；若通过局域网访问，请改用 localhost 或 HTTPS。";
    case "audio-capture":
      return "未检测到可用麦克风，请检查系统输入设备和浏览器麦克风权限。";
    case "no-speech":
      return "没有识别到语音，请靠近麦克风并清晰说话后重试。";
    case "network":
      return "浏览器语音识别服务连接失败，请检查网络后重试，或改用“本地上传”录音。";
    case "language-not-supported":
      return "当前浏览器不支持中文语音识别，请改用最新版 Chrome/Edge。";
    case "aborted":
      return "语音识别已取消。";
    default:
      return event.message || "语音识别失败，请检查麦克风权限后重试。";
  }
}

function detachRecognition(recognition: SpeechRecognitionLike) {
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
}

export function useSpeechInput(options: { value: string; onChange: (value: string) => void }) {
  const [status, setStatus] = useState<SpeechInputStatus>("idle");
  const [notice, setNotice] = useState("");
  const [hasVoiceInput, setHasVoiceInput] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (!recognition) return;
      detachRecognition(recognition);
      recognition.abort();
    };
  }, []);

  function start() {
    if (recognitionRef.current) return;
    const Recognition = getSpeechRecognitionConstructor();
    const environmentIssue = getSpeechInputEnvironmentIssue({
      isSecureContext: window.isSecureContext !== false,
      hostname: window.location.hostname,
      hasRecognitionApi: Boolean(Recognition),
    });
    if (!Recognition || environmentIssue) {
      setStatus("unsupported");
      setNotice(environmentIssue || "当前浏览器不支持实时语音识别。");
      return;
    }

    baseTextRef.current = options.value;
    stopRequestedRef.current = false;
    const recognition = new Recognition();
    let latestTranscript = "";
    let recognitionError = false;
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setStatus("listening");
      setNotice("正在听写，请直接说出你的想法。再次点击可停止听写。");
    };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || "";
      }
      latestTranscript = transcript.trim();
      if (!latestTranscript) return;
      options.onChange(appendVoiceText(baseTextRef.current, latestTranscript));
      setHasVoiceInput(true);
      setNotice("正在识别：" + latestTranscript);
    };
    recognition.onerror = (event) => {
      recognitionError = true;
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setStatus("error");
      setNotice(getRecognitionErrorMessage(event));
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (recognitionError) return;
      setStatus("idle");
      if (!latestTranscript) {
        setNotice(stopRequestedRef.current ? "听写已停止，未识别到语音。" : "未识别到语音，请靠近麦克风后重试。");
        return;
      }
      setNotice("语音已转成文字，可继续编辑或发送。");
    };
    recognitionRef.current = recognition;
    setStatus("starting");
    setNotice("正在请求麦克风权限，请在浏览器提示中选择“允许”。");

    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      detachRecognition(recognition);
      setStatus("error");
      setNotice(error instanceof Error ? `语音识别无法启动：${error.message}` : "语音识别无法启动，请检查麦克风权限后重试。");
    }
  }

  function toggle() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      start();
      return;
    }
    stopRequestedRef.current = true;
    setStatus("stopping");
    setNotice("正在停止听写并整理已识别文本。");
    try {
      recognition.stop();
    } catch (error) {
      recognitionRef.current = null;
      detachRecognition(recognition);
      recognition.abort();
      setStatus("error");
      setNotice(error instanceof Error ? `停止语音识别失败：${error.message}` : "停止语音识别失败，请稍后重试。");
    }
  }

  function resetVoiceInput() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      detachRecognition(recognition);
      recognition.abort();
    }
    stopRequestedRef.current = false;
    setHasVoiceInput(false);
    setStatus("idle");
    setNotice("");
  }

  const isListening = status === "starting" || status === "listening" || status === "stopping";
  return { hasVoiceInput, isListening, notice, resetVoiceInput, status, toggle };
}
