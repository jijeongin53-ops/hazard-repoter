'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import BottomSheet from '@/components/BottomSheet';
import { v4 as uuidv4 } from 'uuid';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function Home() {
  const [hazards, setHazards] = useState<any[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedHazardData, setSelectedHazardData] = useState<any | null>(null);

  // 구글 시트에서 위험 요소 데이터 가져오기
  const fetchHazards = async () => {
    try {
      const res = await fetch('/api/hazards');
      const data = await res.json();
      if (data && data.data) {
        setHazards(data.data);
      }
    } catch (error) {
      console.error('Error fetching hazards:', error);
    }
  };

  useEffect(() => {
    fetchHazards();
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setSelectedHazardData(null); // 다른 마커가 열려있다면 닫기
    setIsSheetOpen(true);
  };

  const handleReportSubmit = async (formData: any) => {
    const newReport = {
      report_id: uuidv4(),
      ...formData,
      reporter_id: formData.reporter_id || 'anonymous'
    };

    try {
      const res = await fetch('/api/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport),
      });

      if (res.ok) {
        setIsSheetOpen(false);
        alert('신고가 성공적으로 등록되었습니다.');
        fetchHazards(); // 데이터 갱신
      } else {
        alert('신고 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error reporting hazard:', error);
      alert('오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!selectedHazardData) return;
    const password = prompt('삭제하려면 비밀번호를 입력하세요. (관리자는 마스터 비밀번호)');
    if (!password) return;

    try {
      const res = await fetch('/api/hazards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: selectedHazardData.report_id, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('삭제되었습니다.');
        setSelectedHazardData(null);
        fetchHazards(); // 데이터 갱신
      } else {
        alert(data.error || '삭제 실패 (비밀번호 오류)');
      }
    } catch (error) {
      alert('오류가 발생했습니다.');
    }
  };

  return (
    <main style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <MapComponent 
        hazards={hazards} 
        onMapClick={handleMapClick} 
        onMarkerClick={(hazard) => {
          setIsSheetOpen(false); // 신고 창이 열려있다면 닫기
          setSelectedHazardData(hazard);
        }}
      />
      
      <BottomSheet 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
        lat={selectedLocation?.lat || null}
        lng={selectedLocation?.lng || null}
        onSubmit={handleReportSubmit}
      />

      {/* 상세 현황(조회) 모달 */}
      {selectedHazardData && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -4px 10px rgba(0,0,0,0.1)',
          padding: '24px',
          zIndex: 1000,
          animation: 'slideUp 0.3s ease-out',
          color: '#333',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>위험요소 현황</h2>
            <button onClick={() => setSelectedHazardData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}>
              ✕
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px' }}>
            {selectedHazardData.photo_url && (
              <img 
                src={
                  selectedHazardData.photo_url.includes('drive.google.com') 
                    ? selectedHazardData.photo_url.replace(/\/file\/d\/(.+?)\/(view|edit).*/, '/uc?export=view&id=$1')
                    : selectedHazardData.photo_url
                } 
                alt="현장 사진" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('/uc?export=view&id=')) {
                    // Fallback to thumbnail API if uc endpoint is blocked
                    target.src = target.src.replace('/uc?export=view&id=', '/thumbnail?sz=w800&id=');
                  }
                }}
                style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }} 
              />
            )}
            <p style={{ margin: 0 }}><strong>카테고리:</strong> {selectedHazardData.category}</p>
            <p style={{ margin: 0 }}><strong>위험도:</strong> {selectedHazardData.severity} / 5</p>
            <p style={{ margin: 0 }}><strong>상세 주소:</strong> {selectedHazardData.address || '주소 정보 없음'}</p>
            <p style={{ margin: 0 }}><strong>교통약자 통행:</strong> {selectedHazardData.is_barrier ? '❌ 불가' : '✅ 가능'}</p>
            <p style={{ margin: 0 }}><strong>신고자:</strong> {selectedHazardData.reporter_id}</p>
            <p style={{ margin: 0 }}><strong>신고일시:</strong> {new Date(selectedHazardData.created_at).toLocaleString()}</p>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleDelete} 
              style={{ backgroundColor: '#ff4d4f', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              삭제하기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
