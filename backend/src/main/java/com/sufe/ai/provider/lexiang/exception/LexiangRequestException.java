package com.sufe.ai.provider.lexiang.exception;

public final class LexiangRequestException extends LexiangClientException {

    public LexiangRequestException(String operation, int statusCode) {
        super("乐享请求被拒绝（HTTP " + statusCode + "，操作：" + operation + "）", operation, statusCode);
    }
}
