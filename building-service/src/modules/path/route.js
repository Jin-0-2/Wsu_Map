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

// 노드/건물 삭제
router.delete("/", controller.delete);

// 노드끼리 잇기
router.post("/connect", controller.connect)

// 노드 연결 해제
router.delete("/disconnect", controller.disconnect)

module.exports = router