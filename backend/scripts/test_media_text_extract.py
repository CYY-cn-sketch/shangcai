from __future__ import annotations

import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import media_text_extract


class MediaTextExtractTests(unittest.TestCase):
    def test_video_keeps_sampled_frame_ocr_when_audio_track_is_unavailable(self) -> None:
        with (
            patch.object(media_text_extract, "extract_audio", side_effect=IndexError("no audio track")),
            patch.object(
                media_text_extract,
                "extract_video_frames",
                return_value=(["[0.0s 抽帧文字] 创业实践"], {"framesProcessed": 1, "framesWithText": 1}),
            ),
        ):
            content, details = media_text_extract.extract_video(Path("silent.mp4"), "base", 5.0, 12)

        self.assertIn("## 抽帧 OCR", content)
        self.assertIn("创业实践", content)
        self.assertEqual("UNAVAILABLE", details["audioStatus"])
        self.assertEqual("READY", details["sampledFrameOcrStatus"])
        self.assertFalse(details["visualSemanticAnalysis"])
        self.assertIn("音轨 ASR 未完成", details["resultMessage"])

    def test_video_keeps_audio_transcript_when_frame_decode_is_unavailable(self) -> None:
        with (
            patch.object(
                media_text_extract,
                "extract_audio",
                return_value=("[0.0-1.0s] 用户需求", {"segments": 1}),
            ),
            patch.object(media_text_extract, "extract_video_frames", side_effect=ValueError("bad frames")),
        ):
            content, details = media_text_extract.extract_video(Path("audio-only.mp4"), "base", 5.0, 12)

        self.assertIn("## 音轨 ASR 转写", content)
        self.assertEqual("READY", details["audioStatus"])
        self.assertEqual("UNAVAILABLE", details["sampledFrameOcrStatus"])
        self.assertIn("抽帧 OCR 未完成", details["resultMessage"])

    def test_video_fails_only_when_both_local_pipelines_are_unavailable(self) -> None:
        with (
            patch.object(media_text_extract, "extract_audio", side_effect=ValueError("bad audio")),
            patch.object(media_text_extract, "extract_video_frames", side_effect=ValueError("bad frames")),
        ):
            with self.assertRaisesRegex(ValueError, "音轨与抽帧均无法解析"):
                media_text_extract.extract_video(Path("broken.mp4"), "base", 5.0, 12)

    def test_normalize_enforces_output_limit(self) -> None:
        self.assertEqual("abcde", media_text_extract.normalize(["abcdefgh"], limit=5))


if __name__ == "__main__":
    unittest.main()
