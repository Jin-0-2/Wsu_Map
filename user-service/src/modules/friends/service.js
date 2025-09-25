// src/modules/friends/service.js

const con = require("../../core/db")

// 회원 전체 조회
exports.getAll = async () => {
  const query = 'SELECT * FROM "User" ORDER BY "Created_At"'

  try {
    const result = await con.query(query);
    return result;
  } catch (err) {
    throw err;
  }
}

// 친구 추가
exports.add = async (my_id, add_id) => {
  const checkQuery = `
    SELECT "status" FROM "friendship"
    WHERE "user_id" = $1 AND "friend_id" = $2
    FOR UPDATE;
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

  const nameQuery = `
    SELECT "Name" AS user_name FROM "User" WHERE "Id" = $1
  `;

  try {
    await con.query('BEGIN');

    // 기존 관계 상태 확인(잠금)
    const checkRes = await con.query(checkQuery, [my_id, add_id]);

    let result;
    if (checkRes.rows.length === 0) {
      // 친구 신청한 적 없음 -> 새로 추가!
      result = await con.query(insertQuery, [my_id, add_id]);

    } else if (checkRes.rows[0].status === 'rejected') {
      // 거절 상태 → 다시 신청(=pending으로)!
      result = await con.query(updateQuery, [my_id, add_id]);

    } else {
      // 이미 pending/accepted 등 → 아무것도 안 함
      await con.query('ROLLBACK');
      result = { rows: [] };
  }

  if (result.rows.length > 0) {
    // 유저 이름도 같이 가져옴
    const nameRes = await con.query(nameQuery, [my_id]);
    result.rows[0].user_name = nameRes.rows[0]?.user_name || my_id;
  }
  
  await con.query('COMMIT');
  return result;
  } catch (err) {
    await con.query('ROLLBACK');
    throw err;
  }
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

  try {
    const result = await con.query(select_query, [id]);
    return result;
  } catch (err) {
    throw err;
  }
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
  try {
    const result = await con.query(select_query, [id]);
    return result;
  } catch (err) {
    throw err;
  }
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
  try {
    const result = await con.query(select_query, [id]);
    return result;
  } catch (err) {
    throw err;
  }
}



// 내가 보낸 친구 요청 취소 mistake;;
exports.mistake = async (id, friend_id) => {
  const deleteQuery =`
  DELETE FROM "friendship" WHERE "user_id" = $1 AND "friend_id" = $2
  `;

  try {
    const result = await con.query(deleteQuery, [id, friend_id]);
    return result;
  } catch (err) {
    throw err;
  }
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

  // my_id = 거절한 사람, add_id = 요청 보낸 사람

  try {
    const result = await con.query(query, [my_id, add_id]);
    return result;
  } catch (err) {
    throw err;
  }
}


// 친구 삭제
exports.delete = async (my_id, add_id) => {
  const deleteQuery = `
  DELETE FROM "friendship"
  WHERE (user_id = $1 AND friend_id = $2)
  OR (user_id = $2 AND friend_id = $1);
  `;

  try {
    const result = await con.query(deleteQuery, [my_id, add_id]);
    return result;
  } catch (err) {
    throw err;
  }
}