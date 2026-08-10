package com.sufe.ai.provider.lexiang.exception;

public final class LexiangAuthenticationException extends LexiangClientException {

    public LexiangAuthenticationException(String operation) {
        super("乐享认证失败（HTTP 401，操作：" + operation + "）", operation, 401);
    }
}
