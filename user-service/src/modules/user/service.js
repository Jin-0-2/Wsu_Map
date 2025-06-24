// Eun **************
// User.js
const con = require("../../core/dbConnect")

// 회원 전체 조회
exports.getAll = () => {
  const query = 'SELECT * FROM "User"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 회원가입
exports.register = (id, pw, name, stu_number, phone, email, type_id) => {
  const insertQuery = `
    INSERT INTO "User" ("Id", "Pw", "Name", "Stu_Number", "Phone", "Email", "Type_Id")
    VALUES ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING "User_Id"
  `
  const values = [id, pw, name, stu_number, phone, email, type_id]

  return new Promise((resolve, reject) => {
    con.query(
      insertQuery, values, (err, result) => {
        if (err) {
          // 중복(유니크 제약 위반) 에러코드: 23505
          if (err.code === '23505') {
            return resolve({ duplicate: true });
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
  const selectQuery    = `SELECT "User_Id", "Name", "Type_Id" FROM "User" WHERE "Id" = $1 AND "Pw" = $2`
  const updateQuery    = 'UPDATE "User" SET "IsLogin" = true WHERE "Id" = $1'
  const getApiKeyQuery = 'SELECT "APIkey" FROM "APIkey" WHERE "User_Id" = $1'

  const values = [id, pw]
  const values2 = [id]

  return new Promise((resolve, reject) => {
    // 1. 사용자 조회
    con.query(selectQuery, values, (err, result) => {
      if (err) return reject(err);
      if (result.rows.length === 0) return resolve({ notfound: true });

      console.log(result.rows[0]); // 실제 반환되는 키 확인!

      const { User_Id, Name, Type_Id } = result.rows[0];
      console.log(User_Id, Name, Type_Id)

      // 2. 로그인 상태 업데이트 (비동기, 실패해도 로그인은 진행)
      con.query(updateQuery, values2, (err) => {
        if (err) console.error("IsLogin 업데이트 실패:", err);
        // 3. API키 가져오기
        con.query(getApiKeyQuery, [User_Id], (err, result) => {
          if (err) return reject(err);
          console.log(result)
          if (result.rows.length === 0) return resolve({ notfound: true });
          return resolve({
            apikey: result.rows[0].apikey || result.rows[0].APIkey,
            user_id: User_Id,
            name: Name,
            type_id: Type_Id
          });
        });
      });
    });
  });
};

// 로그아웃
exports.logout = (id) => {
  const updateQuery = 'UPDATE "User" SET "IsLogin" = false WHERE "Id" = $1'

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
    fields.push(`Pw = $${idx++}`)
    values.push(pw)
  }
  if (phone) {
    fields.push(`Phone = $${idx++}`)
    values.push(phone)
  }
  if (email) {
    fields.push(`Email = $${idx++}`)
    values.push(email)
  }
  values.push(id)

  const sql = `UPDATE "User" SET ${fields.join(", ")} WHERE Id = $${idx}`

  return new Promise((resolve, reject) => {
    con.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};