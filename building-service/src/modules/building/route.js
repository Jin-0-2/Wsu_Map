// src/modules/building/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 빌딩 전체 조회(메인화면)
router.get("/", controller.getAll)

// 빌딩 위치 조회
router.get("/:name", controller.getBuilding_Location)

// 빌딩 3D 도면 출력
router.get("/:name/3d", controller.getBuilding_3d)

// 빌딩 추가
router.post("/", controller.create)

// 빌딩 수정
router.put("/:name", controller.update)

module.exports = router
