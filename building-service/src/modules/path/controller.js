// src/modules/path/controller.js

const Service = require("./service")
const buildingService = require("../building/service")
const multer = require('multer');
const upload = multer();

// 길찾기 경로 반환
exports.getPath = async (req, res) => {
  try {
    // body에서 출발/도착 정보 추출
    let {
      from_location = null,
      from_building = null,
      from_floor = null,
      from_room = null,
      to_building,
      to_floor = null,
      to_room = null
    } = req.body;

    // --- 주요 변경 사항 1: 출발지 유효성 검사 ---
    // from_location과 from_building 둘 다 없거나, 둘 다 있으면 오류 처리
    if ((!from_location && !from_building) || (from_location && from_building)) {
      return res.status(400).json({
        error: "출발지는 'from_location' 또는 'from_building' 중 하나만, 그리고 반드시 입력해야 합니다.",
      });
    }

    if (from_location) {
      from_building = await Service.getCloseNode(from_location);
    }

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
    const result = await Service.getEdges();

    // 객체 → 배열 변환 로직 추가
    const nodesArray = Object.entries(result).map(([key, value]) => ({
      id: key,
      nodes: value
    }));

    res.status(200).json(nodesArray);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

exports.update_node_location = async (req, res) => {
  try {
    const node_name = req.body.node_name;
    const x = req.body.x;
    const y = req.body.y;

    const result = await Service.update_node_location(node_name, x, y);

    Service.initOutdoorGraph();

    res.status(200).json("변경 완료!");
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

// 건물/노드 생성
exports.create = [
  upload.any(),
  async (req, res) => {
    try {
      const type = req.body.type;
      const node_name = req.body.node_name;
      const x = req.body.x;
      const y = req.body.y;
      const desc = !req.body.desc ? null : req.body.desc;
  
      let result = null;
  
      if (type === "building") {
        // images[0], images[1], images[2] 형태의 파일들을 배열로 변환
        const images = [];
        for (let i = 0; i < 10; i++) { // 최대 10개까지
          const fileKey = `images[${i}]`;
          if (req.files && req.files.find(file => file.fieldname === fileKey)) {
            const file = req.files.find(file => file.fieldname === fileKey);
            images.push(file);
          }
        }
  
        // 여러 이미지를 S3에 업로드
        let imageUrls = [];
        if (images.length > 0) {
          const uploadPromises = images.map(image => 
            buildingService.uploadImage(node_name, image)
          );
          imageUrls = await Promise.all(uploadPromises);
        }
  
        const building_create_result = await buildingService.create(node_name, x, y, desc, imageUrls);
        console.log("빌딩에 추가완료")
        result = await Service.create(node_name, x, y);
        console.log("노드에 추가완료")
      } else if (type == "node") {
        result = await Service.create(node_name, x, y);
        console.log("노드에 추가완료")
      }
      
      Service.initOutdoorGraph();
  
      res.status(200).json("추가 완료!");
    } catch (err) {
      console.error("DB 오류:", err);
  
      res.status(500).send("DB 오류");
    }
  }
] 

// 건물/ 노드 삭제
exports.delete = async (req, res) => {
  try {
    const type = req.body.type;
    const node_name = req.body.node_name;

    if (type === "building") {
      // 1. 먼저 building의 이미지 URL들을 가져오기
      const building = await buildingService.getBuilding(node_name);

      
      // 2. S3에서 이미지들 삭제
      if (building && building.Image) {
        const imageUrls = building.Image; 
        if (imageUrls.length > 0) {
          const deletePromises = imageUrls.map(url => 
            buildingService.deleteImageFromS3(url)
          );
          await Promise.all(deletePromises);
          console.log("S3에서 이미지들 삭제 완료");
        }
      }
      
      // 3. DB에서 building 삭제
      const building_delete_result = await buildingService.delete(node_name);
      console.log("빌딩 DB 삭제 완료");
      
      // 4. DB에서 node 삭제
      result = await Service.delete(node_name);
      console.log("노드 DB 삭제 완료");
    } else if (type == "node") {
      result = await Service.delete(node_name);
      console.log("노드 삭제 완료");
    }
    
    Service.initOutdoorGraph();

    res.status(200).json("삭제 완료!");
  } catch (err) {
    console.error("삭제 오류:", err);
    res.status(500).send("삭제 처리 중 오류");
  }
}

// 노드끼리 잇기
exports.connect = async (req, res) => {
  try {
    const from_node = req.body.from_node;
    const to_node = req.body.to_node;

    const result = await Service.connect(from_node, to_node);

    Service.initOutdoorGraph();

    res.status(200).json("연결 완료!");
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류: 연결 중 오류");
  }
}

// 노드 연결 해제
exports.disconnect = async (req, res) => {
  try { 
    const from_node = req.body.from_node;
    const to_node = req.body.to_node;

    const result = await Service.disconnect(from_node, to_node);

    Service.initOutdoorGraph();

    res.status(200).json("연결 완료!");
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류: 연결 중 오류");
  }
}