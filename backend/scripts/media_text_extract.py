#!/usr/bin/env python3
"""Local OCR/ASR/video text extraction for the SUFE platform.

The script only reads the supplied local file and emits one JSON object to
stdout. It never uploads media or calls a paid provider.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path


def emit(status: str, content: str | None, message: str, **details: object) -> None:
    payload = {"status": status, "content": content, "message": message, **details}
    print(json.dumps(payload, ensure_ascii=False))


def normalize(lines: list[str], limit: int = 50_000) -> str:
    text = "\n".join(line.strip() for line in lines if line and line.strip()).strip()
    return text[:limit]


def create_ocr():
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


def ocr_array(ocr, image) -> list[str]:
    result, _ = ocr(image)
    if not result:
        return []
    return [str(item[1]).strip() for item in result if len(item) > 1 and str(item[1]).strip()]


def extract_image(path: Path) -> tuple[str, dict[str, object]]:
    import cv2

    image = cv2.imdecode(__import__("numpy").fromfile(path, dtype="uint8"), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("图片无法解码")
    lines = ocr_array(create_ocr(), image)
    return normalize(lines), {"ocrLines": len(lines)}


def extract_pdf(path: Path, max_pages: int) -> tuple[str, dict[str, object]]:
    import fitz
    import numpy as np

    ocr = create_ocr()
    pages: list[str] = []
    with fitz.open(path) as document:
        page_count = min(document.page_count, max_pages)
        for index in range(page_count):
            pixmap = document.load_page(index).get_pixmap(matrix=fitz.Matrix(1.8, 1.8), alpha=False)
            image = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.height, pixmap.width, pixmap.n)
            lines = ocr_array(ocr, image)
            if lines:
                pages.append(f"第 {index + 1} 页\n" + "\n".join(lines))
    return normalize(pages), {"pagesProcessed": page_count, "pageLimit": max_pages}


def extract_audio(path: Path, model_name: str) -> tuple[str, dict[str, object]]:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8", local_files_only=True)
    segments, info = model.transcribe(str(path), beam_size=3, vad_filter=True)
    rows: list[str] = []
    count = 0
    for segment in segments:
        value = segment.text.strip()
        if value:
            rows.append(f"[{segment.start:.1f}-{segment.end:.1f}s] {value}")
            count += 1
    return normalize(rows), {
        "segments": count,
        "language": getattr(info, "language", None),
        "languageProbability": round(float(getattr(info, "language_probability", 0.0)), 4),
        "model": model_name,
    }


def extract_video_frames(path: Path, frame_interval: float, max_frames: int) -> tuple[list[str], dict[str, object]]:
    import cv2

    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise ValueError("视频无法解码")
    try:
        duration_ms = capture.get(cv2.CAP_PROP_FRAME_COUNT) / max(capture.get(cv2.CAP_PROP_FPS), 0.001) * 1000
        duration_seconds = max(duration_ms / 1000, 0.0)
        wanted = min(max_frames, max(1, int(math.ceil(duration_seconds / frame_interval)) + 1))
        ocr = create_ocr()
        frame_rows: list[str] = []
        seen_text: set[str] = set()
        processed = 0
        for index in range(wanted):
            second = min(index * frame_interval, duration_seconds)
            capture.set(cv2.CAP_PROP_POS_MSEC, second * 1000)
            ok, frame = capture.read()
            if not ok:
                continue
            processed += 1
            lines = ocr_array(ocr, frame)
            signature = "\n".join(lines)
            if signature and signature not in seen_text:
                seen_text.add(signature)
                frame_rows.append(f"[{second:.1f}s 抽帧文字] " + "；".join(lines))
    finally:
        capture.release()

    return frame_rows, {
        "durationSeconds": round(duration_seconds, 2),
        "framesProcessed": processed,
        "framesWithText": len(frame_rows),
        "frameIntervalSeconds": frame_interval,
    }


def extract_video(path: Path, model_name: str, frame_interval: float, max_frames: int) -> tuple[str, dict[str, object]]:
    transcript = ""
    audio_details: dict[str, object] = {}
    audio_status = "EMPTY"
    audio_failed = False
    try:
        transcript, audio_details = extract_audio(path, model_name)
        audio_status = "READY" if transcript else "EMPTY"
    except Exception:
        # A video can legitimately have no audio track. Keep sampled-frame OCR usable.
        audio_status = "UNAVAILABLE"
        audio_failed = True

    frame_rows: list[str] = []
    frame_details: dict[str, object] = {}
    frame_status = "EMPTY"
    frame_failed = False
    try:
        frame_rows, frame_details = extract_video_frames(path, frame_interval, max_frames)
        frame_status = "READY" if frame_rows else "EMPTY"
    except Exception:
        # A decodable audio track can still be useful when OpenCV cannot read frames.
        frame_status = "UNAVAILABLE"
        frame_failed = True

    if audio_failed and frame_failed:
        raise ValueError("视频音轨与抽帧均无法解析")

    sections: list[str] = []
    if transcript:
        sections.append("## 音轨 ASR 转写\n" + transcript)
    if frame_rows:
        sections.append("## 抽帧 OCR\n" + "\n".join(frame_rows))

    if transcript and frame_rows:
        result_message = "视频音轨 ASR 与抽帧 OCR 解析完成"
    elif transcript:
        result_message = (
            "视频音轨 ASR 完成；抽帧 OCR 未完成"
            if frame_failed
            else "视频音轨 ASR 完成；抽帧 OCR 未识别到可读文字"
        )
    elif frame_rows:
        result_message = (
            "视频抽帧 OCR 完成；音轨 ASR 未完成"
            if audio_failed
            else "视频抽帧 OCR 完成；音轨 ASR 未识别到可读文字"
        )
    else:
        unavailable = []
        if audio_failed:
            unavailable.append("音轨 ASR 未完成")
        if frame_failed:
            unavailable.append("抽帧 OCR 未完成")
        result_message = "；".join(unavailable) or "视频音轨和抽帧中未识别到可读文字"

    details = {
        **audio_details,
        **frame_details,
        "analysisScope": "audio_track_asr_and_sampled_frame_ocr",
        "visualSemanticAnalysis": False,
        "audioStatus": audio_status,
        "sampledFrameOcrStatus": frame_status,
        "resultMessage": result_message,
    }
    return normalize(sections), details


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("image", "pdf", "audio", "video"), required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--whisper-model", default="base")
    parser.add_argument("--frame-interval", type=float, default=5.0)
    parser.add_argument("--max-frames", type=int, default=12)
    parser.add_argument("--max-pdf-pages", type=int, default=20)
    args = parser.parse_args()
    path = Path(args.input).resolve()
    if not path.is_file():
        emit("FAILED", None, "待解析文件不存在")
        return 2

    try:
        if args.mode == "image":
            content, details = extract_image(path)
            success_message = "图片 OCR 识别完成"
        elif args.mode == "pdf":
            content, details = extract_pdf(path, max(1, min(args.max_pdf_pages, 50)))
            success_message = "扫描版 PDF OCR 识别完成"
        elif args.mode == "audio":
            content, details = extract_audio(path, args.whisper_model)
            success_message = "音频 ASR 转写完成"
        else:
            content, details = extract_video(
                path,
                args.whisper_model,
                max(1.0, args.frame_interval),
                max(1, min(args.max_frames, 60)),
            )
            success_message = str(details.pop("resultMessage"))
        if not content:
            emit("EMPTY", None, success_message if args.mode == "video" else "未识别到可读文字", **details)
        else:
            emit("READY", content, success_message, **details)
        return 0
    except Exception as exception:  # concise JSON error; Java side owns detailed logs
        emit("FAILED", None, f"本地媒体解析失败：{type(exception).__name__}")
        print(str(exception), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
