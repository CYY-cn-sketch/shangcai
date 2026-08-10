package com.sufe.ai.knowledge.api;

import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.domain.UserRole;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.audit.service.AuditLogService;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.ExpertSkillFileRole;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadFile;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadRecord;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadFileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillUploadRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.storage.FileStorageService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:sufe-ai-expert-deletion;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminExpertDeletionIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Autowired
    private KnowledgeAssetRepository knowledgeAssetRepository;

    @Autowired
    private ExpertSkillUploadRepository expertSkillUploadRepository;

    @Autowired
    private ExpertSkillUploadFileRepository expertSkillUploadFileRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoSpyBean
    private AuditLogService auditLogService;

    @Test
    void requiresExplicitCascadeAndDeletesOnlyPrivateDataAndFilesAfterCommit() throws Exception {
        UserAccount admin = userAccountRepository.findByAccountIgnoreCase("expert-delete-admin@test.local")
                .orElseGet(() -> userAccountRepository.saveAndFlush(UserAccount.create(
                        "U-EXPERT-DELETE-ADMIN",
                        "expert-delete-admin@test.local",
                        passwordEncoder.encode("correct-password"),
                        UserRole.ADMIN,
                        "专家删除管理员",
                        "平台管理员",
                        100
                )));
        ExpertProfile expert = expertProfileRepository.saveAndFlush(ExpertProfile.create(
                "expert-delete-target",
                "待删除专家",
                "验证专属知识级联删除",
                "测试场景",
                "#225588"
        ));
        KnowledgeBase sharedBase = knowledgeBaseRepository.saveAndFlush(KnowledgeBase.create(
                "删除保护共享库",
                "课程共享知识库不得随专家删除",
                "教师端与管理端"
        ));
        KnowledgeBase privateBase = knowledgeBaseRepository.saveAndFlush(KnowledgeBase.createExpertPrivate(
                "待删除专家专属知识库",
                "仅供待删除专家检索",
                expert.getName(),
                expert.getId()
        ));

        FileStorageService.StoredFile privateStoredFile = fileStorageService.storeKnowledgeFile(
                "private.md",
                "private knowledge".getBytes(StandardCharsets.UTF_8)
        );
        KnowledgeAsset privateAsset = KnowledgeAsset.create(
                privateBase.getId(),
                "专属资料",
                "17 B",
                "MD",
                "专属资料摘要",
                "private knowledge",
                admin.getDisplayName()
        );
        privateAsset.markSkillImport();
        privateAsset.attachFile(
                privateStoredFile.storageKey(),
                privateStoredFile.originalName(),
                privateStoredFile.mimeType(),
                privateStoredFile.size(),
                privateStoredFile.sha256()
        );
        privateAsset = knowledgeAssetRepository.saveAndFlush(privateAsset);

        ExpertSkillUploadRecord upload = ExpertSkillUploadRecord.parsed(
                admin.getDisplayName(),
                new ExpertSkillUploadRecord.ParsedSkill(
                        "expert-delete-source",
                        "SKILL.md",
                        1,
                        "# 待删除专家",
                        expert.getName(),
                        expert.getRoleDescription(),
                        expert.getScenario(),
                        expert.getAccent(),
                        "系统提示词",
                        "用户提示词",
                        "删除测试技能",
                        "用于验证来源档案删除",
                        "仅使用专属知识库",
                        "结构化输出",
                        "不访问共享库"
                )
        );
        upload.enable(expert.getId(), admin.getDisplayName());
        upload = expertSkillUploadRepository.saveAndFlush(upload);
        FileStorageService.StoredFile sourceStoredFile = fileStorageService.storeSkillFile(
                upload.getId(),
                "SKILL.md",
                "# source archive".getBytes(StandardCharsets.UTF_8)
        );
        ExpertSkillUploadFile uploadFile = ExpertSkillUploadFile.create(
                upload.getId(),
                "SKILL.md",
                ExpertSkillFileRole.KNOWLEDGE_CANDIDATE,
                "# source archive",
                sourceStoredFile.storageKey(),
                sourceStoredFile.mimeType(),
                sourceStoredFile.size(),
                sourceStoredFile.sha256()
        );
        uploadFile.markImported(privateAsset.getId());
        uploadFile = expertSkillUploadFileRepository.saveAndFlush(uploadFile);

        Cookie sessionCookie = login();
        mockMvc.perform(delete("/api/admin/experts/{expertId}", expert.getId())
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EXPERT_HAS_PRIVATE_KNOWLEDGE"));

        assertThat(expertProfileRepository.findById(expert.getId())).isPresent();
        assertThat(knowledgeBaseRepository.findById(privateBase.getId())).isPresent();
        assertThat(knowledgeAssetRepository.findById(privateAsset.getId())).isPresent();
        assertThat(expertSkillUploadRepository.findById(upload.getId())).isPresent();
        assertThat(fileStorageService.load(privateStoredFile.storageKey()).exists()).isTrue();
        assertThat(fileStorageService.load(sourceStoredFile.storageKey()).exists()).isTrue();

        mockMvc.perform(delete("/api/admin/experts/{expertId}", expert.getId())
                        .param("deletePrivateKnowledge", "true")
                        .with(csrf())
                        .cookie(sessionCookie))
                .andExpect(status().isNoContent());

        assertThat(expertProfileRepository.findById(expert.getId())).isEmpty();
        assertThat(knowledgeBaseRepository.findById(privateBase.getId())).isEmpty();
        assertThat(knowledgeAssetRepository.findById(privateAsset.getId())).isEmpty();
        assertThat(expertSkillUploadRepository.findById(upload.getId())).isEmpty();
        assertThat(expertSkillUploadFileRepository.findById(uploadFile.getId())).isEmpty();
        assertThat(knowledgeBaseRepository.findById(sharedBase.getId())).isPresent();
        assertThatThrownBy(() -> fileStorageService.load(privateStoredFile.storageKey()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("文件不存在或已失效");
        assertThatThrownBy(() -> fileStorageService.load(sourceStoredFile.storageKey()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("文件不存在或已失效");
    }

    @Test
    void keepsPrivateKnowledgeFileWhenDatabaseTransactionRollsBack() throws Exception {
        UserAccount admin = userAccountRepository.findByAccountIgnoreCase("expert-delete-admin@test.local")
                .orElseGet(() -> userAccountRepository.saveAndFlush(UserAccount.create(
                        "U-ASSET-ROLLBACK-ADMIN",
                        "expert-delete-admin@test.local",
                        passwordEncoder.encode("correct-password"),
                        UserRole.ADMIN,
                        "资料删除管理员",
                        "平台管理员",
                        100
                )));
        ExpertProfile expert = expertProfileRepository.saveAndFlush(ExpertProfile.create(
                "expert-asset-rollback",
                "资料回滚专家",
                "验证单份资料删除回滚",
                "测试场景",
                "#335577"
        ));
        KnowledgeBase privateBase = knowledgeBaseRepository.saveAndFlush(KnowledgeBase.createExpertPrivate(
                "资料回滚专家专属知识库",
                "仅供资料回滚专家检索",
                expert.getName(),
                expert.getId()
        ));
        FileStorageService.StoredFile storedFile = fileStorageService.storeKnowledgeFile(
                "rollback.md",
                "rollback knowledge".getBytes(StandardCharsets.UTF_8)
        );
        KnowledgeAsset asset = KnowledgeAsset.create(
                privateBase.getId(),
                "待回滚资料",
                "18 B",
                "MD",
                "验证事务回滚后文件仍存在",
                "rollback knowledge",
                admin.getDisplayName()
        );
        asset.attachFile(
                storedFile.storageKey(),
                storedFile.originalName(),
                storedFile.mimeType(),
                storedFile.size(),
                storedFile.sha256()
        );
        asset = knowledgeAssetRepository.saveAndFlush(asset);

        doThrow(new IllegalStateException("forced audit failure"))
                .when(auditLogService)
                .record(anyString(), eq("EXPERT_PRIVATE_KNOWLEDGE_DELETE"), anyString(), anyString(), anyString());
        try {
            String assetId = asset.getId();
            Cookie sessionCookie = login();
            assertThatThrownBy(() -> mockMvc.perform(delete(
                            "/api/admin/experts/{expertId}/knowledge-assets/{assetId}", expert.getId(), assetId)
                            .with(csrf())
                            .cookie(sessionCookie))
                    .andReturn())
                    .hasRootCauseMessage("forced audit failure");

            assertThat(knowledgeAssetRepository.findById(assetId)).isPresent();
            assertThat(fileStorageService.load(storedFile.storageKey()).exists()).isTrue();
        } finally {
            reset(auditLogService);
        }
    }

    private Cookie login() throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"account\":\"expert-delete-admin@test.local\",\"password\":\"correct-password\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie("SUFE_SESSION");
    }
}
