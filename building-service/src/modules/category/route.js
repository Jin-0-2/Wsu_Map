// src/modules/category/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const auth = require("../../middleware/auth")
const admin = require("../../middleware/admin")
const { flexibleAuthMiddleware } = require("../../middleware/guest")

// 카테고리 이름을 반환(그거.. 그거 뭐지? 그거 ㅇㅇ 뭐였더라..) 카테고리 추가할 때 선택할 콤보박스 

// 건물(W1~W19) 카테고리 목록 전부다. : 관리자에서.........
// 사용 가능한 사용자: 일반, 관리자, 게스트
router.get("/", auth, controller.getAll)

// 카테고리 검색(카테고리 이름 > 건물 위치) 메인화면에서 상단부분 필터 클릭 시
// 사용 가능한 사용자: 일반, 관리자, 게스트
router.get("/:category", auth, controller.getBuildingLocationsByCategory)

// 아직.
// 건물_층 2d도면에 카테고리 필터 클릭시 띄우기
// 사용 가능한 사용자: 일반, 관리자
router.get("/:building/:floor", auth, controller.getCategoryLocationsAt2D)

// 관리자용 카테고리 관리에 사용
// 건물/층을 입력받아 그 층에 있는 모든 카테고리의 이름과 좌표 반환
// 사용 가능한 사용자: 관리자
router.get("/manager/:building/:floor", auth, admin, controller.getCategoryForManager)

// 성공!
// 카테고리 추가(2d도면에서 좌표 지정, 이름 지정을 하면, categories, floor_c에 들거가게끔)
// 사용 가능한 사용자: 관리자
router.post("/:building/:floor", auth, admin, controller.create)

// 아직.
// 카테고리 삭제: 이건 관리 페이지에서.. 목록을 보고 삭제를..
// 사용 가능한 사용자: 관리자
router.delete("/:building/:floor", auth, admin, controller.delete)

module.exports = router
