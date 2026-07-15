package com.sufe.ai.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    public static final long MAX_FILE_SIZE = 20L * 1024 * 1024;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "md", "png", "jpg", "jpeg"
    );

    private static final Map<String, String> MIME_TYPES = Map.ofEntries(
            Map.entry("pdf", "application/pdf"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("ppt", "application/vnd.ms-powerpoint"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("xls", "application/vnd.ms-excel"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("csv", "text/csv"),
            Map.entry("txt", "text/plain"),
            Map.entry("md", "text/markdown"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg")
    );

    private final Path root;

    public FileStorageService(@Value("${sufe.storage.files-root:./data/files}") String filesRoot) {
        this.root = Path.of(filesRoot).toAbsolutePath().normalize();
    }

    public StoredFile storeKnowledgeFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("上传文件不能超过 20 MB");
        }

        String originalName = normalizeOriginalName(file.getOriginalFilename());
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("不支持该文件格式");
        }

        String directoryId = UUID.randomUUID().toString();
        String fileId = UUID.randomUUID().toString();
        Path directory = root.resolve("knowledge").resolve(directoryId).normalize();
        if (!directory.startsWith(root)) {
            throw new IllegalStateException("文件存储路径无效");
        }
        Files.createDirectories(directory);
        Path target = directory.resolve(fileId + "." + extension);
        Path temporary = directory.resolve(fileId + ".tmp");
        MessageDigest digest = sha256();
        long size = 0;

        try (InputStream input = file.getInputStream(); var output = Files.newOutputStream(temporary)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                size += read;
                if (size > MAX_FILE_SIZE) {
                    throw new IllegalArgumentException("上传文件不能超过 20 MB");
                }
                digest.update(buffer, 0, read);
                output.write(buffer, 0, read);
            }
        } catch (RuntimeException | IOException exception) {
            Files.deleteIfExists(temporary);
            deleteEmptyDirectory(directory);
            throw exception;
        }

        try {
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(temporary, target);
        }

        String storageKey = root.relativize(target).toString().replace('\\', '/');
        return new StoredFile(
                storageKey,
                originalName,
                MIME_TYPES.get(extension),
                size,
                HexFormat.of().formatHex(digest.digest())
        );
    }

    public Resource load(String storageKey) {
        Path file = resolveStorageKey(storageKey);
        if (!Files.isRegularFile(file)) {
            throw new IllegalStateException("文件不存在或已失效");
        }
        return new FileSystemResource(file);
    }

    public void delete(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) return;
        Path file = resolveStorageKey(storageKey);
        try {
            Files.deleteIfExists(file);
            deleteEmptyDirectory(file.getParent());
        } catch (IOException ignored) {
            // 数据库记录已经删除时，残留文件可由后续运维清理，不影响业务事务。
        }
    }

    private Path resolveStorageKey(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IllegalArgumentException("文件存储标识不能为空");
        }
        Path file = root.resolve(storageKey).normalize();
        if (!file.startsWith(root)) {
            throw new IllegalArgumentException("文件存储标识无效");
        }
        return file;
    }

    private static String normalizeOriginalName(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("文件名不能为空");
        }
        String normalized = value.replace('\\', '/');
        String name = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
        if (name.isBlank() || name.length() > 255 || name.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("文件名无效或过长");
        }
        return name;
    }

    private static String extensionOf(String name) {
        int separator = name.lastIndexOf('.');
        if (separator < 1 || separator == name.length() - 1) return "";
        return name.substring(separator + 1).toLowerCase(Locale.ROOT);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("当前 Java 运行时不支持 SHA-256", exception);
        }
    }

    private static void deleteEmptyDirectory(Path directory) {
        if (directory == null) return;
        try (var entries = Files.list(directory)) {
            if (entries.findAny().isEmpty()) Files.deleteIfExists(directory);
        } catch (IOException ignored) {
            // 空目录不影响文件安全或下载行为。
        }
    }

    public record StoredFile(
            String storageKey,
            String originalName,
            String mimeType,
            long size,
            String sha256
    ) {
    }
}
