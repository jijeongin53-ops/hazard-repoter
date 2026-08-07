import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// .env.local 직접 파싱
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value.replace(/\\n/g, '\n');
  }
});

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: env.GOOGLE_CLIENT_EMAIL,
      private_key: env.GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = env.SPREADSHEET_ID;

  try {
    // 현재 스프레드시트 정보 가져오기
    const res = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = res.data.sheets.map(s => s.properties.title);

    const requests = [];

    if (!existingSheets.includes('Hazard')) {
      requests.push({
        addSheet: {
          properties: { title: 'Hazard' }
        }
      });
      console.log('Hazard 시트를 추가합니다.');
    }

    if (!existingSheets.includes('User')) {
      requests.push({
        addSheet: {
          properties: { title: 'User' }
        }
      });
      console.log('User 시트를 추가합니다.');
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests
        }
      });
      console.log('시트 생성이 완료되었습니다.');
    } else {
      console.log('시트가 이미 존재합니다.');
    }
  } catch (error) {
    console.error('에러 발생:', error.message);
  }
}

main();
