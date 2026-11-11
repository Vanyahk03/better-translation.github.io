'use strict';

const quoteLibrary = window.GARDEN_QUOTES;
const quoteById = new Map(quoteLibrary.map(quote => [quote.id, quote]));
const rewardLabels = {water: '浇水', fertilize: '施肥', harvest: '收获'};
state.messages = Array.isArray(state.messages) ? state.messages.filter(item =>
  item && quoteById.has(item.quoteId) && rewardLabels[item.reason] && typeof item.receivedAt === 'string'
) : [];

const messagesView = document.createElement('section');
messagesView.id = 'messagesView';
messagesView.className = 'messages-view';
messagesView.hidden = true;
messagesView.innerHTML = `
  <div class="garden-welcome"><div class="eyebrow">WORDS TO GROW WITH</div>
    <h1>我的寄语✨</h1><p>每一次认真照料，都有一句话陪你成长。</p></div>
  <div class="panel"><div class="panel-header"><span>✨ 寄语收藏夹</span><span id="messageCount" class="badge"></span></div>
    <div class="panel-body"><p class="messages-hint">成功浇水、施肥或收获成熟植物，都会自动获得并收藏一条英文寄语。集齐前不重复；集齐后仍会随机赠送。</p>
    <label class="message-search">寻找一句话<input id="messageSearch" type="search" placeholder="搜索名言或作者…" maxlength="200"></label>
    <div id="messagesList" class="messages-list"></div>
    <p class="messages-hint">收藏仅保存在当前浏览器，清理网站数据后会丢失。名言署名沿用公开语录库，未经逐条原著核验，部分归属可能存在争议。</p></div></div>`;
document.querySelector('.app').append(messagesView);

const rewardDialog = document.createElement('dialog');
rewardDialog.className = 'quote-dialog';
rewardDialog.setAttribute('aria-labelledby', 'quoteRewardTitle');
rewardDialog.innerHTML = `<form method="dialog"><button class="quote-close" aria-label="关闭寄语弹窗">×</button>
  <div class="quote-flower" aria-hidden="true">🌷✨</div><h2 id="quoteRewardTitle">送你一句寄语</h2>
  <p id="quoteRewardReason" class="messages-hint"></p><blockquote id="quoteRewardText" lang="en"></blockquote>
  <p id="quoteRewardAuthor" class="quote-author"></p><p class="messages-hint">已自动存入「我的寄语✨」</p>
  <button class="btn-primary" value="close">收下这份温柔</button></form>`;
document.body.append(rewardDialog);

function quoteCard(quote, entries) {
  const card = document.createElement('article');
  card.className = 'message-card';
  const text = document.createElement('blockquote');
  text.lang = 'en'; text.textContent = quote.text;
  const author = document.createElement('p');
  author.className = 'quote-author'; author.textContent = '— ' + quote.author;
  const detail = document.createElement('p');
  detail.className = 'messages-hint';
  const recent = entries[entries.length - 1];
  const date = new Date(recent.receivedAt);
  detail.textContent = `${rewardLabels[recent.reason]}赠礼 · ${Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN')}` + (entries.length > 1 ? ` · 已获赠 ${entries.length} 次` : '');
  card.append(text, author, detail);
  return card;
}

function renderMessages() {
  const grouped = new Map();
  for (const entry of state.messages) {
    if (!grouped.has(entry.quoteId)) grouped.set(entry.quoteId, []);
    grouped.get(entry.quoteId).push(entry);
  }
  document.getElementById('messageCount').textContent = `${grouped.size} / ${quoteLibrary.length}`;
  const query = document.getElementById('messageSearch').value.trim().toLocaleLowerCase();
  const list = document.getElementById('messagesList');
  list.replaceChildren();
  for (const [quoteId, entries] of [...grouped].reverse()) {
    const quote = quoteById.get(quoteId);
    if ((quote.text + ' ' + quote.author).toLocaleLowerCase().includes(query)) list.append(quoteCard(quote, entries));
  }
  if (!list.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'messages-empty';
    empty.textContent = grouped.size ? '没有找到相符的寄语，换个关键词试试。' : '你的第一句寄语正在路上。去花园完成一次浇水、施肥或收获吧 🌱';
    list.append(empty);
  }
}

function rewardGardenQuote(reason) {
  if (!rewardLabels[reason]) return;
  const owned = new Set(state.messages.map(entry => entry.quoteId));
  const remaining = quoteLibrary.filter(quote => !owned.has(quote.id));
  const candidates = remaining.length ? remaining : quoteLibrary;
  const quote = candidates[Math.floor(Math.random() * candidates.length)];
  state.messages.push({quoteId: quote.id, reason, receivedAt: new Date().toISOString()});
  saveState(); renderMessages();
  document.getElementById('quoteRewardReason').textContent = `谢谢你的${rewardLabels[reason]}，这句话送给认真成长的你。`;
  document.getElementById('quoteRewardText').textContent = quote.text;
  document.getElementById('quoteRewardAuthor').textContent = '— ' + quote.author;
  if (!rewardDialog.open) rewardDialog.showModal();
}

let messagesReturnView = 'translation';
const messagesSwitch = document.getElementById('messagesSwitch');
function setMessagesView(show) {
  messagesView.hidden = !show;
  messagesSwitch.setAttribute('aria-expanded', String(show));
  messagesSwitch.textContent = show ? '返回上一页' : '我的寄语✨';
  const garden = show ? false : messagesReturnView === 'garden';
  document.querySelectorAll('.translation-view').forEach(element => { element.hidden = show || garden; });
  document.getElementById('gardenView').hidden = !garden;
  gardenSwitch.dataset.view = garden ? 'garden' : 'translation';
  document.getElementById('gardenSwitchLabel').textContent = garden ? '返回翻译' : '我的花园';
  gardenSwitch.setAttribute('aria-label', garden ? '返回翻译页面' : '打开我的花园');
  if (show) renderMessages();
  window.scrollTo({top: 0, behavior: 'smooth'});
}
messagesSwitch.addEventListener('click', () => {
  if (messagesView.hidden) {
    messagesReturnView = gardenSwitch.dataset.view || 'translation';
    setMessagesView(true);
  } else setMessagesView(false);
});
gardenSwitch.addEventListener('click', () => {
  if (!messagesView.hidden) {
    messagesView.hidden = true;
    messagesSwitch.textContent = '我的寄语✨';
    messagesSwitch.setAttribute('aria-expanded', 'false');
  }
});
document.getElementById('messageSearch').addEventListener('input', renderMessages);
renderMessages();
