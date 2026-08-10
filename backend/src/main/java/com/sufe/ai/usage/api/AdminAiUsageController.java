package com.sufe.ai.usage.api;

import com.sufe.ai.usage.service.AiUsageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai-usage")
public class AdminAiUsageController {

    private final AiUsageService usageService;

    public AdminAiUsageController(AiUsageService usageService) {
        this.usageService = usageService;
    }

    @GetMapping
    public AiUsageService.UsageReport report(
            @RequestParam(defaultValue = "LAST_30_DAYS") AiUsageService.UsageRange range
    ) {
        return usageService.report(range);
    }
}
