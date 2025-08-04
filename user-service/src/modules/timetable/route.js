// src/modules/table/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 내 시간표 불러오기
router.get("/:id", controller.getAll)

// 시간표 추가 at Excel (더 구체적인 라우트를 먼저)
router.post("/:id/upload", controller.addExcel)

// 시간표 추가
router.post("/:id", controller.add)

// 시간표 수정
router.put("/:id", controller.update)

// 시간표 삭제
router.delete("/:id", controller.delete);

// 건물명 매핑 조회

module.exports = router
