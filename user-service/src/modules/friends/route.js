// src/modules/friends/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 친구 목록 전체 조회
router.get("/", controller.getAll)

// 내 친구 조회
router.get("/myfriend/:id", controller.getMyFreind)

// 친구 추가
router.post("/add", controller.add)

// 친구추가 받은 요청 목록 조회
router.get("/request_list/:id", controller.request_list)

// 친구 요청 수락
router.post("/accept", controller.accept)

// 친구 요청 거절
router.post("/reject", controller.reject)

// 친구 삭제
router.delete("/delete", controller.delete)

module.exports = router
