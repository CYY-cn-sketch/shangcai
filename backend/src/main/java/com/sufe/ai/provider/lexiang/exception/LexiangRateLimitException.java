package com.sufe.ai.provider.lexiang.exception;

public final class LexiangRateLimitException extends LexiangClientException {

    private final Long retryAfterSeconds;

    public LexiangRateLimitException(String operation, Long retryAfterSeconds) {
        super("乐享请求过于频繁或额度不足（HTTP 429，操作：" + operation + "）", operation, 429);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public Long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
