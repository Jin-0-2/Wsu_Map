// src/modules/user/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")
const authMiddleware = require("../../middleware/auth")

// 회원 전체 조회
// 사용 가능한 사용자: 일반, 관리자
router.get("/", authMiddleware, controller.getAll)


// 친구 신청용 목록 조회
// 사용 가능한 사용자: 일반, 관리자
router.get("/friend_request_list", authMiddleware, controller.friend_request_list)

// 로그인 중인 회원만 조회
// 사용 가능한 사용자: 일반, 관리자
router.get("/islogin", authMiddleware, controller.getislogin)

// 회원 한명 조회 (마이페이지)
// 사용 가능한 사용자: 일반, 관리자
router.get("/:id", authMiddleware, controller.getUser)

// 회원가입
// 사용 가능한 사용자: 일반 (인증 불필요)
router.post("/register", controller.register)

// 관리자 회원가입
// 사용 가능한 사용자: 관리자 (인증 불필요)
router.post("/admin_register", controller.admin_register)

// 로그인
// 사용 가능한 사용자: 관리자 (인증 불필요)
router.post("/login", controller.login)

// 게스트 로그인
// 사용 가능한 사용자: 게스트, 일반, 관리자 (인증 불필요)
router.post("/guest_login", controller.guest_login)

// 관리자 로그인
// 사용 가능한 사용자: 관리자 (인증 불필요)
router.post("/admin_login", controller.admin_login)

// 로그아웃
// 사용 가능한 사용자: 일반, 관리자
router.post("/logout", authMiddleware, controller.logout)

// 회원정보 수정
// 사용 가능한 사용자: 일반, 관리자
router.put("/update", authMiddleware, controller.update)

// 현재 위치 전송
// 사용 가능한 사용자: 일반, 관리자
router.put("/update_location", authMiddleware, controller.update_location);

// 위치 공유 설정 토글
// 사용 가능한 사용자: 일반, 관리자
router.put("/update_share_location", authMiddleware, controller.update_share_location);

// 회원정보 삭제
// 사용 가능한 사용자: 일반, 관리자
router.delete("/delete", authMiddleware, controller.delete)

// 아이디 찾기
// 사용 가능한 사용자: 게스트, 일반, 관리자 (인증 불필요)
router.post("/find_id", controller.find_id)

// 튜토리얼 다시 보지 않기
// 사용 가능한 사용자: 일반, 관리자
router.put("/update_tutorial", authMiddleware, controller.update_tutorial)

module.exports = router
