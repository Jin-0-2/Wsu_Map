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

// 2D도면에서 필터를 선택하려면 카테고리 목록이 필요하겠지? 주는거 만들어야겠지?
exports.getCategoryListAt2D = (building_name, floor_number) => {
  const query = `
    SELECT fc."Category_Name"
    FROM "Floor" f
    JOIN "Floor_C" fc ON f."Floor_Id" = fc."Floor_Id"
    WHERE f."Building_Name" = $1
    AND f."Floor_Number" = $2
  `;

  const values = [building_name, floor_number]

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

// 건물/층을 입력받아 그 층에 있는 모든 카테고리의 이름과 좌표 반환
exports.getCategoryForManager = (building_name, floor_number) => {
  const query = `
  SELECT fc."Category_Name", fc."Category_Location"
  FROM "Floor" f
  JOIN "Floor_C" fc ON f."Floor_Id" = fc."Floor_Id"
  WHERE f."Building_Name" = $1
    AND f."Floor_Number" = $2
`;
  const values = [building_name, floor_number]

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
  const f_idQuery = `SELECT "Floor_Id" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2;`
  const insert_Categories_Query = `INSERT INTO "Categories" ("Category_Name", "Building_Name") VALUES ($1, $2);`;
  const insert_Floor_C_Query = `INSERT INTO "Floor_C" ("Floor_Id", "Category_Name", "Category_Location") VALUES ($1, $2, point($3, $4));`;
  const values1 = [building_name, floor_number]
  const values2 = [category, building_name]

  return new Promise((resolve, reject) => {
    con.query(f_idQuery, values1, (err, result) => {
        if (err)  return reject(err);

        const floor_id = result.rows[0].Floor_Id;
        const values3 = [floor_id, category, x, y];

        con.query(insert_Categories_Query, values2, (err) => {
          if(err) return reject(err);
        })
        con.query(insert_Floor_C_Query, values3, (err, result) => {
          if(err) return reject(err);

          return resolve(result);
        })
    });
  });
};

// 카테고리 삭제: 이건 관리 페이지에서.. 목록을 보고 삭제를..
exports.delete = (building_name, floor_number, x, y) => {
  const delete_Floor_id_Query = `DELETE FROM "Floor_C" WHERE "Floor_Id" = (
      SELECT "Floor_Id"
      FROM "Floor"
      WHERE "Building_Name" = $1 AND "Floor_Number" = $2)
      AND "Category_Location"[0] = $3
      AND "Category_Location"[1] = $4;
      `
  // const delete_Categories_Query = `DELETE FROM "Categories" WHERE "Building_Name" = $1 AND "Category_Name" = $2;`;

  const values1 = [building_name, floor_number, x, y];
  // const values2 = [building_name, category]

  return new Promise((resolve, reject) => {
    con.query(delete_Floor_id_Query, values1, (err, result) => {
      if (err) return reject(err);
      return resolve(result)
    });
    // con.query(delete_Categories_Query, values2, (err, result) => {
    //   if (err) return reject(err);
    //   return resolve(result);
    // });
  });
};