// src/modules/floor/controller.js

const Service = require("./service")
const multer = require('multer');
const upload = multer();
const { logRequestInfo } = require('../../core/logger'); // 경로는 상황에 맞게

// 전체 조회
exports.getAll = async (req, res) => {
  try {
    logRequestInfo(req);

    const result = await Service.getAll();

     // file(Buffer) → Base64로 변환
    const floors = result.rows.map(row => ({
      ...row,
      file: row.File ? row.File.toString('base64') : null
    }));
    
    res.status(200).json(floors);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 건물 별 층 조회 (2d)
exports.getFloors = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.building;

    const result = await Service.getFloors(building_name);

     // file(Buffer) → Base64로 변환
    const floors = result.rows.map(row => ({
      ...row,
      file: row.File ? row.File.toString('base64') : null
    }));
    /*
    [
      {
        floor: 1,
        building: "w15",
        file: "iVBORw0KGgoAAAANSUhEUgAA..." // Base64 인코딩된 PNG 데이터
      },
      {
        floor: 2,
        building: "w15",
        file: "iVBORw0KGgoAAAANSUhEUgAA..." // Base64 인코딩된 PNG 데이터
      }
    ]
    */
    console.log(floors);
    res.status(200).json(floors);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

// 층 조회 (2d), 하나만
exports.getFloorNumber = async (req, res) => {
  try {
    logRequestInfo(req);

    const floor = req.params.floor;
    const building_name = req.params.building;

    const result = await Service.getFloorNumber(floor, building_name);

    if (!result.rows.length) {
      return res.status(404).send("해당 층 도면이 없습니다.");
    }
    
    const fileBuffer = result.rows[0].File; // bytea 컬럼
    if (!fileBuffer) {
      return res.status(404).send("도면 파일이 없습니다.");
    }

    // Content-Type: PNG
    res.setHeader('Content-Type', 'image/png');
    // 파일명 예시: W15_2층.png
    res.setHeader('Content-Disposition', `inline; filename="${building_name}_${floor}.png"`);

    res.status(200).send(fileBuffer);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

// 층 추가
exports.create = [
  upload.single('file'),
  async (req, res) => {
  try {
    logRequestInfo(req);

    const { building_name, floor_number } = req.body
    const file = req.file ? req.file.buffer : null; //파일이 없으면 null
    console.log(`${building_name}, ${floor_number}`)

    if (!floor_number || !building_name) {
        return res.status(400).send("floor_number와 building_name을 모두 입력하세요.");
    }

    const result = await Service.create(building_name, floor_number, file);

    res.status(201).json({
        message: "층 추가가 완료되었습니다",
      });
    } catch (err) {
      console.error("층 추가 처리 중 오류:", err);
      res.status(500).send("층 추가 처리 중 오류");
    }
  }
];

// 층 수정
exports.update = [
  upload.single('file'),
  async (req, res) => {
  try {
    logRequestInfo(req);

    const floor_number = req.params.floor;
    const building_name = req.params.building;
    const file = req.file ? req.file.buffer : undefined;

    if (!floor_number || !building_name) {
        return res.status(400).send("floor_number와 building_name은 필수입니다.");
      }

    const result = await Service.update(building_name, floor_number, file);

    if (result.rowCount === 0) {
      return res.status(404).send("해당 이름의 건물이 없습니다.");
    }

    res.status(200).send("건물정보가 수정되었습니다.");
  } catch (err) {
    console.error("건물정보 수정 중 오류:", err);

    res.status(500).send("건물정보 수정 중 오류");
  }
}]; 

// 층 삭제
exports.delete = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const floor_number = req.params.floor;
    const building_name  = req.params.building;

    const result = await Service.delete(building_name, floor_number);
    if (result.rowCount === 0) {
      // 삭제된 행이 없음 → 잘못된 id
      return res.status(404).send("존재하지 않는 층입니다.");
    }

    res.status(200).send("층 삭제 성공");
  } catch (err) {
    console.error("층 삭제 처리 중 오류:", err);

    res.status(500).send("층 삭제 처리 중 오류");
  }
};