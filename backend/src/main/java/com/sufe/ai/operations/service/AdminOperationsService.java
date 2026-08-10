package com.sufe.ai.operations.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AdminOperationsService {

    private static final String SYSTEM_SOURCE = "系统汇总";
    private static final String AI_SOURCE = "AI 诊断记录";
    private static final String TEACHER_SOURCE = "教师反馈";
    private static final String PROVIDER_SOURCE = "供应商运行记录";
    private static final int DETAIL_LIMIT = 12;

    private static final List<IssueDefinition> ISSUE_DEFINITIONS = List.of(
            new IssueDefinition(
                    "商业模式不清",
                    List.of("商业模式", "付费", "收入", "成本", "定价", "采购"),
                    "要求学生拆清使用者、付费方、受益者和决策链。"
            ),
            new IssueDefinition(
                    "竞品维度不足",
                    List.of("竞品", "竞争", "替代方案", "差异化"),
                    "至少比较三类替代方案，并说明比较维度。"
            ),
            new IssueDefinition(
                    "答辩证据薄弱",
                    List.of("证据", "访谈", "数据", "依据", "证明"),
                    "每个关键结论绑定一项可追溯材料。"
            ),
            new IssueDefinition(
                    "用户画像泛化",
                    List.of("用户画像", "目标用户", "客群", "第一用户", "使用场景"),
                    "用“一类人、一个场景、一个高频任务”收窄首批用户。"
            ),
            new IssueDefinition(
                    "试点指标缺失",
                    List.of("试点", "指标", "验收", "里程碑", "验证"),
                    "补充过程指标、结果指标、数据来源和复盘时间。"
            )
    );

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
    private final ObjectMapper objectMapper;

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
            AiUsageService usageService,
            ObjectMapper objectMapper
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
        this.objectMapper = objectMapper;
    }

    public OperationsReport report() {
        Instant generatedAt = Instant.now();
        var accounts = accountRepository.findAll();
        var groups = groupRepository.findAll();
        var memberships = membershipRepository.findAll();
        var artifacts = artifactRepository.findAll();
        var submissions = submissionRepository.findAll();
        var knowledgeBases = knowledgeBaseRepository.findAll();
        var knowledgeAssets = knowledgeAssetRepository.findAll();
        var generationJobs = generationJobRepository.findAll();
        var usage = usageService.report(AiUsageService.UsageRange.LAST_30_DAYS);
        var providerPeriodJobs = generationJobs.stream()
                .filter(job -> usage.periodStart() == null || !job.getCreatedAt().isBefore(usage.periodStart()))
                .toList();

        List<ArtifactSubmission> visibleSubmissions = submissions.stream()
                .filter(item -> item.getStatus() != SubmissionStatus.WITHDRAWN)
                .sorted(Comparator.comparing(ArtifactSubmission::getSubmittedAt).reversed()
                        .thenComparing(ArtifactSubmission::getSubmissionVersion, Comparator.reverseOrder()))
                .toList();
        long pending = countStatus(visibleSubmissions, SubmissionStatus.PENDING);
        long approved = countStatus(visibleSubmissions, SubmissionStatus.APPROVED);
        long revision = countStatus(visibleSubmissions, SubmissionStatus.REVISION);
        long processed = approved + revision;
        long visibleTotal = visibleSubmissions.size();
        int processedRate = percent(processed, visibleTotal);
        int passRate = percent(approved, visibleTotal);

        Map<String, Long> memberCounts = memberships.stream()
                .collect(Collectors.groupingBy(GroupMembership::getGroupId, Collectors.counting()));
        List<GroupProgress> groupProgress = groups.stream()
                .sorted(Comparator.comparing(ProjectGroup::getGroupLabel))
                .map(group -> buildGroupProgress(group, visibleSubmissions, memberCounts.getOrDefault(group.getId(), 0L)))
                .toList();

        List<AuditActivity> recentActivity = auditLogRepository
                .findAll(PageRequest.of(0, 12, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(this::toActivity)
                .toList();

        SubmissionSummary submissionSummary = new SubmissionSummary(
                visibleTotal,
                pending,
                approved,
                revision,
                visibleSubmissions.stream().filter(ArtifactSubmission::isExcellent).count(),
                processedRate,
                passRate
        );
        KnowledgeSummary knowledgeSummary = new KnowledgeSummary(
                knowledgeBases.size(),
                knowledgeBases.stream().filter(base -> base.isActive()).count(),
                knowledgeAssets.size(),
                knowledgeAssets.stream().filter(asset -> asset.isEnabled()).count()
        );
        ProviderSummary providerSummary = new ProviderSummary(
                usage.summary().deepSeekCalls(),
                usage.summary().lexiangPptCalls(),
                countJobs(providerPeriodJobs, GenerationProvider.WORKBUDDY, ArtifactType.VIDEO, null),
                countJobs(providerPeriodJobs, GenerationProvider.WORKBUDDY, ArtifactType.VIDEO, GenerationJobStatus.SUCCEEDED),
                countJobs(generationJobs, null, null, GenerationJobStatus.QUEUED),
                countJobs(generationJobs, null, null, GenerationJobStatus.RUNNING),
                countJobs(generationJobs, null, null, GenerationJobStatus.FAILED)
        );
        AccountSummary accountSummary = new AccountSummary(
                accounts.stream().filter(account -> account.getRole() == UserRole.STUDENT).count(),
                accounts.stream().filter(account -> account.getRole() == UserRole.TEACHER).count(),
                accounts.stream().filter(account -> account.getRole() == UserRole.ADMIN).count()
        );
        EvaluationReport evaluation = buildEvaluationReport(
                generatedAt,
                usage.periodStart(),
                accountSummary,
                groups,
                memberCounts,
                visibleSubmissions,
                knowledgeSummary,
                providerSummary,
                providerPeriodJobs
        );

        return new OperationsReport(
                generatedAt,
                accountSummary,
                groups.size(),
                artifacts.size(),
                submissionSummary,
                knowledgeSummary,
                providerSummary,
                usage.summary().totalTokens(),
                groupProgress,
                recentActivity,
                evaluation
        );
    }

    private EvaluationReport buildEvaluationReport(
            Instant generatedAt,
            Instant providerPeriodStart,
            AccountSummary accounts,
            List<ProjectGroup> groups,
            Map<String, Long> memberCounts,
            List<ArtifactSubmission> submissions,
            KnowledgeSummary knowledge,
            ProviderSummary providers,
            List<GenerationJob> generationJobs
    ) {
        Map<String, List<ArtifactSubmission>> submissionsByGroupId = groups.stream()
                .collect(Collectors.toMap(
                        ProjectGroup::getId,
                        group -> submissions.stream().filter(item -> belongsToGroup(item, group)).toList(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
        List<ProjectGroup> participatingGroups = groups.stream()
                .filter(group -> !submissionsByGroupId.getOrDefault(group.getId(), List.of()).isEmpty())
                .toList();
        long groupsAtBpOrLater = groups.stream()
                .filter(group -> submissionsByGroupId.getOrDefault(group.getId(), List.of()).stream()
                        .anyMatch(item -> isBpOrLater(item.getArtifactTypeSnapshot())))
                .count();
        long approved = countStatus(submissions, SubmissionStatus.APPROVED);
        long revision = countStatus(submissions, SubmissionStatus.REVISION);
        long pending = countStatus(submissions, SubmissionStatus.PENDING);
        long excellent = submissions.stream().filter(ArtifactSubmission::isExcellent).count();
        List<ArtifactSubmission> feedbackSubmissions = submissions.stream()
                .filter(item -> hasText(item.getTeacherComment()))
                .toList();
        List<ArtifactSubmission> diagnosedSubmissions = submissions.stream()
                .filter(item -> hasText(item.getAiDiagnosisJson()) && item.getAiDiagnosedAt() != null)
                .toList();
        List<IssueFinding> issueFindings = buildIssueFindings(submissions);
        List<GenerationJob> failedJobs = generationJobs.stream()
                .filter(job -> job.getStatus() == GenerationJobStatus.FAILED)
                .sorted(Comparator.comparing(GenerationJob::getCreatedAt).reversed())
                .toList();

        List<EvaluationDetailRecord> groupRecords = groups.stream()
                .map(group -> toGroupRecord(
                        group,
                        memberCounts.getOrDefault(group.getId(), 0L),
                        submissionsByGroupId.getOrDefault(group.getId(), List.of())
                ))
                .limit(DETAIL_LIMIT)
                .toList();
        List<EvaluationDetailRecord> submissionRecords = submissions.stream()
                .map(item -> toSubmissionRecord(item, "成果提交", null))
                .limit(DETAIL_LIMIT)
                .toList();
        List<EvaluationDetailRecord> feedbackRecords = feedbackSubmissions.stream()
                .map(item -> toSubmissionRecord(item, TEACHER_SOURCE, item.getTeacherComment()))
                .limit(DETAIL_LIMIT)
                .toList();
        List<EvaluationDetailRecord> diagnosisRecords = diagnosedSubmissions.stream()
                .map(item -> toSubmissionRecord(item, AI_SOURCE, diagnosisSummary(item)))
                .limit(DETAIL_LIMIT)
                .toList();
        List<EvaluationDetailRecord> issueRecords = issueFindings.stream()
                .flatMap(finding -> finding.matches().stream()
                        .map(match -> toSubmissionRecord(match.submission(), finding.label(), match.evidence())))
                .limit(DETAIL_LIMIT)
                .toList();
        List<EvaluationDetailRecord> failedJobRecords = failedJobs.stream()
                .map(this::toGenerationJobRecord)
                .limit(DETAIL_LIMIT)
                .toList();

        EvaluationCard participationRate = card(
                "group-participation-rate",
                "小组阶段参与率",
                percent(participatingGroups.size(), groups.size()) + "%",
                SYSTEM_SOURCE,
                "至少保存过一项未撤回阶段成果的小组数 ÷ 当前项目小组总数。",
                (long) participatingGroups.size(),
                (long) groups.size(),
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE),
                groups.isEmpty() ? "暂无项目小组，无法计算参与率。"
                        : participatingGroups.isEmpty() ? "暂无小组提交未撤回的阶段成果，因此参与率为 0。" : null,
                List.of(
                        participatingGroups.size() + " 个小组已有阶段成果记录。",
                        groupsAtBpOrLater + " 个小组已提交 BP 或更后阶段成果。"
                ),
                groupRecords
        );
        EvaluationCard passRate = card(
                "artifact-pass-rate",
                "成果通过率",
                percent(approved, submissions.size()) + "%",
                SYSTEM_SOURCE,
                "审核状态为已通过的未撤回成果数 ÷ 未撤回成果总数。",
                approved,
                (long) submissions.size(),
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE, TEACHER_SOURCE),
                submissions.isEmpty() ? "暂无未撤回成果，无法形成通过率。"
                        : approved == 0 ? "当前没有被教师审核为通过的成果，因此通过率为 0。" : null,
                List.of(approved + " 项已通过，" + revision + " 项退回修改，" + pending + " 项待审核。"),
                submissionRecords
        );
        EvaluationCard revisionCount = card(
                "revision-count",
                "退回修改数",
                revision + " 项",
                TEACHER_SOURCE,
                "当前审核状态为退回修改的未撤回成果数量。",
                revision,
                null,
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE, TEACHER_SOURCE),
                revision == 0 ? "暂无被教师退回修改的成果记录。" : null,
                List.of("退回状态只来自已保存的教师审核记录，不从前端快照推算。"),
                submissions.stream()
                        .filter(item -> item.getStatus() == SubmissionStatus.REVISION)
                        .map(item -> toSubmissionRecord(item, TEACHER_SOURCE, item.getTeacherComment()))
                        .limit(DETAIL_LIMIT)
                        .toList()
        );
        EvaluationCard excellentCount = card(
                "excellent-count",
                "优秀案例数",
                excellent + " 项",
                TEACHER_SOURCE,
                "教师已保存优秀标记的未撤回成果数量。",
                excellent,
                null,
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE, TEACHER_SOURCE),
                excellent == 0 ? "暂无由教师标记并保存的优秀成果。" : null,
                List.of("优秀案例只统计教师明确保存的优秀标记。"),
                submissions.stream()
                        .filter(ArtifactSubmission::isExcellent)
                        .map(item -> toSubmissionRecord(item, TEACHER_SOURCE, item.getTeacherComment()))
                        .limit(DETAIL_LIMIT)
                        .toList()
        );

        String diagnosisZeroReason = diagnosedSubmissions.isEmpty()
                ? "暂无已保存 AI 诊断；请先在教师端对成果执行 AI 诊断并保存。"
                : null;
        String feedbackZeroReason = feedbackSubmissions.isEmpty()
                ? "暂无已保存教师反馈；请先由教师完成成果审核并保存反馈。"
                : null;
        String currentEffectZeroReason = feedbackSubmissions.isEmpty() && diagnosedSubmissions.isEmpty()
                ? joinReasons(feedbackZeroReason, diagnosisZeroReason)
                : null;
        List<EvaluationDetailRecord> currentEffectRecords = concatRecords(feedbackRecords, diagnosisRecords);
        List<String> currentEffectStatements = List.of(
                "教师反馈已保存 " + feedbackSubmissions.size() + " 条，AI 诊断已保存 " + diagnosedSubmissions.size() + " 项。",
                "启用知识库 " + knowledge.activeBases() + " 个，启用知识资料 " + knowledge.activeAssets() + " 份。",
                "最近 30 天 DeepSeek " + providers.deepSeekCalls() + " 次、乐享 PPT " + providers.lexiangPptCalls()
                        + " 次、WorkBuddy 视频任务 " + providers.workBuddyVideoJobs() + " 次。"
        );

        EvaluationCard systemSummary = card(
                "system-summary",
                "系统数据汇总",
                submissions.size() + " 项成果",
                SYSTEM_SOURCE,
                "汇总当前账号、小组、未撤回成果、审核状态和知识库运行数据。",
                (long) submissions.size(),
                null,
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE),
                submissions.isEmpty() ? "数据库中暂无未撤回成果；账号、小组和知识数据仍按实际记录展示。" : null,
                List.of(
                        accounts.students() + " 个学生账号、" + accounts.teachers() + " 个教师账号、"
                                + accounts.admins() + " 个管理员账号。",
                        groups.size() + " 个项目小组，" + participatingGroups.size() + " 个已有阶段成果。",
                        submissions.size() + " 项未撤回成果，审核处理率 " + percent(approved + revision, submissions.size())
                                + "% ，通过率 " + percent(approved, submissions.size()) + "% 。",
                        groupsAtBpOrLater + " 个小组进入 BP 或更后阶段，" + excellent + " 项成果被标记为优秀。"
                ),
                concatRecords(groupRecords, submissionRecords)
        );
        EvaluationCard currentEffect = card(
                "current-verifiable-outcomes",
                "当前可验证成效",
                feedbackSubmissions.size() + " 条反馈 · " + diagnosedSubmissions.size() + " 项诊断",
                SYSTEM_SOURCE,
                "只展示数据库中已保存的教师反馈、教师主动触发并保存的 AI 诊断、知识数据和供应商运行记录。",
                (long) (feedbackSubmissions.size() + diagnosedSubmissions.size()),
                null,
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE, AI_SOURCE, TEACHER_SOURCE, PROVIDER_SOURCE),
                currentEffectZeroReason,
                currentEffectStatements,
                currentEffectRecords
        );

        IssueFinding primaryIssue = issueFindings.isEmpty() ? null : issueFindings.get(0);
        List<String> nextStepStatements = new ArrayList<>();
        if (primaryIssue != null) {
            nextStepStatements.add("首要有证据问题是“" + primaryIssue.label() + "”，涉及 "
                    + primaryIssue.matches().size() + " 项成果；" + primaryIssue.guidance());
        } else {
            nextStepStatements.add("没有足够的已保存诊断或教师反馈支持共性问题判断，不生成泛化结论。");
        }
        nextStepStatements.add(pending + " 项成果仍待审核，应先完成教师确认再形成试点评估结论。");
        nextStepStatements.add("供应商能力仅按真实运行记录计数，未调用时不据此判断生成质量。");
        EvaluationCard nextSteps = card(
                "next-step-summary",
                "下一步建议",
                primaryIssue == null ? "暂无证据问题" : primaryIssue.label(),
                SYSTEM_SOURCE,
                "根据已保存诊断、教师反馈、审核队列和供应商运行记录执行固定规则排序。",
                primaryIssue == null ? 0L : (long) primaryIssue.matches().size(),
                (long) submissions.size(),
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE, AI_SOURCE, TEACHER_SOURCE, PROVIDER_SOURCE),
                primaryIssue == null ? joinReasons(diagnosisZeroReason,
                        "当前没有被规则识别且可回溯到具体成果的高频问题。") : null,
                nextStepStatements,
                concatRecords(issueRecords,
                        submissions.stream()
                                .filter(item -> item.getStatus() == SubmissionStatus.PENDING)
                                .map(item -> toSubmissionRecord(item, "待审核", null))
                                .limit(DETAIL_LIMIT)
                                .toList())
        );

        EvaluationCard stageProgress = card(
                "stage-progress",
                "阶段进展",
                participatingGroups.size() + "/" + groups.size() + " 组参与",
                SYSTEM_SOURCE,
                "按小组已有的未撤回成果类型确定当前可验证阶段；不读取前端看板快照。",
                (long) participatingGroups.size(),
                (long) groups.size(),
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE),
                participatingGroups.isEmpty() ? "暂无小组提交阶段成果，无法形成阶段进展。" : null,
                List.of(
                        participatingGroups.size() + " 个小组有阶段成果记录，" + groupsAtBpOrLater + " 个进入 BP 或更后阶段。",
                        approved + " 项通过、" + revision + " 项退回修改、" + pending + " 项待审核。",
                        "知识库有 " + knowledge.assets() + " 份资料，其中 " + knowledge.activeAssets() + " 份启用。"
                ),
                groupRecords
        );
        List<String> findingStatements = issueFindings.isEmpty()
                ? List.of("尚无足够的已保存 AI 诊断或教师反馈，不能判断高频问题。")
                : issueFindings.stream()
                        .limit(3)
                        .map(finding -> finding.label() + "：" + finding.matches().size() + " 项成果存在可回溯证据。")
                        .toList();
        EvaluationCard keyFindings = card(
                "key-findings",
                "关键发现",
                issueFindings.size() + " 类有证据问题",
                AI_SOURCE,
                "仅对已保存 AI 诊断和教师反馈做关键词规则归类，每条发现必须能回到具体成果记录。",
                (long) issueFindings.size(),
                null,
                null,
                generatedAt,
                List.of(AI_SOURCE, TEACHER_SOURCE),
                issueFindings.isEmpty() ? joinReasons(diagnosisZeroReason,
                        "当前没有被规则识别且可回溯到具体成果的问题分类。") : null,
                findingStatements,
                issueRecords
        );
        long groupsWithoutSubmission = groups.size() - participatingGroups.size();
        List<String> riskStatements = List.of(
                groupsWithoutSubmission + " 个小组尚无阶段成果记录。",
                pending + " 项成果等待教师审核，未确认前不计入通过结论。",
                failedJobs.size() + " 个生成任务失败；只按供应商运行记录展示。"
        );
        EvaluationCard riskTracking = card(
                "risk-tracking",
                "风险跟踪",
                (groupsWithoutSubmission + pending + failedJobs.size()) + " 项待跟进",
                SYSTEM_SOURCE,
                "汇总无成果小组、待审核成果和失败生成任务；三类数量直接相加形成待跟进总数。",
                groupsWithoutSubmission + pending + failedJobs.size(),
                null,
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE, TEACHER_SOURCE, PROVIDER_SOURCE),
                groupsWithoutSubmission + pending + failedJobs.size() == 0
                        ? "当前没有无成果小组、待审核成果或失败生成任务。" : null,
                riskStatements,
                concatRecords(
                        groups.stream()
                                .filter(group -> submissionsByGroupId.getOrDefault(group.getId(), List.of()).isEmpty())
                                .map(group -> toGroupRecord(group, memberCounts.getOrDefault(group.getId(), 0L), List.of()))
                                .limit(DETAIL_LIMIT)
                                .toList(),
                        submissions.stream()
                                .filter(item -> item.getStatus() == SubmissionStatus.PENDING)
                                .map(item -> toSubmissionRecord(item, "待审核", null))
                                .limit(DETAIL_LIMIT)
                                .toList(),
                        failedJobRecords
                )
        );
        List<String> actionStatements = List.of(
                primaryIssue == null ? "先积累真实诊断和教师反馈，再制定集中讲评主题。" : primaryIssue.guidance(),
                "优先处理 " + pending + " 项待审核成果，并由教师保存确认后的反馈。",
                excellent == 0 ? "当前暂无优秀成果标记，暂不进入案例沉淀。"
                        : "复核 " + excellent + " 项优秀成果是否具备进入课程案例库的条件。"
        );
        EvaluationCard nextActions = card(
                "next-actions",
                "下阶段动作",
                pending + " 项优先审核",
                SYSTEM_SOURCE,
                "按有证据问题、待审核数量和优秀标记生成固定优先级动作，不调用 AI。",
                pending,
                null,
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE, AI_SOURCE, TEACHER_SOURCE),
                pending == 0 && primaryIssue == null && excellent == 0
                        ? joinReasons(diagnosisZeroReason, "当前没有待审核成果或优秀标记，暂无可排定的后续动作。") : null,
                actionStatements,
                concatRecords(issueRecords, submissionRecords)
        );

        EvaluationCard submissionsEvidence = card(
                "submission-evidence",
                "阶段成果",
                submissions.size() + " 项",
                SYSTEM_SOURCE,
                "数据库中所有未撤回的成果提交版本。",
                (long) submissions.size(),
                null,
                null,
                generatedAt,
                List.of(SYSTEM_SOURCE),
                submissions.isEmpty() ? "暂无未撤回的成果提交记录。" : null,
                List.of("每次重提均按 submissionVersion 保留独立记录。"),
                submissionRecords
        );
        EvaluationCard feedbackEvidence = card(
                "teacher-feedback-evidence",
                "教师反馈",
                feedbackSubmissions.size() + " 条",
                TEACHER_SOURCE,
                "教师已保存且内容非空的成果审核意见。",
                (long) feedbackSubmissions.size(),
                null,
                null,
                generatedAt,
                List.of(TEACHER_SOURCE),
                feedbackZeroReason,
                List.of("只统计持久化在成果提交版本上的教师反馈。"),
                feedbackRecords
        );
        EvaluationCard diagnosisEvidence = card(
                "ai-diagnosis-evidence",
                "AI 诊断记录",
                diagnosedSubmissions.size() + " 项",
                AI_SOURCE,
                "教师主动触发后，同时保存诊断 JSON 和诊断时间的记录。",
                (long) diagnosedSubmissions.size(),
                null,
                null,
                generatedAt,
                List.of(AI_SOURCE),
                diagnosisZeroReason,
                List.of("打开或刷新运营页不会创建新的 AI 诊断。"),
                diagnosisRecords
        );
        long providerCalls = providers.deepSeekCalls() + providers.lexiangPptCalls() + providers.workBuddyVideoJobs();
        EvaluationCard providerEvidence = card(
                "provider-evidence",
                "供应商运行记录",
                providerCalls + " 次",
                PROVIDER_SOURCE,
                "最近 30 天已持久化的 DeepSeek 调用、乐享 PPT 调用和 WorkBuddy 视频任务数量之和。",
                providerCalls,
                null,
                providerPeriodStart,
                generatedAt,
                List.of(PROVIDER_SOURCE),
                providerCalls == 0 ? "最近 30 天暂无已保存的供应商调用或任务记录；运营页不会为补齐统计而调用供应商。" : null,
                List.of(
                        "DeepSeek " + providers.deepSeekCalls() + " 次。",
                        "乐享 PPT " + providers.lexiangPptCalls() + " 次。",
                        "WorkBuddy 视频 " + providers.workBuddyVideoCompleted() + "/" + providers.workBuddyVideoJobs() + " 完成/提交。"
                ),
                failedJobRecords
        );

        return new EvaluationReport(
                List.of(SYSTEM_SOURCE, AI_SOURCE, TEACHER_SOURCE, PROVIDER_SOURCE),
                List.of(participationRate, passRate, revisionCount, excellentCount),
                List.of(systemSummary, currentEffect, nextSteps),
                List.of(stageProgress, keyFindings, riskTracking, nextActions),
                List.of(submissionsEvidence, feedbackEvidence, diagnosisEvidence, providerEvidence)
        );
    }

    private List<IssueFinding> buildIssueFindings(List<ArtifactSubmission> submissions) {
        List<IssueFinding> findings = new ArrayList<>();
        for (IssueDefinition definition : ISSUE_DEFINITIONS) {
            List<IssueMatch> matches = submissions.stream()
                    .map(submission -> new IssueMatch(submission, issueEvidence(submission, definition)))
                    .filter(match -> match.evidence() != null)
                    .toList();
            if (!matches.isEmpty()) findings.add(new IssueFinding(definition.label(), definition.guidance(), matches));
        }
        findings.sort(Comparator.comparingInt((IssueFinding finding) -> finding.matches().size()).reversed()
                .thenComparing(IssueFinding::label));
        return List.copyOf(findings);
    }

    private String issueEvidence(ArtifactSubmission submission, IssueDefinition definition) {
        for (String candidate : diagnosisEvidenceTexts(submission)) {
            if (definition.keywords().stream().anyMatch(candidate::contains)) return candidate;
        }
        if (hasText(submission.getTeacherComment())
                && definition.keywords().stream().anyMatch(submission.getTeacherComment()::contains)) {
            return submission.getTeacherComment();
        }
        return null;
    }

    private List<String> diagnosisEvidenceTexts(ArtifactSubmission submission) {
        if (!hasText(submission.getAiDiagnosisJson()) || submission.getAiDiagnosedAt() == null) return List.of();
        try {
            JsonNode diagnosis = objectMapper.readTree(submission.getAiDiagnosisJson());
            List<String> evidence = new ArrayList<>();
            addText(evidence, diagnosis.path("summary"));
            addArrayTexts(evidence, diagnosis.path("problems"));
            addArrayTexts(evidence, diagnosis.path("risks"));
            return List.copyOf(evidence);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String diagnosisSummary(ArtifactSubmission submission) {
        return diagnosisEvidenceTexts(submission).stream().findFirst().orElse("已保存 AI 诊断");
    }

    private static void addText(List<String> target, JsonNode value) {
        if (value.isTextual() && !value.asText().isBlank()) target.add(value.asText().trim());
    }

    private static void addArrayTexts(List<String> target, JsonNode values) {
        if (!values.isArray()) return;
        values.forEach(value -> addText(target, value));
    }

    private GroupProgress buildGroupProgress(
            ProjectGroup group,
            List<ArtifactSubmission> submissions,
            long memberCount
    ) {
        List<ArtifactSubmission> groupSubmissions = submissions.stream()
                .filter(item -> belongsToGroup(item, group))
                .toList();
        ArtifactSubmission latest = groupSubmissions.stream()
                .max(Comparator.comparing(ArtifactSubmission::getSubmittedAt))
                .orElse(null);
        return new GroupProgress(
                group.getId(),
                group.getGroupLabel(),
                group.getProjectName(),
                memberCount,
                groupSubmissions.size(),
                latest == null ? null : latest.getArtifactTypeSnapshot(),
                groupSubmissions.stream().filter(item -> item.getStatus() == SubmissionStatus.PENDING).count(),
                groupSubmissions.stream().filter(ArtifactSubmission::isExcellent).count()
        );
    }

    private EvaluationDetailRecord toGroupRecord(
            ProjectGroup group,
            long memberCount,
            List<ArtifactSubmission> submissions
    ) {
        ArtifactSubmission latest = submissions.stream()
                .max(Comparator.comparing(ArtifactSubmission::getSubmittedAt))
                .orElse(null);
        String detail = memberCount + " 名成员 · " + submissions.size() + " 项成果"
                + (latest == null ? "" : " · 最新 " + latest.getArtifactTypeSnapshot());
        return new EvaluationDetailRecord(
                group.getId(),
                "小组",
                group.getProjectName(),
                detail,
                group.getGroupLabel(),
                latest == null ? "暂无成果" : "已有成果",
                latest == null ? null : latest.getSubmittedAt()
        );
    }

    private EvaluationDetailRecord toSubmissionRecord(ArtifactSubmission submission, String kind, String detail) {
        return new EvaluationDetailRecord(
                submission.getId(),
                kind,
                submission.getArtifactTitleSnapshot() + " · 第 " + submission.getSubmissionVersion() + " 版",
                hasText(detail) ? detail : submission.getArtifactSummarySnapshot(),
                submission.getGroupLabel() + " / " + submission.getGroupName(),
                statusLabel(submission.getStatus()),
                submission.getSubmittedAt()
        );
    }

    private EvaluationDetailRecord toGenerationJobRecord(GenerationJob job) {
        return new EvaluationDetailRecord(
                job.getId(),
                PROVIDER_SOURCE,
                job.getProvider() + " · " + job.getArtifactType(),
                hasText(job.getErrorMessage()) ? job.getErrorMessage() : "生成任务运行记录",
                null,
                job.getStatus().name(),
                job.getCreatedAt()
        );
    }

    @SafeVarargs
    private static List<EvaluationDetailRecord> concatRecords(List<EvaluationDetailRecord>... lists) {
        Map<String, EvaluationDetailRecord> unique = new LinkedHashMap<>();
        for (List<EvaluationDetailRecord> list : lists) {
            for (EvaluationDetailRecord item : list) {
                unique.putIfAbsent(item.kind() + ":" + item.id(), item);
                if (unique.size() >= DETAIL_LIMIT) return List.copyOf(unique.values());
            }
        }
        return List.copyOf(unique.values());
    }

    private static EvaluationCard card(
            String key,
            String title,
            String value,
            String badge,
            String definition,
            Long numerator,
            Long denominator,
            Instant periodStart,
            Instant periodEnd,
            List<String> sources,
            String zeroReason,
            List<String> statements,
            List<EvaluationDetailRecord> records
    ) {
        return new EvaluationCard(
                key,
                title,
                value,
                badge,
                definition,
                numerator,
                denominator,
                periodStart,
                periodEnd,
                sources,
                zeroReason,
                statements,
                records
        );
    }

    private AuditActivity toActivity(AuditLog log) {
        return new AuditActivity(log.getId(), log.getCreatedAt(), log.getAction(), log.getResourceType(), log.getSummary(), log.getActorDisplayName());
    }

    private static boolean belongsToGroup(ArtifactSubmission submission, ProjectGroup group) {
        return group.getGroupLabel().equals(submission.getGroupLabel())
                || group.getProjectName().equals(submission.getGroupName());
    }

    private static boolean isBpOrLater(String artifactType) {
        return Set.of("BP", "PPT", "DEFENSE", "MEDIA", "SCRIPT").contains(artifactType);
    }

    private static int percent(long numerator, long denominator) {
        return denominator == 0 ? 0 : (int) Math.round(numerator * 100.0 / denominator);
    }

    private static String joinReasons(String... reasons) {
        Set<String> values = new LinkedHashSet<>();
        for (String reason : reasons) {
            if (hasText(reason)) values.add(reason.trim());
        }
        return values.isEmpty() ? null : String.join(" ", values);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String statusLabel(SubmissionStatus status) {
        return switch (status) {
            case PENDING -> "待审核";
            case APPROVED -> "已通过";
            case REVISION -> "退回修改";
            case WITHDRAWN -> "已撤回";
        };
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
            List<AuditActivity> recentActivity,
            EvaluationReport evaluation
    ) {}

    public record AccountSummary(long students, long teachers, long admins) {}
    public record SubmissionSummary(long total, long pending, long approved, long revision, long excellent, int processedRate, int passRate) {}
    public record KnowledgeSummary(long bases, long activeBases, long assets, long activeAssets) {}
    public record ProviderSummary(long deepSeekCalls, long lexiangPptCalls, long workBuddyVideoJobs, long workBuddyVideoCompleted,
                                  long queuedJobs, long runningJobs, long failedJobs) {}
    public record GroupProgress(String id, String label, String projectName, long memberCount, long submissionCount,
                                String latestArtifactType, long pendingCount, long excellentCount) {}
    public record AuditActivity(String id, Instant occurredAt, String action, String resourceType, String summary, String actor) {}
    public record EvaluationReport(
            List<String> sourceCategories,
            List<EvaluationCard> kpis,
            List<EvaluationCard> summaries,
            List<EvaluationCard> reviews,
            List<EvaluationCard> evidence
    ) {}
    public record EvaluationCard(
            String key,
            String title,
            String value,
            String badge,
            String definition,
            Long numerator,
            Long denominator,
            Instant periodStart,
            Instant periodEnd,
            List<String> sources,
            String zeroReason,
            List<String> statements,
            List<EvaluationDetailRecord> records
    ) {}
    public record EvaluationDetailRecord(
            String id,
            String kind,
            String title,
            String detail,
            String groupLabel,
            String status,
            Instant occurredAt
    ) {}

    private record IssueDefinition(String label, List<String> keywords, String guidance) {}
    private record IssueMatch(ArtifactSubmission submission, String evidence) {}
    private record IssueFinding(String label, String guidance, List<IssueMatch> matches) {}
}
