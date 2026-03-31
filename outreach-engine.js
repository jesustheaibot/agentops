#!/usr/bin/env node

/**
 * Lead Outreach Engine
 * 
 * Finds local service businesses and delivers free leads
 * to demonstrate value before converting to paid.
 * 
 * Run: node outreach-engine.js "city" "service"
 * Example: node outreach-engine.js "Austin" "HVAC"
 */

require('dotenv').config();
const { execSync } = require('child_process');

const GOG_ENV = { ...process.env, GOG_KEYRING_PASSWORD: '' };
const CRM_ID = '14hxCTCq_WBIcClQRmweobPBwcYcYUJnTzu_9mMgFOqA';

function gog(args) {
  return execSync(`gog ${args} --account jesustheaibot@gmail.com --plain`, { 
    env: GOG_ENV, encoding: 'utf8' 
  });
}

function sheetsAppend(tabName, values) {
  const valsJson = JSON.stringify([values]);
  try {
    gog(`sheets append "${CRM_ID}" "${tabName}!A:A" --values-json '${valsJson}'`);
    return true;
  } catch (e) { 
    console.log(`[CRM] Error: ${e.message}`); 
    return false; 
  }
}

function sendEmail(to, subject, body) {
  try {
    const b = body.replace(/"/g, '\\"');
    gog(`gmail send --to "${to}" --subject "${subject}" --body "${b}"`);
    return true;
  } catch (e) { 
    console.log(`[Email] Error: ${e.message}`); 
    return false; 
  }
}

async function findLeads(city, service) {
  console.log(`[Engine] Finding ${service} businesses in ${city}...`);
  
  // Use web search to find local businesses
  const searchQuery = `${service} ${city} no online booking`;
  
  try {
    // This would use opencli-rs in production
    // For now, return mock data structure
    return [
      {
        business: 'Quick Fix Plumbing',
        contact: 'john@quickfixplumbing.com',
        phone: '512-555-0123',
        city: city,
        service: service,
        source: 'Local search',
        note: 'No intake form on website'
      }
    ];
  } catch (e) {
    console.log(`[Engine] Search error: ${e.message}`);
    return [];
  }
}

async function sendLeadToBusiness(lead) {
  const emailBody = `Hi ${lead.business},

We found someone in ${lead.city} who needs ${lead.service} service. 

Their info:
- Contact: ${lead.contact}
- Phone: ${lead.phone}

We're offering this as a free sample — no strings attached. We help ${lead.service} businesses like yours capture more leads and close more jobs.

If you'd like 5 more leads like this this month, we'd love to show you how it works.

Reply to this email and I'll send over the details.

Best,
Jesus`;

  const subject = `We found a ${lead.service} customer in ${lead.city} — free sample`;
  
  console.log(`[Engine] Sending lead to ${lead.business} <${lead.contact}>...`);
  return sendEmail(lead.contact, subject, emailBody);
}

async function addToCRM(lead, status) {
  const id = `LEAD-${Date.now()}`;
  const created = new Date().toISOString().split('T')[0];
  return sheetsAppend('Leads', [
    id, lead.business, lead.contact, '', lead.phone, lead.source,
    '', '', status, created, '', `Free lead delivered: ${lead.note}`
  ]);
}

async function run() {
  const city = process.argv[2] || 'Austin';
  const service = process.argv[3] || 'HVAC';
  
  console.log(`[Engine] Starting lead generation for ${city} ${service}...`);
  
  // Find potential customers
  const leads = await findLeads(city, service);
  
  if (!leads.length) {
    console.log('[Engine] No leads found. Try a different city/service.');
    return;
  }
  
  console.log(`[Engine] Found ${leads.length} potential businesses.`);
  
  for (const lead of leads) {
    // Send free lead
    const sent = await sendLeadToBusiness(lead);
    if (sent) {
      // Track in CRM
      await addToCRM(lead, 'Free Lead Sent');
      console.log(`[Engine] Lead delivered to ${lead.business}`);
    }
  }
  
  console.log('[Engine] Done. Check CRM for status.');
}

run().catch(console.error);
