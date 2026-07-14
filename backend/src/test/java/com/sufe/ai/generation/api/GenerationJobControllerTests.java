package com.sufe.ai.generation.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.repository.GenerationJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GenerationJobControllerTests {

    private static final String USER_ACCOUNT = "generation-user@test.local";
    private static final String USER_ID = "U-GENERATION-USER";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private GenerationJobRepository generationJobRepository;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                USER_ID,
                USER_ACCOUNT,
                "unused-password-hash",
                UserRole.STUDENT,
                "生成任务测试用户",
                "创业实践课学生",
                100
        ));
    }

    @Test
    @WithMockUser(username = USER_ACCOUNT, roles = "STUDENT")
    void submitsQueuedJobAndReturnsItsStatus() throws Exception {
        String responseBody = mockMvc.perform(post("/api/generation/jobs")
                        .with(csrf())
                        .contentType("application/json")
                        .content(validRequest("generation-key-001", "project-001")))
                .andExpect(status().isAccepted())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/generation/jobs/")))
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.provider").value("LEXIANG"))
                .andExpect(jsonPath("$.artifactType").value("PPT"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode response = objectMapper.readTree(responseBody);
        String jobId = response.get("id").asText();

        GenerationJob persisted = generationJobRepository.findById(jobId).orElseThrow();
        assertThat(persisted.getUserId()).isEqualTo(USER_ID);
        assertThat(persisted.getIdeaId()).isEqualTo("idea-001");
        assertThat(persisted.getInputSnapshot()).isEqualTo("{\"summary\":\"已冻结的会话上下文\"}");

        mockMvc.perform(get("/api/generation/jobs/{jobId}", jobId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(jobId))
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.projectId").value("project-001"));
    }

    @Test
    @WithMockUser(username = USER_ACCOUNT, roles = "STUDENT")
    void reusesJobForSameUserAndIdempotencyKey() throws Exception {
        String firstBody = mockMvc.perform(post("/api/generation/jobs")
                        .with(csrf())
                        .contentType("application/json")
                        .content(validRequest("same-key", "original-project")))
                .andExpect(status().isAccepted())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String secondBody = mockMvc.perform(post("/api/generation/jobs")
                        .with(csrf())
                        .contentType("application/json")
                        .content(validRequest("same-key", "different-project")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value("original-project"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String firstJobId = objectMapper.readTree(firstBody).get("id").asText();
        String secondJobId = objectMapper.readTree(secondBody).get("id").asText();
        assertThat(secondJobId).isEqualTo(firstJobId);
        assertThat(generationJobRepository.findAll())
                .filteredOn(job -> job.getUserId().equals(USER_ID) && job.getIdempotencyKey().equals("same-key"))
                .hasSize(1);
    }

    @Test
    @WithMockUser(username = USER_ACCOUNT, roles = "STUDENT")
    void hidesJobsOwnedByAnotherUser() throws Exception {
        GenerationJob otherUsersJob = generationJobRepository.save(GenerationJob.queued(
                "U-OTHER",
                "conversation-other",
                "project-other",
                null,
                "expert-other",
                GenerationProvider.WORKBUDDY,
                ArtifactType.VIDEO,
                "{\"summary\":\"other\"}",
                "other-key"
        ));

        mockMvc.perform(get("/api/generation/jobs/{jobId}", otherUsersJob.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GENERATION_JOB_NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = USER_ACCOUNT, roles = "STUDENT")
    void rejectsNullContextSnapshot() throws Exception {
        mockMvc.perform(post("/api/generation/jobs")
                        .with(csrf())
                        .contentType("application/json")
                        .content(validRequest("null-snapshot-key", "project-001")
                                .replace("{\"summary\": \"已冻结的会话上下文\"}", "null")))
                .andExpect(status().isBadRequest());

        assertThat(generationJobRepository.findByUserIdAndIdempotencyKey(USER_ID, "null-snapshot-key")).isEmpty();
    }

    @Test
    @WithMockUser(username = USER_ACCOUNT, roles = "STUDENT")
    void derivesWorkBuddyProviderForVideoJobs() throws Exception {
        mockMvc.perform(post("/api/generation/jobs")
                        .with(csrf())
                        .contentType("application/json")
                        .content(validRequest("video-key", "project-001")
                                .replace("\"artifactType\": \"PPT\"", "\"artifactType\": \"VIDEO\"")))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.provider").value("WORKBUDDY"))
                .andExpect(jsonPath("$.artifactType").value("VIDEO"));
    }

    @Test
    @WithMockUser(username = USER_ACCOUNT, roles = "STUDENT")
    void rejectsUnsupportedWordJobs() throws Exception {
        mockMvc.perform(post("/api/generation/jobs")
                        .with(csrf())
                        .contentType("application/json")
                        .content(validRequest("word-key", "project-001")
                                .replace("\"artifactType\": \"PPT\"", "\"artifactType\": \"WORD\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = USER_ACCOUNT, roles = "STUDENT")
    void rejectsOversizedContextSnapshot() throws Exception {
        String request = objectMapper.writeValueAsString(Map.of(
                "artifactType", "PPT",
                "projectId", "project-001",
                "conversationId", "conversation-001",
                "ideaId", "idea-001",
                "expertId", "pitch-expert",
                "contextSnapshot", Map.of("content", "测".repeat(15_001)),
                "idempotencyKey", "oversized-context-key"
        ));

        mockMvc.perform(post("/api/generation/jobs")
                        .with(csrf())
                        .contentType("application/json")
                        .content(request))
                .andExpect(status().isBadRequest());

        assertThat(generationJobRepository
                .findByUserIdAndIdempotencyKey(USER_ID, "oversized-context-key"))
                .isEmpty();
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/generation/jobs/unknown-job"))
                .andExpect(status().isUnauthorized());
    }

    private static String validRequest(String idempotencyKey, String projectId) {
        return """
                {
                  "artifactType": "PPT",
                  "projectId": "%s",
                  "conversationId": "conversation-001",
                  "ideaId": "idea-001",
                  "expertId": "pitch-expert",
                  "contextSnapshot": {"summary": "已冻结的会话上下文"},
                  "idempotencyKey": "%s"
                }
                """.formatted(projectId, idempotencyKey);
    }
}
