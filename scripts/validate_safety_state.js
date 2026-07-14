const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const control = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "automation-control.json"), "utf8"));
const errors = [];

for (const key of [
  "socialPublishing",
  "facebookPublishing",
  "instagramPublishing",
  "xPublishing",
  "outreachEmailSending",
  "outreachSmtpTest"
]) {
  if (control[key] !== false) errors.push(`${key} must remain false`);
}

if (control.status !== "all_social_publishing_paused_by_operator_request") {
  errors.push("automation status must record the operator pause");
}

const projectStatus = fs.readFileSync(path.join(ROOT, "PROJECT_STATUS.md"), "utf8");
if (!/Facebook publishing: disabled/i.test(projectStatus)) {
  errors.push("PROJECT_STATUS.md must record Facebook publishing as disabled");
}

const ignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
for (const rule of [
  "data/1688_imports/",
  "data/product_drafts/",
  "data/product_publish/",
  "data/outreach_*.csv",
  "data/outreach_*.json",
  "data/outreach_*.txt"
]) {
  if (!ignore.includes(rule)) errors.push(`missing .gitignore rule: ${rule}`);
}

const result = {
  ok: errors.length === 0,
  checkedAt: new Date().toISOString(),
  publishing: {
    facebook: control.facebookPublishing,
    instagram: control.instagramPublishing,
    x: control.xPublishing,
    outreachEmail: control.outreachEmailSending
  },
  errors
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
