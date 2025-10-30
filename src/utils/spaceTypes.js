// 공간 유형 정의
export const SPACE_TYPES = {
  // 업무 공간
  office: { name: '사무공간', color: '#3b82f6', category: 'office' },
  meeting: { name: '회의실', color: '#10b981', category: 'office' },
  storage: { name: '창고', color: '#8b5cf6', category: 'office' },
  
  // 주거 공간
  livingroom: { name: '거실', color: '#f59e0b', category: 'residential' },
  kitchen: { name: '주방', color: '#ef4444', category: 'residential' },
  bedroom: { name: '침실', color: '#06b6d4', category: 'residential' },
  dressroom: { name: '드레스룸', color: '#ec4899', category: 'residential' },
  bathroom: { name: '욕실', color: '#84cc16', category: 'residential' },
  
  // 공용 공간
  corridor: { name: '복도', color: '#6b7280', category: 'common' },
  rest: { name: '휴게실', color: '#a855f7', category: 'common' }
}

// 공간 유형 색상 가져오기
export const getColorForType = (type) => {
  return SPACE_TYPES[type]?.color || '#6b7280'
}

// 공간 유형 한글명 가져오기
export const getKoreanType = (type) => {
  return SPACE_TYPES[type]?.name || type
}

// 카테고리별 공간 유형 가져오기
export const getSpaceTypesByCategory = (category) => {
  return Object.entries(SPACE_TYPES)
    .filter(([_, value]) => value.category === category)
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
}

// 모든 공간 유형 키 배열
export const getAllSpaceTypeKeys = () => {
  return Object.keys(SPACE_TYPES)
}
