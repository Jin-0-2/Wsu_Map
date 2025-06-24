const express = require("express");
const router = express.Router();

// 도메인별 라우터 import
const userRouter = require("../modules/user/route");
const apikeyRouter = require("../modules/apikey/route");
const logRouter = require("../modules/log/route")

// 도메인별 엔드포인트 등록
router.use("/user", userRouter);
router.use("/apikey", apikeyRouter);
router.use("/log", logRouter);

// 필요하다면 메인 페이지 라우트도 추가
router.get("/", (req, res) => {
  res.send("Welcome to the User System API!");
});

module.exports = router;
