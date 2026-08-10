package com.sufe.ai.provider.api;

import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.account.service.AccountQuotaService;
import com.sufe.ai.provider.config.LexiangProperties;
import com.sufe.ai.provider.config.DeepSeekProperties;
import com.sufe.ai.provider.VerifiedProviderUsage;
import com.sufe.ai.provider.deepseek.DeepSeekChatResult;
import com.sufe.ai.provider.deepseek.DeepSeekArtifactBlock;
import com.sufe.ai.provider.deepseek.DeepSeekClientException;
import com.sufe.ai.provider.deepseek.DeepSeekExpertChatService;
import com.sufe.ai.provider.lexiang.LexiangAiQaClient;
import com.sufe.ai.provider.lexiang.LexiangQaCommand;
import com.sufe.ai.provider.lexiang.LexiangQaResult;
import com.sufe.ai.provider.lexiang.LexiangReferenceDoc;
import com.sufe.ai.provider.lexiang.LexiangTarget;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.usage.domain.AiUsageRecord;
import com.sufe.ai.usage.service.AiUsageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/provider")
public class ProviderGatewayController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProviderGatewayController.class);

    private final LexiangProperties lexiangProperties;
    private final DeepSeekProperties deepSeekProperties;
    private final LexiangAiQaClient lexiangAiQaClient;
    private final DeepSeekExpertChatService deepSeekExpertChatService;
    private final UserAccountRepository userAccountRepository;
    private final AiUsageService usageService;
    private final AccountQuotaService quotaService;

    public ProviderGatewayController(
            LexiangProperties lexiangProperties,
            DeepSeekProperties deepSeekProperties,
            LexiangAiQaClient lexiangAiQaClient,
            DeepSeekExpertChatService deepSeekExpertChatService,
            UserAccountRepository userAccountRepository,
            AiUsageService usageService,
            AccountQuotaService quotaService
    ) {
        this.lexiangProperties = lexiangProperties;
        this.deepSeekProperties = deepSeekProperties;
        this.lexiangAiQaClient = lexiangAiQaClient;
        this.deepSeekExpertChatService = deepSeekExpertChatService;
        this.userAccountRepository = userAccountRepository;
        this.usageService = usageService;
        this.quotaService = quotaService;
    }

    @PostMapping("/workbuddy/runs")
    public ResponseEntity<?> submitWorkBuddyRun(
            Authentication authentication,
            @Valid @RequestBody WorkBuddyRunRequest request
    ) {
        return directWorkBuddyGatewayRemoved();
    }

    @GetMapping("/workbuddy/runs/{runId}")
    public ResponseEntity<?> getWorkBuddyRun(Authentication authentication, @PathVariable String runId) {
        return directWorkBuddyGatewayRemoved();
    }

    @GetMapping("/workbuddy/runs/{runId}/result")
    public ResponseEntity<?> getWorkBuddyRunResult(Authentication authentication, @PathVariable String runId) {
        return directWorkBuddyGatewayRemoved();
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
        AiUsageRecord reservation = quotaService.reserveLexiangPpt(
                userId,
                Optional::empty,
                () -> usageService.recordReportedUsage(new AiUsageService.ReportedUsage(
                        userId,
                        GenerationProvider.LEXIANG,
                        null,
                        "PPT_KNOWLEDGE_GENERATION",
                        "lexiang-quota-reservation-" + UUID.randomUUID(),
                        0,
                        0
                ))
        ).value();
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
        if (result.verifiedUsage().isPresent()) {
            replaceReservedUsage(reservation.getId(), userId, result.verifiedUsage().orElseThrow());
        }
        return ResponseEntity.ok(new LexiangQaResponse(result.content(), result.sessionId(), result.referenceDocs()));
    }

    @GetMapping("/deepseek/status")
    public DeepSeekStatusResponse getDeepSeekStatus() {
        return new DeepSeekStatusResponse(
                deepSeekProperties.configured(),
                deepSeekProperties.flashModel(),
                deepSeekProperties.proModel()
        );
    }

    @PostMapping("/deepseek/chat")
    public ResponseEntity<?> chatWithDeepSeek(
            Authentication authentication,
            @Valid @RequestBody DeepSeekChatRequest request
    ) {
        if (!deepSeekProperties.configured()) {
            return unavailable("DEEPSEEK_DISABLED", "DeepSeek 网关未启用或凭据未配置，未发起供应商调用");
        }
        String userId = resolveUserId(authentication);
        try {
            DeepSeekChatResult result = deepSeekExpertChatService.chat(
                    userId,
                    request.ideaId(),
                    request.expertId(),
                    request.clientMessageId(),
                    request.skillName(),
                    request.artifactType(),
                    request.artifactMode()
            );
            recordVerifiedUsage(userId, GenerationProvider.DEEPSEEK, "EXPERT_CHAT", result.verifiedUsage());
            return ResponseEntity.ok(new DeepSeekChatResponse(
                    result.content(),
                    result.model(),
                    result.assistantMessageId(),
                    result.blocks(),
                    result.artifactType()
            ));
        } catch (DeepSeekClientException exception) {
            return ResponseEntity.status(exception.getResponseStatus())
                    .body(new ErrorResponse(exception.getErrorCode(), exception.getMessage()));
        }
    }

    @GetMapping("/deepseek/chat-status")
    public ResponseEntity<DeepSeekChatStatusResponse> getDeepSeekChatStatus(
            Authentication authentication,
            @RequestParam @Size(max = 36) String ideaId,
            @RequestParam @Size(max = 64) String clientMessageId
    ) {
        String userId = resolveUserId(authentication);
        return deepSeekExpertChatService.findRequest(userId, ideaId, clientMessageId)
                .map(request -> ResponseEntity.ok(new DeepSeekChatStatusResponse(
                        request.getStatus(),
                        request.getAssistantMessageId(),
                        request.getErrorMessage()
                )))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private void recordVerifiedUsage(
            String userId,
            GenerationProvider provider,
            String operation,
            Optional<VerifiedProviderUsage> usage
    ) {
        usage.ifPresent(verified -> {
            try {
                usageService.recordReportedUsage(new AiUsageService.ReportedUsage(
                        userId,
                        provider,
                        verified.modelName(),
                        operation,
                        verified.requestId(),
                        verified.inputTokens(),
                        verified.outputTokens()
                ));
            } catch (RuntimeException exception) {
                LOGGER.error(
                        "供应商 Token 用量落库失败: provider={}, requestId={}, errorType={}",
                        provider,
                        verified.requestId(),
                        exception.getClass().getSimpleName()
                );
            }
        });
    }

    private void replaceReservedUsage(String reservationId, String userId, VerifiedProviderUsage usage) {
        try {
            usageService.replaceReservation(reservationId, new AiUsageService.ReportedUsage(
                    userId,
                    GenerationProvider.LEXIANG,
                    usage.modelName(),
                    "PPT_KNOWLEDGE_GENERATION",
                    usage.requestId(),
                    usage.inputTokens(),
                    usage.outputTokens()
            ));
        } catch (RuntimeException exception) {
            LOGGER.error(
                    "乐享供应商用量替换失败: reservationId={}, providerRequestId={}, errorType={}",
                    reservationId,
                    usage.requestId(),
                    exception.getClass().getSimpleName()
            );
        }
    }

    private String resolveUserId(Authentication authentication) {
        return userAccountRepository.findByAccountIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"))
                .getId();
    }

    private static ResponseEntity<ErrorResponse> unavailable(String code, String message) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new ErrorResponse(code, message));
    }

    private static ResponseEntity<ErrorResponse> directWorkBuddyGatewayRemoved() {
        return ResponseEntity.status(HttpStatus.GONE).body(new ErrorResponse(
                "WORKBUDDY_DIRECT_GATEWAY_REMOVED",
                "Direct WorkBuddy access is disabled; submit an idempotent generation job instead"
        ));
    }

    public record WorkBuddyRunRequest(@NotBlank @Size(max = 50000) String text) {
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

    public record DeepSeekChatRequest(
            @NotBlank @Size(max = 36) String ideaId,
            @NotBlank @Size(max = 64) String expertId,
            @NotBlank @Size(max = 64) String clientMessageId,
            @Size(max = 100) String skillName,
            @Pattern(regexp = "BRAINSTORM|POSITIONING|MARKET|BP|PPT|SCRIPT|DEFENSE|MEDIA") String artifactType,
            @Pattern(regexp = "AUTO|REQUIRED") String artifactMode
    ) {
    }

    public record DeepSeekChatResponse(
            String content,
            String model,
            String assistantMessageId,
            List<DeepSeekArtifactBlock> blocks,
            String artifactType
    ) {
    }

    public record DeepSeekChatStatusResponse(String status, String assistantMessageId, String errorMessage) {
    }

    public record DeepSeekStatusResponse(boolean configured, String flashModel, String proModel) {
    }

    public record ErrorResponse(String code, String message) {
    }
}
