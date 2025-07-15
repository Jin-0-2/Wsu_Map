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


exports.update = (id, origin_title, origin_day_of_week, new_title, new_day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo) => {
    // 쿼리 완성
    const query = `
    UPDATE "timetable" SET "title" = $1, "day_of_week" = $2, "start_time" = $3, "end_time" = $4, "building_name" = $5, "floor_number" = $6, "room_name" = $7, "professor" = $8, "color" = $9, "memo" = $10
    WHERE "user_id" = $11 AND "title" = $12 AND "day_of_week" = $13
  `;

    const values = [new_title, new_day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo, id, origin_title, origin_day_of_week]

    return new Promise((resolve, reject) => {
        con.query(query, values, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

// 시간표 삭제
exports.delete = (id, title, day_of_week) => {
    const query = `
    DELETE FROM "timetable" WHERE "user_id" = $1 AND "title" = $2 AND "day_of_week" = $3;
    `

    const values = [id, title, day_of_week]
    console.log(query);
    console.log(values);


    return new Promise((resolve, reject) => {
        con.query(query, values, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}
