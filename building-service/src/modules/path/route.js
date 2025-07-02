// src/modules/path/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 경로 조회 및 반환
router.post("/", controller.getPath)

router.get("/", controller.getNodes)

router.get("/edges", controller.getEdges)

router.put("/", controller.update_node_location)

// 건물/경로 추가
router.post("/create", controller.create)

module.exports = router