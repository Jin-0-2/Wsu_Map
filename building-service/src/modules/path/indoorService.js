// src/modules/path/indoorService.js

// ✅ DB Pool 불러오기
const pool = require('../../core/db');

// ✅ 두 점 간 유클리드 거리 계산 함수
const euclideanDistance = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

/**
 * ✅ DB에서 실내 그래프 구성
 * - Floor_R 테이블: 방 이름, 층, 좌표 정보 가져옴
 * - Edge 테이블: 방 ↔ 방 간 연결 정보 가져옴
 * - 가져온 데이터를 그래프와 위치 객체로 구성
 */
async function buildIndoorGraph() {
  // 방 위치 정보 가져오기
  const roomRes = await pool.query(`
    SELECT "Room_Name", "Floor_Id", "Room_Location"
    FROM "Floor_R"
  `);

  // 방 간 연결 정보 가져오기
  const edgeRes = await pool.query(`
    SELECT "From_Room_Name", "From_Floor_Id", "To_Room_Name", "To_Floor_Id"
    FROM "Edge"
  `);

  // 방 좌표를 저장할 객체: key = Room@Floor
  const locations = {};
  roomRes.rows.forEach(({ Room_Name, Floor_Id, Room_Location }) => {
    const key = `${Room_Name}@${Floor_Id}`;
    const { x, y } = Room_Location;
    locations[key] = { x: Number(x), y: Number(y) };
  });

  // 그래프 객체 초기화
  const graph = {};
  Object.keys(locations).forEach(key => {
    graph[key] = [];
  });

  // 간선 정보로 그래프 연결 구성
  edgeRes.rows.forEach(({ From_Room_Name, From_Floor_Id, To_Room_Name, To_Floor_Id }) => {
    const fromKey = `${From_Room_Name}@${From_Floor_Id}`;
    const toKey = `${To_Room_Name}@${To_Floor_Id}`;

    // 연결 노드 모두 존재할 때만 처리
    if (locations[fromKey] && locations[toKey]) {
      const distance = euclideanDistance(locations[fromKey], locations[toKey]);
      graph[fromKey].push({ node: toKey, weight: distance });
    }
  });

  return { graph, locations }; // 그래프와 위치 정보 반환
}

/**
 * ✅ Dijkstra 알고리즘
 * - 그래프와 시작/목표 노드를 받아 최단 경로 계산
 * - 최단 경로 배열과 총 거리 반환
 */
function dijkstra(graph, startNode, endNode) {
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
  const path = [];
  let current = endNode;
  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  return { distance: distances[endNode], path };
}

// ✅ 전역 변수: 그래프, 좌표 캐싱
let indoorGraph = {};
let indoorLocations = {};

/**
 * ✅ 서버 시작 시 실내 그래프 초기화
 * - buildIndoorGraph() 실행해 DB에서 정보 가져옴
 * - 메모리에 그래프와 위치 캐싱
 */
async function initIndoorGraph() {
  const { graph, locations } = await buildIndoorGraph();
  indoorGraph = graph;
  indoorLocations = locations;
  console.log('실내 그래프 캐싱 완료!');
}

/**
 * ✅ 실내 경로 계산
 * - 캐싱된 그래프를 사용해 두 방(호실) 사이 최단 경로 반환
 */
async function handleRoomToRoom(from_building, from_floor, from_room, to_building, to_floor, to_room) {
  if (!indoorGraph || !indoorLocations) {
    throw new Error("실내 그래프가 초기화되지 않았습니다.");
  }

  const fromNode = `${from_room}@${from_floor}`;
  const toNode = `${to_room}@${to_floor}`;

  const result = dijkstra(indoorGraph, fromNode, toNode);
  return result;
}

// ✅ 함수/객체 export
module.exports = {
  initIndoorGraph,               // 서버 시작 시 호출
  handleRoomToRoom,              // 컨트롤러에서 호출
  getIndoorGraph: () => indoorGraph,       // 그래프 getter
  getIndoorLocations: () => indoorLocations // 좌표 getter
};
