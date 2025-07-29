// src/modules/building/service.js

const con = require("../../core/db")
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-southeast-2",
});

// 건물 전체 조회
exports.getAll = () => {
  const query = `
  SELECT *
  FROM "Building"
  ORDER BY
    -- 1. 'W'로 시작하는 건물과 그 외 건물을 그룹으로 나눔
    CASE
        WHEN "Building_Name" LIKE 'W%' THEN 1
        ELSE 2
    END,
    -- 2. 'W' 건물 그룹 내에서 숫자 부분만 추출하여 숫자로 변환 후 정렬
    CASE
        WHEN "Building_Name" LIKE 'W%' THEN CAST(substring("Building_Name" from 'W([0-9]+)') AS INTEGER)
    END,
    -- 3. 같은 번호의 W건물(W17-동관, W17-서관)과 한글 건물들을 이름순으로 정렬
    "Building_Name";
`

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물 이름만 조회
exports.getNames = () => {
  const query = 'SELECT "Building_Name" FROM "Building"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물 조회
exports.getBuilding_Location = (building_name) => {
  const query = 'SELECT "Building_Name", "Location", "Description" FROM "Building" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// point형식 x, y로 파싱
exports.parsePoint = (pointStr) => {
  // "(37.123,128.456)" → { x: 37.123, y: 128.456 }
  const match = pointStr.match(/\((.*),(.*)\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
};

// 빌딩 이미지 S3에 업로드
exports.uploadImage = async (building_name, image) => {
  if (image) {
    const bucketName = "wsu-svg";
    const timestamp = Date.now();
    // buildings 폴더에 이미지 저장 (타임스탬프 추가)
    const key = `buildings/${building_name}_${timestamp}.jpg`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: image.buffer,
      ContentType: 'image/jpeg',
    });

    await s3Client.send(command);

    return `https://${bucketName}.s3.ap-southeast-2.amazonaws.com/${key}`;
  }
  return null;
};

// 건물 추가
exports.create = (building_name, x, y, desc, imageUrls) => {
  const insertQuery = `
    INSERT INTO "Building" ("Building_Name", "Location", "Description", "Image")
    VALUES ($1, point($2, $3), $4, $5) 
  `
  const values = [building_name, x, y, desc, imageUrls]

  return new Promise((resolve, reject) => {
    con.query(insertQuery, values, (err, result) => {
        if (err)  return reject(err);
        resolve(result);
    });
  });
};

// 건물 정보 수정(동적 쿼리)
exports.update = async (building_name, desc, newImageUrls) => {
  // 1. 기존 이미지들 가져오기
  const existingBuilding = await this.getBuilding(building_name);
  const existingImageUrls = existingBuilding.Image || [];

  // 2. 새로운 이미지가 있으면 기존 것에 추가, 없으면 기존 것 유지
  const finalImageUrls = newImageUrls.length > 0 
    ? [...existingImageUrls, ...newImageUrls] 
    : existingImageUrls;

  const sql = `UPDATE "Building" SET "Description" = $1, "Image" = $2 WHERE "Building_Name" = $3`;

  const values = [desc, finalImageUrls, building_name]

  return new Promise((resolve, reject) => {
    con.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// 건물 정보 조회 (삭제용)
exports.getBuilding = (building_name) => {
  const query = 'SELECT "Image" FROM "Building" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.rows[0]); // 첫 번째 행 반환
    });
  });
};

// S3에서 이미지 삭제
exports.deleteImageFromS3 = async (imageUrl) => {
  try {
    const bucketName = "wsu-svg";
    // URL에서 key 추출: https://bucket.s3.region.amazonaws.com/key
    const key = imageUrl.split('.com/')[1];
    console.log("S3 파일 삭제:",key);
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(deleteCommand);
    console.log(`S3 파일 삭제 성공: ${key}`);
    return true;
  } catch (err) {
    console.error(`S3 파일 삭제 실패: ${err.message}`);
    return false;
  }
};

// 건물 삭제  걸린거 다 지워야하는데 ㅈㄴ 애매해! ㄹㅇ 개 애매해!
exports.delete = (building_name) => {
  const deleteQuery = 'DELETE FROM "Building" WHERE "Building_Name" = $1'

  const values = [building_name]

  return new Promise((resolve, reject) => {
    con.query(deleteQuery, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// point형식 x, y로 파싱
exports.parsePoint = (pointStr) => {
  // "(37.123,128.456)" → { x: 37.123, y: 128.456 }
  const match = pointStr.match(/\((.*),(.*)\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
};


// 건물 이미지 삭제
exports.deleteImage = async (building_name, image_url) => {
  // 1. 기존 이미지들 가져오기
  const existingBuilding = await this.getBuilding(building_name);
  const existingImageUrls = existingBuilding.Image || [];

  console.log("삭제할 이미지:",image_url);

  console.log("기존 이미지들:",existingImageUrls);

  // 2. 삭제할 이미지들을 제외한 새 배열 생성
  const finalImageUrls = existingImageUrls.filter(url => !image_url.includes(url));

  console.log("삭제 후 이미지들:",finalImageUrls);

  // 3. S3에서 이미지 삭제
  // image_url 배열의 각 요소를 S3에서 삭제
  for (const url of image_url) {
    console.log("S3 파일 삭제:", url);
    await this.deleteImageFromS3(url);
  }

  // 4. DB 업데이트
  const sql = `UPDATE "Building" SET "Image" = $1 WHERE "Building_Name" = $2`;
  const values = [finalImageUrls, building_name];

  return new Promise((resolve, reject) => {
    con.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};