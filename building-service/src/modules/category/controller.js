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
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 카테고리 검색(카테고리 이름 > 건물 위치) 메인화면에서 상단부분 필터 클릭 시
exports.getBuildingLocationsByCategory = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const category_name = req.params.category;
    const result = await Service.getBuildingLocationsByCategory(category_name);

    const rows = result.rows.map(row => ({
      ...row,
      Location: Service.parsePoint(row.Category_Location)
    }));

    res.status(200).json(rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

// 2D도면에서 필터를 선택하려면 카테고리 목록이 필요하겠지? 주는거 만들어야겠지?
exports.getCategoryListAt2D = async (req, res) => {
  try{
    logRequestInfo(req);

    const building_name = req.params.building;
    const floor_number = req.params.floor;

    const result = await Service.getCategoryListAt2D(building_name, floor_number);

    res.status(200).json(result.rows);
  } catch (err){
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

// 건물_층 2d도면에 카테고리 필터 클릭시 띄우기
exports.getCategoryLocationsAt2D = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const category = req.body.category;

    const result = await Service.getCategoryLocationsAt2D(building_name, floor_number, category);
    
    // Location 컬럼 파싱
    const rows = result.rows.map(row => ({
      Location: Service.parsePoint(row.Category_Location)
    }));

    res.status(200).json(rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

// 건물/층을 입력받아 그 층에 있는 모든 카테고리의 이름과 좌표 반환
exports.getCategoryForManager = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.building;
    const floor_number = req.params.floor;

    const result = await Service.getCategoryForManager(building_name, floor_number);

    console.log(result.rows);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};


// 카테고리 추가(2d도면에서 좌표 지정, 이름 지정을 하면, 카테고리스, floor_c에 들거가게끔)
exports.create = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const category = req.body.category;
    const x = req.body.x;
    const y = req.body.y;

    const result = await Service.create(building_name, floor_number, category, x, y);

    res.status(201).json({
      message: "카테고리 추가가 완료되었습니다",
    });
  } catch (err) {
    console.error("카테고리 추가 처리 중 오류:", err);
    res.status(500).send("카테고리 추가 처리 중 오류");
  }
}


// 카테고리 삭제: 이건 관리 페이지에서.. 목록을 보고 삭제를..
exports.delete = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const x = req.body.x;
    const y = req.body.y;

    const result = await Service.delete(building_name, floor_number, x, y);
    if (result.rowCount === 0) {
      // 삭제된 행이 없음 → 잘못된 id
      return res.status(404).send("존재하지 않는 건물/층입니다.");
    }

    res.status(200).send("카테고리 삭제 성공");
  } catch (err) {
    console.error("카테고리 삭제 처리 중 오류:", err);

    res.status(500).send("카테고리 삭제 처리 중 오류");
  }
};