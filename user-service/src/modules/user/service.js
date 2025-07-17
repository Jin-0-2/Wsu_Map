// src/modules/user/service.js

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
exports.register = (id, pw, name, stu_number, phone, email) => {
  const insertQuery = `
    INSERT INTO "User" ("Id", "Pw", "Name", "Stu_Num", "Phone", "Email")
    VALUES ($1, $2, $3, $4, $5, $6)
  `
  const values = [id, pw, name, stu_number, phone, email]

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

// 로그인
exports.login = (id, pw) => {
  const selectQuery    = `SELECT * FROM "User" WHERE "Id" = $1 AND "Pw" = $2`
  const updateQuery    = 'UPDATE "User" SET "Is_Login" = true WHERE "Id" = $1 RETURNING "Is_Login";'

  const values = [id, pw]
  const values2 = [id]

  return new Promise((resolve, reject) => {
    // 1. 사용자 조회
    con.query(selectQuery, values, (err, result) => {
      if (err) return reject(err);
      if (result.rows.length === 0) return resolve({ notfound: true });

      console.log(result.rows[0]); // 실제 반환되는 키 확인!

      const { Id, Name } = result.rows[0];

      // 2. 로그인 상태 업데이트 (비동기, 실패해도 로그인은 진행)
      con.query(updateQuery, values2, (err, result) => {
        if (err) console.error("IsLogin 업데이트 실패:", err);

        return resolve({
          id: Id,
          name: Name,
          islogin: result.rows[0].Is_Login
        })
      });
    });
  });
};

// 로그아웃
exports.logout = (id) => {
  const updateQuery = 'UPDATE "User" SET "Is_Login" = false WHERE "Id" = $1'

  const values = [id]

  return new Promise((resolve, reject) => {
    con.query(updateQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// 회원정보 수정
exports.update = (id, pw, phone, email) => {
  let fields = []
  let values = []
  let idx = 1

  if (pw) {
    fields.push(`"Pw" = $${idx++}`)
    values.push(pw)
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
  const update_location_Qurey = `UPDATE "User" SET "Last_Location" = POINT($1, $2), "Last_Location_Time" =  to_timestamp($3 / 1000.0) WHERE "Id" = $4`

  const values = [x, y, timestamp, id];

  return new Promise((resolve, reject) => {
    con.query(update_location_Qurey, values, (err, result) => {
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