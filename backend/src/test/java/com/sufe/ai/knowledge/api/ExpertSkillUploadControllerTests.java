package com.sufe.ai.knowledge.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadStatus;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.ExpertKnowledgeRoute;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.domain.KnowledgeBaseScope;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
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
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
    private ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository;

    @Autowired
    private ExpertSkillRepository expertSkillRepository;

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
                                    "mode": "CREATE",
                                    "newKnowledgeBase": {
                                      "category": "现金流专家专属知识库",
                                      "description": "现金流专家 Skill 专属资料",
                                      "usedBy": "现金流专家",
                                      "active": true
                                    }
                                  },
                                  "importFileIds": [],
                                  "active": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.expert.name").value("现金流专家"))
                .andExpect(jsonPath("$.expert.active").value(true))
                .andExpect(jsonPath("$.expert.sourceSkillName").value("cashflow/SKILL.md"))
                .andExpect(jsonPath("$.knowledgeBase.category").value("现金流专家专属知识库"))
                .andExpect(jsonPath("$.knowledgeBase.scopeType").value("EXPERT_PRIVATE"))
                .andExpect(jsonPath("$.expert.systemPrompt").value(org.hamcrest.Matchers.containsString("## 知识库调用规则")))
                .andExpect(jsonPath("$.upload.status").value("ENABLED"));

        assertThat(expertProfileRepository.findByName("现金流专家")).isPresent();
        assertThat(uploadRepository.findById(uploadId).orElseThrow().getStatus()).isEqualTo(ExpertSkillUploadStatus.ENABLED);
        ExpertProfile expert = expertProfileRepository.findByName("现金流专家").orElseThrow();
        assertThat(knowledgeBaseRepository.findByOwnerExpertIdAndScopeType(expert.getId(), KnowledgeBaseScope.EXPERT_PRIVATE))
                .isPresent();

        mockMvc.perform(get("/api/knowledge/expert-skill-uploads/experts/{expertId}/files", expert.getId())
                        .cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceType").value("UPLOADED"))
                .andExpect(jsonPath("$.folderName").value("cashflow"))
                .andExpect(jsonPath("$.files.length()").value(1))
                .andExpect(jsonPath("$.files[0].relativePath").value("cashflow/SKILL.md"))
                .andExpect(jsonPath("$.files[0].fileRole").value("PROMPT"))
                .andExpect(jsonPath("$.files[0].contentText").value(org.hamcrest.Matchers.containsString("现金流专家")))
                .andExpect(jsonPath("$.files[0].contentTruncated").value(false))
                .andExpect(jsonPath("$.files[0].downloadUrl").isNotEmpty());
    }

    @Test
    void listsBuiltInExpertSkillFilesWithReadableContent() throws Exception {
        String sourcePath = "starter-content/experts/defense-expert/SKILL.md";
        String sourceContent = new String(readClasspath(sourcePath), StandardCharsets.UTF_8);
        ExpertProfile expert = ExpertProfile.create(
                "defense",
                "AI 评委/答辩陪练专家",
                "训练学生用证据回答并复盘。",
                "模拟答辩",
                "#8d6814"
        );
        expert.update(
                expert.getName(),
                expert.getRoleDescription(),
                expert.getScenario(),
                expert.getAccent(),
                sourcePath,
                sourceContent,
                "system",
                "只按证据提问。",
                "组合本轮答辩输入。",
                true
        );
        expertProfileRepository.saveAndFlush(expert);

        mockMvc.perform(get("/api/knowledge/expert-skill-uploads/experts/defense/files")
                        .cookie(login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceType").value("STARTER"))
                .andExpect(jsonPath("$.folderName").value("defense-expert"))
                .andExpect(jsonPath("$.files.length()").value(2))
                .andExpect(jsonPath("$.files[0].relativePath").value("starter-content/experts/defense-expert/SKILL.md"))
                .andExpect(jsonPath("$.files[0].fileRole").value("PROMPT"))
                .andExpect(jsonPath("$.files[0].contentText").value(org.hamcrest.Matchers.containsString("系统提示词")))
                .andExpect(jsonPath("$.files[1].relativePath").value(org.hamcrest.Matchers.containsString("真实使用样例.md")))
                .andExpect(jsonPath("$.files[1].fileRole").value("REFERENCE"))
                .andExpect(jsonPath("$.files[1].contentText").isNotEmpty());
    }

    @Test
    void confirmationRejectsCourseSharedKnowledgeBaseAsSkillDestination() throws Exception {
        ExpertProfile expert = expertProfileRepository.saveAndFlush(ExpertProfile.create(
                "shared-base-rejection-expert",
                "共享库隔离测试专家",
                "验证 Skill 资料不能导入课程共享库。",
                "知识库隔离测试",
                "#0f7b73"
        ));
        String uploadJson = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(new MockMultipartFile("archive", "shared-rejection.zip", "application/zip", zipEntry(
                                "SKILL.md",
                                "# 共享库隔离测试专家\n\n## 系统提示词\n只用于隔离测试。"
                        )))
                        .with(csrf())
                        .cookie(login()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String uploadId = objectMapper.readTree(uploadJson).path("id").asText();

        mockMvc.perform(post("/api/knowledge/expert-skill-uploads/{uploadId}/confirm", uploadId)
                        .with(csrf())
                        .cookie(login())
                        .contentType("application/json")
                        .content("""
                                {
                                  "targetExpertId": "%s",
                                  "name": "共享库隔离测试专家",
                                  "role": "验证 Skill 资料不能导入课程共享库。",
                                  "scenario": "知识库隔离测试",
                                  "accent": "#0f7b73",
                                  "skillName": "隔离测试",
                                  "skillDescription": "验证专属知识库边界。",
                                  "systemPrompt": "只用于隔离测试。",
                                  "userPrompt": "组合本轮输入。",
                                  "knowledge": {"mode": "EXISTING", "knowledgeBaseId": "%s"},
                                  "importFileIds": [],
                                  "active": true
                                }
                                """.formatted(expert.getId(), skillKnowledgeBaseId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EXPERT_PRIVATE_KNOWLEDGE_REQUIRED"));

        assertThat(uploadRepository.findById(uploadId).orElseThrow().getStatus())
                .isEqualTo(ExpertSkillUploadStatus.PARSED);
    }

    @Test
    void confirmationTreatsWhitespaceOnlyNameDifferencesAsTheSameExpert() throws Exception {
        expertProfileRepository.saveAndFlush(ExpertProfile.create(
                "normalized-name-owner",
                "商业模式/BP 专家",
                "已有专家",
                "名称归一化测试",
                "#22406a"
        ));
        Cookie session = login();
        String uploadJson = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(new MockMultipartFile("archive", "duplicate-name.zip", "application/zip", zipEntry(
                                "SKILL.md",
                                "# 商业模式 BP 专家\n\n## 系统提示词\n仅用于名称归一化测试。"
                        )))
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String uploadId = objectMapper.readTree(uploadJson).path("id").asText();

        mockMvc.perform(post("/api/knowledge/expert-skill-uploads/{uploadId}/confirm", uploadId)
                        .with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": " 商业模式 / BP   专家 ",
                                  "role": "测试近似重名拦截。",
                                  "scenario": "名称归一化测试",
                                  "accent": "#22406a",
                                  "skillName": "名称归一化",
                                  "skillDescription": "验证忽略空格。",
                                  "systemPrompt": "仅用于名称归一化测试。",
                                  "userPrompt": "组合本轮输入。",
                                  "knowledge": {"mode": "NONE"},
                                  "importFileIds": [],
                                  "active": false
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EXPERT_EXISTS"));
    }

    @Test
    void parsesEveryBuiltInExpertSkillPackageWithKnowledgeCandidates() throws Exception {
        Cookie session = login();
        Map<String, String[]> packages = new LinkedHashMap<>();
        packages.put("brainstorm-expert", new String[]{"创意头脑风暴专家", "创意头脑风暴方法与创意方向卡.md"});
        packages.put("positioning-expert", new String[]{"项目定位专家", "项目定位与价值主张工作表.md"});
        packages.put("market-expert", new String[]{"市场与竞品专家", "市场与竞品分析框架.md"});
        packages.put("business-expert", new String[]{"商业模式/BP 专家", "商业模式与BP撰写框架.md"});
        packages.put("pitch-expert", new String[]{"路演 PPT 专家", "路演PPT结构模板.md"});
        packages.put("script-expert", new String[]{"路演稿生成专家", "路演稿结构与时间控制.md"});
        packages.put("defense-expert", new String[]{"AI 评委/答辩陪练专家", "答辩题库与回答框架.md"});
        packages.put("media-expert", new String[]{"多媒体物料专家", "多媒体物料脚本与分镜模板.md"});

        for (var entry : packages.entrySet()) {
            String packageName = entry.getKey();
            String expectedExpertName = entry.getValue()[0];
            String referenceName = entry.getValue()[1];
            Map<String, byte[]> files = new LinkedHashMap<>();
            files.put("SKILL.md", readClasspath("starter-content/experts/" + packageName + "/SKILL.md"));
            files.put("references/" + referenceName, readClasspath("starter-content/knowledge/" + referenceName));
            files.put("examples/真实使用样例.md", readClasspath("starter-content/experts/" + packageName + "/examples/真实使用样例.md"));

            mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                            .file(new MockMultipartFile("archive", packageName + ".zip", "application/zip", zipEntries(files)))
                            .with(csrf())
                            .cookie(session))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value("PARSED"))
                    .andExpect(jsonPath("$.parsedName").value(expectedExpertName))
                    .andExpect(jsonPath("$.files.length()").value(3))
                    .andExpect(jsonPath("$.files[?(@.relativePath == 'references/" + referenceName + "')].fileRole")
                            .value("KNOWLEDGE_CANDIDATE"))
                    .andExpect(jsonPath("$.files[?(@.relativePath == 'examples/真实使用样例.md')].fileRole")
                            .value("REFERENCE"));
        }
    }

    @Test
    void acceptsWindowsGbkEncodedChineseZipEntryNames() throws Exception {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        entries.put("中文专家/SKILL.md", """
                # 中文路径专家

                专家定位：验证 Windows 中文 ZIP 文件名能够安全解析。
                适用场景：Skill 文件夹上传
                """.getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(new MockMultipartFile(
                                "archive", "中文专家.zip", "application/zip",
                                zipEntries(entries, Charset.forName("GBK"))
                        ))
                        .with(csrf())
                        .cookie(login()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.folderName").value("中文专家"))
                .andExpect(jsonPath("$.parsedName").value("中文路径专家"))
                .andExpect(jsonPath("$.files[0].relativePath").value("中文专家/SKILL.md"));
    }

    @Test
    void rejectsUnsupportedBinaryAndNonUtf8SkillFiles() throws Exception {
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
    void archivesSourceCodeWithoutExecutingItAndParsesSafeYamlMetadata() throws Exception {
        Cookie session = login();
        Map<String, byte[]> entries = new LinkedHashMap<>();
        entries.put("SKILL.md", """
                ---
                name: creative-brainstorming-expert
                description: 面向学生的创意发散专家。
                ---

                # 创意头脑风暴专家

                只根据学生已经提供的事实发散候选方向。
                """.getBytes(StandardCharsets.UTF_8));
        entries.put("agents/openai.yaml", """
                interface:
                  display_name: 创意头脑风暴专家
                  short_description: 把模糊主题转化为可验证的候选创意。
                  default_prompt: 请组合当前输入、历史上下文和已确认事实。
                """.getBytes(StandardCharsets.UTF_8));
        entries.put("scripts/generate_outline_docx.py", "print('source only')".getBytes(StandardCharsets.UTF_8));
        entries.put("assets/business-model-canvas.html", "<section>平台原生画布结构参考</section>".getBytes(StandardCharsets.UTF_8));
        entries.put("assets/business-model-canvas.svg", "<svg><title>画布版式参考</title></svg>".getBytes(StandardCharsets.UTF_8));
        entries.put("references/brainstorming-methods.md", "# 创意发散方法".getBytes(StandardCharsets.UTF_8));

        String response = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(new MockMultipartFile(
                                "archive", "creative-brainstorming-expert.zip", "application/zip", zipEntries(entries)
                        ))
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.folderName").value("creative-brainstorming-expert"))
                .andExpect(jsonPath("$.parsedName").value("创意头脑风暴专家"))
                .andExpect(jsonPath("$.parsedRole").value("把模糊主题转化为可验证的候选创意。"))
                .andExpect(jsonPath("$.parsedUserPrompt").value("请组合当前输入、历史上下文和已确认事实。"))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'scripts/generate_outline_docx.py')].fileRole")
                        .value("SOURCE_CODE"))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'scripts/generate_outline_docx.py')].contentPreview")
                        .value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'assets/business-model-canvas.html')].fileRole")
                        .value("REFERENCE"))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'assets/business-model-canvas.html')].contentPreview")
                        .value(org.hamcrest.Matchers.contains("<section>平台原生画布结构参考</section>")))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'assets/business-model-canvas.svg')].fileRole")
                        .value("REFERENCE"))
                .andExpect(jsonPath("$.files[?(@.relativePath == 'references/brainstorming-methods.md')].fileRole")
                        .value("KNOWLEDGE_CANDIDATE"))
                .andReturn().getResponse().getContentAsString();

        String uploadId = objectMapper.readTree(response).path("id").asText();
        assertThat(uploadFileRepository.findByUploadIdOrderByRelativePathAsc(uploadId))
                .filteredOn(file -> file.getFileRole().name().equals("SOURCE_CODE"))
                .singleElement()
                .satisfies(file -> assertThat(file.getContentText()).isNull());
    }

    @Test
    void confirmationCanUpdateExistingExpertWithoutCreatingDuplicate() throws Exception {
        ExpertProfile existing = ExpertProfile.create(
                "brainstorm",
                "创意头脑风暴专家",
                "原有创意专家定位",
                "原有创意场景",
                "#0f7b73"
        );
        existing.update(
                existing.getName(),
                existing.getRoleDescription(),
                existing.getScenario(),
                existing.getAccent(),
                "starter-content/brainstorm/SKILL.md",
                "原有来源内容",
                "平台内置内容",
                "原有系统提示词",
                "原有用户提示词",
                true
        );
        expertProfileRepository.saveAndFlush(existing);
        KnowledgeBase brainstormPrivateBase = knowledgeBaseRepository.saveAndFlush(KnowledgeBase.createExpertPrivate(
                "创意头脑风暴专家专属知识库",
                "创意头脑风暴专家 Skill 专属资料",
                "创意头脑风暴专家",
                "brainstorm"
        ));
        KnowledgeAsset previousSkillAsset = KnowledgeAsset.create(
                brainstormPrivateBase.getId(),
                "旧 Skill 资料.md",
                "1 KB",
                "Markdown",
                "旧 Skill 导入资料",
                "旧内容",
                "previous@test.local"
        );
        previousSkillAsset.markSkillImport();
        knowledgeAssetRepository.saveAndFlush(previousSkillAsset);
        KnowledgeAsset directSupplement = KnowledgeAsset.create(
                brainstormPrivateBase.getId(),
                "教师补充资料.md",
                "1 KB",
                "Markdown",
                "教师在专家详情中补充",
                "补充内容",
                "teacher@test.local"
        );
        directSupplement.markExpertDirectUpload();
        knowledgeAssetRepository.saveAndFlush(directSupplement);
        expertKnowledgeRouteRepository.saveAndFlush(ExpertKnowledgeRoute.create("brainstorm", "Skill 测试资料"));
        expertKnowledgeRouteRepository.saveAndFlush(ExpertKnowledgeRoute.create("brainstorm", brainstormPrivateBase.getCategory()));
        Cookie session = login();
        String uploadJson = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(new MockMultipartFile("archive", "brainstorm-update.zip", "application/zip", zipEntry("SKILL.md", """
                                # 创意头脑风暴专家

                                ## 系统提示词
                                只根据学生确认的信息生成候选创意。

                                ## 用户输入组装规则
                                组合当前输入、历史成果和教师反馈。
                                """)))
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String uploadId = objectMapper.readTree(uploadJson).path("id").asText();
        String brainstormPrivateBaseId = knowledgeBaseRepository
                .findByOwnerExpertIdAndScopeType("brainstorm", KnowledgeBaseScope.EXPERT_PRIVATE)
                .orElseThrow()
                .getId();

        mockMvc.perform(post("/api/knowledge/expert-skill-uploads/{uploadId}/confirm", uploadId)
                        .with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content("""
                                {
                                  "targetExpertId": "brainstorm",
                                  "name": "创意头脑风暴专家",
                                  "role": "把模糊主题转化为可验证创业方向。",
                                  "scenario": "创意发散、候选比较和验证任务",
                                  "accent": "#0f7b73",
                                  "skillName": "创意发散与验证",
                                  "skillDescription": "生成候选创意、验证任务和交接卡。",
                                  "systemPrompt": "只根据学生确认的信息生成候选创意。",
                                  "userPrompt": "组合当前输入、历史成果和教师反馈。",
                                  "knowledge": {"mode": "EXISTING", "knowledgeBaseId": "%s"},
                                  "importFileIds": [],
                                  "active": true
                                }
                                """.formatted(brainstormPrivateBaseId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.expert.id").value("brainstorm"))
                .andExpect(jsonPath("$.expert.systemPrompt").value(org.hamcrest.Matchers.containsString("## 平台运行约束")))
                .andExpect(jsonPath("$.upload.expertId").value("brainstorm"));

        assertThat(expertProfileRepository.findAll())
                .filteredOn(expert -> expert.getName().equals("创意头脑风暴专家"))
                .singleElement()
                .satisfies(expert -> assertThat(expert.getId()).isEqualTo("brainstorm"));
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("brainstorm"))
                .anySatisfy(skill -> assertThat(skill.getStage()).isEqualTo("已确认上传"));
        assertThat(expertKnowledgeRouteRepository.findByExpertId("brainstorm"))
                .extracting(ExpertKnowledgeRoute::getCategory)
                .contains("Skill 测试资料", "创意头脑风暴专家专属知识库");
        assertThat(knowledgeAssetRepository.findByKnowledgeBaseId(brainstormPrivateBase.getId()))
                .extracting(KnowledgeAsset::getName)
                .containsExactly("教师补充资料.md");
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
    void discardsUnconfirmedUploadAndDeletesItsSourceFiles() throws Exception {
        Cookie session = login();
        String uploadJson = mockMvc.perform(multipart("/api/knowledge/expert-skill-uploads/archive")
                        .file(new MockMultipartFile(
                                "archive",
                                "discard-me.zip",
                                "application/zip",
                                zipEntry("discard-me/SKILL.md", "# 临时专家\n专家定位：验证取消上传。")
                        ))
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String uploadId = objectMapper.readTree(uploadJson).path("id").asText();
        String storageKey = uploadFileRepository.findByUploadIdOrderByRelativePathAsc(uploadId)
                .getFirst().getStorageKey();
        assertThat(fileStorageService.load(storageKey).exists()).isTrue();

        mockMvc.perform(delete("/api/knowledge/expert-skill-uploads/{uploadId}", uploadId)
                        .with(csrf())
                        .cookie(session))
                .andExpect(status().isNoContent());

        assertThat(uploadRepository.findById(uploadId)).isEmpty();
        assertThat(uploadFileRepository.findByUploadIdOrderByRelativePathAsc(uploadId)).isEmpty();
        assertThatThrownBy(() -> fileStorageService.load(storageKey))
                .isInstanceOf(IllegalStateException.class);
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
                .andExpect(jsonPath("$.knowledgeBase.category").value("行业研究专家专属知识库"))
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
        assertThat(knowledgeBaseRepository.findByCategory("行业研究专家专属知识库")).isPresent();
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
                                  "knowledge": {
                                    "mode": "CREATE",
                                    "newKnowledgeBase": {
                                      "category": "回滚测试专家专属知识库",
                                      "description": "用于验证失败整体回滚",
                                      "usedBy": "回滚测试专家",
                                      "active": true
                                    }
                                  },
                                  "importFileIds": ["%s"],
                                  "active": true
                                }
                                """.formatted(candidate.getId())))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("KNOWLEDGE_FILE_STORE_FAILED"));

        assertThat(uploadRepository.findById(uploadId).orElseThrow().getStatus()).isEqualTo(ExpertSkillUploadStatus.PARSED);
        KnowledgeBase rollbackBase = knowledgeBaseRepository.findByCategory("回滚测试专家专属知识库").orElseThrow();
        assertThat(knowledgeAssetRepository.findByKnowledgeBaseId(rollbackBase.getId())).isEmpty();
        assertThat(uploadFileRepository.findByUploadIdOrderByRelativePathAsc(uploadId))
                .allSatisfy(file -> assertThat(file.getImportedAssetId()).isNull());
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
        Cookie studentSession = login("skill-upload-student@test.local");
        mockMvc.perform(get("/api/knowledge/expert-skill-uploads")
                        .cookie(studentSession))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/knowledge/expert-skill-uploads/experts/defense/files")
                        .cookie(studentSession))
                .andExpect(status().isForbidden());
    }

    private Cookie login() throws Exception {
        return login("skill-upload-admin@test.local");
    }

    private static byte[] readClasspath(String path) throws IOException {
        try (var input = new ClassPathResource(path).getInputStream()) {
            return input.readAllBytes();
        }
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
        return zipEntries(entries, StandardCharsets.UTF_8);
    }

    private static byte[] zipEntries(Map<String, byte[]> entries, Charset charset) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output, charset)) {
            for (Map.Entry<String, byte[]> entry : entries.entrySet()) {
                zip.putNextEntry(new ZipEntry(entry.getKey()));
                zip.write(entry.getValue());
                zip.closeEntry();
            }
        }
        return output.toByteArray();
    }
}
