import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, ChevronDown, Clock3, ExternalLink, Eye, EyeOff, LayoutDashboard, LockKeyhole, LogOut, Menu, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { configured, decryptPassword, encryptPassword, formatDate, formatDateTime, safeUrl, supabase, type Application, type Event, type EventType, type Status } from './lib'
import { parseLegacyText, type ImportRow } from './importer'

type View = 'overview' | 'applications' | 'schedule'
const statuses: Status[] = ['已投递', '笔试', '面试', 'Offer', '已结束']
const eventTypes: EventType[] = ['笔试', '技术面', 'HR面', '综合面', '其他']
const emptyApplication = { company: '', role: '', status: '已投递' as Status, applied_at: new Date().toLocaleDateString('en-CA'), job_url: '', platform: '', notes: '', password: '' }
const emptyEvent = { application_id: '', type: '笔试' as EventType, starts_at: '', location: '', notes: '', completed: false }

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部状态')
  const [appModal, setAppModal] = useState<Application | 'new' | null>(null)
  const [eventModal, setEventModal] = useState<Event | 'new' | null>(null)
  const [eventAppId, setEventAppId] = useState('')
  const [vaultRecord, setVaultRecord] = useState<Application | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [vaultPassphrase, setVaultPassphrase] = useState('')
  const [toast, setToast] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!supabase) { setLoadingSession(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoadingSession(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (session) void refresh(); else { setApplications([]); setEvents([]); setVaultPassphrase('') } }, [session?.user.id])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])

  async function refresh() {
    if (!supabase) return
    setLoading(true)
    const [a, e] = await Promise.all([
      supabase.from('applications').select('*').order('applied_at', { ascending: false }),
      supabase.from('events').select('*').order('starts_at', { ascending: true })
    ])
    if (a.error || e.error) setToast(`读取失败：${a.error?.message || e.error?.message}`)
    else { setApplications(a.data as Application[]); setEvents(e.data as Event[]) }
    setLoading(false)
  }
  const upcoming = useMemo(() => events.filter(e => !e.completed && new Date(e.starts_at).getTime() >= now), [events, now])
  const filtered = useMemo(() => applications.filter(a => (statusFilter === '全部状态' || a.status === statusFilter) && `${a.company} ${a.role} ${a.platform || ''}`.toLowerCase().includes(search.toLowerCase())), [applications, search, statusFilter])
  const nameFor = (id: string) => applications.find(a => a.id === id)
  const closeNav = (next: View) => { setView(next); setMenuOpen(false) }

  if (!configured) return <Setup />
  if (loadingSession) return <div className="loading-screen"><div className="brand-symbol">J</div><p>正在加载求职手帐…</p></div>
  if (!session) return <Auth onNotice={setToast} toast={toast} />

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><span className="brand-symbol">J</span><span><strong>求职手帐</strong><small>JOB JOURNEY</small></span></div>
      <div className="nav-label">工作台</div>
      <nav aria-label="主导航">
        <button className={view === 'overview' ? 'active' : ''} onClick={() => closeNav('overview')}><LayoutDashboard size={18} /> 总览</button>
        <button className={view === 'applications' ? 'active' : ''} onClick={() => closeNav('applications')}><BriefcaseBusiness size={18} /> 投递记录 <span>{applications.length}</span></button>
        <button className={view === 'schedule' ? 'active' : ''} onClick={() => closeNav('schedule')}><CalendarDays size={18} /> 笔面试日程 <span>{upcoming.length}</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="security-note"><ShieldCheck size={19} /><div><strong>私密记录</strong><p>数据仅你本人可访问，密码加密存储。</p></div></div><button className="account" onClick={() => supabase?.auth.signOut()}><span className="avatar">{session.user.email?.charAt(0).toUpperCase()}</span><span className="account-email">{session.user.email}</span><LogOut size={16} /></button></div>
    </aside>
    {menuOpen && <button className="backdrop mobile-backdrop" aria-label="关闭导航" onClick={() => setMenuOpen(false)} />}
    <main className="main">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="打开导航" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><span>个人工作台</span><span className="crumb">/</span><strong>{view === 'overview' ? '总览' : view === 'applications' ? '投递记录' : '笔面试日程'}</strong></div><div className="topbar-right"><span className="sync-dot" /> 已安全同步 <span className="avatar small">{session.user.email?.charAt(0).toUpperCase()}</span></div></header>
      <div className="content">
        {view === 'overview' && <>
          <div className="page-intro"><div><div className="eyebrow">YOUR CAREER, IN ONE PLACE</div><h1>你的求职进展，<br /><em>尽在掌握。</em></h1><p>记录每一次投递，安排每一场面试，稳稳走向下一站。</p></div><button className="primary-button intro-action" onClick={() => setAppModal('new')}><Plus size={18} /> 新增投递</button></div>
          <div className="stats-grid"><Stat label="总投递" value={applications.length} note="已记录的申请" icon={<BriefcaseBusiness size={21} />} tone="purple" /><Stat label="进行中" value={applications.filter(a => !['Offer', '已结束'].includes(a.status)).length} note="仍在等待进展" icon={<ArrowRight size={21} />} tone="blue" /><Stat label="即将开始" value={upcoming.length} note="待参加的笔面试" icon={<CalendarDays size={21} />} tone="orange" /><Stat label="已获 Offer" value={applications.filter(a => a.status === 'Offer').length} note="令人开心的消息" icon={<Check size={21} />} tone="green" /></div>
          <div className="two-column"><section className="panel"><PanelHead title="近期日程" subtitle="别错过重要的笔试和面试" action="查看全部" onAction={() => closeNav('schedule')} />{upcoming.length ? <div className="timeline">{upcoming.slice(0, 4).map(e => <EventRow key={e.id} event={e} application={nameFor(e.application_id)} onClick={() => setEventModal(e)} />)}</div> : <Empty icon={<CalendarDays size={26} />} title="暂无即将开始的日程" subtitle="收到笔面试通知后，记得把时间记在这里。" action="添加日程" onAction={() => { setEventAppId(''); setEventModal('new') }} />}</section><section className="panel"><PanelHead title="最近投递" subtitle="刚刚更新的申请记录" action="查看全部" onAction={() => closeNav('applications')} />{applications.length ? <div className="recent-list">{applications.slice(0, 5).map(a => <button className="recent-item" key={a.id} onClick={() => setAppModal(a)}><span className="company-mark">{a.company.charAt(0)}</span><span className="recent-name"><strong>{a.company}</strong><small>{a.role}</small></span><Badge status={a.status} /></button>)}</div> : <Empty icon={<BriefcaseBusiness size={26} />} title="从第一条投递开始" subtitle="公司、岗位和链接都能集中记录。" action="新增投递" onAction={() => setAppModal('new')} />}</section></div>
          <div className="hint-banner"><span className="hint-icon"><LockKeyhole size={20} /></span><div><strong>所有重要信息，都有条理地存放</strong><p>为每条投递记录网站链接、备注和加密密码，需要时随时查看。</p></div><button onClick={() => closeNav('applications')}>管理投递 <ArrowRight size={16} /></button></div>
        </>}
        {view === 'applications' && <><div className="section-header"><div><div className="eyebrow">APPLICATION TRACKER</div><h1>投递记录</h1><p>从投递到 Offer，让每一步都有迹可循。</p></div><button className="primary-button" onClick={() => setAppModal('new')}><Plus size={18} /> 新增投递</button></div><div className="panel table-panel"><div className="toolbar"><div className="search-field"><Search size={18} /><input placeholder="搜索公司、岗位或平台…" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="toolbar-actions"><div className="select-wrap"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>全部状态</option>{statuses.map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={16} /></div><button className="secondary-button" onClick={() => setImportOpen(true)}><Upload size={15} /> 导入 TXT</button></div></div>{filtered.length ? <div className="table-scroll"><table><thead><tr><th>公司 / 岗位</th><th>投递平台</th><th>投递日期</th><th>当前状态</th><th>操作</th></tr></thead><tbody>{filtered.map(a => <tr key={a.id}><td><div className="company-cell"><span className="company-mark">{a.company.charAt(0)}</span><span><strong>{a.company}</strong><small>{a.role}</small></span></div></td><td>{a.platform || <span className="muted">未填写</span>}</td><td>{formatDate(a.applied_at)}</td><td><Badge status={a.status} /></td><td><div className="row-actions">{safeUrl(a.job_url) && <a className="icon-button" href={safeUrl(a.job_url)} target="_blank" rel="noopener noreferrer" title="打开投递链接"><ExternalLink size={17} /></a>}{a.password_ciphertext && <button className="icon-button" title="查看密码" onClick={() => setVaultRecord(a)}><LockKeyhole size={17} /></button>}<button className="icon-button" title="编辑" onClick={() => setAppModal(a)}><Pencil size={17} /></button><button className="icon-button" title="添加日程" onClick={() => { setEventAppId(a.id); setEventModal('new') }}><CalendarDays size={17} /></button></div></td></tr>)}</tbody></table></div> : <Empty icon={<Search size={26} />} title={applications.length ? '没有符合条件的记录' : '还没有投递记录'} subtitle={applications.length ? '试试调整搜索词或筛选条件。' : '创建第一条，开始整理你的求职进展。'} action={applications.length ? undefined : '新增投递'} onAction={() => setAppModal('new')} />}</div></>}
        {view === 'schedule' && <><div className="section-header"><div><div className="eyebrow">YOUR SCHEDULE</div><h1>笔面试日程</h1><p>把时间、形式与备注放在一起，重要安排一目了然。</p></div><button className="primary-button" onClick={() => { setEventAppId(''); setEventModal('new') }}><Plus size={18} /> 添加日程</button></div><div className="schedule-grid"><section className="panel schedule-panel"><PanelHead title="即将开始" subtitle={`${upcoming.length} 项待参加安排`} />{upcoming.length ? <div className="timeline">{upcoming.map(e => <EventRow key={e.id} event={e} application={nameFor(e.application_id)} onClick={() => setEventModal(e)} />)}</div> : <Empty icon={<CalendarDays size={26} />} title="暂无即将开始的日程" subtitle="新增笔试或面试时间后会显示在这里。" action="添加日程" onAction={() => setEventModal('new')} />}</section><section className="panel schedule-panel"><PanelHead title="过往安排" subtitle="已完成或已过期的日程" />{events.filter(e => e.completed || new Date(e.starts_at).getTime() < now).length ? <div className="timeline history">{events.filter(e => e.completed || new Date(e.starts_at).getTime() < now).reverse().map(e => <EventRow key={e.id} event={e} application={nameFor(e.application_id)} onClick={() => setEventModal(e)} />)}</div> : <Empty icon={<Clock3 size={26} />} title="暂无过往安排" subtitle="结束的安排会留在这里，方便回顾。" />}</section></div></>}
      </div>
    </main>
    {appModal && <ApplicationDialog record={appModal} userId={session.user.id} passphrase={vaultPassphrase} onPassphrase={setVaultPassphrase} onClose={() => setAppModal(null)} onSaved={() => { setAppModal(null); setToast('投递记录已保存'); void refresh() }} onDeleted={() => { setAppModal(null); setToast('投递记录已删除'); void refresh() }} />}
    {eventModal && <EventDialog record={eventModal} applications={applications} initialAppId={eventAppId} userId={session.user.id} onClose={() => setEventModal(null)} onSaved={() => { setEventModal(null); setToast('日程已保存'); void refresh() }} onDeleted={() => { setEventModal(null); setToast('日程已删除'); void refresh() }} />}
    {vaultRecord && <VaultDialog record={vaultRecord} passphrase={vaultPassphrase} onPassphrase={setVaultPassphrase} onClose={() => setVaultRecord(null)} />}
    {importOpen && <ImportDialog userId={session.user.id} existing={applications} passphrase={vaultPassphrase} onPassphrase={setVaultPassphrase} onClose={() => setImportOpen(false)} onImported={count => { setImportOpen(false); setToast(`已导入 ${count} 条投递记录`); void refresh() }} />}
    {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}
    {loading && <span className="refresh-indicator">正在同步…</span>}
  </div>
}

