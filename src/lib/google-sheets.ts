import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive' // 구글 드라이브 업로드 권한
  ],
});

export async function getGoogleSheetsClient() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client as any });
}

export async function getGoogleDriveClient() {
  const client = await auth.getClient();
  return google.drive({ version: 'v3', auth: client as any });
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
