// src/modules/user/service.js

const con = require("../../core/db")

const bcrypt = require('bcrypt');

// 회원 전체 조회
exports.getAll = async () => {
  const query = 'SELECT * FROM "User" ORDER BY "Created_At"'

  try {
    const result = await con.query(query)
    return result
  } catch (err) {
    throw err
  }
}

// 친구 신청용 목록 조회
exports.friend_request_list = async () => {
  const query = 'SELECT "Id", "Name" FROM "User"'

  try {
    const result = await con.query(query);
    return result;
  } catch (err) {
    throw err;
  }
}

// 로그인 중인 회원만 조회
exports.getislogin = async () => {
  const query = `SELECT "Id", "Name", "Last_Location" FROM "User" WHERE "Is_Login" = true`

  try {
    const result = await con.query(query);
    return result;
  } catch (err) {
    throw err;
  }
}

exports.getUser = async (id) => {
  const query = `SELECT "Id", "Pw", "Name", "Stu_Num", "Phone", "Email" FROM "User" WHERE "Id" = $1`;

  const values = [id];

  try {
    const result = await con.query(query, values);
    return result;
  } catch (err) {
      throw err;
    }
}

// 회원가입
exports.register = async (id, pw, name, stu_number, phone, email) => {
  const insertQuery = `
    INSERT INTO "User" ("Id", "Pw", "Name", "Stu_Num", "Phone", "Email")
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING "Id"
  `

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(pw, saltRounds);
  const values = [id, hashedPassword, name, stu_number, phone, email]

  try {
    const result = await con.query(insertQuery, values);
    return result;
  } catch (err) {
    if (err.code === '23505') {
      return { duplicate: true,
        constraint: err.constraint,
        detail: err.detail
       };
    }
    throw err;
  }
}

exports.add_admin = (id) => {
  const insertQuery = `
    INSERT INTO "Admin" ("Id")
    VALUES ($1)
  `
  const values = [id]

  return new Promise((resolve, reject) => {
    con.query(insertQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 로그인
exports.login = async (id, pw) => {
  // 1. 아이디로 사용자 정보 조회
  const findUserQuery = `SELECT * FROM "User" WHERE "Id" = $1`
  const userResult    = await con.query(findUserQuery, [id])

  // 사용자가 없는 경우
  if (userResult.rows.length === 0) {
    return { notfound: true };
  }

  const user = userResult.rows[0];
  const hashedPasswordInDB = user.Pw;

  // 2. 비밀번호 일치 여부 확인
  const isMatch = await bcrypt.compare(pw, hashedPasswordInDB);

  // 3. 결과에 따라 처리
  if (isMatch) {
    // 비밀번호 일치
    const updateQuery    = 'UPDATE "User" SET "Is_Login" = true WHERE "Id" = $1 RETURNING "Is_Login", "Is_Tutorial", "Is_location_public";'
    const updateResult   = await con.query(updateQuery, [id])

    console.log(`로그인 성공: ${id}`);
    const returnuser = {
      id: user.Id, // 버그 수정: updateResult가 아닌, 이전에 조회한 user 객체에서 Id를 가져옵니다.
      name: user.Name, // 버그 수정: user 객체에서 Name을 가져옵니다.
      islogin: updateResult.rows[0].Is_Login,
      is_location_public: updateResult.rows[0].Is_location_public,
      is_tutorial: updateResult.rows[0].Is_Tutorial,
    }
    return returnuser;
  } else {
    // 비밀번호 불일치
    return { notmatch: true };
  }
};

// 관리자 아이디 체크
exports.check_admin = async (id) => {
  const selectQuery = `SELECT "Id" FROM "Admin" WHERE "Id" = $1`

  try {
    const result = await con.query(selectQuery, [id]);
    return result;
  } catch (err) {
    throw err;
  }
} 

// 로그아웃
exports.logout = async (id) => {
  const updateQuery = 'UPDATE "User" SET "Is_Login" = false WHERE "Id" = $1'

  console.log("로그아웃:", id);

  try {
    const result = await con.query(updateQuery, [id]);
    return result;
  } catch (err) {
    throw err;
  }
} 

// 회원정보 수정
exports.update = async (id, pw, phone, email) => {
  let fields = []
  let values = []
  let idx = 1

  const allowedFields = {
    pw: '"Pw"',
    phone: '"Phone"',
    email: '"Email"'
  }

  if (pw) {
    fields.push(`${allowedFields.pw} = $${idx++}`)

    // 암호화
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pw, saltRounds);
    values.push(hashedPassword)
  }
  if (phone) {
    fields.push(`${allowedFields.phone} = $${idx++}`)
    values.push(phone)
  }
  if (email) {
    fields.push(`${allowedFields.email} = $${idx++}`)
    values.push(email)
  }

  // 빈 필드 체크
  if (fields.length === 0) {
    throw new Error("수정할 항목이 없습니다.");
  }

  values.push(id)
  
  const sql = `UPDATE "User" SET ${fields.join(", ")} WHERE "Id" = $${idx}`

  console.log("sql:", sql);

  try { 
    const result = await con.query(sql, values);
    return result;
  } catch (err) {
    throw err;
  }
}

// 현재 위치 업데이트
exports.update_location = async (id, x, y, timestamp) => {
  const update_location_Query = `UPDATE "User" SET "Last_Location" = POINT($1, $2), "Last_Location_Time" =  to_timestamp($3 / 1000.0) WHERE "Id" = $4 RETURNING "Is_location_public"`

  try {
    const result = await con.query(update_location_Query, [x, y, timestamp, id]);
    return result;
  } catch (err) {
    throw err;
  }
}

// 내 위치 공유 함 안함 할래 말래 할래 말래 할래 말래 애매하긴 해
exports.update_share_location = async (id) => {
  const update_share_location_Qurey = `UPDATE "User" SET "Is_location_public" = NOT "Is_location_public" WHERE "Id" = $1 RETURNING "Is_location_public"`

  try {
    const result = await con.query(update_share_location_Qurey, [id]);
    return result;
  } catch (err) {
    throw err;
  }
}

// 회원정보 삭제
exports.delete = async (id) => {
  const deleteQuery = 'DELETE FROM "User" WHERE "Id" = $1'

  try {
    const result = await con.query(deleteQuery, [id]);
    return result;
  } catch (err) {
    throw err;
  }
}

// 아이디 찾기
exports.find_id = async (email) => {
  const deleteQuery = 'SELECT "Id" FROM "User" WHERE "Email" = $1'

  try {
    const result = await con.query(deleteQuery, [email]);
    return result;
  } catch (err) {
    throw err;
  }
}

// 튜토리얼 다시 보지 않기
exports.update_tutorial = async (id) => {
  const update_tutorial_Qurey = `UPDATE "User" SET "Is_Tutorial" = false WHERE "Id" = $1`

  try {
    const result = await con.query(update_tutorial_Qurey, [id]);
    return result;
  } catch (err) {
    throw err;
  }
}