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

exports.add = (my_id, add_id) => {
  const query = `
    INSERT INTO "friendship" ("user_id", "friend_id", "status")
    VALUES ($1, $2, 'pending')
    ON CONFLICT ("user_id", "friend_id") DO NOTHING
    `;

  const values = [my_id, add_id];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

exports.getMyFreind = async (id) => {
  const select_query = `
  SELECT u."Id", u."Name", u."Phone", u."Is_Login", u."Last_Location"
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
