# B2B Lead Outreach Automation

这个模块用于每天半自动筛选街头服饰品牌客户，并为“成衣开发为主、针织面料配套”的 QQ 邮箱开发信生成审核报告。默认只生成候选名单和邮件草稿，不自动发送。

## 合规边界

- 不把 Facebook、Instagram、LinkedIn 账号当爬虫账号使用。
- 不自动登录、关注、评论、私信、抓取社媒帖子或个人资料。
- 只使用搜索 API、品牌官网、公开 contact / wholesale / press 页面、展会名单、买手店公开品牌列表等来源。
- 只收集公开商务信息，优先使用 `hello@`、`info@`、`sales@`、`wholesale@` 这类角色邮箱。
- 如果品牌负责人、创始人、owner、creative director、designer 在官网、公开 contact 页面或公开社媒主页明确留下个人邮箱，也可以记录和开发；不要猜邮箱、不要用泄露库、不要抓取非公开个人资料。
- 每天最多筛选 5 个开发信对象，默认人工确认后再发送。
- 真实 QQ SMTP 发信由 `config/automation-control.json` 总控，默认 `outreachEmailSending: false`，脚本会在代码层阻止误发。
- 对方回复 `no`、退订、投诉、不相关后，把邮箱或域名加入 `data/outreach_suppression.csv`。

## 配置

复制示例配置：

```bash
cp .env.outreach.local.example .env.outreach.local
```

填写：

```text
BRAVE_SEARCH_API_KEY=
OUTREACH_FROM_NAME=Jason Huang
OUTREACH_FROM_EMAIL=你的QQ邮箱
OUTREACH_REPLY_TO=你的QQ邮箱
OUTREACH_PHYSICAL_ADDRESS=Guangzhou, China
OUTREACH_DISABLE_PRODUCT_INTRO_ATTACHMENT=true
QQ_SMTP_USER=你的QQ邮箱
QQ_SMTP_AUTH_CODE=QQ邮箱SMTP授权码
```

QQ 邮箱要在网页版邮箱设置里开启 POP3/IMAP/SMTP，并使用授权码，不要填写 QQ 登录密码。

自动化总控：

```text
config/automation-control.json
```

默认允许候选客户发现和审核报告生成，但不允许真实发信或 SMTP 测试。需要恢复发信时，必须先由总控明确修改开关。

## 联系方式校验

开发信里的官网、WhatsApp、微信、电话、联系人、公司名和地址都必须来自：

```text
config/social-contact.json
```

干净部署仓库不包含已核验的产品介绍附件，当前 `config/social-contact.json` 也没有配置附件路径。因此草稿只引用网站成衣目录，不会写“已附产品介绍”。只有本地配置的文件真实存在时，脚本才允许正文出现附件说明。

默认保持：

```text
OUTREACH_DISABLE_PRODUCT_INTRO_ATTACHMENT=true
```

需要附件时，在本地 `.env.outreach.local` 设置 `OUTREACH_PRODUCT_INTRO_ATTACHMENT`，人工核对文件内容后再生成新草稿。附件和真实运营配置不提交到部署仓库。

每次生成开发信、SMTP 测试或正式发送前，先运行：

```bash
node scripts/validate_social_contacts.js
```

规则：

- 校验失败时不生成开发信，不测试 SMTP，不发送邮件。
- 不从历史报告、旧截图、旧环境变量或记忆里复用联系方式。
- `scripts/b2b_outreach.js` 已强制读取 `config/social-contact.json`，未确认或缺字段会直接失败。

## 开发信正文格式

开发信必须短段落排版，不要写成一整段直白推销。默认结构：

1. 称呼。
2. 一句话说明观察到的品牌、产品或近期 drop。
3. 一个具体成衣开发检查点，例如版型、领口、洗后尺寸、工艺位置或样衣批准标准。
4. 简短介绍 Bingo Textile：在广州协调 T 恤、卫衣、卫裤和针织套装的 private-label garment brief，面料采购作为开发配套。
5. 没有真实附件时给出网站成衣目录；只有已核验附件真实存在时才写附件说明。引导对方通过 WhatsApp 发送参考图片、链接或 tech pack。
6. 退订句：不相关可回复 `no`。
7. 最后单独显示联系方式，不夹在正文中间。

