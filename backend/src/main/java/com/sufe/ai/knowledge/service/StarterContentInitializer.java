package com.sufe.ai.knowledge.service;

import com.sufe.ai.account.config.BootstrapProperties;
import com.sufe.ai.knowledge.domain.ExpertKnowledgeRoute;
import com.sufe.ai.knowledge.domain.ExpertProfile;
import com.sufe.ai.knowledge.domain.ExpertSkill;
import com.sufe.ai.knowledge.domain.KnowledgeAsset;
import com.sufe.ai.knowledge.domain.KnowledgeBase;
import com.sufe.ai.knowledge.repository.ExpertKnowledgeRouteRepository;
import com.sufe.ai.knowledge.repository.ExpertProfileRepository;
import com.sufe.ai.knowledge.repository.ExpertSkillRepository;
import com.sufe.ai.knowledge.repository.KnowledgeAssetRepository;
import com.sufe.ai.knowledge.repository.KnowledgeBaseRepository;
import com.sufe.ai.storage.FileStorageService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

@Component
public class StarterContentInitializer implements ApplicationRunner {

    private static final String KNOWLEDGE_CATEGORY = "创业方法";
    private static final String UPLOADED_BY = "平台内置内容";

    private final BootstrapProperties properties;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final KnowledgeAssetRepository knowledgeAssetRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final ExpertSkillRepository expertSkillRepository;
    private final ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository;
    private final FileStorageService fileStorageService;

    public StarterContentInitializer(
            BootstrapProperties properties,
            KnowledgeBaseRepository knowledgeBaseRepository,
            KnowledgeAssetRepository knowledgeAssetRepository,
            ExpertProfileRepository expertProfileRepository,
            ExpertSkillRepository expertSkillRepository,
            ExpertKnowledgeRouteRepository expertKnowledgeRouteRepository,
            FileStorageService fileStorageService
    ) {
        this.properties = properties;
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.knowledgeAssetRepository = knowledgeAssetRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.expertSkillRepository = expertSkillRepository;
        this.expertKnowledgeRouteRepository = expertKnowledgeRouteRepository;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.starterContentEnabled()) return;

        KnowledgeBase knowledgeBase = knowledgeBaseRepository.findByCategory(KNOWLEDGE_CATEGORY)
                .orElseGet(() -> knowledgeBaseRepository.save(KnowledgeBase.create(
                        KNOWLEDGE_CATEGORY,
                        "平台内置的创意发散、项目定位、价值主张和验证方法；教师可替换或补充正式课程资料。",
                        "创意头脑风暴、项目定位"
                )));

        seedKnowledgeAsset(
                knowledgeBase,
                "创意头脑风暴方法与创意方向卡.md",
                "starter-content/knowledge/创意头脑风暴方法与创意方向卡.md",
                "从问题出发完成创意发散、候选评分、七天验证任务和创意方向卡。"
        );
        seedKnowledgeAsset(
                knowledgeBase,
                "项目定位与价值主张工作表.md",
                "starter-content/knowledge/项目定位与价值主张工作表.md",
                "用于拆分用户角色、形成价值主张、验证差异化并限定 MVP 范围。"
        );

