package com.sufe.ai.provider.deepseek;

import java.util.List;

public record DeepSeekArtifactBlock(String title, List<String> items) {
    public DeepSeekArtifactBlock {
        title = title == null || title.isBlank() ? "阶段成果" : title.trim();
        items = items == null
                ? List.of()
                : items.stream().filter(item -> item != null && !item.isBlank()).map(String::trim).toList();
    }
}
