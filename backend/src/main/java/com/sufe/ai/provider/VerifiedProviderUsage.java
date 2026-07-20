package com.sufe.ai.provider;

/**
 * 供应商响应中明确返回且可核验的 Token 用量。
 *
 * <p>不得使用字符数、字节数或本地分词估算构造此对象。</p>
 */
public record VerifiedProviderUsage(
        String requestId,
        String modelName,
        long inputTokens,
        long outputTokens
) {
    public VerifiedProviderUsage {
        requestId = requireText(requestId, "requestId");
        modelName = normalizeOptional(modelName);
        if (inputTokens < 0 || outputTokens < 0) {
            throw new IllegalArgumentException("Token 用量不能为负数");
        }
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
