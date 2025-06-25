// src/modules/floor/controller.js

const Service = require("./service")
const multer = require('multer');
const upload = multer();

// 전체 조회
exports.getAll = async (req, res) => {
  try {
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

// 건물_층 2d도면에 카테고리 필터 클릭시 띄우기
exports.getCategoryLocationsAt2D = async (req, res) => {
  try {
    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const category = req.body.category;

    const result = await Service.getCategoryLocationsAt2D(building_name, floor_number, category);
    
    // Location 컬럼 파싱
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

// 카테고리 추가(2d도면에서 좌표 지정, 이름 지정을 하면, 카테고리스, floor_c에 들거가게끔)
exports.create = async (req, res) => {
  try {
    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const category = req.body.category;
    const x = req.body.x;
    const y = req.body.y;

    const result = await Service.create(building_name, floor_number, category, x, y);

    res.status(201).json({
      message: "층 추가가 완료되었습니다",
    });
  } catch (err) {
    console.error("층 추가 처리 중 오류:", err);
    res.status(500).send("층 추가 처리 중 오류");
  }
}


// 카테고리 삭제: 이건 관리 페이지에서.. 목록을 보고 삭제를..
exports.delete = async (req, res) => {
  try {
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