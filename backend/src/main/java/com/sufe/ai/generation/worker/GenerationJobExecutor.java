package com.sufe.ai.generation.worker;

import com.sufe.ai.generation.domain.GenerationJob;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.provider.VerifiedProviderUsage;

import java.util.Optional;

/**
 * 供应商生成执行器的内部契约。
 *
 * <p>真实供应商适配器实现该接口后，运行时协调器才会消费对应队列。</p>
 */
public interface GenerationJobExecutor {

    GenerationProvider provider();

    ExecutionResult execute(GenerationJob job) throws Exception;

    record ExecutionResult(
            String outputPath,
            String externalSessionId,
            Optional<VerifiedProviderUsage> verifiedUsage
    ) {
        public ExecutionResult {
            if (outputPath == null || outputPath.isBlank()) {
                throw new IllegalArgumentException("outputPath 不能为空");
            }
            outputPath = outputPath.trim();
            externalSessionId = normalizeOptional(externalSessionId);
            verifiedUsage = verifiedUsage == null ? Optional.empty() : verifiedUsage;
        }

        public static ExecutionResult completed(String outputPath, String externalSessionId) {
            return new ExecutionResult(outputPath, externalSessionId, Optional.empty());
        }

        private static String normalizeOptional(String value) {
            return value == null || value.isBlank() ? null : value.trim();
        }
    }
}
