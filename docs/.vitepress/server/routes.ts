/**
 * /api/admin/* 路由分发（Node 侧，仅 dev 加载）。
 * 负责 HTTP 行为：URL 解析、请求体读取、校验、错误码映射、JSON 响应。
 * 业务逻辑（读文件、上传）委托给 posts-store 与 upload-cos。
 */
import { URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  PostsStore,
  NotFoundError,
  ConflictError,
  type PostMeta,
} from './posts-store'
import type { UploadFile, UploadResult } from './upload-cos'
import { CosError } from './upload-cos'
import { validateSlug } from '../lib/slug'
import { isValidDate, type PostFrontmatter } from '../lib/frontmatter'

export type Uploader = (file: UploadFile) => Promise<UploadResult>

export const ADMIN_PREFIX = '/api/admin'

export type AdminRoute =
  | { type: 'list' }
  | { type: 'get'; slug: string }
  | { type: 'save'; slug: string }
  | { type: 'remove'; slug: string }
  | { type: 'upload' }
  | { type: 'trash-list' }
  | { type: 'trash-restore'; slug: string }
  | { type: 'trash-remove'; slug: string }
  | { type: 'notfound' }

/** 纯函数：把 URL 路径 + HTTP 方法解析为路由，方便单测。 */
export function parseAdminRoute(urlPath: string, method = 'GET'): AdminRoute {
  const p = urlPath.startsWith(ADMIN_PREFIX)
    ? urlPath.slice(ADMIN_PREFIX.length)
    : urlPath
  const parts = p.split('/').filter(Boolean)
  const up = method.toUpperCase()

  // 同一资源路径 posts/:slug 按方法区分 get/save/remove
  if (parts.length === 2 && parts[0] === 'posts') {
    if (up === 'PUT') return { type: 'save', slug: parts[1] }
    if (up === 'DELETE') return { type: 'remove', slug: parts[1] }
    return { type: 'get', slug: parts[1] }
  }
  if (parts.length === 1 && parts[0] === 'posts') return { type: 'list' }
  if (parts.length === 1 && parts[0] === 'upload') return { type: 'upload' }
  if (parts.length === 1 && parts[0] === 'trash') return { type: 'trash-list' }
  if (parts.length === 3 && parts[0] === 'trash' && parts[2] === 'restore') {
    return { type: 'trash-restore', slug: parts[1] }
  }
  if (parts.length === 2 && parts[0] === 'trash') {
    if (up === 'DELETE') return { type: 'trash-remove', slug: parts[1] }
    return { type: 'trash-restore', slug: parts[1] }
  }
  return { type: 'notfound' }
}

export interface AdminContext {
  store: PostsStore
  /** COS 上传器；未配置为 null（此时上传接口返回 503） */
  uploader?: Uploader | null
}

export async function handleAdminRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: AdminContext,
): Promise<void> {
  const url = req.url ? new URL(req.url, 'http://localhost') : null
  const pathname = url?.pathname ?? ''
  const method = req.method ?? 'GET'
  const route = parseAdminRoute(pathname, method)

  try {
    switch (route.type) {
      case 'list':
        return await handleList(res, ctx)
      case 'get':
        return await handleGet(res, route.slug, ctx)
      case 'save':
        if (method !== 'PUT') return methodNotAllowed(res)
        return await handleSave(res, route.slug, req, ctx)
      case 'remove':
        if (method !== 'DELETE') return methodNotAllowed(res)
        return await handleRemove(res, route.slug, ctx)
      case 'upload':
        if (method !== 'POST') return methodNotAllowed(res)
        return await handleUpload(res, req, ctx)
      case 'trash-list':
        return await handleTrashList(res, ctx)
      case 'trash-restore':
        return await handleTrashRestore(res, route.slug, method, ctx)
      case 'trash-remove':
        if (method !== 'DELETE') return methodNotAllowed(res)
        return await handleTrashRemove(res, route.slug, ctx)
      default:
        return notFound(res)
    }
  } catch (err) {
    if (err instanceof NotFoundError) return notFound(res)
    if (err instanceof ConflictError) return conflict(res, err)
    if (err instanceof CosError) return uploadError(res, err)
    status500(res, err)
  }
}

async function handleList(res: ServerResponse, ctx: AdminContext): Promise<void> {
  const list: PostMeta[] = await ctx.store.list()
  json(res, 200, list)
}

async function handleGet(
  res: ServerResponse,
  slug: string,
  ctx: AdminContext,
): Promise<void> {
  const rec = await ctx.store.get(slug)
  if (!rec) return notFound(res)
  json(res, 200, rec)
}

async function handleSave(
  res: ServerResponse,
  slug: string,
  req: IncomingMessage,
  ctx: AdminContext,
): Promise<void> {
  const slugCheck = validateSlug(slug)
  if (!slugCheck.ok) return badRequest(res, slugCheck.error)

  let parsed: any
  try {
    parsed = JSON.parse((await readBody(req)).toString('utf8'))
  } catch {
    return badRequest(res, '请求体不是合法 JSON')
  }

  const fm: unknown = parsed?.frontmatter
  const bodyRaw: unknown = parsed?.body
  if (typeof bodyRaw !== 'string') return badRequest(res, '缺少 body')
  const fmErr = validateFrontmatter(fm)
  if (fmErr) return badRequest(res, fmErr)

  const frontmatter = fm as PostFrontmatter
  try {
    const saved = await ctx.store.save(slug, frontmatter, bodyRaw)
    json(res, 200, saved)
  } catch (err) {
    status500(res, err)
  }
}

