const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { isTestRecord, sumQuotedValue } = require("./weekly_conversion_report.js");

assert.strictEqual(isTestRecord({ is_test: "yes" }), true);
assert.strictEqual(isTestRecord({ is_test: "no" }), false);
assert.deepStrictEqual(sumQuotedValue([{ quoted_value: "$100" }, { quoted_value: "250" }]), { count: 2, sum: 350 });

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-weekly-report-"));
const csvPath = path.join(tempDir, "crm.csv");
const reportPath = path.join(tempDir, "report.md");
fs.writeFileSync(
  csvPath,
  [
    "receivedAt,is_test,lead_status,quoted_value,sample_requested,source_channel",
    "2026-07-14T03:00:00Z,no,quoted,100,yes,organic_search",
    "2026-07-14T04:00:00Z,yes,quoted,999,yes,test",
  ].join("\n") + "\n"
);

const result = spawnSync(
  process.execPath,
  [
    path.resolve(__dirname, "weekly_conversion_report.js"),
    "--week-start",
    "2026-07-14",
    "--week-end",
    "2026-07-14",
    "--crm-csv",
    csvPath,
    "--output",
    reportPath,
  ],
  { cwd: path.resolve(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(result.status, 0, result.stderr);
const report = fs.readFileSync(reportPath, "utf8");
assert.match(report, /\| Form submissions \| 1 \|/);
assert.match(report, /Test CRM rows excluded: 1/);
assert.match(report, /Quoted value sum: 100/);
assert.doesNotMatch(report, /Quoted value sum: 1099/);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, tests: 8 }, null, 2));
