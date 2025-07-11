// src/modules/floor/service.js

const con = require("../../core/db")
const cheerio = require('cheerio');

// 전체 조회
exports.getAll = () => {
  const query = `SELECT
      f."Building_Name",
      f."Floor_Number",
      r."Room_Name",
      r."Room_Description"
    FROM
      "Floor_R" r
    JOIN
      "Floor" f ON r."Floor_Id" = f."Floor_Id"
    WHERE
      r."Room_Name" NOT LIKE 'b%'
      AND r."Room_Name" NOT LIKE '%stairs'
	  and r."Room_Name" Not like 'enterence'
	  and r."Room_Name" not like 'to%'
	ORDER BY
    CASE
        WHEN "Building_Name" LIKE 'W%' THEN 1
        ELSE 2
    END,
    CASE
        WHEN "Building_Name" LIKE 'W%' THEN CAST(substring("Building_Name" from 'W([0-9]+)') AS INTEGER)
    END,
    "Building_Name";`

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

exports.getRoombyBuilding = (building_name) => {
  const query = `SELECT
  f."Building_Name",
  f."Floor_Number",
  r."Room_Name",
  r."Room_Description"
FROM
  "Floor_R" r
JOIN
  "Floor" f ON r."Floor_Id" = f."Floor_Id"
WHERE
  f."Building_Name" = $1 AND
  r."Room_Name" NOT LIKE 'b%' AND
  r."Room_Name" NOT LIKE '%stairs' AND
  r."Room_Name" NOT LIKE 'entrance' AND -- 'enterence' 오타 수정
  r."Room_Name" NOT LIKE 'to%'
ORDER BY
  -- 1. 층 번호를 숫자로 변환하여 오름차순 정렬 (1층, 2층, 3층, ...)
  CAST(f."Floor_Number" AS INTEGER) ASC,
  
  -- 2. 같은 층 내에서는 방 이름의 숫자 부분을 추출하여 오름차순 정렬 (101호, 102호, ...)
  CAST(substring(r."Room_Name" from '^[0-9]+') AS INTEGER) ASC NULLS LAST,
  
  -- 3. 숫자 정렬이 불가능하거나 같은 숫자일 경우, 전체 이름으로 오름차순 정렬
  r."Room_Name" ASC;`

  const values = [building_name];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

exports.getRoombyBuildingFloor = (building_name, floor_number) => {
  const query = `SELECT
      f."Building_Name",
      f."Floor_Number",
      r."Room_Name",
      r."Room_Description"
    FROM
      "Floor_R" r
    JOIN
      "Floor" f ON r."Floor_Id" = f."Floor_Id"
    WHERE
      f."Building_Name" = $1 AND f."Floor_Number" = $2 AND
      r."Room_Name" NOT LIKE 'b%'
      AND r."Room_Name" NOT LIKE '%stairs'
	  and r."Room_Name" Not like 'enterence'
	  and r."Room_Name" not like 'to%'
	ORDER BY
    CASE
        WHEN "Building_Name" LIKE 'W%' THEN 1
        ELSE 2
    END,
    CASE
        WHEN "Building_Name" LIKE 'W%' THEN CAST(substring("Building_Name" from 'W([0-9]+)') AS INTEGER)
    END,
    "Building_Name";`

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

// 방 추가
exports.create_tran = async (building_name, floor_number, room_name, room_desc, x, y, { client }) => {
  const insertQuery = `
  INSERT INTO "Floor_R" ("Floor_Id", "Room_Name", "Room_Description", "Room_Location")
  VALUES (
  (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2),
  $3, $4, POINT($5, $6)
  );`;

  const values = [building_name, floor_number, room_name, room_desc, x, y];

  const result = await con.query(insertQuery, values);

  return result;
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

// 1. 이름으로 업데이트하는 함수 (신규 추가 필요)
exports.updateByName = async (building_name, floor_number, nodeId, dataToUpdate, { client }) => {
  const { x, y } = dataToUpdate;
  const query = `UPDATE "Floor_R"
  SET "Room_Location" = POINT($1, $2)
  WHERE "Floor_Id" = (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $3 AND "Floor_Number" = $4 LIMIT 1)
  AND "Room_Name" = $5;`;
  await con.query(query, [x, y, building_name, floor_number, nodeId]);
}

// 2. 이름으로 삭제하는 함수 (신규 추가 필요)
exports.deleteByName = async (building_name, floor_number, nodeId, { client }) => {
  const query = `DELETE FROM "Floor_R" WHERE "Floor_Id" = (
      SELECT "Floor_Id"
      FROM "Floor"
      WHERE "Building_Name" = $1 AND "Floor_Number" = $2)
      AND "Room_Name" = $3;
      `;
  await con.query(query, [building_name, floor_number, nodeId]);
}

exports.findAllByFloor = async (building_name, floor_number, { client }) => {
  const selectQuery = `
    SELECT "FR"."Room_Name"
    FROM "Floor_R" AS "FR"
    JOIN "Floor" AS "F" ON "FR"."Floor_Id" = "F"."Floor_Id"
    WHERE "F"."Building_Name" = $1 AND "F"."Floor_Number" = $2;
  `;

  const values = [building_name, floor_number];

  // 인자로 전달받은 client를 사용해 쿼리를 실행합니다.
  const result = await client.query(selectQuery, values);

  return result.rows.map(row => row.Room_Name);
}