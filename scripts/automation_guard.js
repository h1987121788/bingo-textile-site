const fs = require("fs");
const path = require("path");

const CONTROL_FILE = path.resolve(__dirname, "..", "config", "automation-control.json");

function loadAutomationControl() {
  if (!fs.existsSync(CONTROL_FILE)) {
    return {
      allowDryRunWhenPaused: true,
      socialPublishing: false,
      facebookPublishing: false,
      instagramPublishing: false,
      xPublishing: false,
      outreachEmailSending: false,
      outreachSmtpTest: false,
    };
  }
  return JSON.parse(fs.readFileSync(CONTROL_FILE, "utf8"));
}

function requireAutomationEnabled(keys, options = {}) {
  const requiredKeys = Array.isArray(keys) ? keys : [keys];
  const control = loadAutomationControl();

  if (options.dryRun && control.allowDryRunWhenPaused !== false) {
    return { ok: true, dryRun: true, control };
  }

  const disabled = requiredKeys.filter((key) => control[key] !== true);
  if (!disabled.length) return { ok: true, dryRun: false, control };

  const action = options.action || requiredKeys.join(", ");
  throw new Error(
    `Blocked by ${path.relative(process.cwd(), CONTROL_FILE)}: ${action} is disabled (${disabled.join(", ")}). ` +
      "Edit config/automation-control.json explicitly before running this action."
  );
}

module.exports = {
  CONTROL_FILE,
  loadAutomationControl,
  requireAutomationEnabled,
};
