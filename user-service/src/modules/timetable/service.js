// src/modules/table/service.js

const con = require("../../core/db")

exports.getAll = (id) => {
    const select_query = `
    SELECT * FROM "timetable" where "user_id" = $1
    `

    const values = [id]

    return new Promise((resolve, reject) => {
        con.query(select_query, values, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

// 시간표 추가
exports.add = (id, title, day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo) => {
    const query = `
      INSERT INTO "timetable" (
      "user_id", "title", "day_of_week", "start_time", "end_time",
      "building_name", "floor_number", "room_name", "professor",
      "color", "memo"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `
  const values = [id, title, day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo === undefined ? null : memo]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}


exports.update = (id, title, day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo) => {
    const fields = {
        title,
        day_of_week,
        start_time,
        end_time,
        building_name,
        floor_number,
        room_name,
        professor,
        color,
        memo: memo === undefined ? null : memo
    };
    const setClauses = [];
    const values = [];

    Object.entries(fields).forEach(([key, value]) => {
        // undefined/null 체크: null도 업데이트 원하면 'value !== undefined' 만 사용
        if (value !== undefined) {
            setClauses.push(`"${key}" = ?`);
            values.push(value);
        }
    });

    // 아무 필드도 없다면 오류 반환
    if (setClauses.length === 0) {
        return Promise.reject(new Error("업데이트할 값이 없습니다."));
    }

    values.push(id);

    // 쿼리 완성
    const query = `
    UPDATE "timetable" SET
    ${setClauses.join(", ")}
    WHERE "user_id" = ?
  `;

    return new Promise((resolve, reject) => {
        con.query(query, values, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

// 시간표 삭제
exports.delete = (id, title) => {
    const query = `
    DELETE FROM "timetable" WHERE "user_id" = $1 AND "title" = $2;
  `
  const values = [id, title]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}
