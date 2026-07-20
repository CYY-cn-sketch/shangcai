package com.sufe.ai.generation.worker;

import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.VerifiedProviderUsage;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.config.WorkBuddyProperties;
import com.sufe.ai.usage.service.AiUsageService;
import jakarta.annotation.PreDestroy;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;

/**
 * 按供应商轮询并发上限内的 FIFO 任务。
 *
 * <p>没有注册执行器或供应商未启用时不会领取任务，也不会发起网络请求。</p>
 */
@Component
public class GenerationJobCoordinator {

    private static final Logger LOGGER = LoggerFactory.getLogger(GenerationJobCoordinator.class);

    private final GenerationJobWorker worker;
    private final AiUsageService usageService;
    private final WorkBuddyProperties workBuddyProperties;
    private final LexiangProperties lexiangProperties;
    private final Map<GenerationProvider, GenerationJobExecutor> executors;
    private final Map<GenerationProvider, Semaphore> concurrencyLimits;
    private final ExecutorService taskExecutor;

    @Autowired
    public GenerationJobCoordinator(
            GenerationJobWorker worker,
            AiUsageService usageService,
            WorkBuddyProperties workBuddyProperties,
            LexiangProperties lexiangProperties,
            List<GenerationJobExecutor> executors
    ) {
        this(
                worker,
                usageService,
                workBuddyProperties,
                lexiangProperties,
                executors,
                Executors.newVirtualThreadPerTaskExecutor()
        );
    }

    GenerationJobCoordinator(
            GenerationJobWorker worker,
            AiUsageService usageService,
            WorkBuddyProperties workBuddyProperties,
            LexiangProperties lexiangProperties,
            List<GenerationJobExecutor> executors,
            ExecutorService taskExecutor
    ) {
        this.worker = worker;
        this.usageService = usageService;
        this.workBuddyProperties = workBuddyProperties;
        this.lexiangProperties = lexiangProperties;
        this.taskExecutor = taskExecutor;
        this.executors = indexExecutors(executors);
        this.concurrencyLimits = new EnumMap<>(GenerationProvider.class);
        this.concurrencyLimits.put(
                GenerationProvider.WORKBUDDY,
                new Semaphore(workBuddyProperties.maxConcurrency())
        );
        this.concurrencyLimits.put(
                GenerationProvider.LEXIANG,
                new Semaphore(lexiangProperties.maxConcurrency())
        );
    }

    @Scheduled(fixedDelayString = "${sufe.generation.queue.poll-interval-ms:1000}")
    public void poll() {
        dispatchAvailable(GenerationProvider.WORKBUDDY);
        dispatchAvailable(GenerationProvider.LEXIANG);
    }

    @PostConstruct
    void reportMissingExecutors() {
        for (GenerationProvider provider : GenerationProvider.values()) {
            if (isProviderEnabled(provider) && !executors.containsKey(provider)) {
                LOGGER.warn("供应商已启用但未注册生成执行器，队列将保持等待: provider={}", provider);
            }
        }
    }

    void dispatchAvailable(GenerationProvider provider) {
        GenerationJobExecutor executor = executors.get(provider);
        if (executor == null || !isProviderEnabled(provider)) {
            return;
        }

        Semaphore limit = concurrencyLimits.get(provider);
        long persistedRunning = worker.countRunning(provider);
        int durableCapacity = (int) Math.max(0, maxConcurrency(provider) - persistedRunning);
        int dispatched = 0;
        while (dispatched < durableCapacity && limit.tryAcquire()) {
            Optional<GenerationJob> claimed;
            try {
                claimed = worker.claimNext(provider, workerId(provider));
            } catch (RuntimeException exception) {
                limit.release();
                LOGGER.error(
                        "生成任务领取失败: provider={}, errorType={}",
                        provider,
                        exception.getClass().getSimpleName()
                );
                return;
            }
            if (claimed.isEmpty()) {
                limit.release();
                return;
            }
            GenerationJob job = claimed.get();
            dispatched++;
            try {
                taskExecutor.submit(() -> execute(job, executor, limit));
            } catch (RejectedExecutionException exception) {
                try {
                    worker.fail(job.getId(), "运行时执行器已停止");
                } finally {
                    limit.release();
                }
                return;
            }
        }
    }

    int inFlight(GenerationProvider provider) {
        Semaphore limit = concurrencyLimits.get(provider);
        return maxConcurrency(provider) - limit.availablePermits();
    }

    private void execute(GenerationJob job, GenerationJobExecutor executor, Semaphore limit) {
        try {
            GenerationJobExecutor.ExecutionResult result = executor.execute(job);
            worker.complete(job.getId(), result.outputPath(), result.externalSessionId());
            recordVerifiedUsage(job, result.verifiedUsage());
        } catch (Exception exception) {
            LOGGER.error(
                    "生成任务执行失败: jobId={}, provider={}, errorType={}",
                    job.getId(),
                    job.getProvider(),
                    exception.getClass().getSimpleName()
            );
            try {
                worker.fail(job.getId(), "供应商任务执行失败: " + exception.getClass().getSimpleName());
            } catch (RuntimeException stateException) {
                LOGGER.error(
                        "生成任务失败状态写入失败: jobId={}, provider={}, errorType={}",
                        job.getId(),
                        job.getProvider(),
                        stateException.getClass().getSimpleName()
                );
            }
        } finally {
            limit.release();
        }
    }

    private void recordVerifiedUsage(GenerationJob job, Optional<VerifiedProviderUsage> usage) {
        usage.ifPresent(verified -> {
            try {
                usageService.recordReportedUsage(new AiUsageService.ReportedUsage(
                        job.getUserId(),
                        job.getProvider(),
                        verified.modelName(),
                        "GENERATION_" + job.getArtifactType().name(),
                        verified.requestId(),
                        verified.inputTokens(),
                        verified.outputTokens()
                ));
            } catch (RuntimeException exception) {
                LOGGER.error(
                        "供应商 Token 用量落库失败: jobId={}, provider={}, errorType={}",
                        job.getId(),
                        job.getProvider(),
                        exception.getClass().getSimpleName()
                );
            }
        });
    }

    private boolean isProviderEnabled(GenerationProvider provider) {
        return switch (provider) {
            case WORKBUDDY -> workBuddyProperties.enabled();
            case LEXIANG -> lexiangProperties.configured();
        };
    }

    private int maxConcurrency(GenerationProvider provider) {
        return switch (provider) {
            case WORKBUDDY -> workBuddyProperties.maxConcurrency();
            case LEXIANG -> lexiangProperties.maxConcurrency();
        };
    }

    private static Map<GenerationProvider, GenerationJobExecutor> indexExecutors(
            List<GenerationJobExecutor> executors
    ) {
        Map<GenerationProvider, GenerationJobExecutor> indexed = new EnumMap<>(GenerationProvider.class);
        for (GenerationJobExecutor executor : executors) {
            GenerationJobExecutor previous = indexed.put(executor.provider(), executor);
            if (previous != null) {
                throw new IllegalStateException("同一供应商只能注册一个生成执行器: " + executor.provider());
            }
        }
        return Map.copyOf(indexed);
    }

    private static String workerId(GenerationProvider provider) {
        return provider.name().toLowerCase() + "-runtime-" + UUID.randomUUID();
    }

    @PreDestroy
    public void close() {
        taskExecutor.shutdown();
    }
}
