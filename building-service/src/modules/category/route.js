// src/modules/category/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 건물(W1~W19) 카테고리 목록 전부다. : 관리자에서.........
router.get("/", controller.getAll)

// 카테고리 검색(카테고리 이름 > 건물 위치) 메인화면에서 상단부분 필터 클릭 시
router.get("/:category", controller.getBuildingLocationsByCategory)

// 건물_층 2d도면에 카테고리 필터 클릭시 띄우기
router.get("/:building/:floor", controller.getCategoryLocationsAt2D)

// 카테고리 추가(2d도면에서 좌표 지정, 이름 지정을 하면, 카테고리스, floor_c에 들거가게끔)
router.post("/:building/:floor", controller.create)

// 카테고리 삭제: 이건 관리 페이지에서.. 목록을 보고 삭제를..
router.delete("/:building/:floor", controller.delete)

module.exports = router
