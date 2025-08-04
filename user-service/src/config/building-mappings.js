// 건물명 매핑 설정 파일
// 이 파일을 수정하여 건물명 매핑 규칙을 추가/수정할 수 있습니다.

const buildingMappings = {
  // 기본 매핑 (단순 변환)
  '우송교양관': 'W6',
  '식품건축관': 'W8',
  '우송대학교': 'W1',
  '우송학관': 'W2',
  '우송관': 'W3',
  '우송정보관': 'W4',
  '우송도서관': 'W5',
  '우송체육관': 'W7',
  '우송실습관': 'W9',
  '우송연구관': 'W10',
  '우송창업관': 'W11',
  '우송국제관': 'W12',
  '우송미래관': 'W13',
  '우송혁신관': 'W14',
  '우송융합관': 'W16',
  '우송스마트관': 'W18',
  '우송디지털관': 'W19',
  
  // 복합 매핑 (강의실 번호에 따라 분기)
  '미디어융합관': {
    type: 'conditional',
    rules: [
      { condition: (room) => room && parseInt(room) >= 200, result: 'W17-서관' },
      { condition: (room) => room && parseInt(room) < 200, result: 'W17-동관' },
      { condition: () => true, result: 'W17-동관' } // 기본값
    ]
  },
  
  // 추가 건물들 (필요시 확장)
  'IT융합관': 'W15',
  '스마트IT관': 'W21',
  '보안전공관': 'W22',
  '바이오헬스관': 'W23',
  '식품과학관': 'W24',
  '건축공학관': 'W25',
  '경영학관': 'W26',
  '인문학관': 'W27',
  '사회과학관': 'W28',
  '자연과학관': 'W29',
  '공학관': 'W30'
};

// 새로운 건물명 매핑 추가 함수
const addBuildingMapping = (originalName, mappedName) => {
  buildingMappings[originalName] = mappedName;
  console.log(`건물명 매핑 추가: ${originalName} → ${mappedName}`);
};

// 조건부 건물명 매핑 추가 함수
const addConditionalBuildingMapping = (originalName, rules) => {
  buildingMappings[originalName] = {
    type: 'conditional',
    rules: rules
  };
  console.log(`조건부 건물명 매핑 추가: ${originalName}`);
};

// 건물명 매핑 제거 함수
const removeBuildingMapping = (originalName) => {
  if (buildingMappings[originalName]) {
    delete buildingMappings[originalName];
    console.log(`건물명 매핑 제거: ${originalName}`);
  }
};

// 현재 매핑 규칙 조회 함수
const getBuildingMappings = () => {
  return buildingMappings;
};

module.exports = {
  buildingMappings,
  addBuildingMapping,
  addConditionalBuildingMapping,
  removeBuildingMapping,
  getBuildingMappings
}; 