package com.sufe.ai.provider.lexiang;

import java.util.List;

public record LexiangQaCommand(
        String userId,
        String projectId,
        String conversationId,
        String expertId,
        String query,
        List<LexiangTarget> targets
) {
    private static final int MAX_QUERY_LENGTH = 1024;

    public LexiangQaCommand {
        userId = requireText(userId, "userId");
        projectId = requireText(projectId, "projectId");
        conversationId = requireText(conversationId, "conversationId");
        expertId = requireText(expertId, "expertId");
        query = requireText(query, "query");
        if (query.codePointCount(0, query.length()) > MAX_QUERY_LENGTH) {
            throw new IllegalArgumentException("query 长度不能超过 " + MAX_QUERY_LENGTH + " 个字符");
        }
        targets = targets == null ? List.of() : List.copyOf(targets);
        if (targets.size() > 20) {
            throw new IllegalArgumentException("targets 最多允许 20 个范围");
        }
        long targetTypeCount = targets.stream().map(LexiangTarget::type).distinct().count();
        if (targetTypeCount > 1) {
            throw new IllegalArgumentException("targets 必须使用同一种范围类型");
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
        return "LexiangQaCommand[queryLength="
                + query.codePointCount(0, query.length())
                + ", targetCount="
                + targets.size()
                + "]";
    }
}
