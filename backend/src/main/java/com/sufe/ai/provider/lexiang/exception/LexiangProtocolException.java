package com.sufe.ai.provider.lexiang.exception;

public final class LexiangProtocolException extends LexiangClientException {

    public LexiangProtocolException(String operation, String detail) {
        super("乐享响应格式无效（操作：" + operation + "，原因：" + detail + "）", operation, (Integer) null);
    }
}
