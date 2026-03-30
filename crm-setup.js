#!/usr/bin/env node

/**
 * CRM Setup - Create a new client CRM sheet
 * Run: node crm-setup.js "Client Name" "client@email.com"
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

async function setupClientCRM(clientName, clientEmail) {
  console.log(`[CRM] Setting up CRM for ${clientName} <${clientEmail}>`);
  
  // Create spreadsheet
  const sheetName = `CRM - ${clientName}`;
  const createOut = gog(`sheets create "${sheetName}"`);
  const match = createOut.match(/ID:\s*([^\s]+)/);
  if (!match) { console.log('[CRM] Failed to create sheet'); return; }
  const sheetId = match[1];
  console.log(`[CRM] Created: ${sheetId}`);

  // Add tabs
  gog(`sheets add-tab "${sheetId}" "Leads"`);
  gog(`sheets add-tab "${sheetId}" "Pipeline"`);
  gog(`sheets add-tab "${sheetId}" "Communications"`);

  // Set headers
  gog(`sheets update "${sheetId}" "Leads!A1:L1" --values-json '[["Name","Email","Company","Source","Status","Priority","Last Contact","Notes","Created","Value","Tags"]]'`);
  gog(`sheets update "${sheetId}" "Pipeline!A1:F1" --values-json '[["Stage","Count","Avg Value","Total Value","Win Rate","Avg Days"]]'`);
  gog(`sheets update "${sheetId}" "Communications!A1:E1" --values-json '[["Date","Lead","Type","Subject","Outcome"]]'`);
  
  // Set pipeline default rows
  const stages = ['New Inquiry','Qualified','Proposal Sent','Negotiating','Won','Lost'];
  for (let i = 0; i < stages.length; i++) {
    const row = i + 2;
    gog(`sheets update "${sheetId}" "Pipeline!A${row}:A${row}" --values-json '[["${stages[i]}"]]'`);
  }

  // Share with client
  try {
    gog(`drive share "${sheetId}" --email "${clientEmail}" --role writer --to user`);
    console.log(`[CRM] Shared with ${clientEmail}`);
  } catch (e) {
    console.log(`[CRM] Share warning: ${e.message}`);
  }

  console.log(`[CRM] Done. Sheet: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
  return sheetId;
}

const name = process.argv[2] || 'Test Client';
const email = process.argv[3] || 'jesustheaibot@gmail.com';
setupClientCRM(name, email).catch(console.error);
