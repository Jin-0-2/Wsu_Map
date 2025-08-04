// 건물명 매핑 설정 파일
// 이 파일을 수정하여 건물명 매핑 규칙을 추가/수정할 수 있습니다.

const buildingMappings = {
  // 기본 매핑 (단순 변환)
  '우송도서관': 'W1',
  '학군단': 'W2-1',
  '산학협력관': 'W2',
  '유학생기숙사': 'W3',
  '철도물류관': 'W4',
  '보건의료과학관': 'W5',
  '우송교양관': 'W6',
  '우송관': 'W7',
  '우송유치원': 'W8',
  '정례원': 'W9',
  '사회복지융합관': 'W10',
  '체육관': 'W11',
  'SICA': 'W12',
  '우송타워': 'W13',
  'Culinary Center': 'W14',
  '식품건축관' : 'W15',
  '학생회관': 'W16',
  '미디어융합관': {
    type: 'conditional',
    rules: [
      // 동관 조건들
      { condition: (room) => room && room.startsWith('1') && room.length >= 3 && parseInt(room.charAt(2)) >= 5, result: 'W17-동관' },
      { condition: (room) => room && room.startsWith('2') && room.length >= 3 && parseInt(room.charAt(2)) >= 4, result: 'W17-동관' },
      { condition: (room) => room && room.startsWith('3') && room.length >= 3 && parseInt(room.charAt(2)) >= 4, result: 'W17-동관' },
      { condition: (room) => room && room.startsWith('4') && room.length >= 3 && parseInt(room.charAt(2)) >= 3, result: 'W17-동관' },
      { condition: (room) => room && room.startsWith('5') && room.length >= 3 && parseInt(room.charAt(2)) >= 2, result: 'W17-동관' },
      // 서관 조건들 (동관 조건이 아닌 모든 경우)
      { condition: (room) => room && room.startsWith('1') && room.length >= 3 && parseInt(room.charAt(2))  < 5, result: 'W17-서관' },
      { condition: (room) => room && room.startsWith('2') && room.length >= 3 && parseInt(room.charAt(2))  < 4, result: 'W17-서관' },
      { condition: (room) => room && room.startsWith('3') && room.length >= 3 && parseInt(room.charAt(2))  < 4, result: 'W17-서관' },
      { condition: (room) => room && room.startsWith('4') && room.length >= 3 && parseInt(room.charAt(2))  < 3, result: 'W17-서관' },
      { condition: (room) => room && room.startsWith('5') && room.length >= 3 && parseInt(room.charAt(2))  < 2, result: 'W17-서관' },
      // 기본값 (강의실 번호가 없거나 다른 경우)
      { condition: () => true, result: 'W17-서관' }
    ]
  },
  '우송예술회관': 'W18',
  'Endicott Building': 'W19',
};

module.exports = {
  buildingMappings,
}; 