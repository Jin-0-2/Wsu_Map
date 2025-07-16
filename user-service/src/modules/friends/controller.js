// src/modules/friends/controller.js

const Service = require("./service")
// const nodemailer = require('nodemailer');
const { logRequestInfo } = require('../../core/logger'); // 경로는 상황에 맞게

// 친구 목록 전체 조회
exports.getAll = async (req, res) => {
  try {
    logRequestInfo(req);
    
    const result = await Service.getAll();
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 내 친구 조회
exports.getMyFreind = async (req, res) => {
  try {
    logRequestInfo(req);

    const id = req.params.id;

    const result = await Service.getMyFreind(id);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
}

// 친구 추가
exports.add = async (req, res) => {
  try {
    logRequestInfo(req);

    const my_id = req.body.my_id;
    const add_id = req.body.add_id;

    if (my_id === add_id) {
      return new Error("자기 자신에게 친구 요청은 불가능합니다.");
    }

    const result = await Service.add(my_id, add_id);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send(err);
  }
}

// 친구추가 보낸 요청 목록 조회
exports.my_req_list = async (req, res) => {
  try {
    logRequestInfo(req);

  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
}

// 친구추가 받은 요청 목록 조회
exports.request_list = async (req, res) => {
  try {
    logRequestInfo(req);
    const id = req.params.id;

    const result = await Service.request_list(id);

    console.log(result.rows)

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
}

// 친구 요청 수락
exports.accept = async (req, res) => {
  try {
    logRequestInfo(req);

    const my_id = req.body.my_id;
    const add_id = req.body.add_id;

    await Service.accept(my_id, add_id);

    res.status(200).json({ success: true, message: "친구 요청을 수락했습니다." })

  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
}

// 친구 요청 거절
exports.reject = async (req, res) => {
  try {
    logRequestInfo(req);

    const my_id = req.body.my_id;
    const add_id = req.body.add_id;

    await Service.reject(my_id, add_id);

    res.status(200).json({ success: true, message: "친구 요청을 거절했습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
}

// 친구 삭제
exports.delete = async (req, res) => {
  try {
    logRequestInfo(req);

    const my_id = req.body.my_id;
    const add_id = req.body.add_id;

    const result = await Service.delete(my_id, add_id);

    if (result.rowCount > 0) {
      res.status(200).json({ success: true, message: "친구 삭제 완료" });
    } else {
      res.status(404).json({ success: false, message: "친구 관계가 존재하지 않습니다" });
    }
  } catch (err) {
    console.error("친구 삭제 처리 중 오류:", err);
    res.status(500).send({ success: false, message: "친구 삭제 처리 중 오류" });
  }
};