import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import pptxgen from 'pptxgenjs'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

type LexiangEnv = Record<string, string>
type LexiangTarget = { type: 'team' | 'team_code' | 'space' | 'kb_entry'; id: string }
type LexiangPptPayload = { title?: string; prompt?: string; blocks?: Array<{ title: string; items: string[] }> }
type GeneratedPptSlide = { title: string; point: string; visual: string }
type LexiangReference = { title: string; url?: string; content?: string }

let cachedLexiangToken = ''
let cachedLexiangTokenExpiresAt = 0

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  const text = JSON.stringify(body)
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(text, 'utf8'))
  res.end(Buffer.from(text, 'utf8'))
}

function readJsonBody(req: IncomingMessage) {
  return new Promise<LexiangPptPayload>((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 64 * 1024) {
        reject(new Error('请求内容过大'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw) as LexiangPptPayload)
      } catch {
        reject(new Error('请求 JSON 解析失败'))
      }
    })
    req.on('error', reject)
  })
}

function parseLexiangTargets(env: LexiangEnv): LexiangTarget[] {
  if (env.LEXIANG_TARGETS) {
    try {
      const parsed = JSON.parse(env.LEXIANG_TARGETS) as LexiangTarget[]
      return Array.isArray(parsed) ? parsed.filter((item) => item.type && item.id) : []
    } catch {
      return []
    }
  }
  if (env.LEXIANG_TARGET_TYPE && env.LEXIANG_TARGET_ID) {
    return [{ type: env.LEXIANG_TARGET_TYPE as LexiangTarget['type'], id: env.LEXIANG_TARGET_ID }]
  }
  return []
}

