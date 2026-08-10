INSERT INTO knowledge_base (id, category, description, used_by, active, created_at, updated_at)
SELECT 'KB-001', '教学大纲', '课程阶段、教学目标、8 周节奏和阶段成果要求。', '头脑风暴、项目定位、BP、PPT、答辩', TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE category = '教学大纲');

INSERT INTO knowledge_base (id, category, description, used_by, active, created_at, updated_at)
SELECT 'KB-002', 'BP 模板', '商业计划书章节结构、内容颗粒度、商业模式和财务假设。', '项目定位、商业计划书、PPT、答辩', TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE category = 'BP 模板');

INSERT INTO knowledge_base (id, category, description, used_by, active, created_at, updated_at)
SELECT 'KB-003', 'PPT 模板', '路演页序、页面观点、图表建议和演讲提示。', '路演 PPT、答辩模拟、多媒体物料', TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE category = 'PPT 模板');

INSERT INTO knowledge_base (id, category, description, used_by, active, created_at, updated_at)
SELECT 'KB-004', '评分标准', 'Rubric、审核维度、通过或退回口径和优秀成果判断标准。', 'BP、PPT、答辩、教师审核', TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE category = '评分标准');

INSERT INTO knowledge_base (id, category, description, used_by, active, created_at, updated_at)
SELECT 'KB-005', '创业案例', '优秀项目案例、行业标签、商业模式样例和课堂可复用素材。', '头脑风暴、项目定位、BP、市场判断', TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE category = '创业案例');

INSERT INTO knowledge_base (id, category, description, used_by, active, created_at, updated_at)
SELECT 'KB-006', '答辩题库', '评委高频追问、压力测试问题、回答结构和表达评价标准。', '答辩模拟', TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE category = '答辩题库');

INSERT INTO knowledge_base (id, category, description, used_by, active, created_at, updated_at)
SELECT 'KB-007', '多媒体模板', '短视频脚本、分镜表、海报文案、视觉 Prompt 和宣传素材样例。', '多媒体物料专家', TRUE, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE category = '多媒体模板');
