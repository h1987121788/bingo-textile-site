# Bingo Garments 成衣获客网站

这是 Bingo Garments / Bingo Textile 的成衣优先静态网站。主营页面展示 private-label streetwear 款式参考、打样与采购协调；针织面料页面作为 Material Library 保留。

## 文件

- `index.html`：成衣首页、开发流程、质量边界和询盘表单
- `garments.html`、`garment-data.js`、`garment-review-status.js`、`garments.js`：47 款成衣目录、公开核验门禁和询价状态
- `280gsm-cotton-oversized-t-shirt.html`：BG-GM-047 旗舰款详情、真人样衣图、尺码表、美元价格和印花询价入口
- `styles.css`：响应式视觉样式
- `script.js`：移动端菜单、产品筛选、CRM 线索载荷、WhatsApp 询盘和表单提示
- `assets/garments/`：真实成品样衣款式的标准化目录图和英文细节板；目录图不代表工厂归属或已验证库存
- `SOCIAL_AUTOMATION.md`：社媒内容与合规规则；所有真实发布目前关闭
- `scripts/facebook_publish.js`：Facebook Pages API 图片发布助手，会校验图片来源、授权状态、重复使用和公开联系方式格式
- `B2B_OUTREACH.md`：合规公开来源获客、客户数据表、QQ 邮箱开发信和人工审核发送流程
- `scripts/b2b_outreach.js`：B2B 潜客筛选、打分、开发信草稿、客户库写入和 QQ SMTP 发送助手
- `data/outreach_candidates.example.csv`、`data/outreach_leads.example.csv`：获客数据格式示例
- `data/outreach_keyword_bank.json`、`data/outreach_keywords.csv`：目标客户、成衣开发和辅助面料关键词规则
- `CRM_AND_TRACKING_SETUP.md`：GA4、Search Console、Meta Pixel 和 CRM webhook 留存的人工验证与配置步骤
- `config/marketing-config.js`：网站推广追踪和 CRM webhook 的前端配置文件
- `config/automation-control.json`：自动化总控开关；截至 2026-07-14，Facebook、Instagram、X 和真实开发信发送全部关闭
- `scripts/marketing-tracking.js`：GA4、Meta Pixel、表单线索、WhatsApp 点击和产品兴趣事件追踪
- `scripts/google_apps_script_lead_webhook.gs`：Google Sheet CRM 留存的 Apps Script 模板
- `scripts/weekly_conversion_report.js`：每周转化复盘脚本，汇总访问、表单、WhatsApp、Sheet、回复、样布和报价
- `PRODUCT_REVIEW.md`、`data/garment_review_status.json`：成衣核验状态和证据门禁，不保存私有供应商数据
- `npm run validate`：检查自动化总控、商品字段、审核台账、图片、页面引用和 sitemap
- `scripts/cleanup_outreach_leads.js`：潜客数据清洗脚本，会标记非目标市场/低质量对象并写入 suppression
- `PROJECT_STATUS.md`：本地 Git、远端 main、部署源头和自动化状态说明
- `assets/capability/SOURCES.md`：能力展示区授权图片来源记录

## 仓库治理

部署仓库只保留源码、页面、配置模板、必要图片、示例数据和关键词规则。`reports/`、`outputs/`、真实 `.env.*`、`node_modules/`、真实 `data/outreach_*` 运营数据不进入部署仓库。

## 事实边界

- 经营方已于 2026-07-16 确认原 46 款均对应真实成品样衣；公开图采用标准化目录呈现，规格、库存和商业条件仍需逐款核验。
- 经营方已于 2026-07-22 确认 BG-GM-047 为真人样衣旗舰款：100% cotton、280gsm、S-2XL、USD 6.00/件、运费另计，并可承接成衣印花订单。印花价格按图稿和数量另行确认。
- 未经供应商资料和实物样衣核验，不展示准确成分、克重、尺码、MOQ、库存、交期或确定价格。
- 只有审核台账中带日期和证据的 `verified` 商品才允许展示商业价格和技术细节；其他商品统一请求当前报价。
- 真实供应商映射、采购成本、样衣证据、客户名单、发送记录和服务端凭据只留在运营环境。静态站中的 CRM Web App 地址和浏览器提交参数是公开配置，不能当作秘密凭据。

打开 `index.html` 即可预览。
