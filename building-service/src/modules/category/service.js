// src/modules/floor/service.js

const con = require("../../core/db")

// 전체 조회
exports.getAll = () => {
  const query = 'SELECT * FROM "Categories" ORDER BY "Building_Name", "Category_Name"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 카테고리 검색(카테고리 이름 > 건물 위치) 메인화면에서 상단부분 필터 클릭 시
exports.getBuildingLocationsByCategory = (category_name) => {
  const query = 'SELECT c."Building_Name", b."Location" FROM "Categories" c JOIN "Building" b ON c."Building_Name" = b."Building_Name" WHERE c."Category_Name" = $1';
  
  const values = [category_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물_층 2d도면에 카테고리 필터 클릭시 띄우기
exports.getCategoryLocationsAt2D = (building_name, floor_number, category) => {
  const query = `
  SELECT fc."Category_Location"
  FROM "Floor" f
  JOIN "Floor_C" fc ON f."Floor_Id" = fc."Floor_Id"
  WHERE f."Building_Name" = $1
    AND f."Floor_Number" = $2
    AND fc."Category_Name" = $3
`;
  const values = [building_name, floor_number, category]

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

// 카테고리 추가
exports.create = (building_name, floor_number, category, x, y) => {
  const insertQuery = `
  INSERT INTO "Categories" ("Category_Name", "Building_Name") VALUES ($1, $2);
  INSERT INTO "Floor_C" (")`;
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
    WHERE "Building_Name" = $2 AND "Floor" = $3
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
  const deleteQuery = 'DELETE FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Num" = $2'

  const values = [building_name, floor_number]

  return new Promise((resolve, reject) => {
    con.query(deleteQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};