// src/modules/path/service.js

const con = require("../../core/db")

let outdoorGraph = null;
let outdoorLocations = null;


// 건물 ↔ 건물 (외부만 사용)
exports.handleBuildingToBuilding = (from_building, to_building) => {

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 호실 ↔ 건물 (내부 -> 외부)
exports.handleRoomToBuilding = (from_building, from_floor, from_room, to_building) => {

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 건물 ↔ 호실 (외부 -> 내부)
exports.handleBuildingToRoom = (from_building, to_building, to_floor, to_room) => {

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/*
// 호실 ↔ 호실 경로 탐색
exports.handleRoomToRoom = async (from_building, from_floor, from_room, to_building, to_floor, to_room) => {
  try {
    if (from_building === to_building) {
      // 같은 건물 내부 이동: 실내 경로만 탐색
      // 예: 실내 그래프에서 from_room → to_room 경로 탐색
      const query = `
        -- 여기서 같은 건물 내부의 실내 경로만 계산하는 쿼리 또는 함수 호출
        -- 예시: SELECT ... FROM IndoorEdges WHERE ...
      `;
      // 또는 실내 그래프/서비스 함수 호출
      // const path = await indoorService.findIndoorPath(from_building, from_floor, from_room, to_floor, to_room);
      // return path;

      return new Promise((resolve, reject) => {
        con.query(query, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
    } else {
      // 다른 건물 간 이동: 실내 → 실외 → 실내 경로
      // 1. 출발 호실 → 출발 건물 출입구(실내)
      // 2. 출발 건물 출입구 → 도착 건물 출입구(실외)
      // 3. 도착 건물 출입구 → 도착 호실(실내)

      // 1. 출발 호실 → 출발 건물 출입구(실내)
      // (예: indoorService.findIndoorPath(from_building, from_floor, from_room, 출입구))
      // 2. 출발 출입구 ↔ 도착 출입구(실외)
      // (예: outdoorService.findOutdoorPath(출발출입구, 도착출입구))
      // 3. 도착 출입구 → 도착 호실(실내)
      // (예: indoorService.findIndoorPath(to_building, 출입구, to_floor, to_room))

      // 아래는 각 단계별로 함수 호출하는 예시입니다.
      const fromEntrance = await indoorService.findEntrance(from_building, from_floor, from_room);
      const toEntrance = await indoorService.findEntrance(to_building, to_floor, to_room);

      const indoorPath1 = await indoorService.findIndoorPath(from_building, from_floor, from_room, fromEntrance.floor, fromEntrance.room);
      const outdoorPath = await outdoorService.findOutdoorPath(fromEntrance.entranceNode, toEntrance.entranceNode);
      const indoorPath2 = await indoorService.findIndoorPath(to_building, toEntrance.floor, toEntrance.room, to_floor, to_room);

      // 경로 합치기
      const fullPath = [...indoorPath1, ...outdoorPath, ...indoorPath2];

      return fullPath;
    }
  } catch (err) {
    throw err;
  }
};
*/
// // 호실 ↔ 호실 indoorService.js에서 불러올거임 (한승헌) (1. 내부 -> 외부 -> 내부  2. 같은 건물 내부 -> 내부)
// exports.handleRoomToRoom = (from_building, from_floor, from_room, to_building, to_floor, to_room) => {

//   return new Promise((resolve, reject) => {
//     con.query(query, (err, result) => {
//       if (err) return reject(err);
//       resolve(result);
//     });
//   });
// }


// 내부
// ✅ 두 좌표 간의 유클리드 거리 계산 함수
const euclideanDistance = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// ✅ 내부 DB에서 그래프 구성
async function buildIndoorGraph() {}


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

// ✅ 외부 DB에서 그래프 구성
async function buildOutdoorGraph() {
  // 1. 노드 정보: 이름, 위도/경도(point 타입)
  const roomRes = await pool.query(`
    SELECT "Node_Name", "Location" FROM "OutSideNode"
  `);

  // 2. Edge 테이블에서 방 간 연결 정보 가져오기
  const edgeRes = await pool.query(`
    SELECT "From_Node", "To_Node" FROM "OutSideEdge"
  `);

  // 3. 위치정보 객체 생성 (Node_Name → {lat, lng})
  const locations = {};
  nodeRes.rows.forEach(({ Node_Name, Location }) => {
    // Location.x, Location.y가 각각 위도, 경도 순인지 꼭 확인!
    // 예시: (위도, 경도) 순서로 저장되어 있다면
    const lat = Number(Location[0]);
    const lng = Number(Location[1]);
    locations[Node_Name] = { lat, lng };
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

// 외부 그래프 초기화
async function initOutdoorGraph() {
  const { graph, locations } = await buildOutdoorGraph();
  outdoorGraph = graph;
  outdoorLocations = locations;
  console.log('실외 그래프 캐싱 완료!');
}


// ✅ Dijkstra 알고리즘: 최단 경로 계산
function dijkstra(graph, start, end) {
  const dist = {};        // 시작 노드로부터 거리
  const prev = {};        // 이전 노드 정보 (경로 추적용)
  const visited = new Set(); // 방문 여부 확인용

  // 모든 노드까지 거리 초기화 → 무한대, 시작 노드는 0
  Object.keys(graph).forEach(k => dist[k] = Infinity);
  dist[start] = 0;

  while (visited.size < Object.keys(graph).length) {
    // 아직 방문하지 않은 노드 중 가장 거리가 짧은 노드 선택
    const current = Object.keys(dist)
      .filter(k => !visited.has(k))
      .sort((a, b) => dist[a] - dist[b])[0];

    // 더 이상 진행할 수 없으면 종료
    if (!current || dist[current] === Infinity) break;

    visited.add(current); // 현재 노드 방문 처리
    if (current === end) break; // 목적지 도달 시 종료

    // 이웃 노드들 검사
    for (const { node, weight } of graph[current] || []) {
      if (!visited.has(node)) {
        const newDist = dist[current] + weight;
        if (newDist < dist[node]) {
          dist[node] = newDist;   // 더 짧은 거리로 갱신
          prev[node] = current;   // 이전 노드 기록
        }
      }
    }
  }

  // ✅ 최단 경로 역추적 (end → start)
  const path = [];
  let curr = end;
  while (curr) {
    path.unshift(curr);   // 앞에 삽입 (start → ... → end)
    curr = prev[curr];
  }

  return path; // 예: ['O1', 'W11', 'O2', 'O3', ...]
}

module.exports = {
  buildOutdoorGraph,
  //dijkstra, <-이거 정의 안되어 있어서 일단 주석(한승헌)
  outdoorGraph: () => outdoorGraph,
  outdoorLocations: () => outdoorLocations,
  initOutdoorGraph
};