package com.sufe.ai.provider.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.config.WorkBuddyProperties;
import com.sufe.ai.provider.lexiang.LexiangAiQaClient;
import com.sufe.ai.provider.lexiang.LexiangQaCommand;
import com.sufe.ai.provider.lexiang.LexiangQaResult;
import com.sufe.ai.provider.lexiang.LexiangReferenceDoc;
import com.sufe.ai.provider.lexiang.LexiangTarget;
import com.sufe.ai.provider.workbuddy.WorkBuddyApiException;
import com.sufe.ai.provider.workbuddy.WorkBuddyClient;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/provider")
public class ProviderGatewayController {

    private final WorkBuddyProperties workBuddyProperties;
    private final LexiangProperties lexiangProperties;
    private final WorkBuddyClient workBuddyClient;
    private final LexiangAiQaClient lexiangAiQaClient;
    private final UserAccountRepository userAccountRepository;

    public ProviderGatewayController(
            WorkBuddyProperties workBuddyProperties,
            LexiangProperties lexiangProperties,
            WorkBuddyClient workBuddyClient,
            LexiangAiQaClient lexiangAiQaClient,
            UserAccountRepository userAccountRepository
    ) {
        this.workBuddyProperties = workBuddyProperties;
        this.lexiangProperties = lexiangProperties;
        this.workBuddyClient = workBuddyClient;
        this.lexiangAiQaClient = lexiangAiQaClient;
        this.userAccountRepository = userAccountRepository;
    }

    @PostMapping("/workbuddy/runs")
    public ResponseEntity<?> submitWorkBuddyRun(
            Authentication authentication,
            @Valid @RequestBody WorkBuddyRunRequest request
    ) {
        if (!workBuddyProperties.enabled()) {
            return unavailable("WORKBUDDY_DISABLED", "WorkBuddy 网关未启用，未发起供应商调用");
        }
        String userId = resolveUserId(authentication);
        try {
            WorkBuddyClient.RunSubmission submission = workBuddyClient.submit(
                    request.text(),
                    new WorkBuddyClient.Sender(userId, authentication.getName())
            );
            return ResponseEntity.accepted().body(new WorkBuddyRunResponse(submission.runId()));
        } catch (WorkBuddyApiException exception) {
            return ResponseEntity.status(exception.getStatusCode())
                    .body(new ErrorResponse(
                            exception.getErrorCode() == null ? "WORKBUDDY_ERROR" : exception.getErrorCode(),
                            exception.getMessage()
                    ));
        }
    }

    @GetMapping("/workbuddy/runs/{runId}")
    public ResponseEntity<?> getWorkBuddyRun(@PathVariable String runId) {
        if (!workBuddyProperties.enabled()) {
            return unavailable("WORKBUDDY_DISABLED", "WorkBuddy 网关未启用，未发起供应商调用");
        }
        try {
            WorkBuddyClient.RunStatus status = workBuddyClient.getRun(runId);
            return ResponseEntity.ok(new WorkBuddyStatusResponse(status.runId(), status.data()));
        } catch (WorkBuddyApiException exception) {
            return ResponseEntity.status(exception.getStatusCode())
                    .body(new ErrorResponse(
                            exception.getErrorCode() == null ? "WORKBUDDY_ERROR" : exception.getErrorCode(),
                            exception.getMessage()
                    ));
        }
    }

    @PostMapping("/lexiang/qa")
    public ResponseEntity<?> askLexiang(
            Authentication authentication,
            @Valid @RequestBody LexiangQaRequest request
    ) {
        if (!lexiangProperties.configured()) {
            return unavailable("LEXIANG_DISABLED", "乐享网关未启用或凭据未配置，未发起供应商调用");
        }
        String userId = resolveUserId(authentication);
        LexiangQaResult result = lexiangAiQaClient.ask(new LexiangQaCommand(
                userId,
                request.projectId(),
                request.conversationId(),
                request.expertId(),
                request.query(),
                request.targets() == null
                        ? List.of()
                        : request.targets().stream().map(target -> new LexiangTarget(target.type(), target.id())).toList()
        ));
        return ResponseEntity.ok(new LexiangQaResponse(result.content(), result.sessionId(), result.referenceDocs()));
    }

    private String resolveUserId(Authentication authentication) {
        return userAccountRepository.findByAccountIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"))
                .getId();
    }

    private static ResponseEntity<ErrorResponse> unavailable(String code, String message) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new ErrorResponse(code, message));
    }

    public record WorkBuddyRunRequest(@NotBlank @Size(max = 50000) String text) {
    }

    public record WorkBuddyRunResponse(String runId) {
    }

    public record WorkBuddyStatusResponse(String runId, JsonNode data) {
    }

    public record LexiangQaRequest(
            @NotBlank @Size(max = 64) String projectId,
            @NotBlank @Size(max = 64) String conversationId,
            @NotBlank @Size(max = 64) String expertId,
            @NotBlank @Size(max = 1024) String query,
            List<@Valid LexiangTargetRequest> targets
    ) {
    }

    public record LexiangTargetRequest(
            @NotBlank @Size(max = 32) String type,
            @NotBlank @Size(max = 128) String id
    ) {
    }

    public record LexiangQaResponse(
            String content,
            String sessionId,
            @NotNull List<LexiangReferenceDoc> referenceDocs
    ) {
    }

    public record ErrorResponse(String code, String message) {
    }
}
