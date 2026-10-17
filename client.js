// dsh-custom 浏览器半（P4 推倒重做）：设置区「DSH自定义」页签 —— 9 区导航完全体
// ①概览 ②提示词中心（常驻核心/我的提示词/渐进加载层）③接管官方 ④作用域 ⑤快照 ⑥备份 ⑦审计 ⑧治理 ⑨设置
// 形态：__ModuleLoader__.load 内联 factory；仅依赖宿主 externals（react）；数据来自同源 /api/dsh-custom/*。
// 设计档：dsh-custom/docs/design-specs/dsh-custom-page-wireframe-20261017.md（完全草图）
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
			'.dshc_page{width:100%;max-width:960px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:20px}',
			'.dshc_header{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
			'.dshc_title{margin:0;font-size:15px;font-weight:600;line-height:22px}',
			'.dshc_meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
			'.dshc_toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
			'.dshc_seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden}',
			'.dshc_seg button{border:0;background:0 0;color:var(--dsw-alias-label-secondary);font:inherit;padding:5px 12px;cursor:pointer}',
			'.dshc_seg button[data-active=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}',
			'.dshc_nav{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l2);padding-bottom:8px}',
			'.dshc_nav button{border:1px solid transparent;background:0 0;color:var(--dsw-alias-label-secondary);font:inherit;padding:5px 12px;border-radius:7px;cursor:pointer}',
			'.dshc_nav button[data-active=true]{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsh-alias-label-primary);font-weight:600}',
			'.dshc_nav button[data-active=true]{color:var(--dsw-alias-label-primary)}',
			'.dshc_btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px}',
			'.dshc_btn:disabled{opacity:.55;cursor:default}',
			'.dshc_btn[data-on=true]{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}',
			'.dshc_spacer{flex:1}',
			'.dshc_pre{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;margin:0;padding:12px 14px;max-height:480px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px}',
			'.dshc_list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}',
			'.dshc_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;overflow:hidden}',
			'.dshc_rowHead{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer}',
			'.dshc_name{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dshc_badge{border-radius:5px;padding:1px 6px;font-size:11px;line-height:16px;flex:none}',
			'.dshc_badge[data-origin=ours]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);color:var(--dsw-alias-state-business-primary)}',
			'.dshc_badge[data-origin=official]{background:color-mix(in srgb, var(--dsh-alias-state-success-primary) 10%, transparent);color:var(--dsh-alias-state-success-primary)}',
			'.dshc_badge[data-origin=official]{background:color-mix(in srgb, var(--dsh-alias-state-success-primary,var(--dsw-alias-state-success-primary)) 10%, transparent);color:var(--dsh-alias-state-success-primary,var(--dsw-alias-state-success-primary))}',
			'.dshc_badge[data-origin=other]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}',
			'.dshc_badge[data-force=M]{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);color:var(--dsw-alias-state-error-primary)}',
			'.dshc_badge[data-force=S]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}',
			'.dshc_chars{color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums}',
			'.dshc_rowBody{border-top:1px solid var(--dsw-alias-border-l2);padding:8px 10px;background:var(--dsw-alias-bg-module-platform)}',
			'.dshc_error{border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;padding:10px 12px;color:var(--dsw-alias-state-error-primary);display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
			'.dshc_footer{border-top:1px solid var(--dsw-alias-border-l2);padding-top:10px;color:var(--dsw-alias-label-tertiary);font-size:12px;display:flex;flex-direction:column;gap:4px}',
			'.dshc_kv{display:grid;grid-template-columns:112px minmax(0,1fr);gap:3px 10px}',
			'.dshc_kv dt{color:var(--dsw-alias-label-tertiary)}',
			'.dshc_kv dd{margin:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary)}',
			'.dshc_note{font-size:12px;line-height:18px}',
			'.dshc_ta{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:10px 12px;min-height:120px;width:100%;box-sizing:border-box;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px;resize:vertical}',
			'.dshc_h3{border-top:1px solid var(--dsw-alias-border-l2);padding-top:12px;margin-top:4px}',
			'.dshc_in{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:6px;padding:4px 8px;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;min-width:0;box-sizing:border-box}',
			'.dshc_rule{display:flex;gap:8px;align-items:flex-start}',
			'.dshc_rule .dshc_ta{min-height:54px}',
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

		const ORIGIN_LABEL = { ours: '本插件', official: '官方', other: '其它外部' };
		const FORCE_LABEL = { M: 'M 强制', S: 'S 按症状' };

		function fmtTime(iso) {
			if (!iso) return '—';
			try { return new Date(iso).toLocaleString(); } catch { return iso; }
		}

		function SectionRow(props) {
			const s = props.section;
			const [open, setOpen] = useState(false);
			return h('li', { className: 'dshc_row' },
				h('div', { className: 'dshc_rowHead', onClick: () => setOpen(!open), role: 'button', tabIndex: 0, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } } },
					h('span', { className: 'dshc_badge', 'data-origin': s.origin }, ORIGIN_LABEL[s.origin] || s.origin),
					h('span', { className: 'dshc_name', title: s.name }, s.name || '(未命名)'),
					h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
					h('span', { className: 'dshc_chars' }, s.chars + ' 字'),
					h('span', { className: 'dshc_meta' }, open ? '收起' : '展开'),
				),
				open ? h('div', { className: 'dshc_rowBody' }, h('pre', { className: 'dshc_pre' }, s.text || '(空)')) : null,
			);
		}

		// ── ① 装配概览 ──
		function OverviewZone() {
			const [mode, setMode] = useState('rendered');
			const [view, setView] = useState(null);
			const [sessions, setSessions] = useState(null);
			const [viewScope, setViewScope] = useState('');
			const [error, setError] = useState(null);
			const load = useCallback(async () => {
				setError(null);
				try {
					const asmPath = 'assembly' + (viewScope ? '?session=' + encodeURIComponent(viewScope) : '');
					const results = await Promise.all([api(asmPath), api('sessions')]);
					setView(results[0]);
					setSessions(results[1].sessions);
				} catch (e) {
					setError(String((e && e.message) || e));
				}
			}, [viewScope]);
			useEffect(() => { void load(); }, [load]);
			const out = [h('div', { className: 'dshc_header', key: 'h' },
				h('h3', { className: 'dshc_title' }, '装配概览'),
				h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
				h('button', { className: 'dshc_btn', onClick: () => void load() }, '刷新'),
			)];
			if (error) out.push(h('div', { className: 'dshc_error', key: 'e' }, h('span', null, '读取失败：' + error), h('button', { className: 'dshc_btn', onClick: () => void load() }, '重试')));
			if (!view && !error) out.push(h('div', { className: 'dshc_meta', key: 'l' }, '读取中…'));
			if (view) {
				out.push(h('div', { className: 'dshc_toolbar', key: 'bar' },
					h('div', { className: 'dshc_seg' },
						h('button', { 'data-active': mode === 'rendered', onClick: () => setMode('rendered') }, '渲染全文'),
						h('button', { 'data-active': mode === 'source', onClick: () => setMode('source') }, '分区源码'),
					),
					h('select', { className: 'dshc_in', value: viewScope, style: { maxWidth: 320 }, onChange: (e) => { setViewScope(e.target.value); } },
						h('option', { value: '', key: 'g' }, '作用域：全局（未附着会话）'),
						...(sessions || []).map((s0) =>
							h('option', { value: s0.id, key: s0.id }, '会话 ' + s0.id.replace(/^session-/, '').slice(0, 8) + (s0.cwd ? '｜' + s0.cwd.split(/[\\/]/).pop() : '')),
						),
					),
					h('button', { className: 'dshc_btn', onClick: () => navigator.clipboard && view.rendered ? void navigator.clipboard.writeText(view.rendered) : null }, '复制全文'),
				));
				out.push(h('div', { className: 'dshc_meta', key: 'meta' },
					'生成于 ' + fmtTime(view.generatedAt) + ' ｜ ' + (view.scopeLabel || '') + ' ｜ ' +
					(view.rendererAvailable ? (view.renderNote ? '渲染器在线（容错模式）' : '渲染器在线') : '宿主渲染器不可用（已降级为原文）')));
				if (mode === 'rendered') {
					if (view.rendered === null) out.push(h('div', { className: 'dshc_note', key: 'rn' }, '未能渲染（宿主 renderPrompt 不可用）；请切到「分区源码」查看原文。'));
					else {
						if (view.renderNote) out.push(h('div', { className: 'dshc_note', key: 'rnote' }, '注意：' + view.renderNote));
						out.push(h('pre', { className: 'dshc_pre', key: 'rp' }, view.rendered.length > 0 ? view.rendered : '（空）'));
					}
				} else {
					out.push(h('ul', { className: 'dshc_list', key: 'src' },
						view.sections.length === 0 ? h('li', { className: 'dshc_meta' }, '无分区') : view.sections.map((s, i) => h(SectionRow, { section: s, key: s.name + '#' + i }))));
					const extra = [];
					if (view.contexts.length > 0) extra.push('动态上下文：' + view.contexts.map((c) => c.name + '(' + c.chars + '字)').join('、'));
					extra.push('工具 schema：' + view.tools.length + ' 个');
					if (view.variables.length > 0) extra.push('变量：' + view.variables.join('、'));
					out.push(h('div', { className: 'dshc_meta', key: 'sum' }, extra.join(' ｜ ')));
				}
			}
			return h('div', null, out);
		}

		// ── ② 提示词中心（②a 常驻核心 / ②b 我的提示词 / ②c 渐进加载层）──
		function PromptCenterZone() {
			const [disc, setDisc] = useState(null);
			const [draft, setDraft] = useState(null);
			const [saving, setSaving] = useState(false);
			const [saveMsg, setSaveMsg] = useState(null);
			const [up, setUp] = useState(null);
			const [upDraft, setUpDraft] = useState(null);
			const [upSaving, setUpSaving] = useState(false);
			const [upMsg, setUpMsg] = useState(null);
			const [layered, setLayered] = useState(null);
			const [editSec, setEditSec] = useState(null);
			const [secDraft, setSecDraft] = useState(null);
			const [secMsg, setSecMsg] = useState(null);
			useEffect(() => {
				void (async () => {
					try {
						const d = await api('discipline');
						setDisc(d); setDraft(d.sourceText);
						const u = await api('user-prompt');
						setUp(u); setUpDraft(u.text);
						setLayered(await api('layered'));
					} catch (e) { setSaveMsg('读取失败：' + String((e && e.message) || e)); }
				})();
			}, []);
			const saveDisc = useCallback(async () => {
				setSaving(true); setSaveMsg(null);
				try {
					const d = await api('discipline', { method: 'PUT', body: { text: draft == null ? '' : draft } });
					setDisc(d); setDraft(d.sourceText); setSaveMsg('已保存（快照＋落盘；下一条消息热生效）');
				} catch (e) { setSaveMsg('保存失败：' + String((e && e.message) || e)); } finally { setSaving(false); }
			}, [draft]);
			const toggleDisc = useCallback(async () => {
				if (!disc) return;
				try {
					const s = await api('settings', { method: 'PUT', body: { injectEnabled: !disc.enabled } });
					setDisc((p) => Object.assign({}, p, { enabled: s.enabled }));
				} catch (e) { setSaveMsg('切换失败：' + String((e && e.message) || e)); }
			}, [disc]);
			const saveUp = useCallback(async () => {
				setUpSaving(true); setUpMsg(null);
				try {
					const u = await api('user-prompt', { method: 'PUT', body: { text: upDraft == null ? '' : upDraft, enabled: up ? up.enabled : true } });
					setUp(u); setUpMsg('已保存（空=不注入；热生效）');
				} catch (e) { setUpMsg('保存失败：' + String((e && e.message) || e)); } finally { setUpSaving(false); }
			}, [upDraft, up]);
			const toggleUp = useCallback(async () => {
				if (!up) return;
				try {
					const u = await api('user-prompt', { method: 'PUT', body: { text: up.text, enabled: !up.enabled } });
					setUp(u);
				} catch (e) { setUpMsg('切换失败：' + String((e && e.message) || e)); }
			}, [up]);
			const saveSec = useCallback(async () => {
				if (!editSec) return;
				setSecMsg(null);
				try {
					const v = await api('layered/' + encodeURIComponent(editSec), { method: 'PUT', body: { text: secDraft == null ? '' : secDraft } });
					setLayered((p) => Object.assign({}, p, { sections: p.sections.map((s) => (s.name === v.name ? v : s)) }));
					setSecMsg('已保存（引擎侧 mtime 感知，下次注入生效）');
				} catch (e) { setSecMsg('保存失败：' + String((e && e.message) || e)); }
			}, [editSec, secDraft]);
			const secAction = useCallback(async (name, act) => {
				setSecMsg(null);
				try {
					const v = await api('layered/' + encodeURIComponent(name) + '/' + act, { method: 'POST', body: { enabled: false } });
					setLayered((p) => Object.assign({}, p, { sections: p.sections.map((s) => (s.name === v.name ? v : s)) }));
				} catch (e) { setSecMsg('操作失败：' + String((e && e.message) || e)); }
			}, []);
			const secToggle = useCallback(async (name, to) => {
				setSecMsg(null);
				try {
					const v = await api('layered/' + encodeURIComponent(name) + '/toggle', { method: 'POST', body: { enabled: to } });
					setLayered((p) => Object.assign({}, p, { sections: p.sections.map((s) => (s.name === v.name ? v : s)) }));
				} catch (e) { setSecMsg('操作失败：' + String((e && e.message) || e)); }
			}, []);
			const out = [];
			// ②a 常驻核心
			out.push(h('div', { className: 'dshc_header', key: 'ha' },
				h('h3', { className: 'dshc_title' }, '常驻核心（工程纪律）'),
				h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
				disc ? h('button', { className: 'dshc_btn', 'data-on': disc.enabled, onClick: () => void toggleDisc() }, disc.enabled ? '总开关：开' : '总开关：关') : null,
				h('span', { className: 'dshc_meta' }, disc && disc.mtime ? 'mtime ' + fmtTime(disc.mtime) : ''),
			));
			out.push(h('div', { className: 'dshc_note', key: 'na' }, '装配序：常驻核心(-2000) → 我的提示词(-1990) → 官方提示词(0)。空/关=空文本自动剔除；改坏时运行时 fail-closed 回退内置默认（落审计）。'));
			out.push(h('div', { className: 'dshc_meta', key: 'pa' }, '预览（模型先看到的前 8 行）：', h('pre', { className: 'dshc_pre', style: { maxHeight: 140 } }, String(draft || '').split('\n').slice(0, 8).join('\n') || '（空）')));
			out.push(h('textarea', { className: 'dshc_ta', key: 'ta', value: draft == null ? '' : draft, placeholder: '常驻核心全文（Markdown）', spellCheck: false, onChange: (e) => setDraft(e.target.value) }));
			out.push(h('div', { className: 'dshc_toolbar', key: 'ba' },
				h('button', { className: 'dshc_btn', onClick: () => void saveDisc(), disabled: saving || draft == null }, saving ? '保存中…' : '保存（快照＋落盘）'),
				saveMsg ? h('span', { className: 'dshc_meta' }, saveMsg) : null,
			));
			// ②b 我的提示词
			out.push(h('div', { className: 'dshc_header dshc_h3', key: 'hb' },
				h('h3', { className: 'dshc_title' }, '我的提示词（用户自定义段）'),
				h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
				up ? h('button', { className: 'dshc_btn', 'data-on': up.enabled, onClick: () => void toggleUp() }, up.enabled ? '开关：开' : '开关：关') : null,
			));
			out.push(h('div', { className: 'dshc_note', key: 'nb' }, '你的附加纪律/偏好——独立于常驻核心，不覆盖它；空=不注入。'));
			out.push(h('textarea', { className: 'dshc_ta', key: 'utb', style: { minHeight: 90 }, value: upDraft == null ? '' : upDraft, placeholder: '我的提示词（Markdown；空=不注入）', spellCheck: false, onChange: (e) => setUpDraft(e.target.value) }));
			out.push(h('div', { className: 'dshc_toolbar', key: 'bb' },
				h('button', { className: 'dshc_btn', onClick: () => void saveUp(), disabled: upSaving || upDraft == null }, upSaving ? '保存中…' : '保存'),
				upMsg ? h('span', { className: 'dshc_meta' }, upMsg) : null,
			));
			// ②c 渐进加载层
			out.push(h('div', { className: 'dshc_header dshc_h3', key: 'hc' }, h('h3', { className: 'dshc_title' }, '渐进加载层（检测→注入；M=强制 S=按症状）')));
			if (layered) {
				const allClean = layered.sections.every((s) => !s.modified);
				out.push(h('div', { className: 'dshc_note', key: 'nc' }, '指纹状态：' + (allClean ? '全部分节与出厂默认一致 ✓' : '存在已改分节（' + layered.sections.filter((s) => s.modified).length + ' 个）')));
				out.push(h('ul', { className: 'dshc_list', key: 'lc' }, layered.sections.map((s) =>
					h('li', { className: 'dshc_row', key: s.name },
						h('div', { className: 'dshc_rowHead' },
							h('span', { className: 'dshc_badge', 'data-force': s.force }, FORCE_LABEL[s.force] || s.force),
							h('span', { className: 'dshc_name', title: s.name }, s.name),
							s.modified ? h('span', { className: 'dshc_badge' }, '已改') : null,
							h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
							h('span', { className: 'dshc_chars' }, s.chars + ' 字'),
							h('button', { className: 'dshc_btn', 'data-on': s.enabled, onClick: () => void secToggle(s.name, !s.enabled) }, s.enabled ? '启用' : '停用'),
							h('button', { className: 'dshc_btn', onClick: () => { setEditSec(s.name); setSecDraft(s.text); } }, editSec === s.name ? '编辑中' : '编辑'),
							s.modified ? h('button', { className: 'dshc_btn', onClick: () => void secAction(s.name, 'reset') }, '恢复出厂') : null,
						),
						editSec === s.name ? h('div', { className: 'dshc_rowBody' },
							h('textarea', { className: 'dshc_ta', value: secDraft == null ? '' : secDraft, spellCheck: false, onChange: (e) => setSecDraft(e.target.value) }),
							h('div', { className: 'dshc_toolbar', style: { marginTop: 6 } },
								h('button', { className: 'dshc_btn', onClick: () => void saveSec() }, '保存分节'),
								h('button', { className: 'dshc_btn', onClick: () => setEditSec(null) }, '收起'),
								secMsg ? h('span', { className: 'dshc_meta' }, secMsg) : null,
							),
						) : null,
					),
				)));
				out.push(h('div', { className: 'dshc_note', key: 'nc2' }, '用户改动落 ' + '$DSH_HOME/dsh-custom/layered/，运行时引擎（shisan-xinuo-core）按「用户目录优先」装载，mtime 感知热生效；停用=触发时跳过注入。'));
			} else {
				out.push(h('div', { className: 'dshc_meta', key: 'lc0' }, '读取中…'));
			}
			return h('div', null, out);
		}

		// ── ③ 接管官方（complete）──
		function OverrideZone() {
			const [ov, setOv] = useState(null);
			const [ovDraft, setOvDraft] = useState(null);
			const [ovMsg, setOvMsg] = useState(null);
			const [ovSaving, setOvSaving] = useState(false);
			useEffect(() => {
				void (async () => {
					try { const o = await api('override'); setOv(o); setOvDraft(o.text); } catch (e) { setOvMsg('读取失败：' + String((e && e.message) || e)); }
				})();
			}, []);
			const saveOverride = useCallback(async () => {
				setOvSaving(true); setOvMsg(null);
				try {
					const o = await api('override', { method: 'PUT', body: { text: ovDraft == null ? '' : ovDraft } });
					setOv(o); setOvDraft(o.text); setOvMsg('已保存（干跑校验通过；保存前已快照）');
				} catch (e) { setOvMsg('保存失败：' + String((e && e.message) || e)); } finally { setOvSaving(false); }
			}, [ovDraft]);
			const toggleOverride = useCallback(async () => {
				if (!ov) return;
				setOvMsg(null);
				try {
					const o = await api('override/enable', { method: 'PUT', body: { enabled: !ov.enabled } });
					setOv(o); setOvMsg(o.enabled ? '已启用接管（模型将只看到编辑文本）' : '已停用接管（已恢复官方装配）');
				} catch (e) { setOvMsg('操作失败：' + String((e && e.message) || e)); }
			}, [ov]);
			if (!ov) return h('div', { className: 'dshc_meta' }, '读取中…');
			return h('div', null,
				h('div', { className: 'dshc_header' },
					h('h3', { className: 'dshc_title' }, '接管官方（complete 整段替换）'),
					h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
					h('button', { className: 'dshc_btn', 'data-on': ov.enabled, onClick: () => void toggleOverride() }, ov.enabled ? '接管：已启用（点击停用）' : '接管：已关闭（点击启用）'),
				),
				h('div', { className: 'dshc_error' }, h('span', null, '⚠ 接管后官方提示词被整段替换（唯一 complete 段）——与其它 complete 类插件互斥，启用时自动探测；启用时提示词中心的常驻段被覆盖。')),
				h('div', { className: 'dshc_toolbar', style: { marginTop: 8 } },
					h('button', { className: 'dshc_btn', onClick: () => void (async () => { try { const a = await api('assembly'); setOvDraft(a.rendered || ovDraft); } catch { /* 忽略 */ } })() }, '取材于当前装配'),
					h('button', { className: 'dshc_btn', onClick: () => void saveOverride(), disabled: ovSaving || ovDraft == null }, ovSaving ? '校验保存中…' : '保存（干跑校验＋快照）'),
					ovMsg ? h('span', { className: 'dshc_meta' }, ovMsg) : null,
				),
				h('textarea', { className: 'dshc_ta', style: { minHeight: 160, marginTop: 8 }, value: ovDraft == null ? '' : ovDraft, placeholder: '接管文本（Markdown；可用已注册 {{变量}}；未知变量会被干跑校验阻止保存）', spellCheck: false, onChange: (e) => setOvDraft(e.target.value) }),
			);
		}

		// ── ④ 作用域规则 ──
		function ScopeZone() {
			const [rules, setRules] = useState(null);
			const [msg, setMsg] = useState(null);
			const [saving, setSaving] = useState(false);
			useEffect(() => {
				void (async () => {
					try { setRules((await api('scope')).rules); } catch (e) { setMsg('读取失败：' + String((e && e.message) || e)); }
				})();
			}, []);
			const save = useCallback(async () => {
				setSaving(true); setMsg(null);
				try {
					const s = await api('scope', { method: 'PUT', body: { rules: rules == null ? [] : rules } });
					setRules(s.rules); setMsg('已保存（保存前已生成快照）');
				} catch (e) { setMsg('保存失败：' + String((e && e.message) || e)); } finally { setSaving(false); }
			}, [rules]);
			const patchRule = (i, patch) => setRules((prev) => (prev == null ? prev : prev.map((r, j) => (j === i ? Object.assign({}, r, patch) : r))));
			if (rules === null) return h('div', { className: 'dshc_meta' }, '读取中…');
			const MODE_LABEL = { exact: '完全一致', prefix: '前缀', contains: '包含', regex: '正则' };
			return h('div', null,
				h('div', { className: 'dshc_header' }, h('h3', { className: 'dshc_title' }, '作用域规则（越具体越优先）')),
				h('div', { className: 'dshc_note' }, '完全一致＞前缀＞包含＞正则；空正文=在该位置关闭。'),
				...rules.map((r, i) =>
					h('div', { className: 'dshc_rule', key: 'sr' + String(i), style: { marginTop: 6 } },
						h('select', { className: 'dshc_in', value: r.mode, onChange: (e) => patchRule(i, { mode: e.target.value }) },
							['exact', 'prefix', 'contains', 'regex'].map((m) => h('option', { value: m, key: m }, MODE_LABEL[m]))),
						h('input', { className: 'dshc_in', style: { flex: 1 }, value: r.path, placeholder: '工作区路径（如 D:\\proj）', spellCheck: false, onChange: (e) => patchRule(i, { path: e.target.value }) }),
						h('textarea', { className: 'dshc_ta', style: { flex: 1.2 }, value: r.text, placeholder: '文本（空=该位置关闭）', spellCheck: false, onChange: (e) => patchRule(i, { text: e.target.value }) }),
						h('button', { className: 'dshc_btn', onClick: () => setRules((prev) => prev.filter((_, j) => j !== i)) }, '删除'),
					)),
				h('div', { className: 'dshc_toolbar', style: { marginTop: 8 } },
					h('button', { className: 'dshc_btn', onClick: () => setRules((prev) => (prev || []).concat([{ path: '', mode: 'prefix', text: '' }])) }, '＋ 新增规则'),
					h('button', { className: 'dshc_btn', onClick: () => void save(), disabled: saving }, saving ? '保存中…' : '保存规则'),
					msg ? h('span', { className: 'dshc_meta' }, msg) : null,
				),
			);
		}

		// ── ⑤⑥ 快照与备份（同数据面：backups=配置快照时间线；承载 backups/ 目录项=待扩展）──
		function SnapshotZone() {
			const [bk, setBk] = useState(null);
			const [msg, setMsg] = useState(null);
			const load = useCallback(async () => {
				try { setBk((await api('backups')).entries); } catch (e) { setMsg('读取失败：' + String((e && e.message) || e)); }
			}, []);
			useEffect(() => { void load(); }, [load]);
			const restore = useCallback(async (name) => {
				setMsg(null);
				try {
					await api('backups/restore', { method: 'PUT', body: { name } });
					setMsg('已回滚：' + name + '（回滚前状态已自动再快照，可反悔）');
				} catch (e) { setMsg('回滚失败：' + String((e && e.message) || e)); }
			}, []);
			if (bk === null) return h('div', { className: 'dshc_meta' }, '读取中…');
			return h('div', null,
				h('div', { className: 'dshc_header' }, h('h3', { className: 'dshc_title' }, '快照与回滚'), h('span', { className: 'dshc_spacer', style: { flex: 1 } }), h('button', { className: 'dshc_btn', onClick: () => void load() }, '刷新')),
				h('div', { className: 'dshc_note' }, '每次保存前自动快照；回滚前自动再快照（可反悔）。'),
				bk.length === 0 ? h('div', { className: 'dshc_meta' }, '（暂无快照）') :
					h('ul', { className: 'dshc_list' }, bk.slice(0, 20).map((b0) =>
						h('li', { className: 'dshc_row', key: b0.name },
							h('div', { className: 'dshc_rowHead' },
								h('span', { className: 'dshc_name' }, b0.name),
								h('span', { className: 'dshc_chars' }, b0.files.join('、')),
								h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
								h('button', { className: 'dshc_btn', onClick: () => void restore(b0.name) }, '回滚到此版本'),
							))),
				),
				msg ? h('div', { className: 'dshc_meta' }, msg) : null,
				h('div', { className: 'dshc_note', style: { marginTop: 8 } }, '备份管理（承载 backups/ 目录项、backup-info.txt 四要素、临时备份清理）：待扩展（当前数据面=配置快照）。'),
			);
		}

		// ── ⑦ 审计与状态 ──
		function AuditZone() {
			const [audit, setAudit] = useState(null);
			const [status, setStatus] = useState(null);
			const [error, setError] = useState(null);
			const load = useCallback(async () => {
				setError(null);
				try {
					setAudit(await api('audit?limit=80'));
					setStatus(await api('status'));
				} catch (e) { setError(String((e && e.message) || e)); }
			}, []);
			useEffect(() => { void load(); }, [load]);
			const out = [h('div', { className: 'dshc_header', key: 'h' }, h('h3', { className: 'dshc_title' }, '审计与状态'), h('span', { className: 'dshc_spacer', style: { flex: 1 } }), h('button', { className: 'dshc_btn', onClick: () => void load() }, '刷新'))];
			if (error) out.push(h('div', { className: 'dshc_error', key: 'e' }, '读取失败：' + error));
			if (status) {
				out.push(h('dl', { className: 'dshc_kv', key: 'kv' },
					h('dt', { key: 'k0' }, '护栏'), h('dd', { key: 'v0' }, '拦截 ' + status.guard.denied + ' 次 ｜ 只读触碰 ' + status.guard.touched + ' 次'),
					h('dt', { key: 'k1' }, '存储根'), h('dd', { key: 'v1' }, status.root),
					h('dt', { key: 'k2' }, '会话外改动'), h('dd', { key: 'v2' }, status.externalChanges.length === 0 ? '无（自上次基线）' : status.externalChanges.map((c) => c.file).join('、')),
				));
			}
			if (audit) {
				out.push(h('div', { className: 'dshc_meta', key: 'cnt' }, 'audit.jsonl 共 ' + audit.total + ' 条（显示最近 ' + audit.entries.length + ' 条）'));
				out.push(h('ul', { className: 'dshc_list', key: 'lst' }, audit.entries.map((e, i) =>
					h('li', { className: 'dshc_row', key: 'a' + String(i) },
						h('div', { className: 'dshc_rowHead' },
							h('span', { className: 'dshc_badge' }, String(e.kind || '?')),
							h('span', { className: 'dshc_meta' }, fmtTime(e.at || e.time || e.ts)),
							h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
							h('span', { className: 'dshc_chars' }, JSON.stringify(e).slice(0, 90)),
						)))));
			}
			return h('div', null, out);
		}

		// ── ⑧ 运行时治理（只读面板；数据面待运行时插件 log API）──
		function GovernZone() {
			return h('div', null,
				h('div', { className: 'dshc_header' }, h('h3', { className: 'dshc_title' }, '运行时治理（只读）')),
				h('div', { className: 'dshc_note' }, '判级分布／断言登记与通过／收口（ok-tool/ok-auto/unverified）／steer 打回与熔断／L3 命中（记录模式）——数据源=运行时插件（shisan-xinuo-core）exec-log.jsonl。'),
				h('div', { className: 'dshc_meta' }, '本区为只读占位：运行时日志 API 未暴露前不显示数据（不伪造）；手动查看=运行时插件 logs/exec-log.jsonl。说明：只读，无任何绕过入口。'),
			);
		}

		// ── ⑨ 设置 ──
		function SettingsZone() {
			const [settings, setSettings] = useState(null);
			const [agents, setAgents] = useState(null);
			const [msg, setMsg] = useState(null);
			useEffect(() => {
				void (async () => {
					try {
						setSettings(await api('settings'));
						setAgents(await api('agents'));
					} catch (e) { setMsg('读取失败：' + String((e && e.message) || e)); }
				})();
			}, []);
			const toggle = useCallback(async () => {
				if (!settings) return;
				try { setSettings(await api('settings', { method: 'PUT', body: { injectEnabled: !settings.enabled } })); } catch (e) { setMsg('切换失败：' + String((e && e.message) || e)); }
			}, [settings]);
			if (!settings) return h('div', { className: 'dshc_meta' }, msg || '读取中…');
			return h('div', null,
				h('div', { className: 'dshc_header' }, h('h3', { className: 'dshc_title' }, '设置')),
				h('dl', { className: 'dshc_kv' },
					h('dt', { key: 'k0' }, '纪律注入'), h('dd', { key: 'v0' }, h('button', { className: 'dshc_btn', 'data-on': settings.enabled, onClick: () => void toggle() }, settings.enabled ? '开启（点击关闭）' : '关闭（点击开启）')),
					h('dt', { key: 'k1' }, '装配序'), h('dd', { key: 'v1' }, '常驻核心(-2000) → 我的提示词(-1990) → 官方(0)'),
					h('dt', { key: 'k2' }, '护栏语义'), h('dd', { key: 'v2' }, '防静默改写（拦截＋提示＋留痕）'),
					h('dt', { key: 'k3' }, '存储位置'), h('dd', { key: 'v3' }, agents ? agents.root || '$DSH_HOME/dsh-custom/' : '$DSH_HOME/dsh-custom/'),
					h('dt', { key: 'k4' }, 'AGENTS.md'), h('dd', { key: 'v4' }, agents ? (agents.exists ? '检测到（' + agents.bytes + ' 字节）——宿主原生通道，本插件不接管' : '未检测到') : '—'),
				),
				msg ? h('div', { className: 'dshc_meta' }, msg) : null,
			);
		}

		const ZONES = [
			['overview', '概览', OverviewZone],
			['prompt', '提示词中心', PromptCenterZone],
			['override', '接管官方', OverrideZone],
			['scope', '作用域', ScopeZone],
			['snapshot', '快照', SnapshotZone],
			['audit', '审计', AuditZone],
			['govern', '治理', GovernZone],
			['settings', '设置', SettingsZone],
		];

		function Tab() {
			const [active, setActive] = useState('overview');
			const Zone = (ZONES.find((z) => z[0] === active) || ZONES[0])[2];
			return h('div', { className: 'dshc_page' },
				h('div', { className: 'dshc_header' },
					h('h2', { className: 'dshc_title' }, 'DSH自定义 · 系统提示词管理'),
					h('span', { className: 'dshc_meta' }, '先看真实装配，再改该看到什么'),
				),
				h('nav', { className: 'dshc_nav', 'aria-label': 'DSH自定义分区' },
					ZONES.map((z) => h('button', { key: z[0], 'data-active': active === z[0], onClick: () => setActive(z[0]) }, z[1]))),
				h(Zone, { key: active }),
			);
		}

		const inject = ['slots'];

		// #决策 2026-10-17 15:46 入口=设置导航区一级条目（settings.section，形制同官方「Agent 预设」）；
		// 由「内置插件」分区页签（settings.plugins.tab）移出——该页签实机可注册但层级隐藏，可见性不佳。
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
