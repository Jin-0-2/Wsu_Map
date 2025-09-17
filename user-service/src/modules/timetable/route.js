// src/modules/table/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const authMiddleware = require("../../middleware/auth")

// 시간표 전체 조회

// 내 시간표 불러오기  /:id >  /
router.get("/", authMiddleware, controller.getAll)

// 시간표 추가 at Excel (더 구체적인 라우트를 먼저) /:id/upload
router.post("/upload", authMiddleware, controller.addExcel)

// 시간표 추가
router.post("/", authMiddleware, controller.add)

// 시간표 수정
router.put("/", authMiddleware, controller.update)

// 시간표 삭제
router.delete("/", authMiddleware, controller.delete);

// 건물명 매핑 조회

module.exports = router
