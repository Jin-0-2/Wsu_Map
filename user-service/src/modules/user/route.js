// src/modules/user/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 성공!
// 회원 전체 조회
router.get("/", controller.getAll)


// 친구 신청용 목록 조회
router.get("/friend_request_list", controller.friend_request_list)

// 로그인 중인 회원만 조회
router.get("/islogin", controller.getislogin)

// 회원 한명 조회 마이페이지
router.get("/:id", controller.getUser)

// 성공!
// 회원가입
router.post("/register", controller.register)

// 성공!
// 로그인
router.post("/login", controller.login)

// 성공!
// 로그아웃
router.post("/logout", controller.logout)

// ...
// 회원정보 수정
router.put("/update", controller.update)

// 현재 위치 전송
router.put("/update_location", controller.update_location);

// 내 위치 공유 함 안함 할래 말래 할래 말래 할래 말래 애매하긴 해
router.put("/update_share_location", controller.update_share_location);

// 성공!
// 회원정보 삭제
router.delete("/delete", controller.delete)

// 아이디 찾기
router.post("/find_id", controller.find_id)

module.exports = router
