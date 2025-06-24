// src/modules/floor/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 전체 검색
router.get("/", controller.getAll)

// 건물 별 층 조회(2D)
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
