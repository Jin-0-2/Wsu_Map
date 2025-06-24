// Eun
// User.js
const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 회원 전체 조회
router.get("/", controller.getAll)

// 회원가입
router.post("/register", controller.register)

// 로그인
router.post("/login", controller.login)

// 로그아웃
router.post("/logout", controller.logout)

// 회원정보 수정
router.put("/update", controller.update)

module.exports = router
