package com.sufe.ai.provider.lexiang.exception;

public final class LexiangAuthorizationException extends LexiangClientException {

    public LexiangAuthorizationException(String operation) {
        super("乐享拒绝访问（HTTP 403，操作：" + operation + "）", operation, 403);
    }
}
