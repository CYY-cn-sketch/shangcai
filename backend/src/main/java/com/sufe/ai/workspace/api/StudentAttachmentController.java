package com.sufe.ai.workspace.api;

import com.sufe.ai.audit.service.AuditLogService;
import com.sufe.ai.workspace.domain.StudentAttachment;
import com.sufe.ai.workspace.service.StudentAttachmentService;
import com.sufe.ai.workspace.service.WorkspaceResourceNotFoundException;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

@RestController
@RequestMapping("/api/student")
public class StudentAttachmentController {

    private final StudentAttachmentService attachmentService;
    private final AuditLogService auditLogService;

    public StudentAttachmentController(StudentAttachmentService attachmentService, AuditLogService auditLogService) {
        this.attachmentService = attachmentService;
        this.auditLogService = auditLogService;
    }

    @PostMapping(value = "/ideas/{ideaId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(
            Authentication authentication,
            @PathVariable String ideaId,
            @RequestParam String clientMessageId,
            @RequestParam MultipartFile file
    ) {
        try {
            StudentAttachment attachment = attachmentService.upload(authentication.getName(), ideaId, clientMessageId, file);
            auditLogService.record(
                    authentication.getName(),
                    "STUDENT_ATTACHMENT_UPLOAD",
                    "STUDENT_ATTACHMENT",
                    attachment.getId(),
                    "上传学生附件 " + attachment.getOriginalName() + "，解析状态：" + attachment.getExtractionStatus()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(AttachmentResponse.from(attachment));
        } catch (WorkspaceResourceNotFoundException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("IDEA_NOT_FOUND", exception.getMessage()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_STUDENT_ATTACHMENT", exception.getMessage()));
        }
    }

    @GetMapping("/attachments/{attachmentId}/file")
    public ResponseEntity<?> download(Authentication authentication, @PathVariable String attachmentId) {
        try {
            StudentAttachmentService.DownloadContent content = attachmentService.prepareDownload(authentication.getName(), attachmentId);
            ContentDisposition disposition = ContentDisposition.attachment()
                    .filename(content.fileName(), StandardCharsets.UTF_8)
                    .build();
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(content.mediaType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                    .body(content.resource());
        } catch (WorkspaceResourceNotFoundException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse("ATTACHMENT_NOT_FOUND", exception.getMessage()));
        }
    }

    public record AttachmentResponse(
            String id,
            String ideaId,
            String clientMessageId,
            String originalName,
            String mimeType,
            long fileSizeBytes,
            String extractionStatus,
            String extractionMessage,
            boolean readable,
            String downloadUrl,
            Instant createdAt
    ) {
        static AttachmentResponse from(StudentAttachment attachment) {
            return new AttachmentResponse(
                    attachment.getId(),
                    attachment.getIdeaId(),
                    attachment.getClientMessageId(),
                    attachment.getOriginalName(),
                    attachment.getMimeType(),
                    attachment.getFileSizeBytes(),
                    attachment.getExtractionStatus(),
                    attachment.getExtractionMessage(),
                    attachment.getContentText() != null,
                    "/api/student/attachments/" + attachment.getId() + "/file",
                    attachment.getCreatedAt()
            );
        }
    }

    private record ErrorResponse(String code, String message) {
    }
}
