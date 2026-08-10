package com.sufe.ai.provider.lexiang;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LexiangReferenceDoc(String title, String url, String content) {

    @Override
    public String toString() {
        return "LexiangReferenceDoc[titleLength="
                + length(title)
                + ", hasUrl="
                + (url != null && !url.isBlank())
                + ", contentLength="
                + length(content)
                + "]";
    }

    private static int length(String value) {
        return value == null ? 0 : value.codePointCount(0, value.length());
    }
}
