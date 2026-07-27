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
        seedKnowledgeAsset(
                requiredKnowledgeBase("教学大纲"),
                "创业实践八周教学节点.md",
                "starter-content/knowledge/创业实践八周教学节点.md",
                "平台默认的八周阶段目标、阶段成果、教师检查点和返工边界。"
        );
        seedKnowledgeAsset(
                requiredKnowledgeBase("评分标准"),
                "创业项目阶段成果评分标准.md",
                "starter-content/knowledge/创业项目阶段成果评分标准.md",
                "用于检查创新、市场、商业、表达、协作与证据质量的默认评分框架。"
        );
        seedKnowledgeAsset(
                requiredKnowledgeBase("创业案例"),
                "市场与竞品分析框架.md",
                "starter-content/knowledge/市场与竞品分析框架.md",
                "用于界定市场边界、比较替代方案并形成可验证进入策略。"
        );
        seedKnowledgeAsset(
                requiredKnowledgeBase("BP 模板"),
                "商业模式与BP撰写框架.md",
                "starter-content/knowledge/商业模式与BP撰写框架.md",
                "用于形成付费闭环、关键假设、财务口径和可审核 BP 结构。"
        );
        seedKnowledgeAsset(
                requiredKnowledgeBase("PPT 模板"),
                "路演PPT结构模板.md",
                "starter-content/knowledge/路演PPT结构模板.md",
                "用于生成结论先行、证据可追溯的路演页面结构。"
        );
        seedKnowledgeAsset(
                requiredKnowledgeBase("PPT 模板"),
                "路演稿结构与时间控制.md",
                "starter-content/knowledge/路演稿结构与时间控制.md",
                "用于生成与 PPT 对齐的 1、3、5 分钟路演讲稿。"
        );
        seedKnowledgeAsset(
                requiredKnowledgeBase("答辩题库"),
                "答辩题库与回答框架.md",
                "starter-content/knowledge/答辩题库与回答框架.md",
                "用于分层模拟追问、组织证据回答和形成复盘记录。"
        );
        seedKnowledgeAsset(
                requiredKnowledgeBase("多媒体模板"),
                "多媒体物料脚本与分镜模板.md",
                "starter-content/knowledge/多媒体物料脚本与分镜模板.md",
                "用于课程路演场景的短视频脚本、分镜、海报文案和视觉提示词。"
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
                ),
                List.of(KNOWLEDGE_CATEGORY, "创业案例", "教学大纲")
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
                ),
                List.of(KNOWLEDGE_CATEGORY, "创业案例", "教学大纲")
        ));
        seedExpert(new ExpertStarter(
                "market",
                "市场与竞品专家",
                "基于项目定位和可追溯证据，界定市场、识别替代方案并形成可验证的进入策略。",
                "市场机会、替代方案、竞品维度、市场边界和早期进入策略。",
                "#8b5c00",
                "starter-content/experts/market-expert/SKILL.md",
                List.of(
                        new SkillStarter("market-size", "市场机会", "市场分析", "梳理市场边界、趋势口径和切入窗口"),
                        new SkillStarter("competitors", "竞品维度", "竞品分析", "建立替代方案矩阵并标记证据缺口"),
                        new SkillStarter("entry", "进入策略", "增长策略", "形成细分市场、触达渠道和验证路线")
                ),
                List.of("创业案例", "教学大纲", "评分标准")
        ));
        seedExpert(new ExpertStarter(
                "business",
                "商业模式/BP 专家",
                "把已确认的定位、市场判断和验证证据组织为可审核的商业模式与商业计划书。",
                "商业模式画布、付费闭环、BP 结构、财务假设和风险验证。",
                "#22406a",
                "starter-content/experts/business-expert/SKILL.md",
                List.of(
                        new SkillStarter("canvas", "商业模式画布", "商业模式", "明确客户、价值、交付、渠道与关键资源"),
                        new SkillStarter("bp", "BP 大纲", "商业计划书", "生成逻辑一致且可供教师审核的 BP 结构"),
                        new SkillStarter("finance", "财务假设", "财务模型", "拆分收入、成本、现金流假设及验证方式")
                ),
                List.of("BP 模板", "创业案例", "教学大纲", "评分标准")
        ));
        seedExpert(new ExpertStarter(
                "pitch",
                "路演 PPT 专家",
                "将已确认的商业计划和证据转化为逐页内容，由平台结合乐享知识库组装并保存 PPTX。",
                "路演结构、逐页观点、证据、图表建议、讲述提示和 PPTX 组装。",
                "#005aa8",
                "starter-content/experts/pitch-expert/SKILL.md",
                List.of(
                        new SkillStarter("deck", "10 页 PPT 大纲", "路演 PPT", "生成页面标题、核心观点和证据要求"),
                        new SkillStarter("slide-points", "页面观点", "观点提炼", "为每页形成一句话结论和图表建议"),
                        new SkillStarter("speaker-notes", "讲稿建议", "路演表达", "生成逐页讲述提示和转场建议")
                ),
                List.of("PPT 模板", "BP 模板", "评分标准")
        ));
        seedExpert(new ExpertStarter(
                "script",
                "路演稿生成专家",
                "基于已确认的 BP 和 PPT，生成与页面一致、口语自然且便于练习的多时长讲稿。",
                "1 分钟、3 分钟、5 分钟路演稿、逐页要点和转场话术。",
                "#7a4b00",
                "starter-content/experts/script-expert/SKILL.md",
                List.of(
                        new SkillStarter("roadshow-script", "路演稿生成", "路演稿", "生成 1、3、5 分钟路演稿"),
                        new SkillStarter("talking-points", "讲述要点", "路演表达", "提炼逐页讲述重点和评委追问承接")
                ),
                List.of("PPT 模板", "BP 模板", "评分标准")
        ));
        seedExpert(new ExpertStarter(
                "defense",
                "AI 评委/答辩陪练专家",
                "基于已确认的 BP、PPT 和路演稿模拟分层追问，训练学生用证据回答并复盘。",
                "模拟评委追问、压力测试、回答训练、证据缺口识别和答辩复盘。",
                "#6a4a12",
                "starter-content/experts/defense-expert/SKILL.md",
                List.of(
                        new SkillStarter("questions", "模拟追问", "答辩准备", "按项目证据生成分层评委问题"),
                        new SkillStarter("answers", "回答建议", "答辩优化", "用结论、证据、边界和下一步组织回答"),
                        new SkillStarter("stress", "压力测试", "现场应变", "识别商业与落地漏洞并连续追问")
                ),
                List.of("答辩题库", "BP 模板", "PPT 模板", "评分标准")
        ));
        seedExpert(new ExpertStarter(
                "media",
                "多媒体物料专家",
                "将已确认的项目叙事转化为多媒体脚本和制作规格，真实成片由独立任务执行。",
                "短视频脚本、分镜、海报文案、视觉提示词、预处理摘要和物料清单。",
                "#0b6b88",
                "starter-content/experts/media-expert/SKILL.md",
                List.of(
                        new SkillStarter("video-script", "宣传视频脚本", "多媒体展示", "生成 30 秒项目宣传视频脚本"),
                        new SkillStarter("storyboard", "视频分镜表", "视觉脚本", "生成镜头、旁白、字幕和时长表"),
                        new SkillStarter("poster", "海报文案 Prompt", "海报物料", "输出海报标题、文案和视觉提示词"),
                        new SkillStarter("visual", "视觉素材 Prompt", "原型视觉", "生成受品牌与内容约束的视觉提示词")
                ),
                List.of("多媒体模板", "PPT 模板", "评分标准")
        ));
    }

    private KnowledgeBase requiredKnowledgeBase(String category) {
        return knowledgeBaseRepository.findByCategory(category)
                .orElseThrow(() -> new IllegalStateException("平台默认知识库缺失：" + category));
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
        String sourceContent = new String(readResource(definition.resourcePath()), StandardCharsets.UTF_8);
        ExpertProfile byId = expertProfileRepository.findById(definition.id()).orElse(null);
        ExpertProfile byName = expertProfileRepository.findByName(definition.name()).orElse(null);
        if (byId != null && byName != null && !byId.getId().equals(byName.getId())) return;
        ExpertProfile expert = byId != null ? byId : byName;
        if (expert != null && (!expert.getId().equals(definition.id())
                || !UPLOADED_BY.equals(expert.getSourceSkillUploadedBy()))) return;
        if (expert != null && sourceContent.equals(expert.getSourceSkillContent())) return;
        boolean existing = expert != null;
        if (expert == null) {
            expert = ExpertProfile.create(
                    definition.id(),
                    definition.name(),
                    definition.role(),
                    definition.scenario(),
                    definition.accent()
            );
        }
        expert.update(
                definition.name(),
                definition.role(),
                definition.scenario(),
                definition.accent(),
                definition.resourcePath(),
                sourceContent,
                UPLOADED_BY,
                composeSystemPrompt(sourceContent),
                sectionValue(sourceContent, "用户提示词"),
                true
        );
        expertProfileRepository.saveAndFlush(expert);
        if (existing) {
            expertSkillRepository.deleteByExpertId(expert.getId());
            expertKnowledgeRouteRepository.deleteByExpertId(expert.getId());
            expertSkillRepository.flush();
            expertKnowledgeRouteRepository.flush();
        }
        definition.skills().forEach(skill -> expertSkillRepository.save(ExpertSkill.create(
                definition.id() + "-" + skill.id(),
                definition.id(),
                skill.name(),
                skill.stage(),
                skill.description()
        )));
        definition.knowledgeCategories().forEach(category ->
                expertKnowledgeRouteRepository.save(ExpertKnowledgeRoute.create(definition.id(), category))
        );
    }

    private static String composeSystemPrompt(String content) {
        StringBuilder prompt = new StringBuilder(sectionValue(content, "系统提示词"));
        appendSection(prompt, "知识库调用规则", sectionValue(content, "知识库调用规则"));
        appendSection(prompt, "输出格式", sectionValue(content, "输出格式"));
        appendSection(prompt, "禁止事项", sectionValue(content, "禁止事项"));
        appendSection(prompt, "能力边界", sectionValue(content, "能力边界"));
        appendSection(prompt, "专家交接", sectionValue(content, "专家交接"));
        return prompt.toString();
    }

    private static void appendSection(StringBuilder prompt, String title, String value) {
        prompt.append("\n\n## ").append(title).append('\n').append(value);
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
            List<SkillStarter> skills,
            List<String> knowledgeCategories
    ) {
    }

    private record SkillStarter(String id, String name, String stage, String description) {
    }
}
