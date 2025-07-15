// src/modules/room/controller.js

const Service = require("./service")
const pathService = require("../path/service")
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

exports.getRoombyBuilding = async (req, res) => {
  try {
    const building_name = req.params.building;

    const result = await Service.getRoombyBuilding(building_name);
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

// 건물_층의 방 목록 조회 : 관리자
exports.getRoombyBuildingFloor = async (req, res) => {
  try {
    const building_name = req.params.building;
    const floor_number = req.params.floor;

    const result = await Service.getRoombyBuildingFloor(building_name, floor_number);
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

// 2D도면에서 방 클릭 시 보여줄 방 이름 및 설명
exports.getRoomDescByName = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const room_name = req.params.room;
    
    const result = await Service.getRoomDescByName(building_name, floor_number, room_name);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

// 길찾기용 포인트 얻기
exports.getRoomPointByName = async (req, res) => {
  try {
    logRequestInfo(req);
    const building = req.params.building;
    const floor = req.params.floor;
    const room_ = req.body;
    
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

// 방 추가
exports.create = async (req, res) => {
  try {
    logRequestInfo(req);

    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const room_name = req.body.room_name;
    const room_desc = req.body.room_desc;
    const x = req.body.x;
    const y = req.body.y;

    const result = await Service.create(building_name, floor_number, room_name, room_desc, x, y);

    res.status(201).json({
      message: "방 추가가 완료되었습니다",
    });
  } catch (err) {
    console.error("방 추가 처리 중 오류:", err);
    res.status(500).send("방 추가 처리 중 오류");
  }
}

// 방 수정
exports.update = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const old_room_name = req.body.old_room_name;
    const room_name = req.body.room_name;
    const room_desc = req.body.room_desc;

    console.log(building_name, floor_number, old_room_name, room_name, room_desc);

    const result = await Service.update(building_name, floor_number, old_room_name, room_name, room_desc);

    console.log(result);

    res.status(200).send("방 수정 성공");
  } catch (err) {
    console.error("방 수정 처리 중 오류:", err);

    res.status(500).send("방 수정 처리 중 오류");
  }
};

// 방 삭제: 이건 관리 페이지에서.. 목록을 보고 삭제를..
exports.delete = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const room_name = req.body.room_name;

    const result = await Service.delete(building_name, floor_number, room_name);
    if (result.rowCount === 0) {
      // 삭제된 행이 없음 → 잘못된 id
      return res.status(404).send("존재하지 않는 건물/층/방입니다.");
    }

    res.status(200).send("방 삭제 성공");
  } catch (err) {
    console.error("방 삭제 처리 중 오류:", err);

    res.status(500).send("방 삭제 처리 중 오류");
  }
};

// 실내 노드 연결
exports.connect = async (req, res) => {
  try {
    logRequestInfo(req);
    const from_building = req.body.from_building;
    const from_floor = req.body.from_floor;
    const from_node = req.body.from_node;
    const to_building = req.body.to_building;
    const to_floor = req.body.to_floor;
    const to_node = req.body.to_node;

    const result = await Service.connect(from_building, from_floor, from_node, to_building, to_floor, to_node);

    await pathService.initIndoorGraph();

    res.status(200).json("성공");
    console.log("성공!");
  } catch (err) {
    console.error("실내 노드 연결 중 오류:", err);

    res.status(500).send(err);
  }
};

// 실내 노드 연결 해제
exports.disconnect = async (req, res) => {
  try {
    logRequestInfo(req);
    const from_building = req.body.from_building;
    const from_floor = req.body.from_floor;
    const from_node = req.body.from_node;
    const to_building = req.body.to_building;
    const to_floor = req.body.to_floor;
    const to_node = req.body.to_node;

    const result = await Service.disconnect(from_building, from_floor, from_node, to_building, to_floor, to_node);

    pathService.initIndoorGraph();
    
    res.status(200).json("성공");
  } catch (err) {
    console.error("실내 노드 연결 중 오류:", err);

    res.status(500).send("실내 노드 연결 중 오류");
  }
};

// 경로 연결 시 다른 층의 계단 검색
exports.stairs = async (req, res) => {
  try {
    logRequestInfo(req);
    const building = req.body.building;

    const result = await pathService.getStairs(building);

    console.log(result);
    
    res.status(200).json(result);
  } catch (err) {
    console.error(err);

    res.status(500).send("계단 검색 중 오류");
  }
};