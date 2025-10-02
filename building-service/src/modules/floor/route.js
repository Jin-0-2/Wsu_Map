// src/modules/floor/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const auth = require("../../middleware/auth")
const admin = require("../../middleware/admin")
const { flexibleAuthMiddleware } = require("../../middleware/guest")

// 아직
// 전체 검색
// 사용 가능한 사용자: 일반, 관리자
router.get("/", auth, controller.getAll)

// 아직.
// 건물 별 층 조회(2D) 목록 볼 때 필터.
// 사용 가능한 사용자: 일반, 관리자, 게스트트
router.get("/:building", flexibleAuthMiddleware, controller.getFloors)

// 건물 별 층 목록만! 조회
// 사용 가능한 사용자: 일반, 관리자
router.get("/names/:building", auth, controller.getFloorNames)

// 성공!
// 층 조회 (2D)
// 사용 가능한 사용자: 일반, 관리자
router.get("/:floor/:building", auth, controller.getFloorNumber)

// 성공!
// 층 추가
// 사용 가능한 사용자: 관리자
router.post("/", auth, admin, controller.create)

// 아직
// 층 수정
// 사용 가능한 사용자: 관리자
router.put("/:floor/:building", auth, admin, controller.update)

// 아직(안쓸듯)?
// 층 삭제
// 사용 가능한 사용자: 관리자
router.delete("/:floor/:building", auth, admin, controller.delete)

module.exports = router
