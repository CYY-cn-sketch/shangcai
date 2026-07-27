package com.sufe.ai.provider.deepseek;

import com.sufe.ai.provider.VerifiedProviderUsage;

import java.util.Optional;

public record DeepSeekChatResult(
        String content,
        String model,
        Optional<VerifiedProviderUsage> verifiedUsage,
        String assistantMessageId
) {
    public DeepSeekChatResult(String content, String model, Optional<VerifiedProviderUsage> verifiedUsage) {
        this(content, model, verifiedUsage, null);
    }

    public DeepSeekChatResult {
        if (content == null || content.isBlank()) throw new IllegalArgumentException("DeepSeek content 不能为空");
        content = content.trim();
        model = model == null || model.isBlank() ? null : model.trim();
        verifiedUsage = verifiedUsage == null ? Optional.empty() : verifiedUsage;
        assistantMessageId = assistantMessageId == null || assistantMessageId.isBlank() ? null : assistantMessageId.trim();
    }
}
