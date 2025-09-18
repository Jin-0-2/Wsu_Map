// src/modules/friends/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const authMiddleware = require("../../middleware/auth")


// 친구 목록 전체 조회
router.get("/", authMiddleware, controller.getAll)

// 내 친구 조회
router.get("/myfriend", authMiddleware, controller.getMyFriend)

// 친구 추가
router.post("/add", authMiddleware, controller.add)

// 친구추가 보낸 요청 목록 조회
router.get("/my_request_list", authMiddleware, controller.my_req_list)  

// 친구추가 받은 요청 목록 조회
router.get("/request_list", authMiddleware, controller.request_list)

// 내가 보낸 친구 요청 취소
router.post("/mistake", authMiddleware, controller.mistake);

// 친구 요청 수락
router.post("/accept", authMiddleware, controller.accept)

// 친구 요청 거절
router.post("/reject", authMiddleware, controller.reject)

// 친구 삭제
router.delete("/delete", authMiddleware, controller.delete)

module.exports = router
