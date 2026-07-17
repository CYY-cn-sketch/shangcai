package com.sufe.ai.usage.service;

import com.sufe.ai.account.domain.GroupMembership;
import com.sufe.ai.account.domain.ProjectGroup;
import com.sufe.ai.account.domain.UserAccount;
import com.sufe.ai.account.repository.GroupMembershipRepository;
import com.sufe.ai.account.repository.ProjectGroupRepository;
import com.sufe.ai.account.repository.UserAccountRepository;
import com.sufe.ai.generation.domain.GenerationProvider;
import com.sufe.ai.usage.domain.AiUsageRecord;
import com.sufe.ai.usage.repository.AiUsageRecordRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiUsageService {

    private static final Pattern GROUP_NUMBER_PATTERN = Pattern.compile("\\d+");

    private final AiUsageRecordRepository usageRepository;
    private final UserAccountRepository userAccountRepository;
    private final GroupMembershipRepository membershipRepository;
    private final ProjectGroupRepository groupRepository;

    public AiUsageService(
            AiUsageRecordRepository usageRepository,
            UserAccountRepository userAccountRepository,
            GroupMembershipRepository membershipRepository,
            ProjectGroupRepository groupRepository
    ) {
        this.usageRepository = usageRepository;
        this.userAccountRepository = userAccountRepository;
        this.membershipRepository = membershipRepository;
        this.groupRepository = groupRepository;
    }

    public AiUsageRecord recordReportedUsage(ReportedUsage command) {
        String requestId = requireText(command.requestId(), "requestId");
        Optional<AiUsageRecord> existing = usageRepository.findByProviderAndRequestId(command.provider(), requestId);
        if (existing.isPresent()) {
            return existing.get();
        }

        UserAccount user = userAccountRepository.findById(command.userId())
                .orElseThrow(() -> new IllegalArgumentException("用量记录对应的用户不存在"));
        ProjectGroup group = membershipRepository.findByUserId(user.getId())
                .map(GroupMembership::getGroupId)
                .flatMap(groupRepository::findById)
                .orElse(null);

        return usageRepository.save(AiUsageRecord.create(
                user.getId(),
                user.getDisplayName(),
                group == null ? null : group.getId(),
                group == null ? null : group.getGroupLabel(),
                group == null ? null : group.getProjectName(),
                command.provider(),
                command.modelName(),
                command.operation(),
                requestId,
                command.inputTokens(),
                command.outputTokens()
        ));
    }

    public UsageReport report(UsageRange range) {
        Instant generatedAt = Instant.now();
        Instant periodStart = range.periodStart(generatedAt);
        List<AiUsageRecord> records = periodStart == null
                ? usageRepository.findAllByOrderByRecordedAtDesc()
                : usageRepository.findByRecordedAtGreaterThanEqualOrderByRecordedAtDesc(periodStart);

        Map<String, UsageAccumulator> userTotals = new LinkedHashMap<>();
        Map<String, UsageAccumulator> groupTotals = new LinkedHashMap<>();
        groupRepository.findAll().forEach(group ->
                groupTotals.put(group.getId(), UsageAccumulator.forGroup(group))
        );
        long inputTokens = 0;
        long outputTokens = 0;

        for (AiUsageRecord record : records) {
            inputTokens += record.getInputTokens();
            outputTokens += record.getOutputTokens();
            userTotals.computeIfAbsent(record.getUserId(), ignored -> UsageAccumulator.forUser(record)).add(record);
            if (record.getGroupId() != null) {
                groupTotals.computeIfAbsent(record.getGroupId(), ignored -> UsageAccumulator.forGroup(record)).add(record);
            }
        }

        List<UserUsage> users = userTotals.values().stream()
                .map(UsageAccumulator::toUserUsage)
                .sorted(usageComparator(UserUsage::totalTokens, UserUsage::displayName))
                .toList();
        List<GroupUsage> groups = groupTotals.values().stream()
                .map(UsageAccumulator::toGroupUsage)
                .sorted(Comparator.comparingLong(GroupUsage::totalTokens).reversed()
                        .thenComparingInt(group -> groupNumber(group.groupLabel()))
                        .thenComparing(GroupUsage::groupLabel))
                .toList();
        long activeGroupCount = groups.stream().filter(group -> group.callCount() > 0).count();

        return new UsageReport(
                range,
                periodStart,
                generatedAt,
                new UsageSummary(records.size(), inputTokens, outputTokens, inputTokens + outputTokens, users.size(), activeGroupCount),
                users,
                groups
        );
    }

    private static <T> Comparator<T> usageComparator(
            java.util.function.ToLongFunction<T> tokens,
            java.util.function.Function<T, String> label
    ) {
        return Comparator.comparingLong(tokens).reversed().thenComparing(label);
    }

    private static int groupNumber(String label) {
        Matcher matcher = GROUP_NUMBER_PATTERN.matcher(label);
        if (!matcher.find()) return Integer.MAX_VALUE;
        try {
            return Integer.parseInt(matcher.group());
        } catch (NumberFormatException ignored) {
            return Integer.MAX_VALUE;
        }
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " 不能为空");
        }
        return value.trim();
    }

    public enum UsageRange {
        LAST_7_DAYS(7),
        LAST_30_DAYS(30),
        LAST_90_DAYS(90),
        ALL(null);

        private final Integer days;

        UsageRange(Integer days) {
            this.days = days;
        }

        Instant periodStart(Instant now) {
            return days == null ? null : now.minus(days, ChronoUnit.DAYS);
        }
    }

    public record ReportedUsage(
            String userId,
            GenerationProvider provider,
            String modelName,
            String operation,
            String requestId,
            long inputTokens,
            long outputTokens
    ) {
    }

    public record UsageReport(
            UsageRange range,
            Instant periodStart,
            Instant generatedAt,
            UsageSummary summary,
            List<UserUsage> users,
            List<GroupUsage> groups
    ) {
    }

    public record UsageSummary(
            long callCount,
            long inputTokens,
            long outputTokens,
            long totalTokens,
            long activeUserCount,
            long activeGroupCount
    ) {
    }

    public record UserUsage(
            String userId,
            String displayName,
            String groupId,
            String groupLabel,
            String groupName,
            long callCount,
            long inputTokens,
            long outputTokens,
            long totalTokens,
            List<GenerationProvider> providers,
            Instant lastUsedAt
    ) {
    }

    public record GroupUsage(
            String groupId,
            String groupLabel,
            String groupName,
            long memberCount,
            long callCount,
            long inputTokens,
            long outputTokens,
            long totalTokens,
            List<GenerationProvider> providers,
            Instant lastUsedAt
    ) {
    }

    private static final class UsageAccumulator {
        private final String userId;
        private final String displayName;
        private final String groupId;
        private final String groupLabel;
        private final String groupName;
        private final Set<String> memberIds = new LinkedHashSet<>();
        private final Set<GenerationProvider> providers = new LinkedHashSet<>();
        private long callCount;
        private long inputTokens;
        private long outputTokens;
        private Instant lastUsedAt;

        private UsageAccumulator(
                String userId,
                String displayName,
                String groupId,
                String groupLabel,
                String groupName
        ) {
            this.userId = userId;
            this.displayName = displayName;
            this.groupId = groupId;
            this.groupLabel = groupLabel;
            this.groupName = groupName;
        }

        static UsageAccumulator forUser(AiUsageRecord record) {
            return new UsageAccumulator(
                    record.getUserId(),
                    record.getUserDisplayName(),
                    record.getGroupId(),
                    record.getGroupLabel(),
                    record.getGroupName()
            );
        }

        static UsageAccumulator forGroup(AiUsageRecord record) {
            return new UsageAccumulator(
                    null,
                    null,
                    record.getGroupId(),
                    record.getGroupLabel(),
                    record.getGroupName()
            );
        }

        static UsageAccumulator forGroup(ProjectGroup group) {
            return new UsageAccumulator(
                    null,
                    null,
                    group.getId(),
                    group.getGroupLabel(),
                    group.getProjectName()
            );
        }

        void add(AiUsageRecord record) {
            callCount++;
            inputTokens += record.getInputTokens();
            outputTokens += record.getOutputTokens();
            memberIds.add(record.getUserId());
            providers.add(record.getProvider());
            if (lastUsedAt == null || record.getRecordedAt().isAfter(lastUsedAt)) {
                lastUsedAt = record.getRecordedAt();
            }
        }

        UserUsage toUserUsage() {
            return new UserUsage(
                    userId,
                    displayName,
                    groupId,
                    groupLabel,
                    groupName,
                    callCount,
                    inputTokens,
                    outputTokens,
                    inputTokens + outputTokens,
                    new ArrayList<>(providers),
                    lastUsedAt
            );
        }

        GroupUsage toGroupUsage() {
            return new GroupUsage(
                    groupId,
                    groupLabel,
                    groupName,
                    memberIds.size(),
                    callCount,
                    inputTokens,
                    outputTokens,
                    inputTokens + outputTokens,
                    new ArrayList<>(providers),
                    lastUsedAt
            );
        }
    }
}
