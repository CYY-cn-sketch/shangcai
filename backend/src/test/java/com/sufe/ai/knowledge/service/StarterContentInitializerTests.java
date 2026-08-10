package com.sufe.ai.knowledge.service;

import com.sufe.ai.knowledge.domain.KnowledgeBaseScope;
import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.storage.FileStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(properties = "sufe.bootstrap.starter-content-enabled=true")
class StarterContentInitializerTests {

    @Autowired
    private StarterContentInitializer starterContentInitializer;

    @Autowired
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Autowired
    private KnowledgeAssetRepository knowledgeAssetRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private ExpertSkillRepository expertSkillRepository;

    @Autowired
    private ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Test
    void persistsStarterKnowledgeFilesAndPromptAlignedExperts() {
        assertThat(knowledgeBaseRepository.findByCategory("创业方法")).isPresent();

        var brainstormAsset = knowledgeAssetRepository.findFirstByNameOrderByCreatedAtAsc("创意头脑风暴方法与创意方向卡.md").orElseThrow();
        var positioningAsset = knowledgeAssetRepository.findFirstByNameOrderByCreatedAtAsc("项目定位与价值主张工作表.md").orElseThrow();
        assertThat(brainstormAsset.hasFile()).isTrue();
        assertThat(positioningAsset.hasFile()).isTrue();
        assertThat(fileStorageService.load(brainstormAsset.getStorageKey()).exists()).isTrue();
        assertThat(fileStorageService.load(positioningAsset.getStorageKey()).exists()).isTrue();

        var brainstorm = expertProfileRepository.findById("brainstorm").orElseThrow();
        var positioning = expertProfileRepository.findById("positioning").orElseThrow();
        var market = expertProfileRepository.findById("market").orElseThrow();
        var business = expertProfileRepository.findById("business").orElseThrow();
        var pitch = expertProfileRepository.findById("pitch").orElseThrow();
        var script = expertProfileRepository.findById("script").orElseThrow();
        var defense = expertProfileRepository.findById("defense").orElseThrow();
        var media = expertProfileRepository.findById("media").orElseThrow();
        assertThat(expertProfileRepository.count()).isEqualTo(8);
        assertThat(brainstorm.getSystemPrompt()).contains("创意方向卡");
        assertThat(brainstorm.getUserPrompt()).contains("knowledge_context");
        assertThat(positioning.getSystemPrompt()).contains("MVP");
        assertThat(positioning.getUserPrompt()).contains("creative_direction_card");
        assertThat(List.of(market, business, pitch, script, defense, media))
                .allSatisfy(expert -> {
                    assertThat(expert.getSourceSkillUploadedBy()).isEqualTo("平台内置内容");
                    assertThat(expert.getSystemPrompt())
                            .contains("知识库调用规则")
                            .contains("输出格式")
                            .contains("禁止事项")
                            .contains("能力边界")
                            .contains("专家交接");
                    assertThat(expert.getUserPrompt()).contains("knowledge_context");
                });
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("brainstorm")).hasSize(3);
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("positioning")).hasSize(3);
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("market")).hasSize(3);
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("business")).hasSize(3);
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("pitch")).hasSize(3);
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("pitch"))
                .extracting("name")
                .contains("路演 PPT 大纲")
                .doesNotContain("10 页 PPT 大纲");
        assertThat(pitch.getSystemPrompt())
                .contains("额度耗尽")
                .contains("不默认、不截断也不补齐为 10 页")
                .doesNotContain("平台预置模板草稿");
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("script")).hasSize(2);
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("defense")).hasSize(3);
        assertThat(expertSkillRepository.findByExpertIdOrderByCreatedAtAsc("media")).hasSize(4);
        assertThat(expertKnowledgeRouteRepository.findByExpertId("brainstorm"))
                .extracting("category")
                .contains("创业方法", "创业案例", "教学大纲");
        assertThat(expertKnowledgeRouteRepository.findByExpertId("defense"))
                .extracting("category")
                .contains("答辩题库", "BP 模板", "PPT 模板", "评分标准");

        var pitchPrivateBase = knowledgeBaseRepository
                .findByOwnerExpertIdAndScopeType("pitch", KnowledgeBaseScope.EXPERT_PRIVATE)
                .orElseThrow();
        var mediaPrivateBase = knowledgeBaseRepository
                .findByOwnerExpertIdAndScopeType("media", KnowledgeBaseScope.EXPERT_PRIVATE)
                .orElseThrow();
        var pitchPrivateAsset = knowledgeAssetRepository
                .findFirstByKnowledgeBaseIdAndNameOrderByCreatedAtAsc(pitchPrivateBase.getId(), "路演PPT结构模板.md")
                .orElseThrow();
        var mediaPrivateAsset = knowledgeAssetRepository
                .findFirstByKnowledgeBaseIdAndNameOrderByCreatedAtAsc(mediaPrivateBase.getId(), "多媒体物料脚本与分镜模板.md")
                .orElseThrow();
        assertThat(expertKnowledgeRouteRepository.findByExpertId("pitch"))
                .extracting("category")
                .contains(pitchPrivateBase.getCategory());
        assertThat(expertKnowledgeRouteRepository.findByExpertId("media"))
                .extracting("category")
                .contains(mediaPrivateBase.getCategory());
        assertThat(List.of(pitchPrivateAsset, mediaPrivateAsset))
                .allSatisfy(asset -> {
                    assertThat(asset.isEnabled()).isTrue();
                    assertThat(asset.getExtractionStatus()).isEqualTo("READY");
                    assertThat(asset.isSkillImport()).isTrue();
                    assertThat(asset.getContentText()).isNotBlank();
                    assertThat(asset.hasFile()).isTrue();
                    assertThat(fileStorageService.load(asset.getStorageKey()).exists()).isTrue();
                });
        assertThat(pitchPrivateAsset.getContentText()).contains("路演");
        assertThat(mediaPrivateAsset.getContentText()).contains("分镜");

        assertThat(knowledgeAssetRepository.count()).isEqualTo(12);
        assertThat(knowledgeAssetRepository.findAll())
                .allSatisfy(asset -> {
                    assertThat(asset.hasFile()).isTrue();
                    assertThat(fileStorageService.load(asset.getStorageKey()).exists()).isTrue();
                });

        starterContentInitializer.run(null);
        assertThat(expertProfileRepository.count()).isEqualTo(8);
        assertThat(expertSkillRepository.count()).isEqualTo(24);
        assertThat(knowledgeAssetRepository.count()).isEqualTo(12);
    }
}
