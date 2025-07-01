// src/modules/user/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 성공!
// 회원 전체 조회
router.get("/", controller.getAll)

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

// 성공!
// 회원정보 삭제
router.delete("/delete", controller.delete)

module.exports = router
