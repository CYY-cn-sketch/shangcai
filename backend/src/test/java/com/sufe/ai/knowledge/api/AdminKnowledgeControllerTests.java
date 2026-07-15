package com.sufe.ai.knowledge.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminKnowledgeControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private ProjectGroupRepository projectGroupRepository;

    @Autowired
    private GroupMembershipRepository groupMembershipRepository;

    @Autowired
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Autowired
    private KnowledgeAssetRepository knowledgeAssetRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                "U-KNOWLEDGE-ADMIN",
                "knowledge-admin@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.ADMIN,
                "知识库管理员",
                "平台管理员",
                100
        ));
    }

    @Test
    void adminManagesKnowledgeBaseAndAssets() throws Exception {
        Cookie sessionCookie = login("knowledge-admin@test.local");

        String baseJson = mockMvc.perform(post("/api/admin/knowledge-bases")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "category": "行业调研",
                                  "description": "行业报告、访谈摘要和竞品资料",
                                  "usedBy": "项目定位、市场判断"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("行业调研"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String baseId = objectMapper.readTree(baseJson).path("id").asText();

        String assetJson = mockMvc.perform(post("/api/admin/knowledge-assets")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "category": "行业调研",
                                  "name": "访谈摘要.md",
                                  "sizeLabel": "12 KB",
                                  "fileType": "Markdown",
                                  "preview": "目标用户访谈摘要，只作为知识库资料读取。",
                                  "contentText": "# 访谈摘要\\n不能作为程序执行。",
                                  "uploadedBy": "平台管理员",
                                  "enabled": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("行业调研"))
                .andExpect(jsonPath("$.enabled").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String assetId = objectMapper.readTree(assetJson).path("id").asText();

        mockMvc.perform(get("/api/admin/knowledge-bases").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.category == '行业调研')].assetCount").value(1));

        mockMvc.perform(patch("/api/admin/knowledge-assets/{assetId}", assetId)
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "访谈摘要.md",
                                  "sizeLabel": "12 KB",
                                  "fileType": "Markdown",
                                  "preview": "已更新的资料预览。",
                                  "contentText": "# 已更新",
                                  "enabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(delete("/api/admin/knowledge-bases/{baseId}", baseId)
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("KNOWLEDGE_BASE_HAS_ASSETS"));

        mockMvc.perform(delete("/api/admin/knowledge-assets/{assetId}", assetId)
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/admin/knowledge-bases/{baseId}", baseId)
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isNoContent());

        assertThat(knowledgeBaseRepository.findById(baseId)).isEmpty();
        assertThat(knowledgeAssetRepository.findById(assetId)).isEmpty();
    }

    @Test
    void adminStoresExpertSkillAsTextConfigurationOnly() throws Exception {
        Cookie sessionCookie = login("knowledge-admin@test.local");

        String expertJson = mockMvc.perform(post("/api/admin/experts")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "id": "custom-finance",
                                  "name": "财务测算专家",
                                  "role": "辅助学生拆解收入、成本和单元经济性。",
                                  "scenario": "财务测算、商业模式验证",
                                  "accent": "#0f7b73",
                                  "sourceSkillName": "finance/SKILL.md",
                                  "sourceSkillContent": "# 财务测算专家\\n只解析提示词和配置，不执行文件。",
                                  "sourceSkillUploadedBy": "平台管理员",
                                  "systemPrompt": "按课程口径输出。",
                                  "userPrompt": "结合学生输入和知识库资料。",
                                  "active": true,
                                  "skills": [
                                    {
                                      "id": "custom-finance-skill",
                                      "name": "财务假设拆解",
                                      "stage": "商业模式",
                                      "description": "生成收入、成本、毛利和验证任务。"
                                    }
                                  ],
                                  "knowledgeCategories": ["BP 模板", "评分标准"]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceSkillContent").value("# 财务测算专家\n只解析提示词和配置，不执行文件。"))
                .andExpect(jsonPath("$.skills[0].name").value("财务假设拆解"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode expert = objectMapper.readTree(expertJson);
        assertThat(expert.path("id").asText()).isEqualTo("custom-finance");

        mockMvc.perform(get("/api/admin/experts").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'custom-finance')]").exists());

        mockMvc.perform(patch("/api/admin/experts/custom-finance")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "财务测算专家",
                                  "role": "更新后的专家定位。",
                                  "scenario": "财务测算",
                                  "accent": "#0f7b73",
                                  "sourceSkillName": "finance/SKILL.md",
                                  "sourceSkillContent": "# 更新后",
                                  "sourceSkillUploadedBy": "平台管理员",
                                  "systemPrompt": "更新后的系统提示词。",
                                  "userPrompt": "更新后的用户输入规则。",
                                  "active": false,
                                  "skills": [
                                    {
                                      "id": "custom-finance-skill",
                                      "name": "财务假设拆解",
                                      "stage": "商业模式",
                                      "description": "更新后的说明。"
                                    }
                                  ],
                                  "knowledgeCategories": ["BP 模板"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.knowledgeCategories[0]").value("BP 模板"));

        mockMvc.perform(delete("/api/admin/experts/custom-finance")
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isNoContent());

        assertThat(expertProfileRepository.findById("custom-finance")).isEmpty();
    }

    @Test
    void studentReadsRedactedKnowledgeButCannotMutateIt() throws Exception {
        KnowledgeBase base = knowledgeBaseRepository.save(KnowledgeBase.create(
                "Student visible base",
                "Metadata is visible to authenticated users",
                "Course generation"
        ));
        KnowledgeAsset asset = KnowledgeAsset.create(
                base.getId(),
                "000-student-visible.md",
                "1 KB",
                "Markdown",
                "Safe preview",
                "private knowledge content",
                "Knowledge administrator"
        );
        knowledgeAssetRepository.save(asset);
        ExpertProfile expert = ExpertProfile.create(
                "student-visible-expert",
                "Student visible expert",
                "Safe role description",
                "Course scenario",
                "#0f7b73"
        );
        expert.update(
                expert.getName(),
                expert.getRoleDescription(),
                expert.getScenario(),
                expert.getAccent(),
                "expert/SKILL.md",
                "private skill content",
                "Knowledge administrator",
                "private system prompt",
                "private user prompt",
                true
        );
        expertProfileRepository.save(expert);

        ProjectGroup group = projectGroupRepository.save(ProjectGroup.create("G-KNOWLEDGE-STUDENT", "测试组", "测试项目"));
        UserAccount student = userAccountRepository.save(UserAccount.create(
                "U-KNOWLEDGE-STUDENT",
                "knowledge-student@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.STUDENT,
                "测试学生",
                "创业实践课学生",
                50
        ));
        groupMembershipRepository.save(GroupMembership.create("M-KNOWLEDGE-STUDENT", student.getId(), group.getId()));
        Cookie sessionCookie = login("knowledge-student@test.local");

        mockMvc.perform(get("/api/admin/knowledge-bases").cookie(sessionCookie))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/knowledge/knowledge-bases").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].category").value("Student visible base"));

        mockMvc.perform(get("/api/knowledge/knowledge-assets").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].preview").value("Safe preview"))
                .andExpect(jsonPath("$[0].contentText").value(nullValue()));

        mockMvc.perform(get("/api/knowledge/experts").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("student-visible-expert"))
                .andExpect(jsonPath("$[0].sourceSkillContent").value(nullValue()))
                .andExpect(jsonPath("$[0].sourceSkillUploadedBy").value(nullValue()))
                .andExpect(jsonPath("$[0].systemPrompt").value(nullValue()))
                .andExpect(jsonPath("$[0].userPrompt").value(nullValue()));

        mockMvc.perform(post("/api/knowledge/knowledge-assets")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void teacherManagesKnowledgeAssetsExpertsAndCatalog() throws Exception {
        userAccountRepository.save(UserAccount.create(
                "U-KNOWLEDGE-TEACHER",
                "knowledge-teacher@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.TEACHER,
                "Knowledge teacher",
                "Course teacher",
                100
        ));
        knowledgeBaseRepository.save(KnowledgeBase.create(
                "Teacher managed base",
                "Created by administrator",
                "Course generation"
        ));
        Cookie sessionCookie = login("knowledge-teacher@test.local");

        mockMvc.perform(post("/api/knowledge/knowledge-assets")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "category": "Teacher managed base",
                                  "name": "teacher-resource.md",
                                  "sizeLabel": "1 KB",
                                  "fileType": "Markdown",
                                  "preview": "Teacher resource preview",
                                  "contentText": "Teacher resource content",
                                  "uploadedBy": "Knowledge teacher",
                                  "enabled": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentText").value("Teacher resource content"));

        mockMvc.perform(post("/api/knowledge/experts")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "id": "teacher-created-expert",
                                  "name": "Teacher created expert",
                                  "role": "Support course work",
                                  "scenario": "Course scenario",
                                  "accent": "#0f7b73",
                                  "systemPrompt": "Teacher system prompt",
                                  "userPrompt": "Teacher user prompt",
                                  "active": true,
                                  "skills": [
                                    {
                                      "id": "teacher-created-skill",
                                      "name": "Teacher skill",
                                      "stage": "Course stage",
                                      "description": "Teacher skill description"
                                    }
                                  ],
                                  "knowledgeCategories": ["Teacher managed base"]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.systemPrompt").value("Teacher system prompt"));

        mockMvc.perform(post("/api/knowledge/knowledge-bases")
                        .with(csrf())
                        .cookie(sessionCookie)
                        .contentType("application/json")
                        .content("""
                                {
                                  "category": "Teacher created base",
                                  "description": "Teachers can manage course knowledge structure",
                                  "usedBy": "Course generation"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("Teacher created base"));
    }

    private Cookie login(String account) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"" + account + "\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
