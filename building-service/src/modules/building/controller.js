// src/modules/building/controller.js

const Service = require("./service")
const multer = require('multer');
const upload = multer();
const { logRequestInfo } = require('../../core/logger'); // 경로는 상황에 맞게

// 건물 전체 조회
exports.getAll = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const result = await Service.getAll();

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 건물 전체 이름만 조회
exports.getNames = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const result = await Service.getNames();
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
}

// 건물 조회
exports.getBuilding_Location = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.name;

    const result = await Service.getBuilding_Location(building_name);

    // Location 컬럼 파싱
    const rows = result.rows.map(row => ({
      ...row,
      Location: Service.parsePoint(row.Location)
    }));

    res.status(200).json(rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

// 건물 조회 3D(바이너리로 전송)
exports.getBuilding_3d = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.id;

    const result = await Service.getBuilding_3d(building_name);

    if (!result.rows.length) {
      return res.status(404).send("해당 건물이 존재하지 않습니다.");
    }

    const fileBuffer = result.rows[0].File; // bytea 컬럼
    if (!fileBuffer) {
      return res.status(404).send("파일이 없습니다.");
    }

    // Content-Type 설정 (예: glb 파일)
    res.setHeader('Content-Type', 'model/gltf-binary'); // 파일 타입에 따라 변경
    res.setHeader('Content-Disposition', `attachment; filename="${building_name}.glb"`);

    res.send(fileBuffer);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 건물 추가
exports.create = [
  upload.single('file'),
  async (req, res) => {
  try {
    logRequestInfo(req);

    const { building_name, x, y, desc } = req.body
    // const file = req.file ? req.file.buffer : null; //파일이 없으면 null

    if (!building_name || !x || !y || !desc) {
      return res.status(400).send("모든 항목을 입력하세요.")
    }

    const result = await Service.create(building_name, x, y, desc);

    res.status(201).json({
      message: "건물추가가 완료되었습니다",
    });
  } catch (err) {
    console.error("건물추가 처리 중 오류:", err);

    res.status(500).send("건물추가 처리 중 오류");
  }
}]; 

// 건물 수정
exports.update = [
  upload.single('file'),
  async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.name;
    const desc  = req.body.desc;
    const file = req.file ? req.file.buffer : undefined;

    if (!desc  && !file) {
      return res.status(400).send("수정할 항목이 없습니다.")
    }

    const result = await Service.update(building_name, desc, file);

    if (result.rowCount === 0) {
      return res.status(404).send("해당 이름의 건물이 없습니다.");
    }

    res.status(200).send("건물정보가 수정되었습니다.");
  } catch (err) {
    console.error("건물정보 수정 중 오류:", err);

    res.status(500).send("건물정보 수정 중 오류");
  }
}]; 

// 건물 삭제  애매해! ㅈㄴ 애매해! 다 지워야해 ! ㅈㄴ 애매해!
exports.delete = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const building_name  = req.params.name;

    const result = await Service.delete(building_name);
    if (result.rowCount === 0) {
      // 삭제된 행이 없음 → 잘못된 id
      return res.status(404).send("존재하지 않는 건물입니다.");
    }

    res.status(200).send("건물 삭제 성공");
  } catch (err) {
    console.error("건물 삭제 처리 중 오류:", err);

    res.status(500).send("건물 삭제 처리 중 오류");
  }
};