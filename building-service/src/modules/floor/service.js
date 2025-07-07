// src/modules/floor/service.js

const con = require("../../core/db")

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-northeast-2", // 예: 서울 리전
});

// 층 전체 조회
exports.getAll = () => {
  const query = 'SELECT * FROM "Floor"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물 별 층 조회 (2d)
exports.getFloors = (building_name) => {
  const query = 'SELECT * FROM "Floor" WHERE "Building_Name" = $1 ORDER BY "Floor_Number";'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

exports.getFloorNames = (building_name) => {
  const query = 'SELECT "Floor_Number" FROM "Floor" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 층 조회 (2d), 하나만
exports.getFloorNumber = (floor, building_name) => {
  const query = 'SELECT "File" FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2'

  const values = [building_name, floor]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 층 도면 aws에 추가
exports.uploadFile = async (building_name, floor_number, file) => {
  if (file) {
    const bucketName = "wsu-map-svg"; // 실제 S3 버킷 이름으로 변경하세요.
    // 파일 이름을 고유하게 생성합니다 (예: 도면/w19_1.svg)
    const key = `${building_name}_${floor_number}.svg`;

    // 2. S3 업로드 명령을 준비합니다.
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer, // 파일의 버퍼 데이터
      ContentType: 'image/svg+xml', // SVG 파일의 Content-Type 설정 (매우 중요!)
    });

    // 3. S3로 파일을 전송합니다.
    await s3Client.send(command);

    // 4. DB에 저장할 객체 URL을 생성합니다.
    return fileUrl = `https://${bucketName}.s3.${s3Client.config.region}.amazonaws.com/${key}`;
  }
}

// 층 추가
exports.create = (building_name, floor_number, file) => {
  const insertQuery = `
    INSERT INTO "Floor" ("Floor_Number", "Building_Name", "File")
    VALUES ($1, $2, $3)
  `;
  const values = [floor_number, building_name, file ?? null]

  return new Promise((resolve, reject) => {
    con.query(insertQuery, values, (err, result) => {
        if (err)  return reject(err);
        resolve(result);
    });
  });
};

// 층 정보 수정
exports.updateFloorFile = (building_name, floor_number, file) => {
  return this.uploadFile(building_name, floor_number, file)
};

// 층 삭제
exports.delete = async (building_name, floor_number) => {
  const bucketName = "wsu-map-svg";
  const s3Key = `${building_name}_${floor_number}.svg`;

  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    await s3Client.send(deleteCommand);
    console.log(`S3 파일 삭제 성공: s3://${bucketName}/${s3Key}`);

    const deleteQuery = 'DELETE FROM "Floor" WHERE "Building_Name" = $1 AND "Floor_Number" = $2'

    const values = [building_name, floor_number]

    return new Promise((resolve, reject) => {
      con.query(deleteQuery, values, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  } catch (err) {
    console.error("삭제 처리 중 오류:", err);
    // S3 삭제 또는 DB 삭제 중 오류 발생 시, 적절한 에러 처리 필요
    // 예를 들어, S3 삭제는 성공했으나 DB 삭제가 실패한 경우 롤백 처리 로직 고려
    throw err; // 오류를 다시 던져서 상위 호출자에게 알림
  }
};