package com.sufe.ai.provider.lexiang;

import com.sufe.ai.storage.FileStorageService;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

@Component
public class LexiangRemoteFileDownloader {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "md", "png", "jpg", "jpeg"
    );

    private static final Map<String, Set<String>> ALLOWED_CONTENT_TYPES = Map.ofEntries(
            Map.entry("pdf", Set.of("application/pdf")),
            Map.entry("doc", Set.of("application/msword", "application/octet-stream")),
            Map.entry("docx", Set.of("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream")),
            Map.entry("ppt", Set.of("application/vnd.ms-powerpoint", "application/octet-stream")),
            Map.entry("pptx", Set.of("application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/octet-stream")),
            Map.entry("xls", Set.of("application/vnd.ms-excel", "application/octet-stream")),
            Map.entry("xlsx", Set.of("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream")),
            Map.entry("csv", Set.of("text/csv", "text/plain", "application/octet-stream")),
            Map.entry("txt", Set.of("text/plain", "application/octet-stream")),
            Map.entry("md", Set.of("text/markdown", "text/plain", "application/octet-stream")),
            Map.entry("png", Set.of("image/png", "application/octet-stream")),
            Map.entry("jpg", Set.of("image/jpeg", "application/octet-stream")),
            Map.entry("jpeg", Set.of("image/jpeg", "application/octet-stream"))
    );

    private final HttpClient httpClient;
    private final Predicate<URI> trustedUri;

    public LexiangRemoteFileDownloader() {
        this(
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(10))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build(),
                LexiangRemoteFileDownloader::isTrustedProductionUri
        );
    }

    LexiangRemoteFileDownloader(HttpClient httpClient, Predicate<URI> trustedUri) {
        this.httpClient = httpClient;
        this.trustedUri = trustedUri;
    }

    public DownloadedRemoteFile download(String rawUrl, String remoteName) {
        URI uri = parseAndValidateUri(rawUrl);
        String fileName = resolveFileName(remoteName, uri);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(60))
                .GET()
                .build();
        HttpResponse<InputStream> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("乐享知识文件下载被中断", exception);
        } catch (IOException exception) {
            throw new IllegalStateException("乐享知识文件下载失败", exception);
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            closeQuietly(response.body());
            if (response.statusCode() >= 300 && response.statusCode() < 400) {
                throw new IllegalStateException("乐享知识文件下载拒绝重定向");
            }
            throw new IllegalStateException("乐享知识文件下载返回状态码 " + response.statusCode());
        }

        long declaredLength = response.headers().firstValueAsLong("Content-Length").orElse(-1);
        if (declaredLength > FileStorageService.MAX_FILE_SIZE) {
            closeQuietly(response.body());
            throw new IllegalArgumentException("乐享知识文件不能超过 20 MB");
        }
        String extension = extensionOf(fileName);
        String contentType = normalizedContentType(response.headers().firstValue("Content-Type").orElse(null));
        validateContentType(extension, contentType);
        byte[] content = readLimited(response.body());
        if (content.length == 0) throw new IllegalArgumentException("乐享知识文件不能为空");
        String etag = normalizeEtag(response.headers().firstValue("ETag").orElse(null));
        return new DownloadedRemoteFile(fileName, contentType, etag, content);
    }

    private URI parseAndValidateUri(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) throw new IllegalArgumentException("乐享知识文件缺少下载地址");
        URI uri;
        try {
            uri = URI.create(rawUrl.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("乐享知识文件下载地址无效", exception);
        }
        if (!trustedUri.test(uri)) throw new IllegalArgumentException("乐享知识文件下载地址不在可信 HTTPS/COS 域名");
        return uri;
    }

    static boolean isTrustedProductionUri(URI uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) return false;
        if (uri.getRawUserInfo() != null || uri.getRawFragment() != null) return false;
        if (uri.getPort() != -1 && uri.getPort() != 443) return false;
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        boolean lexiangAsset = host.equals("file.lexiang-asset.com") || host.endsWith(".lexiang-asset.com");
        boolean cos = host.matches("[a-z0-9-]+\\.cos\\.[a-z0-9-]+\\.myqcloud\\.com");
        return lexiangAsset || cos;
    }

    private static String resolveFileName(String remoteName, URI uri) {
        String normalized = remoteName == null ? "" : remoteName.trim();
        if (normalized.isBlank() || normalized.length() > 240
                || normalized.contains("/") || normalized.contains("\\")
                || normalized.equals(".") || normalized.equals("..")
                || normalized.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("乐享知识节点文件名无效");
        }
        String extension = extensionOf(normalized);
        if (!extension.isEmpty()) {
            if (!ALLOWED_EXTENSIONS.contains(extension)) throw new IllegalArgumentException("乐享知识文件类型不受支持");
            return normalized;
        }
        String path = uri.getPath();
        String remotePathName = path == null ? "" : path.substring(path.lastIndexOf('/') + 1);
        String pathExtension = extensionOf(remotePathName);
        if (!ALLOWED_EXTENSIONS.contains(pathExtension)) {
            throw new IllegalArgumentException("乐享知识文件下载地址缺少受支持的扩展名");
        }
        String resolved = normalized + "." + pathExtension;
        if (resolved.length() > 255) throw new IllegalArgumentException("乐享知识节点文件名过长");
        return resolved;
    }

    private static byte[] readLimited(InputStream input) {
        try (input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            int read;
            while ((read = input.read(buffer)) >= 0) {
                total += read;
                if (total > FileStorageService.MAX_FILE_SIZE) {
                    throw new IllegalArgumentException("乐享知识文件不能超过 20 MB");
                }
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("读取乐享知识文件失败", exception);
        }
    }

    private static void validateContentType(String extension, String contentType) {
        if (contentType == null || contentType.isBlank()) return;
        Set<String> allowed = ALLOWED_CONTENT_TYPES.get(extension);
        if (allowed == null || !allowed.contains(contentType)) {
            throw new IllegalArgumentException("乐享知识文件 Content-Type 与扩展名不一致");
        }
    }

    private static String normalizedContentType(String value) {
        if (value == null || value.isBlank()) return null;
        return value.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
    }

    private static String extensionOf(String name) {
        int separator = name == null ? -1 : name.lastIndexOf('.');
        if (separator < 1 || separator == name.length() - 1) return "";
        return name.substring(separator + 1).toLowerCase(Locale.ROOT);
    }

    private static String normalizeEtag(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > 128 || normalized.chars().anyMatch(Character::isISOControl)) return null;
        return normalized;
    }

    private static void closeQuietly(InputStream input) {
        try {
            if (input != null) input.close();
        } catch (IOException ignored) {
            // 响应已经拒绝，关闭失败不改变安全结果。
        }
    }

    public record DownloadedRemoteFile(String fileName, String contentType, String etag, byte[] content) {
        public DownloadedRemoteFile {
            content = content == null ? new byte[0] : content.clone();
        }

        @Override
        public byte[] content() {
            return content.clone();
        }
    }
}
