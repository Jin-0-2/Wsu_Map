// src/modules/inquiry/service.js

const con = require("../../core/db");

// 문의하기 전체 목록 조회
exports.getAll = () => {
  const query = `
    SELECT i.*, u."Name" as user_name 
    FROM "Inquiry" i 
    LEFT JOIN "User" u ON i."User_Id" = u."Id" 
    ORDER BY i."Created_At" DESC
  `;

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows);
    });
  });
};

// 문의하기 ID로 조회
exports.getById = (id) => {
  const query = `
    SELECT i.*, u."Name" as user_name 
    FROM "Inquiry" i 
    LEFT JOIN "User" u ON i."User_Id" = u."Id" 
    WHERE i."Id" = $1
  `;
  const values = [id];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows[0]);
    });
  });
};

// 사용자별 문의하기 목록 조회
exports.getByUserId = (userId) => {
  const query = `
    SELECT i.*, u."Name" as user_name 
    FROM "Inquiry" i 
    LEFT JOIN "User" u ON i."User_Id" = u."Id" 
    WHERE i."User_Id" = $1 
    ORDER BY i."Created_At" DESC
  `;
  const values = [userId];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows);
    });
  });
};

// 문의하기 작성
exports.create = (userId, title, content, category = 'general') => {
  const query = `
    INSERT INTO "Inquiry" ("User_Id", "Title", "Content", "Category", "Status") 
    VALUES ($1, $2, $3, $4, 'pending') 
    RETURNING *
  `;
  const values = [userId, title, content, category];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows[0]);
    });
  });
};

// 문의하기 수정
exports.update = (id, title, content, category) => {
  const query = `
    UPDATE "Inquiry" 
    SET "Title" = $1, "Content" = $2, "Category" = $3, "Updated_At" = NOW() 
    WHERE "Id" = $4 
    RETURNING *
  `;
  const values = [title, content, category, id];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows[0]);
    });
  });
};

// 문의하기 삭제
exports.delete = (id) => {
  const query = 'DELETE FROM "Inquiry" WHERE "Id" = $1 RETURNING *';
  const values = [id];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows[0]);
    });
  });
};

// 문의하기 상태 업데이트 (관리자용)
exports.updateStatus = (id, status, adminResponse = null) => {
  const query = `
    UPDATE "Inquiry" 
    SET "Status" = $1, "Admin_Response" = $2, "Updated_At" = NOW() 
    WHERE "Id" = $3 
    RETURNING *
  `;
  const values = [status, adminResponse, id];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows[0]);
    });
  });
};

// 카테고리별 문의하기 조회
exports.getByCategory = (category) => {
  const query = `
    SELECT i.*, u."Name" as user_name 
    FROM "Inquiry" i 
    LEFT JOIN "User" u ON i."User_Id" = u."Id" 
    WHERE i."Category" = $1 
    ORDER BY i."Created_At" DESC
  `;
  const values = [category];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows);
    });
  });
};

// 상태별 문의하기 조회
exports.getByStatus = (status) => {
  const query = `
    SELECT i.*, u."Name" as user_name 
    FROM "Inquiry" i 
    LEFT JOIN "User" u ON i."User_Id" = u."Id" 
    WHERE i."Status" = $1 
    ORDER BY i."Created_At" DESC
  `;
  const values = [status];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows);
    });
  });
}; 