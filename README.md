# 樱花译园 · Sakura Translation Garden

中文版翻译练习网站，包含 36 类独立图标植物、重复收藏数量、生词本，以及 500 条英文寄语奖励。不含全收集演示按钮。

## 公开站点

前端通过 GitHub Pages 静态托管。AI 翻译检测与参考译文通过现有 Cloudflare Worker 调用 ChatAnywhere。密钥仅保存为 Worker 的 OPENAI_API_KEY 加密 Secret，禁止提交到仓库。

Worker 从本仓库 main 分支通过 npx wrangler deploy 部署，不再托管旧 public 目录。访问 Worker 根路径会跳转到 GitHub Pages。每段输入最多 4000 字，请求最多 40 KB，模型输出最多 4000 tokens，超时 85 秒。文本会交由 Cloudflare 与 ChatAnywhere 处理，勿提交敏感信息。

Cloudflare 限流绑定设置为每 IP 每分钟 3 次、服务每分钟 30 次。限流计数在 Cloudflare 地理位置内生效，并非全球精确计费上限；Origin 白名单不是身份认证。公开使用会消耗 API 额度，请在供应商侧设置预算并监控用量。后端缺少限流绑定时拒绝 AI 请求。

收藏与生词本保存在当前浏览器 localStorage，不跨设备同步，清理网站数据后会丢失。

## 语录数据

quotes.js 数据摘选自 https://github.com/dwyl/quotes ，沿用 GPL-2.0 许可，许可全文见 QUOTES-LICENSE.txt。作者署名未经逐条原著核验，商业使用前需核查署名及使用权。
