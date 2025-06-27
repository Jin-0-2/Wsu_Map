// src/modules/path/service.js

const con = require("../../core/db")

let outdoorGraph = null;
let outdoorLocations = null;

// 전체 조회
exports.getPath = () => {
  const query = 'select f."Building_Name", f."Floor_Number", r."Room_Name", r."Room_Description" from "Floor_R" r JOIN "Floor" f ON r."Floor_Id" = f."Floor_Id"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// ✅ DB에서 그래프 구성
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

// ✅ 두 좌표 간의 유클리드 거리 계산 함수
const euclideanDistance = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);


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

// 외부 그래프 초기화
async function initOutdoorGraph() {
  const { graph, locations } = await buildOutdoorGraph();
  outdoorGraph = graph;
  outdoorLocations = locations;
  console.log('실외 그래프 캐싱 완료!');
}

module.exports = {
  buildOutdoorGraph,
  dijkstra,
  outdoorGraph: () => outdoorGraph,
  outdoorLocations: () => outdoorLocations,
  initOutdoorGraph
};