package com.sufe.ai.workspace.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.workspace.domain.ConversationMessage;
import com.sufe.ai.workspace.domain.StudentConversation;
import com.sufe.ai.workspace.domain.StudentIdea;
import com.sufe.ai.workspace.service.StudentWorkspaceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/student")
public class StudentWorkspaceController {

    private final StudentWorkspaceService workspaceService;
    private final ObjectMapper objectMapper;

    public StudentWorkspaceController(StudentWorkspaceService workspaceService, ObjectMapper objectMapper) {
        this.workspaceService = workspaceService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/workspace")
    public WorkspaceResponse getWorkspace(Authentication authentication) {
        StudentWorkspaceService.WorkspaceData data = workspaceService.load(authentication.getName());
        Map<String, List<ConversationMessage>> messagesByConversation = data.messages().stream()
                .collect(Collectors.groupingBy(ConversationMessage::getConversationId));
        return new WorkspaceResponse(
                data.ideas().stream().map(IdeaResponse::from).toList(),
                data.conversations().stream()
                        .map(conversation -> ConversationResponse.from(
                                conversation,
                                messagesByConversation.getOrDefault(conversation.getId(), List.of()),
                                objectMapper
                        ))
                        .toList()
        );
    }

    @PostMapping("/ideas")
    public ResponseEntity<IdeaResponse> createIdea(
            Authentication authentication,
            @Valid @RequestBody CreateIdeaRequest request
    ) {
        StudentIdea idea = workspaceService.createIdea(
                authentication.getName(),
                new StudentWorkspaceService.CreateIdeaCommand(request.title(), request.description(), request.stage())
        );
        return ResponseEntity.created(URI.create("/api/student/ideas/" + idea.getId()))
                .body(IdeaResponse.from(idea));
    }

    @PatchMapping("/ideas/{ideaId}")
    public IdeaResponse updateIdea(
            Authentication authentication,
            @PathVariable String ideaId,
            @Valid @RequestBody UpdateIdeaRequest request
    ) {
        return IdeaResponse.from(workspaceService.updateIdea(
                authentication.getName(),
                ideaId,
                new StudentWorkspaceService.UpdateIdeaCommand(request.title(), request.description(), request.stage())
        ));
    }

    @DeleteMapping("/ideas/{ideaId}")
    public ResponseEntity<Void> deleteIdea(Authentication authentication, @PathVariable String ideaId) {
        workspaceService.deleteIdea(authentication.getName(), ideaId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/ideas/{ideaId}/conversation")
    public ConversationResponse saveConversation(
            Authentication authentication,
            @PathVariable String ideaId,
            @Valid @RequestBody ConversationSettingsRequest request
    ) {
        StudentConversation conversation = workspaceService.saveConversation(
                authentication.getName(),
                ideaId,
                new StudentWorkspaceService.ConversationSettingsCommand(
                        request.selectedExpertId(),
                        request.selectedSkillId(),
                        request.modelMode(),
                        request.knowledgeSelection().toString()
                )
        );
        return ConversationResponse.from(conversation, List.of(), objectMapper);
    }

    @PostMapping("/ideas/{ideaId}/messages")
    public ResponseEntity<MessageResponse> appendMessage(
            Authentication authentication,
            @PathVariable String ideaId,
            @Valid @RequestBody AppendMessageRequest request
    ) {
        StudentWorkspaceService.MessageResult result = workspaceService.appendMessage(
                authentication.getName(),
                ideaId,
                new StudentWorkspaceService.AppendMessageCommand(
                        request.clientMessageId(),
                        request.sender(),
                        request.inputMode(),
                        request.expertId(),
                        request.expertName(),
                        request.skillName(),
                        request.artifactType(),
                        request.content(),
                        request.blocks() == null || request.blocks().isNull() ? null : request.blocks().toString()
                )
        );
        MessageResponse response = MessageResponse.from(result.message(), ideaId, objectMapper);
        if (!result.created()) return ResponseEntity.ok(response);
        return ResponseEntity.status(HttpStatus.CREATED)
                .location(URI.create("/api/student/ideas/" + ideaId + "/messages/" + result.message().getId()))
                .body(response);
    }

    public record CreateIdeaRequest(
            @NotBlank @Size(max = 100) String title,
            @NotBlank @Size(max = 2_000) String description,
            @NotBlank @Size(max = 64) String stage
    ) {
    }

    public record UpdateIdeaRequest(
            @Size(min = 1, max = 100) String title,
            @Size(min = 1, max = 2_000) String description,
            @Size(min = 1, max = 64) String stage
    ) {
        @AssertTrue(message = "至少提供一个需要修改的字段")
        public boolean isAnyFieldPresent() {
            return title != null || description != null || stage != null;
        }
    }

    public record ConversationSettingsRequest(
            @NotBlank @Size(max = 64) String selectedExpertId,
            @NotBlank @Size(max = 64) String selectedSkillId,
            @NotBlank @Size(max = 32) String modelMode,
            @NotNull JsonNode knowledgeSelection
    ) {
        @AssertTrue(message = "knowledgeSelection 不能超过 10000 个字符")
        public boolean isKnowledgeSelectionSizeValid() {
            return knowledgeSelection == null || knowledgeSelection.toString().length() <= 10_000;
        }
    }

    public record AppendMessageRequest(
            @NotBlank @Size(max = 64) String clientMessageId,
            @NotBlank @Pattern(regexp = "USER|AI") String sender,
            @Size(max = 16) String inputMode,
            @Size(max = 64) String expertId,
            @Size(max = 100) String expertName,
            @Size(max = 100) String skillName,
            @Size(max = 32) String artifactType,
            @NotBlank @Size(max = 10_000) String content,
            JsonNode blocks
    ) {
        @AssertTrue(message = "blocks 不能超过 20000 个字符")
        public boolean isBlocksSizeValid() {
            return blocks == null || blocks.toString().length() <= 20_000;
        }
    }

    public record WorkspaceResponse(List<IdeaResponse> ideas, List<ConversationResponse> conversations) {
    }

    public record IdeaResponse(
            String id,
            String title,
            String description,
            String stage,
            Instant createdAt,
            Instant updatedAt
    ) {
        private static IdeaResponse from(StudentIdea idea) {
            return new IdeaResponse(
                    idea.getId(),
                    idea.getTitle(),
                    idea.getDescription(),
                    idea.getStage(),
                    idea.getCreatedAt(),
                    idea.getUpdatedAt()
            );
        }
    }

    public record ConversationResponse(
            String id,
            String ideaId,
            String selectedExpertId,
            String selectedSkillId,
            String modelMode,
            JsonNode knowledgeSelection,
            List<MessageResponse> messages,
            Instant updatedAt
    ) {
        private static ConversationResponse from(
                StudentConversation conversation,
                List<ConversationMessage> messages,
                ObjectMapper objectMapper
        ) {
            return new ConversationResponse(
                    conversation.getId(),
                    conversation.getIdeaId(),
                    conversation.getSelectedExpertId(),
                    conversation.getSelectedSkillId(),
                    conversation.getModelMode(),
                    readJson(objectMapper, conversation.getKnowledgeSelectionJson()),
                    messages.stream().map(message -> MessageResponse.from(message, conversation.getIdeaId(), objectMapper)).toList(),
                    conversation.getUpdatedAt()
            );
        }
    }

    public record MessageResponse(
            String id,
            String clientMessageId,
            String ideaId,
            String sender,
            String inputMode,
            String expertId,
            String expertName,
            String skillName,
            String artifactType,
            String content,
            JsonNode blocks,
            Instant createdAt
    ) {
        private static MessageResponse from(ConversationMessage message, String ideaId, ObjectMapper objectMapper) {
            return new MessageResponse(
                    message.getId(),
                    message.getClientMessageId(),
                    ideaId,
                    message.getSender(),
                    message.getInputMode(),
                    message.getExpertId(),
                    message.getExpertName(),
                    message.getSkillName(),
                    message.getArtifactType(),
                    message.getContent(),
                    message.getBlocksJson() == null ? null : readJson(objectMapper, message.getBlocksJson()),
                    message.getCreatedAt()
            );
        }
    }

    private static JsonNode readJson(ObjectMapper objectMapper, String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("数据库中的工作台 JSON 无法解析", exception);
        }
    }
}
