// dsh-custom 浏览器半（P0）：插件设置区内「DSH自定义」页签 —— 实际装配只读视图（双视图 + 归属徽标）
// 形态：__ModuleLoader__.load 内联 factory；仅依赖宿主 externals（react）；数据来自同源 /api/dsh-custom/*。
// 设计档：D:/DeepSeek/dsh-plugin-dev/docs/design-specs/dsh-custom-prompt-design-20261017.md（§3 区一）
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
			'.dshc_page{width:100%;max-width:860px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:20px}',
			'.dshc_header{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
			'.dshc_title{margin:0;font-size:15px;font-weight:600;line-height:22px}',
			'.dshc_meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
			'.dshc_toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
			'.dshc_seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden}',
			'.dshc_seg button{border:0;background:0 0;color:var(--dsw-alias-label-secondary);font:inherit;padding:5px 12px;cursor:pointer}',
			'.dshc_seg button[data-active=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}',
			'.dshc_btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px}',
			'.dshc_btn:disabled{opacity:.55;cursor:default}',
			'.dshc_spacer{flex:1}',
			'.dshc_pre{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;margin:0;padding:12px 14px;max-height:480px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px}',
			'.dshc_list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}',
			'.dshc_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;overflow:hidden}',
			'.dshc_rowHead{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer}',
			'.dshc_name{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dshc_badge{border-radius:5px;padding:1px 6px;font-size:11px;line-height:16px;flex:none}',
			'.dshc_badge[data-origin=ours]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);color:var(--dsw-alias-state-business-primary)}',
			'.dshc_badge[data-origin=official]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-state-success-primary)}',
			'.dshc_badge[data-origin=other]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}',
			'.dshc_chars{color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums}',
			'.dshc_rowBody{border-top:1px solid var(--dsw-alias-border-l2);padding:8px 10px;background:var(--dsw-alias-bg-module-platform)}',
			'.dshc_error{border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;padding:10px 12px;color:var(--dsw-alias-state-error-primary);display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
			'.dshc_footer{border-top:1px solid var(--dsw-alias-border-l2);padding-top:10px;color:var(--dsw-alias-label-tertiary);font-size:12px;display:flex;flex-direction:column;gap:4px}',
			'.dshc_kv{display:grid;grid-template-columns:112px minmax(0,1fr);gap:3px 10px}',
			'.dshc_kv dt{color:var(--dsw-alias-label-tertiary)}',
			'.dshc_kv dd{margin:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary)}',
			'.dshc_note{font-size:12px;line-height:18px}',
			'.dshc_ta{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:10px 12px;min-height:120px;width:100%;box-sizing:border-box;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:18px;resize:vertical}',
			'.dshc_btn[data-on=true]{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}',
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

		function Tab() {
			const [mode, setMode] = useState('rendered');
			const [view, setView] = useState(null);
			const [status, setStatus] = useState(null);
			const [disc, setDisc] = useState(null);
			const [settings, setSettings] = useState(null);
			const [agents, setAgents] = useState(null);
			const [scopeRules, setScopeRules] = useState(null);
			const [scopeSaving, setScopeSaving] = useState(false);
			const [scopeMsg, setScopeMsg] = useState(null);
			const [ov, setOv] = useState(null);
			const [ovDraft, setOvDraft] = useState(null);
			const [ovSaving, setOvSaving] = useState(false);
			const [ovMsg, setOvMsg] = useState(null);
			const [bk, setBk] = useState(null);
			const [bkMsg, setBkMsg] = useState(null);
			const [draft, setDraft] = useState(null);
			const [saving, setSaving] = useState(false);
			const [saveMsg, setSaveMsg] = useState(null);
			const [error, setError] = useState(null);
			const [loading, setLoading] = useState(false);

			const load = useCallback(async () => {
				setLoading(true);
				setError(null);
				try {
					const results = await Promise.all([api('assembly'), api('status'), api('discipline'), api('settings'), api('agents'), api('scope'), api('override'), api('backups')]);
					setView(results[0]);
					setStatus(results[1]);
					setDisc(results[2]);
					setSettings(results[3]);
					setAgents(results[4]);
					setScopeRules(results[5].rules);
					setOv(results[6]);
					setOvDraft(results[6].text);
					setBk(results[7].entries);
					setDraft(results[2].sourceText);
				} catch (e) {
					setError(String((e && e.message) || e));
				} finally {
					setLoading(false);
				}
			}, []);
			useEffect(() => { void load(); }, [load]);

			const saveScopeDraft = useCallback(async () => {
				setScopeSaving(true);
				setScopeMsg(null);
				try {
					const s = await api('scope', { method: 'PUT', body: { rules: scopeRules == null ? [] : scopeRules } });
					setScopeRules(s.rules);
					setScopeMsg('已保存（保存前已生成快照）');
				} catch (e) {
					setScopeMsg('保存失败：' + String((e && e.message) || e));
				} finally {
					setScopeSaving(false);
				}
			}, [scopeRules]);
			const patchRule = (index, patch) => {
				setScopeRules((prev) => (prev == null ? prev : prev.map((r, i) => (i === index ? Object.assign({}, r, patch) : r))));
			};

			const saveOverride = useCallback(async () => {
				setOvSaving(true);
				setOvMsg(null);
				try {
					const o = await api('override', { method: 'PUT', body: { text: ovDraft == null ? '' : ovDraft } });
					setOv(o);
					setOvDraft(o.text);
					setOvMsg('已保存（干跑校验通过；保存前已快照）');
				} catch (e) {
					setOvMsg('保存失败：' + String((e && e.message) || e));
				} finally {
					setOvSaving(false);
				}
			}, [ovDraft]);
			const toggleOverride = useCallback(async () => {
				if (!ov) return;
				setOvMsg(null);
				try {
					const o = await api('override/enable', { method: 'PUT', body: { enabled: !ov.enabled } });
					setOv(o);
					setOvMsg(o.enabled ? '已启用接管（模型将只看到编辑文本）' : '已停用接管（已恢复官方装配）');
				} catch (e) {
					setOvMsg('操作失败：' + String((e && e.message) || e));
				}
			}, [ov]);
			const restoreSnap = useCallback(async (name) => {
				setBkMsg(null);
				try {
					await api('backups/restore', { method: 'PUT', body: { name } });
					setBkMsg('已回滚：' + name + '（回滚前状态已自动再快照）');
					await load();
				} catch (e) {
					setBkMsg('回滚失败：' + String((e && e.message) || e));
				}
			}, [load]);

			const saveDisc = useCallback(async () => {
				setSaving(true);
				setSaveMsg(null);
				try {
					const d = await api('discipline', { method: 'PUT', body: { text: draft == null ? '' : draft } });
					setDisc(d);
					setDraft(d.sourceText);
					setSaveMsg('已保存（保存前已生成快照）');
				} catch (e) {
					setSaveMsg('保存失败：' + String((e && e.message) || e));
				} finally {
					setSaving(false);
				}
			}, [draft]);

			const toggleInject = useCallback(async () => {
				if (!settings) return;
				try {
					const s = await api('settings', { method: 'PUT', body: { injectEnabled: !settings.enabled } });
					setSettings(s);
				} catch (e) {
					setError(String((e && e.message) || e));
				}
			}, [settings]);

			const children = [];
			children.push(
				h('div', { className: 'dshc_header', key: 'head' },
					h('h2', { className: 'dshc_title' }, 'DSH自定义 · 系统提示词管理'),
					h('button', { className: 'dshc_btn', onClick: () => void load(), disabled: loading, key: 'refresh' }, loading ? '刷新中…' : '刷新'),
				),
			);

			if (error) {
				children.push(
					h('div', { className: 'dshc_error', key: 'err' },
						h('span', null, '读取失败：' + error),
						h('button', { className: 'dshc_btn', onClick: () => void load() }, '重试'),
					),
				);
			}

			if (!view && !error && loading) {
				children.push(h('div', { className: 'dshc_meta', key: 'loading' }, '读取中…'));
			}

			if (view) {
				children.push(
					h('div', { className: 'dshc_toolbar', key: 'bar' },
						h('div', { className: 'dshc_seg' },
							h('button', { 'data-active': mode === 'rendered', onClick: () => setMode('rendered') }, '装配全文（渲染）'),
							h('button', { 'data-active': mode === 'source', onClick: () => setMode('source') }, '分区源码'),
						),
						h('span', { className: 'dshc_meta' },
							'生成于 ' + fmtTime(view.generatedAt) + ' ｜ ' + (view.scopeLabel || '') + ' ｜ ' +
							(view.rendererAvailable
								? view.renderNote
									? '渲染器在线（容错模式）'
									: '渲染器在线'
								: '宿主渲染器不可用（已降级为原文）'),
						),
					),
				);
				if (mode === 'rendered') {
					if (view.rendered === null) {
						children.push(h('div', { className: 'dshc_note', key: 'rn' }, '未能渲染（宿主 renderPrompt 不可用）；请切到「分区源码」查看原文。'));
					} else {
						if (view.renderNote) {
							children.push(h('div', { className: 'dshc_note', key: 'rnote' }, '注意：' + view.renderNote));
						}
						children.push(h('pre', { className: 'dshc_pre', key: 'rp' }, view.rendered.length > 0 ? view.rendered : '（空）'));
					}
				} else {
					children.push(
						h('ul', { className: 'dshc_list', key: 'src' },
							view.sections.length === 0
								? h('li', { className: 'dshc_meta' }, '无分区')
								: view.sections.map((s, i) => h(SectionRow, { section: s, key: s.name + '#' + i })),
						),
					);
					const extra = [];
					if (view.contexts.length > 0) {
						extra.push('动态上下文：' + view.contexts.map((c) => c.name + '(' + c.chars + '字)').join('、'));
					}
					extra.push('工具 schema：' + view.tools.length + ' 个');
					if (view.variables.length > 0) extra.push('变量：' + view.variables.join('、'));
					children.push(h('div', { className: 'dshc_meta', key: 'sum' }, extra.join(' ｜ ')));
				}
			}

			if (ov) {
				children.push(
					h('div', { className: 'dshc_header dshc_h3', key: 'h2b' },
						h('h2', { className: 'dshc_title' }, '区二 · 深度自定义（接管官方提示词 · P2）'),
						h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
						h('button', {
							className: 'dshc_btn',
							'data-on': ov.enabled,
							onClick: () => void toggleOverride(),
						}, ov.enabled ? '接管：已启用（点击停用）' : '接管：已关闭（点击启用）'),
					),
					h('div', { className: 'dshc_note', key: 'n2' }, ov.enabled
						? '已接管：模型只看到下方文本（complete 独占——与其它 complete 类插件互斥；启用时已自动探测）。'
						: '接管后模型只看到下方文本（工具/上下文照常）。complete 独占：启用时自动探测互斥（检测到其它 complete 类接管会拒绝启用）。'),
					h('div', { className: 'dshc_toolbar', key: 'b2a' },
						h('button', { className: 'dshc_btn', onClick: () => setOvDraft(view && view.rendered ? view.rendered : ovDraft) }, '取材于当前装配'),
						h('button', { className: 'dshc_btn', onClick: () => void saveOverride(), disabled: ovSaving || ovDraft == null }, ovSaving ? '校验保存中…' : '保存（干跑校验＋快照）'),
						ovMsg ? h('span', { className: 'dshc_meta' }, ovMsg) : null,
					),
					h('textarea', {
						className: 'dshc_ta',
						key: 'ovta',
						style: { minHeight: 160 },
						value: ovDraft == null ? '' : ovDraft,
						placeholder: '接管文本（Markdown；可用已注册 {{变量}}；未知/畸形变量会被干跑校验阻止保存）',
						spellCheck: false,
						onChange: (e) => setOvDraft(e.target.value),
					}),
					h('div', { className: 'dshc_meta', key: 'bkh' }, '历史版本（存储快照；回滚前会自动对当前状态再快照，可逆）：'),
					bk && bk.length > 0
						? h('ul', { className: 'dshc_list', key: 'bklist' },
								bk.slice(0, 10).map((b0) =>
									h('li', { className: 'dshc_row', key: b0.name },
										h('div', { className: 'dshc_rowHead' },
											h('span', { className: 'dshc_name' }, b0.name),
											h('span', { className: 'dshc_chars' }, b0.files.join('、') + '｜接管文本' + (b0.hasOverride ? '✓' : '✗')),
											h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
											h('button', { className: 'dshc_btn', onClick: () => void restoreSnap(b0.name) }, '回滚'),
										),
									),
								),
							)
						: h('div', { className: 'dshc_meta', key: 'bknone' }, '（暂无快照）'),
					bkMsg ? h('div', { className: 'dshc_meta', key: 'bkm' }, bkMsg) : null,
				);
			}

			children.push(
				h('div', { className: 'dshc_header dshc_h3', key: 'h3' },
					h('h2', { className: 'dshc_title' }, '区三 · 纪律前置（P1）'),
					h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
					settings
						? h('button', {
								className: 'dshc_btn',
								'data-on': settings.enabled,
								onClick: () => void toggleInject(),
								key: 'tgl',
							}, settings.enabled ? '注入：已开启（点击关闭）' : '注入：已关闭（点击开启）')
						: null,
				),
				h('div', { className: 'dshc_note', key: 'n3' },
					settings && !settings.enabled
						? '注入已关闭：模型只看到纯宿主提示词。'
						: '纪律文本将作为 system 层前置段注入（order −2000，先于官方提示词）；空正文=不注入；改完下一条消息生效（热生效）。',
				),
				agents
					? h('div', { className: 'dshc_note', key: 'ag' }, agents.exists
							? '共存提示：检测到 $DSH_HOME/AGENTS.md（' + agents.bytes + ' 字节）——宿主原生通道；本插件不接管，仅信息提示。'
							: '共存提示：未检测到 $DSH_HOME/AGENTS.md。')
					: null,
				h('div', { className: 'dshc_meta', key: 'prevL' },
					'全局默认（无匹配工作区规则时生效）｜预览（保存后模型将看到的前 8 行）：',
					h('pre', { className: 'dshc_pre', key: 'prevP' }, String(draft || '').split('\n').slice(0, 8).join('\n') || '（空）'),
				),
				h('textarea', {
					className: 'dshc_ta',
					key: 'ta',
					value: draft == null ? '' : draft,
					placeholder: '纪律文本（Markdown；空=不注入）',
					spellCheck: false,
					onChange: (e) => setDraft(e.target.value),
				}),
				h('div', { className: 'dshc_toolbar', key: 'bar3' },
					h('button', { className: 'dshc_btn', onClick: () => void saveDisc(), disabled: saving || draft == null }, saving ? '保存中…' : '保存（快照＋落盘）'),
					saveMsg ? h('span', { className: 'dshc_meta' }, saveMsg) : null,
					h('span', { className: 'dshc_spacer', style: { flex: 1 } }),
					h('span', { className: 'dshc_meta' }, disc && disc.mtime ? '纪律档案 mtime ' + fmtTime(disc.mtime) : '纪律档案不存在'),
				),
			);

			if (scopeRules) {
				const MODE_LABEL = { exact: '完全一致', prefix: '前缀', contains: '包含', regex: '正则' };
				const ruleRows = scopeRules.map((r, i) =>
					h('div', { className: 'dshc_rule', key: 'sr' + String(i) },
						h('select', { className: 'dshc_in', value: r.mode, onChange: (e) => patchRule(i, { mode: e.target.value }) },
							['exact', 'prefix', 'contains', 'regex'].map((m) => h('option', { value: m, key: m }, MODE_LABEL[m])),
						),
						h('input', {
							className: 'dshc_in',
							style: { flex: 1 },
							value: r.path,
							placeholder: '工作区路径（如 D:\\proj）',
							spellCheck: false,
							onChange: (e) => patchRule(i, { path: e.target.value }),
						}),
						h('textarea', {
							className: 'dshc_ta',
							style: { flex: 1.2 },
							value: r.text,
							placeholder: '文本（空=该位置关闭）',
							spellCheck: false,
							onChange: (e) => patchRule(i, { text: e.target.value }),
						}),
						h('button', { className: 'dshc_btn', onClick: () => setScopeRules((prev) => prev.filter((_, j) => j !== i)) }, '删除'),
					),
				);
				children.push(
					h('div', { className: 'dshc_meta', key: 'scHead' }, '作用域覆盖（工作区规则；越具体越优先：完全一致＞前缀＞包含＞正则；空正文=该位置关闭）：'),
					...ruleRows,
					h('div', { className: 'dshc_toolbar', key: 'scBar' },
						h('button', { className: 'dshc_btn', onClick: () => setScopeRules((prev) => (prev || []).concat([{ path: '', mode: 'prefix', text: '' }])) }, '＋ 添加规则'),
						h('button', { className: 'dshc_btn', onClick: () => void saveScopeDraft(), disabled: scopeSaving }, scopeSaving ? '保存中…' : '保存规则（快照＋落盘）'),
						scopeMsg ? h('span', { className: 'dshc_meta' }, scopeMsg) : null,
					),
				);
			}

			if (status) {
				const rows = [
					['存储根', status.root],
					['护栏', '拦截 ' + status.guard.denied + ' 次 ｜ 只读触碰 ' + status.guard.touched + ' 次（本次会话）'],
					['文件', status.files.map((f) => f.name + (f.hash ? ' ✓' : ' ✗')).join(' ｜ ')],
					['会话外改动', status.externalChanges.length === 0 ? '无（自上次基线）' : status.externalChanges.map((c) => c.file + '→' + String(c.to).slice(0, 8)).join('、')],
					['说明', status.note],
				];
				children.push(
					h('div', { className: 'dshc_footer', key: 'foot' },
						h('dl', { className: 'dshc_kv' }, rows.map((r, i) => [h('dt', { key: 'k' + i }, r[0]), h('dd', { key: 'v' + i }, r[1])])),
					),
				);
			}

			return h('div', { className: 'dshc_page' }, children);
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
