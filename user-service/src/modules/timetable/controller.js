// src/modules/user/controller.js

const Service = require("./service")
// const nodemailer = require('nodemailer');
const { logRequestInfo } = require('../../core/logger'); // 경로는 상황에 맞게

// 내 시간표 불러오기
exports.getAll = async (req, res) => {
  try {
    logRequestInfo(req);

    const id  = req.params.id;
    
    const result = await Service.getAll(id);
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 시간표 추가
exports.add = async (req, res) => {
  try {
    logRequestInfo(req);

    const id  = req.params.id;
    const {
      title,
      day_of_week,
      start_time,
      end_time,
      building_name,
      floor_number,
      room_name,
      professor,
      color,
      memo,
    } = req.body;
    
    const result = await Service.add(
        id, title, day_of_week, 
        start_time, end_time, 
        building_name, floor_number, room_name,
        professor,
        color, memo
    );

    res.status(201).json({ success: true, result });
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 시간표 추가
exports.update = async (req, res) => {
  try {
    logRequestInfo(req);

    const id  = req.params.id;
    
    const result = await Service.update(id);
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 시간표 삭제
exports.delete = async (req, res) => {
  try {
    logRequestInfo(req);

    const id  = req.params.id;
    
    const result = await Service.delete(id);
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};