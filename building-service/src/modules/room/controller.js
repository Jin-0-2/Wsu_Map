// src/modules/room/controller.js

const Service = require("./service")
const pathService = require("../path/service")

// 전체 조회
exports.getAll = async (req, res) => {
  try {
    const result = await Service.getAll();

    console.log('result----------', result);
    
    res.status(200).json(result);
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
    const building_name = req.params.building;
    const floor_number = req.params.floor;
    const room_name = req.body.room_name;

    const room_desc = req.body.room_desc ?? null;
    const room_user = req.body.room_user ?? null;
    const user_phone = req.body.user_phone ?? null;
    const user_email = req.body.user_email ?? null;

    const result = await Service.update(building_name, floor_number, room_name, room_desc, room_user, user_phone, user_email);

    res.status(200).json({message : "수정 성공"});
  } catch (err) {
    console.error("방 수정 처리 중 오류:", err);

    res.status(500).json({message : "수정 실패"});
  }
};

// 방 삭제: 이건 관리 페이지에서.. 목록을 보고 삭제를..
exports.delete = async (req, res) => {
  try {
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
    const from_building = req.body.from_building;
    const from_floor = req.body.from_floor;
    const from_node = req.body.from_node;
    const to_building = req.body.to_building;
    const to_floor = req.body.to_floor;
    const to_node = req.body.to_node;

    const result = await Service.connect(from_building, from_floor, from_node, to_building, to_floor, to_node);

    await pathService.initIndoorGraph();

    res.status(200).json("성공");
  } catch (err) {
    console.error("실내 노드 연결 중 오류:", err);

    res.status(500).send(err);
  }
};

// 실내 노드 연결 해제
exports.disconnect = async (req, res) => {
  try {
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
    const building = req.params.building;
    const floor = req.params.floor;
    const id = req.params.id;

    console.log('id----------', id);

    // 건물 별 계단 조회
    let result = await pathService.getStairs(building);

    console.log('getStairs----------', result);

    // 건물 이름 순으로 정렬
    result = result.sort((a, b) => {
      const [buildingA, floorA] = a.split('@');
      const [buildingB, floorB] = b.split('@');
      const isSameA = buildingA === building;
      const isSameB = buildingB === building;

      if (isSameA && !isSameB) return -1;
      if (!isSameA && isSameB) return 1;
      if (buildingA !== buildingB) return buildingA.localeCompare(buildingB);

      return parseInt(floorA, 10) - parseInt(floorB, 10);
    });

    console.log('sort-----------', result);

    const currentFloor = parseInt(floor, 10);

    // 이름 오타 보정용 유틸: 'staris' -> 'stairs'
    const normalizeName = (s = '') => s.replace('staris', 'stairs');

    // 현재 id의 세 번째 파트(노드명)
    const currentNameRaw = (id.split('@')[2] || '');
    const currentName = normalizeName(currentNameRaw);

    // 현재 id 유형 판별
    const isToId = currentName.startsWith('to');
    const isStairsLikeId = !isToId && currentName.includes('stairs');

    const filtered = result.filter(item => {
      const parts = item.split('@');
      if (parts.length < 3) return false;

      const [b, fStr, rawName] = parts;
      const f = parseInt(fStr, 10);
      const name = normalizeName(rawName);

      const isTo = name.startsWith('to');              // to-xxx
      const isStairsLike = !isTo && name.includes('stairs'); // stairs, left-stairs, right-stairs 등

      if (isToId) {
        // 현재 id가 to-xxx인 경우: 다른 건물의 to-만 포함
        return b !== building && isTo;

        // (옵션) 다른 건물 + 같은 층만 포함하려면 아래처럼 변경하세요.
        // return b !== building && isTo && Number.isFinite(f) && f === currentFloor;
      }

      if (isStairsLikeId) {
        // 현재 id가 stairs 계열인 경우: 같은 건물의 stairs 계열만 포함
        return b === building && isStairsLike;

        // (옵션) 같은 건물 + ±1층만 포함하려면 아래처럼 변경하세요.
        // return b === building && isStairsLike && Math.abs(f - currentFloor) === 1;
      }

      // 현재 id가 위 두 유형이 아니면 일단 포함하지 않음(명확성 유지)
      return false;
    });

    console.log('filtered----------', filtered);

    res.status(200).json({
      stairs: filtered,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('계단 검색 중 오류');
  }
};