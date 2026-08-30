/**
 * SM.MS 图床上传代理（Node 侧，仅 dev 加载）。
 * Token 由调用方（中间件）从环境注入，绝不在此回传。
 */
export interface UploadResult {
  url: string
}

export class SmmsError extends Error {
  constructor(message: string, readonly cause_?: unknown) {
    super(message)
    this.name = 'SmmsError'
  }
}

export interface SmmsOptions {
  /**
   * 全局 fetch 可注入用于测试；默认用 Node 全局 fetch。
   * 签名对齐 DOM/undici fetch。
   */
  fetchFn?: typeof fetch
}

export function uploadToSmms(
  token: string,
  fileBuffer: Buffer,
  filename: string,
  mime: string,
  options: SmmsOptions = {},
): Promise<UploadResult> {
  const fetchFn = options.fetchFn ?? fetch
  return doUpload(token, fileBuffer, filename, mime, fetchFn)
}

async function doUpload(
  token: string,
  fileBuffer: Buffer,
  filename: string,
  mime: string,
  fetchFn: typeof fetch,
): Promise<UploadResult> {
  if (!token) {
    throw new SmmsError('SMMS_TOKEN 未配置，请在项目根 .env.local 中设置')
  }

  const form = new FormData()
  form.append('smfile', new Blob([fileBuffer], { type: mime }), filename)

  let res: Response
  try {
    res = await fetchFn('https://sm.ms/api/v2/upload', {
      method: 'POST',
      headers: { Authorization: token },
      body: form,
    })
  } catch (err) {
    throw new SmmsError('上传失败：网络错误', err)
  }

  let json: any = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  if (!res.ok || json?.success !== true) {
    const reason =
      json && typeof json.message === 'string'
        ? json.message
        : `SM.MS 返回 HTTP ${res.status}`
    throw new SmmsError(`上传失败：${reason}`, json)
  }

  const url = json?.data?.url
  if (typeof url !== 'string' || url.length === 0) {
    throw new SmmsError('上传失败：SM.MS 未返回图片 URL', json)
  }
  return { url }
}