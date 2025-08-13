// src/modules/floor/service.js

const con = require("../../core/db")
const cheerio = require('cheerio')

const { S3Client, PutObjectCommand, DeleteObjectCommand  } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-southeast-2", // 예: 서울 리전
  // 체크섬 검증 비활성화 (XAmzContentSHA256Mismatch 오류 해결)
  disableHostPrefix: true,
  maxAttempts: 3, // 재시도 횟수
  // 추가 설정으로 체크섬 문제 해결
  requestHandler: {
    httpOptions: {
      timeout: 30000, // 30초 타임아웃
    }
  },
  // 체크섬 미들웨어 비활성화
  disableBodySigning: true,
});

// 층 전체 조회
exports.getAll = () => {
  const query = `
    SELECT *
    FROM "Floor"
    ORDER BY
      -- W 뒤 숫자 추출
      CAST(REGEXP_REPLACE("Building_Name", '[^0-9]', '', 'g') AS INTEGER),
      
      -- 동관/서관 정렬 (동관 1, 서관 2, 기타 0)
      CASE
        WHEN "Building_Name" LIKE '%동관%' THEN 1
        WHEN "Building_Name" LIKE '%서관%' THEN 2
        ELSE 0
      END,
      
      -- 층 정렬: B(지하)은 음수 처리, 나머지는 숫자로 변환
      CAST(
        CASE
          WHEN "Floor_Number" ~ '^B[0-9]+$'
            THEN '-' || REGEXP_REPLACE("Floor_Number", '[^0-9]', '', 'g')
          ELSE REGEXP_REPLACE("Floor_Number", '[^0-9]', '', 'g')
        END
      AS INTEGER)
  ;`;

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

    try {
      // 파일 버퍼 검증
      if (!file.buffer || file.buffer.length === 0) {
        throw new Error('파일 버퍼가 비어있습니다.');
      }

      console.log('파일 크기:', file.buffer.length, 'bytes');
      console.log('파일 이름:', file.originalname || '이름 없음');
      console.log('MIME 타입:', file.mimetype || '타입 없음');
      
      // 파일 확장자 검증 (multer에서 originalname이 없을 수 있음)
      if (file.originalname && !file.originalname.toLowerCase().endsWith('.svg')) {
        throw new Error('SVG 파일만 업로드 가능합니다.');
      }
      
      // originalname이 없어도 MIME 타입으로 검증
      if (file.mimetype && !file.mimetype.includes('svg')) {
        console.log('MIME 타입으로 검증: SVG가 아닌 파일 타입 감지');
        // throw new Error('SVG 파일만 업로드 가능합니다.');
      }

      // 파일 내용을 UTF-8로 변환하여 검증
      const svgContent = file.buffer.toString('utf-8');
      console.log('파일 내용 (처음 200자):', svgContent.substring(0, 200));
      
      // SVG 태그 검증
      if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
        throw new Error('유효하지 않은 SVG 파일입니다.');
      }

      // 2. S3 업로드 명령을 준비합니다.
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: Buffer.from(svgContent, 'utf-8'), // 정제된 내용을 UTF-8로 다시 변환
        ContentType: 'image/svg+xml', // SVG 파일의 Content-Type 설정
        ContentLength: Buffer.from(svgContent, 'utf-8').length, // 정확한 길이 설정
        CacheControl: 'public, max-age=31536000', // 캐시 설정
        // 체크섬 검증 비활성화
        ChecksumAlgorithm: undefined,
      });

      // 3. S3로 파일을 전송합니다.
      await s3Client.send(command);
      console.log(`S3 업로드 성공: ${key}`);
      console.log(`업로드된 파일 크기: ${Buffer.from(svgContent, 'utf-8').length} bytes`);
      console.log(`업로드된 파일 URL: https://${bucketName}.s3.ap-southeast-2.amazonaws.com/${key}`);

      // 4. DB에 저장할 객체 URL을 생성합니다.
      return `https://${bucketName}.s3.ap-southeast-2.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 업로드 오류:', error);
      throw new Error(`파일 업로드 실패: ${error.message}`);
    }
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
  // Buffer 타입에 따른 문자열 변환
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

  // Cheerio로 XML 파싱
  const $ = cheerio.load(svgString, { xmlMode: true });

  const nodes = [];
  const categories = [];

  // SVG 레이어 찾기
  const navigationLayer = $('[id="Navigation_Nodes"]'); // 강의실 노드 레이어
  const categoryLayer = $('[id="Category"]');           // 편의시설 레이어

  // 레이어 존재 확인
  if (navigationLayer.length === 0) {
    console.log("'Navigation_Nodes' ID를 가진 레이어(그룹)를 찾을 수 없습니다.");
    return [];
  }

  // 강의실 노드 추출 (circle, ellipse 태그)
  navigationLayer.find('circle, ellipse').each((index, element) => {
    const elem = $(element);
    const nodeId = elem.attr('id'); // 강의실 번호
    let x, y;

    // circle/ellipse의 중심 좌표 추출
    if (element.tagName.toLowerCase() === 'circle' || element.tagName.toLowerCase() === 'ellipse') {
      // circle 태그의 경우 cx, cy 속성이 중심 좌표입니다.
      x = parseFloat(elem.attr('cx'));
      y = parseFloat(elem.attr('cy'));
    }

    // 유효한 데이터만 저장
    if (nodeId && !isNaN(x) && !isNaN(y)) {
      nodes.push({ nodeId, x, y });
    }
  });

  // 편의시설 카테고리 매핑 (DB 참조)
  const categoryNameMap = {
    cafe: "카페",
    restaurant: "식당",
    convenience: "편의점",
    vending: "자판기",
    water_purifier: "정수기",
    printer: "프린터",
    lounge: "라운지",
    bank: "은행(atm)",
    fire_extinguisher: "소화기",
    gym: "헬스장",
    bookstore: "서점",
    post: "우체국",
  };

  // 편의시설 노드 추출 (rect 태그)
   categoryLayer.find('rect').each((index, element) => {
     const elem = $(element);
     const nodeId = elem.attr('id');
     const x = parseFloat(elem.attr('x'));
     const y = parseFloat(elem.attr('y'));

     if(nodeId) {
      const categoryKey = nodeId.replace(/-\d+$/, ''); // 숫자 제거 (예: cafe-1 → cafe), 동일한 편의시설은 여러개 있을 수 있으나, Id는 유일하기 때문
      const categoryName = categoryNameMap[categoryKey] || categoryKey;
      categories.push({nodeId: categoryName, x, y});
   }
   });

  console.log(`SVG 파싱 완료: 총 ${nodes.length}개의 네비게이션 노드를 추출했습니다.`);
  return {nodes, categories};
};
