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

// 건물 ↔ 건물 (외부만 사용)
exports.handleBuildingToBuilding = (from_building, to_building) => {
  const outdoorPath = dijkstra(outdoorGraph, outdoorLocations, from_building, to_building);
  return {
    outdoor: {
      path: outdoorPath                          // 실외 경로
    }
  }
}

// 호실 ↔ 건물 (내부 -> 외부)
exports.handleRoomToBuilding = async (from_building, from_floor, from_room, to_building) => {
  console.log(outdoorGraph);
  console.log(outdoorLocations);
  console.log(indoorGraph);
  console.log(indoorLocations);

  const start_room = `${from_building}@${from_floor}@${from_room}`;
  const start_enterance = `${from_building}@1@입구`;


  // 건물 내부 탈출 (1층 입구까지 가는건 동일)
  const indoorPath = dijkstra(indoorGraph, indoorLocations, start_room, start_enterance);

  let start_floorBase64 = null;
  if (from_floor != 1) {
    // 건물 내부 이동 도면 (시작 층)
    const startfloorResult = await floor.getFloorNumber(from_floor, from_building);
    if (startfloorResult && startfloorResult.rows && startfloorResult.rows.length > 0) {
      const fileBuffer = startfloorResult.rows[0].File; // File 컬럼 (Buffer 타입)
      if (fileBuffer) {
        floorBase64 = fileBuffer.toString('base64'); // base64로 변환
      }
    }
  }

  // 건물 내부 이동 도면 (시작 1층)
  const firstfloorResult = await floor.getFloorNumber(1, from_building);
  let end_floorBase64 = null;
  if (firstfloorResult && firstfloorResult.rows && firstfloorResult.rows.length > 0) {
    const fileBuffer = firstfloorResult.rows[0].File; // File 컬럼 (Buffer 타입)
    if (fileBuffer) {
      end_floorBase64 = fileBuffer.toString('base64'); // base64로 변환
    }
  }

  // 건물 -> 건물
  const outdoorPath = dijkstra(outdoorGraph, outdoorLocations, from_building, to_building);

  return {
    departure_indoor: {
      start_floorImage: start_floorBase64, // 실내 사진(base64)
      end_floorImage: end_floorBase64,
      path: indoorPath                // 실내 경로
    },
    outdoor: {
      path: outdoorPath               // 실외 경로
    }
  };
}

// 건물 ↔ 호실 (외부 -> 내부)
exports.handleBuildingToRoom = async (from_building, to_building, to_floor, to_room) => {
  // 건물 간 이동
  const outdoorPath = dijkstra(outdoorGraph, outdoorLocations, from_building, to_building);

  // 건물 도착 후 실내 경로
  const entry_room = `${to_building}@${to_floor}@${to_room}`;
  const entery_enterance = `${to_building}@1@입구`;

  // 건물 내부 이동 (1층 입구부터  가는건 동일)
  const indoorPath = dijkstra(indoorGraph, indoorLocations, entery_enterance, entry_room);

  // 도착 방이 1층일 때 > 1층만 반환
  const firstfloorResult = await floor.getFloorNumber(1, from_building);
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
    const endfloorResult = await floor.getFloorNumber(from_floor, from_building);
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
      let start_enterance = ``;
      if (to_building === "W15")
        start_enterance = `${from_building}@2@입구`
      else
        start_enterance = `${from_building}@1@입구`;

      const exit_indoor_path = dijkstra(indoorGraph, indoorLocations, start_room, start_enterance)

      let exit_start_floorImage = null;
      if (from_floor != 1) {
        // 건물 내부 이동 도면 (시작 층)
        const result = await floor.getFloorNumber(from_floor, from_building);
        if (result && result.rows && result.rows.length > 0) {
          const fileBuffer = result.rows[0].File; // File 컬럼 (Buffer 타입)
          if (fileBuffer) {
            exit_start_floorImage = fileBuffer.toString('base64'); // base64로 변환
          }
        }
      }

      // 건물 내부 이동 도면 (시작 1층)
      let exit_first_floorImage = null;
      const firstFloorResult = await floor.getFloorNumber(1, from_building);
      if (firstFloorResult && firstFloorResult.rows && firstFloorResult.rows.length > 0) {
        const fileBuffer = firstFloorResult.rows[0].File; // File 컬럼 (Buffer 타입)
        if (fileBuffer) {
          exit_first_floorImage = fileBuffer.toString('base64'); // base64로 변환
        }
      }

      // 2. 출발 건물 출입구 → 도착 건물 출입구(실외)
      const outdoorPath = dijkstra(outdoorGraph, outdoorLocations, from_building, to_building);

      // 3. 도착 건물 출입구 → 도착 호실(실내)
      // 건물 도착 후 실내 경로
      const entery_enterance = `${to_building}@1@입구`;
      const entry_room = `${to_building}@${to_floor}@${to_room}`;

      // 건물 내부 이동 (입구 -> 방)
      const entry_indoor_path = dijkstra(indoorGraph, indoorLocations, entery_enterance, entry_room);


      // 도착방이 2층 이상일 때 
      let entry_start_floorImage = null;
      if (from_floor != 1) {
        const result = await floor.getFloorNumber(from_floor, from_building);
        if (result && result.rows && result.rows.length > 0) {
          const fileBuffer = result.rows[0].File; // File 컬럼 (Buffer 타입)
          if (fileBuffer) {
            entry_start_floorImage = fileBuffer.toString('base64'); // base64로 변환
          }
        }
      }

      // 도착 방이 1층일 때 > 1층만 반환
      let entry_first_floorImage = null;
      const entryFirstFloorResult = await floor.getFloorNumber(1, from_building);
      if (entryFirstFloorResult && entryFirstFloorResult.rows && entryFirstFloorResult.rows.length > 0) {
        const fileBuffer = entryFirstFloorResult.rows[0].File; // File 컬럼 (Buffer 타입)
        if (fileBuffer) {
          entry_first_floorImage = fileBuffer.toString('base64'); // base64로 변환
        }
      }

      return {
        departure_indoor: {
          start_floorImage: exit_start_floorImage,   // 출발 층 도면 (출발 건물)
          end_floorImage: exit_first_floorImage,   // 1층 도면 (출발 건물)
          path: exit_indoor_path                     // 출발 건물 실내 경로
        },
        outdoor: {
          path: outdoorPath                          // 실외 경로
        },
        arrival_indoor: {
          start_floorImage:  entry_first_floorImage,  // 도착 층 도면 (도착 건물)
          end_floorImage: entry_start_floorImage,  // 1층 도면 (도착 건물)
          path: entry_indoor_path                    // 도착 건물 실내 경로
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
        return { name: key, x: loc.x, y: loc.y };
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