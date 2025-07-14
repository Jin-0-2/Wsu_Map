// src/routes/index.js

const express = require("express");
const router = express.Router();

// 도메인별 라우터 import
const userRouter = require("../modules/user/route");
const friendRouter = require("../modules/friends/route");
const timeRouter = require("../modules/timetable/route");


// 도메인별 엔드포인트 등록
router.use("/user", userRouter);
router.use("/friend", friendRouter)
router.use("/timetable", timeRouter)


// 필요하다면 메인 페이지 라우트도 추가
router.get("/", (req, res) => {
  res.send("Welcome to the User System API!");
});

module.exports = router;
