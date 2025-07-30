// src/modules/inquiry/service.js

const con = require("../../core/db");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-southeast-2",
});

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
exports.create = (userId, title, content, category, inquiry_code, fileUrl = null) => {
  const query = `
    INSERT INTO "Inquiry" ("User_Id", "Category", "Inquiry_Code", "Title", "Content", "Image_Path", "Created_At", "Status", "Answer", "Answer_At") 
    VALUES ($1, $2, $3, $4, $5, $6, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'), 'pending', $7, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')) 
    RETURNING *
  `;
  const values = [userId, category, inquiry_code, title, content, fileUrl];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows[0]);
    });
  });
};

// 사진 업로드
exports.uploadFile = async (inquiry_code, file) => {
  if (file) {
    const bucketName = "wsu-svg"; // 실제 S3 버킷 이름으로 변경하세요.
    // 파일 이름을 고유하게 생성합니다 (예: 도면/w19_1.svg)
    const key = `inquiry/${inquiry_code}.jpg`;

    // 2. S3 업로드 명령을 준비합니다.
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer, // 파일의 버퍼 데이터
      ContentType: 'image/jpeg', // SVG 파일의 Content-Type 설정 (매우 중요!)
    });

    // 3. S3로 파일을 전송합니다.
    await s3Client.send(command);

    // 4. DB에 저장할 객체 URL을 생성합니다.
    return `https://${bucketName}.s3.ap-southeast-2.amazonaws.com/${key}`;
  }
}

// 문의 코드 생성
exports.createInquiryCode = (category) => {
  // category에 따라 문의 코드를 생성합니다.
  // N: 경로 안내 오류, P: 장소/정보 오류, B: 버그 신고, S: 기능 제안, G: 기타 문의
  let prefix = '';
  switch (category) {
    case '경로 안내 오류':
      prefix = 'N';
      break;
    case '장소/정보 오류':
      prefix = 'P';
      break;
    case '버그 신고':
      prefix = 'B';
      break;
    case '기능 제안':
      prefix = 'S';
      break;
    case '기타 문의':
      prefix = 'G';
      break;
    default:
      prefix = 'G';
  }

  // 날짜 6자리(YYMMDD) + 랜덤 4자리(영어/숫자)
  const now = new Date();
  const yymmdd = now.toISOString().slice(2,10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${yymmdd}${random}`;
}

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
exports.delete = (id, inquiry_code) => {
  const query = 'DELETE FROM "Inquiry" WHERE "Id" = $1 AND "Inquiry_Code" = $2 RETURNING *';
  const values = [id, inquiry_code];

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

// 답글 달기
exports.answer = (inquiry_code, answer) => {
  const query = `
    UPDATE "Inquiry" 
    SET "Status" = 'answered', "Answer" = $1, "Answer_At" = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') 
    WHERE "Inquiry_Code" = $2 
    RETURNING *
  `;
  const values = [answer, inquiry_code];

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows[0]);
    });
  });
};