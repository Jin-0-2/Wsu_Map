// src/modules/path/service.js

const con = require("../../core/db")

const floor = require("../floor/service")

// ✅ 전역 변수: 그래프, 좌표 캐싱
let outdoorGraph = {};
let outdoorLocations = {};
let indoorGraph = {};
let indoorLocations = {};

exports.getNodes = () => {
  return outdoorLocations;
}

exports.getEdges = () => {
  return outdoorGraph;
}

// 건물/노드 생성
exports.create = async (node_name, x, y) => {
  const sql = `INSERT INTO "OutSideNode" ("Node_Name", "Location") VALUES ($1, POINT($2, $3));`

  values = [node_name, x, y]

  return new Promise((resolve, reject) => {
    con.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 노드 위치 수정
exports.update_node_location = (node_name, x, y) => {
  const sql = `UPDATE "OutSideNode" SET "Location" = POINT($1, $2) WHERE "Node_Name" = $3`;

  const values = [x, y, node_name];

  return new Promise((resolve, reject) => {
    con.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물/노드 삭제
exports.delete = async (node_name) => {
  const delete_OutSideEdge = `DELETE FROM "OutSideEdge" WHERE "From_Node" = $1 OR "To_Node" = $1`;
  const delete_OutSideNode = `DELETE FROM "OutSideNode" WHERE "Node_Name" = $1`;

  const values = [node_name];

  return new Promise((resolve, reject) => {
    // 1. OutSideEdge 먼저 삭제
    con.query(delete_OutSideEdge, values, (err, result) => {
      if (err) return reject(err);

      // 2. OutSideNode 삭제
      con.query(delete_OutSideNode, values, (err2, result2) => {
        if (err2) return reject(err2);

        resolve({ edgeResult: result, nodeResult: result2 });
      });
    });
  });
}

exports.connect = async (from_node, to_node) => {
  const insert_OutSideEdge = `INSERT INTO "OutSideEdge" ("From_Node", "To_Node") 
  VALUES ($1, $2), ($2, $1)`;

  const values = [from_node, to_node];

  return new Promise((resolve, reject) => {
    con.query(insert_OutSideEdge, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물 ↔ 건물 (외부만 사용)
exports.handleBuildingToBuilding = (from_building, to_building) => {
  console.log(outdoorLocations);

  const outdoorPath = dijkstra(outdoorGraph, outdoorLocations, from_building, to_building);

  console.log(outdoorPath);
  return {
    outdoor: {
      path: outdoorPath                          // 실외 경로
    }
  }
}

// 호실 ↔ 건물 (내부 -> 외부)
exports.handleRoomToBuilding = async (from_building, from_floor, from_room, to_building) => {
  const start_room = `${from_building}@${from_floor}@${from_room}`;

  let start_enterance = ``;
  let entrance_floor = 1;

  if (from_building === "W15") {
    entrance_floor = 2;
    start_enterance = `${from_building}@2@입구`;
  } else {
    start_enterance = `${from_building}@1@입구`;
  }


  // 건물 내부 탈출 (1층 입구까지 가는건 동일)
  const indoorPath = dijkstra(indoorGraph, indoorLocations, start_room, start_enterance);



  // 출발 층 도면
  let start_floorBase64 = null;
  const startfloorResult = await floor.getFloorNumber(from_floor, from_building)
  if (startfloorResult && startfloorResult.rows && startfloorResult.rows.length > 0) {
    const fileBuffer = startfloorResult.rows[0].File;
    if (fileBuffer) {
      start_floorBase64 = fileBuffer.toString('base64');
    }
  }

  // 입구(탈출) 층 도면
  let end_floorBase64 = null;
  const entranceFloorResult = await floor.getFloorNumber(entrance_floor, from_building);
  if (entranceFloorResult && entranceFloorResult.rows && entranceFloorResult.rows.length > 0) {
    const fileBuffer = entranceFloorResult.rows[0].File;
    if (fileBuffer) {
      end_floorBase64 = fileBuffer.toString('base64');
    }
  }

  // 건물 -> 건물
  const outdoorPath = dijkstra(outdoorGraph, outdoorLocations, from_building, to_building);

  return {
    departure_indoor: {
      start_floorImage: start_floorBase64, // 출발 층 도면
      end_floorImage: end_floorBase64,     // 입구(탈출) 층 도면
      path: indoorPath
    },
    outdoor: {
      path: outdoorPath
    }
  };
}

// 건물 ↔ 호실 (외부 -> 내부)
exports.handleBuildingToRoom = async (from_building, to_building, to_floor, to_room) => {
  // 건물 간 이동
  const outdoorPath = dijkstra(outdoorGraph, outdoorLocations, from_building, to_building);

  // 건물 도착 후 실내 경로
  let entery_enterance = ``;
      if (to_building === "W15") {
        entery_enterance = `${to_building}@2@입구`
      } else {
        entery_enterance = `${to_building}@1@입구`;
      }
      const entry_room = `${to_building}@${to_floor}@${to_room}`;

  // 건물 내부 이동 (1층 입구부터  가는건 동일)
  const indoorPath = dijkstra(indoorGraph, indoorLocations, entery_enterance, entry_room);

  // 도착 방이 1층일 때 > 1층만 반환
  const firstfloorResult = await floor.getFloorNumber(1, to_building);
  let entry_first_floorBase64 = null;
  if (firstfloorResult && firstfloorResult.rows && firstfloorResult.rows.length > 0) {
    const fileBuffer = firstfloorResult.rows[0].File; // File 컬럼 (Buffer 타입)
    if (fileBuffer) {
      entry_first_floorBase64 = fileBuffer.toString('base64'); // base64로 변환
    }
  }

  // 도착방이 2층 이상일 때 
  let entry_end_floorBase64 = null;
  if (from_floor != 1) {
    const endfloorResult = await floor.getFloorNumber(to_floor, to_building);
    if (endfloorResult && endfloorResult.rows && endfloorResult.rows.length > 0) {
      const fileBuffer = endfloorResult.rows[0].File; // File 컬럼 (Buffer 타입)
      if (fileBuffer) {
        entry_end_floorBase64 = fileBuffer.toString('base64'); // base64로 변환
      }
    }
  }

  return {
    outdoor: {
      path: outdoorPath               // 실외 경로
    },
    arrival_indoor: {
      start_floorImage: entry_first_floorBase64,
      end_floorImage: entry_end_floorBase64,
      path: indoorPath
    }
  };
}

// 호실 ↔ 호실 경로 탐색
exports.handleRoomToRoom = async (from_building, from_floor, from_room, to_building, to_floor, to_room) => {
  try {
    if (from_building === to_building) {
      // 같은 건물 내부 이동: 실내 경로만 탐색
      const start_room = `${from_building}@${from_floor}@${from_room}`;
      const end_room = `${to_building}@${to_floor}@${to_room}`;

      const indoorPath = dijkstra(indoorGraph, indoorLocations, start_room, end_room);

      let start_floorBase64 = null;
      if (from_floor != to_floor) {
        const startfloorResult = await floor.getFloorNumber(from_floor, from_building);
        if (startfloorResult && startfloorResult.rows && startfloorResult.rows.length > 0) {
          const fileBuffer = startfloorResult.rows[0].File; // File 컬럼 (Buffer 타입)
          if (fileBuffer) {
            start_floorBase64 = fileBuffer.toString('base64'); // base64로 변
          }
        }
      }

      let end_floorBase64 = null;
      const endfloorResult = await floor.getFloorNumber(to_floor, to_building);
      if (endfloorResult && endfloorResult.rows && endfloorResult.rows.length > 0) {
        const fileBuffer = endfloorResult.rows[0].File; // File 컬럼 (Buffer 타입)
        if (fileBuffer) {
          end_floorBase64 = fileBuffer.toString('base64');
        }
      }
      console.log(indoorPath);

      return {
        arrival_indoor: {
          start_floorImage: start_floorBase64, // 실내 사진(base64)
          end_floorImage: end_floorBase64,
          path: indoorPath                // 실내 경로
        }
      };
    } else {
      // 다른 건물 간 이동: 실내 → 실외 → 실내 경로
      // 1. 출발 호실 → 출발 건물 출입구(실내)
      const start_room = `${from_building}@${from_floor}@${from_room}`;
      // 출발 건물 입구: W15는 2층, 그 외는 1층
      let start_entrance_floor = (from_building === "W15") ? 2 : 1;
      let start_enterance = `${from_building}@${start_entrance_floor}@입구`;


      const exit_indoor_path = dijkstra(indoorGraph, indoorLocations, start_room, start_enterance)

      // 출발 층 도면
      let exit_start_floorImage = null;
      if (from_floor != start_entrance_floor) {
        const result = await floor.getFloorNumber(from_floor, from_building);
        if (result && result.rows && result.rows.length > 0) {
          const fileBuffer = result.rows[0].File;
          if (fileBuffer) {
            exit_start_floorImage = fileBuffer.toString('base64');
          }
        }
      }

      // 출발 건물 입구(탈출) 층 도면: W15는 2층, 그 외는 1층
      let exit_entrance_floorImage = null;
      const entranceFloorResult = await floor.getFloorNumber(start_entrance_floor, from_building);
      if (entranceFloorResult && entranceFloorResult.rows && entranceFloorResult.rows.length > 0) {
        const fileBuffer = entranceFloorResult.rows[0].File;
        if (fileBuffer) {
          exit_entrance_floorImage = fileBuffer.toString('base64');
        }
      }

      // 2. 출발 건물 출입구 → 도착 건물 출입구(실외)
      const outdoorPath = dijkstra(outdoorGraph, outdoorLocations, from_building, to_building);

      // 3. 도착 건물 출입구 → 도착 호실(실내)
      // 도착 건물 입구: W15는 2층, 그 외는 1층
      let entry_entrance_floor = (to_building === "W15") ? 2 : 1;
      let entery_enterance = `${to_building}@${entry_entrance_floor}@입구`;
      const entry_room = `${to_building}@${to_floor}@${to_room}`;

      // 건물 내부 이동 (입구 -> 방)
      const entry_indoor_path = dijkstra(indoorGraph, indoorLocations, entery_enterance, entry_room);


      // 도착 층 도면
      let entry_arrival_floorImage = null;
      if (to_floor != entry_entrance_floor) {
        const result = await floor.getFloorNumber(to_floor, to_building);
        if (result && result.rows && result.rows.length > 0) {
          const fileBuffer = result.rows[0].File;
          if (fileBuffer) {
            entry_arrival_floorImage = fileBuffer.toString('base64');
          }
        }
      }

      // 도착 건물 입구(진입) 층 도면: W15는 2층, 그 외는 1층
      let entry_entrance_floorImage = null;
      const entryEntranceFloorResult = await floor.getFloorNumber(entry_entrance_floor, to_building);
      if (entryEntranceFloorResult && entryEntranceFloorResult.rows && entryEntranceFloorResult.rows.length > 0) {
        const fileBuffer = entryEntranceFloorResult.rows[0].File;
        if (fileBuffer) {
          entry_entrance_floorImage = fileBuffer.toString('base64');
        }
      }

      return {
        departure_indoor: {
          start_floorImage: exit_start_floorImage,      // 출발 층 도면 (출발 건물)
          end_floorImage: exit_entrance_floorImage,     // 출발 건물 입구(2층 or 1층) 도면
          path: exit_indoor_path
        },
        outdoor: {
          path: outdoorPath
        },
        arrival_indoor: {
          start_floorImage: entry_entrance_floorImage,  // 도착 건물 입구(2층 or 1층) 도면
          end_floorImage: entry_arrival_floorImage,     // 도착 층 도면 (도착 건물)
          path: entry_indoor_path
        }
      };
    }
  } catch (err) {
    throw err;
  }
};


// 내부
// ✅ 두 좌표 간의 유클리드 거리 계산 함수
const euclideanDistance = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// ✅ DB에서 그래프 구성
async function buildIndoorGraph() {
  // 방 위치 정보 가져오기
  const roomRes = await con.query(`
    SELECT "Building_Name", "Floor_Number", "Room_Name", "Room_Location"
    FROM "Floor_R" JOIN "Floor" ON "Floor_R"."Floor_Id" = "Floor"."Floor_Id"
  `);

  // 방 간 연결 정보 가져오기
  const edgeRes = await con.query(`
    SELECT
     f_from."Building_Name" AS "From_Building_Name",
     f_from."Floor_Number" AS "From_Floor_Number",
     e."From_Room_Name",
     f_to."Building_Name" AS "To_Building_Name",
     f_to."Floor_Number" AS "To_Floor_Number",
     e."To_Room_Name"
    FROM "InSideEdge" e
    JOIN "Floor" f_from ON e."From_Floor_Id" = f_from."Floor_Id"
    JOIN "Floor" f_to   ON e."To_Floor_Id"   = f_to."Floor_Id"
  `);

  // 방 좌표를 저장할 객체: key = Building@Floor@Room
  const locations = {};
  roomRes.rows.forEach(({ Building_Name, Floor_Number, Room_Name, Room_Location }) => {
    const key = `${Building_Name}@${Floor_Number}@${Room_Name}`;
    const { x, y } = Room_Location;
    locations[key] = { x: Number(x), y: Number(y) };
  });

  // 그래프 객체 초기화
  const graph = {};
  Object.keys(locations).forEach(key => {
    graph[key] = [];
  });

  // 간선 정보로 그래프 연결 구성
  edgeRes.rows.forEach(
    ({
      From_Building_Name, From_Floor_Number, From_Room_Name,
      To_Building_Name, To_Floor_Number, To_Room_Name }) => {
      const fromKey = `${From_Building_Name}@${From_Floor_Number}@${From_Room_Name}`;
      const toKey = `${To_Building_Name}@${To_Floor_Number}@${To_Room_Name}`;

      // 연결 노드 모두 존재할 때만 처리
      if (locations[fromKey] && locations[toKey]) {
        const distance = euclideanDistance(locations[fromKey], locations[toKey]);
        graph[fromKey].push({ node: toKey, weight: distance });
      }
    });

  return { graph, locations }; // 그래프와 위치 정보 반환
}

async function initIndoorGraph() {
  const { graph, locations } = await buildIndoorGraph();
  indoorGraph = graph;
  indoorLocations = locations;
  console.log('실내 그래프 캐싱 완료!');
}

// 외부
// ✅ 위도 경도 거리계산 하버사인 함수
function haversineDistance(a, b) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371000; // 지구 반지름 (미터)
  const lat1 = a.lat, lon1 = a.lng;
  const lat2 = b.lat, lon2 = b.lng;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

// ✅ DB에서 그래프 구성
async function buildOutdoorGraph() {
  // 1. 노드 정보: 이름, 위도/경도(point 타입)
  const nodeRes = await con.query(`
    SELECT "Node_Name", "Location"[0] AS x, "Location"[1] AS y FROM "OutSideNode"
  `);

  // 2. Edge 테이블에서 방 간 연결 정보 가져오기
  const edgeRes = await con.query(`
    SELECT "From_Node", "To_Node" FROM "OutSideEdge"
  `);

  // 3. 위치정보 객체 생성 (Node_Name → {lat, lng})
  const locations = {};
  nodeRes.rows.forEach(({ Node_Name, x, y }) => {
    locations[Node_Name] = { lat: x, lng: y };
  });

  // 4. 그래프 객체 초기화
  const graph = {};
  Object.keys(locations).forEach(name => {
    graph[name] = [];
  });

  // 5. 간선 정보로 그래프 연결
  edgeRes.rows.forEach(({ From_Node, To_Node }) => {
    if (!locations[From_Node] || !locations[To_Node]) return;
    const distance = haversineDistance(locations[From_Node], locations[To_Node]);
    graph[From_Node].push({ node: To_Node, weight: distance });
  });

  return { graph, locations }; // 그래프와 위치 정보 반환
}

async function initOutdoorGraph() {
  const { graph, locations } = await buildOutdoorGraph();
  outdoorGraph = graph;
  outdoorLocations = locations;
  console.log('실외 그래프 캐싱 완료!');
}

// 최단경로 탐색
function dijkstra(graph, locations, startNode, endNode) {
  const distances = {};
  const visited = {};
  const previous = {};

  // 각 노드별 초기값 설정
  Object.keys(graph).forEach(node => {
    distances[node] = Infinity;
    visited[node] = false;
    previous[node] = null;
  });

  distances[startNode] = 0; // 시작 노드는 0으로

  // 반복문으로 모든 노드 탐색
  while (true) {
    let closestNode = null;
    let smallestDistance = Infinity;

    // 아직 방문하지 않은 노드 중 가장 가까운 노드 선택
    for (const node in distances) {
      if (!visited[node] && distances[node] < smallestDistance) {
        smallestDistance = distances[node];
        closestNode = node;
      }
    }

    // 더 이상 진행할 노드가 없거나 목표 노드 도달 시 종료
    if (closestNode === null) break;
    if (closestNode === endNode) break;

    visited[closestNode] = true;

    // 이웃 노드 확인하며 거리 갱신
    graph[closestNode].forEach(neighbor => {
      const alt = distances[closestNode] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = closestNode;
      }
    });
  }

  // 경로 역추적
  const pathKeys = [];
  let current = endNode;
  while (current) {
    pathKeys.unshift(current);
    current = previous[current];
  }
  console.log(pathKeys);

  const path = pathKeys
    .map(key => {
      const loc = locations[key];
      if (loc) {
        const x = loc.x !== undefined ? loc.x : loc.lat;
        const y = loc.x !== undefined ? loc.y : loc.lng;
        return { name : key, x, y}
      }
      return null
    })
    .filter(Boolean);
  /*
  {
    distance: 46.21, // (예시 값)
    path: [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
      { x: 100, y: 200 },
      { x: 120, y: 220 }
    ]
  }
  */

  return { distance: distances[endNode], path };
}

exports.initIndoorGraph = initIndoorGraph;
exports.initOutdoorGraph = initOutdoorGraph;