function Setup() { return <div className="auth-page"><div className="auth-card"><span className="brand-symbol">J</span><div className="eyebrow">INITIAL SETUP</div><h1>先连接你的数据库</h1><p>跨设备同步需要 Supabase。请按项目 README 创建数据库，并在 Vercel 或本地环境变量中设置 <code>VITE_SUPABASE_URL</code> 和 <code>VITE_SUPABASE_ANON_KEY</code>。</p><div className="setup-note"><ShieldCheck size={19} /> 请使用公开的 publishable / anon key，切勿填入 service role key。</div></div></div> }
function Auth({ onNotice, toast }: { onNotice: (value: string) => void; toast: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [showResend, setShowResend] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    setShowResend((mode === 'signup' && !result.error) || Boolean(result.error?.message.toLowerCase().includes('email not confirmed')))
    onNotice(result.error ? result.error.message : mode === 'signup' ? '注册成功，请查看最新的验证邮件' : '登录成功')
  }
  async function resend() {
    if (!supabase || !email) return
    setBusy(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    onNotice(error ? error.message : '新的验证邮件已发送，请使用最新一封邮件中的链接')
  }
  return <div className="auth-page"><div className="auth-decoration"><div className="brand light"><span className="brand-symbol">J</span><span><strong>求职手帐</strong><small>JOB JOURNEY</small></span></div><div className="auth-quote"><span>✦</span><h1>每一步努力，<br />都值得被认真记录。</h1><p>从第一份投递，到下一个好消息。</p></div><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /></div><div className="auth-form-wrap"><div className="auth-form"><div className="mobile-brand brand"><span className="brand-symbol">J</span><span><strong>求职手帐</strong><small>JOB JOURNEY</small></span></div><div className="eyebrow">WELCOME BACK</div><h2>{mode === 'login' ? '欢迎回来' : '创建你的账户'}</h2><p>登录后，你的投递与日程会在各设备间同步。</p><form onSubmit={submit}><label>邮箱地址<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label><label>登录密码<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 6 位" /></label><button className="primary-button auth-submit" disabled={busy}>{busy ? '请稍候…' : mode === 'login' ? '登录工作台' : '创建账户'} <ArrowRight size={18} /></button></form>{showResend && <button className="resend-button" onClick={resend} disabled={busy || !email}>没有收到或链接失效？重新发送验证邮件</button>}<p className="auth-switch">{mode === 'login' ? '还没有账户？' : '已经有账户？'} <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? '立即注册' : '返回登录'}</button></p><div className="auth-foot"><ShieldCheck size={17} /> 你的记录仅与你的账户关联</div></div></div>{toast && <div className="toast">{toast}</div>}</div>
}
function Stat({ label, value, note, icon, tone }: { label: string; value: number; note: string; icon: React.ReactNode; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div> }
function Badge({ status }: { status: Status }) { return <span className={`badge badge-${status}`}>{status}</span> }
function PanelHead({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) { return <div className="panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div> }
function Empty({ icon, title, subtitle, action, onAction }: { icon: React.ReactNode; title: string; subtitle: string; action?: string; onAction?: () => void }) { return <div className="empty"><span className="empty-icon">{icon}</span><strong>{title}</strong><p>{subtitle}</p>{action && <button className="text-button" onClick={onAction}>{action} <ArrowRight size={16} /></button>}</div> }
function EventRow({ event, application, onClick }: { event: Event; application?: Application; onClick: () => void }) { return <button className="event-row" onClick={onClick}><span className="event-date"><strong>{new Date(event.starts_at).getDate()}</strong><small>{new Intl.DateTimeFormat('zh-CN', { month: 'short' }).format(new Date(event.starts_at))}</small></span><span className="event-main"><strong>{application?.company || '已删除的投递'} · {event.type}</strong><small>{application?.role || '日程记录'} {event.location ? ` · ${event.location}` : ''}</small></span><span className="event-time">{new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.starts_at))}</span><MoreHorizontal size={18} /></button> }

function Dialog({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) { return <div className="dialog-layer"><button className="backdrop" aria-label="关闭弹窗" onClick={onClose} /><div className="dialog" role="dialog" aria-modal="true" aria-label={title}><div className="dialog-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="关闭" onClick={onClose}><X size={21} /></button></div>{children}</div></div> }
function ApplicationDialog({ record, userId, passphrase, onPassphrase, onClose, onSaved, onDeleted }: { record: Application | 'new'; userId: string; passphrase: string; onPassphrase: (v: string) => void; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const editing = record !== 'new'
  const [form, setForm] = useState(() => editing ? { company: record.company, role: record.role, status: record.status, applied_at: record.applied_at, job_url: record.job_url || '', platform: record.platform || '', notes: record.notes || '', password: '' } : emptyApplication)
  const [showPassword, setShowPassword] = useState(false)
  const [clearPassword, setClearPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }))
  async function save(e: FormEvent) { e.preventDefault(); if (!supabase) return; if (form.job_url && !safeUrl(form.job_url)) { setError('请输入有效的 http 或 https 链接'); return } if (form.password && passphrase.length < 8) { setError('保存网站密码前，请输入至少 8 位保险箱口令'); return } setBusy(true); setError(''); try { const payload: Record<string, unknown> = { user_id: userId, company: form.company.trim(), role: form.role.trim(), status: form.status, applied_at: form.applied_at, job_url: form.job_url.trim() || null, platform: form.platform.trim() || null, notes: form.notes.trim() || null }; if (clearPassword) Object.assign(payload, { password_ciphertext: null, password_iv: null, password_salt: null }); else if (form.password) Object.assign(payload, await encryptPassword(form.password, passphrase)); const result = editing ? await supabase.from('applications').update(payload).eq('id', record.id) : await supabase.from('applications').insert(payload); if (result.error) throw result.error; onSaved() } catch (err) { setError(err instanceof Error ? err.message : '保存失败') } finally { setBusy(false) } }
  async function remove() { if (!editing || !supabase || !confirm(`确定删除 ${record.company} 的投递记录及关联日程吗？`)) return; setBusy(true); const { error } = await supabase.from('applications').delete().eq('id', record.id); setBusy(false); if (error) setError(error.message); else onDeleted() }
  return <Dialog title={editing ? '编辑投递记录' : '新增投递记录'} subtitle="把这次机会认真记下来" onClose={onClose}><form onSubmit={save} className="dialog-form"><div className="form-grid"><label>公司名称 <span>*</span><input required maxLength={100} value={form.company} onChange={e => set('company', e.target.value)} placeholder="例如：字节跳动" /></label><label>岗位名称 <span>*</span><input required maxLength={150} value={form.role} onChange={e => set('role', e.target.value)} placeholder="例如：前端开发工程师" /></label><label>当前状态<select value={form.status} onChange={e => set('status', e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label>投递日期<input type="date" required value={form.applied_at} onChange={e => set('applied_at', e.target.value)} /></label><label>投递平台<input maxLength={100} value={form.platform} onChange={e => set('platform', e.target.value)} placeholder="例如：官网 / 牛客 / Boss" /></label><label>岗位链接<input type="url" value={form.job_url} onChange={e => set('job_url', e.target.value)} placeholder="https://..." /></label></div><label>备注<textarea rows={3} maxLength={3000} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="记录投递渠道、进展或需要准备的内容…" /></label><div className="form-divider"><LockKeyhole size={17} /> 投递网站密码 <span>可选 · 端侧加密</span></div><div className="form-grid"><label>{editing && record.password_ciphertext ? '更新网站密码（留空则保持原密码）' : '网站密码'}<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" disabled={clearPassword} value={form.password} onChange={e => set('password', e.target.value)} placeholder="仅在需要时填写" /><button type="button" aria-label={showPassword ? '隐藏密码' : '显示密码'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><label>保险箱口令<input type="password" autoComplete="off" value={passphrase} onChange={e => onPassphrase(e.target.value)} placeholder="加密密码时输入，至少 8 位" /></label></div>{editing && record.password_ciphertext && <label className="checkbox-label"><input type="checkbox" checked={clearPassword} onChange={e => { setClearPassword(e.target.checked); if (e.target.checked) set('password', '') }} /> 清除已保存的网站密码</label>}<p className="field-help">口令不会上传或保存。请妥善保管；忘记后无法解密已存的网站密码。</p>{error && <p className="form-error">{error}</p>}<div className="dialog-actions">{editing && <button type="button" className="danger-button" onClick={remove} disabled={busy}><Trash2 size={16} /> 删除</button>}<span /><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={busy}>{busy ? '保存中…' : '保存记录'}</button></div></form></Dialog>
}
function EventDialog({ record, applications, initialAppId, userId, onClose, onSaved, onDeleted }: { record: Event | 'new'; applications: Application[]; initialAppId: string; userId: string; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const editing = record !== 'new'
  const [form, setForm] = useState(() => editing ? { application_id: record.application_id, type: record.type, starts_at: new Date(record.starts_at).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16), location: record.location || '', notes: record.notes || '', completed: record.completed } : { ...emptyEvent, application_id: initialAppId || applications[0]?.id || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(e: FormEvent) { e.preventDefault(); if (!supabase) return; setBusy(true); setError(''); const payload = { user_id: userId, application_id: form.application_id, type: form.type, starts_at: new Date(form.starts_at).toISOString(), location: form.location.trim() || null, notes: form.notes.trim() || null, completed: form.completed }; const result = editing ? await supabase.from('events').update(payload).eq('id', record.id) : await supabase.from('events').insert(payload); setBusy(false); if (result.error) setError(result.error.message); else onSaved() }
  async function remove() { if (!editing || !supabase || !confirm('确定删除这条日程吗？')) return; setBusy(true); const { error } = await supabase.from('events').delete().eq('id', record.id); setBusy(false); if (error) setError(error.message); else onDeleted() }
  return <Dialog title={editing ? '编辑笔面试日程' : '添加笔面试日程'} subtitle="为重要时刻留一个清晰的提醒" onClose={onClose}><form onSubmit={save} className="dialog-form"><label>关联投递 <span>*</span><select required value={form.application_id} onChange={e => setForm({ ...form, application_id: e.target.value })}><option value="">请选择投递记录</option>{applications.map(a => <option key={a.id} value={a.id}>{a.company} · {a.role}</option>)}</select></label><div className="form-grid"><label>日程类型<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as EventType })}>{eventTypes.map(t => <option key={t}>{t}</option>)}</select></label><label>开始时间 <span>*</span><input type="datetime-local" required value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} /></label></div><label>地点或会议链接<input maxLength={500} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="线下地址或腾讯会议链接" /></label><label>备注<textarea rows={4} maxLength={3000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="考试形式、需要准备的材料、联系人…" /></label><label className="checkbox-label"><input type="checkbox" checked={form.completed} onChange={e => setForm({ ...form, completed: e.target.checked })} /> 标记为已完成</label>{editing && <div className="event-summary"><Clock3 size={16} /> {formatDateTime(record.starts_at)}</div>}{error && <p className="form-error">{error}</p>}<div className="dialog-actions">{editing && <button type="button" className="danger-button" onClick={remove} disabled={busy}><Trash2 size={16} /> 删除</button>}<span /><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={busy || !applications.length}>{busy ? '保存中…' : '保存日程'}</button></div>{!applications.length && <p className="field-help">请先添加一条投递记录。</p>}</form></Dialog>
}
function VaultDialog({ record, passphrase, onPassphrase, onClose }: { record: Application; passphrase: string; onPassphrase: (v: string) => void; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(false)
  async function unlock(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { setPassword(await decryptPassword(record, passphrase)) } catch { setError('口令不正确，或密码数据已损坏。') } finally { setBusy(false) } }
  return <Dialog title="查看网站密码" subtitle={`${record.company} · ${record.platform || '投递网站'}`} onClose={onClose}><div className="dialog-form">{password ? <><div className="vault-result"><span>网站密码</span><strong className="vault-secret">{visible ? password : '•'.repeat(Math.min(password.length, 18))}</strong><button className="icon-button" aria-label={visible ? '隐藏密码' : '显示密码'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><button className="secondary-button" onClick={async () => { await navigator.clipboard.writeText(password); onClose() }}>复制密码</button></> : <form onSubmit={unlock}><label>保险箱口令<input autoFocus type="password" autoComplete="off" value={passphrase} onChange={e => onPassphrase(e.target.value)} placeholder="输入保存密码时使用的口令" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button auth-submit" disabled={busy || !passphrase}>{busy ? '解密中…' : '解锁密码'} <LockKeyhole size={17} /></button></form>}<p className="field-help">关闭窗口后，解密出的密码会从页面中移除。</p></div></Dialog>
}

function ImportDialog({ userId, existing, passphrase, onPassphrase, onClose, onImported }: { userId: string; existing: Application[]; passphrase: string; onPassphrase: (value: string) => void; onClose: () => void; onImported: (count: number) => void }) {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [date, setDate] = useState('')
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const chosen = rows.filter((_row, index) => selected.has(index))
  const secretCount = chosen.filter(row => row.password).length

  async function loadFile(file?: File) {
    if (!file) return
    setError('')
    if (file.size > 1024 * 1024) { setError('TXT 文件不能超过 1 MB'); return }
    const parsed = parseLegacyText(await file.text())
    if (!parsed.length) { setError('没有识别到投递记录。请确认选择的是原始 TXT 文件。'); return }
    setRows(parsed)
    setFileName(file.name)
    setSelected(new Set(parsed.flatMap((row, index) => existing.some(item => item.company === row.company) ? [] : [index])))
  }
  function toggle(index: number) {
    setSelected(previous => {
      const next = new Set(previous)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }
  function updateRole(index: number, role: string) {
    setRows(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, role } : row))
  }
  async function importRows() {
    if (!supabase || !chosen.length) return
    if (!date) { setError('原文件没有投递日期，请选择一个暂用日期，导入后可以逐条修改。'); return }
    if (secretCount && passphrase.length < 8) { setError('文件中有网站密码，请输入至少 8 位保险箱口令。'); return }
    if (chosen.some(row => !row.role.trim())) { setError('岗位名称不能为空；不知道具体岗位时可保留“岗位待补充”。'); return }
    setBusy(true)
    setError('')
    try {
      const payload = await Promise.all(chosen.map(async row => ({
        user_id: userId,
        company: row.company,
        role: row.role.trim(),
        status: '已投递' as Status,
        applied_at: date,
        job_url: row.job_url || null,
        platform: row.platform || null,
        notes: ['从原 TXT 导入；原文件未记录准确投递日期与具体岗位，请核对。', row.notes].filter(Boolean).join('\n'),
        ...(row.password ? await encryptPassword(row.password, passphrase) : {})
      })))
      const { error: insertError } = await supabase.from('applications').insert(payload)
      if (insertError) throw insertError
      onImported(chosen.length)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导入失败，请重试')
    } finally {
      setBusy(false)
    }
  }
  return <Dialog title="批量导入投递记录" subtitle="选择原始 TXT，确认后一次导入" onClose={onClose}>
    <div className="dialog-form import-form">
      <label className="import-file"><Upload size={20} /><span>{fileName || '点击选择电脑上的 TXT 文件'}</span><input type="file" accept=".txt,text/plain" onChange={event => void loadFile(event.target.files?.[0])} disabled={busy} /></label>
      {rows.length > 0 && <>
        <p className="import-summary">识别到 {rows.length} 家公司，已选 {chosen.length} 条；其中 {secretCount} 条含需要加密的密码或编码。同名公司默认不勾选，以免重复导入。</p>
        <div className="import-list">{rows.map((row, index) => <div className="import-item" key={`${row.company}-${index}`}>
          <label className="import-choice"><input type="checkbox" checked={selected.has(index)} onChange={() => toggle(index)} disabled={busy} /><span><strong>{row.company}</strong><small>{row.platform || '无网站链接'} · {row.password ? '含加密凭据' : '无密码'}{existing.some(item => item.company === row.company) ? ' · 已有同名记录' : ''}</small></span></label>
          <input aria-label={`${row.company}岗位名称`} value={row.role} maxLength={150} onChange={event => updateRole(index, event.target.value)} disabled={busy || !selected.has(index)} />
        </div>)}</div>
        <div className="form-grid"><label>暂用投递日期 <span>*</span><input type="date" value={date} onChange={event => setDate(event.target.value)} disabled={busy} /></label><label>保险箱口令 {secretCount ? '*' : ''}<input type="password" autoComplete="off" value={passphrase} onChange={event => onPassphrase(event.target.value)} disabled={busy} placeholder="用于加密文件中的密码，至少 8 位" /></label></div>
        <p className="field-help">原 TXT 没有准确的投递日期和具体岗位。这里的日期会用于选中的所有记录；导入后可逐条修改。口令不会上传。</p>
      </>}
      {error && <p className="form-error">{error}</p>}
      <div className="dialog-actions"><span /><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>取消</button><button type="button" className="primary-button" disabled={busy || !chosen.length} onClick={() => void importRows()}>{busy ? '正在加密并导入…' : `导入 ${chosen.length} 条`}</button></div>
    </div>
  </Dialog>
}
export default App
