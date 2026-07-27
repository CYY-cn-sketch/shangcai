package com.sufe.ai.storage;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentTextExtractionServiceTests {

    private final DocumentTextExtractionService service = new DocumentTextExtractionService();

    @Test
    void extractsUtf8AndDocxText() throws Exception {
        var markdown = service.extract(
                new ByteArrayResource("# 项目定位\n先验证真实需求。".getBytes(StandardCharsets.UTF_8)),
                "positioning.md"
        );
        assertThat(markdown.status()).isEqualTo("READY");
        assertThat(markdown.contentText()).contains("项目定位", "真实需求");

        byte[] docx;
        try (var document = new XWPFDocument(); var output = new ByteArrayOutputStream()) {
            document.createParagraph().createRun().setText("路演材料需要明确用户价值");
            document.write(output);
            docx = output.toByteArray();
        }
        var word = service.extract(new ByteArrayResource(docx), "pitch.docx");
        assertThat(word.status()).isEqualTo("READY");
        assertThat(word.contentText()).contains("路演材料需要明确用户价值");
    }

    @Test
    void reportsOcrAndAsrRequirementsWithoutInventingContent() {
        var image = service.extract(new ByteArrayResource(new byte[]{1, 2, 3}), "poster.png");
        var audio = service.extract(new ByteArrayResource(new byte[]{1, 2, 3}), "interview.mp3");

        assertThat(image.status()).isEqualTo("OCR_REQUIRED");
        assertThat(image.contentText()).isNull();
        assertThat(audio.status()).isEqualTo("ASR_REQUIRED");
        assertThat(audio.contentText()).isNull();
    }

    @Test
    void reportsOcrRequirementForPdfWithoutText() throws Exception {
        byte[] pdf;
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            pdf = output.toByteArray();
        }

        var result = service.extract(new ByteArrayResource(pdf), "scanned.pdf");

        assertThat(result.status()).isEqualTo("OCR_REQUIRED");
        assertThat(result.contentText()).isNull();
    }
}
