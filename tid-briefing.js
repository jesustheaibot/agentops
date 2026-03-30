#!/usr/bin/env node

/**
 * TID - Tactical Intelligence Dashboard
 * Daily briefing script (v2 - calendar + tasks + form responses only)
 * 
 * Run: node tid-briefing.js
 */

require('dotenv').config();

const { execSync } = require('child_process');

const GOG_ENV = { ...process.env, GOG_KEYRING_PASSWORD: '' };

function gog(args) {
  return execSync(`gog ${args} --account jesustheaibot@gmail.com --plain`, { 
    env: GOG_ENV,
    encoding: 'utf8' 
  });
}

async function run() {
  console.log('[TID] Starting briefing...');
  
  const today = new Date().toISOString().split('T')[0];
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // 1. Calendar
  console.log('[TID] Fetching calendar...');
  let calendar = 'No events today.';
  try {
    const calData = gog(`calendar events primary --from ${today} --to ${today}`);
    if (calData.trim()) calendar = calData.trim();
  } catch (e) { console.log('[TID] Calendar error:', e.message); }

  // 2. Tasks
  console.log('[TID] Fetching tasks...');
  let tasks = 'No tasks.';
  try {
    const taskData = gog('tasks lists');
    const lines = taskData.trim().split('\n');
    if (lines.length >= 2) {
      const cols = lines[1].split('\t');
      if (cols.length >= 1) {
        const listId = cols[0].trim();
        const taskList = gog(`tasks list "${listId}"`);
        if (taskList.trim()) tasks = taskList.trim();
      }
    }
  } catch (e) { console.log('[TID] Tasks error:', e.message); }

  // 3. Form responses (new leads from intake form)
  console.log('[TID] Fetching form responses...');
  let forms = 'No new form responses.';
  try {
    const FORM_ID = '1V7RibEgv1snA77zJ6y5mmeeqB8sayQFcbd2tYnGXZ6Q';
    const formData = gog(`forms responses ${FORM_ID}`);
    if (formData.trim() && !formData.includes('no responses')) {
      forms = formData.trim();
    }
  } catch (e) { console.log('[TID] Forms error:', e.message); }

  // 4. Build briefing
  const briefing = `## Your Daily Briefing -- ${dateStr}

---

### Calendar Today
${calendar}

---

### Tasks
${tasks}

---

### New Inquiries
${forms}

---

TID -- Your morning briefing, automated.
`;

  // 5. Send email
  console.log('[TID] Sending...');
  try {
    const emailBody = briefing.replace(/"/g, '\\"');
    const subject = `Your TID Briefing -- ${new Date().toLocaleDateString()}`;
    gog(`gmail send --to jesustheaibot@gmail.com --subject "${subject}" --body "${emailBody}"`);
    console.log('[TID] Done.');
  } catch (e) { console.log('[TID] Send error:', e.message); }
}

run().catch(console.error);
