// src/modules/path/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const authMiddleware = require("../../middleware/auth")
const adminMiddleware = require("../../middleware/admin")
const { flexibleAuthMiddleware } = require("../../middleware/guest")

// 경로 조회 및 반환
// 사용 가능한 사용자: 일반, 관리자, 게스트
router.post("/", authMiddleware, controller.getPath)

// 노드 목록 조회
// 사용 가능한 사용자: 일반, 관리자
router.get("/", authMiddleware, controller.getNodes)

// 엣지 목록 조회
// 사용 가능한 사용자: 일반, 관리자
router.get("/edges", authMiddleware, controller.getEdges)

// 노드 위치 수정
// 사용 가능한 사용자: 관리자
router.put("/", authMiddleware, adminMiddleware, controller.update_node_location)

// 외부 - 건물/경로 추가
// 사용 가능한 사용자: 관리자
router.post("/create", authMiddleware, adminMiddleware, controller.create)

// 노드/건물 삭제
// 사용 가능한 사용자: 관리자
router.delete("/", authMiddleware, adminMiddleware, controller.delete);

// 노드끼리 잇기
// 사용 가능한 사용자: 관리자
router.post("/connect", authMiddleware, adminMiddleware, controller.connect)

// 노드 연결 해제
// 사용 가능한 사용자: 관리자
router.delete("/disconnect", authMiddleware, adminMiddleware, controller.disconnect);

module.exports = router