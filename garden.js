'use strict';
// Render model output as text: source documents and model responses are untrusted.
function renderIssues(issues) {
  const list = document.getElementById('issuesList'); list.replaceChildren();
  for (const issue of issues) {
    const card = document.createElement('article'); card.className = 'issue-card' + (state.resolvedIssues.has(issue.id) ? ' resolved' : '');
    for (const [key, cls] of [['type','issue-type'],['desc','issue-desc'],['suggestion','issue-suggestion'],['example','issue-example-text']]) {
      const el = document.createElement('div'); el.className = cls; el.textContent = issue[key] || ''; card.append(el);
    }
    const btn = document.createElement('button'); btn.className = 'btn-resolve';
    btn.disabled = state.resolvedIssues.has(issue.id); btn.textContent = btn.disabled ? '✓ 已完成' : '✓ 标记已修改';
    btn.onclick = () => resolveIssue(issue.id, card); card.append(btn); list.append(card);
  }
}
const check = document.getElementById('checkBtn'), cancel = document.getElementById('cancelBtn');
const status = document.getElementById('requestStatus');
let activeRequest = null;
check.addEventListener('click', async () => {
  status.textContent = '公开预览版尚未接入 AI 后端，暂不能检测翻译；你的文本未发送。';
  return;
  if (activeRequest) return;
  const source = document.getElementById('sourceText').value.trim();
  const target = document.getElementById('targetText').value.trim();
  if (!source || !target) return showToast('请先填写原文和译文 🌷');
  if (source.length > 16000 || target.length > 16000) return showToast('每段请控制在 16000 字以内');
  const url = '/api/check';
  const controller = new AbortController(); activeRequest = controller;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 100000);
  check.disabled = true; referenceBtn.disabled = true; cancel.hidden = false; status.textContent = '🌱 正在认真阅读和润色，请稍候…';
  try {
    const response = await fetch(url, {method:'POST', signal:controller.signal, headers:{'Content-Type':'application/json'},body:JSON.stringify({source,target,tone:document.getElementById('toneSelect').value})});
    if (response.status === 404 || response.status === 501) throw Error('当前预览未连接检测后端，请使用 Python 服务启动项目');
    const data = await response.json().catch(() => { throw Error('服务返回了无效数据'); });
    if (!response.ok) throw Error(data.error || '检测失败，请稍后重试');
    if (typeof data.polished !== 'string' || !data.polished.trim() || typeof data.summary !== 'string' || !Array.isArray(data.issues) || data.issues.length > 30 || data.issues.some(i => !i || ['type','desc','suggestion','example'].some(k => typeof i[k] !== 'string'))) throw Error('服务返回的数据格式不完整，请重试');
    document.getElementById('reviewSource').textContent = source;
    document.getElementById('reviewTarget').textContent = target;
    document.getElementById('polishedText').textContent = data.polished;
    document.getElementById('reviewSummary').textContent = data.summary;
    document.getElementById('reviewResult').hidden = false;
    state.resolvedIssues.clear(); currentIssues = data.issues.map((issue, i) => ({...issue,id:Date.now()+'-'+i}));
    renderIssues(currentIssues); updateScoreBar();
    status.textContent = '🌸 本次检测完成。修改译文后可以继续检测。';
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? (timedOut ? '等待超时，可以重新检测。' : '已取消，可以重新检测。') : '暂时未完成：'+error.message+'。可以重试；上次成功结果仍保留。';
  } finally {
    clearTimeout(timeout); activeRequest = null; check.disabled = false; referenceBtn.disabled = false; cancel.hidden = true;
  }
});
cancel.onclick = () => activeRequest?.abort();
const referenceBtn = document.getElementById('referenceBtn');
document.getElementById('audienceInput').maxLength = 120;
document.getElementById('goalInput').maxLength = 200;
referenceBtn.addEventListener('click', async () => {
  status.textContent = '公开预览版尚未接入 AI 后端，暂不能生成参考译文；你的文本未发送。';
  return;
  if (activeRequest) return;
  const sourceBox = document.getElementById('sourceText');
  const selectedSource = sourceBox.value.slice(sourceBox.selectionStart, sourceBox.selectionEnd).trim();
  const source = selectedSource || sourceBox.value.trim();
  if (!source) return showToast('请先填写原文 🌷');
  if (source.length > 16000) return showToast('原文请控制在 16000 字以内');
  const controller = new AbortController(); activeRequest = controller;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 100000);
  referenceBtn.disabled = true; check.disabled = true; cancel.hidden = false;
  status.textContent = '🌷 正在生成参考翻译样例…';
  try {
    const response = await fetch('/api/reference', {method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({source,target_hint:document.getElementById('targetText').value.trim().slice(0,500),tone:document.getElementById('toneSelect').value,audience:document.getElementById('audienceInput').value.trim(),goal:document.getElementById('goalInput').value.trim()})});
    if (response.status === 404 || response.status === 501) throw Error('当前服务不支持参考译文，请使用 Python 服务启动项目');
    const data = await response.json().catch(() => { throw Error('服务返回了无效数据'); });
    if (!response.ok) throw Error(data.error || '暂时无法生成参考译文');
    if (typeof data.translation !== 'string' || !data.translation.trim()) throw Error('参考译文格式不完整');
    document.getElementById('referenceText').textContent = data.translation;
    document.getElementById('referenceExplanation').textContent = data.explanation || '';
    document.getElementById('referenceMode').textContent = data.mode === 'model' ? '模型参考' : '规则提示 · ' + (data.status || '网关暂不可用');
    document.getElementById('referenceMetrics').textContent = JSON.stringify(data.metrics || {}, null, 2);
    document.getElementById('referenceResult').hidden = false;
    status.textContent = data.mode === 'model' ? '🌸 参考翻译样例已生成。它是学习参考，不是唯一答案。' : '网关暂不可用，已显示规则提示。';
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? (timedOut ? '等待超时，可以重新生成。' : '已取消，可以重新生成。') : '暂时未完成：' + error.message + '。';
  } finally { clearTimeout(timeout); activeRequest = null; referenceBtn.disabled = false; check.disabled = false; cancel.hidden = true; }
});
document.getElementById('copyReference').onclick = () => {
  const text = document.getElementById('referenceText').textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('已复制参考译文 🌷')).catch(() => fallbackCopy(text)); else fallbackCopy(text);
};
document.getElementById('copyPolished').onclick = () => {
  const text = document.getElementById('polishedText').textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('已复制 🌷')).catch(() => fallbackCopy(text)); else fallbackCopy(text);
};
const gardenSwitch = document.getElementById('gardenSwitch');
gardenSwitch.addEventListener('click', () => {
  const showingGarden = gardenSwitch.dataset.view !== 'garden';
  document.querySelectorAll('.translation-view').forEach(el => { el.hidden = showingGarden; });
  document.getElementById('gardenView').hidden = !showingGarden;
  gardenSwitch.dataset.view = showingGarden ? 'garden' : 'translation';
  document.getElementById('gardenSwitchLabel').textContent = showingGarden ? '返回翻译' : '我的花园';
  gardenSwitch.setAttribute('aria-label', showingGarden ? '返回翻译页面' : '打开我的花园');
  window.scrollTo({top:0,behavior:'smooth'});
});
// Selection uses textarea offsets; clicking a popup must not lose the captured phrase.
const popup = document.getElementById('hlPopup'); popup.replaceChildren();
const addSelection = document.createElement('button'); addSelection.textContent = '✿ 加入生词本'; popup.append(addSelection);
let selectedPhrase = '';
function selectedText(event) {
  const el = event.target;
  if (el.matches?.('.editor-textarea')) return el.value.slice(el.selectionStart,el.selectionEnd).trim();
  const selection = window.getSelection();
  if (!selection?.rangeCount) return '';
  const node = selection.anchorNode?.parentElement;
  if (!node?.closest('#reviewResult, #issuesList')) return '';
  return selection.toString().trim();
}
function savePhrase(text) {
  if (!text) return;
  if (text.length > 200) return showToast('请选择 200 字以内的词汇或短语');
  if (state.vocabulary.some(v => v.word.toLocaleLowerCase() === text.toLocaleLowerCase())) return showToast('这个词已经在生词本里啦');
  state.vocabulary.push({word:text,added:new Date().toISOString()}); renderVocabulary(); saveState(); showToast('已加入生词本 🌼'); popup.classList.remove('visible');
}
addSelection.addEventListener('mousedown', e => e.preventDefault());
addSelection.onclick = () => savePhrase(selectedPhrase);
document.addEventListener('contextmenu', e => {
  const text = selectedText(e); if (!text) return;
  e.preventDefault(); selectedPhrase = text;
  popup.style.left = Math.max(8,Math.min(e.clientX,innerWidth-190))+'px';
  popup.style.top = Math.max(8,Math.min(e.clientY,innerHeight-60))+'px'; popup.classList.add('visible');
});
document.addEventListener('mouseup', e => { if (e.shiftKey) { selectedPhrase = selectedText(e); savePhrase(selectedPhrase); } });
document.addEventListener('keyup', e => {
  if (e.key === 'Escape') popup.classList.remove('visible');
  if (e.key === 'Shift') { selectedPhrase = selectedText(e); savePhrase(selectedPhrase); }
});
// Disable the original decorative color picker handlers.
document.querySelectorAll('.editor-textarea').forEach(el => {el.removeEventListener('mouseup',handleSelection);el.removeEventListener('keyup',handleSelection);});
