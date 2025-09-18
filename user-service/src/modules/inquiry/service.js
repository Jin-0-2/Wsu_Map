// src/modules/inquiry/service.js

const con = require("../../core/db");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-southeast-2",
});

const CATEGORY_MAP = {
  other: '기타 문의',
  bug: '버그 신고',
  route_error: '경로 안내 오류',
  place_error: '장소/정보 오류',
  feature: '기능 제안',
};

// 문의하기 전체 목록 조회
exports.getAll = async () => {
  const query = `
    SELECT *
    FROM "Inquiry"
    ORDER BY "Created_At" DESC
  `;

  try {
    const result = await con.query(query);
    return result;
  } catch (err) {
    throw err;
  }
};

// 내 문의 조회
exports.getById = async (id) => {
  const query = `
    SELECT *
    FROM "Inquiry" 
    WHERE "User_Id" = $1
  `;

  try {
    const result = await con.query(query, [id]);
    return result.rows;
  } catch (err) {
    throw err;
  }
};

// 문의하기 작성
exports.create = async (userId, title, content, category, inquiry_code, fileUrl = null) => {
  const query = `
    INSERT INTO "Inquiry" ("User_Id", "Category", "Inquiry_Code", "Title", "Content", "Image_Path", "Created_At", "Status") 
    VALUES ($1, $2, $3, $4, $5, $6, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'), 'pending') 
    RETURNING *
  `;

  try {
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

exports.mapCategory = (category) => {
  return CATEGORY_MAP[category] || '기타 문의';
}

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

// 문의 코드로 문의 사진 조회
exports.getByInquiryCode = async (inquiry_code) => {
  const query = `
    SELECT "Image_Path" FROM "Inquiry" WHERE "Inquiry_Code" = $1
  `;

  try {
    const result = await con.query(query, [inquiry_code]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

// S3에서 문의 사진 삭제
exports.deleteImageFromS3 = (imageUrl) => {
  // imageUrl이 null이거나 undefined인 경우 처리
  if (!imageUrl) {
    console.log('이미지 URL이 없습니다. S3 삭제를 건너뜁니다.');
    return Promise.resolve();
  }

  const bucketName = "wsu-svg";
  const key = imageUrl.split('.com/')[1];

  console.log(key);

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return s3Client.send(command);
}

// 문의하기 삭제
exports.delete = async (id, inquiry_code) => {
  const query = 'DELETE FROM "Inquiry" WHERE "User_Id" = $1 AND "Inquiry_Code" = $2 RETURNING *';

  try {
    const result = await con.query(query, [id, inquiry_code]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

// 답글 달기
exports.answer = async (inquiry_code, answer) => {
  const query = `
    UPDATE "Inquiry" 
    SET "Status" = 'answered', "Answer" = $1, "Answered_At" = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') 
    WHERE "Inquiry_Code" = $2 
    RETURNING *
  `;

  try {
    const result = await con.query(query, [answer, inquiry_code]);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};