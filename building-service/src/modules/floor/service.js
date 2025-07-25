// src/modules/floor/service.js

const con = require("../../core/db")
const cheerio = require('cheerio')

const { S3Client, PutObjectCommand, DeleteObjectCommand  } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-southeast-2", // 예: 서울 리전
});

// 층 전체 조회
exports.getAll = () => {
  const query = `
  SELECT *
  FROM "Floor"
  ORDER BY
  -- W 뒤 숫자 추출
  CAST(REGEXP_REPLACE("Building_Name", '[^0-9]', '', 1, 0) AS INTEGER),
  -- 동관/서관 정렬(동관 먼저, 서관 나중이면)
  CASE
    WHEN "Building_Name" LIKE '%동관%' THEN 1
    WHEN "Building_Name" LIKE '%서관%' THEN 2
    ELSE 0
  END,
  CAST("Floor_Number" AS INTEGER)
;`

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
  const query = 'SELECT "Floor_Number" FROM "Floor" WHERE "Building_Name" = $1 ORDER BY "Floor_Number"'

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
    const bucketName = "wsu-svg"; // 실제 S3 버킷 이름으로 변경하세요.
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
    return `https://${bucketName}.s3.ap-southeast-2.amazonaws.com/${key}`;
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
  const bucketName = "wsu-svg";
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

// svg 파일 파싱
exports.parseNavigationNodes = (svgBuffer) => {
  if (!svgBuffer) {
    console.log("SVG 파일 데이터가 없습니다.");
    return [];
  }

  let svgString;
  // svgBuffer가 Buffer 타입인지 ArrayBuffer 타입인지 확인하여 적절하게 변환합니다.
  if (svgBuffer instanceof Buffer) {
    svgString = svgBuffer.toString('utf-8');
  } else if (svgBuffer instanceof ArrayBuffer) {
    const decoder = new TextDecoder('utf-8');
    svgString = decoder.decode(svgBuffer);
  } else {
    // 예상치 못한 타입일 경우 처리
    console.log("CRITICAL: svgBuffer의 타입이 예상과 다릅니다.", typeof svgBuffer);
    return [];
  }

  const $ = cheerio.load(svgString, { xmlMode: true });

  const nodes = [];
  const categories = [];

  // 1. id가 'navigationNode'인 그룹(g 태그)을 찾습니다.
  const navigationLayer = $('[id="Navigation_Nodes"]');
  const categoryLayer = $('[id="Category"]');


  if (navigationLayer.length === 0) {
    console.log("'Navigation_Nodes' ID를 가진 레이어(그룹)를 찾을 수 없습니다.");
    return [];
  }

  // 2. 해당 그룹 내부에 있는 모든 circle과 rect 태그를 찾습니다.
  navigationLayer.find('circle, ellipse').each((index, element) => {
    const elem = $(element);
    const nodeId = elem.attr('id');
    let x, y;

    // 3. 태그 종류에 따라 좌표를 추출합니다.
    if (element.tagName.toLowerCase() === 'circle' || element.tagName.toLowerCase() === 'ellipse') {
      // circle 태그의 경우 cx, cy 속성이 중심 좌표입니다.
      x = parseFloat(elem.attr('cx'));
      y = parseFloat(elem.attr('cy'));
    }

    // 4. ID와 좌표가 유효한 경우에만 배열에 추가합니다.
    if (nodeId && !isNaN(x) && !isNaN(y)) {
      nodes.push({ nodeId, x, y });
    }
  });

  const categoryNameMap = {
    lounge: "라운지",
    water_purifier: "정수기",
    fire_extinguisher: "소화기",
    printer: "프린터"
  };

  // 3. 해당 그룹 내부에 있는 모든 circle과 reat 태그를 찾기
   categoryLayer.find('rect').each((index, element) => {
     const elem = $(element);
     const nodeId = elem.attr('id');
     const x = parseFloat(elem.attr('x'));
     const y = parseFloat(elem.attr('y'));

     if(nodeId) {
      const categoryKey = nodeId.replace(/-\d+$/, '');
      const categoryName = categoryNameMap[categoryKey] || categoryKey;
      categories.push({nodeId: categoryName, x, y});
   }
   });

  console.log(`SVG 파싱 완료: 총 ${nodes.length}개의 네비게이션 노드를 추출했습니다.`);
  return {nodes, categories};
};