function buildLexiangPptQuery(payload: LexiangPptPayload) {
  const blockText = (payload.blocks || [])
    .slice(0, 6)
    .map((block) => `${block.title}：${block.items.slice(0, 4).join('；')}`)
    .join('\n')
  return [
    '请基于乐享知识库资料，生成一份高校商学院创业实践项目的10页路演PPT结构。',
    '输出格式要求：每页一行，格式为“第N页｜页面标题｜核心观点｜图表/素材建议”。',
    '要求内容正式、可用于客户演示，优先引用知识库中与PPT模板、BP、创业案例、评分标准相关的资料。',
    `项目标题：${payload.title || 'AI 就业教练'}`,
    payload.prompt ? `学生输入：${payload.prompt}` : '',
    blockText ? `已有成果：\n${blockText}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1024)
}

function fallbackPptContext(payload: LexiangPptPayload, reason: string) {
  return {
    configured: false,
    content: [
      `乐享知识库暂未完成配置：${reason}`,
      '当前先使用 Demo 内置 PPT 结构预览。',
      `项目标题：${payload.title || 'AI 就业教练'}`,
    ].join('\n'),
    references: [] as Array<{ title: string; url?: string; content?: string }>,
  }
}

function parseGeneratedPptSlides(content: string, title = 'AI 就业教练 - 路演 PPT'): GeneratedPptSlide[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const parsed = lines
    .filter((line) => /第?\s*\d+\s*页|^\d+[.、)]/.test(line))
    .slice(0, 10)
    .map((line) => {
      const cleaned = line.replace(/^[-*\s]*/, '').replace(/^第?\s*\d+\s*页[：:｜|、.)]?\s*/, '').replace(/^\d+[.、)]\s*/, '')
      const parts = cleaned
        .split(/[｜|]/)
        .map((part) => part.trim())
        .filter(Boolean)
      return {
        title: parts[0] || cleaned.slice(0, 24) || 'PPT 页面',
        point: parts[1] || parts[2] || '基于乐享知识库生成的页面观点。',
        visual: parts[2] || parts[3] || '建议使用业务流程、数据图表或成果截图支撑。',
      }
    })
  if (parsed.length) return parsed
  return [
    { title: title.replace(/\s*-\s*路演 PPT$/, ''), point: '用一页封面说明项目定位和演示场景。', visual: '封面图 + 项目一句话价值主张' },
    { title: '课堂痛点', point: '创业实践课需要把创意、反馈和成果沉淀串成闭环。', visual: '痛点矩阵' },
    { title: '目标用户', point: '学生、教师和学院管理者分别关注效率、质量和过程可见。', visual: '三类用户画像' },
    { title: '解决方案', point: 'AI 工作台承接 BP、PPT、答辩和多媒体物料生成。', visual: '产品流程图' },
    { title: '知识库支撑', point: '课程模板、案例和评分标准让生成内容贴近教学要求。', visual: '知识库结构图' },
    { title: '教师审核', point: '教师保留关键节点判断权，AI 负责草稿和修改建议。', visual: '审核闭环图' },
    { title: '成果沉淀', point: '优秀成果进入案例库，反哺下一轮课程。', visual: '成果库看板' },
    { title: '商业模式', point: '面向学院或课程组提供订阅、定制训练包和案例库服务。', visual: '收入模式表' },
    { title: '试点路径', point: '以 8 周课程试点验证活跃、审核和成果指标。', visual: '里程碑时间轴' },
    { title: '总结与行动', point: '下一步进入课程试点，收集反馈并打磨标准模板。', visual: '行动清单' },
  ]
}

async function writeGeneratedPptx(payload: LexiangPptPayload, content: string, references: LexiangReference[]) {
  const slides = parseGeneratedPptSlides(content, payload.title)
  const outputDir = path.join(process.cwd(), 'public', 'generated-ppts')
  await fs.mkdir(outputDir, { recursive: true })
  const fileName = `lexiang-roadshow-${Date.now()}.pptx`
  const outputPath = path.join(outputDir, fileName)
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Lexiang Knowledge Base'
  pptx.subject = payload.title || '路演 PPT'
  pptx.title = payload.title || '路演 PPT'
  pptx.company = 'SUFE AI Demo'
  pptx.theme = {
    headFontFace: 'Microsoft YaHei',
    bodyFontFace: 'Microsoft YaHei',
  }

  slides.forEach((item, index) => {
    const slide = pptx.addSlide()
    slide.background = { color: 'F8FBFE' }
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: index === 0 ? 'D6AD43' : '003B73' }, line: { color: index === 0 ? 'D6AD43' : '003B73' } })
    slide.addText('SHANGHAI UNIVERSITY OF FINANCE AND ECONOMICS · BUSINESS SCHOOL', {
      x: 0.65,
      y: 0.35,
      w: 8.8,
      h: 0.25,
      fontFace: 'Microsoft YaHei',
      fontSize: 8,
      color: '6E7B8F',
    })
    slide.addText(item.title, {
      x: 0.65,
      y: 0.85,
      w: 8.8,
      h: 0.62,
      fontFace: 'Microsoft YaHei',
      fontSize: 25,
      bold: true,
      color: '003B73',
      fit: 'shrink',
    })
    slide.addShape(pptx.ShapeType.line, { x: 0.65, y: 1.6, w: 1.2, h: 0, line: { color: 'D6AD43', width: 2 } })
    slide.addText(item.point, {
      x: 0.65,
      y: 1.9,
      w: 6.25,
      h: 2.15,
      fontFace: 'Microsoft YaHei',
      fontSize: 18,
      bold: true,
      color: '0F243D',
      breakLine: false,
      fit: 'shrink',
    })
    slide.addShape(pptx.ShapeType.roundRect, { x: 7.25, y: 1.85, w: 5.15, h: 2.55, rectRadius: 0.12, fill: { color: 'FFFFFF' }, line: { color: 'D8E4F0', width: 1 } })
    slide.addText('图表 / 素材建议', { x: 7.55, y: 2.15, w: 2.5, h: 0.28, fontSize: 12, bold: true, color: '003B73' })
    slide.addText(item.visual, { x: 7.55, y: 2.58, w: 4.35, h: 1.35, fontSize: 15, color: '1D3858', fit: 'shrink' })
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.65, y: 4.75, w: 11.75, h: 1.5, rectRadius: 0.12, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', width: 1 } })
    slide.addText('乐享知识库生成', { x: 0.95, y: 5.0, w: 2.2, h: 0.28, fontSize: 11, bold: true, color: 'D6AD43' })
    slide.addText(references[0]?.title ? `引用来源：${references[0].title}` : '引用来源：乐享知识库 AI 问答结果', {
      x: 0.95,
      y: 5.38,
      w: 10.75,
      h: 0.38,
      fontSize: 10.5,
      color: '4A5D74',
      fit: 'shrink',
    })
    slide.addText(`${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`, {
      x: 11.35,
      y: 6.78,
      w: 0.95,
      h: 0.2,
      fontSize: 8,
      color: 'D6AD43',
      align: 'right',
    })
  })

  await pptx.writeFile({ fileName: outputPath })
  return {
    pptUrl: `/generated-ppts/${fileName}`,
    pptFileName: fileName,
  }
}

async function getLexiangToken(env: LexiangEnv) {
  if (cachedLexiangToken && Date.now() < cachedLexiangTokenExpiresAt) return cachedLexiangToken
  const apiBase = env.LEXIANG_API_BASE || 'https://lxapi.lexiangla.com'
  const response = await fetch(`${apiBase}/cgi-bin/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      app_key: env.LEXIANG_APP_KEY,
      app_secret: env.LEXIANG_APP_SECRET,
    }),
  })
  const result = (await response.json()) as { access_token?: string; expires_in?: number; errors?: unknown }
  if (!response.ok || !result.access_token) {
    throw new Error(`乐享 access_token 获取失败：HTTP ${response.status}`)
  }
  cachedLexiangToken = result.access_token
  cachedLexiangTokenExpiresAt = Date.now() + Math.max(60, (result.expires_in || 7200) - 120) * 1000
  return cachedLexiangToken
}

