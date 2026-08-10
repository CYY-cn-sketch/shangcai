package com.sufe.ai.provider.deepseek;

import java.util.List;

public record DeepSeekChatCommand(
        String userId,
        String model,
        boolean thinkingEnabled,
        String reasoningEffort,
        List<DeepSeekMessage> messages
) {
    public DeepSeekChatCommand {
        userId = requireText(userId, "userId");
        model = requireText(model, "model");
        reasoningEffort = requireText(reasoningEffort, "reasoningEffort");
        messages = messages == null ? List.of() : List.copyOf(messages);
        if (messages.isEmpty()) throw new IllegalArgumentException("DeepSeek messages 不能为空");
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(fieldName + " 不能为空");
        return value.trim();
    }
}
