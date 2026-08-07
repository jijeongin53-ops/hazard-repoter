import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, SPREADSHEET_ID } from '@/lib/google-sheets';
import { Readable } from 'stream';

const HAZARD_SHEET_NAME = 'Hazard'; // 시트 탭 이름

export async function GET() {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HAZARD_SHEET_NAME}!A2:K`, // A1:K1은 헤더라고 가정
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const data = rows.map((row) => ({
      report_id: row[0],
      reporter_id: row[1],
      lat: parseFloat(row[2]),
      lng: parseFloat(row[3]),
      category: row[4],
      severity: parseInt(row[5], 10),
      is_barrier: row[6] === 'TRUE',
      created_at: row[7],
      photo_url: row[8] || '',
      address: row[9] || '',
      reporter_contact: row[10] || '',
    }));

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('Error fetching hazards:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { report_id, reporter_id, reporter_contact, password, lat, lng, category, severity, is_barrier, photo, address } = body;
    const created_at = new Date().toISOString();

    let photo_url = '';

    if (photo && photo.startsWith('data:image')) {
      const matches = photo.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];

        try {
          const gasRes = await fetch(process.env.GAS_WEBAPP_URL!, {
            method: 'POST',
            body: JSON.stringify({
              mimeType: mimeType,
              base64: base64Data,
              filename: `hazard_${report_id}.jpg`
            })
          });
          const gasData = await gasRes.json();
          if (gasData.success) {
            photo_url = gasData.url;
          } else {
            console.error('GAS Upload Error:', gasData.error);
          }
        } catch (gasErr) {
          console.error('Error uploading to GAS:', gasErr);
        }
      }
    }

    const sheets = await getGoogleSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HAZARD_SHEET_NAME}!A:L`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [report_id, reporter_id, lat, lng, category, severity, is_barrier ? 'TRUE' : 'FALSE', created_at, photo_url, address || '', reporter_contact || '', password || ''],
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error creating hazard:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { report_id, password } = await request.json();

    const sheets = await getGoogleSheetsClient();
    
    // 1. 시트의 전체 데이터 읽어오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HAZARD_SHEET_NAME}!A:L`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 404 });
    }

    // 2. 해당 report_id가 있는 행 번호 찾기 (0-indexed)
    const rowIndex = rows.findIndex(row => row[0] === report_id);
    
    if (rowIndex === -1) {
      return NextResponse.json({ error: '해당 신고글을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 3. 비밀번호 확인
    const storedPassword = rows[rowIndex][11]; // L열
    const isAdmin = password === 'admin1234';

    if (!isAdmin && storedPassword !== password) {
      return NextResponse.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, { status: 403 });
    }

    // 4. 시트 ID(sheetId) 가져오기 (batchUpdate에 필요함)
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const targetSheet = sheetInfo.data.sheets?.find(s => s.properties?.title === HAZARD_SHEET_NAME);
    const sheetId = targetSheet?.properties?.sheetId || 0;

    // 5. 행 삭제 (deleteDimension)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              }
            }
          }
        ]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting hazard:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
