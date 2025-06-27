// src/modules/room/controller.js

const Service = require("./service")
const { dijkstra, outdoorGraph, outdoorLocations } = require('./service');
const { logRequestInfo } = require('../../core/logger'); // 경로는 상황에 맞게


// 전체 조회
exports.getPath = async (req, res) => {
  try {
    logRequestInfo(req);

    const result = await Service.getPath();
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};
