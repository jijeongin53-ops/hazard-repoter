'use client';

import { useState, useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number | null;
  lng: number | null;
  onSubmit: (data: any) => void;
}

const SEVERITY_DESC: Record<number, string> = {
  1: '약간 불편함 (통행 지장 없음)',
  2: '주의 필요 (피해서 가야 함)',
  3: '위험 (다칠 우려 있음)',
  4: '매우 위험 (즉시 조치 필요)',
  5: '치명적 위험 (통행 불가, 2차 사고 우려)'
};

export default function BottomSheet({ isOpen, onClose, lat, lng, onSubmit }: BottomSheetProps) {
  const [category, setCategory] = useState('보도블럭 파손');
  const [severity, setSeverity] = useState(1);
  const [isBarrier, setIsBarrier] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [address, setAddress] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && lat && lng && window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const addr = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
          setAddress(addr);
        }
      });
    }
  }, [isOpen, lat, lng]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let photoBase64 = null;
    if (photo) {
      const reader = new FileReader();
      photoBase64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target?.result);
        reader.readAsDataURL(photo);
      });
    }

    await onSubmit({ lat, lng, address, category, severity, is_barrier: isBarrier, photo: photoBase64, reporter_id: reporterName, reporter_contact: reporterContact, password });
    
    setIsSubmitting(false);
    setPhoto(null);
    setAddress('');
    setReporterName('');
    setReporterContact('');
    setPassword('');
  };

  return (
    <div
      style={{
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
        maxHeight: '90vh',
        overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>위험요소 신고</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}>
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>카테고리 (부산진구 기준)</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          >
            <option value="보도블럭 파손">🚶 보도블럭 파손</option>
            <option value="도로 파임/포트홀">🕳️ 도로 파임/포트홀</option>
            <option value="불법 주정차">🚗 불법 주정차 (보행방해)</option>
            <option value="쓰레기 무단투기">🗑️ 쓰레기 무단투기</option>
            <option value="시설물 파손">🚧 시설물 파손 (가로등, 벤치 등)</option>
            <option value="배수구 막힘/악취">🌧️ 배수구 막힘/악취</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            위험도 : {severity}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSeverity(level)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '8px',
                  border: severity === level ? '2px solid #0070f3' : '1px solid #ddd',
                  backgroundColor: severity === level ? '#e6f2ff' : '#fff',
                  color: severity === level ? '#0070f3' : '#333',
                  fontWeight: severity === level ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#666', textAlign: 'center', fontWeight: 'bold' }}>
            {SEVERITY_DESC[severity]}
          </p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>상세 주소 (위치)</label>
          <input 
            type="text" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="지도를 클릭하면 주소가 자동으로 입력됩니다."
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>신고자 이름 (선택)</label>
          <input 
            type="text" 
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="이름 또는 닉네임을 입력해 주세요."
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>신고자 연락처 (선택)</label>
          <input 
            type="tel" 
            value={reporterContact}
            onChange={(e) => setReporterContact(e.target.value)}
            placeholder="010-0000-0000"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>비밀번호 (필수, 수정/삭제용)</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="숫자 4자리 등"
            required
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox" 
            id="barrier" 
            checked={isBarrier} 
            onChange={(e) => setIsBarrier(e.target.checked)} 
            style={{ width: '20px', height: '20px' }}
          />
          <label htmlFor="barrier" style={{ fontWeight: 'bold' }}>교통약자 통행 불가</label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>현장 사진 (선택)</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            뒤로가기
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{
              flex: 2,
              backgroundColor: isSubmitting ? '#999' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {isSubmitting ? '업로드 및 등록 중...' : '등록하기'}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
