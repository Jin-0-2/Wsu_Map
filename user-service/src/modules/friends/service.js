// src/modules/friends/service.js

const con = require("../../core/db")

// 회원 전체 조회
exports.getAll = () => {
  const query = 'SELECT * FROM "User" ORDER BY "Created_At"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 친구 추가
exports.add = (my_id, add_id) => {
  const checkQuery = `
    SELECT "status" FROM "friendship"
    WHERE "user_id" = $1 AND "friend_id" = $2
  `;
  const insertQuery = `
    INSERT INTO "friendship" ("user_id", "friend_id", "status")
    VALUES ($1, $2, 'pending')
    RETURNING "user_id"
  `;
  const updateQuery = `
    UPDATE "friendship"
    SET "status" = 'pending'
    WHERE "user_id" = $1 AND "friend_id" = $2 AND "status" = 'rejected'
    RETURNING "user_id"
  `;

  return new Promise((resolve, reject) => {
    con.query(checkQuery, [my_id, add_id], (err, result) => {
      if (err) return reject(err);

      if (result.rows.length === 0) {
        // 친구 신청한 적 없음 → 새로 추가!
        con.query(insertQuery, [my_id, add_id], (err2, result2) => {
          if (err2) return reject(err2);

          // 유저 이름도 같이 가져옴
          if (result2.rows.length > 0) {
            const nameQuery = `SELECT "Name" AS user_name FROM "User" WHERE "Id" = $1`;
            con.query(nameQuery, [my_id], (err3, result3) => {
              if (err3) return reject(err3);
              result2.rows[0].user_name = result3.rows[0]?.user_name || my_id;
              resolve(result2);
            });
          } else {
            resolve(result2);
          }
        });
      } else if (result.rows[0].status === 'rejected') {
        // 거절 상태 → 다시 신청(=pending으로)!
        con.query(updateQuery, [my_id, add_id], (err2, result2) => {
          if (err2) return reject(err2);

          if (result2.rows.length > 0) {
            const nameQuery = `SELECT "Name" AS user_name FROM "User" WHERE "Id" = $1`;
            con.query(nameQuery, [my_id], (err3, result3) => {
              if (err3) return reject(err3);
              result2.rows[0].user_name = result3.rows[0]?.user_name || my_id;
              resolve(result2);
            });
          } else {
            resolve(result2);
          }
        });
      } else {
        // 이미 pending/accepted 등 → 아무것도 안 함
        resolve({ rows: [] });
      }
    });
  });
};

// 내 친구 목록 조회
exports.getMyFriend = async (id) => {
  const select_query = `
  SELECT u."Id", u."Name", u."Phone", u."Is_Login", u."Last_Location", u."Is_location_public"
  FROM "friendship" f
  JOIN "User" u ON u."Id" = f."friend_id"
  WHERE f."user_id" = $1
  AND f."status" = 'accepted';
  `;

  const values = [id];

  return new Promise((resolve, reject) => {
    con.query(select_query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 내가 보낸 친구 조회 리스트
exports.my_req_list = async (id) => {
  const select_query = `
    SELECT u."Id", u."Name"
    FROM "friendship" f
    JOIN "User" u ON u."Id" = f."friend_id"
    WHERE f."user_id" = $1
      AND f."status" = 'pending'
  `
  const values = [id];

  return new Promise((resolve, reject) => {
    con.query(select_query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 친구 요청 받은 리스트 조회
exports.request_list = async (id) => {
  const select_query = `
    SELECT u."Id", u."Name"
    FROM "friendship" f
    JOIN "User" u ON u."Id" = f."user_id"
    WHERE f."friend_id" = $1
      AND f."status" = 'pending'
  `;
  const values = [id];

  return new Promise((resolve, reject) => {
    con.query(select_query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 내가 보낸 친구 요청 취소 mistake;;
exports.mistake = async (id, friend_id) => {
  const delete_qurey =`
  DELETE FROM "friendship" WHERE "user_id" = $1 AND "friend_id" = $2
  `;

  const values = [id, friend_id];

  return new Promise((resolve, reject) => {
    con.query(delete_qurey, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 친구 요청 받기
exports.accept = async (my_id, add_id) => {
  try {
    await con.query('BEGIN');

    // 1. 요청 상태를 accepted로 변경
    const updateQuery = `
      UPDATE "friendship"
      SET "status" = 'accepted', "responded_at" = CURRENT_TIMESTAMP
      WHERE "user_id" = $2 AND "friend_id" = $1 AND "status" = 'pending';
    `;
    await con.query(updateQuery, [my_id, add_id]);

    // 2. 반대 방향 친구 관계 삽입
    const insertQuery = `
      INSERT INTO "friendship" ("user_id", "friend_id", "status", "requested_at", "responded_at")
      VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("user_id", "friend_id") DO NOTHING;
    `;
    await con.query(insertQuery, [my_id, add_id]);

    await con.query('COMMIT');
    return { message: '친구 요청이 수락되었습니다.' };
  } catch (err) {
    await con.query('ROLLBACK');
    throw err;
  }
};

// 친구 요청 거절하기.
exports.reject = async (my_id, add_id) => {
  const query = `
    UPDATE "friendship"
    SET "status" = 'rejected', "responded_at" = CURRENT_TIMESTAMP
    WHERE "user_id" = $2 AND "friend_id" = $1 AND "status" = 'pending';
  `;

  const values = [my_id, add_id]; // my_id = 거절한 사람, add_id = 요청 보낸 사람

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// 회원정보 삭제
exports.delete = (my_id, add_id) => {
  const deleteQuery = `
  DELETE FROM friendship
  WHERE (user_id = $1 AND friend_id = $2)
  OR (user_id = $2 AND friend_id = $1);
  `;

  const values = [my_id, add_id]

  return new Promise((resolve, reject) => {
    con.query(deleteQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};
