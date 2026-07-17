package com.sufe.ai.knowledge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sufe.ai.knowledge.domain.ExpertSkillFileRole;
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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class ExpertSkillUploadParser {

    static final int MAX_FILES = 50;
    static final long MAX_FILE_BYTES = 20L * 1024 * 1024;
    static final long MAX_TOTAL_BYTES = 50L * 1024 * 1024;
    static final long MAX_ARCHIVE_BYTES = 20L * 1024 * 1024;
    private static final long MAX_TEXT_BYTES = 1024 * 1024L;
    private static final int MAX_ARCHIVE_ENTRIES = 100;
    private static final int MAX_COMBINED_CHARACTERS = 20_000;
    private static final Pattern ACCENT_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "md", "json", "yaml", "yml",
            "png", "jpg", "jpeg"
    );
    private static final Set<String> TEXT_EXTENSIONS = Set.of("csv", "txt", "md", "json", "yaml", "yml");
    private static final Set<String> KNOWLEDGE_DIRECTORIES = Set.of("references", "knowledge", "docs");

    private final ObjectMapper objectMapper;

    public ExpertSkillUploadParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ParsedUpload parse(List<MultipartFile> files, List<String> relativePaths) {
        if (files == null || files.isEmpty()) throw invalid("请选择 Skill 文件夹");
        if (files.size() > MAX_FILES) throw invalid("Skill 文件夹最多保存 50 个文件");
        if (relativePaths == null || relativePaths.size() != files.size()) throw invalid("Skill 文件路径信息不完整");

        long totalBytes = 0;
        long textBytes = 0;
        List<ParsedFile> parsedFiles = new ArrayList<>();
        Set<String> uniquePaths = new HashSet<>();
        for (int index = 0; index < files.size(); index++) {
            MultipartFile file = files.get(index);
            String relativePath = normalizeRelativePath(relativePaths.get(index));
            validateUniquePath(uniquePaths, relativePath);
            validateExtension(relativePath);
            if (file.isEmpty()) throw invalid("Skill 文件不能为空：" + relativePath);
            if (file.getSize() > MAX_FILE_BYTES) throw invalid("单个 Skill 文件不能超过 20 MB：" + relativePath);
            totalBytes += file.getSize();
            if (totalBytes > MAX_TOTAL_BYTES) throw invalid("Skill 文件夹解压后总大小不能超过 50 MB");
            byte[] content = readBytes(file, relativePath);
            if (isTextFile(relativePath)) {
                textBytes += content.length;
                if (textBytes > MAX_TEXT_BYTES) throw invalid("Skill 文本配置总大小不能超过 1 MB");
            }
            parsedFiles.add(toParsedFile(relativePath, content));
        }
        return parseFiles(parsedFiles);
    }

    public ParsedUpload parseArchive(MultipartFile archive) {
        if (archive == null || archive.isEmpty()) throw invalid("请选择 Skill ZIP 压缩包");
        String fileName = archive.getOriginalFilename();
        if (fileName == null || !fileName.toLowerCase(Locale.ROOT).endsWith(".zip")) {
            throw invalid("只允许上传 .zip 格式的 Skill 压缩包");
        }
        if (archive.getSize() > MAX_ARCHIVE_BYTES) throw invalid("Skill ZIP 压缩包不能超过 20 MB");

        List<ParsedFile> parsedFiles = new ArrayList<>();
        Set<String> uniquePaths = new HashSet<>();
        long totalBytes = 0;
        long textBytes = 0;
        int entryCount = 0;
        try (ZipInputStream input = new ZipInputStream(archive.getInputStream(), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                entryCount++;
                if (entryCount > MAX_ARCHIVE_ENTRIES) throw invalid("Skill ZIP 压缩包内条目过多");
                if (entry.isDirectory() || isSystemMetadata(entry.getName())) continue;
                if (parsedFiles.size() >= MAX_FILES) throw invalid("Skill 压缩包最多保存 50 个文件");

                String relativePath = normalizeRelativePath(entry.getName());
                validateUniquePath(uniquePaths, relativePath);
                validateExtension(relativePath);
                byte[] content = readArchiveEntry(input, relativePath);
                if (content.length == 0) throw invalid("Skill 文件不能为空：" + relativePath);
                totalBytes += content.length;
                if (totalBytes > MAX_TOTAL_BYTES) throw invalid("Skill 压缩包解压后总大小不能超过 50 MB");
                if (isTextFile(relativePath)) {
                    textBytes += content.length;
                    if (textBytes > MAX_TEXT_BYTES) throw invalid("Skill 文本配置总大小不能超过 1 MB");
                }
                parsedFiles.add(toParsedFile(relativePath, content));
            }
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (IOException exception) {
            throw invalid("无法读取 Skill ZIP 压缩包");
        }
        if (parsedFiles.isEmpty()) throw invalid("压缩包中没有可保存的 Skill 文件");
        return parseFiles(parsedFiles);
    }

    private ParsedUpload parseFiles(List<ParsedFile> files) {
        files.sort(Comparator.comparing(ParsedFile::relativePath, String.CASE_INSENSITIVE_ORDER));
        ParsedFile mainFile = files.stream()
                .filter(file -> file.fileRole() == ExpertSkillFileRole.PROMPT)
                .min(Comparator.comparingInt(file -> file.relativePath().length()))
                .orElseThrow(() -> invalid("Skill 文件夹必须包含 SKILL.md"));
        String folderName = folderName(mainFile.relativePath());
        List<ParsedFile> promptAndConfigFiles = files.stream()
                .filter(file -> file.contentText() != null)
                .filter(file -> file.fileRole() == ExpertSkillFileRole.PROMPT || file.fileRole() == ExpertSkillFileRole.CONFIG)
                .toList();
        String sourceContent = combine(promptAndConfigFiles, folderName, mainFile.relativePath());
        ParsedFields fields = parseFields(mainFile, files, folderName);

        ExpertSkillUploadRecord.ParsedSkill skill = new ExpertSkillUploadRecord.ParsedSkill(
                truncate(folderName, 200),
                truncate(mainFile.relativePath(), 512),
                files.size(),
                sourceContent,
                truncate(fields.name(), 100),
                truncate(fields.role(), 500),
                truncate(fields.scenario(), 300),
                fields.accent(),
                fields.systemPrompt(),
                fields.userPrompt(),
                truncate(fields.skillName(), 100),
                truncate(fields.skillDescription(), 500),
                fields.knowledgeRule(),
                fields.outputFormat(),
                fields.boundaries()
        );
        return new ParsedUpload(skill, List.copyOf(files));
    }

    private ParsedFields parseFields(ParsedFile mainFile, List<ParsedFile> files, String folderName) {
        JsonNode json = files.stream()
                .filter(file -> file.fileRole() == ExpertSkillFileRole.CONFIG)
                .filter(file -> extensionOf(file.relativePath()).equals("json"))
                .map(ParsedFile::contentText)
                .map(this::parseJson)
                .filter(node -> node != null)
                .findFirst()
                .orElse(null);
        String mainContent = mainFile.contentText();
        String name = firstText(
                jsonText(json, "name"),
                jsonText(json, "expertName"),
                labeledValue(mainContent, "专家名称", "名称", "Name", "name"),
                firstHeading(mainContent),
                folderName
        );
        String role = firstText(
                jsonText(json, "role"),
                jsonText(json, "description"),
                labeledValue(mainContent, "专家定位", "定位", "角色", "Role", "role"),
                "由教师或管理员上传的专家 Skill，仅解析提示词和配置。"
        );
        String scenario = firstText(
                jsonText(json, "scenario"),
                labeledValue(mainContent, "适用场景", "场景", "Scenario", "scenario"),
                "课程专题指导、阶段成果生成"
        );
        String accentCandidate = firstText(
                jsonText(json, "accent"),
                labeledValue(mainContent, "主题色", "Accent", "accent"),
                "#0f7b73"
        );
        String accent = ACCENT_PATTERN.matcher(accentCandidate).matches() ? accentCandidate : "#0f7b73";
        String systemPrompt = firstText(
                jsonText(json, "systemPrompt"),
                jsonText(json, "prompt"),
                sectionValue(mainContent, "系统提示词", "System Prompt"),
                mainContent
        );
        String userPrompt = firstText(
                jsonText(json, "userPrompt"),
                sectionValue(mainContent, "用户输入组装规则", "用户提示词", "User Prompt")
        );
        String skillName = firstText(
                jsonText(json, "skillName"),
                labeledValue(mainContent, "Skill 名称", "技能名称", "Skill Name"),
                name + " Skill"
        );
        String skillDescription = firstText(
                jsonText(json, "skillDescription"),
                jsonText(json, "capability"),
                sectionValue(mainContent, "能力说明", "Skill 说明", "Capability"),
                role
        );
        String knowledgeRule = firstText(
                jsonText(json, "knowledgeRule"),
                sectionValue(mainContent, "知识库调用规则", "Knowledge Rule")
        );
        String outputFormat = firstText(
                jsonText(json, "outputFormat"),
                sectionValue(mainContent, "输出格式", "Output Format")
        );
        String boundaries = joinSections(
                firstText(jsonText(json, "boundaries"), sectionValue(mainContent, "能力边界", "Boundaries")),
                firstText(jsonText(json, "forbidden"), sectionValue(mainContent, "禁止事项", "Forbidden"))
        );
        return new ParsedFields(
                name, role, scenario, accent, systemPrompt, userPrompt, skillName, skillDescription,
                knowledgeRule, outputFormat, boundaries
        );
    }

    private ParsedFile toParsedFile(String relativePath, byte[] content) {
        ExpertSkillFileRole role = classify(relativePath);
        String contentText = isTextFile(relativePath) ? readUtf8(content, relativePath) : null;
        return new ParsedFile(relativePath, role, contentText, content);
    }

    private static ExpertSkillFileRole classify(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        String fileName = lower.substring(lower.lastIndexOf('/') + 1);
        if (fileName.equals("skill.md")) return ExpertSkillFileRole.PROMPT;
        String extension = extensionOf(lower);
        if (extension.equals("json") || extension.equals("yaml") || extension.equals("yml")) {
            return ExpertSkillFileRole.CONFIG;
        }
        for (String part : lower.split("/")) {
            if (KNOWLEDGE_DIRECTORIES.contains(part)) return ExpertSkillFileRole.KNOWLEDGE_CANDIDATE;
        }
        return ExpertSkillFileRole.REFERENCE;
    }

    private static byte[] readBytes(MultipartFile file, String relativePath) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw invalid("无法读取 Skill 文件：" + relativePath);
        }
    }

    private static byte[] readArchiveEntry(ZipInputStream input, String relativePath) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) != -1) {
            if ((long) output.size() + read > MAX_FILE_BYTES) {
                throw invalid("单个 Skill 文件不能超过 20 MB：" + relativePath);
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private JsonNode parseJson(String content) {
        if (content == null) return null;
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

    private static String combine(List<ParsedFile> files, String folderName, String mainFilePath) {
        StringBuilder combined = new StringBuilder()
                .append("Skill 文件夹：").append(folderName).append('\n')
                .append("主文件：").append(mainFilePath).append("\n\n");
        for (ParsedFile file : files) {
            combined.append("---\n文件：").append(file.relativePath()).append("\n\n").append(file.contentText()).append("\n\n");
            if (combined.length() > MAX_COMBINED_CHARACTERS) throw invalid("解析后的 Skill 提示词和配置不能超过 20000 个字符");
        }
        return combined.toString().trim();
    }

    private static String readUtf8(byte[] bytes, String relativePath) {
        try {
            String content = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
            if (content.startsWith("\uFEFF")) content = content.substring(1);
            if (content.indexOf('\0') >= 0) throw invalid("Skill 文本文件格式无效：" + relativePath);
            if (content.isBlank()) throw invalid("Skill 文件不能为空：" + relativePath);
            return content.trim();
        } catch (CharacterCodingException exception) {
            throw invalid("Skill 文本文件必须使用 UTF-8 编码：" + relativePath);
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

    private static void validateUniquePath(Set<String> paths, String path) {
        if (!paths.add(path.toLowerCase(Locale.ROOT))) throw invalid("Skill 文件路径重复：" + path);
    }

    private static void validateExtension(String path) {
        if (!ALLOWED_EXTENSIONS.contains(extensionOf(path))) {
            throw invalid("Skill 文件包含不支持或不可执行的格式：" + path);
        }
    }

    private static boolean isTextFile(String path) {
        return TEXT_EXTENSIONS.contains(extensionOf(path));
    }

    private static String extensionOf(String path) {
        String fileName = path.substring(path.lastIndexOf('/') + 1);
        int separator = fileName.lastIndexOf('.');
        if (separator < 1 || separator == fileName.length() - 1) return "";
        return fileName.substring(separator + 1).toLowerCase(Locale.ROOT);
    }

    private static boolean isSystemMetadata(String rawPath) {
        String normalized = rawPath == null ? "" : rawPath.replace('\\', '/').toLowerCase(Locale.ROOT);
        return normalized.startsWith("__macosx/") || normalized.endsWith("/.ds_store") || normalized.equals(".ds_store");
    }

    private static String folderName(String path) {
        int separator = path.indexOf('/');
        String candidate = separator > 0 ? path.substring(0, separator) : path.replaceFirst("(?i)\\.[a-z0-9]+$", "");
        return candidate.isBlank() ? "专家 Skill" : candidate;
    }

    private static String joinSections(String first, String second) {
        if (first == null) return second;
        if (second == null) return first;
        return first + "\n\n" + second;
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

    public record ParsedUpload(ExpertSkillUploadRecord.ParsedSkill skill, List<ParsedFile> files) {
    }

    public record ParsedFile(String relativePath, ExpertSkillFileRole fileRole, String contentText, byte[] content) {
    }

    private record ParsedFields(
            String name,
            String role,
            String scenario,
            String accent,
            String systemPrompt,
            String userPrompt,
            String skillName,
            String skillDescription,
            String knowledgeRule,
            String outputFormat,
            String boundaries
    ) {
    }
}
