// src/modules/table/service.js

const con = require("../../core/db")

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


exports.update = () => {
  const query = `
      UPDATE "timetable" SET 
  `
  const values = [id, title, day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo === undefined ? null : memo]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });    
}