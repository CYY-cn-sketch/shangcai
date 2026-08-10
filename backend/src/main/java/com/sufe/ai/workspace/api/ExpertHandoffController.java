package com.sufe.ai.workspace.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.workspace.domain.ExpertHandoff;
import com.sufe.ai.workspace.service.ExpertHandoffService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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

import java.net.URI;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/student")
public class ExpertHandoffController {

    private final ExpertHandoffService handoffService;
    private final ObjectMapper objectMapper;

    public ExpertHandoffController(ExpertHandoffService handoffService, ObjectMapper objectMapper) {
        this.handoffService = handoffService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/handoffs")
    public List<ExpertHandoffResponse> list(
            Authentication authentication,
            @RequestParam(required = false) @Size(max = 36) String ideaId,
            @RequestParam(required = false) @Size(max = 64) String targetExpertId
    ) {
        return handoffService.list(authentication.getName(), ideaId, targetExpertId).stream()
                .map(handoff -> ExpertHandoffResponse.from(handoff, objectMapper))
                .toList();
    }

    @PostMapping("/artifacts/{artifactId}/handoffs")
    public ResponseEntity<ExpertHandoffResponse> confirm(
            Authentication authentication,
            @PathVariable String artifactId,
            @Valid @RequestBody ConfirmHandoffRequest request
    ) {
        ExpertHandoffService.ConfirmResult result = handoffService.confirm(
                authentication.getName(),
                artifactId,
                request.targetExpertId()
        );
        ExpertHandoffResponse response = ExpertHandoffResponse.from(result.handoff(), objectMapper);
        if (!result.created()) return ResponseEntity.ok(response);
        return ResponseEntity.status(HttpStatus.CREATED)
                .location(URI.create("/api/student/handoffs/" + result.handoff().getId()))
                .body(response);
    }

    public record ConfirmHandoffRequest(
            @NotBlank @Size(max = 64) String targetExpertId
    ) {
    }

    public record ExpertHandoffResponse(
            String id,
            String ideaId,
            String sourceArtifactId,
            String sourceExpertId,
            String targetExpertId,
            String status,
            JsonNode payload,
            Instant confirmedAt,
            Instant createdAt,
            Instant updatedAt
    ) {
        private static ExpertHandoffResponse from(ExpertHandoff handoff, ObjectMapper objectMapper) {
            return new ExpertHandoffResponse(
                    handoff.getId(),
                    handoff.getIdeaId(),
                    handoff.getSourceArtifactId(),
                    handoff.getSourceExpertId(),
                    handoff.getTargetExpertId(),
                    handoff.getStatus(),
                    readJson(objectMapper, handoff.getPayloadJson()),
                    handoff.getConfirmedAt(),
                    handoff.getCreatedAt(),
                    handoff.getUpdatedAt()
            );
        }
    }

    private static JsonNode readJson(ObjectMapper objectMapper, String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("数据库中的专家交接 JSON 无法解析", exception);
        }
    }
}
