import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, SPREADSHEET_ID } from '@/lib/google-sheets';

const USER_SHEET_NAME = 'User';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A2:E`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: null });
    }

    const userRow = rows.find((row) => row[1] === email);
    if (!userRow) {
      return NextResponse.json({ data: null });
    }

    const user = {
      user_id: userRow[0],
      email: userRow[1],
      region: userRow[2],
      age: parseInt(userRow[3], 10),
      created_at: userRow[4],
    };

    return NextResponse.json({ data: user });
  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, email, region, age } = body;
    const created_at = new Date().toISOString();

    const sheets = await getGoogleSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [user_id, email, region, age, created_at],
        ],
      },
    });

    return NextResponse.json({ success: true, data: { user_id, email, region, age, created_at } });
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
