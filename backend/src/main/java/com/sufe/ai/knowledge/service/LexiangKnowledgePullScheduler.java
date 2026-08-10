package com.sufe.ai.knowledge.service;

import com.sufe.ai.provider.config.LexiangPullProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class LexiangKnowledgePullScheduler {

    private final LexiangKnowledgePullService pullService;
    private final LexiangPullProperties properties;

    public LexiangKnowledgePullScheduler(
            LexiangKnowledgePullService pullService,
            LexiangPullProperties properties
    ) {
        this.pullService = pullService;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${sufe.providers.lexiang.pull.fixed-delay-ms:300000}")
    public void pullCourseKnowledge() {
        if (!properties.scheduledEnabled() || !pullService.configured()) return;
        pullService.pullAll("scheduler");
    }
}
