// src/modules/category/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 카테고리 검색(건물 이름 > 건물 위치)
router.get("/:name", controller.getAll)

// 건물_층 2d도면에 카테고리 필터 클릭시 띄우기
router.get("/:building", controller.getFloors)

// 층 조회 (2D)
router.get("/:floor/:building", controller.getFloorNumber)

// 층 추가
router.post("/", controller.create)

// 층 수정
router.put("/:floor/:building", controller.update)

// 층 삭제
router.delete("/:floor/:building", controller.delete)

module.exports = router
