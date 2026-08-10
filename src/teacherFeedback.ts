export function selectIdeaFeedbackSubmissions<T extends { ideaId: string }>(submissions: T[], ideaId: string) {
  return submissions.filter((submission) => submission.ideaId === ideaId);
}

export function findFeedbackSourceConversationId<
  T extends { id: string; clientMessageId?: string; conversationId?: string },
>(messages: T[], sourceMessageId?: string) {
  if (!sourceMessageId) return undefined;
  return messages.find(
    (message) => message.id === sourceMessageId || message.clientMessageId === sourceMessageId,
  )?.conversationId;
}
