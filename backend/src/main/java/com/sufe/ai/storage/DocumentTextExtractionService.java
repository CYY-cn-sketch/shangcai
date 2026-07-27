package com.sufe.ai.storage;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hslf.usermodel.HSLFSlideShow;
import org.apache.poi.hslf.usermodel.HSLFTextShape;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

@Service
public class DocumentTextExtractionService {

    public static final int MAX_TEXT_CHARS = 50_000;

    private static final Set<String> TEXT_EXTENSIONS = Set.of("txt", "md", "csv", "json", "yaml", "yml");
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg");
    private static final Set<String> AUDIO_VIDEO_EXTENSIONS = Set.of("mp3", "m4a", "wav", "mp4", "mov", "webm");

    public ExtractionResult extract(Resource resource, String originalName) {
        String extension = extensionOf(originalName);
        if (IMAGE_EXTENSIONS.contains(extension)) {
            return new ExtractionResult("OCR_REQUIRED", null, "图片已安全保存，需配置 OCR 后才能识别正文");
        }
        if (AUDIO_VIDEO_EXTENSIONS.contains(extension)) {
            return new ExtractionResult("ASR_REQUIRED", null, "音视频已安全保存，需配置 ASR 后才能识别正文");
        }
        try (InputStream input = resource.getInputStream()) {
            String text = switch (extension) {
                case "pdf" -> extractPdf(input);
                case "doc" -> extractDoc(input);
                case "docx" -> extractDocx(input);
                case "ppt" -> extractPpt(input);
                case "pptx" -> extractPptx(input);
                case "xls", "xlsx" -> extractWorkbook(input);
                default -> TEXT_EXTENSIONS.contains(extension) ? extractUtf8(input) : null;
            };
            if (text == null) {
                return new ExtractionResult("UNSUPPORTED", null, "当前文件格式暂不支持正文提取");
            }
            String normalized = normalize(text);
            if (normalized.isBlank()) {
                if ("pdf".equals(extension)) {
                    return new ExtractionResult("OCR_REQUIRED", null, "PDF 中没有可提取文本，扫描页需要 OCR");
                }
                return new ExtractionResult("EMPTY", null, "文件中没有提取到可读文本；扫描件需要 OCR");
            }
            return new ExtractionResult("READY", normalized, "已提取可读文本");
        } catch (CharacterCodingException exception) {
            return new ExtractionResult("FAILED", null, "文本文件不是有效的 UTF-8 编码");
        } catch (Exception exception) {
            return new ExtractionResult("FAILED", null, "文件正文提取失败，请确认文件未损坏或未加密");
        }
    }

    private static String extractPdf(InputStream input) throws IOException {
        try (var document = Loader.loadPDF(input.readAllBytes())) {
            if (document.isEncrypted()) return "";
            return new PDFTextStripper().getText(document);
        }
    }

    private static String extractDoc(InputStream input) throws IOException {
        try (var document = new HWPFDocument(input); var extractor = new WordExtractor(document)) {
            return extractor.getText();
        }
    }

    private static String extractDocx(InputStream input) throws IOException {
        try (var document = new XWPFDocument(input); var extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    private static String extractPpt(InputStream input) throws IOException {
        StringBuilder text = new StringBuilder();
        try (var slideShow = new HSLFSlideShow(input)) {
            slideShow.getSlides().forEach(slide -> slide.getShapes().stream()
                    .filter(HSLFTextShape.class::isInstance)
                    .map(HSLFTextShape.class::cast)
                    .map(HSLFTextShape::getText)
                    .forEach(value -> appendLine(text, value)));
        }
        return text.toString();
    }

    private static String extractPptx(InputStream input) throws IOException {
        StringBuilder text = new StringBuilder();
        try (var slideShow = new XMLSlideShow(input)) {
            slideShow.getSlides().forEach(slide -> slide.getShapes().stream()
                    .filter(XSLFTextShape.class::isInstance)
                    .map(XSLFTextShape.class::cast)
                    .map(XSLFTextShape::getText)
                    .forEach(value -> appendLine(text, value)));
        }
        return text.toString();
    }

    private static String extractWorkbook(InputStream input) throws IOException {
        StringBuilder text = new StringBuilder();
        DataFormatter formatter = new DataFormatter(Locale.SIMPLIFIED_CHINESE);
        try (var workbook = WorkbookFactory.create(input)) {
            workbook.forEach(sheet -> {
                appendLine(text, "工作表：" + sheet.getSheetName());
                sheet.forEach(row -> {
                    StringBuilder line = new StringBuilder();
                    row.forEach(cell -> {
                        String value = formatter.formatCellValue(cell).trim();
                        if (!value.isEmpty()) {
                            if (!line.isEmpty()) line.append("\t");
                            line.append(value);
                        }
                    });
                    appendLine(text, line.toString());
                });
            });
        }
        return text.toString();
    }

    private static String extractUtf8(InputStream input) throws IOException {
        byte[] bytes = input.readAllBytes();
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
        } catch (CharacterCodingException exception) {
            throw exception;
        }
    }

    private static void appendLine(StringBuilder target, String value) {
        if (value == null || value.isBlank() || target.length() >= MAX_TEXT_CHARS) return;
        if (!target.isEmpty()) target.append('\n');
        target.append(value.trim());
    }

    private static String normalize(String value) {
        String text = value == null ? "" : value
                .replace("\u0000", "")
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[\\t\\x0B\\f ]+", " ")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
        return text.length() <= MAX_TEXT_CHARS ? text : text.substring(0, MAX_TEXT_CHARS);
    }

    private static String extensionOf(String name) {
        if (name == null) return "";
        int separator = name.lastIndexOf('.');
        return separator < 0 ? "" : name.substring(separator + 1).toLowerCase(Locale.ROOT);
    }

    public record ExtractionResult(String status, String contentText, String message) {
        public boolean ready() {
            return "READY".equals(status) && contentText != null && !contentText.isBlank();
        }
    }
}
