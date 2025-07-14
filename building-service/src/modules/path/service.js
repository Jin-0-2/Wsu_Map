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

exports.getIndoorEdges = (building_name, floor) => {
  const prefix = `${building_name}@${floor}@`;

  const filteredGraph = Object.entries(indoorGraph)
    .filter(([key]) => key.startsWith(prefix))
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  return filteredGraph;
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

// 노드끼리 잇기
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

// 노드 연결 해제
exports.disconnect = async (from_node, to_node) => {
  const delete_OutSideEdge = `DELETE FROM "OutSideEdge" WHERE ("From_Node" = $1 AND "To_Node" = $2) OR ("From_Node" = $2 AND "To_Node" = $1)`;

  const values = [from_node, to_node];

  return new Promise((resolve, reject) => {
    con.query(delete_OutSideEdge, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// 현위치에서 가장 가까운 노드 찾기
exports.getCloseNode = async (from_location) => {
  let closestNodeName = null;
  let minDistance = Infinity; // 최소 거리를 저장할 변수 (초기값은 무한대)

  // outdoorLocations 객체의 모든 노드를 순회합니다.
  for (const nodeName in outdoorLocations) {
    if (outdoorLocations.hasOwnProperty(nodeName)) {
      const nodeCoords = outdoorLocations[nodeName];
      
      // 이미 있는 haversineDistance 함수를 사용하여 거리를 계산합니다.
      const distance = haversineDistance(from_location, nodeCoords);

      // 만약 계산된 거리가 지금까지 찾은 최소 거리보다 짧다면,
      if (distance < minDistance) {
        minDistance = distance;       // 최소 거리를 현재 거리로 업데이트
        closestNodeName = nodeName;   // 가장 가까운 노드의 이름을 현재 노드 이름으로 업데이트
      }
    }
  }
  
  // 디버깅을 위해 콘솔에 로그를 남깁니다. (단위: 미터)
  console.log(`[getCloseNode] 가장 가까운 노드: '${closestNodeName}', 거리: 약 ${minDistance.toFixed(1)}m`);
  
  // 찾은 가장 가까운 노드의 이름을 반환합니다.
  return closestNodeName;
};

// 건물 ↔ 건물 (외부만 사용)
exports.handleBuildingToBuilding = (from_building, to_building) => {
  console.log(outdoorLocations);

  const outdoorPath = dijkstra(outdoorGraph, from_building, to_building, outdoorLocations);

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

  // 출구 층 결정
  let entrance_floor = 1;
  // from_building이 W15 또는 W17-동관일 경우 출구는 2층
  if (from_building === "W15" || from_building === "W17-동관") {
    entrance_floor = 2;
  }

  const start_enterance = `${from_building}@${entrance_floor}@enterence`;


  // 건물 내부 탈출 (1층 입구까지 가는건 동일)
  const indoorPath = dijkstra(indoorGraph, start_room, start_enterance);

  // 출발 층 도면 가져오기
  let start_svg = await floor.getFloorNumber(from_floor, from_building);

  // 출구 층 도면 가져오기 (출발 층과 다른 경우에만)
  let end_svg = null;
  if (Number(from_floor) !== entrance_floor) {
    end_svg = await floor.getFloorNumber(entrance_floor, from_building);
  }

  // 건물 -> 건물
  const outdoorPath = dijkstra(outdoorGraph, from_building, to_building, outdoorLocations);

  return {
    departure_indoor: {
      start_floorImage: start_svg, // 출발 층 도면
      end_floorImage: end_svg,     // 입구(탈출) 층 도면
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
  const outdoorPath = dijkstra(outdoorGraph, from_building, to_building, outdoorLocations);

  // 입구 층 결정
  let entrance_floor = 1;

  // to_building이 W15이거나 from_building이 W17-동관일 경우 입구는 2층
  if (to_building === "W15" || from_building === "W17-동관") {
    entrance_floor = 2;
  }

  // 건물 도착 후 실내 경로 설정
  const entery_enterance = `${to_building}@${entrance_floor}@enterence`;
  const entry_room = `${to_building}@${to_floor}@${to_room}`;

  // 건물 내부 이동 경로 계산
  const indoorPath = dijkstra(indoorGraph, entery_enterance, entry_room);

  // 도착 건물의 시작 층(입구 층) 도면 가져오기
  const startFloorSvg = await floor.getFloorNumber(entrance_floor, to_building);

  // 도착 층의 도면 가져오기 (입구 층과 다른 경우에만)
  let endFloorSvg = null;
  if (to_floor !== entrance_floor) {
     endFloorSvg = await floor.getFloorNumber(to_floor, to_building);
  }

  return {
    outdoor: {
      path: outdoorPath               // 실외 경로
    },
    arrival_indoor: {
      start_floorImage: startFloorSvg,
      end_floorImage: endFloorSvg,
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

      const indoorPath = dijkstra(indoorGraph, start_room, end_room);

      let start_svg = null;
      if (from_floor != to_floor) {
        start_svg = await floor.getFloorNumber(from_floor, from_building);
      }

      let end_svg = await floor.getFloorNumber(to_floor, to_building);
      console.log(indoorPath);

      return {
        arrival_indoor: {
          start_floorImage: start_svg, // 실내 사진 svg 링크
          end_floorImage: end_svg,
          path: indoorPath                // 실내 경로
        }
      };
    } else {
      // 다른 건물 간 이동: 실내 → 실외 → 실내 경로
      // 1. 출발 호실 → 출발 건물 출구 (실내)
      const start_room = `${from_building}@${from_floor}@${from_room}`;
      const exit_floor = (from_building === "W15" || from_building === "W17-동관") ? 2 : 1;
      const exit_entrance = `${from_building}@${exit_floor}@enterence`;

      const departure_indoor_path = dijkstra(indoorGraph, start_room, exit_entrance);


      // 출발 층(from_floor) 도면 가져오기
      let departure_start_floorImage = await floor.getFloorNumber(from_floor, from_building);

      // 출구 층(exit_floor) 도면 가져오기 (출발 층과 다른 경우에만)
      let departure_end_floorImage = null;
      if (Number(from_floor) !== exit_floor) {
        departure_end_floorImage = await floor.getFloorNumber(exit_floor, from_building);
      }

      // 2. 출발 건물 출입구 → 도착 건물 출입구(실외)
      const outdoorPath = dijkstra(outdoorGraph, from_building, to_building, outdoorLocations);

      // 3. 도착 건물 출입구 → 도착 호실 (실내)
      const entry_floor = (to_building === "W15" || to_building === "W17-동관") ? 2 : 1;
      const entry_entrance = `${to_building}@${entry_floor}@enterence`;
      const entry_room = `${to_building}@${to_floor}@${to_room}`;

      const arrival_indoor_path = dijkstra(indoorGraph, entry_entrance, entry_room);

      // 건물 내부 이동 (입구 -> 방)
      const entry_indoor_path = dijkstra(indoorGraph, entery_enterance, entry_room);

      // 도착 건물 입구 층(entry_floor) 도면 가져오기
      let arrival_start_floorImage = await floor.getFloorNumber(entry_floor, to_building);;

      // 도착 층(to_floor) 도면 가져오기 (입구 층과 다른 경우에만)
      let arrival_end_floorImage = null;
      if (Number(to_floor) !== entry_floor) {
        arrival_end_floorImage = await floor.getFloorNumber(to_floor, to_building);
      }

      return {
        departure_indoor: {
          start_floorImage: departure_start_floorImage, // 출발 층 도면
          end_floorImage: departure_end_floorImage,     // 출구 층 도면
          path: departure_indoor_path
        },
        outdoor: {
          path: outdoorPath
        },
        arrival_indoor: {
          start_floorImage: arrival_start_floorImage,  // 입구 층 도면
          end_floorImage: arrival_end_floorImage,     // 도착 층 도면
          path: arrival_indoor_path
        }
      };
    }
  } catch (err) {
    throw err;
  }
}

// 내부
// ✅ 두 좌표 간의 유클리드 거리 계산 함수
const euclideanDistance = (a, b) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// ✅ DB에서 그래프 구성
async function buildIndoorGraph() {
  // 1. 방 위치 정보 가져오기: "Room_Location" 컬럼을 추가로 조회합니다.
  const roomRes = await con.query(`
        SELECT
      F."Building_Name",
      F."Floor_Number",
      FR."Room_Name",
      FR."Room_Location"
    FROM "Floor_R" AS FR
    JOIN "Floor" AS F ON FR."Floor_Id" = F."Floor_Id"
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

  // 2. 방 좌표를 저장할 객체: key에 {x, y} 좌표 객체를 매칭합니다.
  const locations = {};
  // "Room_Location"은 DB 드라이버(pg)에 의해 보통 {x: 123, y: 456} 형태의 객체로 반환됩니다.
  roomRes.rows.forEach(({ Building_Name, Floor_Number, Room_Name, Room_Location }) => {
    const key = `${Building_Name}@${Floor_Number}@${Room_Name}`;
    // locations 객체에 키와 좌표 정보를 저장합니다.
    locations[key] = Room_Location;
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
        // 이제 locations[fromKey]는 {x, y} 객체이므로 정상적으로 거리를 계산할 수 있습니다.
        const distance = euclideanDistance(locations[fromKey], locations[toKey]);
        graph[fromKey].push({ node: toKey, weight: distance });
        // 양방향 그래프인 경우 반대 방향도 추가
        // graph[toKey].push({ node: fromKey, weight: distance });
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
function dijkstra(graph, startNode, endNode, locations = {}) {
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

  // locations 객체가 존재하고, 비어있지 않은지 확인합니다.
  if (locations && Object.keys(locations).length > 0) {
    // locations 정보가 있으면, 좌표를 매핑하여 반환합니다.
    const path = pathKeys
      .map(key => {
        const loc = locations[key];
        if (loc) {
          const x = loc.x !== undefined ? loc.x : loc.lat;
          const y = loc.y !== undefined ? loc.y : loc.lng;
          return { name: key, x, y };
        }
        return null;
      })
      .filter(Boolean); // 혹시라도 loc 정보가 없는 경우 null을 제거합니다.

    return { distance: distances[endNode], path };
  } else {
    // locations 정보가 없으면, pathKeys 배열을 그대로 반환합니다.
    return { distance: distances[endNode], path: pathKeys };
  }
}

exports.initIndoorGraph = initIndoorGraph;
exports.initOutdoorGraph = initOutdoorGraph;