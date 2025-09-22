// src/modules/timetable/service.js

const con = require("../../core/db")
const XLSX = require('xlsx');
const { buildingMappings } = require('../../config/building-mappings');

exports.getAll = async (id) => {

  const select_query = `
  SELECT * FROM "timetable" where "user_id" = $1
    `

  const values = [id]

  try {
    const result = await con.query(select_query, values);
    return result;
  } catch (err) {
    throw err;
  }
}

// 시간표 추가
exports.add = async (id, title, day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo) => {
  const query = `
      INSERT INTO "timetable" (
      "user_id", "title", "day_of_week", "start_time", "end_time",
      "building_name", "floor_number", "room_name", "professor",
      "color", "memo"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `
  const values = [id, title, day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo === undefined ? null : memo]

  try {
    const result = await con.query(query, values);
    return result;
  } catch (err) {
    throw err;
  }
}

// 시간표 수정
exports.update = async (id, origin_title, origin_day_of_week, new_title, new_day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo) => {
  // 쿼리 완성
  const query = `
    UPDATE "timetable" SET "title" = $1, "day_of_week" = $2, "start_time" = $3, "end_time" = $4, "building_name" = $5, "floor_number" = $6, "room_name" = $7, "professor" = $8, "color" = $9, "memo" = $10
    WHERE "user_id" = $11 AND "title" = $12 AND "day_of_week" = $13
  `;

  const values = [new_title, new_day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo, id, origin_title, origin_day_of_week]

  try {
    const result = await con.query(query, values);
    return result;
  } catch (err) {
    throw err;
  }
}

// 시간표 삭제
exports.delete = async(id, title, day_of_week) => {
  const query = `
  DELETE FROM "timetable" WHERE "user_id" = $1 AND "title" = $2 AND "day_of_week" = $3;
  `

  const values = [id, title, day_of_week]

  try {
    const result = await con.query(query, values);
    return result;
  } catch (err) {
    throw err;
  }
}

// 시간표 전체 삭제
exports.deleteAll = async (id) => { 
  const query = `
  DELETE FROM "timetable" WHERE "user_id" = $1;
  `
  const values = [id]

  try {
    const result = await con.query(query, values);
    return result;
  } catch (err) {
    throw err;
  }
}
// 엑셀 파일 파싱 (우송대학교 수강내역 형식)
exports.parseExcelFile = async (buffer) => {
  try {
    // 엑셀 파일 읽기
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // 첫 번째 시트 사용
    const worksheet = workbook.Sheets[sheetName];
    
    // JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('엑셀 데이터 파싱 결과:', jsonData);
    
    // 5번째 행부터 실제 데이터 시작 (0-based index로 4)
    const dataRows = jsonData.slice(4);

    // 데이터 확인
    console.log('dataRows:', dataRows);
  
    
    // 시간표 데이터 추출 및 정제
    const timetableData = [];
    
    dataRows.forEach(row => {
      if (row.length > 0 && row.some(cell => cell !== null && cell !== undefined)) {
        // 우송대 수강내역 엑셀 구조에 맞게 매핑
        const courseName = row[7] || ''; // 과목명 (5번째 컬럼)
        const professorRaw = row[10] || ''; // 강의교수 (8번째 컬럼)
        const timetableInfo = row[15] || ''; // 시간표 (9번째 컬럼)
        let count = 1;

        console.log('--------------------------------');
        console.log('row:', count++);
        console.log('courseName:', courseName);
        console.log('professorRaw:', professorRaw);
        console.log('timetableInfo:', timetableInfo);

        
        // 강의교수 중복 제거 및 정리
        const professor = this.cleanProfessorName(professorRaw);

        console.log('professor:', professor);
        
        // 시간표 정보 파싱
        const parsedSchedules = this.parseTimetableString(timetableInfo);
        
        // 각 시간표 정보를 개별 항목으로 생성
        parsedSchedules.forEach(schedule => {
          timetableData.push({
            title: courseName,
            day_of_week: schedule.day,
            start_time: schedule.startTime,
            end_time: schedule.endTime,
            building_name: schedule.building,
            floor_number: schedule.floor || '',
            room_name: schedule.room,
            professor: professor,
            color: this.getRandomColor(), // 랜덤 색상
            memo: ''
          });
        });
      }
    });
    
    console.log('파싱된 시간표 데이터:', timetableData);
    return timetableData;
  } catch (error) {
    console.error('엑셀 파싱 오류:', error);
    throw new Error('엑셀 파일 파싱에 실패했습니다.');
  }
};

