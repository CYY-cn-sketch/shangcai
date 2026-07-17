package com.sufe.ai.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.knowledge.domain.ExpertSkillUploadRecord;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class ExpertSkillUploadParser {

    static final int MAX_FILES = 20;
    static final long MAX_FILE_BYTES = 256 * 1024L;
    static final long MAX_TOTAL_BYTES = 1024 * 1024L;
    static final long MAX_ARCHIVE_BYTES = 2 * 1024 * 1024L;
    private static final int MAX_ARCHIVE_ENTRIES = 100;
    private static final int MAX_COMBINED_CHARACTERS = 250_000;
    private static final Pattern ACCENT_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final List<String> ALLOWED_EXTENSIONS = List.of(".md", ".txt", ".json");

    private final ObjectMapper objectMapper;

    public ExpertSkillUploadParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ExpertSkillUploadRecord.ParsedSkill parse(List<MultipartFile> files, List<String> relativePaths) {
        if (files == null || files.isEmpty()) throw invalid("请选择 Skill 文件夹");
        if (files.size() > MAX_FILES) throw invalid("Skill 文件夹最多读取 20 个文本配置文件");
        if (relativePaths == null || relativePaths.size() != files.size()) throw invalid("Skill 文件路径信息不完整");

        long totalBytes = 0;
        List<UploadedTextFile> textFiles = new ArrayList<>();
        for (int index = 0; index < files.size(); index++) {
            MultipartFile file = files.get(index);
            String relativePath = normalizeRelativePath(relativePaths.get(index));
            validateExtension(relativePath);
            if (file.isEmpty()) throw invalid("Skill 文件不能为空：" + relativePath);
            if (file.getSize() > MAX_FILE_BYTES) throw invalid("单个 Skill 文件不能超过 256 KB：" + relativePath);
            totalBytes += file.getSize();
            if (totalBytes > MAX_TOTAL_BYTES) throw invalid("Skill 文件夹总大小不能超过 1 MB");
            textFiles.add(new UploadedTextFile(relativePath, readUtf8(file, relativePath)));
        }

        return parseTextFiles(textFiles);
    }

    public ExpertSkillUploadRecord.ParsedSkill parseArchive(MultipartFile archive) {
        if (archive == null || archive.isEmpty()) throw invalid("请选择 Skill ZIP 压缩包");
        String fileName = archive.getOriginalFilename();
        if (fileName == null || !fileName.toLowerCase(Locale.ROOT).endsWith(".zip")) {
            throw invalid("只允许上传 .zip 格式的 Skill 压缩包");
        }
        if (archive.getSize() > MAX_ARCHIVE_BYTES) throw invalid("Skill ZIP 压缩包不能超过 2 MB");

        List<UploadedTextFile> textFiles = new ArrayList<>();
        long totalBytes = 0;
        int entryCount = 0;
        try (ZipInputStream input = new ZipInputStream(archive.getInputStream(), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                entryCount++;
                if (entryCount > MAX_ARCHIVE_ENTRIES) throw invalid("Skill ZIP 压缩包内文件过多");
                if (entry.isDirectory()) continue;

                String relativePath = normalizeRelativePath(entry.getName());
                if (!hasAllowedExtension(relativePath)) continue;
                if (textFiles.size() >= MAX_FILES) throw invalid("Skill 压缩包最多读取 20 个文本配置文件");

                byte[] bytes = readArchiveEntry(input, relativePath);
                totalBytes += bytes.length;
                if (totalBytes > MAX_TOTAL_BYTES) throw invalid("Skill 压缩包内文本总大小不能超过 1 MB");
                textFiles.add(new UploadedTextFile(relativePath, readUtf8(bytes, relativePath)));
            }
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (IOException exception) {
            throw invalid("无法读取 Skill ZIP 压缩包");
        }
        if (textFiles.isEmpty()) throw invalid("压缩包中没有可解析的 .md、.txt 或 .json 文件");
        return parseTextFiles(textFiles);
    }

    private ExpertSkillUploadRecord.ParsedSkill parseTextFiles(List<UploadedTextFile> textFiles) {
        textFiles.sort(Comparator
                .comparing((UploadedTextFile file) -> !file.path().toLowerCase(Locale.ROOT).endsWith("/skill.md")
                        && !file.path().equalsIgnoreCase("SKILL.md"))
                .thenComparing(UploadedTextFile::path, String.CASE_INSENSITIVE_ORDER));
        UploadedTextFile mainFile = textFiles.getFirst();
        String folderName = folderName(mainFile.path());
        String sourceContent = combine(textFiles, folderName, mainFile.path());
        ParsedFields fields = parseFields(mainFile, folderName);

        return new ExpertSkillUploadRecord.ParsedSkill(
                truncate(folderName, 200),
                truncate(mainFile.path(), 512),
                textFiles.size(),
                sourceContent,
                truncate(fields.name(), 100),
                truncate(fields.role(), 500),
                truncate(fields.scenario(), 300),
                fields.accent(),
                fields.systemPrompt(),
                fields.userPrompt()
        );
    }

    private static byte[] readArchiveEntry(ZipInputStream input, String relativePath) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) != -1) {
            if ((long) output.size() + read > MAX_FILE_BYTES) {
                throw invalid("单个 Skill 文件不能超过 256 KB：" + relativePath);
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private ParsedFields parseFields(UploadedTextFile mainFile, String folderName) {
        JsonNode json = parseJson(mainFile.content());
        String name = firstText(
                jsonText(json, "name"),
                jsonText(json, "expertName"),
                labeledValue(mainFile.content(), "专家名称", "名称", "Name", "name"),
                firstHeading(mainFile.content()),
                folderName
        );
        String role = firstText(
                jsonText(json, "role"),
                jsonText(json, "description"),
                labeledValue(mainFile.content(), "专家定位", "定位", "角色", "Role", "role"),
                "由教师或管理员上传的专家 Skill，仅解析文本提示词和配置。"
        );
        String scenario = firstText(
                jsonText(json, "scenario"),
                labeledValue(mainFile.content(), "适用场景", "场景", "Scenario", "scenario"),
                "课程专题指导、阶段成果生成"
        );
        String accentCandidate = firstText(
                jsonText(json, "accent"),
                labeledValue(mainFile.content(), "主题色", "Accent", "accent"),
                "#0f7b73"
        );
        String accent = ACCENT_PATTERN.matcher(accentCandidate).matches() ? accentCandidate : "#0f7b73";
        String systemPrompt = firstText(
                jsonText(json, "systemPrompt"),
                jsonText(json, "prompt"),
                sectionValue(mainFile.content(), "系统提示词", "System Prompt"),
                mainFile.content()
        );
        String userPrompt = firstText(
                jsonText(json, "userPrompt"),
                sectionValue(mainFile.content(), "用户提示词", "User Prompt")
        );
        return new ParsedFields(name, role, scenario, accent, systemPrompt, userPrompt);
    }

    private JsonNode parseJson(String content) {
        String trimmed = content.trim();
        if (!trimmed.startsWith("{")) return null;
        try {
            JsonNode parsed = objectMapper.readTree(trimmed);
            return parsed != null && parsed.isObject() ? parsed : null;
        } catch (IOException ignored) {
            return null;
        }
    }

    private static String jsonText(JsonNode node, String field) {
        if (node == null) return null;
        JsonNode value = node.get(field);
        return value != null && value.isTextual() ? normalizeOptional(value.asText()) : null;
    }

    private static String labeledValue(String content, String... labels) {
        for (String rawLine : content.split("\\R")) {
            String line = rawLine.trim().replaceFirst("^[-*]\\s*", "").replaceFirst("^#{1,6}\\s*", "");
            for (String label : labels) {
                if (line.startsWith(label + "：") || line.startsWith(label + ":")) {
                    return normalizeOptional(line.substring(label.length() + 1));
                }
            }
        }
        return null;
    }

    private static String firstHeading(String content) {
        for (String rawLine : content.split("\\R")) {
            String line = rawLine.trim();
            if (line.matches("^#{1,3}\\s+.+")) return normalizeOptional(line.replaceFirst("^#{1,3}\\s+", ""));
        }
        return null;
    }

    private static String sectionValue(String content, String... titles) {
        String[] lines = content.split("\\R");
        for (int index = 0; index < lines.length; index++) {
            String heading = lines[index].trim().replaceFirst("^#{1,6}\\s*", "").replace("：", "").replace(":", "").trim();
            for (String title : titles) {
                if (!heading.equalsIgnoreCase(title)) continue;
                StringBuilder section = new StringBuilder();
                for (int next = index + 1; next < lines.length; next++) {
                    if (lines[next].trim().matches("^#{1,6}\\s+.+")) break;
                    if (!lines[next].isBlank() || !section.isEmpty()) section.append(lines[next]).append('\n');
                }
                String value = normalizeOptional(section.toString());
                if (value != null) return value;
            }
        }
        return null;
    }

    private static String combine(List<UploadedTextFile> files, String folderName, String mainFilePath) {
        StringBuilder combined = new StringBuilder()
                .append("Skill 文件夹：").append(folderName).append('\n')
                .append("主文件：").append(mainFilePath).append("\n\n");
        for (UploadedTextFile file : files) {
            combined.append("---\n文件：").append(file.path()).append("\n\n").append(file.content()).append("\n\n");
            if (combined.length() > MAX_COMBINED_CHARACTERS) throw invalid("解析后的 Skill 文本不能超过 250000 个字符");
        }
        return combined.toString().trim();
    }

    private static String readUtf8(MultipartFile file, String relativePath) {
        try {
            return readUtf8(file.getBytes(), relativePath);
        } catch (IOException exception) {
            throw invalid("无法读取 Skill 文件：" + relativePath);
        }
    }

    private static String readUtf8(byte[] bytes, String relativePath) {
        try {
            String content = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
            if (content.startsWith("\uFEFF")) content = content.substring(1);
            if (content.indexOf('\0') >= 0) throw invalid("Skill 文件必须是纯文本：" + relativePath);
            if (content.isBlank()) throw invalid("Skill 文件不能为空：" + relativePath);
            return content.trim();
        } catch (CharacterCodingException exception) {
            throw invalid("Skill 文件必须使用 UTF-8 编码：" + relativePath);
        }
    }

    private static String normalizeRelativePath(String rawPath) {
        if (rawPath == null) throw invalid("Skill 文件路径不能为空");
        String path = rawPath.trim().replace('\\', '/');
        if (path.isBlank() || path.length() > 512 || path.startsWith("/") || path.matches("^[A-Za-z]:.*")) {
            throw invalid("Skill 文件路径无效");
        }
        for (String part : path.split("/")) {
            if (part.isBlank() || part.equals(".") || part.equals("..") || part.chars().anyMatch(Character::isISOControl)) {
                throw invalid("Skill 文件路径无效");
            }
        }
        return path;
    }

    private static void validateExtension(String path) {
        if (!hasAllowedExtension(path)) {
            throw invalid("只允许上传 .md、.txt、.json 文本配置文件");
        }
    }

    private static boolean hasAllowedExtension(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        return ALLOWED_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private static String folderName(String path) {
        int separator = path.indexOf('/');
        String candidate = separator > 0 ? path.substring(0, separator) : path.replaceFirst("(?i)\\.(md|txt|json)$", "");
        return candidate.isBlank() ? "专家 Skill" : candidate;
    }

    private static String truncate(String value, int maxLength) {
        String normalized = value == null ? "" : value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private static String firstText(String... values) {
        for (String value : values) {
            String normalized = normalizeOptional(value);
            if (normalized != null) return normalized;
        }
        return null;
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static IllegalArgumentException invalid(String message) {
        return new IllegalArgumentException(message);
    }

    private record UploadedTextFile(String path, String content) {
    }

    private record ParsedFields(String name, String role, String scenario, String accent, String systemPrompt, String userPrompt) {
    }
}
