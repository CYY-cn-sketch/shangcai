package com.sufe.ai.storage;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
public class MediaTextExtractionService {

    private static final int MAX_PROCESS_OUTPUT_BYTES = 2 * 1024 * 1024;
    private static final Set<String> RESULT_STATUSES = Set.of("READY", "EMPTY", "FAILED");

    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String pythonCommand;
    private final Path scriptPath;
    private final String whisperModel;
    private final Duration timeout;
    private final double videoFrameIntervalSeconds;
    private final int videoMaxFrames;
    private final int pdfMaxPages;

    public MediaTextExtractionService(
            ObjectMapper objectMapper,
            @Value("${sufe.media-extraction.enabled:false}") boolean enabled,
            @Value("${sufe.media-extraction.python-command:python}") String pythonCommand,
            @Value("${sufe.media-extraction.script-path:./scripts/media_text_extract.py}") String scriptPath,
            @Value("${sufe.media-extraction.whisper-model:base}") String whisperModel,
            @Value("${sufe.media-extraction.timeout-seconds:240}") long timeoutSeconds,
            @Value("${sufe.media-extraction.video-frame-interval-seconds:5}") double videoFrameIntervalSeconds,
            @Value("${sufe.media-extraction.video-max-frames:12}") int videoMaxFrames,
            @Value("${sufe.media-extraction.pdf-max-pages:20}") int pdfMaxPages
    ) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.pythonCommand = requireText(pythonCommand, "pythonCommand");
        this.scriptPath = Path.of(requireText(scriptPath, "scriptPath")).toAbsolutePath().normalize();
        this.whisperModel = requireText(whisperModel, "whisperModel");
        this.timeout = Duration.ofSeconds(Math.max(10, timeoutSeconds));
        this.videoFrameIntervalSeconds = Math.max(1, videoFrameIntervalSeconds);
        this.videoMaxFrames = Math.max(1, Math.min(videoMaxFrames, 60));
        this.pdfMaxPages = Math.max(1, Math.min(pdfMaxPages, 50));
    }

    public boolean isEnabled() {
        return enabled;
    }

    public DocumentTextExtractionService.ExtractionResult extract(Resource resource, String originalName) {
        if (!enabled) return unavailable(originalName);
        if (!Files.isRegularFile(scriptPath)) {
            return failed("本地媒体解析脚本不存在，请检查 MEDIA_EXTRACTION_SCRIPT 配置");
        }

        Path temporary = null;
        try {
            Path input;
            try {
                input = resource.getFile().toPath().toAbsolutePath().normalize();
            } catch (IOException exception) {
                String suffix = suffixOf(originalName);
                temporary = Files.createTempFile("sufe-media-extract-", suffix);
                try (var source = resource.getInputStream()) {
                    Files.copy(source, temporary, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                }
                input = temporary;
            }
            return runExtractor(input, originalName);
        } catch (Exception exception) {
            return failed("本地媒体正文解析失败，请确认文件未损坏且识别组件可用");
        } finally {
            if (temporary != null) {
                try {
                    Files.deleteIfExists(temporary);
                } catch (IOException ignored) {
                    // 临时文件由操作系统后续清理，不影响数据库事务。
                }
            }
        }
    }

    private DocumentTextExtractionService.ExtractionResult runExtractor(Path input, String originalName) throws Exception {
        String mode = modeOf(originalName);
        if (mode == null) return new DocumentTextExtractionService.ExtractionResult(
                "UNSUPPORTED", null, "当前文件格式暂不支持本地媒体解析"
        );

        List<String> command = new ArrayList<>(List.of(
                pythonCommand,
                scriptPath.toString(),
                "--mode", mode,
                "--input", input.toString(),
                "--whisper-model", whisperModel,
                "--frame-interval", Double.toString(videoFrameIntervalSeconds),
                "--max-frames", Integer.toString(videoMaxFrames),
                "--max-pdf-pages", Integer.toString(pdfMaxPages)
        ));
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.environment().put("PYTHONUTF8", "1");
        processBuilder.environment().put("PYTHONIOENCODING", "utf-8");
        Process process = processBuilder.start();
        CompletableFuture<byte[]> stdout = CompletableFuture.supplyAsync(() -> readLimited(process.getInputStream()));
        CompletableFuture<byte[]> stderr = CompletableFuture.supplyAsync(() -> readLimited(process.getErrorStream()));
        if (!process.waitFor(timeout.toSeconds(), TimeUnit.SECONDS)) {
            terminate(process, stdout, stderr);
            return failed("本地媒体解析超时，请缩短音视频或调高解析超时配置");
        }
        byte[] outputBytes = stdout.get(5, TimeUnit.SECONDS);
        stderr.get(5, TimeUnit.SECONDS);
        if (outputBytes.length == 0) return failed("本地媒体解析器没有返回结果");

        JsonNode result = objectMapper.readTree(new String(outputBytes, StandardCharsets.UTF_8));
        String status = textValue(result, "status", "FAILED");
        String content = nullableText(result, "content");
        String message = textValue(result, "message", "本地媒体解析失败");
        if (process.exitValue() != 0) {
            return failed("本地媒体解析失败，请确认文件格式、离线模型和识别组件可用");
        }
        if (!RESULT_STATUSES.contains(status)) {
            return failed("本地媒体解析器返回了无效状态");
        }
        if ("READY".equals(status)) {
            if (content == null || content.isBlank()) return failed("本地媒体解析器未返回可读正文");
            return new DocumentTextExtractionService.ExtractionResult(status, content, message);
        }
        if ("EMPTY".equals(status)) {
            return new DocumentTextExtractionService.ExtractionResult(status, null, message);
        }
        return failed("本地媒体解析失败，请确认文件格式、离线模型和识别组件可用");
    }

    @SafeVarargs
    private static void terminate(Process process, CompletableFuture<byte[]>... readers) {
        process.destroy();
        try {
            if (!process.waitFor(1, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                process.waitFor(5, TimeUnit.SECONDS);
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
        } finally {
            for (CompletableFuture<byte[]> reader : readers) reader.cancel(true);
        }
    }

    private static byte[] readLimited(java.io.InputStream input) {
        try (input; var output = new java.io.ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            int read;
            while ((read = input.read(buffer)) >= 0) {
                int writable = Math.min(read, MAX_PROCESS_OUTPUT_BYTES - total);
                if (writable > 0) output.write(buffer, 0, writable);
                total += read;
                if (total > MAX_PROCESS_OUTPUT_BYTES) throw new IllegalStateException("媒体解析器输出过大");
            }
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("无法读取媒体解析器输出", exception);
        }
    }

    private static DocumentTextExtractionService.ExtractionResult unavailable(String originalName) {
        String mode = modeOf(originalName);
        if (mode == null) {
            return new DocumentTextExtractionService.ExtractionResult(
                    "UNSUPPORTED", null, "当前文件格式暂不支持本地媒体解析"
            );
        }
        String status = "image".equals(mode) || "pdf".equals(mode) ? "OCR_REQUIRED" : "ASR_REQUIRED";
        return new DocumentTextExtractionService.ExtractionResult(
                status,
                null,
                "本地媒体识别未启用，请配置 MEDIA_EXTRACTION_ENABLED 后重试"
        );
    }

    private static DocumentTextExtractionService.ExtractionResult failed(String message) {
        return new DocumentTextExtractionService.ExtractionResult("FAILED", null, message);
    }

    private static String modeOf(String name) {
        String suffix = suffixOf(name).replace(".", "").toLowerCase(Locale.ROOT);
        if (List.of("png", "jpg", "jpeg").contains(suffix)) return "image";
        if ("pdf".equals(suffix)) return "pdf";
        if (List.of("mp3", "m4a", "wav").contains(suffix)) return "audio";
        if (List.of("mp4", "mov", "webm").contains(suffix)) return "video";
        return null;
    }

    private static String suffixOf(String name) {
        if (name == null) return ".bin";
        int separator = name.lastIndexOf('.');
        return separator < 0 ? ".bin" : name.substring(separator);
    }

    private static String textValue(JsonNode node, String field, String fallback) {
        String value = nullableText(node, field);
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String nullableText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " 不能为空");
        return value.trim();
    }
}
