package com.sufe.ai.provider.lexiang;

import java.util.List;
import java.util.Optional;

import com.sufe.ai.provider.VerifiedProviderUsage;

public record LexiangQaResult(
        String content,
        String sessionId,
        List<LexiangReferenceDoc> referenceDocs,
        Optional<VerifiedProviderUsage> verifiedUsage
) {
    public LexiangQaResult {
        content = requireText(content, "content");
        sessionId = requireText(sessionId, "sessionId");
        referenceDocs = referenceDocs == null ? List.of() : List.copyOf(referenceDocs);
        verifiedUsage = verifiedUsage == null ? Optional.empty() : verifiedUsage;
    }

    public LexiangQaResult(String content, String sessionId, List<LexiangReferenceDoc> referenceDocs) {
        this(content, sessionId, referenceDocs, Optional.empty());
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    @Override
    public String toString() {
        return "LexiangQaResult[contentLength="
                + content.codePointCount(0, content.length())
                + ", hasSessionId=true, referenceCount="
                + referenceDocs.size()
                + "]";
    }
}
