// src/modules/table/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 내 시간표 불러오기
router.get("/:id", controller.getAll)

// 시간표 추가
router.post("/:id", controller.add)

// 시간표 수정
router.put("/:id", controller.update)

// 사간표 삭제
router.delete("/:id", controller.delete);


module.exports = router
