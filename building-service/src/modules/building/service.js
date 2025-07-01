// src/modules/building/service.js

const con = require("../../core/db")

// 건물 전체 조회
exports.getAll = () => {
  const query = 'SELECT * FROM "Building"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}
  
// 건물 조회
exports.getBuilding_Location = (building_name) => {
  const query = 'SELECT "Building_Name", "Location", "Description" FROM "Building" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// point형식 x, y로 파싱
exports.parsePoint = (pointStr) => {
  // "(37.123,128.456)" → { x: 37.123, y: 128.456 }
  const match = pointStr.match(/\((.*),(.*)\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
};

// 건물 조회 3D
exports.getBuilding_3d = (building_name) => {
  const query = 'SELECT "File" FROM "Building" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물 추가
exports.create = (building_name, x, y, desc, file) => {
  const insertQuery = `
    INSERT INTO "Building" ("Building_Name", "Location", "Description", "File")
    VALUES ($1, point($2, $3), $4,  $5) 
  `
  const values = [building_name, x, y, desc, file ?? null]

  return new Promise((resolve, reject) => {
    con.query(insertQuery, values, (err, result) => {
        if (err)  return reject(err);
        resolve(result);
    });
  });
};

// 건물 정보 수정(동적 쿼리)
exports.update = (building_name, desc, file) => {
  let fields = [];
  let values = [];
  let idx = 1;

  if (desc !== undefined) {
    fields.push(`"Description" = $${idx++}`);
    values.push(desc);
  }
  if (file !== undefined) {
    fields.push(`"File" = $${idx++}`);
    values.push(file);
  }
  values.push(building_name);

  const sql = `UPDATE "Building" SET ${fields.join(", ")} WHERE "Building_Name" = $${idx}`;

  return new Promise((resolve, reject) => {
    con.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// 건물 삭제  걸린거 다 지워야하는데 ㅈㄴ 애매해! ㄹㅇ 개 애매해!
exports.delete = (building_name) => {
  const deleteQuery = 'DELETE FROM "Building" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(deleteQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// point형식 x, y로 파싱
exports.parsePoint = (pointStr) => {
  // "(37.123,128.456)" → { x: 37.123, y: 128.456 }
  const match = pointStr.match(/\((.*),(.*)\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
};
