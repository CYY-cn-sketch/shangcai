(function () {
  const stage = document.getElementById("stage");
  const kpiGrid = document.getElementById("kpiGrid");
  const activityChartEl = document.getElementById("activityChart");
  const modelChartEl = document.getElementById("modelChart");
  const tokenChartEl = document.getElementById("tokenChart");
  const qualityChartEl = document.getElementById("qualityChart");
  const projectMatrixEl = document.getElementById("projectMatrix");
  const activityFeedEl = document.getElementById("activityFeed");
  const teacherQueueEl = document.getElementById("teacherQueue");
  const knowledgeListEl = document.getElementById("knowledgeList");
  const assetMeterEl = document.getElementById("assetMeter");
  const assetTabsEl = document.getElementById("assetTabs");
  const projectDetailHost = document.getElementById("projectDetailHost");
  const modal = document.getElementById("detailModal");
  const modalContent = document.getElementById("modalContent");
  const modalClose = document.getElementById("modalClose");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const themeLabel = document.getElementById("themeLabel");
  const fullscreenToggle = document.getElementById("fullscreenToggle");
  const fullscreenIcon = document.getElementById("fullscreenIcon");
  const fullscreenLabel = document.getElementById("fullscreenLabel");
  const clockTime = document.getElementById("clockTime");
  const clockDate = document.getElementById("clockDate");
  const dataSource = document.getElementById("dataSource");
  const updatedAt = document.getElementById("updatedAt");
  const queueHint = document.getElementById("queueHint");
  const matrixHint = document.getElementById("matrixHint");
  const knowledgeHint = document.getElementById("knowledgeHint");
  let assetMode = "submitted";

  const STORAGE_KEYS = [
    "sufe-admin-account-records",
    "sufe-student-groups",
    "sufe-submissions",
    "sufe-generated-assets",
    "sufe-knowledge-uploads",
    "sufe-knowledge-base-catalog",
    "sufe-knowledge-base-states",
    "sufe-messages",
    "sufe-defense-practices",
    "sufe-ideas",
  ];

  const stageLabels = ["头脑风暴", "项目定位", "市场竞品", "商业模式", "BP 撰写", "路演 PPT", "陪练答辩", "成果提交"];
  const artifactToStage = {
    BRAINSTORM: 0,
    POSITIONING: 1,
    MARKET: 2,
    BP: 4,
    PPT: 5,
    SCRIPT: 7,
    DEFENSE: 6,
    MEDIA: 7,
  };

  const palette = {
    dark: {
      blue: "#7ba7ff",
      blueDeep: "#244fba",
      gold: "#ffd36a",
      dim: "rgba(223, 232, 255, 0.66)",
      text: "#f3f7ff",
      split: "rgba(255,255,255,0.1)",
      tip: "rgba(13,17,28,0.94)",
      area: "rgba(123,167,255,0.22)",
      gray: "rgba(255,255,255,0.32)",
    },
    light: {
      blue: "#1f5fcb",
      blueDeep: "#1e3a8a",
      gold: "#a87918",
      dim: "rgba(34,45,75,0.68)",
      text: "#111827",
      split: "rgba(18,42,91,0.12)",
      tip: "rgba(255,255,255,0.96)",
      area: "rgba(31,95,203,0.14)",
      gray: "rgba(18,42,91,0.34)",
    },
  };

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  let charts = [];
  let theme = localStorage.getItem("bs-theme") || document.documentElement.dataset.theme || "dark";
  let data = createDashboardData();

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function groupLabelFromAccount(account) {
    return account.groupLabel || account.groupName || account.groupOrScope || "";
  }

  function createDashboardData() {
    const accountRecords = readJSON("sufe-admin-account-records", []);
    const studentGroups = readJSON("sufe-student-groups", []);
    const submissions = readJSON("sufe-submissions", []);
    const generatedAssets = readJSON("sufe-generated-assets", []);
    const knowledgeUploads = readJSON("sufe-knowledge-uploads", []);
    const knowledgeCatalog = readJSON("sufe-knowledge-base-catalog", []);
    const knowledgeStates = readJSON("sufe-knowledge-base-states", {});
    const messages = readJSON("sufe-messages", []);
    const defensePractices = readJSON("sufe-defense-practices", []);
    const ideas = readJSON("sufe-ideas", []);

    const studentAccounts = accountRecords.filter((item) => item.role === "student").length || 10;
    const teacherAccounts = accountRecords.filter((item) => item.role === "teacher").length || 1;
    const adminAccounts = accountRecords.filter((item) => item.role === "admin").length || 1;
    const groups = studentGroups.length || 10;
    const pending = submissions.filter((item) => item.status === "pending").length;
    const approved = submissions.filter((item) => item.status === "approved").length;
    const revision = submissions.filter((item) => item.status === "revision").length;
    const excellent = submissions.filter((item) => item.isExcellent).length;
    const pptCount = generatedAssets.filter((item) => item.type === "PPT").length;
    const videoCount = generatedAssets.filter((item) => item.type === "VIDEO").length;
    const enabledKnowledge = knowledgeUploads.filter((item) => item.enabled !== false).length || knowledgeCatalog.length || 6;
    const processedRate = submissions.length ? Math.min(100, Math.round(((approved + revision) / submissions.length) * 100)) : 0;
    const passRate = submissions.length ? Math.round((approved / submissions.length) * 100) : 0;

    const activityDays = buildActivityDays(messages, submissions, generatedAssets);
    const tokenDays = buildTokenDays(messages, submissions, generatedAssets, defensePractices);

    const projects = (studentGroups.length ? studentGroups : buildFallbackGroups()).map((group, index) => {
      const groupName = group.projectName || group.name || group.label || `第 ${index + 1} 组`;
      const groupSubmissions = submissions.filter((item) => item.group === group.label || item.groupName === groupName || item.group === groupName);
      const latest = [...groupSubmissions].sort((a, b) => getSubmissionStageIndex(b) - getSubmissionStageIndex(a))[0];
      const stageIndex = latest ? getSubmissionStageIndex(latest) : Math.min(stageLabels.length - 1, Math.max(0, 1 + (index % 5)));
      const members = accountRecords.filter((item) => item.role === "student" && groupLabelFromAccount(item).includes(group.label || ""));
      return {
        id: group.id || `G-${index + 1}`,
        label: group.label || `第 ${index + 1} 组`,
        name: groupName,
        stageIndex,
        progress: Math.min(98, Math.max(8, Math.round(((stageIndex + 1) / stageLabels.length) * 100))),
        latest,
        pending: groupSubmissions.filter((item) => item.status === "pending").length,
        excellent: groupSubmissions.filter((item) => item.isExcellent).length,
        members: members.length || 1,
        submissions: groupSubmissions,
      };
    });

    const feedItems = [
      ...submissions.slice(-7).map((item) => ({
        id: `s-${item.id}`,
        time: formatTime(item.submittedAt),
        tag: item.groupName || item.group || "提交",
        title: `提交 ${artifactLabel(item.artifactType)}`,
        detail: `${item.student || "学生"} · ${statusLabel(item.status)} · ${item.artifactTitle || "阶段成果"}`,
      })),
      ...generatedAssets.slice(-5).map((item) => ({
        id: `g-${item.id}`,
        time: formatTime(item.createdAt),
        tag: item.type === "PPT" ? "PPT 生成" : "视频生成",
        title: item.title || "成果生成",
        detail: item.type === "PPT" ? "已进入成果库" : "已进入多媒体成果区",
      })),
      ...knowledgeUploads.slice(-4).map((item) => ({
        id: `k-${item.id}`,
        time: formatTime(item.uploadedAt),
        tag: "知识库",
        title: item.name || "知识材料上传",
        detail: `${item.uploadedBy || "教师"} · ${item.category || "未分类"}`,
      })),
    ]
      .filter(Boolean)
      .sort((a, b) => toTimeValue(b.time) - toTimeValue(a.time));
    const normalizedFeedItems = feedItems.length ? feedItems : buildFallbackFeedItems();

    const knowledgeRows = (knowledgeCatalog.length ? knowledgeCatalog : buildFallbackKnowledgeCatalog()).map((item) => ({
      name: item.category,
      desc: item.description,
      usedBy: item.usedBy || "多专家调用",
      enabled: knowledgeStates[item.category] !== false,
    }));

    const teacherQueue = submissions
      .filter((item) => item.status === "pending" || item.status === "revision")
      .slice(-6)
      .reverse()
      .map((item) => ({
        group: item.groupName || item.group || "项目组",
        title: item.artifactTitle,
        status: statusLabel(item.status),
        student: item.student || "",
        time: formatTime(item.submittedAt),
      }));
    const normalizedTeacherQueue = teacherQueue.length ? teacherQueue : buildFallbackTeacherQueue();

    const submittedByType = ["BRAINSTORM", "POSITIONING", "BP", "PPT", "SCRIPT", "DEFENSE", "MEDIA"].map((type) => ({
      name: artifactLabel(type),
      value: submissions.filter((item) => item.artifactType === type).length,
    }));
    const excellentByType = ["POSITIONING", "BP", "PPT", "SCRIPT", "DEFENSE", "MEDIA"].map((type) => ({
      name: artifactLabel(type),
      value: submissions.filter((item) => item.artifactType === type && item.isExcellent).length,
    }));
    const revisionByType = ["BRAINSTORM", "POSITIONING", "BP", "PPT", "SCRIPT", "DEFENSE", "MEDIA"].map((type) => ({
      name: artifactLabel(type),
      value: submissions.filter((item) => item.artifactType === type && item.status === "revision").length,
    }));
    const assetStats = {
      submitted: submittedByType.some((item) => item.value) ? submittedByType : [
        { name: "头脑风暴", value: 3 },
        { name: "项目定位", value: 2 },
        { name: "商业计划书 BP", value: 2 },
        { name: "路演 PPT", value: 2 },
        { name: "答辩模拟", value: 1 },
      ],
      excellent: excellentByType.some((item) => item.value) ? excellentByType : [
        { name: "项目定位", value: 1 },
        { name: "商业计划书 BP", value: 1 },
        { name: "路演 PPT", value: 2 },
        { name: "答辩模拟", value: 1 },
      ],
      revision: revisionByType.some((item) => item.value) ? revisionByType : [
        { name: "商业计划书 BP", value: 2 },
        { name: "路演 PPT", value: 1 },
        { name: "答辩模拟", value: 1 },
        { name: "多媒体物料", value: 1 },
      ],
    };

    const qualityRows = [
      { name: "创新性", value: clamp(Math.round((passRate || 72) + 4), 60, 96) },
      { name: "市场洞察", value: clamp(Math.round((processedRate || 74) + 3), 60, 96) },
      { name: "商业逻辑", value: clamp(Math.round((pending ? 68 : 77)), 58, 95) },
      { name: "财务合理性", value: clamp(Math.round((approved ? 70 : 66)), 55, 93) },
      { name: "表达呈现", value: clamp(Math.round((excellent ? 84 : 73)), 62, 97) },
      { name: "团队协作", value: clamp(Math.round((groups ? 78 : 71)), 60, 95) },
    ];

    return {
      accountRecords,
      studentAccounts,
      teacherAccounts,
      adminAccounts,
      groups,
      submissions,
      generatedAssets,
      knowledgeUploads,
      knowledgeCatalog: knowledgeRows,
      knowledgeStates,
      messages,
      defensePractices,
      ideas,
      pending,
      approved,
      revision,
      excellent,
      pptCount,
      videoCount,
      enabledKnowledge,
      processedRate,
      passRate,
      activityDays,
      tokenDays,
      projects,
      feedItems: normalizedFeedItems,
      teacherQueue: normalizedTeacherQueue,
      assetStats,
      qualityRows,
    };
  }

  function buildFallbackGroups() {
    return Array.from({ length: 10 }, (_, index) => ({
      id: `G-${String(index + 1).padStart(2, "0")}`,
      label: `第 ${index + 1} 组`,
      projectName: ["校园二手循环平台", "智能简历诊所", "AI 就业教练", "商科案例共创库", "银发陪诊助手", "低碳积分校园平台", "实习岗位雷达", "校园餐饮排队预测", "创业案例智能检索", "商学院活动助手"][index] || `项目 ${index + 1}`,
    }));
  }

  function buildFallbackKnowledgeCatalog() {
    return [
      { category: "教学大纲", description: "课程阶段、教学目标和阶段成果要求。", usedBy: "头脑风暴、项目定位、BP、PPT" },
      { category: "BP 模板", description: "商业计划书章节结构与商业模式说明。", usedBy: "BP、答辩" },
      { category: "PPT 模板", description: "路演页序、页面观点和演讲提示。", usedBy: "PPT、答辩" },
      { category: "评分标准", description: "Rubric、审核维度和优秀成果判断标准。", usedBy: "审核、预评分" },
      { category: "创业案例", description: "优秀项目案例和课堂可复用素材。", usedBy: "头脑风暴、项目定位" },
      { category: "答辩题库", description: "高频追问、压力测试问题和回答结构。", usedBy: "答辩模拟" },
    ];
  }

  function buildFallbackFeedItems() {
    return [
      { id: "demo-feed-1", time: "09:12", tag: "第 3 组", title: "提交商业计划书 BP", detail: "AI 就业教练 · 待审核 · 已同步教师端" },
      { id: "demo-feed-2", time: "09:26", tag: "PPT 生成", title: "生成 15 页路演 PPT", detail: "引用 PPT 模板、BP 模板、评分标准知识库" },
      { id: "demo-feed-3", time: "10:08", tag: "教师端", title: "完成 Rubric 预评分", detail: "商业逻辑 82 · 表达呈现 86 · 建议补证据页" },
      { id: "demo-feed-4", time: "10:31", tag: "知识库", title: "上传优秀 BP 案例", detail: "周老师 · 创业案例知识库 · 已启用" },
      { id: "demo-feed-5", time: "11:05", tag: "答辩", title: "生成评委追问建议", detail: "围绕市场规模、获客成本、试点验证继续追问" },
      { id: "demo-feed-6", time: "11:42", tag: "视频", title: "生成 15 秒项目介绍视频", detail: "即梦能力输出 · 已进入多媒体成果区" },
      { id: "demo-feed-7", time: "13:18", tag: "第 5 组", title: "退回修改银发陪诊助手 BP", detail: "需补充服务边界、付费方和合规风险" },
      { id: "demo-feed-8", time: "14:06", tag: "管理端", title: "更新专家提示词模板", detail: "同步到学生端、教师端与运行监控中心" },
    ];
  }

  function buildFallbackTeacherQueue() {
    return [
      { group: "第 3 组", title: "AI 就业教练 BP 初稿", status: "待审核", student: "陈思源", time: "09:12" },
      { group: "第 5 组", title: "银发陪诊助手商业模式", status: "退回修改", student: "赵子涵", time: "13:18" },
      { group: "第 7 组", title: "实习岗位雷达 PPT", status: "待审核", student: "王泽宇", time: "14:22" },
    ];
  }

  function buildActivityDays(messages, submissions, generatedAssets) {
    const base = messages.length + submissions.length + generatedAssets.length;
    return Array.from({ length: 14 }, (_, index) => {
      const active = clamp(base + ((index * 7) % 9) - 4, 12, 132);
      const convs = clamp(Math.round(active * 1.4 + index * 2), 16, 220);
      const date = addDays(index - 13);
      return { date, active, convs };
    });
  }

  function buildTokenDays(messages, submissions, generatedAssets, defensePractices) {
    const base = messages.length * 1200 + submissions.length * 3400 + generatedAssets.length * 2400 + defensePractices.length * 1500;
    return Array.from({ length: 14 }, (_, index) => {
      const wan = clamp(Math.round((base / 10000) * 0.65 + index * 0.8 + (index % 3) * 1.4), 8, 110);
      const date = addDays(index - 13);
      return { date, wan };
    });
  }

  function getSubmissionStageIndex(submission) {
    return artifactToStage[submission.artifactType] ?? 0;
  }

  function artifactLabel(type) {
    return {
      BRAINSTORM: "头脑风暴",
      POSITIONING: "项目定位",
      MARKET: "市场竞品",
      BP: "商业计划书 BP",
      PPT: "路演 PPT",
      SCRIPT: "路演稿",
      DEFENSE: "答辩模拟",
      MEDIA: "多媒体物料",
    }[type] || type;
  }

  function statusLabel(status) {
    return {
      pending: "待审核",
      approved: "已通过",
      revision: "退回修改",
      withdrawn: "已撤回",
    }[status] || status;
  }

  function formatTime(value) {
    if (!value) return "--:--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(11, 16) || "--:--";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function formatDateTime(value) {
    if (!value) return "暂无时间";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${formatTime(value)}`;
  }

  function knowledgeNamesForProject(project) {
    const currentStage = stageLabels[project.stageIndex] || "";
    const latestType = project.latest ? artifactLabel(project.latest.artifactType) : "";
    const rows = data.knowledgeCatalog.length ? data.knowledgeCatalog : buildFallbackKnowledgeCatalog().map((item) => ({
      name: item.category,
      desc: item.description,
      usedBy: item.usedBy,
      enabled: true,
    }));
    const matched = rows.filter((item) => {
      if (item.enabled === false) return false;
      const scope = `${item.name || ""}${item.desc || ""}${item.usedBy || ""}`;
      return scope.includes(currentStage) || scope.includes(latestType) || scope.includes("审核");
    });
    return (matched.length ? matched : rows.filter((item) => item.enabled !== false)).slice(0, 3).map((item) => item.name || item.category);
  }

  function buildProjectDetailItems(project) {
    const latest = project.latest;
    const currentStage = stageLabels[project.stageIndex] || "未开始";
    const nextStage = stageLabels[Math.min(project.stageIndex + 1, stageLabels.length - 1)] || "成果提交";
    const pendingItems = project.submissions.filter((item) => item.status === "pending");
    const revisionItems = project.submissions.filter((item) => item.status === "revision");
    const approvedItems = project.submissions.filter((item) => item.status === "approved");
    const latestText = latest
      ? `${artifactLabel(latest.artifactType)}《${latest.artifactTitle || "阶段成果"}》已于 ${formatDateTime(latest.submittedAt)} 提交，当前状态为「${statusLabel(latest.status)}」。`
      : "该小组暂未提交阶段成果，可先从头脑风暴或项目定位开始形成第一版材料。";
    const teacherText = pendingItems.length
      ? `教师优先查看 ${pendingItems.length} 项待审核材料：${pendingItems.slice(0, 2).map((item) => `《${item.artifactTitle || artifactLabel(item.artifactType)}》`).join("、")}，重点确认是否可进入下一阶段。`
      : revisionItems.length
        ? `当前有 ${revisionItems.length} 项退回修改，建议先补齐教师反馈中的证据、数据口径和表达结构，再重新提交。`
        : `暂无待审核项；已通过 ${approvedItems.length} 项，可筛选其中质量较高的材料沉淀为课堂案例。`;
    const nextAction = latest && latest.artifactType === "PPT"
      ? "下一步可围绕 PPT 进入答辩模拟，生成 1/3/5 分钟路演稿，并用评委追问检查商业逻辑漏洞。"
      : latest && latest.artifactType === "BP"
        ? "下一步建议把 BP 的用户痛点、收入模型和关键假设转成 10-15 页路演 PPT，先补首页定位、市场验证和财务假设页。"
        : `下一步从「${currentStage}」推进到「${nextStage}」，优先产出可提交材料，而不是继续停留在讨论记录。`;
    const knowledgeNames = knowledgeNamesForProject(project);
    const knowledgeText = knowledgeNames.length
      ? `当前可引用知识库：${knowledgeNames.join("、")}。生成内容时优先带出评分标准、模板结构和案例依据，便于老师审核。`
      : "当前没有启用知识库，建议教师端先上传教学大纲、BP 模板或评分标准后再组织本组成果生成。";
    return [
      { title: "最近成果", text: latestText },
      { title: "教师处理", text: teacherText },
      { title: "推进动作", text: nextAction },
      { title: "知识库依据", text: knowledgeText },
    ];
  }

  function addDays(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function toTimeValue(time) {
    const raw = String(time || "");
    const [h = "0", m = "0"] = raw.split(":");
    return Number(h) * 60 + Number(m);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function applyTheme(nextTheme) {
    theme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("bs-theme", nextTheme);
    themeIcon.textContent = nextTheme === "dark" ? "☀" : "☾";
    themeLabel.textContent = nextTheme === "dark" ? "LIGHT" : "DARK";
    renderCharts();
  }

  function fitStage() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function updateClock() {
    const now = new Date();
    clockTime.textContent = now.toTimeString().slice(0, 8);
    clockDate.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} 周${weekDays[now.getDay()]}`;
    updatedAt.textContent = `UPDATED: ${now.toTimeString().slice(0, 8)}`;
  }

  function buildKpis() {
    const items = getKpiItems();
    kpiGrid.innerHTML = items
      .map(
        (item, index) => `
          <a class="kpi-card${item.hot ? " hot" : ""}" href="#kpi-${item.id}" data-index="${String(index + 1).padStart(2, "0")}">
            <span>${item.label}</span>
            <strong>${item.value.toLocaleString("zh-CN")}<small>${item.unit}</small></strong>
          </a>`,
      )
      .join("");
  }

  function getKpiItems() {
    const studentRows = buildStudentAccountRows();
    const teacherRows = buildTeacherAccountRows();
    const groupRows = buildProjectGroupRows();
    const pendingRows = buildSubmissionRows(data.submissions.filter((item) => item.status === "pending"));
    const assetRows = buildAssetRows();
    const reviewRows = buildSubmissionRows(data.submissions);
    return [
      {
        id: "students",
        label: "学生账号",
        value: data.studentAccounts,
        unit: "人",
        subtitle: "学生使用与项目组关联情况",
        stats: [
          { value: data.studentAccounts, label: "学生账号" },
          { value: data.groups, label: "项目小组" },
          { value: data.messages.length || 42, label: "对话记录" },
          { value: data.defensePractices.length || 6, label: "答辩记录" },
        ],
        rowsTitle: "学生账号明细",
        rows: studentRows,
      },
      {
        id: "teachers",
        label: "教师账号",
        value: data.teacherAccounts,
        unit: "人",
        subtitle: "教师审核与课堂管理能力",
        stats: [
          { value: data.teacherAccounts, label: "教师账号" },
          { value: data.pending, label: "待审核" },
          { value: data.revision, label: "退回修改" },
          { value: data.processedRate, label: "处理率%" },
        ],
        rowsTitle: "教师账号明细",
        rows: teacherRows,
      },
      {
        id: "groups",
        label: "项目小组",
        value: data.groups,
        unit: "组",
        subtitle: "项目阶段推进总览",
        stats: [
          { value: data.groups, label: "项目小组" },
          { value: data.projects.filter((item) => item.stageIndex >= 4).length, label: "进入 BP" },
          { value: data.projects.filter((item) => item.stageIndex >= 5).length, label: "进入 PPT" },
          { value: data.projects.filter((item) => item.progress >= 80).length, label: "高进度" },
        ],
        rowsTitle: "项目小组及学生信息",
        rows: groupRows,
      },
      {
        id: "pending",
        label: "待审核成果",
        value: data.pending,
        unit: "项",
        hot: true,
        subtitle: "教师端需要处理的成果队列",
        stats: [
          { value: data.pending, label: "待审核" },
          { value: data.revision, label: "退回修改" },
          { value: data.approved, label: "已通过" },
          { value: data.excellent, label: "优秀成果" },
        ],
        rowsTitle: "待审核成果明细",
        rows: pendingRows,
      },
      {
        id: "assets",
        label: "生成成果",
        value: data.pptCount + data.videoCount,
        unit: "份",
        subtitle: "PPT、视频与提交成果沉淀",
        stats: [
          { value: data.submissions.length || 24, label: "提交成果" },
          { value: data.pptCount || 12, label: "PPT 生成" },
          { value: data.videoCount || 3, label: "视频生成" },
          { value: data.excellent || 8, label: "优秀沉淀" },
        ],
        rowsTitle: "生成成果与提交成果明细",
        rows: assetRows,
      },
      {
        id: "review-rate",
        label: "审核处理率",
        value: data.processedRate,
        unit: "%",
        subtitle: "审核闭环完成度",
        stats: [
          { value: data.processedRate, label: "处理率%" },
          { value: data.passRate, label: "通过率%" },
          { value: data.approved + data.revision, label: "已处理" },
          { value: data.submissions.length || 24, label: "总提交" },
        ],
        rowsTitle: "审核处理明细",
        rows: reviewRows,
      },
    ];
  }

  function buildStudentAccountRows() {
    const rows = data.accountRecords
      .filter((account) => account.role === "student")
      .map((account) => {
        const group = groupLabelFromAccount(account) || "未分配项目小组";
        return {
          title: `${account.name || account.account}（${group}）`,
          meta: `${account.account || "未设置账号"} · ${account.status || "已开通"} · 配额 ${account.quota ?? "-"} 次`,
          badge: account.status || "已开通",
        };
      });
    return rows.length
      ? rows
      : data.projects.map((project, index) => ({
          title: `学生${String(index + 1).padStart(2, "0")}（${project.label} / ${project.name}）`,
          meta: `student${index + 1}@sufe.demo · 已开通 · 配额 120 次`,
          badge: "演示账号",
        }));
  }

  function buildTeacherAccountRows() {
    const rows = data.accountRecords
      .filter((account) => account.role === "teacher")
      .map((account) => ({
        title: account.name || account.account || "教师账号",
        meta: `${account.account || "未设置账号"} · ${account.groupOrScope || "创业实践课"} · ${account.permissions?.slice(0, 3).join("、") || "审核与反馈"}`,
        badge: account.status || "已开通",
      }));
    return rows.length
      ? rows
      : [
          {
            title: "王老师",
            meta: "teacher@sufe.demo · 创业实践课 / 10 个项目组 · 提交审核中心、AI 项目诊断、Rubric 预评分",
            badge: "已开通",
          },
        ];
  }

  function buildProjectGroupRows() {
    return data.projects.map((project) => {
      const students = data.accountRecords
        .filter((account) => account.role === "student" && groupLabelFromAccount(account).includes(project.label))
        .map((account) => account.name || account.account);
      return {
        title: `${project.label} · ${project.name}`,
        meta: students.length ? `成员：${students.join("、")}` : `成员：暂无绑定学生 · 当前阶段：${stageLabels[project.stageIndex] || "未开始"}`,
        badge: `${project.members} 人`,
      };
    });
  }

  function buildSubmissionRows(submissions) {
    const rows = submissions.map((item) => ({
      title: item.artifactTitle || artifactLabel(item.artifactType),
      meta: `${item.student || "学生"} · ${item.groupName || item.group || "项目组"} · ${artifactLabel(item.artifactType)} · ${formatTime(item.submittedAt)}`,
      badge: item.isExcellent ? "优秀" : statusLabel(item.status),
    }));
    return rows.length
      ? rows
      : [
          { title: "AI 就业教练 - 商业计划书 BP 初稿", meta: "陈同学 · 第 3 组 / AI 就业教练 · BP · 10:24", badge: "待审核" },
          { title: "商科案例共创库 - 路演 PPT", meta: "李同学 · 第 4 组 / 商科案例共创库 · PPT · 10:38", badge: "已通过" },
          { title: "智能简历诊所 - 项目定位说明", meta: "赵同学 · 第 2 组 / 智能简历诊所 · 项目定位 · 11:05", badge: "退回修改" },
        ];
  }

  function buildAssetRows() {
    const generatedRows = data.generatedAssets.map((item) => ({
      title: item.title || `${item.type === "PPT" ? "PPT" : "视频"}生成成果`,
      meta: `${item.type === "PPT" ? "PPT 生成" : "视频生成"} · ${formatTime(item.createdAt)}${item.prompt ? ` · ${item.prompt.slice(0, 24)}` : ""}`,
      badge: item.type,
    }));
    const submissionRows = data.submissions.map((item) => ({
      title: item.artifactTitle || artifactLabel(item.artifactType),
      meta: `${item.student || "学生"} · ${item.groupName || item.group || "项目组"} · ${statusLabel(item.status)}`,
      badge: item.isExcellent ? "优秀" : "提交",
    }));
    const rows = [...generatedRows, ...submissionRows];
    return rows.length
      ? rows
      : [
          { title: "AI 就业教练 - 15 页路演 PPT", meta: "PPT 生成 · 10:45 · 已进入成果库", badge: "PPT" },
          { title: "商科案例共创库 - 宣传视频", meta: "视频生成 · 11:08 · 已进入多媒体成果区", badge: "VIDEO" },
          { title: "AI 就业教练 - 商业计划书 BP 初稿", meta: "陈同学 · 第 3 组 / AI 就业教练 · 已通过", badge: "提交" },
        ];
  }

  function buildMatrix() {
    const header = `
      <div class="matrix-head">
        <div></div>
        <div class="stage-labels">${stageLabels.map((label) => `<span>${label}</span>`).join("")}</div>
        <div style="text-align:right;">进度 / 综合评估</div>
      </div>`;
    const rows = data.projects
      .map(
        (project) => `
          <a class="matrix-row" href="#project-${project.id}" data-project="${project.id}">
            <div class="matrix-name">
              <strong>${project.label}</strong>
              <span>${project.name}</span>
            </div>
            <div class="stage-cells">
              ${stageLabels
                .map((_, stageIndex) => {
                  const done = stageIndex < project.stageIndex;
                  const current = stageIndex === project.stageIndex;
                  return `<div class="stage-cell ${done ? "done" : ""} ${current ? "current" : ""}"></div>`;
                })
                .join("")}
            </div>
            <div class="matrix-meta">
              <strong>${project.progress}%</strong>
              <span>${project.latest ? project.latest.artifactTitle : "推进中"} · 评估 ${clamp(72 + project.stageIndex * 2, 68, 94)}</span>
            </div>
          </a>`,
      )
      .join("");
    projectMatrixEl.innerHTML = `${header}<div class="matrix-scroll">${rows ? `<div class="matrix-track">${rows}${rows}</div>` : `<div class="empty">暂无项目数据</div>`}</div>`;
    buildProjectDetails();
  }

  function buildProjectDetails() {
    projectDetailHost.innerHTML = [
      ...getKpiItems().map((item) => buildKpiDetailModal(item)),
      ...data.projects.map((project) => buildProjectDetailModal(project)),
    ].join("");
  }

  function buildKpiDetailModal(item) {
    return `
      <div class="modal-mask" id="kpi-${item.id}">
        <section class="modal-card" role="dialog" aria-modal="true" aria-label="${item.label}详情">
          <a class="modal-close modal-close-link" href="#" aria-label="关闭">×</a>
          <h3>${item.label} · 运行详情</h3>
          <div class="sub">${item.subtitle}</div>
          <div class="detail-grid">
            ${item.stats.map((stat) => `<article><b>${stat.value}</b><span>${stat.label}</span></article>`).join("")}
          </div>
          <div class="detail-records">
            <h4>${item.rowsTitle || "明细"}</h4>
            <div class="detail-record-list">
              ${(item.rows || [])
                .map(
                  (row) => `
                    <article>
                      <div>
                        <strong>${row.title}</strong>
                        <span>${row.meta}</span>
                      </div>
                      <em>${row.badge}</em>
                    </article>`,
                )
                .join("")}
            </div>
          </div>
        </section>
      </div>`;
  }

  function buildProjectDetailModal(project) {
    const latest = project.latest;
    const detailItems = buildProjectDetailItems(project);
    const stats = [
      { value: project.members, label: "学生人数" },
      { value: project.submissions.length, label: "提交次数" },
      { value: project.pending, label: "待审核" },
      { value: project.excellent, label: "优秀成果" },
    ];
    return `
      <div class="modal-mask" id="project-${project.id}">
        <section class="modal-card" role="dialog" aria-modal="true" aria-label="${project.label}项目详情">
          <a class="modal-close modal-close-link" href="#" aria-label="关闭">×</a>
          <h3>${project.label} · ${project.name}</h3>
          <div class="sub">当前阶段：${stageLabels[project.stageIndex] || "未开始"} · 最近提交：${latest ? latest.artifactTitle : "暂无"}</div>
          <div class="detail-grid">
            ${stats.map((item) => `<article><b>${item.value}</b><span>${item.label}</span></article>`).join("")}
          </div>
          <div class="detail-list">
            ${detailItems.map((item) => `<article><strong>${item.title}</strong><p>${item.text}</p></article>`).join("")}
          </div>
        </section>
      </div>`;
  }

  function buildFeed() {
    const items = [...data.feedItems, ...data.feedItems].slice(0, Math.max(16, data.feedItems.length));
    activityFeedEl.innerHTML = items
      .map(
        (item) => `
          <article class="feed-item">
            <time>${item.time}</time>
            <span class="tag">${item.tag}</span>
            <div>
              <strong>${item.title}</strong>
              <span>${item.detail}</span>
            </div>
          </article>`,
      )
      .join("");
  }

  function buildQueue() {
    queueHint.textContent = `${data.pending} 待处理 · ${data.revision} 退回`;
    const queueRows = data.teacherQueue.length
      ? data.teacherQueue
          .map(
            (item) => `
              <article class="queue-item">
                <div>
                  <strong>${item.group}</strong>
                  <span>${item.title} · ${item.student}</span>
                </div>
                <em>${item.status}</em>
              </article>`,
          )
          .join("")
      : "";
    teacherQueueEl.innerHTML = queueRows
      ? `<div class="queue-track">${queueRows}${queueRows}</div>`
      : `<div class="empty">当前没有待审核或退回的成果</div>`;
  }

  function buildKnowledge() {
    knowledgeHint.textContent = `${data.enabledKnowledge} 个启用知识库`;
    const rows = data.knowledgeCatalog.length ? data.knowledgeCatalog : [];
    const renderRow = (item) => `
              <article class="knowledge-item">
                <div>
                  <strong>${item.name}</strong>
                  <span>${item.desc}</span>
                </div>
                <em>${item.enabled ? "启用" : "关闭"}</em>
              </article>`;
    knowledgeListEl.innerHTML = rows.length
      ? `<div class="knowledge-track">${[...rows, ...rows].map(renderRow).join("")}</div>`
      : `<div class="empty">暂无知识库数据</div>`;
  }

  function buildAssets() {
    const stats = data.assetStats[assetMode] || data.assetStats.submitted;
    const maxValue = Math.max(...stats.map((item) => item.value), 1);
    const renderRow = (item) => `
          <div class="asset-line">
            <span>${item.name}</span>
            <div class="meter"><i style="--w:${clamp(Math.round((item.value / maxValue) * 100), 10, 100)}%"></i></div>
            <strong>${item.value}</strong>
          </div>`;
    assetMeterEl.innerHTML = `<div class="asset-track">${stats.map(renderRow).join("")}</div>`;
    assetTabsEl?.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.assetMode === assetMode);
    });
  }

  function bindAssetTabs() {
    assetTabsEl?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-asset-mode]");
      if (!button) return;
      assetMode = button.dataset.assetMode;
      buildAssets();
    });
  }

  function updateFullscreenButton() {
    if (!fullscreenToggle) return;
    const isFullscreen = Boolean(document.fullscreenElement);
    fullscreenToggle.setAttribute("aria-label", isFullscreen ? "退出全屏" : "进入全屏");
    if (fullscreenLabel) fullscreenLabel.textContent = isFullscreen ? "EXIT" : "FULL";
    if (fullscreenIcon) fullscreenIcon.textContent = isFullscreen ? "↙" : "⛶";
  }

  async function toggleFullscreen() {
    if (!fullscreenToggle) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen request failed", error);
    } finally {
      updateFullscreenButton();
    }
  }

  function bindFullscreen() {
    if (!fullscreenToggle || !document.documentElement.requestFullscreen) {
      fullscreenToggle?.setAttribute("disabled", "true");
      return;
    }
    fullscreenToggle.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    updateFullscreenButton();
  }

  function renderCharts() {
    charts.forEach((chart) => chart.dispose());
    charts = [];
    const p = palette[theme] || palette.dark;
    const base = {
      textStyle: { fontFamily: "Geist, PingFang SC" },
      grid: { left: 8, right: 12, top: 26, bottom: 4, containLabel: true },
      tooltip: { backgroundColor: p.tip, borderColor: p.split, textStyle: { color: p.text, fontSize: 12 } },
    };
    const ax = {
      axisLine: { lineStyle: { color: p.split } },
      axisLabel: { color: p.dim, fontSize: 10.5, fontFamily: "Geist Mono" },
      splitLine: { lineStyle: { color: p.split } },
      axisTick: { show: false },
    };

    if (activityChartEl) {
      const chart = echarts.init(activityChartEl);
      chart.setOption({
        ...base,
        legend: { top: 0, right: 0, textStyle: { color: p.dim, fontSize: 11 }, itemWidth: 12, itemHeight: 3, icon: "rect" },
        xAxis: { type: "category", data: data.activityDays.map((item) => item.date), ...ax, boundaryGap: false },
        yAxis: [{ type: "value", ...ax }, { type: "value", ...ax, splitLine: { show: false } }],
        series: [
          {
            name: "活跃人数",
            type: "line",
            smooth: 0.45,
            symbol: "none",
            data: data.activityDays.map((item) => item.active),
            lineStyle: { color: p.blue, width: 2 },
            areaStyle: { color: p.area },
          },
          {
            name: "AI 对话",
            type: "line",
            yAxisIndex: 1,
            smooth: 0.45,
            symbol: "none",
            data: data.activityDays.map((item) => item.convs),
            lineStyle: { color: p.gold, width: 1.6, type: [3, 5], cap: "round" },
          },
        ],
      });
      charts.push(chart);
    }

    if (modelChartEl) {
      const chart = echarts.init(modelChartEl);
      chart.setOption({
        ...base,
        tooltip: { ...base.tooltip, formatter: "{b}：{c}%" },
        legend: {
          orient: "vertical",
          right: 4,
          top: "middle",
          textStyle: { color: p.text, fontSize: 12 },
          itemWidth: 10,
          itemHeight: 10,
          icon: "circle",
        },
        series: [
          {
            type: "pie",
            radius: ["56%", "76%"],
            center: ["31%", "52%"],
            label: { show: false },
            padAngle: 3,
            itemStyle: { borderRadius: 5, borderColor: "transparent", borderWidth: 0 },
            color: [p.blue, p.gold, p.blueDeep, p.gray],
            data: [
              { name: "文本生成", value: clamp(data.messages.length * 4 + data.submissions.length * 2, 20, 68) },
              { name: "PPT 生成", value: clamp(data.pptCount * 9 + 12, 10, 40) },
              { name: "视频生成", value: clamp(data.videoCount * 18 + 8, 8, 28) },
              { name: "知识库调用", value: clamp(data.enabledKnowledge * 6 + 10, 12, 36) },
            ],
          },
        ],
      });
      charts.push(chart);
    }

    if (tokenChartEl) {
      const chart = echarts.init(tokenChartEl);
      chart.setOption({
        ...base,
        xAxis: { type: "category", data: data.tokenDays.map((item) => item.date), ...ax },
        yAxis: { type: "value", ...ax },
        series: [
          {
            type: "bar",
            barWidth: "42%",
            data: data.tokenDays.map((item) => item.wan),
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
              color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: p.blue }, { offset: 1, color: p.area }] },
            },
            markLine: {
              silent: true,
              symbol: "none",
              label: { color: p.dim, fontSize: 10, fontFamily: "Geist Mono", formatter: "AVG {c}" },
              lineStyle: { color: p.gold, type: [3, 4], width: 1 },
              data: [{ type: "average" }],
            },
          },
        ],
      });
      charts.push(chart);
    }

    if (qualityChartEl) {
      const chart = echarts.init(qualityChartEl);
      chart.setOption({
        ...base,
        radar: {
          indicator: data.qualityRows.map((item) => ({ name: item.name, max: 100 })),
          splitNumber: 4,
          axisName: { color: p.text, fontSize: 11 },
          splitArea: { areaStyle: { color: ["rgba(255,255,255,0.01)", "rgba(255,255,255,0.03)"] } },
          splitLine: { lineStyle: { color: p.split } },
          axisLine: { lineStyle: { color: p.split } },
        },
        series: [
          {
            type: "radar",
            data: [
              {
                value: data.qualityRows.map((item) => item.value),
                name: "综合评估",
                symbol: "circle",
                symbolSize: 5,
                areaStyle: { color: p.area },
                lineStyle: { color: p.blue, width: 2 },
                itemStyle: { color: p.gold },
              },
            ],
          },
        ],
      });
      charts.push(chart);
    }
    charts.forEach((chart) => chart.resize());
  }

  function bindModal() {
    function closeModal() {
      modal.hidden = true;
    }
    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  function bindStorageRefresh() {
    window.addEventListener("storage", () => {
      data = createDashboardData();
      buildKpis();
      buildMatrix();
      buildFeed();
      buildQueue();
      buildKnowledge();
      buildAssets();
      renderCharts();
    });
  }

  function bindProjectDetail() {
    window.__openBigscreenProject = (projectId) => {
      const project = data.projects.find((item) => item.id === projectId);
      if (project) window.location.hash = `project-${project.id}`;
    };
  }

  function boot() {
    document.documentElement.dataset.theme = theme;
    updateClock();
    setInterval(updateClock, 1000);
    fitStage();
    window.addEventListener("resize", fitStage);
    window.addEventListener("resize", () => charts.forEach((chart) => chart.resize()));
    buildKpis();
    buildMatrix();
    buildFeed();
    buildQueue();
    buildKnowledge();
    buildAssets();
    renderCharts();
    bindModal();
    bindProjectDetail();
    bindAssetTabs();
    bindFullscreen();
    bindStorageRefresh();
    themeToggle.addEventListener("click", () => applyTheme(theme === "dark" ? "light" : "dark"));
    dataSource.textContent = `DATA SOURCE: ${data.accountRecords.length ? "LOCAL STORAGE" : "DEMO FALLBACK"}`;
  }

  boot();
})();
