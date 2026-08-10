package com.sufe.ai.workspace.service;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.storage.DocumentTextExtractionService;
import com.sufe.ai.storage.FileStorageService;
import com.sufe.ai.workspace.domain.StudentAttachment;
import com.sufe.ai.workspace.repository.StudentAttachmentRepository;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
public class StudentAttachmentService {

    private final UserAccountRepository userAccountRepository;
    private final StudentIdeaRepository ideaRepository;
    private final StudentAttachmentRepository attachmentRepository;
    private final FileStorageService fileStorageService;
    private final DocumentTextExtractionService extractionService;

    public StudentAttachmentService(
            UserAccountRepository userAccountRepository,
            StudentIdeaRepository ideaRepository,
            StudentAttachmentRepository attachmentRepository,
            FileStorageService fileStorageService,
            DocumentTextExtractionService extractionService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.ideaRepository = ideaRepository;
        this.attachmentRepository = attachmentRepository;
        this.fileStorageService = fileStorageService;
        this.extractionService = extractionService;
    }

    @Transactional
    public StudentAttachment upload(String accountName, String ideaId, String clientMessageId, MultipartFile file) {
        UserAccount user = requireUser(accountName);
        requireOwnedIdea(user.getId(), ideaId);
        if (clientMessageId == null || !clientMessageId.matches("[A-Za-z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("消息标识无效");
        }

        FileStorageService.StoredFile stored;
        try {
            stored = fileStorageService.storeStudentAttachment(user.getId(), file);
        } catch (IOException exception) {
            throw new IllegalStateException("学生附件保存失败", exception);
        }

        try {
            StudentAttachment existing = attachmentRepository
                    .findByUserIdAndClientMessageIdAndSha256(user.getId(), clientMessageId, stored.sha256())
                    .orElse(null);
            if (existing != null) {
                fileStorageService.delete(stored.storageKey());
                return existing;
            }

            DocumentTextExtractionService.ExtractionResult extraction = extractionService.extract(
                    fileStorageService.load(stored.storageKey()),
                    stored.originalName()
            );
            return attachmentRepository.saveAndFlush(StudentAttachment.create(
                    user.getId(),
                    ideaId,
                    clientMessageId,
                    stored.originalName(),
                    stored.mimeType(),
                    stored.size(),
                    stored.sha256(),
                    stored.storageKey(),
                    extraction.status(),
                    extraction.message(),
                    extraction.contentText()
            ));
        } catch (RuntimeException exception) {
            fileStorageService.delete(stored.storageKey());
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public DownloadContent prepareDownload(String accountName, String attachmentId) {
        String userId = requireUser(accountName).getId();
        StudentAttachment attachment = attachmentRepository.findByIdAndUserId(attachmentId, userId)
                .orElseThrow(() -> new WorkspaceResourceNotFoundException("附件不存在"));
        return new DownloadContent(
                fileStorageService.load(attachment.getStorageKey()),
                attachment.getOriginalName(),
                attachment.getMimeType()
        );
    }

    @Transactional(readOnly = true)
    public List<StudentAttachment> listForMessage(String userId, String clientMessageId) {
        return attachmentRepository.findAllByUserIdAndClientMessageIdOrderByCreatedAtAsc(userId, clientMessageId);
    }

    @Transactional
    public void deleteIdeaFiles(String userId, String ideaId) {
        attachmentRepository.findAllByUserIdAndIdeaIdOrderByCreatedAtAsc(userId, ideaId)
                .forEach(attachment -> fileStorageService.delete(attachment.getStorageKey()));
    }

    private UserAccount requireUser(String accountName) {
        return userAccountRepository.findByAccountIgnoreCase(accountName)
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"));
    }

    private void requireOwnedIdea(String userId, String ideaId) {
        if (ideaRepository.findByIdAndUserId(ideaId, userId).isEmpty()) {
            throw new WorkspaceResourceNotFoundException("创意不存在");
        }
    }

    public record DownloadContent(Resource resource, String fileName, String mediaType) {
    }
}
