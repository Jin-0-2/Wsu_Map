// src/modules/user/service.js

const con = require("../../core/db")

const bcrypt = require('bcrypt');

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

// 친구 신청용 목록 조회
exports.friend_request_list = () => {
  const query = 'SELECT "Id", "Name" FROM "User"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);    
      resolve(result);
    });
  });
}

// 로그인 중인 회원만 조회
exports.getislogin = () => {
  const query = `SELECT "Id", "Name", "Last_Location" FROM "User" WHERE "Is_Login" = true`

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

exports.getUser = (id) => {
  const query = `SELECT "Id", "Pw", "Name", "Stu_Num", "Phone", "Email" FROM "User" WHERE "Id" = $1`;

  const values = [id];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 회원가입
exports.register = async (id, pw, name, stu_number, phone, email) => {
  const insertQuery = `
    INSERT INTO "User" ("Id", "Pw", "Name", "Stu_Num", "Phone", "Email")
    VALUES ($1, $2, $3, $4, $5, $6)
  `

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(pw, saltRounds);


  const values = [id, hashedPassword, name, stu_number, phone, email]

  return new Promise((resolve, reject) => {
    con.query(
      insertQuery, values, (err, result) => {
        if (err) {
          // 중복(PK 제약 위반) 에러코드: 23505
          if (err.code === '23505') {
            // 어떤 제약조건 위반인지 구분
            return resolve({ 
              duplicate: true,
              constraint: err.constraint, // 예: user_pkey, user_email_key 등
              detail: err.detail // 예: Key (id)=(test) already exists.
            });
          }
          return reject(err);
        }
        resolve(result);
      }
    );
  });
}

// 관리자 회원가입
exports.admin_register = async (id, pw, name, stu_number, phone, email) => {
  const insertQuery = `
    INSERT INTO "User" ("Id", "Pw", "Name", "Stu_Num", "Phone", "Email")
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING "Id"
  `

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(pw, saltRounds);

  const values = [id, hashedPassword, name, stu_number, phone, email]

  return new Promise((resolve, reject) => {
    con.query(
      insertQuery, values, (err, result) => {
        if (err) {
          // 중복(PK 제약 위반) 에러코드: 23505
          if (err.code === '23505') {
            // 어떤 제약조건 위반인지 구분
            return resolve({ 
              duplicate: true,
              constraint: err.constraint, // 예: user_pkey, user_email_key 등
              detail: err.detail // 예: Key (id)=(test) already exists.
            });
          }
          return reject(err);
        }
        resolve(result);
      }
    );
  });
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
exports.check_admin = (id) => {
  const selectQuery = `SELECT "Id" FROM "Admin" WHERE "Id" = $1`

  const values = [id]

  return new Promise((resolve, reject) => {
    con.query(selectQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
} 

// 로그아웃
exports.logout = (id) => {
  const updateQuery = 'UPDATE "User" SET "Is_Login" = false WHERE "Id" = $1'

  const values = [id]

  console.log("로그아웃:", id);

  return new Promise((resolve, reject) => {
    con.query(updateQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// 회원정보 수정
exports.update = async (id, pw, phone, email) => {
  let fields = []
  let values = []
  let idx = 1

  if (pw) {
    fields.push(`"Pw" = $${idx++}`)

    // 암호화
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pw, saltRounds);
    values.push(hashedPassword)
  }
  if (phone) {
    fields.push(`"Phone" = $${idx++}`)
    values.push(phone)
  }
  if (email) {
    fields.push(`"Email" = $${idx++}`)
    values.push(email)
  }
  values.push(id)

  
  const sql = `UPDATE "User" SET ${fields.join(", ")} WHERE "Id" = $${idx}`

  console.log(sql, values);

  return new Promise((resolve, reject) => {
    con.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// 현재 위치 업데이트
exports.update_location = async (id, x, y, timestamp) => {
  const update_location_Qurey = `UPDATE "User" SET "Last_Location" = POINT($1, $2), "Last_Location_Time" =  to_timestamp($3 / 1000.0) WHERE "Id" = $4 RETURNING "Is_location_public"`

  const values = [x, y, timestamp, id];

  return new Promise((resolve, reject) => {
    con.query(update_location_Qurey, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 내 위치 공유 함 안함 할래 말래 할래 말래 할래 말래 애매하긴 해
exports.update_share_location = async (id) => {
  const update_share_location_Qurey = `UPDATE "User" SET "Is_location_public" = NOT "Is_location_public" WHERE "Id" = $1 RETURNING "Is_location_public"`

  const values = [id]

  return new Promise((resolve, reject) => {
    con.query(update_share_location_Qurey, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 회원정보 삭제
exports.delete = (id) => {
  const deleteQuery = 'DELETE FROM "User" WHERE "Id" = $1'

  const values = [id]

  return new Promise((resolve, reject) => {
    con.query(deleteQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// 아이디 찾기
exports.find_id = async (email) => {
  const deleteQuery = 'SELECT "Id" FROM "User" WHERE "Email" = $1'

  const values = [email]

  return new Promise((resolve, reject) => {
    con.query(deleteQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 튜토리얼 다시 보지 않기
exports.update_tutorial = async (id) => {
  const update_tutorial_Qurey = `UPDATE "User" SET "Is_Tutorial" = false WHERE "Id" = $1`

  const values = [id];

  return new Promise((resolve, reject) => {
    con.query(update_tutorial_Qurey, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}