# 针织面料获客网站框架

这是一个可直接打开的静态网站框架，用于展示 Bingo Textile 的针织面料供应、开发打样和询盘转化能力。

## 文件

- `index.html`：页面结构、产品区块、生产能力、流程、询盘表单
- `styles.css`：响应式视觉样式
- `script.js`：移动端菜单、产品筛选、CRM 线索载荷、WhatsApp 询盘和表单提示
- `assets/knit-texture.png`：首屏面料纹理占位图，后续可替换为真实产品照片
- `SOCIAL_AUTOMATION.md`：Facebook 日更获客自动化规则、排程、合规边界和账号接入要求
- `scripts/facebook_publish.js`：Facebook Pages API 图片发布助手，会校验图片来源、授权状态、重复使用和公开联系方式格式
- `B2B_OUTREACH.md`：合规公开来源获客、客户数据表、QQ 邮箱开发信和人工审核发送流程
- `scripts/b2b_outreach.js`：B2B 潜客筛选、打分、开发信草稿、客户库写入和 QQ SMTP 发送助手
- `data/outreach_candidates.example.csv`、`data/outreach_leads.example.csv`：获客数据格式示例
- `data/outreach_keyword_bank.json`、`data/outreach_keywords.csv`：目标客户和面料关键词规则
- `CRM_AND_TRACKING_SETUP.md`：GA4、Search Console、Meta Pixel 和 CRM webhook 留存的人工验证与配置步骤
- `config/marketing-config.js`：网站推广追踪和 CRM webhook 的前端配置文件
- `config/automation-control.json`：自动化总控开关；截至 2026-06-28，Facebook Page 发布已按操作员要求启用，Instagram/X 和真实开发信发送仍关闭
- `scripts/marketing-tracking.js`：GA4、Meta Pixel、表单线索、WhatsApp 点击和产品兴趣事件追踪
- `scripts/google_apps_script_lead_webhook.gs`：Google Sheet CRM 留存的 Apps Script 模板
- `scripts/weekly_conversion_report.js`：每周转化复盘脚本，汇总访问、表单、WhatsApp、Sheet、回复、样布和报价
- `scripts/cleanup_outreach_leads.js`：潜客数据清洗脚本，会标记非目标市场/低质量对象并写入 suppression
- `PROJECT_STATUS.md`：本地 Git、远端 main、部署源头和自动化状态说明
- `assets/capability/SOURCES.md`：能力展示区授权图片来源记录

## 仓库治理

部署仓库只保留源码、页面、配置模板、必要图片、示例数据和关键词规则。`reports/`、`outputs/`、真实 `.env.*`、`node_modules/`、真实 `data/outreach_*` 运营数据不进入部署仓库。

## 后续建议补充

- 品牌名、公司简介、工厂/仓库/门店图片
- 产品系列：图片、成分、克重、门幅、颜色、MOQ、用途、库存状态
- 生产能力：设备、月产能、打样周期、大货周期、质检标准
- 经营信息：联系人、电话、微信、邮箱、WhatsApp、地址、营业时间
- 询盘表单：持续复盘 Google Sheet CRM 管道、样布请求、报价和成交/流失状态

打开 `index.html` 即可预览。
