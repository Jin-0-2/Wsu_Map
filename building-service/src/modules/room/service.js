// src/modules/floor/service.js

const con = require("../../core/db")
const cheerio = require('cheerio');

// 전체 조회
exports.getAll = () => {
  const query = 'select f."Building_Name", f."Floor_Number", r."Room_Name", r."Room_Description" from "Floor_R" r JOIN "Floor" f ON r."Floor_Id" = f."Floor_Id"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

exports.getRoombyBuildingFloor = (building_name, floor_number) => {
  const query = 'SELECT r."Romm"Name", r."Romm_Description", r."Room_Location" FROM "Floor_R" r JOIN "Floor" f ON r."Floor_Id" = f."Floor_Id" WHERE f."Building_Name" = $1 AND f."Floor_Number" = $2'

  const values = [building_name, floor_number];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 2D도면에서 방 클릭 시 보여줄 방 이름 및 설명
exports.getRoomDescByName = (building_name, floor_number, room_name) => {
  const query = 'SELECT r."Room_Description" FROM "Floor_R" r JOIN "Floor" f ON r."Floor_Id" = f."Floor_Id" WHERE f."Building_Name" = $1 AND f."Floor_Number" = $2 AND r."Room_Name" = $3';
  
  const values = [building_name, floor_number, room_name];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 길찾기용 포인트 얻기 (이건.. 다시 생각해봐야 할듯..)  > 승헌이형꺼 붙이기
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

// 방 추가
exports.create = (building_name, floor_number, room_name, room_desc, x, y) => {
  const insertQuery = `
  INSERT INTO "Floor_R" ("Floor_Id", "Room_Name", "Room_Description", "Room_Location")
  VALUES (
  (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2),
  $3, $4, POINT($5, $6)
  );`;

  const values = [building_name, floor_number, room_name, room_desc, x, y];

  return new Promise((resolve, reject) => {
    con.query(insertQuery, values, (err, result) => {
        if (err)  return reject(err);

        resolve(result);
        })
    });
};

// 방 수정
exports.update = (building_name, floor_number, old_room_name, room_name, room_desc) => {
  const updateQuery = `UPDATE "Floor_R"
  SET "Room_Name" = $1, "Room_Description" = $2
  WHERE "Floor_Id" = (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $3 AND "Floor_Number" = $4)
  AND "Room_Name" = $5;`;

  const values = [room_name, room_desc, building_name, floor_number, old_room_name];
  
  return new Promise((resolve, reject) => {
    con.query(updateQuery, values, (err, result) => {
        if (err)  return reject(err);

        resolve(result);
        })
    });
};

// 방 삭제: 이건 관리 페이지에서.. 목록을 보고 삭제를..
exports.delete = (building_name, floor_number, room_name) => {
  const deleteQuery = `DELETE FROM "Floor_R" WHERE "Floor_Id" = (
      SELECT "Floor_Id"
      FROM "Floor"
      WHERE "Building_Name" = $1 AND "Floor_Number" = $2)
      AND "Room_Name" = $3;
      `

  const values = [building_name, floor_number, room_name];

  return new Promise((resolve, reject) => {
    con.query(deleteQuery, values, (err, result) => {
      if (err) return reject(err);
      
      resolve(result);
    });


    });
};

