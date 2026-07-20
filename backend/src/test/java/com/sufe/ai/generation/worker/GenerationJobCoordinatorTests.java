package com.sufe.ai.generation.worker;

import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.generation.domain.ArtifactType;
import com.sufe.ai.provider.VerifiedProviderUsage;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.config.WorkBuddyProperties;
import com.sufe.ai.usage.service.AiUsageService;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class GenerationJobCoordinatorTests {

    @Test
    void doesNotClaimOrExecuteWhenProviderIsDisabled() {
        GenerationJobWorker worker = mock(GenerationJobWorker.class);
        AiUsageService usageService = mock(AiUsageService.class);
        GenerationJobExecutor executor = mock(GenerationJobExecutor.class);
        when(executor.provider()).thenReturn(GenerationProvider.WORKBUDDY);
        GenerationJobCoordinator coordinator = coordinator(worker, usageService, executor, false, 2);

        try {
            coordinator.dispatchAvailable(GenerationProvider.WORKBUDDY);

            verifyNoInteractions(worker);
            verify(executor, never()).execute(org.mockito.ArgumentMatchers.any());
        } catch (Exception exception) {
            throw new AssertionError(exception);
        } finally {
            coordinator.close();
        }
    }

    @Test
    void consumesQueuedJobsWithoutExceedingProviderConcurrency() throws Exception {
        GenerationJobWorker worker = mock(GenerationJobWorker.class);
        AiUsageService usageService = mock(AiUsageService.class);
        GenerationJob first = job("job-001");
        GenerationJob second = job("job-002");
        GenerationJob third = job("job-003");
        when(worker.claimNext(eq(GenerationProvider.WORKBUDDY), anyString()))
                .thenReturn(Optional.of(first))
                .thenReturn(Optional.of(second))
                .thenReturn(Optional.of(third))
                .thenReturn(Optional.empty());

        AtomicInteger active = new AtomicInteger();
        AtomicInteger maximumActive = new AtomicInteger();
        AtomicInteger completed = new AtomicInteger();
        CountDownLatch firstWaveStarted = new CountDownLatch(2);
        CountDownLatch releaseFirstWave = new CountDownLatch(1);
        CountDownLatch allCompleted = new CountDownLatch(3);
        GenerationJobExecutor executor = new GenerationJobExecutor() {
            @Override
            public GenerationProvider provider() {
                return GenerationProvider.WORKBUDDY;
            }

            @Override
            public ExecutionResult execute(GenerationJob job) throws InterruptedException {
                int running = active.incrementAndGet();
                maximumActive.accumulateAndGet(running, Math::max);
                firstWaveStarted.countDown();
                releaseFirstWave.await(2, TimeUnit.SECONDS);
                active.decrementAndGet();
                completed.incrementAndGet();
                allCompleted.countDown();
                return ExecutionResult.completed("outputs/" + job.getId(), null);
            }
        };
        GenerationJobCoordinator coordinator = coordinator(worker, usageService, executor, true, 2);

        try {
            coordinator.dispatchAvailable(GenerationProvider.WORKBUDDY);

            assertThat(firstWaveStarted.await(2, TimeUnit.SECONDS)).isTrue();
            assertThat(coordinator.inFlight(GenerationProvider.WORKBUDDY)).isEqualTo(2);
            verify(worker, times(2)).claimNext(eq(GenerationProvider.WORKBUDDY), anyString());

            releaseFirstWave.countDown();
            await(() -> coordinator.inFlight(GenerationProvider.WORKBUDDY) == 0, Duration.ofSeconds(2));
            coordinator.dispatchAvailable(GenerationProvider.WORKBUDDY);

            assertThat(allCompleted.await(2, TimeUnit.SECONDS)).isTrue();
            await(() -> coordinator.inFlight(GenerationProvider.WORKBUDDY) == 0, Duration.ofSeconds(2));
            assertThat(completed).hasValue(3);
            assertThat(maximumActive).hasValue(2);
            verify(worker, times(3)).complete(anyString(), org.mockito.ArgumentMatchers.anyString(),
                    org.mockito.ArgumentMatchers.isNull());
            verifyNoInteractions(usageService);
        } finally {
            releaseFirstWave.countDown();
            coordinator.close();
        }
    }

    @Test
    void persistsOnlyUsageReturnedByExecutorContract() throws Exception {
        GenerationJobWorker worker = mock(GenerationJobWorker.class);
        AiUsageService usageService = mock(AiUsageService.class);
        GenerationJob job = job("job-with-usage");
        when(job.getUserId()).thenReturn("student-001");
        when(job.getArtifactType()).thenReturn(ArtifactType.VIDEO);
        when(worker.claimNext(eq(GenerationProvider.WORKBUDDY), anyString()))
                .thenReturn(Optional.of(job));
        GenerationJobExecutor executor = new GenerationJobExecutor() {
            @Override
            public GenerationProvider provider() {
                return GenerationProvider.WORKBUDDY;
            }

            @Override
            public ExecutionResult execute(GenerationJob ignored) {
                return new ExecutionResult(
                        "outputs/job-with-usage.mp4",
                        null,
                        Optional.of(new VerifiedProviderUsage(
                                "verified-request-001", "verified-model", 40, 10
                        ))
                );
            }
        };
        GenerationJobCoordinator coordinator = coordinator(worker, usageService, executor, true, 1);

        try {
            coordinator.dispatchAvailable(GenerationProvider.WORKBUDDY);
            await(() -> coordinator.inFlight(GenerationProvider.WORKBUDDY) == 0, Duration.ofSeconds(2));

            ArgumentCaptor<AiUsageService.ReportedUsage> captor =
                    ArgumentCaptor.forClass(AiUsageService.ReportedUsage.class);
            verify(usageService).recordReportedUsage(captor.capture());
            assertThat(captor.getValue().requestId()).isEqualTo("verified-request-001");
            assertThat(captor.getValue().inputTokens()).isEqualTo(40);
            assertThat(captor.getValue().outputTokens()).isEqualTo(10);
        } finally {
            coordinator.close();
        }
    }

    private static GenerationJobCoordinator coordinator(
            GenerationJobWorker worker,
            AiUsageService usageService,
            GenerationJobExecutor executor,
            boolean enabled,
            int maxConcurrency
    ) {
        return new GenerationJobCoordinator(
                worker,
                usageService,
                new WorkBuddyProperties(
                        enabled,
                        URI.create("http://127.0.0.1:49678"),
                        Path.of("target/coordinator-tests"),
                        maxConcurrency
                ),
                new LexiangProperties(
                        false,
                        URI.create("https://example.invalid"),
                        "",
                        "",
                        "system-bot",
                        "",
                        1
                ),
                List.of(executor),
                Executors.newVirtualThreadPerTaskExecutor()
        );
    }

    private static GenerationJob job(String id) {
        GenerationJob job = mock(GenerationJob.class);
        when(job.getId()).thenReturn(id);
        when(job.getProvider()).thenReturn(GenerationProvider.WORKBUDDY);
        return job;
    }

    private static void await(java.util.function.BooleanSupplier condition, Duration timeout)
            throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (!condition.getAsBoolean() && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        assertThat(condition.getAsBoolean()).isTrue();
    }
}
