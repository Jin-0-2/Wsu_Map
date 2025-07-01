// src/modules/floor/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 아직
// 전체 검색
router.get("/", controller.getAll)

// 아직.
// 건물 별 층 조회(2D) 목록 볼 때 필터.
router.get("/:building", controller.getFloors)

// 건물 별 층 목록만! 조회
router.get("/names/:building", controller.getFloorNames)

// 성공!
// 층 조회 (2D)
router.get("/:floor/:building", controller.getFloorNumber)

// 성공!
// 층 추가
router.post("/", controller.create)

// 아직
// 층 수정
router.put("/:floor/:building", controller.update)

// 아직(안쓸듯)?
// 층 삭제
router.delete("/:floor/:building", controller.delete)

module.exports = router
