// src/mystudio/studioAssets.ts

// 🚨 아이템의 규격을 강제하는 타입 인터페이스
export interface StudioAsset {
  id: string;
  name: string;
  category: 'instrument' | 'furniture' | 'etc' | string;
  price: number;
  description: string;
  icon: string;
  tag: string;
  obtain: ('shop' | 'gacha' | 'event' | 'combine')[]; // 획득처 분류 속성
  grade: 'common' | 'rare' | 'epic' | 'legendary' | 'special' | 'fail' | 'passive' | 'combine';
  combineReq?: number; // 합성에 필요한 수량 (선택적 속성)
  targetItem?: string; // 🚨 추가: 합성 시 지급될 결과물 아이템의 ID
}

// 🚨 통합 에셋 데이터베이스
export const STUDIO_ASSETS: StudioAsset[] = [

  { id: 'gacha_fail', name: '꽝', category: 'etc', price: 0, description: '다음 기회에', icon: '💥', tag: '', obtain: ['gacha'], grade: 'fail' },

  { id: 'paper001', name: '유통사 계약서 조각 1/10', category: 'etc', price: 0, description: '음원발매를 할 수 있는 유통사 계약서의 일부 조각', icon: '📜', tag: '', obtain: ['gacha'], grade: 'special',combineReq: 10, targetItem: 'ticket_release' },
  { id: 'paper002', name: '동네 스튜디오 쿠폰 1/15', category: 'etc', price: 0, description: '내가 만든 음악을 믹스 마스터 할 수 있는 쿠폰', icon: '🎫', tag: '', obtain: ['gacha'], grade: 'special',combineReq: 15, targetItem: 'ticket_mix' },

  { id: 'ticket_release', name: '유통사 계약서', category: 'etc', price: 0, description: '정식 음원 발매 대행을 신청할 수 있는 완성된 계약서입니다.', icon: '📝', tag: '', obtain: ['combine'], grade: 'combine' },
  { id: 'ticket_mix', name: '엔지니어링 티켓', category: 'etc', price: 0, description: '전문 믹싱/마스터링 작업을 신청할 수 있는 황금 티켓입니다.', icon: '🎟️', tag: '', obtain: ['combine'], grade: 'combine' },

  { id: 'lucky_pen', name: '행운의 비즈니스 펜', category: 'etc', price: 0, description: '가챠에서 스페셜 아이템이 나올 확률 +3%', icon: '🖋️', tag: '', obtain: ['gacha'], grade: 'passive' },
  { id: 'lucky_clover', name: '행운의 네잎클로버', category: 'etc', price: 0, description: '가챠에서 레전더리 아이템이 나올 확률 +3%', icon: '🍀', tag: '', obtain: ['gacha'], grade: 'passive' },
  { id: 'lucky_crystal', name: '행운의 수정구슬', category: 'etc', price: 0, description: '가챠에서 에픽 아이템이 나올 확률 +3%', icon: '🔮', tag: '', obtain: ['gacha'], grade: 'passive' },
  { id: 'membership_card', name: '미디랩 멤버십 카드', category: 'etc', price: 0, description: '가챠에서 소모되는 포인트 할인 10%', icon: '💳', tag: '', obtain: ['gacha'], grade: 'passive' },
  { id: 'ghost', name: '도박꾼의 영혼', category: 'etc', price: 0, description: '가챠에서 나온 보상을 두배로 받거나 다 잃거나', icon: '👻', tag: '', obtain: ['gacha'], grade: 'passive' },

  { id: 'trophy', name: '우승 트로피', category: 'etc', price: 0, description: '블라인드 배틀 우승 트로피', icon: '🏆', tag: '', obtain: ['event'], grade: 'special' },
  { id: 'desk001', name: '프로듀서 책상', category: 'furniture', price: 0, description: '집중력을 높여주는 묵직한 작업용 책상', icon: '🪑', tag: '', obtain: ['event'], grade: 'epic' },
  { id: 'desk002', name: '루키 프로듀서 책상', category: 'furniture', price: 0, description: '일반 작업용 책상', icon: '🪑', tag: '', obtain: ['event'], grade: 'common' },



  { id: 'figureaot001', name: '에렌 예거 피규어', category: 'furniture', price: 0, description: '진격의 거인 에렌 예거 피규어', icon: '🧍‍♂️', tag: '', obtain: ['gacha'], grade: 'legendary' },
  { id: 'piano002', name: '마블 그랜드 피아노', category: 'instrument', price: 0, description: '스튜디오의 중심을 잡아주는 최고급 피아노', icon: '🎹', tag: '', obtain: ['gacha'], grade: 'legendary' },
  { id: 'gibson002', name: '깁슨 1968 레스폴 커스텀 리이슈', category: 'instrument', price: 0, description: '봇치기타로 불리는 특유의 중후한 디자인과 밀도 높은 사운드를 자랑하는 최고급 일렉트릭 기타', icon: '🎸', tag: '', obtain: ['gacha'], grade: 'legendary' },
  { id: 'bass002', name: '펜더 커스텀샵 레릭 60 재즈베이스', category: 'instrument', price: 0, description: '1960년대 빈티지 재즈 베이스의 스펙과 사운드를 장인들의 수작업으로 재현한 악기\n세월의 흐름을 반영한 에이징 처리가 특징이며 빈티지한 어쿠스틱 톤을 제공', icon: '🎸', tag: '', obtain: ['gacha'], grade: 'legendary' },

  { id: 'piano001', name: '그랜드 피아노', category: 'instrument', price: 25, description: '검정색 그랜드 피아노', icon: '🎹', tag: '', obtain: ['shop', 'gacha'], grade: 'epic' },
  { id: 'fenderrhodes001', name: '펜더 로즈 피아노', category: 'instrument', price: 0, description: '로즈 일렉트릭 피아노', icon: '🎹', tag: '', obtain: ['gacha'], grade: 'epic' },
  { id: 'yamaha003', name: '야마하 DX-7', category: 'instrument', price: 0, description: '프리미엄 디지털 신디사이저', icon: '🎹', tag: '', obtain: ['gacha'], grade: 'epic' },
  { id: 'drum001', name: '어쿠스틱 드럼', category: 'instrument', price: 15, description: '강력한 타격감의 어쿠스틱 드럼 세트', icon: '🥁', tag: '', obtain: ['shop', 'gacha'], grade: 'epic' },
  { id: 'macbook', name: '맥북', category: 'instrument', price: 0, description: '스튜디오 작업에 최적화된 맥북', icon: '💻', tag: '', obtain: ['gacha'], grade: 'epic' },
  { id: 'armmonitor001', name: '암이 달린 모니터', category: 'instrument', price: 0, description: '스튜디오 작업에 최적화된 ARM 모니터', icon: '💻', tag: '', obtain: ['gacha'], grade: 'epic' },
  { id: 'armmonitor002', name: '암이 달린 모니터', category: 'instrument', price: 0, description: '스튜디오 작업에 최적화된 ARM 모니터', icon: '💻', tag: '', obtain: ['gacha'], grade: 'epic' },
  { id: 'aiapollo', name: 'UA Apollo Twin X', category: 'instrument', price: 0, description: '하이엔드 오디오 인터페이스', icon: '🎛️', tag: '', obtain: ['gacha'], grade: 'epic' },
  { id: 'fenderstrat001', name: '펜더 빈티지 스트랫', category: 'instrument', price: 10, description: '프리미엄 빈티지 일렉 기타', icon: '🎸', tag: '', obtain: ['shop', 'gacha'], grade: 'epic' },
  { id: 'acousticguitar001', name: '테일러 골드라벨 613e', category: 'instrument', price: 20, description: '현대적인 사양과 빈티지한 감성을 결합한 테일러의 프리미엄 어쿠스틱 기타', icon: '🎸', tag: '', obtain: ['gacha'], grade: 'epic' },
  { id: 'gibson001', name: '깁슨 es-335 스튜디오', category: 'instrument', price: 20, description: '프리미엄 세미할로우 일렉 기타', icon: '🎸', tag: '', obtain: ['shop', 'gacha'], grade: 'epic' },
  { id: 'gibson003', name: '깁슨 SG 스탠다드', category: 'instrument', price: 20, description: '프리미엄 일렉 기타', icon: '🎸', tag: '', obtain: ['shop', 'gacha'], grade: 'epic' },
  { id: 'prs001', name: 'PRS SE 마크홀콤 시그니처', category: 'instrument', price: 20, description: '마크홀콤 시그니처 프리미엄 일렉 기타', icon: '🎸', tag: '', obtain: ['shop', 'gacha'], grade: 'epic' },

  { id: 'sofa001', name: '가죽 소파', category: 'furniture', price: 10, description: '편안한 휴식을 제공하는 가죽 소파', icon: '🛋️', tag: '', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'sofa002', name: '소파', category: 'furniture', price: 10, description: '편안한 휴식을 제공하는 소파', icon: '🛋️', tag: '', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'plant001', name: '인테리어 식물', category: 'furniture', price: 0, description: '방에 생기를 더해주는 식물', icon: '🌿', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'plant002', name: '피쿠스 리라타', category: 'furniture', price: 0, description: '피쿠스 리라타(Ficus lyrata, 떡갈잎고무나무)는 큼직한 잎으로 실내 습도를 조절하고 포름알데히드 같은 유해 물질을 흡수해 공기정화 효과가 탁월', icon: '🌿', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'plant003', name: '몬스테라', category: 'furniture', price: 0, description: '몬스테라는 뛰어난 실내 습도 조절과 공기 정화 효과(포름알데히드, 벤젠 제거 및 미세먼지 흡착)를 제공', icon: '🌿', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'desk003', name: '프로듀서 책상', category: 'furniture', price: 0, description: '집중력을 높여주는 작업용 책상', icon: '🪑', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'monitor001', name: 'LG 모니터', category: 'furniture', price: 0, description: '일반 디스플레이 모니터', icon: '🖥️', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'light002', name: '스포트라이트 조명', category: 'furniture', price: 0, description: '밝은 스포트라이트 조명', icon: '🔦', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'piano003', name: '야마하 피아노', category: 'instrument', price: 10, description: '프리미엄 라이브러리 피아노', icon: '🎹', tag: '', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'yamaha001', name: '야마하 DGX 660', category: 'instrument', price: 10, description: '디지털 피아노', icon: '🎹', tag: '', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'epiphone001', name: '에피폰 카지노', category: 'instrument', price: 8, description: '양산형 세미할로우 일렉 기타', icon: '🎸', tag: '', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'bass001', name: '프레시전 베이스', category: 'instrument', price: 8, description: '양산형 프레시전 베이스', icon: '🎸', tag: '', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'ibanez001', name: '아이바네즈 잼', category: 'instrument', price: 8, description: '양산형 슈퍼스트랫 일렉기타', icon: '🎸', tag: '', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'yamaha002', name: '야마하 P 115', category: 'instrument', price: 6, description: '디지털 피아노', icon: '🎹', tag: '', obtain: ['shop'], grade: 'rare' },
  { id: 'pianochair002', name: '야마하 피아노 의자', category: 'furniture', price: 0, description: '높이조절 피아노 의자', icon: '🪑', tag: '', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'kamvas001', name: '휴이온 캄바스 태블릿', category: 'furniture', price: 0, description: '화면에 직접 그림을 그릴 수 있는 액정 타블렛', icon: '🖥️', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'tablet001', name: '태블릿', category: 'furniture', price: 0, description: '듀얼모니터로 사용가능한 태블릿', icon: '🖥️', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'macro001', name: '매크로 태블릿', category: 'furniture', price: 0, description: '버튼으로 복잡한 동작을 실행하는 매크로', icon: '🖥️', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'akai001', name: '아카이 미디믹스', category: 'furniture', price: 0, description: 'DAW를 직관적으로 제어할 수 있는 미디 컨트롤러', icon: '🎛️', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'esimoco', name: 'ESI Moco', category: 'furniture', price: 0, description: '오디오 인터페이스와 스피커 사이에 연결하여 사용하는 볼륨 컨트롤러', icon: '🎛️', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'gamepad', name: '게임패드', category: 'furniture', price: 0, description: '조이스틱 컨트롤러', icon: '🎮', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'camera', name: '카메라', category: 'furniture', price: 0, description: '디지털 카메라', icon: '📷', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'desk004', name: '화이트 데스크', category: 'furniture', price: 0, description: '화이트 데스크', icon: '🪑', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'presonusl', name: '프리소너스 에리스 3.5 L', category: 'instrument', price: 0, description: '모니터 스피커 왼쪽', icon: '🎚️', tag: '', obtain: ['gacha'], grade: 'rare' },
  { id: 'presonusr', name: '프리소너스 에리스 3.5 R', category: 'instrument', price: 0, description: '모니터 스피커 오른쪽', icon: '🎚️', tag: '', obtain: ['gacha'], grade: 'rare' },
  
  { id: 'acousticguitar002', name: '야마하 F 310', category: 'instrument', price: 4, description: '양산형 어쿠스틱 기타', icon: '🎸', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'keystand', name: '키보드 스탠드', category: 'instrument', price: 2, description: '키보드를 지지하는 스탠드', icon: '🎹', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'squier001', name: '스콰이어 스탠다드 스트랫', category: 'instrument', price: 4, description: '양산형 일렉트릭 기타', icon: '🎸', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'stool001', name: '작은 의자', category: 'furniture', price: 2, description: '작은 일반 의자', icon: '🪑', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'chair001', name: '의자', category: 'furniture', price: 2, description: '작은 일반 의자', icon: '🪑', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'rug001', name: '하얀 카페트', category: 'furniture', price: 4, description: '바닥에 까는 심플한 카페트', icon: ' ', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'lamp001', name: '스탠드 조명', category: 'furniture', price: 2, description: '스탠드 조명', icon: '💡', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'speakerstand001', name: '스피커 스탠드', category: 'furniture', price: 2, description: '스피커 스탠드', icon: '🎚️', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'pianochair001', name: '검정색 피아노 의자', category: 'furniture', price: 3, description: '검정색 피아노 의자', icon: '🪑', tag: '', obtain: ['shop'], grade: 'common' }
];