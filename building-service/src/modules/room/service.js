// src/modules/floor/service.js

const con = require("../../core/db")
const cheerio = require('cheerio');

// 전체 조회
exports.getAll = () => {
  const query = `
    SELECT
      f."Building_Name",
      f."Floor_Number",
      r."Room_Name",
      r."Room_Description",
      r."Room_User",
      r."User_Phone",
      r."User_Email"
    FROM
      "Floor_R" r
      JOIN "Floor" f ON r."Floor_Id" = f."Floor_Id"
    WHERE
      r."Room_Name" NOT LIKE 'b%'          -- b로 시작하는 방 제외
      AND r."Room_Name" NOT LIKE '%stairs' -- stairs로 끝나는 방 제외
      AND r."Room_Name" NOT LIKE 'enterence' -- entrance 제외
      AND r."Room_Name" NOT LIKE 'to%'     -- to로 시작하는 방 제외
    ORDER BY
      -- 1. W 건물을 먼저
      CASE
        WHEN f."Building_Name" LIKE 'W%' THEN 1
        ELSE 2
      END,
      
      -- 2. W 뒤 숫자 추출
      CASE
        WHEN f."Building_Name" LIKE 'W%' 
          THEN CAST(substring(f."Building_Name" from 'W([0-9]+)') AS INTEGER)
        ELSE NULL
      END,
      
      -- 3. 동관/서관 등
      CASE
        WHEN f."Building_Name" LIKE '%동관%' THEN 1
        WHEN f."Building_Name" LIKE '%서관%' THEN 2
        ELSE 0
      END,
      
      -- 4. 층 (B1 → -1로 변환)
      CAST(
        CASE
          WHEN f."Floor_Number" ~ '^B[0-9]+$' 
            THEN '-' || REGEXP_REPLACE(f."Floor_Number", '[^0-9]', '', 'g')
          ELSE REGEXP_REPLACE(f."Floor_Number", '[^0-9]', '', 'g')
        END
      AS INTEGER),
      
      -- 5. 호실 번호: 숫자 우선, 사전식 보조
      CASE
        WHEN r."Room_Name" ~ '^[0-9]+(-[0-9]+)?$' THEN
          LPAD(split_part(r."Room_Name", '-', 1), 4, '0') ||
          COALESCE(LPAD(split_part(r."Room_Name", '-', 2), 4, '0'), '')
        ELSE
          r."Room_Name"
      END
  ;`;

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows);
    });
  });
};


exports.getRoombyBuilding = (building_name) => {
  const query = `SELECT
  f."Building_Name",
  f."Floor_Number",
  r."Room_Name",
  r."Room_Description",
  r."Room_User",
  r."User_Phone",
  r."User_Email"
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
      r."Room_Description",
      r."Room_User",
      r."User_Phone",
      r."User_Email"
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
  "Room_Name"
  `

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
  const query = 'SELECT r."Room_Description", r."Room_User", r."User_Phone", r."User_Email" FROM "Floor_R" r JOIN "Floor" f ON r."Floor_Id" = f."Floor_Id" WHERE f."Building_Name" = $1 AND f."Floor_Number" = $2 AND r."Room_Name" = $3';
  
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
  (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2 LIMIT 1),
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

  const result = await client.query(insertQuery, values);

  return result;
};

// 방 수정
exports.update = (building_name, floor_number, room_name, room_desc, room_user, user_phone, user_email) => {
  const setClause = '"Room_Description" = $1, "Room_User" = $2, "User_Phone" = $3, "User_Email" = $4'
  
  const updateQuery = `UPDATE "Floor_R"
  SET ${setClause}
  WHERE "Floor_Id" = (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $5 AND "Floor_Number" = $6)
  AND "Room_Name" = $7;`;

  const values = [room_desc, room_user, user_phone, user_email, building_name, floor_number, room_name];
  
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


// 실내 패스 도면 연결
exports.connect = async (from_building, from_floor, from_node, to_building, to_floor, to_node) => {
  const insert_InSideEdge = `
  insert into "InSideEdge" ("From_Floor_Id", "From_Room_Name", "To_Floor_Id", "To_Room_Name") 
  values 
  ((select "Floor_Id" from "Floor" where "Building_Name" = $1 and "Floor_Number" = $2), $3, 
  (select "Floor_Id" from "Floor" where "Building_Name" = $4 and "Floor_Number" = $5), $6),
  ((select "Floor_Id" from "Floor" where "Building_Name" = $4 and "Floor_Number" = $5), $6, 
  (select "Floor_Id" from "Floor" where "Building_Name" = $1 and "Floor_Number" = $2), $3);
  `;

  const values = [from_building, from_floor, from_node, to_building, to_floor, to_node]

  return new Promise((resolve, reject) => {
    con.query(insert_InSideEdge, values, (err, result) => {
      if (err) return reject(err);

      resolve(result);
    })
  });
}

// 실내 패스 끊기
exports.disconnect = async (from_building, from_floor, from_node, to_building, to_floor, to_node) => {
  const delete_InSideEdge = `
  DELETE FROM "InSideEdge"
  WHERE
  ("From_Floor_Id" = (select "Floor_Id" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2) AND "From_Room_Name" = $3 AND 
  "To_Floor_Id" =  (select "Floor_Id" FROM "Floor" WHERE "Building_Name" = $4 AND "Floor_Number" = $5) AND "To_Room_Name" = $6) OR
  ("From_Floor_Id" = (select "Floor_Id" FROM "Floor" WHERE "Building_Name" = $4 AND "Floor_Number" = $5) AND "From_Room_Name" = $6 AND 
  "To_Floor_Id" =  (select "Floor_Id" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2) AND "To_Room_Name" = $3)
  `;

  const values = [from_building, from_floor, from_node, to_building, to_floor, to_node]

  return new Promise((resolve, reject) => {
    con.query(delete_InSideEdge, values, (err, result) => {
      if (err) return reject(err);

      resolve(result);
    })
  });
}

// 1. 이름으로 업데이트하는 함수 (신규 추가 필요)
exports.updateByName = async (building_name, floor_number, nodeId, dataToUpdate, { client }) => {
  const { x, y } = dataToUpdate;
  const query = `UPDATE "Floor_R"
  SET "Room_Location" = POINT($1, $2)
  WHERE "Floor_Id" = (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $3 AND "Floor_Number" = $4 LIMIT 1)
  AND "Room_Name" = $5;`;
  await client.query(query, [x, y, building_name, floor_number, nodeId]);
}

// 2. 이름으로 삭제하는 함수 (신규 추가 필요)
exports.deleteByName = async (building_name, floor_number, nodeId, { client }) => {
  const query = `DELETE FROM "Floor_R" WHERE "Floor_Id" = (
      SELECT "Floor_Id"
      FROM "Floor"
      WHERE "Building_Name" = $1 AND "Floor_Number" = $2)
      AND "Room_Name" = $3;
      `;
  await client.query(query, [building_name, floor_number, nodeId]);
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

exports.deleteAllNodeLinks = async (building_name, floor_number, { client }) => {
  const delete_Qurey = `
  DELETE FROM "InSideEdge" 
  WHERE "From_Floor_Id" = (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2 LIMIT 1) 
  OR "To_Floor_Id" = (SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2 LIMIT 1)`;

  const values = [building_name, floor_number];

  await client.query(delete_Qurey, values);
}