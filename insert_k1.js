require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: 'Hazard!K1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['reporter_contact']]
    }
  });
  console.log('K1 header successfully written!');
}

main().catch(console.error);
