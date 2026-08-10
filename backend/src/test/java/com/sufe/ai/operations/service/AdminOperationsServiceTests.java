package com.sufe.ai.operations.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.domain.ArtifactSubmission;
import com.sufe.ai.artifact.domain.SubmissionStatus;
import com.sufe.ai.artifact.repository.ArtifactRecordRepository;
import com.sufe.ai.artifact.repository.ArtifactSubmissionRepository;
import com.sufe.ai.audit.repository.AuditLogRepository;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationJobStatus;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.usage.service.AiUsageService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.lang.reflect.Field;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminOperationsServiceTests {

    @Test
    void buildsEvaluationFromPersistedSubmissionsAndKeepsEveryFindingTraceable() {
        Fixture fixture = new Fixture();
        ProjectGroup firstGroup = ProjectGroup.create("group-1", "第 1 组", "智慧财务助手");
        ProjectGroup secondGroup = ProjectGroup.create("group-2", "第 2 组", "低碳校园");
        fixture.groups(List.of(firstGroup, secondGroup));
        fixture.memberships(List.of(GroupMembership.create("member-1", "student-1", firstGroup.getId())));

        ArtifactSubmission approved = submission(
                "submission-1",
                1,
                SubmissionStatus.APPROVED,
                "第 1 组",
                "智慧财务助手",
                "商业计划书",
                "BP",
                "需要补充访谈证据与试点指标。",
                "{\"summary\":\"商业模式仍需验证\",\"problems\":[\"付费方与定价依据不足\"],\"risks\":[\"缺少访谈证据\"]}",
                true,
                Instant.parse("2026-08-03T09:00:00Z")
        );
        ArtifactSubmission pending = submission(
                "submission-2",
                2,
                SubmissionStatus.PENDING,
                "第 1 组",
                "智慧财务助手",
                "路演稿",
                "PPT",
                null,
                null,
                false,
                Instant.parse("2026-08-04T09:00:00Z")
        );
        fixture.submissions(List.of(approved, pending));
        fixture.knowledge(2, 1, 3, 2);

        AdminOperationsService.OperationsReport report = fixture.service.report();

        assertThat(report.submissions().total()).isEqualTo(2);
        assertThat(report.evaluation().kpis())
                .extracting(AdminOperationsService.EvaluationCard::key)
                .containsExactly("group-participation-rate", "artifact-pass-rate", "revision-count", "excellent-count");
        AdminOperationsService.EvaluationCard participation = card(report.evaluation().kpis(), "group-participation-rate");
        assertThat(participation.numerator()).isEqualTo(1);
        assertThat(participation.denominator()).isEqualTo(2);
        assertThat(participation.value()).isEqualTo("50%");

        AdminOperationsService.EvaluationCard currentEffect = card(report.evaluation().summaries(), "current-verifiable-outcomes");
        assertThat(currentEffect.value()).isEqualTo("1 条反馈 · 1 项诊断");
        assertThat(currentEffect.zeroReason()).isNull();
        assertThat(currentEffect.sources()).containsExactly("系统汇总", "AI 诊断记录", "教师反馈", "供应商运行记录");
        assertThat(card(report.evaluation().summaries(), "system-summary").statements())
                .first()
                .asString()
                .contains("1 个学生账号");

        AdminOperationsService.EvaluationCard findings = card(report.evaluation().reviews(), "key-findings");
        assertThat(findings.value()).isEqualTo("3 类有证据问题");
        assertThat(findings.statements()).anyMatch(item -> item.contains("商业模式不清"));
        assertThat(findings.records())
                .anySatisfy(record -> {
                    assertThat(record.id()).isEqualTo("submission-1");
                    assertThat(record.detail()).containsAnyOf("付费", "商业模式");
                });
        assertThat(card(report.evaluation().evidence(), "ai-diagnosis-evidence").records())
                .extracting(AdminOperationsService.EvaluationDetailRecord::id)
                .containsExactly("submission-1");
    }

    @Test
    void explainsEveryZeroWithoutCallingAiOrInventingRecommendations() {
        Fixture fixture = new Fixture();
        fixture.groups(List.of(ProjectGroup.create("group-1", "第 1 组", "智慧财务助手")));
        fixture.submissions(List.of());

        AdminOperationsService.OperationsReport report = fixture.service.report();

        AdminOperationsService.EvaluationCard diagnosis = card(report.evaluation().evidence(), "ai-diagnosis-evidence");
        assertThat(diagnosis.value()).isEqualTo("0 项");
        assertThat(diagnosis.zeroReason()).isEqualTo("暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。");
        assertThat(card(report.evaluation().evidence(), "teacher-feedback-evidence").zeroReason())
                .isEqualTo("暂无已保存教师反馈；请先由教师完成成果审核并保存反馈。");
        assertThat(card(report.evaluation().summaries(), "current-verifiable-outcomes").zeroReason())
                .isNotNull();
        assertThat(card(report.evaluation().reviews(), "key-findings").statements())
                .containsExactly("尚无足够的已保存 AI 诊断或教师反馈，不能判断高频问题。");
        assertThat(card(report.evaluation().summaries(), "next-step-summary").statements())
                .first()
                .asString()
                .contains("不生成泛化结论");
        assertThat(Arrays.stream(AdminOperationsService.class.getDeclaredFields()).map(Field::getType))
                .noneMatch(type -> type.getName().contains("DeepSeek"));
    }

    @Test
    void doesNotDescribeCurrentOutcomesAsZeroWhenOnlyTeacherFeedbackExists() {
        Fixture fixture = new Fixture();
        fixture.submissions(List.of(submission(
                "feedback-only",
                1,
                SubmissionStatus.APPROVED,
                "第 1 组",
                "智慧财务助手",
                "商业计划书",
                "BP",
                "请补充访谈证据。",
                null,
                false,
                Instant.parse("2026-08-04T09:00:00Z")
        )));

        AdminOperationsService.OperationsReport report = fixture.service.report();

        AdminOperationsService.EvaluationCard currentEffect =
                card(report.evaluation().summaries(), "current-verifiable-outcomes");
        assertThat(currentEffect.value()).isEqualTo("1 条反馈 · 0 项诊断");
        assertThat(currentEffect.zeroReason()).isNull();
        assertThat(card(report.evaluation().evidence(), "teacher-feedback-evidence").zeroReason()).isNull();
        assertThat(card(report.evaluation().evidence(), "ai-diagnosis-evidence").zeroReason()).isNotNull();
    }

    @Test
    void doesNotDescribeCurrentOutcomesAsZeroWhenOnlyAiDiagnosisExists() {
        Fixture fixture = new Fixture();
        fixture.submissions(List.of(submission(
                "diagnosis-only",
                1,
                SubmissionStatus.APPROVED,
                "第 1 组",
                "智慧财务助手",
                "商业计划书",
                "BP",
                null,
                "{\"summary\":\"已有可验证诊断\"}",
                false,
                Instant.parse("2026-08-04T09:00:00Z")
        )));

        AdminOperationsService.OperationsReport report = fixture.service.report();

        AdminOperationsService.EvaluationCard currentEffect =
                card(report.evaluation().summaries(), "current-verifiable-outcomes");
        assertThat(currentEffect.value()).isEqualTo("0 条反馈 · 1 项诊断");
        assertThat(currentEffect.zeroReason()).isNull();
        assertThat(card(report.evaluation().evidence(), "teacher-feedback-evidence").zeroReason()).isNotNull();
        assertThat(card(report.evaluation().evidence(), "ai-diagnosis-evidence").zeroReason()).isNull();
    }

    @Test
    void excludesWorkbuddyJobsBeforeTheUsagePeriodFromThirtyDayEvidence() {
        Fixture fixture = new Fixture();
        fixture.jobs(List.of(
                workbuddyJob("old-job", Instant.parse("2026-07-05T09:00:00Z")),
                workbuddyJob("recent-job", Instant.parse("2026-08-04T09:00:00Z"))
        ));

        AdminOperationsService.OperationsReport report = fixture.service.report();

        assertThat(report.providers().workBuddyVideoJobs()).isEqualTo(1);
        assertThat(report.providers().workBuddyVideoCompleted()).isEqualTo(1);
        assertThat(card(report.evaluation().evidence(), "provider-evidence").statements())
                .anySatisfy(statement -> assertThat(statement).contains("WorkBuddy 视频 1/1"));
    }

    private static AdminOperationsService.EvaluationCard card(
            List<AdminOperationsService.EvaluationCard> cards,
            String key
    ) {
        return cards.stream().filter(card -> card.key().equals(key)).findFirst().orElseThrow();
    }

    private static ArtifactSubmission submission(
            String id,
            int version,
            SubmissionStatus status,
            String groupLabel,
            String groupName,
            String title,
            String artifactType,
            String teacherComment,
            String diagnosisJson,
            boolean excellent,
            Instant submittedAt
    ) {
        ArtifactSubmission submission = mock(ArtifactSubmission.class);
        when(submission.getId()).thenReturn(id);
        when(submission.getSubmissionVersion()).thenReturn(version);
        when(submission.getStatus()).thenReturn(status);
        when(submission.getGroupLabel()).thenReturn(groupLabel);
        when(submission.getGroupName()).thenReturn(groupName);
        when(submission.getArtifactTitleSnapshot()).thenReturn(title);
        when(submission.getArtifactSummarySnapshot()).thenReturn("成果摘要");
        when(submission.getArtifactTypeSnapshot()).thenReturn(artifactType);
        when(submission.getTeacherComment()).thenReturn(teacherComment);
        when(submission.getAiDiagnosisJson()).thenReturn(diagnosisJson);
        when(submission.getAiDiagnosedAt()).thenReturn(diagnosisJson == null ? null : submittedAt.plus(5, ChronoUnit.MINUTES));
        when(submission.isExcellent()).thenReturn(excellent);
        when(submission.getSubmittedAt()).thenReturn(submittedAt);
        return submission;
    }

    private static GenerationJob workbuddyJob(String id, Instant createdAt) {
        GenerationJob job = mock(GenerationJob.class);
        when(job.getId()).thenReturn(id);
        when(job.getProvider()).thenReturn(GenerationProvider.WORKBUDDY);
        when(job.getArtifactType()).thenReturn(ArtifactType.VIDEO);
        when(job.getStatus()).thenReturn(GenerationJobStatus.SUCCEEDED);
        when(job.getCreatedAt()).thenReturn(createdAt);
        return job;
    }

    private static final class Fixture {
        private final UserAccountRepository accountRepository = mock(UserAccountRepository.class);
        private final ProjectGroupRepository groupRepository = mock(ProjectGroupRepository.class);
        private final GroupMembershipRepository membershipRepository = mock(GroupMembershipRepository.class);
        private final ArtifactRecordRepository artifactRepository = mock(ArtifactRecordRepository.class);
        private final ArtifactSubmissionRepository submissionRepository = mock(ArtifactSubmissionRepository.class);
        private final KnowledgeBaseRepository knowledgeBaseRepository = mock(KnowledgeBaseRepository.class);
        private final KnowledgeAssetRepository knowledgeAssetRepository = mock(KnowledgeAssetRepository.class);
        private final GenerationJobRepository generationJobRepository = mock(GenerationJobRepository.class);
        private final AuditLogRepository auditLogRepository = mock(AuditLogRepository.class);
        private final AiUsageService usageService = mock(AiUsageService.class);
        private final AdminOperationsService service = new AdminOperationsService(
                accountRepository,
                groupRepository,
                membershipRepository,
                artifactRepository,
                submissionRepository,
                knowledgeBaseRepository,
                knowledgeAssetRepository,
                generationJobRepository,
                auditLogRepository,
                usageService,
                new ObjectMapper()
        );

        private Fixture() {
            UserAccount student = mock(UserAccount.class);
            when(student.getRole()).thenReturn(UserRole.STUDENT);
            when(accountRepository.findAll()).thenReturn(List.of(student));
            when(groupRepository.findAll()).thenReturn(List.of());
            when(membershipRepository.findAll()).thenReturn(List.of());
            when(artifactRepository.findAll()).thenReturn(List.of(mock(ArtifactRecord.class)));
            when(submissionRepository.findAll()).thenReturn(List.of());
            when(knowledgeBaseRepository.findAll()).thenReturn(List.of());
            when(knowledgeAssetRepository.findAll()).thenReturn(List.of());
            when(generationJobRepository.findAll()).thenReturn(List.of());
            when(auditLogRepository.findAll(any(Pageable.class))).thenReturn(Page.empty());
            Instant generatedAt = Instant.parse("2026-08-05T09:00:00Z");
            when(usageService.report(AiUsageService.UsageRange.LAST_30_DAYS)).thenReturn(new AiUsageService.UsageReport(
                    AiUsageService.UsageRange.LAST_30_DAYS,
                    generatedAt.minus(30, ChronoUnit.DAYS),
                    generatedAt,
                    new AiUsageService.UsageSummary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
                    List.of(),
                    List.of()
            ));
        }

        private void groups(List<ProjectGroup> groups) {
            when(groupRepository.findAll()).thenReturn(groups);
        }

        private void memberships(List<GroupMembership> memberships) {
            when(membershipRepository.findAll()).thenReturn(memberships);
        }

        private void submissions(List<ArtifactSubmission> submissions) {
            when(submissionRepository.findAll()).thenReturn(submissions);
        }

        private void jobs(List<GenerationJob> jobs) {
            when(generationJobRepository.findAll()).thenReturn(jobs);
        }

        private void knowledge(int bases, int activeBases, int assets, int activeAssets) {
            List<KnowledgeBase> knowledgeBases = mockKnowledgeBases(bases, activeBases);
            List<KnowledgeAsset> knowledgeAssets = mockKnowledgeAssets(assets, activeAssets);
            when(knowledgeBaseRepository.findAll()).thenReturn(knowledgeBases);
            when(knowledgeAssetRepository.findAll()).thenReturn(knowledgeAssets);
        }

        private static List<KnowledgeBase> mockKnowledgeBases(int count, int activeCount) {
            return java.util.stream.IntStream.range(0, count).mapToObj(index -> {
                KnowledgeBase base = mock(KnowledgeBase.class);
                when(base.isActive()).thenReturn(index < activeCount);
                return base;
            }).toList();
        }

        private static List<KnowledgeAsset> mockKnowledgeAssets(int count, int activeCount) {
            return java.util.stream.IntStream.range(0, count).mapToObj(index -> {
                KnowledgeAsset asset = mock(KnowledgeAsset.class);
                when(asset.isEnabled()).thenReturn(index < activeCount);
                return asset;
            }).toList();
        }
    }
}