async function requestLexiangPptContext(env: LexiangEnv, payload: LexiangPptPayload) {
  if (!env.LEXIANG_APP_KEY || !env.LEXIANG_APP_SECRET) {
    return fallbackPptContext(payload, '缺少 LEXIANG_APP_KEY 或 LEXIANG_APP_SECRET')
  }
  const token = await getLexiangToken(env)
  const apiBase = env.LEXIANG_API_BASE || 'https://lxapi.lexiangla.com'
  const staffId = env.LEXIANG_STAFF_ID || 'system-bot'
  const requestBody: Record<string, unknown> = {
    query: buildLexiangPptQuery(payload),
    stream: false,
    skip_faq: true,
    new_session: true,
    qa_mode: env.LEXIANG_QA_MODE || 'normal',
    max_chars: Number(env.LEXIANG_MAX_CHARS || '1800'),
    language: 'zh-CN',
    targets: parseLexiangTargets(env),
  }
  if (staffId === 'system-bot') {
    requestBody.anonymous_staff_id = env.LEXIANG_ANONYMOUS_STAFF_ID || 'sufepptgenerator0001'
  }
  const response = await fetch(`${apiBase}/cgi-bin/v1/ai/qa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
      'x-staff-id': staffId,
    },
    body: JSON.stringify(requestBody),
  })
  const result = (await response.json()) as {
    code?: number
    message?: string
    data?: {
      content?: string
      additional_content?: {
        reference_docs?: Array<{ title: string; url?: string }>
        reference_chunks?: Array<{ title: string; url?: string; content?: string }>
      }
    }
  }
  if (!response.ok || result.code !== 0 || !result.data?.content) {
    throw new Error(`乐享 AI 问答失败：${result.message || `HTTP ${response.status}`}`)
  }
  const references = result.data.additional_content?.reference_docs || result.data.additional_content?.reference_chunks || []
  const generatedPpt = await writeGeneratedPptx(payload, result.data.content, references)
  return { configured: true, content: result.data.content, references, ...generatedPpt }
}

function lexiangApiPlugin(env: LexiangEnv): Plugin {
  return {
    name: 'lexiang-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = new URL(req.url || '/', 'http://localhost').pathname
        if (requestPath !== '/lexiang-api/ppt-context') {
          next()
          return
        }
        if (req.method !== 'POST') {
          sendJson(res, 405, { message: 'Method Not Allowed' })
          return
        }
        readJsonBody(req)
          .then((payload) => requestLexiangPptContext(env, payload))
          .then((data) => sendJson(res, 200, data))
          .catch((error: unknown) => {
            sendJson(res, 500, { message: error instanceof Error ? error.message : '乐享知识库调用失败' })
          })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const workBuddyTarget = env.VITE_WORKBUDDY_PROXY_TARGET || 'http://127.0.0.1:49678'

  return {
    base: './',
    plugins: [react(), lexiangApiPlugin(env)],
    server: {
      proxy: {
        '/workbuddy-api': {
          target: workBuddyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/workbuddy-api/, ''),
        },
      },
    },
  }
})