async function handleRemove(
  res: ServerResponse,
  slug: string,
  ctx: AdminContext,
): Promise<void> {
  await ctx.store.remove(slug)
  res.statusCode = 204
  res.end()
}

async function handleTrashList(res: ServerResponse, ctx: AdminContext): Promise<void> {
  json(res, 200, await ctx.store.listTrash())
}

async function handleTrashRestore(
  res: ServerResponse,
  slug: string,
  method: string,
  ctx: AdminContext,
): Promise<void> {
  if (method !== 'POST') return methodNotAllowed(res)
  const slugCheck = validateSlug(slug)
  if (!slugCheck.ok) return badRequest(res, slugCheck.error)
  const saved = await ctx.store.restore(slugCheck.slug)
  json(res, 200, saved)
}

async function handleTrashRemove(
  res: ServerResponse,
  slug: string,
  ctx: AdminContext,
): Promise<void> {
  const slugCheck = validateSlug(slug)
  if (!slugCheck.ok) return badRequest(res, slugCheck.error)
  await ctx.store.permanentRemove(slugCheck.slug)
  res.statusCode = 204
  res.end()
}

async function handleUpload(
  res: ServerResponse,
  req: IncomingMessage,
  ctx: AdminContext,
): Promise<void> {
  const contentType = req.headers['content-type'] ?? ''
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  if (!boundary) return badRequest(res, '缺少 multipart boundary')

  const raw = await readBody(req)
  const file = parseMultipartFile(raw, (boundary[1] || boundary[2]).trim())
  if (!file) return badRequest(res, '缺少文件字段 file')

  if (!ctx.uploader) {
    return json(
      res,
      503,
      { error: 'COS 未配置，请在项目根 .env.local 中设置 COS_SECRET_ID 等变量' },
    )
  }
  const { url } = await ctx.uploader({ data: file.data, filename: file.filename, mime: file.mime })
  json(res, 200, { url })
}

function validateFrontmatter(fm: unknown): string | null {
  if (typeof fm !== 'object' || fm === null) return '缺少 frontmatter'
  const t = (fm as PostFrontmatter).title
  const d = (fm as PostFrontmatter).date
  if (typeof t !== 'string' || t.length === 0) return 'frontmatter.title 必填'
  if (!isValidDate(d)) return 'frontmatter.date 必须为 YYYY-MM-DD'
  const tags = (fm as PostFrontmatter).tags
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((x) => typeof x !== 'string')))
    return 'frontmatter.tags 必须为字符串数组'
  const excerpt = (fm as PostFrontmatter).excerpt
  if (excerpt !== undefined && typeof excerpt !== 'string') return 'frontmatter.excerpt 必须为字符串'
  const cover = (fm as PostFrontmatter).cover
  if (cover !== undefined && typeof cover !== 'string') return 'frontmatter.cover 必须为字符串'
  return null
}

interface MultipartFile {
  filename: string
  mime: string
  data: Buffer
}

/** 极简 multipart 解析：仅提取名为 `file` 的单个字段（图片上传用）。 */
function parseMultipartFile(raw: Buffer, boundary: string): MultipartFile | null {
  const delimiter = Buffer.from(`--${boundary}`)
  const parts: Buffer[] = []
  let start = 0
  while (start < raw.length) {
    const idx = raw.indexOf(delimiter, start)
    if (idx === -1) break
    const next = raw.indexOf(delimiter, idx + delimiter.length)
    if (next === -1) break
    parts.push(raw.subarray(idx + delimiter.length, next))
    start = next
  }

  for (const part of parts) {
    // 跳过结尾 CRLF 或空
    const body = part.subarray(2) // 去掉前置 \r\n
    const headerEnd = body.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const header = body.subarray(0, headerEnd).toString('utf8')
    const content = body.subarray(headerEnd + 4)
    if (!/name="file"/.test(header)) continue

    const filenameMatch = /filename="([^"]*)"/.exec(header)
    const mimeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(header)
    const filename = filenameMatch?.[1] ?? 'upload.bin'
    const mime = (mimeMatch?.[1] ?? 'application/octet-stream').trim()
    return {
      filename,
      mime,
      data: content.subarray(0, content.length - 2), // 去掉尾部 \r\n
    }
  }
  return null
}

/** 原样读取请求体字节（不转码）。文本接口需字符串时由调用方自行 toString。 */
async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

function json(res: ServerResponse, status: number, data: unknown): void {
  const payload = JSON.stringify(data)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(payload)
}

function badRequest(res: ServerResponse, message: string): void {
  json(res, 400, { error: message })
}
function notFound(res: ServerResponse): void {
  json(res, 404, { error: '未找到' })
}
function conflict(res: ServerResponse, err: ConflictError): void {
  json(res, 409, { error: err.message })
}
function methodNotAllowed(res: ServerResponse): void {
  res.statusCode = 405
  res.end()
}
function uploadError(res: ServerResponse, err: CosError): void {
  const notConfigured = err.message.includes('未配置')
  json(res, notConfigured ? 503 : 502, { error: err.message })
}
function status500(res: ServerResponse, err: unknown): void {
  res.statusCode = 500
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
}