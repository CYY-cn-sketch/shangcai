package com.sufe.ai.operations.api;

import com.sufe.ai.operations.service.AdminOperationsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/operations")
public class AdminOperationsController {

    private final AdminOperationsService operationsService;

    public AdminOperationsController(AdminOperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @GetMapping
    public AdminOperationsService.OperationsReport report() {
        return operationsService.report();
    }
}
