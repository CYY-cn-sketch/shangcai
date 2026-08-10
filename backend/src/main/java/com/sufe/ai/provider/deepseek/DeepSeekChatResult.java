package com.sufe.ai.provider.deepseek;

import com.sufe.ai.provider.VerifiedProviderUsage;

import java.util.List;
import java.util.Optional;

public record DeepSeekChatResult(
        String content,
        String model,
        Optional<VerifiedProviderUsage> verifiedUsage,
        String assistantMessageId,
        List<DeepSeekArtifactBlock> blocks,
        String artifactType
) {
    public DeepSeekChatResult(String content, String model, Optional<VerifiedProviderUsage> verifiedUsage) {
        this(content, model, verifiedUsage, null, List.of(), null);
    }

    public DeepSeekChatResult(
            String content,
            String model,
            Optional<VerifiedProviderUsage> verifiedUsage,
            String assistantMessageId
    ) {
        this(content, model, verifiedUsage, assistantMessageId, List.of(), null);
    }

    public DeepSeekChatResult(
            String content,
            String model,
            Optional<VerifiedProviderUsage> verifiedUsage,
            String assistantMessageId,
            List<DeepSeekArtifactBlock> blocks
    ) {
        this(content, model, verifiedUsage, assistantMessageId, blocks, null);
    }

    public DeepSeekChatResult {
        if (content == null || content.isBlank()) throw new IllegalArgumentException("DeepSeek content 不能为空");
        content = content.trim();
        model = model == null || model.isBlank() ? null : model.trim();
        verifiedUsage = verifiedUsage == null ? Optional.empty() : verifiedUsage;
        assistantMessageId = assistantMessageId == null || assistantMessageId.isBlank() ? null : assistantMessageId.trim();
        blocks = blocks == null ? List.of() : List.copyOf(blocks);
        artifactType = artifactType == null || artifactType.isBlank() ? null : artifactType.trim();
    }
}