标准结尾：

```text
Best,
Jason Huang

Contact:
Jason Huang
Bingo Textile
Website: https://www.bingofabric.com/
WhatsApp: https://wa.me/8613827719946
WeChat: 13827719946
Phone: +86 13827719946
Email: 57317996@qq.com
Address: Zhujiang Textile City, Haizhu District, Guangzhou, Guangdong Province, China
```

脚本在生成草稿和正式发送前都会自动整理正文格式；即使用旧 JSON 报告发送，也会把联系方式移到最后的独立区块。

语气要求：

- 像 Jason 写给单个品牌的一封短邮件，不写夸张营销词。
- 开头必须提到一个具体品牌、产品、drop 或面料线索。
- 公司介绍保持 1-2 句，不堆砌能力清单。
- WhatsApp 引导要像自然请求，例如让对方发参考图片、成衣链接或 tech pack。
- 不要使用明显 AI 风格的长句，例如泛泛而谈的“赋能”“解决方案”“全方位服务”。
- 可以使用脚本内置的多个自然变体，但不能删除真实身份、退订句和最后联系方式。

## 每日审核模式

使用 Brave Search API 自动找候选客户：

```bash
node scripts/b2b_outreach.js --search --pool-size 30 --limit 5
```

或者先人工整理候选 CSV，再让系统打分和生成开发信：

```bash
node scripts/b2b_outreach.js --input data/outreach_candidates.example.csv --limit 5
```

脚本会生成：

- `reports/outreach-YYYY-MM-DD-HHMM.md`：中文审核报告
- `reports/outreach-YYYY-MM-DD-HHMM.json`：可编辑的发送数据
- `data/outreach_leads.csv`：长期客户数据表，每天自动抓取后会写入或更新

报告包含品牌名、国家/地区、官网、公开商务邮箱、产品类型、价格层级、最近新品/drop 线索、匹配理由、邮件标题和正文。

## 地区硬过滤

脚本已写死目标市场，生成报告和按旧报告发送时都会复检：

- 目标市场：美国/加拿大、欧洲、日本、韩国、新加坡，并保留澳洲/新西兰。
- 排除市场：印度和非洲市场。
- 国家/地区未知的客户默认不进入开发名单，需要人工确认后再单独补充。

报告顶部会显示地区过滤剔除数量；被剔除条目和原因会写进 `marketFilter.rejected`，用于复盘关键词。

## 客户数据表

长期客户库默认写入：

```text
data/outreach_leads.csv
```

这是一份 CSV 数据文档，可以用 Excel、Numbers 或 Google Sheets 打开。真实客户邮箱和跟进记录只保存在本机，不提交到代码仓库。

主要字段：

- `brandName`：品牌名
- `country`：国家/地区
- `website`：官网
- `instagramUrl` / `facebookUrl`：公开主页链接，只记录链接，不自动抓取社媒内容
- `businessEmail`：公开商务邮箱
- `contactName`：公开联系人姓名，优先记录 founder、owner、creative director、designer、production/sourcing lead
- `contactRole`：联系人角色
- `contactSource`：联系人来源链接
- `personalEmailAllowed`：个人式邮箱是否公开用于商务联系，`true` 代表可开发，空值代表需人工确认
- `productType`：匹配的产品类型
- `priceTier`：价格层级
- `recentSignal`：新品、drop、collection 线索
- `score`：潜客评分
- `firstFoundDate`：第一次被系统发现的日期
- `lastFoundDate`：最近一次被系统发现的日期
- `developmentDate`：进入开发名单的日期
- `approvalStatus`：`pending` 或 `approved`
- `status`：`pending_review`、`approved`、`sent`、`send_failed`、`do_not_contact`
- `emailSubject`：开发信标题
- `sentAt`：实际发送时间
- `firstOutreachDate` / `lastOutreachDate`：首次/最近开发日期
- `nextFollowUpDate`：建议下次跟进日期
- `lastReportJson` / `lastReportMarkdown`：对应的日报文件

同一个客户不会每天重复新增。脚本会按公开邮箱优先、官网域名其次、品牌名兜底来识别同一条客户记录；如果再次抓到同一品牌，只更新最近发现日期、评分、线索、报告路径等信息。