// 시간표 문자열 파싱 (예: "2024,0902~2024,1222 목 13:00~15:00 우송교양관 205")
exports.parseTimetableString = (timetableStr) => {
  const schedules = [];
  
  if (!timetableStr || typeof timetableStr !== 'string') {
    return schedules;
  }
  
  try {
    // 날짜 범위 제거 (예: "(2025.0304~2025.0620)" 부분)
    const cleanTimetableStr = timetableStr.replace(/\(\d{4}\.\d{4}~\d{4}\.\d{4}\)/g, '').trim();
    console.log('날짜제거 후 테이블 스트링:', cleanTimetableStr);
    
    // 요일별로 시간 블록 분리 (예: "화 09:00~12:00(최창민, 미디어융합관-전산관 201), 13:00~15:00(최창민, 미디어융합관-전산관 201)")
    let timeBlocks = cleanTimetableStr.split(',').map(block => block.trim());
    console.log('timeBlocks:', timeBlocks);

    let lastDay = null;
    let dayMapping = {
      '월': 'mon',
      '화': 'tue', 
      '수': 'wed',
      '목': 'thu',
      '금': 'fri',
      '토': 'sat',
      '일': 'sun'
    };

    if(timeBlocks.length < 3) {
      // 기존 단일 블록 처리 (변경 없음)
      timeBlocks = cleanTimetableStr;
      const dayMatch = timeBlocks.match(/(월|화|수|목|금|토|일)/);
      const timeMatch = timeBlocks.match(/(\d{1,2}:\d{2})~(\d{1,2}:\d{2})/);
      const buildingMatch = timeBlocks.match(/([가-힣]+(?:관|관|대|학관|교양관|건축관|관)(?:-[가-힣]+(?:관|관|대|학관|교양관|건축관|관))?)/);
      const roomMatch = timeBlocks.match(/(\d{3,4})/);

      console.log('매칭 결과:', { dayMatch, timeMatch, buildingMatch, roomMatch });

      if (dayMatch && timeMatch) {
        const day = dayMapping[dayMatch[1]] || dayMatch[1];
        lastDay = day;
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        let building = buildingMatch ? buildingMatch[1] : '';
        let floor = '';
        const room = roomMatch ? roomMatch[1] : '';
        let finalBuilding = this.mapBuildingName(building, room);
        if (room && room.length >= 3) {
          floor = room.charAt(0);
        }
        schedules.push({
          day,
          startTime,
          endTime,
          building: finalBuilding,
          floor,
          room
        });
      }
    } else {
      // 2개씩 합쳐서 처리 + 요일 기억
      for (let i = 0; i < timeBlocks.length; i += 2) {
        const combinedBlock = (timeBlocks[i] || '') + ', ' + (timeBlocks[i + 1] || '');
        console.log('합쳐진 블록:', combinedBlock);
        const dayMatch = combinedBlock.match(/(월|화|수|목|금|토|일)/);
        const timeMatch = combinedBlock.match(/(\d{1,2}:\d{2})~(\d{1,2}:\d{2})/);
        const buildingMatch = combinedBlock.match(/([가-힣]+(?:관|관|대|학관|교양관|건축관|관)(?:-[가-힣]+(?:관|관|대|학관|교양관|건축관|관))?)/);
        const roomMatch = combinedBlock.match(/(\d{3,4})/);

        let day;
        if (dayMatch) {
          day = dayMapping[dayMatch[1]] || dayMatch[1];
          lastDay = day;
        } else {
          day = lastDay;
        }

        console.log('매칭 결과:', { dayMatch, timeMatch, buildingMatch, roomMatch });

        if (day && timeMatch) {
          const startTime = timeMatch[1];
          const endTime = timeMatch[2];
          let building = buildingMatch ? buildingMatch[1] : '';
          let floor = '';
          const room = roomMatch ? roomMatch[1] : '';
          let finalBuilding = this.mapBuildingName(building, room);
          if (room && room.length >= 3) {
            floor = room.charAt(0);
          }
          schedules.push({
            day,
            startTime,
            endTime,
            building: finalBuilding,
            floor,
            room
          });
        }
      }
    }
    return schedules;
  } catch (error) {
    console.error('시간표 문자열 파싱 오류:', error, '원본:', timetableStr);
  }
};

// 건물명 매핑 함수
exports.mapBuildingName = (originalBuilding, roomNumber) => {
  // roomNumber가 문자열이 아닌 경우 문자열로 변환
  const roomStr = roomNumber && typeof roomNumber === 'string' ? roomNumber : String(roomNumber || '');
  
  // 매핑 규칙 확인
  const mapping = buildingMappings[originalBuilding];
  
  if (!mapping) {
    // 매핑 규칙이 없으면 원본 건물명 반환
    console.log(`건물명 매핑 규칙 없음: ${originalBuilding}`);
    return originalBuilding;
  }

  // 단순 매핑인 경우
  if (typeof mapping === 'string') {
    return mapping;    
  }

  // 복합 매핑인 경우 (조건부)
  if (mapping.type === 'conditional') {
    for (const rule of mapping.rules) {
      if (rule.condition(roomStr)) {
        return rule.result;
      }
    }
  }

  // 기본값 반환
  return originalBuilding;
};

// 강의교수 이름 정리 (중복 제거, 쉼표 구분)
exports.cleanProfessorName = (professorRaw) => {
  if (!professorRaw || typeof professorRaw !== 'string') {
    return '';
  }
  
  try {
    // 쉼표로 분리하고 각 이름을 trim
    const professors = professorRaw
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0); // 빈 문자열 제거
    
    // 중복 제거 (Set 사용)
    const uniqueProfessors = [...new Set(professors)];
    
    // 다시 쉼표로 연결
    return uniqueProfessors.join(', ');
    
  } catch (error) {
    console.error('강의교수 이름 정리 중 오류:', error);
    return professorRaw; // 오류 시 원본 반환
  }
};

// 랜덤 색상 생성
exports.getRandomColor = () => {
  const colors = [
    'FF3B82F6', 'FF10B981', 'FFEF4444', 'FF8B5CF6', 
    'FFF59E0B', 'FF06B6D4', 'FFEC4899', 'FF84CC16'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// 엑셀 데이터를 DB에 일괄 저장
exports.bulkInsertTimetable = async (userId, timetableData) => {
  try {
    const results = [];
    
    for (const data of timetableData) {
      try {
        const result = await this.add(
          userId,
          data.title,
          data.day_of_week,
          data.start_time,
          data.end_time,
          data.building_name,
          data.floor_number,
          data.room_name,
          data.professor,
          data.color,
          data.memo
        );
        results.push({ success: true, data });
      } catch (error) {
        console.error('개별 시간표 저장 실패:', error);
        results.push({ success: false, data, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error('일괄 저장 오류:', error);
    throw error;
  }
};
