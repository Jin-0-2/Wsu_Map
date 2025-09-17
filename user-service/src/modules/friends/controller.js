// src/modules/friends/controller.js

const Service = require("./service")
const userService = require("../user/service")
const { notifyFriendRequest } = require('../../../websocket-server')

// 친구 목록 전체 조회
exports.getAll = async (req, res) => {
  try {
    
    const result = await Service.getAll();
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 내 친구 조회
exports.getMyFriend = async (req, res) => {
  try {

    const id = req.user.id;

    const result = await Service.getMyFriend(id);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
}

// 친구 추가
exports.add = async (req, res) => {
  try {

    const my_id = req.user.my_id;
    const add_id = req.body.add_id;

    if (my_id === add_id) {
      return res.status(400).send("자기 자신에게 친구 요청은 불가능합니다.");
    }

    // 친구 추가할 사용자가 실제로 존재하는지 확인
    const userExists = await userService.getUser(add_id);
    if (!userExists || userExists.rows.length === 0) {
      console.log("존재하지 않는 사용자입니다.");
      return res.status(404).send("존재하지 않는 사용자입니다.");
    }

    const result = await Service.add(my_id, add_id);

    const my_name = result.rows[0]?.user_name || my_id;

    notifyFriendRequest(my_id, my_name, add_id);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send(err);
  }
}

// 친구추가 보낸 요청 목록 조회
exports.my_req_list = async (req, res) => {
  try {

    const id = req.user.id;

    const result = await Service.my_req_list(id);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
}

// 친구추가 받은 요청 목록 조회
exports.request_list = async (req, res) => {
  try {
    const id = req.user.id;

    const result = await Service.request_list(id);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// 오 마이 미스테이크
exports.mistake = async (req, res) => {
  try {
    const my_id = req.user.id;
    const friend_id = req.body.friend_id;

    const result = await Service.mistake(my_id, friend_id);

    res.status(200).json({ message: "실수 인정" })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// 친구 요청 수락
exports.accept = async (req, res) => {
  try {

    const my_id = req.user.id;
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

    const my_id = req.user.id;
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
    const my_id = req.user.id;
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