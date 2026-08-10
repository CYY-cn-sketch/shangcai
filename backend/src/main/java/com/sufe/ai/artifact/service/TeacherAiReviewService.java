package com.sufe.ai.artifact.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactSubmission;
import com.sufe.ai.artifact.repository.ArtifactSubmissionRepository;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.config.DeepSeekProperties;
import com.sufe.ai.provider.deepseek.DeepSeekChatClient;
import com.sufe.ai.provider.deepseek.DeepSeekChatCommand;
import com.sufe.ai.provider.deepseek.DeepSeekChatResult;
import com.sufe.ai.provider.deepseek.DeepSeekClientException;
import com.sufe.ai.provider.deepseek.DeepSeekMessage;
import com.sufe.ai.usage.service.AiUsageService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TeacherAiReviewService {

    private final DeepSeekProperties properties;
    private final DeepSeekChatClient chatClient;
    private final UserAccountRepository userRepository;
    private final ArtifactSubmissionRepository submissionRepository;
    private final ArtifactService artifactService;
    private final AiUsageService usageService;
    private final ObjectMapper objectMapper;

    public TeacherAiReviewService(
            DeepSeekProperties properties,
            DeepSeekChatClient chatClient,
            UserAccountRepository userRepository,
            ArtifactSubmissionRepository submissionRepository,
            ArtifactService artifactService,
            AiUsageService usageService,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.chatClient = chatClient;
        this.userRepository = userRepository;
        this.submissionRepository = submissionRepository;
        this.artifactService = artifactService;
        this.usageService = usageService;
        this.objectMapper = objectMapper;
    }

    public JsonNode diagnose(String accountName, String submissionId) {
        if (!properties.configured()) {
            throw new DeepSeekClientException("DEEPSEEK_DISABLED", "DeepSeek 网关未启用，未发起 AI 诊断", HttpStatus.SERVICE_UNAVAILABLE);
        }
        UserAccount teacher = userRepository.findByAccountIgnoreCase(accountName)
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"));
        ArtifactSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ArtifactNotFoundException("提交记录不存在"));
        ArtifactSubmission latest = submissionRepository
                .findFirstByArtifactIdOrderBySubmissionVersionDesc(submission.getArtifactId())
                .orElseThrow(() -> new ArtifactNotFoundException("提交记录不存在"));
        if (!latest.getId().equals(submission.getId())) {
            throw new ArtifactConflictException("该提交已被更新版本取代，不能发起新的 AI 诊断");
        }

        String content = submission.getContentJsonSnapshot();
        if (content.length() > 14_000) content = content.substring(0, 14_000);
        String systemPrompt = """
                你是上海财经大学商学院创业实践课程的教师审核助手。只分析给定成果，不得虚构访谈、数据或文件。
                必须只返回一个 JSON 对象，不得使用 Markdown 代码围栏。结构如下：
                {"summary":"80字内总评","problems":["最多4项"],"risks":["最多3项"],"questions":["最多4项"],
                "tasks":["最多4项"],"scores":[{"name":"创新性","score":0,"reason":"依据"}],"feedbackDraft":"教师可编辑的反馈草稿"}
                scores 必须包含创新性、市场洞察、商业逻辑、财务合理性、表达呈现、团队协作六项；分值上限依次为20、20、20、15、15、10。
                资料不足的维度必须明确写“资料不足”，并给保守分数。输出是参考意见，不能声称已经完成教师终审。
                """;
        String userPrompt = "成果类型：" + submission.getArtifactTypeSnapshot()
                + "\n成果标题：" + submission.getArtifactTitleSnapshot()
                + "\n成果摘要：" + submission.getArtifactSummarySnapshot()
                + "\n学生：" + submission.getStudentName()
                + "\n小组：" + submission.getGroupLabel() + " / " + submission.getGroupName()
                + "\n已有教师反馈：" + (submission.getTeacherComment() == null ? "无" : submission.getTeacherComment())
                + "\n成果正文 JSON：\n" + content;

        DeepSeekChatResult result = chatClient.chat(new DeepSeekChatCommand(
                teacher.getId(),
                properties.proModel(),
                true,
                "high",
                List.of(new DeepSeekMessage("system", systemPrompt), new DeepSeekMessage("user", userPrompt))
        ));
        JsonNode diagnosis = parseDiagnosis(result.content());
        artifactService.recordAiDiagnosisForLatest(submissionId, diagnosis.toString());
        result.verifiedUsage().ifPresent(usage -> usageService.recordReportedUsage(new AiUsageService.ReportedUsage(
                teacher.getId(),
                GenerationProvider.DEEPSEEK,
                usage.modelName(),
                "TEACHER_DIAGNOSIS",
                usage.requestId(),
                usage.inputTokens(),
                usage.outputTokens()
        )));
        return diagnosis;
    }

    private JsonNode parseDiagnosis(String content) {
        String normalized = content.trim();
        if (normalized.startsWith("```")) {
            normalized = normalized.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        }
        try {
            JsonNode root = objectMapper.readTree(normalized);
            if (!root.isObject() || !root.path("problems").isArray() || !root.path("scores").isArray()) {
                throw new IllegalArgumentException("缺少诊断字段");
            }
            return root;
        } catch (Exception exception) {
            throw new DeepSeekClientException(
                    "DEEPSEEK_DIAGNOSIS_FORMAT_INVALID",
                    "AI 诊断返回格式无法识别，请重新生成",
                    HttpStatus.BAD_GATEWAY,
                    exception
            );
        }
    }
}
