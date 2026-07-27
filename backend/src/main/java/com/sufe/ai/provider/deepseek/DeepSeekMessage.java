package com.sufe.ai.provider.deepseek;

public record DeepSeekMessage(String role, String content) {
    public DeepSeekMessage {
        role = requireText(role, "role");
        content = requireText(content, "content");
        if (!role.equals("system") && !role.equals("user") && !role.equals("assistant")) {
            throw new IllegalArgumentException("DeepSeek 消息角色不受支持");
        }
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(fieldName + " 不能为空");
        return value.trim();
    }
}
