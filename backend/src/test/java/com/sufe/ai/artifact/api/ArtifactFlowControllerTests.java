package com.sufe.ai.artifact.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.repository.ArtifactDownloadLogRepository;
import com.sufe.ai.workspace.domain.StudentIdea;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ArtifactFlowControllerTests {

    private static final String STUDENT_ACCOUNT = "artifact-student@test.local";
    private static final String STUDENT_ID = "U-ARTIFACT-STUDENT";
    private static final String OTHER_ACCOUNT = "artifact-other@test.local";
    private static final String OTHER_ID = "U-ARTIFACT-OTHER";
    private static final String TEACHER_ACCOUNT = "artifact-teacher@test.local";
    private static final String TEACHER_ID = "U-ARTIFACT-TEACHER";
    private static final String GROUP_ID = "G-ARTIFACT";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private ProjectGroupRepository groupRepository;

    @Autowired
    private GroupMembershipRepository membershipRepository;

    @Autowired
    private StudentIdeaRepository ideaRepository;

    @Autowired
    private ArtifactDownloadLogRepository downloadLogRepository;

    private String ideaId;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                STUDENT_ID, STUDENT_ACCOUNT, "unused", UserRole.STUDENT, "成果学生", "创业实践课学生", 100
        ));
        userAccountRepository.save(UserAccount.create(
                OTHER_ID, OTHER_ACCOUNT, "unused", UserRole.STUDENT, "其他学生", "创业实践课学生", 100
        ));
        userAccountRepository.save(UserAccount.create(
                TEACHER_ID, TEACHER_ACCOUNT, "unused", UserRole.TEACHER, "成果教师", "创业实践课教师", 100
        ));
        groupRepository.save(ProjectGroup.create(GROUP_ID, "第 12 组", "成果链路测试"));
        membershipRepository.save(GroupMembership.create("M-ARTIFACT", STUDENT_ID, GROUP_ID));
        ideaId = ideaRepository.save(StudentIdea.create(
                STUDENT_ID, "成果链路创意", "验证成果提交审核下载", "BP 撰写"
        )).getId();
    }

    @Test
    void runsArtifactSubmissionReviewAndDownloadFlow() throws Exception {
        String artifactBody = mockMvc.perform(post("/api/student/artifacts")
                        .with(student())
                        .with(csrf())
                        .contentType("application/json")
                        .content(artifactRequest("BP", "message-001")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.artifactType").value("BP"))
                .andExpect(jsonPath("$.fileAvailable").value(false))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String artifactId = objectMapper.readTree(artifactBody).get("id").asText();

        String repeatedBody = mockMvc.perform(post("/api/student/artifacts")
                        .with(student())
                        .with(csrf())
                        .contentType("application/json")
                        .content(artifactRequest("BP", "message-001")))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(objectMapper.readTree(repeatedBody).get("id").asText()).isEqualTo(artifactId);

        String submissionBody = mockMvc.perform(post("/api/student/artifacts/{artifactId}/submit", artifactId)
                        .with(student())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.student").value("成果学生"))
                .andExpect(jsonPath("$.group").value("第 12 组"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String submissionId = objectMapper.readTree(submissionBody).get("id").asText();

        mockMvc.perform(get("/api/teacher/submissions").with(teacher()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(submissionId))
                .andExpect(jsonPath("$[0].artifactTitle").value("成果链路创意 - 商业计划书 BP"));

        mockMvc.perform(patch("/api/teacher/submissions/{submissionId}", submissionId)
                        .with(teacher())
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "status": "APPROVED",
                                  "teacherComment": "逻辑完整，可以进入路演阶段。",
                                  "excellent": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.excellent").value(true))
                .andExpect(jsonPath("$.teacherComment").value("逻辑完整，可以进入路演阶段。"));

        mockMvc.perform(get("/api/student/submissions").with(student()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("APPROVED"));

        mockMvc.perform(get("/api/artifacts/{artifactId}/download", artifactId).with(student()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/msword"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString(".doc")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("成果链路创意")));
        assertThat(downloadLogRepository.countByArtifactId(artifactId)).isEqualTo(1);

        mockMvc.perform(get("/api/artifacts/{artifactId}/download", artifactId).with(otherStudent()))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/artifacts/{artifactId}/download", artifactId).with(teacher()))
                .andExpect(status().isOk());
        assertThat(downloadLogRepository.countByArtifactId(artifactId)).isEqualTo(2);

        mockMvc.perform(post("/api/student/artifacts/{artifactId}/download-events", artifactId)
                        .with(student())
                        .with(csrf()))
                .andExpect(status().isNoContent());
        assertThat(downloadLogRepository.countByArtifactId(artifactId)).isEqualTo(3);

        mockMvc.perform(patch("/api/student/submissions/{submissionId}/withdraw", submissionId)
                        .with(student())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WITHDRAWN"));

        mockMvc.perform(delete("/api/student/submissions/{submissionId}", submissionId)
                        .with(student())
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void rejectsUnavailablePptFileAndStudentTeacherRouteAccess() throws Exception {
        String artifactBody = mockMvc.perform(post("/api/student/artifacts")
                        .with(student())
                        .with(csrf())
                        .contentType("application/json")
                        .content(artifactRequest("PPT", "message-ppt")))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String artifactId = objectMapper.readTree(artifactBody).get("id").asText();

        mockMvc.perform(get("/api/artifacts/{artifactId}/download", artifactId).with(student()))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/teacher/submissions").with(student()))
                .andExpect(status().isForbidden());
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/student/artifacts"))
                .andExpect(status().isUnauthorized());
    }

    private String artifactRequest(String artifactType, String sourceMessageId) throws Exception {
        JsonNode content = objectMapper.createArrayNode()
                .add(objectMapper.createObjectNode()
                        .put("title", "核心结论")
                        .set("items", objectMapper.createArrayNode().add("验证用户痛点与商业闭环")));
        return objectMapper.writeValueAsString(Map.of(
                "ideaId", ideaId,
                "sourceMessageId", sourceMessageId,
                "artifactType", artifactType,
                "title", "成果链路创意 - 商业计划书 BP",
                "summary", "已形成完整商业计划书。",
                "content", content
        ));
    }

    private static SecurityMockMvcRequestPostProcessors.UserRequestPostProcessor student() {
        return SecurityMockMvcRequestPostProcessors.user(STUDENT_ACCOUNT).roles("STUDENT");
    }

    private static SecurityMockMvcRequestPostProcessors.UserRequestPostProcessor otherStudent() {
        return SecurityMockMvcRequestPostProcessors.user(OTHER_ACCOUNT).roles("STUDENT");
    }

    private static SecurityMockMvcRequestPostProcessors.UserRequestPostProcessor teacher() {
        return SecurityMockMvcRequestPostProcessors.user(TEACHER_ACCOUNT).roles("TEACHER");
    }
}