如果要换客户库位置：

```bash
node scripts/b2b_outreach.js --search --limit 5 --lead-db data/my_leads.csv
```

如果只想测试报告、不写客户库：

```bash
node scripts/b2b_outreach.js --input data/outreach_candidates.example.csv --limit 1 --no-lead-db --dry-run
```

## 人工确认后发送

在 JSON 报告中，把要发送客户的：

```json
"approvalStatus": "pending"
```

改成：

```json
"approvalStatus": "approved"
```

然后运行：

```bash
node scripts/b2b_outreach.js --from-report reports/outreach-YYYY-MM-DD-HHMM.json --send
```

正式发送不会自动假定存在附件。只有本地已配置、文件存在且人工复核过的附件才会发送；否则正文只给出网站成衣目录链接。

同一轮直接发送也支持，但只建议测试时使用：

```bash
node scripts/b2b_outreach.js --input data/outreach_candidates.example.csv --limit 1 --send --approve-send
```

如果 `.env.outreach.local` 里 `OUTREACH_DRY_RUN=true`，脚本不会真正发信。

## 退信自动清理

脚本默认会在正式发送后等待一小段时间，然后通过 QQ IMAP 检查最近退信邮件。

如果退信里识别到的邮箱存在于 `data/outreach_leads.csv`：

- 直接从 `data/outreach_leads.csv` 删除这个邮箱对应的客户记录
- 把邮箱写入 `data/outreach_suppression.csv`，防止下次又被抓回来
- 把退信时间和邮箱写入 `data/outreach_bounces.csv`，用于最低限度的发送质量追踪

手动检查最近 3 天退信：

```bash
node scripts/b2b_outreach.js --check-bounces --bounce-lookback-days 3
```

正式发送时如果不想自动检查退信，可以加：

```bash
node scripts/b2b_outreach.js --from-report reports/outreach-YYYY-MM-DD-HHMM.json --send --no-bounce-check
```

QQ IMAP 默认使用 `imap.qq.com:993`，优先读取 `QQ_IMAP_USER` / `QQ_IMAP_AUTH_CODE`，如果没有配置，则复用 `QQ_SMTP_USER` / `QQ_SMTP_AUTH_CODE`。

## 评分规则

总分 100：

- 目标地区：20 分
- 产品匹配：25 分，重点是重磅/宽松 T 恤、washed tee、hoodie、sweatshirt、sweatpants、套装、polo 和 rugby shirt
- 品牌价格层级：20 分
- 最近新品/drop：15 分
- 官网/商务邮箱：10 分
- 公开联系人质量：5 分，founder、owner、creative director、designer、production/sourcing lead 优先
- 看起来有打样、wholesale、sourcing、production 需求：8 分

## 关键词库

系统会默认读取：

```text
data/outreach_keyword_bank.json
```

这份 JSON 是提交到部署仓库的干净 seed 关键词库，来源是当前网站的成衣主业务：重磅/宽松 T 恤、washed tee、hoodie、sweatshirt、sweatpants、套装、polo、private label、tech pack 和 sample development。真实发送后的学习数据应写入本地 ignored 文件，例如 `data/outreach_keyword_bank.local.json`。

同时保存了一份表格版：

```text
data/outreach_keywords.csv
```

这份 CSV 是干净 seed 表，方便人工维护，可以用 Excel、Numbers 或 Google Sheets 打开。真实发送后的追加规则应写入本地 ignored 文件，例如 `data/outreach_keywords.local.csv`。主要分类：

- `product`：成衣产品关键词，例如 `heavyweight tee`、`vintage wash tee`、`oversized hoodie`、`jogger set`
- `garment`：开发模式关键词，例如 `private label garment`、`cut and sew`、`small batch clothing`
- `buyer`：潜在客户类型，例如 `streetwear brand`、`premium basics brand`、`independent clothing brand`
- `buyer` / `decision maker`：高价值联系人，例如 `brand founder`、`brand owner`、`creative director`、`fashion designer`
- `intent`：采购意图，例如 `garment development`、`private label`、`fit sample`、`tech pack`、`bulk order`
- `recent`：近期开发线索，例如 `latest drop`、`preorder`、`collection launch`
- `region`：日本、韩国等本地语言关键词
- `exclude`：排除词，例如 marketplace、招聘、教程类结果

