// src/modules/floor/service.js

const con = require("../../core/db")

// 층 전체 조회
exports.getAll = () => {
  const query = 'SELECT * FROM "Floor"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물 별 층 조회 (2d)
exports.getFloors = (building_name) => {
  const query = 'SELECT * FROM "Floor" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

exports.getFloorNames = (building_name) => {
  const query = 'SELECT "Floor_Number" FROM "Floor" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 층 조회 (2d), 하나만
exports.getFloorNumber = (floor, building_name) => {
  const query = 'SELECT "File" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2'

  const values = [building_name, floor]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 층 추가
exports.create = (building_name, floor_number, file) => {
  const insertQuery = `
    INSERT INTO "Floor" ("Floor_Number", "Building_Name", "File")
    VALUES ($1, $2, $3)
  `;
  const values = [floor_number, building_name, file ?? null]

  return new Promise((resolve, reject) => {
    con.query(insertQuery, values, (err, result) => {
        if (err)  return reject(err);
        resolve(result);
    });
  });
};

// 층 정보 수정
exports.updateFloorFile = (building_name, floor_number, file) => {
  const sql = `
    UPDATE "Floor"
    SET "File" = $1
    WHERE "Building_Name" = $2 AND "Floor_Number" = $3
  `;
  const values = [file, building_name, floor_number];

  return new Promise((resolve, reject) => {
    con.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// 층 삭제
exports.delete = (building_name, floor_number) => {
  const deleteQuery = 'DELETE FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2'

  const values = [building_name, floor_number]

  return new Promise((resolve, reject) => {
    con.query(deleteQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};