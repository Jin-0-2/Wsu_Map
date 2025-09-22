// src/modules/user/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const authMiddleware = require("../../middleware/auth")

// 성공!
// 회원 전체 조회
router.get("/", authMiddleware, controller.getAll)


// 친구 신청용 목록 조회
router.get("/friend_request_list", authMiddleware, controller.friend_request_list)

// 로그인 중인 회원만 조회
router.get("/islogin", authMiddleware, controller.getislogin)

// 회원 한명 조회 마이페이지
router.get("/:id", authMiddleware, controller.getUser)

// 성공!
// 회원가입
router.post("/register", controller.register)

// 관리자 회원가입
router.post("/admin_register", controller.admin_register)

// 성공!
// 로그인
router.post("/login", controller.login)

// 관리자 로그인
router.post("/admin_login", controller.admin_login)

// 성공!
// 로그아웃
router.post("/logout", authMiddleware, controller.logout)

// ...
// 회원정보 수정
router.put("/update", authMiddleware, controller.update)

// 현재 위치 전송
router.put("/update_location", authMiddleware, controller.update_location);

// 내 위치 공유 함 안함 할래 말래 할래 말래 할래 말래 애매하긴 해
router.put("/update_share_location", authMiddleware, controller.update_share_location);

// 성공!
// 회원정보 삭제
router.delete("/delete", authMiddleware, controller.delete)

// 아이디 찾기
router.post("/find_id", controller.find_id)

// 튜토리얼 다시 보지 않기
router.put("/update_tutorial", authMiddleware, controller.update_tutorial)

module.exports = router
