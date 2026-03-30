#!/usr/bin/env node

/**
 * Intake Trigger - New form response -> CRM entry + welcome email
 * Run: node intake-trigger.js
 */

require('dotenv').config();

const { execSync } = require('child_process');

const GOG_ENV = { ...process.env, GOG_KEYRING_PASSWORD: '' };
const CRM_ID = '14hxCTCq_WBIcClQRmweobPBwcYcYUJnTzu_9mMgFOqA';
const FORM_ID = '1V7RibEgv1snA77zJ6y5mmeeqB8sayQFcbd2tYnGXZ6Q';

function gog(args) {
  return execSync(`gog ${args} --account jesustheaibot@gmail.com --plain`, { 
    env: GOG_ENV,
    encoding: 'utf8' 
  });
}

function sheetAppend(tabName, values) {
  const range = `${tabName}!A:A`;
  const valsJson = JSON.stringify([values]);
  try {
    gog(`sheets append "${CRM_ID}" "${range}" --values-json '${valsJson}'`);
    return true;
  } catch (e) { 
    console.log(`[CRM] Append error: ${e.message}`); 
    return false; 
  }
}

function sendEmail(to, subject, body) {
  const b = body.replace(/"/g, '\\"');
  try {
    gog(`gmail send --to "${to}" --subject "${subject}" --body "${b}"`);
    return true;
  } catch (e) { 
    console.log(`[Email] Send error: ${e.message}`); 
    return false; 
  }
}

async function run() {
  console.log('[Intake] Checking form responses...');
  
  let responses;
  try {
    const raw = gog(`forms responses list ${FORM_ID} --json`);
    responses = JSON.parse(raw);
  } catch (e) {
    console.log('[Intake] No responses or parse error:', e.message);
    return;
  }

  if (!responses || !responses.length) {
    console.log('[Intake] No new responses.');
    return;
  }

  console.log(`[Intake] Found ${responses.length} response(s).`);

  for (const r of responses) {
    const vals = r.values || [];
    if (vals.length < 3) continue;

    const [timestamp, name, email, company, source, problem, budget] = vals;
    if (!email) continue;

    const id = `LEAD-${Date.now()}`;
    const created = new Date().toISOString().split('T')[0];
    const status = 'new';
    const notes = `Budget: ${budget || 'n/a'}. Problem: ${problem || 'n/a'}`;

    // Add to CRM Leads sheet
    const added = sheetAppend('Leads', [id, name, email, company, '', source, '', '', status, created, '', notes]);
    if (added) {
      console.log(`[CRM] Added: ${name} <${email}>`);

      // Send welcome email
      const welcomeBody = `Hi ${name},

Thanks for reaching out. We've received your inquiry and someone from our team will be in touch within 24 hours.

What happens next:
- We'll review your submission and reach out to schedule a call if there's a good fit
- If we're a match, you'll get a onboarding guide and we'll set up your first session

In the meantime, feel free to reply with any questions.

Best,
The Team`;

      sendEmail(email, 'Thanks for reaching out -- we received your submission', welcomeBody);
      console.log(`[Email] Welcome sent to ${email}`);

      // Log communication
      sheetAppend('Communication Log', [`LOG-${Date.now()}`, id, created, 'outbound', 'email', 'Welcome email', 'Sent']);
    }
  }

  console.log('[Intake] Done.');
}

run().catch(console.error);
