// src/modules/path/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 경로 조회 및 반환
router.get("/", controller.getAll)

module.exports = router
