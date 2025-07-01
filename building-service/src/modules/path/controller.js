// src/modules/path/controller.js

const Service = require("./service")
const { logRequestInfo } = require('../../core/logger'); // 경로는 상황에 맞게

// 전체 조회
exports.getPath = (req, res) => {
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
        result : Service.handleBuildingToBuilding(from_building, to_building)
      }
      
    } else if (fromType === "room" && toType === "building") {
      // 호실 ↔ 건물
      finaly_result = {
        type : "room-building",
        result : Service.handleRoomToBuilding(from_building, from_floor, from_room, to_building)
      }
    } else if (fromType === "building" && toType === "room") {
      // 건물 ↔ 호실
      finaly_result = {
        type : "building-room",
        result : Service.handleBuildingToRoom(from_building, to_building, to_floor, to_room)
      }
    } else if (fromType === "room" && toType === "room") {
      // 호실 ↔ 호실(실내 전용 indoorService.js에서 불러올거임 한승헌)
      finaly_result = finaly_result = {
        type : "room-room",
        result : Service.handleRoomToRoom(from_building, from_floor, from_room, to_building, to_floor, to_room)
      }
    } else {
      return res.status(400).json({ error: "입력값이 올바르지 않습니다." });
    }

    console.log(finaly_result);

    res.status(200).json(finaly_result);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};