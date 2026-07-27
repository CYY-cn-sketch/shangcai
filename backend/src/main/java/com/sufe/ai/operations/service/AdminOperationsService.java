package com.sufe.ai.operations.service;

import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.domain.ArtifactSubmission;
import com.sufe.ai.artifact.domain.SubmissionStatus;
import com.sufe.ai.artifact.repository.ArtifactRecordRepository;
import com.sufe.ai.artifact.repository.ArtifactSubmissionRepository;
import com.sufe.ai.audit.domain.AuditLog;
import com.sufe.ai.audit.repository.AuditLogRepository;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationJobStatus;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.usage.service.AiUsageService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AdminOperationsService {

    private final UserAccountRepository accountRepository;
    private final ProjectGroupRepository groupRepository;
    private final GroupMembershipRepository membershipRepository;
    private final ArtifactRecordRepository artifactRepository;
    private final ArtifactSubmissionRepository submissionRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final KnowledgeAssetRepository knowledgeAssetRepository;
    private final GenerationJobRepository generationJobRepository;
    private final AuditLogRepository auditLogRepository;
    private final AiUsageService usageService;

    public AdminOperationsService(
            UserAccountRepository accountRepository,
            ProjectGroupRepository groupRepository,
            GroupMembershipRepository membershipRepository,
            ArtifactRecordRepository artifactRepository,
            ArtifactSubmissionRepository submissionRepository,
            KnowledgeBaseRepository knowledgeBaseRepository,
            KnowledgeAssetRepository knowledgeAssetRepository,
            GenerationJobRepository generationJobRepository,
            AuditLogRepository auditLogRepository,
            AiUsageService usageService
    ) {
        this.accountRepository = accountRepository;
        this.groupRepository = groupRepository;
        this.membershipRepository = membershipRepository;
        this.artifactRepository = artifactRepository;
        this.submissionRepository = submissionRepository;
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.knowledgeAssetRepository = knowledgeAssetRepository;
        this.generationJobRepository = generationJobRepository;
        this.auditLogRepository = auditLogRepository;
        this.usageService = usageService;
    }

    public OperationsReport report() {
        var accounts = accountRepository.findAll();
        var groups = groupRepository.findAll();
        var memberships = membershipRepository.findAll();
        var artifacts = artifactRepository.findAll();
        var submissions = submissionRepository.findAll();
        var knowledgeBases = knowledgeBaseRepository.findAll();
        var knowledgeAssets = knowledgeAssetRepository.findAll();
        var generationJobs = generationJobRepository.findAll();
        var usage = usageService.report(AiUsageService.UsageRange.LAST_30_DAYS);

        long pending = countStatus(submissions, SubmissionStatus.PENDING);
        long approved = countStatus(submissions, SubmissionStatus.APPROVED);
        long revision = countStatus(submissions, SubmissionStatus.REVISION);
        long processed = approved + revision;
        long visibleTotal = submissions.stream().filter(item -> item.getStatus() != SubmissionStatus.WITHDRAWN).count();
        int processedRate = visibleTotal == 0 ? 0 : (int) Math.round(processed * 100.0 / visibleTotal);
        int passRate = visibleTotal == 0 ? 0 : (int) Math.round(approved * 100.0 / visibleTotal);

        Map<String, ArtifactRecord> artifactsById = artifacts.stream()
                .collect(Collectors.toMap(ArtifactRecord::getId, Function.identity(), (left, right) -> left));
        Map<String, Long> memberCounts = memberships.stream()
                .collect(Collectors.groupingBy(GroupMembership::getGroupId, Collectors.counting()));
        List<GroupProgress> groupProgress = groups.stream()
                .sorted(Comparator.comparing(ProjectGroup::getGroupLabel))
                .map(group -> buildGroupProgress(group, submissions, artifactsById, memberCounts.getOrDefault(group.getId(), 0L)))
                .toList();

        List<AuditActivity> recentActivity = auditLogRepository
                .findAll(PageRequest.of(0, 12, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(this::toActivity)
                .toList();

        return new OperationsReport(
                Instant.now(),
                new AccountSummary(
                        accounts.stream().filter(account -> account.getRole() == UserRole.STUDENT).count(),
                        accounts.stream().filter(account -> account.getRole() == UserRole.TEACHER).count(),
                        accounts.stream().filter(account -> account.getRole() == UserRole.ADMIN).count()
                ),
                groups.size(),
                artifacts.size(),
                new SubmissionSummary(visibleTotal, pending, approved, revision,
                        submissions.stream().filter(ArtifactSubmission::isExcellent).count(), processedRate, passRate),
                new KnowledgeSummary(
                        knowledgeBases.size(),
                        knowledgeBases.stream().filter(base -> base.isActive()).count(),
                        knowledgeAssets.size(),
                        knowledgeAssets.stream().filter(asset -> asset.isEnabled()).count()
                ),
                new ProviderSummary(
                        usage.summary().deepSeekCalls(),
                        usage.summary().lexiangPptCalls(),
                        countJobs(generationJobs, GenerationProvider.WORKBUDDY, ArtifactType.VIDEO, null),
                        countJobs(generationJobs, GenerationProvider.WORKBUDDY, ArtifactType.VIDEO, GenerationJobStatus.SUCCEEDED),
                        countJobs(generationJobs, null, null, GenerationJobStatus.QUEUED),
                        countJobs(generationJobs, null, null, GenerationJobStatus.RUNNING),
                        countJobs(generationJobs, null, null, GenerationJobStatus.FAILED)
                ),
                usage.summary().totalTokens(),
                groupProgress,
                recentActivity
        );
    }

    private GroupProgress buildGroupProgress(
            ProjectGroup group,
            List<ArtifactSubmission> submissions,
            Map<String, ArtifactRecord> artifacts,
            long memberCount
    ) {
        List<ArtifactSubmission> groupSubmissions = submissions.stream()
                .filter(item -> item.getStatus() != SubmissionStatus.WITHDRAWN)
                .filter(item -> group.getGroupLabel().equals(item.getGroupLabel()) || group.getProjectName().equals(item.getGroupName()))
                .toList();
        ArtifactRecord latest = groupSubmissions.stream()
                .max(Comparator.comparing(ArtifactSubmission::getSubmittedAt))
                .map(item -> artifacts.get(item.getArtifactId()))
                .orElse(null);
        return new GroupProgress(
                group.getId(),
                group.getGroupLabel(),
                group.getProjectName(),
                memberCount,
                groupSubmissions.size(),
                latest == null ? null : latest.getArtifactType(),
                groupSubmissions.stream().filter(item -> item.getStatus() == SubmissionStatus.PENDING).count(),
                groupSubmissions.stream().filter(ArtifactSubmission::isExcellent).count()
        );
    }

    private AuditActivity toActivity(AuditLog log) {
        return new AuditActivity(log.getId(), log.getCreatedAt(), log.getAction(), log.getResourceType(), log.getSummary(), log.getActorDisplayName());
    }

    private static long countStatus(List<ArtifactSubmission> submissions, SubmissionStatus status) {
        return submissions.stream().filter(item -> item.getStatus() == status).count();
    }

    private static long countJobs(
            List<GenerationJob> jobs,
            GenerationProvider provider,
            ArtifactType type,
            GenerationJobStatus status
    ) {
        return jobs.stream()
                .filter(job -> provider == null || job.getProvider() == provider)
                .filter(job -> type == null || job.getArtifactType() == type)
                .filter(job -> status == null || job.getStatus() == status)
                .count();
    }

    public record OperationsReport(
            Instant generatedAt,
            AccountSummary accounts,
            long groupCount,
            long artifactCount,
            SubmissionSummary submissions,
            KnowledgeSummary knowledge,
            ProviderSummary providers,
            long totalTokensLast30Days,
            List<GroupProgress> groups,
            List<AuditActivity> recentActivity
    ) {}

    public record AccountSummary(long students, long teachers, long admins) {}
    public record SubmissionSummary(long total, long pending, long approved, long revision, long excellent, int processedRate, int passRate) {}
    public record KnowledgeSummary(long bases, long activeBases, long assets, long activeAssets) {}
    public record ProviderSummary(long deepSeekCalls, long lexiangPptCalls, long workBuddyVideoJobs, long workBuddyVideoCompleted,
                                  long queuedJobs, long runningJobs, long failedJobs) {}
    public record GroupProgress(String id, String label, String projectName, long memberCount, long submissionCount,
                                String latestArtifactType, long pendingCount, long excellentCount) {}
    public record AuditActivity(String id, Instant occurredAt, String action, String resourceType, String summary, String actor) {}
}
