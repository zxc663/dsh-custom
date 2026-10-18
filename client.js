// dsh-custom 浏览器半（管理后台重构版）：设置区「DSH自定义」
// ① 会话管理 ② 系统提示词管理 ③ 快照与恢复 ④ 统计数据
// 形态：__ModuleLoader__.load 内联 factory；仅依赖宿主 externals（react）；数据来自同源 /api/dsh-custom/*。
// 视觉：只使用宿主已暴露主题 token（--dsw-alias-*），不引用不存在的 layer-3/tertiary/business 等。
window.__ModuleLoader__.load({
  id: 'dsh-custom',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback } = React;

    const PLUGIN_ID = 'dsh-custom';

    const CSS = [
      '.dshc{width:100%;max-width:1280px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:20px}',
      '.dshc_top{display:flex;align-items:center;gap:16px;padding-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l2)}',
      '.dshc_brand{font-size:16px;font-weight:700}',
      '.dshc_brand span{font-size:12px;font-weight:400;color:var(--dsw-alias-label-secondary);margin-left:8px}',
      '.dshc_nav{display:flex;gap:4px;flex-wrap:wrap}',
      '.dshc_nav button{border:1px solid transparent;background:0 0;color:var(--dsw-alias-label-secondary);font:inherit;padding:6px 12px;border-radius:7px;cursor:pointer}',
      '.dshc_nav button:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dshc_nav button[data-active=true]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}',
      '.dshc_split{display:grid;grid-template-columns:320px minmax(0,1fr);gap:14px;align-items:start}',
      '.dshc_panel{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:9px;min-width:0}',
      '.dshc_ph{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}',
      '.dshc_ph h3{margin:0;font-size:14px}',
      '.dshc_spacer{flex:1}',
      '.dshc_btn{border:1px solid var(--dsw-alias-border-l2);background:0 0;color:var(--dsw-alias-label-primary);font:inherit;border-radius:6px;padding:4px 10px;cursor:pointer}',
      '.dshc_btn:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dshc_btn:disabled{opacity:.55;cursor:default}',
      '.dshc_btn[data-primary=true]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff;font-weight:600}',
      '.dshc_btn[data-danger=true]{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:#fff;font-weight:600}',
      '.dshc_search{margin:10px 12px;width:calc(100% - 24px);padding:6px 9px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}',
      '.dshc_list{list-style:none;margin:0;padding:0 10px 10px;display:flex;flex-direction:column;gap:8px}',
      '.dshc_srow{padding:9px 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;cursor:pointer}',
      '.dshc_srow:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dshc_srow[data-sel=true]{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}',
      '.dshc_srow .l1{display:flex;justify-content:space-between;color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.dshc_srow .l2{color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:2px}',
      '.dshc_srow .l3{font-weight:600;margin-top:4px}',
      '.dshc_pill{font-size:11px;border-radius:5px;padding:1px 6px}',
      '.dshc_pill[data-t=ok]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)}',
      '.dshc_pill[data-t=warn]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent)}',
      '.dshc_pill[data-t=err]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}',
      '.dshc_dh{padding:12px 14px}',
      '.dshc_dh .t{font-size:15px;font-weight:700}',
      '.dshc_dh .m{color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:4px}',
      '.dshc_segs{display:flex;gap:4px;padding:0 14px 10px;flex-wrap:wrap;align-items:center}',
      '.dshc_segs button{border:1px solid transparent;background:0 0;color:var(--dsw-alias-label-secondary);font:inherit;padding:5px 11px;border-radius:6px;cursor:pointer}',
      '.dshc_segs button[data-active=true]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}',
      '.dshc_body{padding:0 14px 14px}',
      '.dshc_ta{width:100%;box-sizing:border-box;min-height:220px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;color:var(--dsw-alias-label-primary);padding:10px;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px;resize:vertical}',
      '.dshc_row{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}',
      '.dshc_hint{color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.dshc_err{border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;padding:10px 12px;color:var(--dsw-alias-state-error-primary);margin:0 14px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
      '.dshc_cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}',
      '.dshc_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:12px}',
      '.dshc_card .k{color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.dshc_card .v{font-size:22px;font-weight:700;margin-top:6px}',
      '.dshc_card .s{color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:4px}',
      '.dshc_grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
      '.dshc_barrow{display:grid;grid-template-columns:150px 1fr 64px;gap:10px;align-items:center;margin:9px 0}',
      '.dshc_bar{height:16px;border-radius:4px;background:var(--dsw-alias-brand-primary)}',
      '.dshc_audit{list-style:none;margin:0;padding:0 14px 14px}',
      '.dshc_audit li{display:grid;grid-template-columns:110px 1fr 110px;gap:10px;padding:7px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px}',
      '.dshc_ok{color:var(--dsw-alias-state-success-primary)}.dshc_er{color:var(--dsw-alias-state-error-primary)}.dshc_wa{color:var(--dsw-alias-state-warn-primary)}',
      '.dshc_modalw{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60}',
      '.dshc_modal{background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:18px;width:520px;max-width:92vw;max-height:80vh;overflow:auto}',
      '.dshc_modal h4{margin:0 0 10px;font-size:15px}',
      '.dshc_modal p{color:var(--dsw-alias-label-secondary);margin:7px 0;font-size:13px}',
      '.dshc_modal .acts{display:flex;gap:10px;margin-top:16px}',
      '.dshc_toast{position:fixed;right:22px;bottom:22px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:11px 15px;max-width:340px;z-index:70;box-shadow:0 8px 24px rgba(0,0,0,.35)}',
      '.dshc_toast .t{font-weight:600;font-size:13px;margin-bottom:2px}',
      '.dshc_toast .m{color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.dshc_empty{color:var(--dsw-alias-label-secondary);padding:20px;text-align:center}',
      // 治理开关页（P46）
      '.dshc_trow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l2)}',
      '.dshc_tlabel{font-size:13px;font-weight:600}',
      '.dshc_tag{margin-left:8px;font-size:10px;color:var(--dsw-alias-state-warn-primary);border:1px solid currentColor;border-radius:4px;padding:0 5px;white-space:nowrap}',
      '.dshc_banner{margin:0 14px 10px;padding:10px 12px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;color:var(--dsw-alias-state-error-primary);font-size:12px}',
      '.dshc_allow{padding:4px 14px 10px}',
      '.dshc_barrow2{display:grid;grid-template-columns:1fr 1fr 64px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px}',
      '.dshc_barrow2 code{font-size:12px}',
      '.dshc_input{flex:1;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:7px 10px;color:inherit;font-size:12px}',
      '.dshc_switch{position:relative;width:44px;height:24px;border-radius:12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-label-secondary);cursor:pointer;padding:0;transition:background .15s;flex:none}',
      '.dshc_switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary)}',
      '.dshc_switch:disabled{opacity:.45;cursor:not-allowed}',
      '.dshc_knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.25)}',
      '.dshc_switch[aria-checked="true"] .dshc_knob{left:22px}',
      '.dshc_grid2c{display:grid;grid-template-columns:1fr 1fr;gap:0 22px}',
    ].join('\n');
    const CSS_TAG_ID = PLUGIN_ID + '/tab.css';
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG_ID) + ']') === null) {
      const tag = document.createElement('style');
      tag.dataset.plugin = PLUGIN_ID;
      tag.dataset.pluginCss = CSS_TAG_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    const base = (() => {
      try { return new URL('api/dsh-custom/', document.baseURI).pathname; } catch { return '/api/dsh-custom/'; }
    })();

    async function api(path, options) {
      const opts = options || {};
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 10000);
      try {
        const init = { headers: { accept: 'application/json' }, redirect: 'error', signal: ctrl.signal, method: opts.method || 'GET' };
        if (opts.body !== undefined) {
          init.headers['content-type'] = 'application/json';
          init.body = JSON.stringify(opts.body);
        }
        const r = await fetch(base + path, init);
        const text = await r.text();
        let j = null;
        try { j = JSON.parse(text); } catch { throw new Error('响应不是 JSON（HTTP ' + r.status + '）'); }
        if (!j || j.ok !== true) throw new Error((j && j.error) || ('HTTP ' + r.status));
        return j.value;
      } finally {
        clearTimeout(timer);
      }
    }

    function fmtTime(iso) {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleString(); } catch { return iso; }
    }

    // ── 弹窗 / toast / 未实现 ──
    function Modal(props) {
      if (!props.open) return null;
      return h('div', { className: 'dshc_modalw', onClick: (e) => { if (e.target === e.currentTarget) props.onClose(); } },
        h('div', { className: 'dshc_modal' },
          h('h4', null, props.title),
          props.children,
          h('div', { className: 'acts' },
            props.actions || h('button', { className: 'dshc_btn', onClick: props.onClose }, '关闭'))));
    }
    function Toast(props) {
      if (!props.msg) return null;
      return h('div', { className: 'dshc_toast' },
        h('div', { className: 't' }, props.msg.title),
        props.msg.detail ? h('div', { className: 'm' }, props.msg.detail) : null);
    }

    // ── ① 会话管理 ──
    function SessionsPage(props) {
      const [sessions, setSessions] = useState([]);
      const [activeId, setActiveId] = useState('');
      const [search, setSearch] = useState('');
      const [detail, setDetail] = useState(null);
      const [segs, setSegs] = useState(null);
      const [seg, setSeg] = useState('current');
      const [editing, setEditing] = useState(false);
      const [draft, setDraft] = useState('');
      const [msg, setMsg] = useState(null);
      const [err, setErr] = useState(null);
      const [modal, setModal] = useState(null);

      const loadSessions = useCallback(async () => {
        try {
          const v = await api('sessions');
          setSessions(v.sessions || []);
          if (!activeId && (v.sessions || []).length > 0) setActiveId(v.sessions[0].id);
        } catch (e) { setErr('会话列表读取失败：' + String((e && e.message) || e)); }
      }, [activeId]);
      useEffect(() => { void loadSessions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

      // 10s 轮询：只更新列表，不动编辑器
      useEffect(() => {
        const t = setInterval(() => { void loadSessions(); }, 10000);
        return () => clearInterval(t);
      }, [loadSessions]);

      const loadDetail = useCallback(async (id) => {
        if (!id) return;
        setErr(null);
        try {
          const asmPath = 'assembly?session=' + encodeURIComponent(id);
          const r = await Promise.all([api(asmPath), api('sessions/' + encodeURIComponent(id) + '/override')]);
          setDetail(r[0]);
          setSegs(r[1].segments || {});
          setEditing(false);
        } catch (e) { setErr('会话详情读取失败：' + String((e && e.message) || e)); }
      }, []);
      useEffect(() => { void loadDetail(activeId); }, [activeId, loadDetail]);

      const selectSession = (id) => { setActiveId(id); setSeg('current'); setEditing(false); };

      const segDefs = [
        ['current', '当前全文'],
        ['discipline', '注入核心'],
        ['user', '自定义用户规则'],
        ['system', '系统原版'],
        ['scope', '本会话覆盖'],
      ];
      const segValue = () => {
        if (seg === 'current') return (detail && detail.rendered) || '（暂无渲染内容）';
        if (seg === 'discipline') return (segs && segs.discipline) || (props.disciplineText || '');
        if (seg === 'user') return (segs && segs.user) || (props.userText || '');
        if (seg === 'system') return (detail && detail.rendered) ? '（系统原版由宿主官方分区组成；在此修改=接管该会话系统提示词）\n\n' + detail.sections.filter((s) => s.origin === 'official').map((s) => s.text).join('\n\n') : '（暂无）';
        if (seg === 'scope') {
          const parts = segs ? Object.keys(segs).filter((k) => segs[k] !== null && segs[k] !== undefined) : [];
          return parts.length ? '本会话覆盖段：' + parts.join('、') + '\n\n优先级：会话级 > 全局（全局改动不覆盖本会话）' : '本会话未设置覆盖（跟随全局）';
        }
        return '';
      };

      const save = async () => {
        if (!activeId) return;
        try {
          const segments = {};
          if (seg !== 'current' && seg !== 'scope' && seg !== 'system') segments[seg] = draft;
          if (seg === 'system') segments.system = draft;
          await api('sessions/' + encodeURIComponent(activeId) + '/override', { method: 'PUT', body: { segments } });
          await loadDetail(activeId);
          setMsg({ title: '已保存', detail: '会话级覆盖已落盘＋快照；下一条消息生效。全局改动不会覆盖本会话。' });
        } catch (e) { setErr('保存失败：' + String((e && e.message) || e)); }
      };

      const doRollback = async (target) => {
        setModal(null);
        try {
          const r = await api('sessions/' + encodeURIComponent(activeId) + '/rollback', { method: 'POST', body: { target } });
          await loadDetail(activeId);
          setMsg({ title: '已回滚', detail: target === 'previous' ? '已恢复上一版（' + (r.restored || []).join('、') + '）' : '已清除本会话覆盖（回到官方/全局）' });
        } catch (e) { setErr('回滚失败：' + String((e && e.message) || e)); }
      };

      const q = search.toLowerCase();
      const filtered = sessions.filter((s) => !q || ((s.cwd || '') + ' ' + (s.model || '') + ' ' + (s.title || '') + ' ' + s.id).toLowerCase().includes(q));

      return h('div', null,
        props.toast && props.toast.msg ? h(Toast, { msg: props.toast.msg }) : null,
        h(Modal, { open: modal !== null, title: modal ? modal.title : '', onClose: () => setModal(null), actions: modal ? modal.actions : null },
          modal ? modal.body : null),
        h('div', { className: 'dshc_split' },
          h('aside', { className: 'dshc_panel' },
            h('div', { className: 'dshc_ph' }, h('h3', null, '会话列表'), h('span', { className: 'dshc_spacer' }),
              h('button', { className: 'dshc_btn', onClick: () => void loadSessions() }, '刷新')),
            h('input', { className: 'dshc_search', placeholder: '搜索工作区 / 模型 / 会话名', value: search, onChange: (e) => setSearch(e.target.value) }),
            h('ul', { className: 'dshc_list' },
              filtered.length === 0
                ? h('li', { className: 'dshc_empty' }, '无匹配会话')
                : filtered.map((s) => h('li', {
                    key: s.id,
                    className: 'dshc_srow',
                    'data-sel': s.id === activeId,
                    onClick: () => selectSession(s.id),
                  },
                    h('div', { className: 'l1' }, h('span', null, s.cwd || '—'), s.id === activeId ? h('span', { className: 'dshc_pill', 'data-t': 'ok' }, '当前') : null),
                    h('div', { className: 'l2' }, s.id.replace(/^session-/, '').slice(0, 8) + ' ｜ ' + (s.model || '未知模型')),
                    h('div', { className: 'l3' }, s.title || ('会话 ' + s.id.slice(0, 12)))
                  )))
          ),
          h('div', { className: 'dshc_panel' },
            detail ? h('div', null,
              h('div', { className: 'dshc_dh' },
                h('div', { className: 't' }, (detail.scopeLabel || '会话') ),
                h('div', { className: 'm' }, '生成于 ' + fmtTime(detail.generatedAt) + ' ｜ 渲染器' + (detail.rendererAvailable ? '在线' : '不可用（已降级原文）'))),
              h('div', { className: 'dshc_segs' },
                segDefs.map(([k, label]) => h('button', { key: k, 'data-active': seg === k, onClick: () => { setSeg(k); setEditing(false); } }, label)),
                h('span', { className: 'dshc_spacer' }),
                (seg === 'discipline' || seg === 'user' || seg === 'system') ? h('button', { className: 'dshc_btn', onClick: () => { setEditing(!editing); if (!editing) setDraft((segs && segs[seg]) || segValue()); } }, editing ? '取消修改' : '修改') : null),
              h('div', { className: 'dshc_body' },
                editing
                  ? h('textarea', { className: 'dshc_ta', value: draft, onChange: (e) => setDraft(e.target.value) })
                  : h('textarea', { className: 'dshc_ta', readOnly: true, value: segValue() }),
                h('div', { className: 'dshc_row' },
                  editing ? h('button', { className: 'dshc_btn', 'data-primary': true, onClick: () => void save() }, '保存') : null,
                  !editing ? h('button', { className: 'dshc_btn', onClick: () => setModal({
                    title: '回滚本会话提示词？',
                    body: h('div', null,
                      h('p', null, '回滚前会自动再快照，可反悔。'),
                      h('div', { className: 'dshc_row' },
                        h('button', { className: 'dshc_btn', onClick: () => void doRollback('previous') }, '回到上一版'),
                        h('button', { className: 'dshc_btn', 'data-danger': true, onClick: () => void doRollback('official') }, '回到官方（清除本会话覆盖）'))),
                    actions: h('button', { className: 'dshc_btn', onClick: () => setModal(null) }, '取消'),
                  }) }, '回滚') : null,
                  h('button', { className: 'dshc_btn', onClick: () => setMsg({ title: '未实现', detail: '导入/导出：落地时必须实现' }) }, '导入/导出')),
                err ? h('div', { className: 'dshc_err' }, h('span', null, err)) : null,
                msg ? h('div', { className: 'dshc_hint', style: { marginTop: 8 } }, msg.title + '：' + (msg.detail || '')) : null))
              : h('div', { className: 'dshc_empty' }, '选择左侧会话查看详情')
          )));
    }

    // ── ② 系统提示词管理 ──
    function PromptsPage(props) {
      const [seg, setSeg] = useState('discipline');
      const [data, setData] = useState({ discipline: null, user: null, layered: null, override: null });
      const [draft, setDraft] = useState('');
      const [msg, setMsg] = useState(null);
      const [err, setErr] = useState(null);
      const [modal, setModal] = useState(null);

      const load = useCallback(async () => {
        try {
          const [d, u, l, o] = await Promise.all([api('discipline'), api('user-prompt'), api('layered'), api('override')]);
          setData({ discipline: d, user: u, layered: l, override: o });
          setDraft((seg === 'discipline' ? d.sourceText : seg === 'user' ? u.text : seg === 'layered' ? '' : o.text) || '');
        } catch (e) { setErr('读取失败：' + String((e && e.message) || e)); }
      }, [seg]);
      useEffect(() => { void load(); }, [load]);

      const segDefs = [['discipline', '常驻核心'], ['user', '我的提示词'], ['layered', '渐进加载层'], ['system', '系统原版'], ['override', '⚠ 接管官方']];
      const save = async () => {
        try {
          if (seg === 'discipline') await api('discipline', { method: 'PUT', body: { text: draft } });
          else if (seg === 'user') await api('user-prompt', { method: 'PUT', body: { text: draft, enabled: data.user ? data.user.enabled : true } });
          else if (seg === 'system') {
            await api('override', { method: 'PUT', body: { text: draft } });
            await api('override/enable', { method: 'PUT', body: { enabled: true } });
          } else if (seg === 'layered') { setMsg({ title: '未实现', detail: '渐进加载层编辑：落地时必须实现' }); return; }
          await load();
          setMsg({ title: '已保存', detail: '全局提示词已保存（快照＋落盘）；N 个会话使用自己的覆盖，不受影响。' });
        } catch (e) { setErr('保存失败：' + String((e && e.message) || e)); }
      };

      const value = () => {
        if (seg === 'discipline') return (data.discipline && data.discipline.sourceText) || '';
        if (seg === 'user') return (data.user && data.user.text) || '';
        if (seg === 'override' || seg === 'system') return (data.override && data.override.text) || '';
        return '';
      };
      const editable = seg === 'discipline' || seg === 'user' || seg === 'system';

      return h('div', null,
        h(Modal, { open: modal !== null, title: modal ? modal.title : '', onClose: () => setModal(null), actions: modal ? modal.actions : null }, modal ? modal.body : null),
        h('div', { className: 'dshc_panel' },
          h('div', { className: 'dshc_ph' }, h('h3', null, '系统提示词管理（全局）'), h('span', { className: 'dshc_spacer' }),
            editable ? h('button', { className: 'dshc_btn', 'data-primary': true, onClick: () => void save() }, '保存') : null),
          h('div', { className: 'dshc_segs' },
            segDefs.map(([k, label]) => h('button', { key: k, 'data-active': seg === k, onClick: () => setSeg(k) }, label))),
          h('div', { className: 'dshc_body' },
            seg === 'override'
              ? h('div', null,
                h('div', { className: 'dshc_err' }, h('span', null, '⚠ 接管后官方提示词被整段替换；与其它 complete 插件互斥；启用前自动快照。')),
                h('div', { className: 'dshc_row' },
                  h('button', { className: 'dshc_btn', 'data-danger': true, onClick: () => setModal({
                    title: '启用「接管官方」？',
                    body: h('div', null, h('p', null, '⚠ 将整段替换官方系统提示词（complete 段）。'), h('p', null, '影响：模型只看到你写的接管文本；与其它 complete 插件互斥。'), h('p', null, '启用前已自动快照，可随时回滚恢复。')),
                    actions: h('div', { className: 'dshc_row' },
                      h('button', { className: 'dshc_btn', 'data-danger': true, onClick: async () => { setModal(null); try { await api('override/enable', { method: 'PUT', body: { enabled: true } }); await load(); setMsg({ title: '已启用', detail: '接管官方已启用；快照已生成。' }); } catch (e) { setErr('启用失败：' + String((e && e.message) || e)); } } }, '确认启用'),
                      h('button', { className: 'dshc_btn', onClick: () => setModal(null) }, '取消')),
                  }) }, data.override && data.override.enabled ? '已启用（点击停用）' : '启用接管')))
              : seg === 'system'
                ? h('div', null,
                  h('div', { className: 'dshc_hint', style: { marginBottom: 8 } }, '系统原版（宿主官方提示词，可修改；保存=接管官方 complete，需确认并自动快照）'),
                  h('textarea', { className: 'dshc_ta', value: draft, onChange: (e) => setDraft(e.target.value) }),
                  h('div', { className: 'dshc_row' }, h('button', { className: 'dshc_btn', 'data-primary': true, onClick: () => setModal({
                    title: '保存系统原版修改？',
                    body: h('div', null, h('p', null, '⚠ 修改系统原版=接管官方（complete 整段替换）。'), h('p', null, '保存前自动快照。')),
                    actions: h('div', { className: 'dshc_row' },
                      h('button', { className: 'dshc_btn', 'data-danger': true, onClick: async () => { setModal(null); try { await api('override', { method: 'PUT', body: { text: draft } }); await api('override/enable', { method: 'PUT', body: { enabled: true } }); await load(); setMsg({ title: '已保存', detail: '系统原版已被接管；快照已生成。' }); } catch (e) { setErr('保存失败：' + String((e && e.message) || e)); } } }, '确认接管并保存'),
                      h('button', { className: 'dshc_btn', onClick: () => setModal(null) }, '取消')),
                  }) }, '保存修改')))
                : seg === 'layered'
                  ? h('textarea', { className: 'dshc_ta', readOnly: true, value: '渐进加载层（只读）：' + JSON.stringify(data.layered && data.layered.sections ? data.layered.sections.map((s) => s.name) : []) })
                  : h('div', null,
                    h('div', { className: 'dshc_hint', style: { marginBottom: 8 } }, seg === 'discipline' ? '常驻核心（工程纪律）' : '我的提示词（用户自定义段）'),
                    h('textarea', { className: 'dshc_ta', value: draft, onChange: (e) => setDraft(e.target.value) })),
            err ? h('div', { className: 'dshc_err' }, h('span', null, err)) : null,
            msg ? h('div', { className: 'dshc_hint', style: { marginTop: 8 } }, msg.title + '：' + (msg.detail || '')) : null)));
    }

    // ── ③ 快照与恢复 ──
    function SnapshotsPage() {
      const [entries, setEntries] = useState(null);
      const [msg, setMsg] = useState(null);
      const [modal, setModal] = useState(null);
      const load = useCallback(async () => {
        try { const v = await api('backups'); setEntries(v.entries || []); } catch (e) { setMsg({ title: '读取失败', detail: String((e && e.message) || e) }); }
      }, []);
      useEffect(() => { void load(); }, [load]);
      const restore = async (name) => {
        setModal(null);
        try { await api('backups/restore', { method: 'PUT', body: { name } }); await load(); setMsg({ title: '已回滚', detail: '已回滚到 ' + name + '（回滚前已再快照）' }); }
        catch (e) { setMsg({ title: '回滚失败', detail: String((e && e.message) || e) }); }
      };
      return h('div', null,
        h(Modal, { open: modal !== null, title: modal ? modal.title : '', onClose: () => setModal(null), actions: modal ? modal.actions : null }, modal ? modal.body : null),
        h('div', { className: 'dshc_panel' },
          h('div', { className: 'dshc_ph' }, h('h3', null, '快照与恢复'), h('span', { className: 'dshc_spacer' }),
            h('button', { className: 'dshc_btn', onClick: () => void load() }, '刷新')),
          h('ul', { className: 'dshc_audit' },
            entries === null ? h('li', { className: 'dshc_empty' }, '读取中…')
              : entries.length === 0 ? h('li', { className: 'dshc_empty' }, '暂无快照')
              : entries.map((b) => h('li', { key: b.name },
                h('span', null, b.name),
                h('span', { className: 'dshc_hint' }, (b.files || []).join('、')),
                h('span', null, h('button', { className: 'dshc_btn', onClick: () => setModal({
                  title: '回滚到 ' + b.name + '？',
                  body: h('p', null, '回滚前会自动再快照当前状态，可反悔。'),
                  actions: h('div', { className: 'dshc_row' },
                    h('button', { className: 'dshc_btn', 'data-danger': true, onClick: () => void restore(b.name) }, '确认回滚'),
                    h('button', { className: 'dshc_btn', onClick: () => setModal(null) }, '取消')),
                }) }, '回滚到此版本')))),
            msg ? h('li', { className: 'dshc_hint' }, msg.title + '：' + (msg.detail || '')) : null)));
    }

    // ── ④ 统计数据 ──
    function StatsPage() {
      const [stats, setStats] = useState(null);
      const [err, setErr] = useState(null);
      const [range, setRange] = useState('all');
      const load = useCallback(async () => {
        try { setStats(await api('stats')); } catch (e) { setErr('统计读取失败：' + String((e && e.message) || e)); }
      }, []);
      useEffect(() => { void load(); }, [load]);
      const s = stats || { guardDeny: 0, snapshots: 0, sessions: 0, audit: [] };
      return h('div', null,
        h('div', { className: 'dshc_panel', style: { marginBottom: 14 } },
          h('div', { className: 'dshc_ph' }, h('h3', null, '统计数据'), h('span', { className: 'dshc_spacer' }),
            h('select', { className: 'dshc_btn', value: range, onChange: (e) => setRange(e.target.value) },
              h('option', { value: 'all' }, '全部'), h('option', { value: 'week' }, '本周'), h('option', { value: 'today' }, '今天')))),
        h('div', { className: 'dshc_cards' },
          h('div', { className: 'dshc_card' }, h('div', { className: 'k' }, '护栏拦截'), h('div', { className: 'v' }, String(s.guardDeny)), h('div', { className: 's' }, '次静默改写被拦')),
          h('div', { className: 'dshc_card' }, h('div', { className: 'k' }, '快照'), h('div', { className: 'v' }, String(s.snapshots)), h('div', { className: 's' }, '个可回滚版本')),
          h('div', { className: 'dshc_card' }, h('div', { className: 'k' }, '活跃会话'), h('div', { className: 'v' }, String(s.sessions)), h('div', { className: 's' }, '个在装配作用域内')),
          h('div', { className: 'dshc_card' }, h('div', { className: 'k' }, '会话外改动'), h('div', { className: 'v' }, String(s.externalChange || 0)), h('div', { className: 's' }, '次检测到'))),
        h('div', { className: 'dshc_panel' },
          h('div', { className: 'dshc_ph' }, h('h3', null, '审计时间线')),
          h('ul', { className: 'dshc_audit' },
            (s.audit || []).slice().reverse().map((a, i) => h('li', { key: i },
              h('span', null, fmtTime(a.ts)),
              h('span', null, String(a.kind || '?')),
              h('span', { className: String(a.kind) === 'guard-deny' ? 'dshc_er' : String(a.kind) === 'external-change' ? 'dshc_wa' : 'dshc_ok' }, String(a.kind || '?')))),
            (s.audit || []).length === 0 ? h('li', { className: 'dshc_empty' }, '暂无审计记录') : null)),
        err ? h('div', { className: 'dshc_err' }, h('span', null, err)) : null);
    }

    // ── ⑤ 治理开关（P46；UI 迭代：switch 心智＋busy 防连点＋错误态不再被早退吞掉）──
    function Switch(props) {
      return h('button', {
        className: 'dshc_switch', role: 'switch', 'aria-checked': props.checked ? 'true' : 'false',
        disabled: props.disabled || props.busy,
        title: props.disabled ? '不可豁免' : (props.checked ? '点击关闭' : '点击开启'),
        onClick: () => props.onToggle(!props.checked),
      }, h('span', { className: 'dshc_knob' }));
    }
    function GovernancePage() {
      const [gov, setGov] = useState(null);
      const [loadErr, setLoadErr] = useState(null);
      const [busy, setBusy] = useState(false);
      const [msg, setMsg] = useState(null);
      const [newRule, setNewRule] = useState({ pattern: '', note: '' });
      const load = useCallback(async () => {
        try { setGov(await api('governance')); setLoadErr(null); } catch (e) { setLoadErr(String((e && e.message) || e)); }
      }, []);
      useEffect(() => { void load(); }, [load]);
      useEffect(() => { // toast 自动消失（避免常驻遮挡）
        if (!msg) return;
        const t = setTimeout(() => setMsg(null), 3500);
        return () => clearTimeout(t);
      }, [msg]);
      const put = async (patch, okTitle) => {
        if (busy) return; // 防连点竞态：后写覆盖前写
        setBusy(true);
        try { await api('governance', { method: 'PUT', body: patch }); await load(); setMsg({ title: okTitle, detail: '已热生效（运行时插件按文件 mtime 自动重读）' }); }
        catch (e) { setMsg({ title: '保存失败', detail: String((e && e.message) || e) }); }
        finally { setBusy(false); }
      };
      const addAllow = async () => {
        if (busy) return;
        setBusy(true);
        try { await api('governance/allowlist', { method: 'POST', body: newRule }); setNewRule({ pattern: '', note: '' }); await load(); setMsg({ title: '白名单已添加', detail: '命中该形态的命令将直接放行，不再弹审批卡' }); }
        catch (e) { setMsg({ title: '添加失败', detail: String((e && e.message) || e) }); }
        finally { setBusy(false); }
      };
      const delAllow = async (pattern) => {
        if (busy) return;
        setBusy(true);
        try { await api('governance/allowlist?pattern=' + encodeURIComponent(pattern), { method: 'DELETE' }); await load(); setMsg({ title: '白名单已移除', detail: pattern }); }
        catch (e) { setMsg({ title: '移除失败', detail: String((e && e.message) || e) }); }
        finally { setBusy(false); }
      };
      const header = h('div', { className: 'dshc_ph' }, h('h3', null, '治理开关'), h('span', { className: 'dshc_spacer' }),
        h('span', { className: 'dshc_hint' }, busy ? '保存中…' : '保存即热生效'),
        h('button', { className: 'dshc_btn', disabled: busy, onClick: () => void load() }, '刷新'));
      if (gov === null) {
        return h('div', { className: 'dshc_panel' }, header,
          loadErr ? h('div', { className: 'dshc_banner' }, '读取失败：' + loadErr + '（可点「刷新」重试）') : h('div', { className: 'dshc_empty' }, '读取中…'));
      }
      const toggleDomain = (d) => {
        const next = new Set(gov.domainsOff);
        if (d.off) next.delete(d.domain); else next.add(d.domain);
        void put({ l3: { domainsOff: [...next] } }, d.off ? '域已启用：' + d.domain : '域已关闭：' + d.domain);
      };
      return h('div', null,
        h('div', { className: 'dshc_panel' },
          header,
          gov.l3Enabled === false ? h('div', { className: 'dshc_banner' }, '⚠ L3 拦截已关闭：命中仅记录不弹卡，防线只剩宿主沙箱与提示词文本。') : null,
          h('div', { className: 'dshc_trow' },
            h('div', null,
              h('div', { className: 'dshc_tlabel' }, '总开关'),
              h('div', { className: 'dshc_hint' }, '10 个危险域词面判定（宿主沙箱之上的加严层），命中弹审批卡'),
              !gov.l3Enabled ? h('div', { className: 'dshc_er' }, '拦截退位仅记录——危险操作将不再询问') : null),
            h(Switch, { checked: gov.l3Enabled, busy, onToggle: (v) => void put({ l3: { enabled: v } }, v ? '拦截已开启' : '拦截已关闭') })),
          h('div', { className: 'dshc_grid2c' },
            gov.domains.map((d) => h('div', { key: d.domain, className: 'dshc_trow' },
              h('div', { className: 'dshc_tlabel' }, d.domain, d.noExempt ? h('span', { className: 'dshc_tag' }, '不可豁免') : null),
              h(Switch, { checked: !d.off, disabled: d.noExempt, busy, onToggle: () => toggleDomain(d) }))))),
        h('div', { className: 'dshc_panel' },
          h('div', { className: 'dshc_ph' }, h('h3', null, '误拦白名单'), h('span', { className: 'dshc_hint' }, '命中白名单形态的命令直接放行，不再弹审批卡')),
          h('div', { className: 'dshc_allow' },
            gov.allowlist.length === 0 ? h('div', { className: 'dshc_empty' }, '暂无条目——审批卡误拦时，把该命令形态加到这里')
              : gov.allowlist.map((e) => h('div', { key: e.pattern, className: 'dshc_barrow2' },
                h('code', null, e.pattern),
                h('span', { className: 'dshc_hint' }, e.note || ''),
                h('button', { className: 'dshc_btn', disabled: busy, onClick: () => void delAllow(e.pattern) }, '移除'))),
            h('div', { className: 'dshc_row' },
              h('input', { className: 'dshc_input', placeholder: '命令形态（如 docker ps；子串＋词边界，最短 4 字符）', value: newRule.pattern, onChange: (e) => setNewRule({ ...newRule, pattern: e.target.value }) }),
              h('input', { className: 'dshc_input', placeholder: '备注（为什么放行）', value: newRule.note, onChange: (e) => setNewRule({ ...newRule, note: e.target.value }) }),
              h('button', { className: 'dshc_btn', disabled: busy, onClick: () => void addAllow() }, '添加')),
            h('div', { className: 'dshc_hint' }, '提示：可先在「统计数据 → 审计时间线」核对误拦记录，再按命令形态加白名单。'))),
        h('div', { className: 'dshc_panel' },
          h('div', { className: 'dshc_ph' }, h('h3', null, '工作流能力开关')),
          h('div', { className: 'dshc_trow' },
            h('div', null,
              h('div', { className: 'dshc_tlabel' }, '判级与任务清单强制'),
              h('div', { className: 'dshc_hint' }, '实质工作回合缺状态行判级/验收登记时自动打回')),
            h(Switch, { checked: gov.levelChecklist, busy, onToggle: (v) => void put({ levelChecklist: v }, v ? '判级强制已开启' : '判级强制已关闭') })),
          h('div', { className: 'dshc_trow' },
            h('div', null,
              h('div', { className: 'dshc_tlabel' }, '压缩重载信号'),
              h('div', { className: 'dshc_hint' }, '上下文压缩后注入重载序提示（保持长会话精度）')),
            h(Switch, { checked: gov.compactionSignal, busy, onToggle: (v) => void put({ compactionSignal: v }, v ? '压缩信号已开启' : '压缩信号已关闭') })),
          h('div', { className: 'dshc_trow' },
            h('div', null,
              h('div', { className: 'dshc_tlabel' }, '收口即终结（不推荐）'),
              h('div', { className: 'dshc_hint' }, 'gate 通过后立即结束回合——仅排障用；改动需重启 DSH 生效'),
              gov.concludeOnPass ? h('div', { className: 'dshc_er' }, '开启后交付文本可能被吞、到不了用户') : null),
            h(Switch, { checked: gov.concludeOnPass, busy, onToggle: (v) => void put({ concludeOnPass: v }, '已保存（重启 DSH 后生效）') }))),
        h(Toast, { msg }));
    }

    // ── 外壳 ──
    const PAGES = [
      ['sessions', '会话管理'],
      ['prompts', '系统提示词管理'],
      ['snapshots', '快照与恢复'],
      ['stats', '统计数据'],
      ['governance', '治理开关'],
    ];
    function Tab() {
      const [page, setPage] = useState('sessions');
      const [toastMsg, setToastMsg] = useState(null);
      return h('div', { className: 'dshc' },
        h('div', { className: 'dshc_top' },
          h('div', { className: 'dshc_brand' }, 'DSH自定义', h('span', null, '系统提示词管理后台')),
          h('span', { className: 'dshc_spacer' }),
          h('div', { className: 'dshc_hint' }, '注入：开 ｜ 渲染器：在线')),
        h('nav', { className: 'dshc_nav' },
          PAGES.map(([k, label]) => h('button', { key: k, 'data-active': page === k, onClick: () => setPage(k) }, label))),
        page === 'sessions' ? h(SessionsPage, { toast: { msg: toastMsg } })
          : page === 'prompts' ? h(PromptsPage)
          : page === 'snapshots' ? h(SnapshotsPage)
          : page === 'stats' ? h(StatsPage)
          : h(GovernancePage),
        h(Toast, { msg: toastMsg }));
    }

    const inject = ['slots'];

    function apply(ctx) {
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'dsh-custom',
        order: 30,
        label: () => 'DSH自定义',
      }, Tab));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
