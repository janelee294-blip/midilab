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

  { id: 'piano001', name: '그랜드 피아노', category: 'instrument', price: 500, description: '스튜디오의 중심을 잡아주는 최고급 피아노', icon: '🎹', tag: 'BEST', obtain: ['shop', 'gacha'], grade: 'legendary' },

  { id: 'drum001', name: '어쿠스틱 드럼', category: 'instrument', price: 300, description: '강력한 타격감의 어쿠스틱 드럼 세트', icon: '🥁', tag: 'HOT', obtain: ['shop'], grade: 'epic' },

  { id: 'sofa001', name: '인테리어 소파', category: 'furniture', price: 200, description: '편안한 휴식을 제공하는 가죽 소파', icon: '🛋️', tag: 'NEW', obtain: ['shop', 'gacha'], grade: 'rare' },
  { id: 'desk001', name: '프로듀서 책상', category: 'furniture', price: 150, description: '집중력을 높여주는 묵직한 작업용 책상', icon: '🪑', tag: '', obtain: ['shop'], grade: 'rare' },

  { id: 'Guitar001', name: '어쿠스틱 기타', category: 'instrument', price: 100, description: '어디서든 연주하기 좋은 통기타', icon: '🎸', tag: '', obtain: ['shop'], grade: 'common' },
  { id: 'Light001', name: '네온 조명', category: 'furniture', price: 80, description: '사이버펑크 감성의 벽걸이 조명', icon: '💡', tag: '', obtain: ['gacha'], grade: 'common' }
];