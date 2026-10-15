import { safeUrl } from './lib'

const urlPattern = /https?:\/\/[^\s，。；;）)】>]+/gi
const emptyValue = /^(?:none|null|undefined|无|暂无|未填写)$/i

export function firstLink(value: string | null | undefined) {
  if (!value) return undefined
  return [...value.matchAll(urlPattern)]
    .map(match => safeUrl(match[0].replace(/[、,.，。]+$/, '')))
    .find(Boolean)
}

export function displayText(value: string | null | undefined) {
  if (!value) return '未填写'
  const text = value
    .replace(urlPattern, '')
    .replace(/(?:其他链接|会议链接|考试链接|笔试链接|链接|网址|地点|位置)\s*[：:]\s*(?=$|[·,，;；])/gi, '')
    .split(/\s*[·,，;；]\s*/)
    .map(part => part.trim())
    .filter(part => part && !emptyValue.test(part))
    .join(' · ')
    .trim()
  return text || '未填写'
}

export function displayRole(role: string | null | undefined) {
  return !role || role.trim() === '岗位待补充' ? '未填写' : displayText(role)
}

export function displayPlatform(platform: string | null, jobUrl: string | null) {
  const direct = firstLink(platform)
  if (direct) return new URL(direct).hostname.replace(/^www\./, '')
  const text = displayText(platform)
  if (text !== '未填写') return text
  const jobLink = safeUrl(jobUrl)
  return jobLink ? new URL(jobLink).hostname.replace(/^www\./, '') : '未填写'
}
