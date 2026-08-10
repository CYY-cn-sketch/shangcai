package com.sufe.ai.workspace.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.artifact.domain.ArtifactRecord;
import com.sufe.ai.artifact.repository.ArtifactRecordRepository;
import com.sufe.ai.workspace.domain.StudentIdea;
import com.sufe.ai.workspace.repository.StudentAttachmentRepository;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudentWorkspaceControllerTests {

    private static final String STUDENT_ACCOUNT = "workspace-student@test.local";
    private static final String STUDENT_ID = "U-WORKSPACE-STUDENT";
    private static final String OTHER_ACCOUNT = "workspace-other@test.local";
    private static final String OTHER_ID = "U-WORKSPACE-OTHER";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private StudentIdeaRepository ideaRepository;

    @Autowired
    private StudentAttachmentRepository attachmentRepository;

    @Autowired
    private ArtifactRecordRepository artifactRepository;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                STUDENT_ID,
                STUDENT_ACCOUNT,
                "unused-password-hash",
                UserRole.STUDENT,
                "工作台学生",
                "创业实践课学生",
                100
        ));
        userAccountRepository.save(UserAccount.create(
                OTHER_ID,
                OTHER_ACCOUNT,
                "unused-password-hash",
                UserRole.STUDENT,
                "其他学生",
                "创业实践课学生",
                100
        ));
    }

    @Test
    @WithMockUser(username = STUDENT_ACCOUNT, roles = "STUDENT")
    void persistsIdeaConversationAndIdempotentMessages() throws Exception {
        String ideaBody = mockMvc.perform(post("/api/student/ideas")
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "title": "校园创业助手",
                                  "description": "帮助学生验证校园创业想法",
                                  "stage": "新建创意"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("校园创业助手"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String ideaId = objectMapper.readTree(ideaBody).get("id").asText();

        mockMvc.perform(put("/api/student/ideas/{ideaId}/conversation", ideaId)
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "selectedExpertId": "pitch",
                                  "selectedSkillId": "deck",
                                  "modelMode": "深度分析",
                                  "knowledgeSelection": {
                                    "categories": ["课程理论"],
                                    "uploadIds": ["asset-001"]
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelMode").value("深度分析"))
                .andExpect(jsonPath("$.knowledgeSelection.categories[0]").value("课程理论"));

        String firstMessage = mockMvc.perform(post("/api/student/ideas/{ideaId}/messages", ideaId)
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "clientMessageId": "client-message-001",
                                  "sender": "USER",
                                  "inputMode": "文本",
                                  "content": "请帮助我完善用户痛点。"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sender").value("USER"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String secondMessage = mockMvc.perform(post("/api/student/ideas/{ideaId}/messages", ideaId)
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "clientMessageId": "client-message-001",
                                  "sender": "USER",
                                  "inputMode": "文本",
                                  "content": "重复请求不会创建第二条消息。"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(objectMapper.readTree(secondMessage).get("id").asText())
                .isEqualTo(objectMapper.readTree(firstMessage).get("id").asText());

        mockMvc.perform(get("/api/student/workspace"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ideas[0].id").value(ideaId))
                .andExpect(jsonPath("$.conversations[0].ideaId").value(ideaId))
                .andExpect(jsonPath("$.conversations[0].messages.length()").value(1))
                .andExpect(jsonPath("$.conversations[0].messages[0].content").value("请帮助我完善用户痛点。"));

        mockMvc.perform(patch("/api/student/ideas/{ideaId}", ideaId)
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"title\":\"校园创业验证助手\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("校园创业验证助手"));

        mockMvc.perform(delete("/api/student/ideas/{ideaId}", ideaId).with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/student/workspace"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ideas").isEmpty())
                .andExpect(jsonPath("$.conversations").isEmpty());
    }

    @Test
    @WithMockUser(username = STUDENT_ACCOUNT, roles = "STUDENT")
    void supportsMultipleConversationsWithinOneIdeaAndKeepsMessagesIsolated() throws Exception {
        StudentIdea idea = ideaRepository.save(StudentIdea.create(
                STUDENT_ID,
                "多会话项目",
                "同一项目按专家保存独立会话",
                "头脑风暴"
        ));

        String brainstormBody = mockMvc.perform(post("/api/student/ideas/{ideaId}/conversations", idea.getId())
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "title": "头脑风暴会话",
                                  "selectedExpertId": "brainstorm",
                                  "selectedSkillId": "brainstorm",
                                  "modelMode": "Auto",
                                  "knowledgeSelection": {"categories": [], "uploadIds": []}
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("头脑风暴会话"))
                .andReturn().getResponse().getContentAsString();
        String brainstormId = objectMapper.readTree(brainstormBody).path("id").asText();

        String positioningBody = mockMvc.perform(post("/api/student/ideas/{ideaId}/conversations", idea.getId())
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "title": "项目定位会话",
                                  "selectedExpertId": "positioning",
                                  "selectedSkillId": "positioning",
                                  "modelMode": "深度分析",
                                  "knowledgeSelection": {"categories": ["创业方法"], "uploadIds": []}
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String positioningId = objectMapper.readTree(positioningBody).path("id").asText();

        mockMvc.perform(post("/api/student/conversations/{conversationId}/messages", brainstormId)
                        .with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "clientMessageId": "brainstorm-message-001",
                                  "sender": "USER",
                                  "expertId": "brainstorm",
                                  "content": "请发散三个候选方向。"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.conversationId").value(brainstormId));

        mockMvc.perform(patch("/api/student/conversations/{conversationId}", positioningId)
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"title\":\"已确认方向的定位会话\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("已确认方向的定位会话"));

        mockMvc.perform(get("/api/student/workspace"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conversations.length()").value(2))
                .andExpect(jsonPath("$.conversations[?(@.id == '%s')].messages.length()".formatted(brainstormId)).value(1))
                .andExpect(jsonPath("$.conversations[?(@.id == '%s')].messages.length()".formatted(positioningId)).value(0));
    }

    @Test
    @WithMockUser(username = STUDENT_ACCOUNT, roles = "STUDENT")
    void confirmsStructuredBrainstormHandoffOnlyOnce() throws Exception {
        StudentIdea idea = ideaRepository.save(StudentIdea.create(
                STUDENT_ID,
                "交接项目",
                "验证一次确认一次交接",
                "头脑风暴"
        ));
        ArtifactRecord artifact = artifactRepository.save(ArtifactRecord.create(
                STUDENT_ID,
                idea.getId(),
                "handoff-source-message",
                "BRAINSTORM",
                "头脑风暴阶段成果",
                "形成两个候选方向",
                """
                        {
                          "kind": "EXPERT_STAGE_RESULT",
                          "schemaVersion": 1,
                          "blocks": [],
                          "handoff": {
                            "kind": "BRAINSTORM_TO_POSITIONING",
                            "schemaVersion": 1,
                            "sourceExpertId": "brainstorm",
                            "targetExpertId": "positioning",
                            "sourceMessageId": "handoff-source-message",
                            "ideaId": "%s",
                            "projectTitle": "交接项目",
                            "projectDescription": "验证一次确认一次交接",
                            "sourceSummary": "形成两个候选方向",
                            "ideaDirections": ["方向 A", "方向 B"],
                            "userAndProblemSignals": ["教师反馈周期长"],
                            "validationTasks": ["访谈 8 名学生"],
                            "reviewStatus": "PENDING_STUDENT_CONFIRMATION",
                            "createdAt": "2026-08-03T09:00:00Z"
                          }
                        }
                        """.formatted(idea.getId())
        ));

        String first = mockMvc.perform(post("/api/student/artifacts/{artifactId}/handoffs", artifact.getId())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"targetExpertId\":\"positioning\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.payload.ideaDirections[0]").value("方向 A"))
                .andReturn().getResponse().getContentAsString();

        String second = mockMvc.perform(post("/api/student/artifacts/{artifactId}/handoffs", artifact.getId())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"targetExpertId\":\"positioning\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(second).path("id").asText())
                .isEqualTo(objectMapper.readTree(first).path("id").asText());

        artifact.refresh(
                "BRAINSTORM",
                "头脑风暴阶段成果（已更新）",
                "确认方向 C",
                """
                        {
                          "kind": "EXPERT_STAGE_RESULT",
                          "schemaVersion": 1,
                          "blocks": [],
                          "handoff": {
                            "kind": "BRAINSTORM_TO_POSITIONING",
                            "schemaVersion": 1,
                            "sourceExpertId": "brainstorm",
                            "targetExpertId": "positioning",
                            "sourceMessageId": "handoff-source-message",
                            "ideaId": "%s",
                            "projectTitle": "交接项目",
                            "projectDescription": "验证一次确认一次交接",
                            "sourceSummary": "确认方向 C",
                            "ideaDirections": ["方向 C"],
                            "userAndProblemSignals": ["教师反馈周期长"],
                            "validationTasks": ["访谈 8 名学生"],
                            "reviewStatus": "PENDING_STUDENT_CONFIRMATION",
                            "createdAt": "2026-08-03T10:00:00Z"
                          }
                        }
                        """.formatted(idea.getId())
        );
        artifactRepository.saveAndFlush(artifact);

        String refreshed = mockMvc.perform(post("/api/student/artifacts/{artifactId}/handoffs", artifact.getId())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"targetExpertId\":\"positioning\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payload.ideaDirections[0]").value("方向 C"))
                .andReturn().getResponse().getContentAsString();
        assertThat(objectMapper.readTree(refreshed).path("id").asText())
                .isEqualTo(objectMapper.readTree(first).path("id").asText());

        mockMvc.perform(get("/api/student/handoffs")
                        .param("ideaId", idea.getId())
                        .param("targetExpertId", "positioning"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockUser(username = STUDENT_ACCOUNT, roles = "STUDENT")
    void confirmsBpArtifactForAllExpertsAsSharedStageContext() throws Exception {
        StudentIdea idea = ideaRepository.save(StudentIdea.create(
                STUDENT_ID,
                "共享阶段成果项目",
                "验证确认后的 BP 可供同一创意下其他专家读取",
                "商业计划书"
        ));
        ArtifactRecord artifact = artifactRepository.save(ArtifactRecord.create(
                STUDENT_ID,
                idea.getId(),
                "shared-bp-message",
                "BP",
                "商业计划书正式版",
                "已确认客户、价值主张和收入结构",
                """
                        {
                          "kind": "EXPERT_STAGE_RESULT",
                          "schemaVersion": 1,
                          "blocks": [
                            {
                              "title": "商业模式",
                              "items": ["客户为商学院课程组", "收入来自年度平台订阅"]
                            }
                          ]
                        }
                        """
        ));

        mockMvc.perform(post("/api/student/artifacts/{artifactId}/handoffs", artifact.getId())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"targetExpertId\":\"ALL\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceExpertId").value("business"))
                .andExpect(jsonPath("$.targetExpertId").value("ALL"))
                .andExpect(jsonPath("$.payload.kind").value("CONFIRMED_STAGE_ARTIFACT"))
                .andExpect(jsonPath("$.payload.artifactType").value("BP"))
                .andExpect(jsonPath("$.payload.title").value("商业计划书正式版"))
                .andExpect(jsonPath("$.payload.content.blocks[0].title").value("商业模式"));

        mockMvc.perform(get("/api/student/handoffs")
                        .param("ideaId", idea.getId())
                        .param("targetExpertId", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockUser(username = STUDENT_ACCOUNT, roles = "STUDENT")
    void uploadsExtractsAndIsolatesStudentAttachment() throws Exception {
        StudentIdea idea = ideaRepository.save(StudentIdea.create(
                STUDENT_ID,
                "附件识别项目",
                "验证学生文件正文解析",
                "新建创意"
        ));
        byte[] body = "访谈证据：学生每周至少遇到三次排队。".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "interview.md", "text/markdown", body);

        String response = mockMvc.perform(multipart("/api/student/ideas/{ideaId}/attachments", idea.getId())
                        .file(file)
                        .param("clientMessageId", "message-with-file-001")
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalName").value("interview.md"))
                .andExpect(jsonPath("$.extractionStatus").value("READY"))
                .andExpect(jsonPath("$.readable").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String attachmentId = objectMapper.readTree(response).path("id").asText();

        assertThat(attachmentRepository.findById(attachmentId)).hasValueSatisfying(attachment ->
                assertThat(attachment.getContentText()).contains("每周至少遇到三次排队"));

        mockMvc.perform(get("/api/student/attachments/{attachmentId}/file", attachmentId))
                .andExpect(status().isOk())
                .andExpect(content().bytes(body));

        mockMvc.perform(get("/api/student/attachments/{attachmentId}/file", attachmentId)
                        .with(user(OTHER_ACCOUNT).roles("STUDENT")))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = STUDENT_ACCOUNT, roles = "STUDENT")
    void hidesIdeasOwnedByAnotherStudent() throws Exception {
        StudentIdea otherIdea = ideaRepository.save(StudentIdea.create(
                OTHER_ID,
                "其他学生的创意",
                "不可跨账号读取或修改",
                "新建创意"
        ));

        mockMvc.perform(patch("/api/student/ideas/{ideaId}", otherIdea.getId())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"title\":\"越权修改\"}"))
                .andExpect(status().isNotFound());

        String workspaceBody = mockMvc.perform(get("/api/student/workspace"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode workspace = objectMapper.readTree(workspaceBody);
        assertThat(workspace.get("ideas")).isEmpty();
    }

    @Test
    @WithMockUser(username = "teacher@test.local", roles = "TEACHER")
    void rejectsTeacherAccessToStudentWorkspace() throws Exception {
        mockMvc.perform(get("/api/student/workspace"))
                .andExpect(status().isForbidden());
    }

    @Test
    void requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/student/workspace"))
                .andExpect(status().isUnauthorized());
    }
}
