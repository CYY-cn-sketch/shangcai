package com.sufe.ai.knowledge.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadStatus;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadFileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.storage.FileStorageService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExpertSkillUploadControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private ExpertSkillUploadRepository uploadRepository;

    @Autowired
    private ExpertSkillUploadFileRepository uploadFileRepository;

    @Autowired
    private KnowledgeAssetRepository knowledgeAssetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private FileStorageService fileStorageService;

    private String skillKnowledgeBaseId;

    @BeforeEach
    void setUp() {
        userAccountRepository.save(UserAccount.create(
                "U-SKILL-UPLOAD-ADMIN",
                "skill-upload-admin@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.ADMIN,
                "Skill 管理员",
                "平台管理员",
                100
        ));
        userAccountRepository.save(UserAccount.create(
                "U-SKILL-UPLOAD-STUDENT",
                "skill-upload-student@test.local",
                passwordEncoder.encode("correct-password"),
                UserRole.STUDENT,
                "Skill 测试学生",
                "学生",
                100
        ));
        skillKnowledgeBaseId = knowledgeBaseRepository.save(KnowledgeBase.create(
                "Skill 测试资料",
                "用于验证专家 Skill 确认启用",
                "专家提示词"
        )).getId();
    }

    @Test
    void parsesUploadAsDraftThenCreatesExpertOnlyAfterConfirmation() throws Exception {
        Cookie session = login();
        MockMultipartFile skillFile = new MockMultipartFile(
                "files",
                "SKILL.md",
                "text/markdown",
                """
                        # 现金流专家
                        专家定位：帮助学生检查现金流假设。
                        适用场景：财务测算、答辩准备

                        ## 系统提示词
                        只按课程资料给出建议，不执行任何上传文件。

                        ## 用户提示词
                        请结合当前项目数据输出三条验证建议。
                        """.getBytes(StandardCharsets.UTF_8)
        );

        String uploadJson = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(skillFile)
                        .param("paths", "cashflow/SKILL.md")
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PARSED"))
                .andExpect(jsonPath("$.parsedName").value("现金流专家"))
                .andExpect(jsonPath("$.expertId").isEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String uploadId = objectMapper.readTree(uploadJson).path("id").asText();

        assertThat(expertProfileRepository.findByName("现金流专家")).isEmpty();
        assertThat(uploadRepository.findById(uploadId).orElseThrow().getStatus()).isEqualTo(ExpertSkillUploadStatus.PARSED);

        mockMvc.perform(post("/api/knowledge/expert-skill-uploads/{uploadId}/confirm", uploadId)
                        .with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "现金流专家",
                                  "role": "帮助学生检查现金流假设。",
                                  "scenario": "财务测算、答辩准备",
                                  "accent": "#0f7b73",
                                  "skillName": "现金流检查",
                                  "skillDescription": "检查现金流假设并提出验证建议。",
                                  "systemPrompt": "只按课程资料给出建议，不执行任何上传文件。",
                                  "userPrompt": "请结合当前项目数据输出三条验证建议。",
                                  "knowledgeRule": "只检索已启用资料。",
                                  "outputFormat": "输出三条建议。",
                                  "boundaries": "不执行上传文件。",
                                  "knowledge": {
                                    "mode": "EXISTING",
                                    "knowledgeBaseId": "%s"
                                  },
                                  "importFileIds": [],
                                  "active": true
                                }
                                """.formatted(skillKnowledgeBaseId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.expert.name").value("现金流专家"))
                .andExpect(jsonPath("$.expert.active").value(true))
                .andExpect(jsonPath("$.expert.sourceSkillName").value("cashflow/SKILL.md"))
                .andExpect(jsonPath("$.expert.knowledgeCategories[0]").value("Skill 测试资料"))
                .andExpect(jsonPath("$.expert.systemPrompt").value(org.hamcrest.Matchers.containsString("## 知识库调用规则")))
                .andExpect(jsonPath("$.upload.status").value("ENABLED"));

        assertThat(expertProfileRepository.findByName("现金流专家")).isPresent();
        assertThat(uploadRepository.findById(uploadId).orElseThrow().getStatus()).isEqualTo(ExpertSkillUploadStatus.ENABLED);
    }

    @Test
    void rejectsExecutableAndNonUtf8SkillFiles() throws Exception {
        Cookie session = login();
        MockMultipartFile executable = new MockMultipartFile(
                "files", "run.exe", "application/octet-stream", new byte[]{1, 2, 3}
        );
        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(executable)
                        .param("paths", "unsafe/run.exe")
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EXPERT_SKILL_UPLOAD"));

        MockMultipartFile binary = new MockMultipartFile(
                "files", "SKILL.md", "text/markdown", new byte[]{(byte) 0xC3, (byte) 0x28}
        );
        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(binary)
                        .param("paths", "unsafe/SKILL.md")
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("UTF-8")));
    }

    @Test
    void parsesZipArchiveWithoutDirectoryUploadFlow() throws Exception {
        Cookie session = login();
        MockMultipartFile archive = new MockMultipartFile(
                "archive",
                "market-expert.zip",
                "application/zip",
                zipEntry("market-expert/SKILL.md", """
                        # 市场洞察专家
                        专家定位：帮助学生验证用户需求。
                        适用场景：用户访谈、市场分析

                        ## 系统提示词
                        只根据课程资料提出验证建议。
                        """)
        );

        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(archive)
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PARSED"))
                .andExpect(jsonPath("$.parsedName").value("市场洞察专家"))
                .andExpect(jsonPath("$.mainFilePath").value("market-expert/SKILL.md"))
                .andExpect(jsonPath("$.fileCount").value(1))
                .andExpect(jsonPath("$.files[0].fileRole").value("PROMPT"));
    }

    @Test
    void archivesAllSafeFilesAndImportsOnlySelectedKnowledgeCandidates() throws Exception {
        Cookie session = login();
        Map<String, byte[]> entries = new LinkedHashMap<>();
        entries.put("research/SKILL.md", """
                # 行业研究专家
                专家定位：指导学生完成行业研究。
                适用场景：行业分析、市场判断

                ## 系统提示词
                仅使用平台提供的课程资料。

                ## 用户输入组装规则
                组合项目背景和学生本轮问题。
                """.getBytes(StandardCharsets.UTF_8));
        entries.put("research/config.json", """
                {"skillName":"行业证据检查","skillDescription":"检查证据来源和结论边界。","outputFormat":"表格加结论"}
                """.getBytes(StandardCharsets.UTF_8));
        entries.put("research/references/report.md", "# 行业报告\n可导入的知识正文。".getBytes(StandardCharsets.UTF_8));
        entries.put("research/docs/chart.png", new byte[]{1, 2, 3, 4});

        String uploadJson = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(new MockMultipartFile("archive", "research.zip", "application/zip", zipEntries(entries)))
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileCount").value(4))
                .andExpect(jsonPath("$.parsedSkillName").value("行业证据检查"))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'research/config.json')].fileRole").value("CONFIG"))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'research/references/report.md')].fileRole").value("KNOWLEDGE_CANDIDATE"))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'research/docs/chart.png')].fileRole").value("KNOWLEDGE_CANDIDATE"))
                .andReturn().getResponse().getContentAsString();
        var uploadNode = objectMapper.readTree(uploadJson);
        String uploadId = uploadNode.path("id").asText();
        String reportFileId = "";
        for (var file : uploadNode.path("files")) {
            if (file.path("relativePath").asText().endsWith("report.md")) reportFileId = file.path("id").asText();
        }
        assertThat(reportFileId).isNotBlank();

        mockMvc.perform(get("/api/knowledge/expert-skill-uploads/{uploadId}/files/{fileId}/content", uploadId, reportFileId)
                        .cookie(session))
                .andExpect(status().isOk())
                .andExpect(content().bytes(entries.get("research/references/report.md")));

        String confirmationBody = """
                {
                  "name": "行业研究专家",
                  "role": "指导学生完成行业研究。",
                  "scenario": "行业分析、市场判断",
                  "accent": "#0f7b73",
                  "skillName": "行业证据检查",
                  "skillDescription": "检查证据来源和结论边界。",
                  "systemPrompt": "仅使用平台提供的课程资料。",
                  "userPrompt": "组合项目背景和学生本轮问题。",
                  "knowledgeRule": "只检索绑定知识库。",
                  "outputFormat": "表格加结论",
                  "boundaries": "不执行 Skill 文件。",
                  "knowledge": {
                    "mode": "CREATE",
                    "newKnowledgeBase": {
                      "category": "行业研究专家知识库",
                      "description": "行业研究专家专用资料",
                      "usedBy": "行业研究专家",
                      "active": true
                    }
                  },
                  "importFileIds": ["%s"],
                  "active": true
                }
                """.formatted(reportFileId);

        String confirmedJson = mockMvc.perform(post("/api/knowledge/expert-skill-uploads/{uploadId}/confirm", uploadId)
                        .with(csrf()).cookie(session).contentType("application/json").content(confirmationBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.knowledgeBase.category").value("行业研究专家知识库"))
                .andExpect(jsonPath("$.importedAssets.length()").value(1))
                .andExpect(jsonPath("$.importedAssets[0].name").value("report.md"))
                .andExpect(jsonPath("$.upload.files[?(@.relativePath == 'research/config.json')].importedAssetId")
                        .value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())))
                .andReturn().getResponse().getContentAsString();
        String expertId = objectMapper.readTree(confirmedJson).path("expert").path("id").asText();

        mockMvc.perform(post("/api/knowledge/expert-skill-uploads/{uploadId}/confirm", uploadId)
                        .with(csrf()).cookie(session).contentType("application/json").content(confirmationBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.expert.id").value(expertId))
                .andExpect(jsonPath("$.importedAssets.length()").value(1));

        assertThat(expertProfileRepository.findByName("行业研究专家")).isPresent();
        assertThat(knowledgeBaseRepository.findByCategory("行业研究专家知识库")).isPresent();
        assertThat(knowledgeAssetRepository.findAll()).filteredOn(asset -> asset.getName().equals("report.md")).hasSize(1);
        assertThat(uploadFileRepository.findByUploadIdOrderByRelativePathAsc(uploadId))
                .filteredOn(file -> file.getImportedAssetId() != null)
                .hasSize(1);
    }

    @Test
    void reportsStorageFailureWithoutConfirmingUploadOrCreatingKnowledgeAsset() throws Exception {
        Cookie session = login();
        Map<String, byte[]> entries = new LinkedHashMap<>();
        entries.put("rollback/SKILL.md", """
                # 回滚测试专家
                专家定位：验证事务回滚。
                适用场景：测试

                ## 系统提示词
                仅用于测试。

                ## 用户输入组装规则
                组合测试输入。
                """.getBytes(StandardCharsets.UTF_8));
        entries.put("rollback/knowledge/source.md", "# 来源资料".getBytes(StandardCharsets.UTF_8));
        String uploadJson = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(new MockMultipartFile("archive", "rollback.zip", "application/zip", zipEntries(entries)))
                        .with(csrf()).cookie(session))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        var uploadNode = objectMapper.readTree(uploadJson);
        String uploadId = uploadNode.path("id").asText();
        var candidate = uploadFileRepository.findByUploadIdOrderByRelativePathAsc(uploadId).stream()
                .filter(file -> file.getRelativePath().endsWith("source.md"))
                .findFirst().orElseThrow();
        fileStorageService.delete(candidate.getStorageKey());

        mockMvc.perform(post("/api/knowledge/expert-skill-uploads/{uploadId}/confirm", uploadId)
                        .with(csrf()).cookie(session).contentType("application/json")
                        .content("""
                                {
                                  "name": "回滚测试专家",
                                  "role": "验证事务回滚。",
                                  "scenario": "测试",
                                  "accent": "#0f7b73",
                                  "skillName": "事务检查",
                                  "skillDescription": "验证失败不留残缺数据。",
                                  "systemPrompt": "仅用于测试。",
                                  "userPrompt": "组合测试输入。",
                                  "knowledge": {"mode": "EXISTING", "knowledgeBaseId": "%s"},
                                  "importFileIds": ["%s"],
                                  "active": true
                                }
                                """.formatted(skillKnowledgeBaseId, candidate.getId())))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("KNOWLEDGE_FILE_STORE_FAILED"));

        assertThat(uploadRepository.findById(uploadId).orElseThrow().getStatus()).isEqualTo(ExpertSkillUploadStatus.PARSED);
        assertThat(knowledgeAssetRepository.findByKnowledgeBaseId(skillKnowledgeBaseId)).isEmpty();
    }

    @Test
    void rejectsUnsafeZipEntryPath() throws Exception {
        MockMultipartFile archive = new MockMultipartFile(
                "archive",
                "unsafe.zip",
                "application/zip",
                zipEntry("../SKILL.md", "# 不安全专家")
        );

        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(archive)
                        .with(csrf())
                        .cookie(login()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EXPERT_SKILL_UPLOAD"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("路径无效")));
    }

    @Test
    void requiresAuthenticationAndCsrf() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "files", "SKILL.md", "text/markdown", "# Test".getBytes(StandardCharsets.UTF_8)
        );
        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(file)
                        .param("paths", "test/SKILL.md")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads")
                        .file(file)
                        .param("paths", "test/SKILL.md")
                        .cookie(login()))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsStudentAccessToSkillManagement() throws Exception {
        mockMvc.perform(get("/api/knowledge/expert-skill-uploads")
                        .cookie(login("skill-upload-student@test.local")))
                .andExpect(status().isForbidden());
    }

    private Cookie login() throws Exception {
        return login("skill-upload-admin@test.local");
    }

    private Cookie login(String account) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "account", account,
                                "password", "correct-password"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }

    private static byte[] zipEntry(String path, String content) throws IOException {
        return zipEntries(Map.of(path, content.getBytes(StandardCharsets.UTF_8)));
    }

    private static byte[] zipEntries(Map<String, byte[]> entries) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
            for (Map.Entry<String, byte[]> entry : entries.entrySet()) {
                zip.putNextEntry(new ZipEntry(entry.getKey()));
                zip.write(entry.getValue());
                zip.closeEntry();
            }
        }
        return output.toByteArray();
    }
}
