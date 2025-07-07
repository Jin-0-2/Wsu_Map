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
    
    res.status(200).json(result);
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

    res.status(200).json(result);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};


exports.getFloorNames = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.building;

    const result = await Service.getFloorNames(building_name);   

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

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
  
    res.status(200).send(result);
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

      if (!floor_number || !building_name) {
        return res.status(400).send("floor_number와 building_name을 모두 입력하세요.");
      }

      let fileUrl = Service.upload(building_name, floor_number, file);// DB에 저장될 최종 파일 URL

      const result = await Service.create(building_name, floor_number, fileUrl);

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
    const building_name = req.params.building;;
    const file = req.file ? req.file.buffer : undefined;

    if (!floor_number || !building_name) {
        return res.status(400).send("floor_number와 building_name은 필수입니다.");
      }

    const result = await Service.updateFloorFile(building_name, floor_number, file);

    if (result.rowCount === 0) {
      return res.status(404).send("해당 이름의 건물/층이 없습니다.");
    }

    res.status(200).send("층 파일이 수정되었습니다.")
  } catch (err) {
    console.error("층 파일 수정 중 오류:", err);

    res.status(500).send("층 파일 수정 중 오류");
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