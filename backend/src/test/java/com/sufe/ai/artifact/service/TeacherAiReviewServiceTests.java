package com.sufe.ai.artifact.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.domain.ArtifactSubmission;
import com.sufe.ai.artifact.repository.ArtifactSubmissionRepository;
import com.sufe.ai.provider.config.DeepSeekProperties;
import com.sufe.ai.provider.deepseek.DeepSeekChatClient;
import com.sufe.ai.provider.deepseek.DeepSeekChatCommand;
import com.sufe.ai.provider.deepseek.DeepSeekChatResult;
import com.sufe.ai.usage.service.AiUsageService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.net.URI;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class TeacherAiReviewServiceTests {

    @Test
    void diagnosesActualArtifactAndPersistsStructuredTeacherReference() {
        DeepSeekChatClient chatClient = mock(DeepSeekChatClient.class);
        UserAccountRepository userRepository = mock(UserAccountRepository.class);
        ArtifactSubmissionRepository submissionRepository = mock(ArtifactSubmissionRepository.class);
        ArtifactService artifactService = mock(ArtifactService.class);
        AiUsageService usageService = mock(AiUsageService.class);
        ObjectMapper objectMapper = new ObjectMapper();

        UserAccount teacher = UserAccount.create(
                "teacher-001", "teacher@test.local", "password-hash", UserRole.TEACHER, "周老师", "课程教师", 100
        );
        ArtifactRecord artifact = ArtifactRecord.create(
                "student-001", "idea-001", "message-001", "BP", "校园咖啡 BP", "验证订阅咖啡需求",
                "{\"valueProposition\":\"减少课间排队\",\"evidence\":\"尚未提供访谈原话\"}"
        );
        ArtifactSubmission submission = ArtifactSubmission.create(
                artifact, 1, "student-001", "陈同学", "第 3 组", "校园咖啡"
        );
        String providerJson = """
                {"summary":"方向清楚但证据不足","problems":["缺少访谈原话"],"risks":["支付意愿未验证"],
                "questions":["谁愿意付费？"],"tasks":["完成5次访谈"],
                "scores":[{"name":"创新性","score":12,"reason":"有明确场景"}],
                "feedbackDraft":"请先补齐访谈证据，再验证订阅价格。"}
                """;

        when(userRepository.findByAccountIgnoreCase("teacher@test.local")).thenReturn(Optional.of(teacher));
        when(submissionRepository.findById(submission.getId())).thenReturn(Optional.of(submission));
        when(submissionRepository.findFirstByArtifactIdOrderBySubmissionVersionDesc(artifact.getId()))
                .thenReturn(Optional.of(submission));
        when(chatClient.chat(any())).thenReturn(new DeepSeekChatResult("```json\n" + providerJson + "\n```", "deepseek-pro", Optional.empty()));

        TeacherAiReviewService service = new TeacherAiReviewService(
                new DeepSeekProperties(true, URI.create("https://deepseek.test"), "test-key", "flash", "pro", 4096, 20, 12000),
                chatClient,
                userRepository,
                submissionRepository,
                artifactService,
                usageService,
                objectMapper
        );

        JsonNode result = service.diagnose("teacher@test.local", submission.getId());

        assertThat(result.path("summary").asText()).isEqualTo("方向清楚但证据不足");
        ArgumentCaptor<String> diagnosis = ArgumentCaptor.forClass(String.class);
        verify(artifactService).recordAiDiagnosisForLatest(org.mockito.ArgumentMatchers.eq(submission.getId()), diagnosis.capture());
        assertThat(diagnosis.getValue()).contains("缺少访谈原话");
        verifyNoInteractions(usageService);

        ArgumentCaptor<DeepSeekChatCommand> command = ArgumentCaptor.forClass(DeepSeekChatCommand.class);
        verify(chatClient).chat(command.capture());
        assertThat(command.getValue().messages().getFirst().content())
                .contains("只分析给定成果")
                .contains("不能声称已经完成教师终审");
        assertThat(command.getValue().messages().getLast().content())
                .contains("校园咖啡 BP")
                .contains("尚未提供访谈原话");
    }

    @Test
    void rejectsSupersededSubmissionBeforeCallingAi() {
        DeepSeekChatClient chatClient = mock(DeepSeekChatClient.class);
        UserAccountRepository userRepository = mock(UserAccountRepository.class);
        ArtifactSubmissionRepository submissionRepository = mock(ArtifactSubmissionRepository.class);
        ArtifactService artifactService = mock(ArtifactService.class);
        AiUsageService usageService = mock(AiUsageService.class);
        UserAccount teacher = UserAccount.create(
                "teacher-002", "teacher@test.local", "password-hash", UserRole.TEACHER, "周老师", "课程教师", 100
        );
        ArtifactRecord artifact = ArtifactRecord.create(
                "student-001", "idea-001", "message-002", "BP", "校园咖啡 BP v1", "第一版",
                "{\"version\":1}"
        );
        ArtifactSubmission versionOne = ArtifactSubmission.create(
                artifact, 1, "student-001", "陈同学", "第 3 组", "校园咖啡"
        );
        artifact.refresh("BP", "校园咖啡 BP v2", "第二版", "{\"version\":2}");
        ArtifactSubmission versionTwo = ArtifactSubmission.create(
                artifact, 2, "student-001", "陈同学", "第 3 组", "校园咖啡"
        );
        when(userRepository.findByAccountIgnoreCase("teacher@test.local")).thenReturn(Optional.of(teacher));
        when(submissionRepository.findById(versionOne.getId())).thenReturn(Optional.of(versionOne));
        when(submissionRepository.findFirstByArtifactIdOrderBySubmissionVersionDesc(artifact.getId()))
                .thenReturn(Optional.of(versionTwo));

        TeacherAiReviewService service = new TeacherAiReviewService(
                new DeepSeekProperties(true, URI.create("https://deepseek.test"), "test-key", "flash", "pro", 4096, 20, 12000),
                chatClient,
                userRepository,
                submissionRepository,
                artifactService,
                usageService,
                new ObjectMapper()
        );

        assertThatThrownBy(() -> service.diagnose("teacher@test.local", versionOne.getId()))
                .isInstanceOf(ArtifactConflictException.class)
                .hasMessageContaining("更新版本取代");
        verifyNoInteractions(chatClient, artifactService, usageService);
    }
}
