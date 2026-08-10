package com.sufe.ai.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ByteArrayResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class MediaTextExtractionServiceTests {

    @TempDir
    Path tempDir;

    @Test
    void reportsHonestRequirementsWhenLocalExtractionIsDisabled() {
        MediaTextExtractionService service = service(false, tempDir.resolve("missing.py"));

        assertThat(service.extract(new ByteArrayResource(new byte[]{1}), "poster.png").status())
                .isEqualTo("OCR_REQUIRED");
        assertThat(service.extract(new ByteArrayResource(new byte[]{1}), "interview.wav").status())
                .isEqualTo("ASR_REQUIRED");
        assertThat(service.extract(new ByteArrayResource(new byte[]{1}), "archive.bin").status())
                .isEqualTo("UNSUPPORTED");
    }

    @Test
    void executesLocalParserWithUtf8AndBoundedArguments() throws Exception {
        String python = requirePython();
        Path script = writeScript("""
                import argparse, json
                parser = argparse.ArgumentParser()
                parser.add_argument('--mode', required=True)
                parser.add_argument('--input', required=True)
                parser.add_argument('--whisper-model')
                parser.add_argument('--frame-interval')
                parser.add_argument('--max-frames')
                parser.add_argument('--max-pdf-pages')
                args = parser.parse_args()
                print(json.dumps({
                    'status': 'READY',
                    'content': f'本地解析:{args.mode}:PDF页数={args.max_pdf_pages}',
                    'message': '本地解析完成'
                }, ensure_ascii=False))
                """);
        MediaTextExtractionService service = service(true, script, python);

        var result = service.extract(new ByteArrayResource(new byte[]{1, 2, 3}), "scan.pdf");

        assertThat(result.status()).isEqualTo("READY");
        assertThat(result.contentText()).isEqualTo("本地解析:pdf:PDF页数=20");
        assertThat(result.message()).isEqualTo("本地解析完成");
    }

    @Test
    void rejectsUnknownStatusAndDoesNotExposeParserStderr() throws Exception {
        String python = requirePython();
        Path invalidStatus = writeScript("""
                import json
                print(json.dumps({'status': 'SURPRISE', 'content': 'x', 'message': 'x'}))
                """);
        var invalid = service(true, invalidStatus, python)
                .extract(new ByteArrayResource(new byte[]{1}), "poster.png");
        assertThat(invalid.status()).isEqualTo("FAILED");
        assertThat(invalid.message()).contains("无效状态");

        Path failed = writeScript("""
                import json, sys
                print(json.dumps({'status': 'FAILED', 'content': None, 'message': '内部路径和模型细节'}))
                print('内部路径和模型细节', file=sys.stderr)
                raise SystemExit(1)
                """);
        var failure = service(true, failed, python)
                .extract(new ByteArrayResource(new byte[]{1}), "audio.mp3");
        assertThat(failure.status()).isEqualTo("FAILED");
        assertThat(failure.message()).doesNotContain("内部路径", "模型细节");
    }

    private MediaTextExtractionService service(boolean enabled, Path script) {
        return service(enabled, script, "python");
    }

    private MediaTextExtractionService service(boolean enabled, Path script, String python) {
        return new MediaTextExtractionService(
                new ObjectMapper(),
                enabled,
                python,
                script.toString(),
                "base",
                30,
                5,
                12,
                20
        );
    }

    private Path writeScript(String content) throws IOException {
        Path script = tempDir.resolve("fake-media-" + System.nanoTime() + ".py");
        Files.writeString(script, content, StandardCharsets.UTF_8);
        return script;
    }

    private static String requirePython() {
        for (String candidate : new String[]{"python", "python3"}) {
            try {
                Process process = new ProcessBuilder(candidate, "--version").start();
                if (process.waitFor(10, TimeUnit.SECONDS) && process.exitValue() == 0) return candidate;
            } catch (IOException | InterruptedException exception) {
                if (exception instanceof InterruptedException) Thread.currentThread().interrupt();
            }
        }
        Assumptions.abort("本机未安装 Python，跳过本地子进程集成测试");
        return "python";
    }
}
