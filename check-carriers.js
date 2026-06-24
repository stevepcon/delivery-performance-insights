#!/usr/bin/env node
/**
 * Carrier Performance Alert checker.
 *
 * Mirrors the Make.com scenario structure:
 *   Iterator (loop over carriers)
 *     -> Router (branch by severity)
 *       -> Data Store check (dedup: has this alert already fired?)
 *         -> Action (create issue) OR (escalate existing issue)
 *
 * In this toy version, the "API" is a static JSON file (mock-data/shipments.json).
 * To make this real, replace the fs.readFileSync() call below with a fetch()
 * call to your actual carrier API (e.g. your Apps Script mock API endpoint).
 */

const { execSync } = require('child_process');
const fs = require('fs');

// --- 1. Load shipment data (swap this for a real fetch() in production) ---
const shipments = JSON.parse(fs.readFileSync('mock-data/shipments.json', 'utf8'));

// --- 2. Compute delay rate + severity per carrier ---
const SEVERITY_THRESHOLDS = {
  critical: 0.30, // 30%+ delayed shipments
  warning: 0.15,  // 15-30% delayed shipments
};

function getSeverity(delayRate) {
  if (delayRate >= SEVERITY_THRESHOLDS.critical) return 'critical';
  if (delayRate >= SEVERITY_THRESHOLDS.warning) return 'warning';
  return 'ok';
}

const alerts = shipments
  .map(c => {
    const delayRate = c.delayedShipments / c.totalShipments;
    return { ...c, delayRate, severity: getSeverity(delayRate) };
  })
  .filter(c => c.severity !== 'ok'); // this is the "Router" branch — only act on breaches

if (alerts.length === 0) {
  console.log('No carrier performance issues detected. Exiting.');
  process.exit(0);
}

// --- 3. For each alert: dedup against existing open issues, then create or escalate ---
for (const alert of alerts) {
  const label = `carrier:${alert.carrier.toLowerCase()}`;
  const title = `Carrier performance alert: ${alert.carrier}`;
  const pct = (alert.delayRate * 100).toFixed(1);

  // This gh issue search IS the dedup step — equivalent to your Make.com
  // Data Store lookup that checks "have we already alerted on this?"
  const existing = JSON.parse(
    execSync(`gh issue list --label "${label}" --state open --json number,title,labels`).toString()
  );

  if (existing.length === 0) {
    console.log(`Creating new issue for ${alert.carrier} (${alert.severity}, ${pct}% delayed)`);
    execSync(
      `gh issue create --title "${title}" --label "${label}" --label "severity:${alert.severity}" ` +
      `--body "Delay rate: ${pct}% (${alert.delayedShipments}/${alert.totalShipments} shipments). Severity: ${alert.severity}."`
    );
  } else {
    const issue = existing[0];
    const hasCriticalLabel = issue.labels.some(l => l.name === 'severity:critical');

    // Escalation logic: if it was a "warning" issue and conditions worsened to
    // "critical", upgrade the existing issue instead of creating a duplicate.
    if (alert.severity === 'critical' && !hasCriticalLabel) {
      console.log(`Escalating issue #${issue.number} for ${alert.carrier} to critical`);
      execSync(`gh issue edit ${issue.number} --add-label "severity:critical" --remove-label "severity:warning"`);
      execSync(`gh issue comment ${issue.number} --body "Escalation: delay rate has risen to ${pct}%. Severity is now CRITICAL."`);
    } else {
      console.log(`Issue #${issue.number} already open for ${alert.carrier} at ${alert.severity} — skipping duplicate.`);
    }
  }
}
