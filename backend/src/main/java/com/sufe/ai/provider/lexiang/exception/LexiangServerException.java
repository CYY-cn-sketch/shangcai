package com.sufe.ai.provider.lexiang.exception;

public final class LexiangServerException extends LexiangClientException {

    public LexiangServerException(String operation, int statusCode) {
        super("乐享服务暂时不可用（HTTP " + statusCode + "，操作：" + operation + "）", operation, statusCode);
    }
}
