package com.sufe.ai.knowledge.service;

import com.sufe.ai.provider.config.LexiangPullProperties;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LexiangKnowledgePullSchedulerTests {

    @Test
    void defaultsToNoVendorActionWhenSchedulerIsDisabledOrPullIsUnconfigured() {
        LexiangKnowledgePullService service = mock(LexiangKnowledgePullService.class);
        LexiangKnowledgePullScheduler disabled = new LexiangKnowledgePullScheduler(
                service,
                new LexiangPullProperties(false, 300_000)
        );
        disabled.pullCourseKnowledge();
        verify(service, never()).configured();
        verify(service, never()).pullAll("scheduler");

        LexiangKnowledgePullScheduler unconfigured = new LexiangKnowledgePullScheduler(
                service,
                new LexiangPullProperties(true, 300_000)
        );
        when(service.configured()).thenReturn(false);
        unconfigured.pullCourseKnowledge();
        verify(service, never()).pullAll("scheduler");
    }

    @Test
    void runsOnlyWhenExplicitlyEnabledAndConfigured() {
        LexiangKnowledgePullService service = mock(LexiangKnowledgePullService.class);
        when(service.configured()).thenReturn(true);
        LexiangKnowledgePullScheduler scheduler = new LexiangKnowledgePullScheduler(
                service,
                new LexiangPullProperties(true, 300_000)
        );

        scheduler.pullCourseKnowledge();

        verify(service).pullAll("scheduler");
    }
}
