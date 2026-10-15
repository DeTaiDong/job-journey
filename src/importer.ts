export interface ImportRow {
  company: string
  role: string
  job_url: string
  platform: string
  notes: string
  password: string
  sourceLines: number[]
}

const knownCompanies = [
  '国家开发银行', '中国农业银行', '中国邮储银行', '中国建设银行', '中国工商银行',
  '中国银行', '中银国际', '交通银行', '浙商银行', '中信银行', '民生银行',
  '瑞众保险', '渤海银行', '汇丰银行', '招商银行', '国元证券'
]

const secretLabel = /密码|通行证码|校招编码|登录码|口令/i
const urlPattern = /https?:\/\/[^\s，。；;）)】>]+/g
function isHttpUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}

export function parseLegacyText(text: string): ImportRow[] {
  const records = new Map<string, ImportRow>()
  let current: ImportRow | undefined
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (!line) return
    const company = knownCompanies.find(name => line.includes(name))
    if (company) {
      current = records.get(company)
      if (!current) {
        current = { company, role: '岗位待补充', job_url: '', platform: '', notes: '', password: '', sourceLines: [] }
        records.set(company, current)
      }
    }
    if (!current) return
    current.sourceLines.push(index + 1)
    const urls = [...line.matchAll(urlPattern)].map(match => match[0].replace(/[、,.，。]+$/, '')).filter(isHttpUrl)
    for (const url of urls) {
      if (!current.job_url) {
        current.job_url = url
        try { current.platform = new URL(url).hostname.replace(/^www\./, '') } catch { /* URL was already validated */ }
      } else if (url !== current.job_url && !current.notes.includes(url)) {
        current.notes += `${current.notes ? '\n' : ''}其他链接：${url}`
      }
    }
    const colon = line.search(/[：:]/)
    const label = colon >= 0 ? line.slice(0, colon).trim() : ''
    const value = colon >= 0 ? line.slice(colon + 1).trim() : ''
    if (secretLabel.test(label) && value) {
      const secretName = label.replace(company || current.company, '').trim() || '网站密码'
      current.password += `${current.password ? '\n' : ''}${secretName}：${value}`
    } else if (!urls.length && value && !line.includes('@')) {
      current.notes += `${current.notes ? '\n' : ''}${line}`
    } else if (!urls.length && colon < 0 && line.length > 5) {
      current.notes += `${current.notes ? '\n' : ''}${line}`
    }
  })
  return [...records.values()].filter(row => row.job_url || row.password || row.notes)
}