首次做本地运营前，可以从 seed 初始化本地学习库：

```bash
cp data/outreach_keyword_bank.json data/outreach_keyword_bank.local.json
cp data/outreach_keywords.csv data/outreach_keywords.local.csv
```

自动搜索时，`--search` 会优先使用关键词库里的 `searchQueries`。如果要临时替换关键词库：

```bash
node scripts/b2b_outreach.js --search --keyword-bank data/outreach_keyword_bank.json --pool-size 30 --limit 5
```

如果要追加单条临时搜索，不影响关键词库：

```bash
node scripts/b2b_outreach.js --query "premium basics brand heavyweight tee contact" --limit 5
```

## 发送后复盘学习

正式发送开发信后，主脚本默认会自动运行发送后复盘，生成：

- `reports/outreach-YYYY-MM-DD-HHMM-learning.md`：本轮经验总结，适合直接查看
- `reports/outreach-YYYY-MM-DD-HHMM-learning.json`：机器可读学习数据

复盘会自动更新本地运营副本：

- `data/outreach_keyword_bank.local.json`：新增高命中搜索词、正向质量信号、负向排除规则、邮箱质量规则、QQ 发信上限经验
- `data/outreach_keywords.local.csv`：追加方便人工维护的关键词、排除词和质量信号

复盘重点看这些指标：

- `cleanRate`：清洗后还能保留多少候选客户，低于 70% 说明搜索词太宽或垃圾站太多
- `bounceRate`：已接受邮件里立刻退信的比例，高于 5% 要收紧邮箱验证
- `smtp550` / `first550AttemptNumber`：出现 550 后当天停止，不继续硬发
- `rejectedReasonCounts`：按 `email domain mismatch`、`bad host/brand`、`bad email pattern` 等原因优化下一轮过滤
- `productFocus` / `recentFocus`：沉淀真实高频产品词和活跃信号

如果是手工整理的一批报告，也可以单独运行复盘：

```bash
node scripts/outreach_postrun_learning.cjs \
  --summary reports/outreach-YYYY-MM-DD-HHMM.json \
  --cleaning reports/outreach-YYYY-MM-DD-HHMM-cleaning.json \
  --discovery reports/outreach-YYYY-MM-DD-HHMM-discovery.json
```

如果某次只是测试发送，不想更新关键词库：

```bash
node scripts/b2b_outreach.js --from-report reports/outreach-YYYY-MM-DD-HHMM.json --send --no-postrun-learning
```

当前 seed 固化的通用经验：

- 优先搜索 `Contact information`、`Email:`、`Powered by Shopify`、`streetwear`、`heavyweight tee`、`hoodie`、`new drop`
- 优先保留官网域名邮箱，公开 Gmail / Yahoo / Outlook 只有在官网页面明确出现时才保留
- 严格排除邮箱域名和官网不匹配、图片文件误识别邮箱、`privacy@` / `gdpr@` / `legal@` / `noreply@` / `shopify@`
- QQ 个人邮箱触发 550 前大约能接受 50 封，后续用 QQ 时建议每日硬上限 30-45 封，出现第一个 550 立即停止

## 搜索建议

默认搜索：

- `streetwear brand heavyweight hoodie contact`
- `independent streetwear brand wholesale contact`
- `cut and sew streetwear brand contact`
- `garment dyed tee brand contact`
- `heavyweight tee streetwear brand contact`
- `streetwear hoodie brand wholesale email`

可以追加自定义搜索：

```bash
node scripts/b2b_outreach.js --query "independent streetwear brand heavyweight tee wholesale" --limit 5
```

## 退订名单

创建 `data/outreach_suppression.csv`，每行放一个邮箱或域名：

```csv
no@example.com
examplebrand.com
```

脚本会在筛选和发送前跳过这些对象。

## 正式化建议

MVP 可以先用 QQ 邮箱每天 5 封。正式做欧美、日韩开发，建议改成域名邮箱，例如 `sales@bingofabric.com`，并配置 SPF、DKIM、DMARC，提高送达率和专业度。
