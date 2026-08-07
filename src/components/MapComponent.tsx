'use client';

import { Map, CustomOverlayMap, ZoomControl, MapTypeControl, useKakaoLoader } from 'react-kakao-maps-sdk';
import { useEffect, useState } from 'react';

const getMarkerColor = (category: string) => {
  switch (category) {
    case '보도블럭 파손': return '#FF3366'; // 쨍한 핑크
    case '도로 파임/포트홀': return '#00FFFF'; // 시안
    case '불법 주정차': return '#FF00FF'; // 마젠타
    case '쓰레기 무단투기': return '#39FF14'; // 형광 연두
    case '시설물 파손': return '#FF9900'; // 쨍한 오렌지
    case '배수구 막힘/악취': return '#0066FF'; // 쨍한 파랑
    default: return '#FF0000';
  }
};

// 위험도에 따른 원의 크기 계산 (기본 반경 * 위험도)
const getMarkerRadius = (severity: number) => {
  const baseRadius = 10;
  return baseRadius + (severity * 4); // 최소 14px ~ 최대 30px
};

export default function MapComponent({ hazards, onMapClick, onMarkerClick }: { hazards: any[], onMapClick: (lat: number, lng: number) => void, onMarkerClick?: (hazard: any) => void }) {
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [level, setLevel] = useState(1); // 카카오맵 최대 확대 레벨(1) 적용
  const [center, setCenter] = useState({ lat: 35.1580, lng: 129.0592 }); // 기본값: 부산진구 서면역

  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY as string,
    libraries: ['clusterer', 'services']
  });

  useEffect(() => {
    // 사용자의 현재 위치를 가져오는 로직 (추가 가능)
    if (navigator.geolocation && hazards.length === 0) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  }, [hazards.length]);

  useEffect(() => {
    if (map && hazards.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      let hasValidCoords = false;
      
      hazards.forEach((hazard) => {
        if (hazard.lat && hazard.lng) {
          bounds.extend(new kakao.maps.LatLng(hazard.lat, hazard.lng));
          hasValidCoords = true;
        }
      });
      
      if (hasValidCoords) {
        map.setBounds(bounds);
      }
    }
  }, [map, hazards]);

  if (loading) return <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>지도 로딩 중...</div>;
  if (error) return <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>지도 로딩 오류</div>;

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Map
        center={center}
        style={{ width: '100%', height: '100%' }}
        level={level}
        onCreate={setMap}
        onClick={(_t, mouseEvent) => {
          const latlng = mouseEvent.latLng;
          if (latlng) {
            onMapClick(latlng.getLat(), latlng.getLng());
          }
        }}
      >
        <MapTypeControl position={kakao.maps.ControlPosition.TOPRIGHT} />
        <ZoomControl position={kakao.maps.ControlPosition.RIGHT} />
        {hazards.map((hazard) => {
          const radius = getMarkerRadius(hazard.severity);
          const color = getMarkerColor(hazard.category);
          
          return (
            <CustomOverlayMap
              key={hazard.report_id}
              position={{ lat: hazard.lat, lng: hazard.lng }}
            >
              <div
                onClick={(e) => {
                  // 지도 클릭(새 신고) 이벤트 발생 방지
                  e.stopPropagation();
                  if (onMarkerClick) onMarkerClick(hazard);
                }}
                style={{
                  width: `${radius * 2}px`,
                  height: `${radius * 2}px`,
                  backgroundColor: color,
                  borderRadius: '50%',
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
                  border: '2px solid white',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                {hazard.is_barrier && <span style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '16px' }}>🚫</span>}
              </div>
            </CustomOverlayMap>
          );
        })}
      </Map>
    </div>
  );
}
