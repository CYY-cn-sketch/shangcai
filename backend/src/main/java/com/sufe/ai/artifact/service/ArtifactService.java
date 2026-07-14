package com.sufe.ai.artifact.service;

import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactDownloadLog;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.domain.ArtifactSubmission;
import com.sufe.ai.artifact.domain.SubmissionStatus;
import com.sufe.ai.artifact.repository.ArtifactDownloadLogRepository;
import com.sufe.ai.artifact.repository.ArtifactRecordRepository;
import com.sufe.ai.artifact.repository.ArtifactSubmissionRepository;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
public class ArtifactService {

    private final UserAccountRepository userAccountRepository;
    private final GroupMembershipRepository membershipRepository;
    private final ProjectGroupRepository groupRepository;
    private final StudentIdeaRepository ideaRepository;
    private final ArtifactRecordRepository artifactRepository;
    private final ArtifactSubmissionRepository submissionRepository;
    private final ArtifactDownloadLogRepository downloadLogRepository;
    private final Path artifactRoot;

    public ArtifactService(
            UserAccountRepository userAccountRepository,
            GroupMembershipRepository membershipRepository,
            ProjectGroupRepository groupRepository,
            StudentIdeaRepository ideaRepository,
            ArtifactRecordRepository artifactRepository,
            ArtifactSubmissionRepository submissionRepository,
            ArtifactDownloadLogRepository downloadLogRepository,
            @Value("${app.storage.artifacts-root:./data/artifacts}") String artifactRoot
    ) {
        this.userAccountRepository = userAccountRepository;
        this.membershipRepository = membershipRepository;
        this.groupRepository = groupRepository;
        this.ideaRepository = ideaRepository;
        this.artifactRepository = artifactRepository;
        this.submissionRepository = submissionRepository;
        this.downloadLogRepository = downloadLogRepository;
        this.artifactRoot = Path.of(artifactRoot).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<ArtifactRecord> listOwnedArtifacts(String accountName) {
        return artifactRepository.findAllByUserIdOrderByCreatedAtDesc(resolveUser(accountName).getId());
    }

    @Transactional
    public ArtifactRecord saveArtifact(String accountName, SaveArtifactCommand command) {
        UserAccount user = resolveUser(accountName);
        requireOwnedIdea(user.getId(), command.ideaId());
        ArtifactRecord artifact = command.sourceMessageId() == null
                ? null
                : artifactRepository.findByUserIdAndSourceMessageId(user.getId(), command.sourceMessageId()).orElse(null);
        if (artifact != null) {
            if (!artifact.getIdeaId().equals(command.ideaId())) {
                throw new ArtifactConflictException("同一消息不能绑定到不同创意");
            }
            artifact.refresh(command.artifactType(), command.title(), command.summary(), command.contentJson());
            return artifact;
        }
        return artifactRepository.save(ArtifactRecord.create(
                user.getId(),
                command.ideaId(),
                command.sourceMessageId(),
                command.artifactType(),
                command.title(),
                command.summary(),
                command.contentJson()
        ));
    }

    @Transactional
    public SubmissionView submitArtifact(String accountName, String artifactId) {
        UserAccount student = resolveUser(accountName);
        ArtifactRecord artifact = requireOwnedArtifact(student.getId(), artifactId);
        GroupMembership membership = membershipRepository.findByUserId(student.getId())
                .orElseThrow(() -> new ArtifactConflictException("当前学生账号尚未分配项目小组"));
        ProjectGroup group = groupRepository.findById(membership.getGroupId())
                .orElseThrow(() -> new ArtifactConflictException("项目小组不存在"));
        ArtifactSubmission submission = submissionRepository.findByArtifactId(artifactId).orElse(null);
        if (submission == null) {
            submission = ArtifactSubmission.create(
                    artifactId,
                    student.getId(),
                    student.getDisplayName(),
                    group.getGroupLabel(),
                    group.getProjectName()
            );
        } else {
            submission.resubmit(student.getDisplayName(), group.getGroupLabel(), group.getProjectName());
        }
        return new SubmissionView(submissionRepository.save(submission), artifact);
    }

    @Transactional(readOnly = true)
    public List<SubmissionView> listStudentSubmissions(String accountName) {
        String userId = resolveUser(accountName).getId();
        return submissionRepository.findAllByStudentUserIdOrderBySubmittedAtDesc(userId).stream()
                .map(this::toSubmissionView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubmissionView> listTeacherSubmissions() {
        return submissionRepository.findAllByOrderBySubmittedAtDesc().stream()
                .map(this::toSubmissionView)
                .toList();
    }

    @Transactional
    public SubmissionView reviewSubmission(String accountName, String submissionId, ReviewCommand command) {
        UserAccount reviewer = resolveUser(accountName);
        ArtifactSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ArtifactNotFoundException("提交记录不存在"));
        if (submission.getStatus() == SubmissionStatus.WITHDRAWN) {
            throw new ArtifactConflictException("已撤回成果不能继续审核");
        }
        submission.review(command.status(), command.teacherComment(), reviewer.getId(), command.excellent());
        return toSubmissionView(submission);
    }

    @Transactional
    public SubmissionView withdrawSubmission(String accountName, String submissionId) {
        String userId = resolveUser(accountName).getId();
        ArtifactSubmission submission = submissionRepository.findByIdAndStudentUserId(submissionId, userId)
                .orElseThrow(() -> new ArtifactNotFoundException("提交记录不存在"));
        submission.withdraw();
        return toSubmissionView(submission);
    }

    @Transactional
    public void deleteWithdrawnSubmission(String accountName, String submissionId) {
        String userId = resolveUser(accountName).getId();
        ArtifactSubmission submission = submissionRepository.findByIdAndStudentUserId(submissionId, userId)
                .orElseThrow(() -> new ArtifactNotFoundException("提交记录不存在"));
        if (submission.getStatus() != SubmissionStatus.WITHDRAWN) {
            throw new ArtifactConflictException("只有已撤回成果可以删除");
        }
        submissionRepository.delete(submission);
    }

    @Transactional
    public void recordClientDownload(String accountName, String artifactId) {
        UserAccount actor = resolveUser(accountName);
        requireOwnedArtifact(actor.getId(), artifactId);
        downloadLogRepository.save(ArtifactDownloadLog.create(artifactId, actor.getId(), "CLIENT_RENDERED"));
    }

    @Transactional
    public DownloadContent prepareDownload(String accountName, String artifactId) {
        UserAccount actor = resolveUser(accountName);
        ArtifactRecord artifact = requireAccessibleArtifact(actor, artifactId);
        DownloadContent content;
        if (artifact.getFilePath() != null) {
            Path file = artifactRoot.resolve(artifact.getFilePath()).normalize();
            if (!file.startsWith(artifactRoot) || !Files.isRegularFile(file)) {
                throw new ArtifactConflictException("成果文件尚未生成或已失效");
            }
            String fileName = artifact.getFileName() == null ? file.getFileName().toString() : artifact.getFileName();
            String mediaType = artifact.getMimeType() == null ? "application/octet-stream" : artifact.getMimeType();
            content = new DownloadContent(new FileSystemResource(file), fileName, mediaType);
        } else if ("PPT".equals(artifact.getArtifactType()) || "MEDIA".equals(artifact.getArtifactType())) {
            throw new ArtifactConflictException("PPT 或视频文件尚未由生成任务写入服务器");
        } else {
            String html = buildWordHtml(artifact);
            content = new DownloadContent(
                    new ByteArrayResource(html.getBytes(StandardCharsets.UTF_8)),
                    safeFileName(artifact.getTitle()) + ".doc",
                    "application/msword;charset=UTF-8"
            );
        }
        downloadLogRepository.save(ArtifactDownloadLog.create(artifactId, actor.getId(), "SERVER_FILE"));
        return content;
    }

    private SubmissionView toSubmissionView(ArtifactSubmission submission) {
        ArtifactRecord artifact = artifactRepository.findById(submission.getArtifactId())
                .orElseThrow(() -> new ArtifactNotFoundException("成果记录不存在"));
        return new SubmissionView(submission, artifact);
    }

    private ArtifactRecord requireAccessibleArtifact(UserAccount actor, String artifactId) {
        ArtifactRecord artifact = artifactRepository.findById(artifactId)
                .orElseThrow(() -> new ArtifactNotFoundException("成果记录不存在"));
        if (artifact.getUserId().equals(actor.getId())) return artifact;
        if ((actor.getRole() == UserRole.TEACHER || actor.getRole() == UserRole.ADMIN)
                && submissionRepository.existsByArtifactId(artifactId)) {
            return artifact;
        }
        throw new ArtifactNotFoundException("成果记录不存在");
    }

    private ArtifactRecord requireOwnedArtifact(String userId, String artifactId) {
        return artifactRepository.findByIdAndUserId(artifactId, userId)
                .orElseThrow(() -> new ArtifactNotFoundException("成果记录不存在"));
    }

    private void requireOwnedIdea(String userId, String ideaId) {
        if (ideaRepository.findByIdAndUserId(ideaId, userId).isEmpty()) {
            throw new ArtifactNotFoundException("创意不存在");
        }
    }

    private UserAccount resolveUser(String accountName) {
        return userAccountRepository.findByAccountIgnoreCase(accountName)
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"));
    }

    private static String buildWordHtml(ArtifactRecord artifact) {
        return "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>"
                + "<h1>" + HtmlUtils.htmlEscape(artifact.getTitle()) + "</h1>"
                + "<p>" + HtmlUtils.htmlEscape(artifact.getSummary()) + "</p>"
                + "<pre>" + HtmlUtils.htmlEscape(artifact.getContentJson()) + "</pre>"
                + "</body></html>";
    }

    private static String safeFileName(String value) {
        String safe = value.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return safe.isEmpty() ? "成果文档" : safe;
    }

    public record SaveArtifactCommand(
            String ideaId,
            String sourceMessageId,
            String artifactType,
            String title,
            String summary,
            String contentJson
    ) {
    }

    public record ReviewCommand(SubmissionStatus status, String teacherComment, Boolean excellent) {
    }

    public record SubmissionView(ArtifactSubmission submission, ArtifactRecord artifact) {
    }

    public record DownloadContent(Resource resource, String fileName, String mediaType) {
    }
}
