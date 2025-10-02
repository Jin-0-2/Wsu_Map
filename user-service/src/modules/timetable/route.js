// src/modules/table/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const authMiddleware = require("../../middleware/auth")

// 내 시간표 불러오기
// 사용 가능한 사용자: 일반, 관리자
router.get("/", authMiddleware, controller.getAll)

// 시간표 추가 (Excel 업로드)
// 사용 가능한 사용자: 일반, 관리자
router.post("/upload", authMiddleware, controller.addExcel)

// 시간표 추가
// 사용 가능한 사용자: 일반, 관리자
router.post("/", authMiddleware, controller.add)

// 시간표 수정
// 사용 가능한 사용자: 일반, 관리자
router.put("/", authMiddleware, controller.update)

// 시간표 삭제
// 사용 가능한 사용자: 일반, 관리자
router.delete("/", authMiddleware, controller.delete);

// 건물명 매핑 조회 (참고용)

module.exports = router