        seedExpert(new ExpertStarter(
                "brainstorm",
                "创意头脑风暴专家",
                "帮助学生从真实问题、可用资源和目标人群出发，发散并筛选可验证的创业方向。",
                "没有明确创意、想法模糊、多个方向待选择、痛点识别和七天验证任务。",
                "#0f7b73",
                "starter-content/experts/brainstorm-expert/SKILL.md",
                List.of(
                        new SkillStarter("idea-map", "创意整理", "头脑风暴", "归纳讨论内容并形成候选创业方向"),
                        new SkillStarter("pain-points", "痛点识别", "需求发现", "识别目标用户、具体场景和高频痛点"),
                        new SkillStarter("hypothesis", "任务清单生成", "验证任务", "输出关键假设、失败信号和七天验证任务")
                )
        ));
        seedExpert(new ExpertStarter(
                "positioning",
                "项目定位专家",
                "把已经筛选的创业方向收敛为目标用户、核心场景、价值主张、差异化和 MVP 范围。",
                "价值主张、用户角色、差异化表达、一句话定位和最小可行产品范围。",
                "#1d5fd1",
                "starter-content/experts/positioning-expert/SKILL.md",
                List.of(
                        new SkillStarter("value", "价值主张明确", "产品定位", "明确为谁在什么场景解决什么问题"),
                        new SkillStarter("persona", "多维用户画像", "目标用户", "区分使用者、决策者、购买者和受益者"),
                        new SkillStarter("differentiation", "差异化表达", "竞争定位", "对比替代方案并形成可验证的一句话定位")
                )
        ));
    }

    private void seedKnowledgeAsset(KnowledgeBase knowledgeBase, String fileName, String resourcePath, String preview) {
        KnowledgeAsset existing = knowledgeAssetRepository.findFirstByNameOrderByCreatedAtAsc(fileName).orElse(null);
        if (existing != null && existing.hasFile()) {
            try {
                fileStorageService.load(existing.getStorageKey());
                return;
            } catch (IllegalArgumentException | IllegalStateException ignored) {
                // 数据库有记录但原始文件缺失时，用内置资源修复文件持久化。
            }
        }

        byte[] content = readResource(resourcePath);
        FileStorageService.StoredFile stored;
        try {
            stored = fileStorageService.storeKnowledgeFile(fileName, content);
        } catch (IOException exception) {
            throw new IllegalStateException("无法初始化知识文件：" + fileName, exception);
        }

        try {
            KnowledgeAsset asset = existing == null
                    ? KnowledgeAsset.create(
                            knowledgeBase.getId(),
                            fileName,
                            formatFileSize(content.length),
                            "MD",
                            preview,
                            new String(content, StandardCharsets.UTF_8),
                            UPLOADED_BY
                    )
                    : existing;
            asset.setEnabled(true);
            asset.attachFile(stored.storageKey(), stored.originalName(), stored.mimeType(), stored.size(), stored.sha256());
            knowledgeAssetRepository.save(asset);
        } catch (RuntimeException exception) {
            fileStorageService.delete(stored.storageKey());
            throw exception;
        }
    }

    private void seedExpert(ExpertStarter definition) {
        if (expertProfileRepository.existsById(definition.id())
                || expertProfileRepository.findByName(definition.name()).isPresent()) {
            return;
        }

        String sourceContent = new String(readResource(definition.resourcePath()), StandardCharsets.UTF_8);
        ExpertProfile expert = ExpertProfile.create(
                definition.id(),
                definition.name(),
                definition.role(),
                definition.scenario(),
                definition.accent()
        );
        expert.update(
                definition.name(),
                definition.role(),
                definition.scenario(),
                definition.accent(),
                definition.resourcePath(),
                sourceContent,
                UPLOADED_BY,
                sectionValue(sourceContent, "系统提示词"),
                sectionValue(sourceContent, "用户提示词"),
                true
        );
        expertProfileRepository.save(expert);
        definition.skills().forEach(skill -> expertSkillRepository.save(ExpertSkill.create(
                definition.id() + "-" + skill.id(),
                definition.id(),
                skill.name(),
                skill.stage(),
                skill.description()
        )));
        List.of(KNOWLEDGE_CATEGORY, "创业案例").forEach(category ->
                expertKnowledgeRouteRepository.save(ExpertKnowledgeRoute.create(definition.id(), category))
        );
    }

    private static byte[] readResource(String resourcePath) {
        try (var input = new ClassPathResource(resourcePath).getInputStream()) {
            return input.readAllBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("平台启动内容缺失：" + resourcePath, exception);
        }
    }

    private static String sectionValue(String content, String title) {
        String[] lines = content.split("\\R");
        for (int index = 0; index < lines.length; index++) {
            String heading = lines[index].trim().replaceFirst("^#{1,6}\\s*", "").trim();
            if (!heading.equals(title)) continue;
            StringBuilder section = new StringBuilder();
            for (int next = index + 1; next < lines.length; next++) {
                if (lines[next].trim().matches("^#{1,6}\\s+.+")) break;
                if (!lines[next].isBlank() || !section.isEmpty()) section.append(lines[next]).append('\n');
            }
            String value = section.toString().trim();
            return value.isEmpty() ? null : value;
        }
        throw new IllegalStateException("专家 Skill 缺少“" + title + "”章节");
    }

    private static String formatFileSize(long size) {
        if (size < 1024) return size + " B";
        return String.format(Locale.ROOT, "%.1f KB", size / 1024.0);
    }

    private record ExpertStarter(
            String id,
            String name,
            String role,
            String scenario,
            String accent,
            String resourcePath,
            List<SkillStarter> skills
    ) {
    }

    private record SkillStarter(String id, String name, String stage, String description) {
    }
}
