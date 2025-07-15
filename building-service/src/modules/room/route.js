// src/modules/room/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 방 목록 전부다 : 관리자
router.get("/", controller.getAll)

// 건물만 해서 모든 층의 방 반환
router.get("/:building", controller.getRoombyBuilding)

// 건물_층의 방 목록 조회 : 관리자
router.get("/:building/:floor", controller.getRoombyBuildingFloor)

// 2D도면에서 방 클릭 시 보여줄 방 이름 및 설명 : 앱
router.get("/desc/:building/:floor/:room", controller.getRoomDescByName)

// 길찾기용 포인트 (수정 필요)
router.get("/point/:building/:floor", controller.getRoomPointByName)

// 방 수정
router.put("/:building/:floor", controller.update)

// 실내 패스 도면 연결
router.post("/connect", controller.connect);

// 실내 패스 도면 연결 해제
router.delete("/disconnect", controller.disconnect);

// 경로 연결 시 다른 층의 계단 검색
router.get("/stairs", controller.stairs);


// 필ㅇ없ㅇㅁ.
// 방 추가
router.post("/:building/:floor", controller.create)

// 방 삭제
router.delete("/:building/:floor", controller.delete)
module.exports = router
