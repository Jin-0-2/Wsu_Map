// src/modules/path/controller.js

const Service = require("./service")
const { logRequestInfo } = require('../../core/logger'); // 경로는 상황에 맞게

// 전체 조회
exports.getPath = async (req, res) => {
  try {
    logRequestInfo(req);

    // body에서 출발/도착 정보 추출
    const {
      from_building,
      from_floor = null,
      from_room = null,
      to_building,
      to_floor = null,
      to_room = null
    } = req.body;

    const fromType = from_room ? "room" : "building";
    const toType = to_room ? "room" : "building";

    let finaly_result = null;

    // 분기 처리
    if (fromType === "building" && toType === "building") {
      // 건물 ↔ 건물
      finaly_result = {
        type : "building-building",
        result : await Service.handleBuildingToBuilding(from_building, to_building)
      }
      
    } else if (fromType === "room" && toType === "building") {
      // 호실 ↔ 건물
      finaly_result = {
        type : "room-building",
        result : await Service.handleRoomToBuilding(from_building, from_floor, from_room, to_building)
      }
    } else if (fromType === "building" && toType === "room") {
      // 건물 ↔ 호실
      finaly_result = {
        type : "building-room",
        result : await Service.handleBuildingToRoom(from_building, to_building, to_floor, to_room)
      }
    } else if (fromType === "room" && toType === "room") {
      // 호실 ↔ 호실(실내 전용 indoorService.js에서 불러올거임 한승헌)
      finaly_result = finaly_result = {
        type : "room-room",
        result : await Service.handleRoomToRoom(from_building, from_floor, from_room, to_building, to_floor, to_room)
      }
    } else {
      return res.status(400).json({ error: "입력값이 올바르지 않습니다." });
    }

    res.status(200).json(finaly_result);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

exports.getNodes = async (req, res) => {
  try {
    logRequestInfo(req);

    const result = await Service.getNodes();

    // 객체 → 배열 변환 로직 추가
    const nodesArray = Object.entries(result).map(([key, value]) => ({
      id: key,
      lat: value.lat,
      lng: value.lng
    }));

    res.status(200).json(nodesArray);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

exports.getEdges = async (req, res) => {
  try {
    logRequestInfo(req);

    const result = await Service.getEdges();

    console.log(result);

    // 객체 → 배열 변환 로직 추가
    const nodesArray = Object.entries(result).map(([key, value]) => ({
      id: key,
      nodes: value
    }));

    console.log(nodesArray[0].nodes);

    console.log(nodesArray);

    res.status(200).json(nodesArray);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

exports.update_node_location = async (req, res) => {
  try {
    logRequestInfo(req);

    const node_name = req.body.node_name;
    const x = req.body.x;
    const y = req.body.y;

    const result = await Service.update_node_location(node_name, x, y);

    console.log(result.rowCount);
    
    Service.initOutdoorGraph();

    res.status(200).json("변경 완료!");
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}