package com.sufe.ai.provider.lexiang;

import java.util.Set;

public record LexiangTarget(String type, String id) {

    private static final Set<String> SUPPORTED_TYPES = Set.of("team", "team_code", "space", "kb_entry");

    public LexiangTarget {
        type = requireText(type, "target.type");
        id = requireText(id, "target.id");
        if (!SUPPORTED_TYPES.contains(type)) {
            throw new IllegalArgumentException("不支持的 target.type: " + type);
        }
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    @Override
    public String toString() {
        return "LexiangTarget[type=" + type + ", id=<redacted>]";
    }
}
