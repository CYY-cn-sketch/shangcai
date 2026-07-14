package com.sufe.ai.workspace.service;

import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.workspace.domain.ConversationMessage;
import com.sufe.ai.workspace.domain.StudentConversation;
import com.sufe.ai.workspace.domain.StudentIdea;
import com.sufe.ai.workspace.repository.ConversationMessageRepository;
import com.sufe.ai.workspace.repository.StudentConversationRepository;
import com.sufe.ai.workspace.repository.StudentIdeaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class StudentWorkspaceService {

    private final UserAccountRepository userAccountRepository;
    private final StudentIdeaRepository ideaRepository;
    private final StudentConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;

    public StudentWorkspaceService(
            UserAccountRepository userAccountRepository,
            StudentIdeaRepository ideaRepository,
            StudentConversationRepository conversationRepository,
            ConversationMessageRepository messageRepository
    ) {
        this.userAccountRepository = userAccountRepository;
        this.ideaRepository = ideaRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    @Transactional(readOnly = true)
    public WorkspaceData load(String accountName) {
        String userId = resolveUserId(accountName);
        return new WorkspaceData(
                ideaRepository.findAllByUserIdOrderByUpdatedAtDesc(userId),
                conversationRepository.findAllByUserIdOrderByUpdatedAtDesc(userId),
                messageRepository.findAllByUserIdOrderByCreatedAtAscIdAsc(userId)
        );
    }

    @Transactional
    public StudentIdea createIdea(String accountName, CreateIdeaCommand command) {
        String userId = resolveUserId(accountName);
        return ideaRepository.save(StudentIdea.create(userId, command.title(), command.description(), command.stage()));
    }

    @Transactional
    public StudentIdea updateIdea(String accountName, String ideaId, UpdateIdeaCommand command) {
        String userId = resolveUserId(accountName);
        StudentIdea idea = requireOwnedIdea(userId, ideaId);
        idea.update(
                command.title() == null ? idea.getTitle() : command.title(),
                command.description() == null ? idea.getDescription() : command.description(),
                command.stage() == null ? idea.getStage() : command.stage()
        );
        return idea;
    }

    @Transactional
    public void deleteIdea(String accountName, String ideaId) {
        String userId = resolveUserId(accountName);
        ideaRepository.delete(requireOwnedIdea(userId, ideaId));
    }

    @Transactional
    public StudentConversation saveConversation(
            String accountName,
            String ideaId,
            ConversationSettingsCommand command
    ) {
        String userId = resolveUserId(accountName);
        requireOwnedIdea(userId, ideaId);
        StudentConversation conversation = conversationRepository.findByUserIdAndIdeaId(userId, ideaId)
                .orElseGet(() -> StudentConversation.create(userId, ideaId));
        conversation.updateSettings(
                command.selectedExpertId(),
                command.selectedSkillId(),
                command.modelMode(),
                command.knowledgeSelectionJson()
        );
        return conversationRepository.save(conversation);
    }

    @Transactional
    public MessageResult appendMessage(String accountName, String ideaId, AppendMessageCommand command) {
        String userId = resolveUserId(accountName);
        requireOwnedIdea(userId, ideaId);

        ConversationMessage existing = messageRepository
                .findByUserIdAndClientMessageId(userId, command.clientMessageId())
                .orElse(null);
        if (existing != null) {
            StudentConversation conversation = conversationRepository.findById(existing.getConversationId())
                    .orElseThrow(() -> new WorkspaceResourceNotFoundException("对话不存在"));
            return new MessageResult(conversation, existing, false);
        }

        StudentConversation conversation = conversationRepository.findByUserIdAndIdeaId(userId, ideaId)
                .orElseGet(() -> conversationRepository.save(StudentConversation.create(userId, ideaId)));
        ConversationMessage message = ConversationMessage.create(
                userId,
                conversation.getId(),
                command.clientMessageId(),
                command.sender(),
                command.inputMode(),
                command.expertId(),
                command.expertName(),
                command.skillName(),
                command.artifactType(),
                command.content(),
                command.blocksJson()
        );
        return new MessageResult(conversation, messageRepository.save(message), true);
    }

    private StudentIdea requireOwnedIdea(String userId, String ideaId) {
        return ideaRepository.findByIdAndUserId(ideaId, userId)
                .orElseThrow(() -> new WorkspaceResourceNotFoundException("创意不存在"));
    }

    private String resolveUserId(String accountName) {
        return userAccountRepository.findByAccountIgnoreCase(accountName)
                .orElseThrow(() -> new IllegalStateException("认证账号不存在"))
                .getId();
    }

    public record WorkspaceData(
            List<StudentIdea> ideas,
            List<StudentConversation> conversations,
            List<ConversationMessage> messages
    ) {
    }

    public record CreateIdeaCommand(String title, String description, String stage) {
    }

    public record UpdateIdeaCommand(String title, String description, String stage) {
    }

    public record ConversationSettingsCommand(
            String selectedExpertId,
            String selectedSkillId,
            String modelMode,
            String knowledgeSelectionJson
    ) {
    }

    public record AppendMessageCommand(
            String clientMessageId,
            String sender,
            String inputMode,
            String expertId,
            String expertName,
            String skillName,
            String artifactType,
            String content,
            String blocksJson
    ) {
    }

    public record MessageResult(StudentConversation conversation, ConversationMessage message, boolean created) {
    }
}
