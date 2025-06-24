// src/routes/index.js

const express = require("express");
const router = express.Router();

// 도메인별 라우터 import
const buildingRouter = require("../modules/building/route");
const floorRouter = require("../modules/floor/route");

// 도메인별 엔드포인트 등록
router.use("/building", buildingRouter);
router.use("/floor", floorRouter);

// 필요하다면 메인 페이지 라우트도 추가
router.get("/", (req, res) => {
  res.send("Welcome to the Building System API!");
});

module.exports = router;
