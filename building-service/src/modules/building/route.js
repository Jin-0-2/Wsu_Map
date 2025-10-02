// src/modules/building/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const auth = require("../../middleware/auth")
const admin = require("../../middleware/admin")
const { flexibleAuthMiddleware } = require("../../middleware/guest")

// 아직...
// 빌딩 전체 조회(메인화면)
// 사용 가능한 사용자: 일반, 관리자, 게스트트
router.get("/", auth, controller.getAll)

// 빌딩 이름만 조회
// 사용 가능한 사용자: 일반, 관리자
router.get("/names", auth, controller.getNames);


// 빌딩 위치 조회
// 사용 가능한 사용자: 일반, 관리자
router.get("/:name", auth, controller.getBuilding_Location)


// 할필요 없기함. 근데 함. 성공!
// 빌딩 추가
// 사용 가능한 사용자: 관리자
router.post("/", auth, admin, controller.create)

// 빌딩 수정 (설명만 고치는 걸로)
// 사용 가능한 사용자: 관리자
router.put("/:name", auth, admin, controller.update)

// 삭제
// 사용 가능한 사용자: 관리자
router.delete("/:name", auth, admin, controller.delete)

// 빌딩 이미지 삭제
// 사용 가능한 사용자: 관리자
router.delete("/:name/image", auth, admin, controller.deleteImage)

module.exports = router
