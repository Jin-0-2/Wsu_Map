// src/modules/path/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const authMiddleware = require("../../middleware/auth")
const adminMiddleware = require("../../middleware/admin")

// 경로 조회 및 반환
router.post("/", controller.getPath)

router.get("/", controller.getNodes)

router.get("/edges", controller.getEdges)

router.put("/", authMiddleware, adminMiddleware, controller.update_node_location)

// 외부
// 건물/경로 추가
router.post("/create", authMiddleware, adminMiddleware, controller.create)

// 노드/건물 삭제
router.delete("/", authMiddleware, adminMiddleware, controller.delete);

// 노드끼리 잇기
router.post("/connect", authMiddleware, adminMiddleware, controller.connect)

// 노드 연결 해제
router.delete("/disconnect", authMiddleware, adminMiddleware, controller.disconnect);

module.exports = router