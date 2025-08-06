// src/modules/user/controller.js

const userService = require("./service")
const { disconnectUserSocket, isUserConnected, notifyFriendsLocationUpdate, notifyLocationShareStatusChange } = require('../../../websocket-server')
const friendService = require("../friends/service")


// 회원 전체 조회
exports.getAll = async (req, res) => {
  try {

    const result = await userService.getAll();
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 친구 신청용 목록 조회
exports.friend_request_list = async (req, res) => {
  try {

    const result = await userService.friend_request_list(); 

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 로그인 중인 회원만 조회
exports.getislogin = async (req, res) => {
  try {
    
    const result = await userService.getislogin();

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
}

// 회원 한명 조회 마이페이지
exports.getUser = async (req, res) => {
  try{

    const id = req.params.id;

    const result = await userService.getUser(id);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
}

// 회원 가입
exports.register = async (req, res) => {
  try {

    const { id, pw, name, stu_number, phone, email } = req.body
    if (!id || !pw || !name || !phone) {
      return res.status(400).send("모든 항목을 입력하세요.")
    }
    const result = await userService.admin_register(id, pw, name, stu_number, phone, email);

    if (result && result.duplicate) {
      return res.status(409).send("이미 존재하는 아이디입니다.");
    }

    // 관리자 테이블에 Id 추가
    await userService.add_admin(result.Id);

    res.status(201).json({
      message: "회원가입이 완료되었습니다",
    });
  } catch (err) {
    console.error("회원가입 처리 중 오류:", err);
    // saveLog("", req.path, 500);
    res.status(500).send("회원가입 처리 중 오류");
  }
};

// 관리자 회원가입
exports.admin_register = async (req, res) => {
  try {

    const { id, pw, name, stu_number, phone, email } = req.body

    const result = await userService.admin_register(id, pw, name, stu_number, phone, email);

    if (result && result.duplicate) {
      return res.status(409).send("이미 존재하는 아이디입니다.");
    }

    // 관리자 테이블에 Id 추가
    await userService.add_admin(result.Id);

    res.status(201).json({
      message: "회원가입이 완료되었습니다",
    });
  } catch (err) {
    console.error("관리자 회원가입 처리 중 오류:", err);
    res.status(500).send("관리자 회원가입 처리 중 오류");
  }
}

// 로그인
exports.login = async (req, res) => {
  try {

    const { id, pw } = req.body
    if (!id || !pw) {
      return res.status(400).send("아이디와 비밀번호를 입력하세요.")
    }

    const result = await userService.login(id, pw);

    if (result && result.notfound) {
      return res.status(401).send("아이디 또는 비밀번호가 일치하지 않습니다.");
    }

    console.log(result);

    res.status(200).json(result);
  } catch (err) {
    console.error("로그인 처리 중 오류:", err);
    // saveLog("", req.path, 500);
    res.status(500).send("로그인 처리 중 오류");
  }
};

// 관리자 로그인
exports.admin_login = async (req, res) => {
  try {

    const { id, pw } = req.body
    if (!id || !pw) {
      return res.status(400).send("아이디와 비밀번호를 입력하세요.")
    }

    const result = await userService.check_admin(id);

    // 관리자 확인 결과가 없는 경우
    if (!result || !result.rows || !result.rows[0]) {
      console.log("관리자 아이디가 아닙니다.");
      return res.status(401).send("관리자 아이디가 아닙니다.");
    }

    const result2 = await userService.login(id, pw);

    if (result2 && result2.notfound) {
      return res.status(401).send("아이디 또는 비밀번호가 일치하지 않습니다.");
    }

    res.status(200).json(result2);
  } catch (err) {
    console.error("관리자 로그인 처리 중 오류:", err);
    res.status(500).send("관리자 로그인 처리 중 오류");
  }
}

// 로그아웃
exports.logout = async (req, res) => {
  try {

    const { id } = req.body;

    if (isUserConnected(id)) {
      disconnectUserSocket(id);
    } else {
      const result = await userService.logout(id);
      if (result.rowCount === 0) {
        // 업데이트된 행이 없음 → 잘못된 id
        return res.status(404).send("존재하지 않는 사용자입니다.");
      }
    }

    res.status(200).send("로그아웃 성공");

  } catch (err) {
    console.error("로그아웃 처리 중 오류:", err);

    res.status(500).send("로그아웃 처리 중 오류");
  }
};

// 회원 수정
exports.update = async (req, res) => {
  try {

    const {
      id = null,
      pw = null,
      phone = null,
      email = null
    } = req.body;

    if (!id) {
      return res.status(400).send("id는 필수입니다.")
    }
    if (!pw && !phone && !email) {
      return res.status(400).send("수정할 항목이 없습니다.")
    }

    const result = await userService.update(id, pw, phone, email);

    if (result.rowCount === 0) {
      return res.status(404).send("해당 id의 사용자가 없습니다.");
    }

    res.status(200).send("회원정보가 수정되었습니다.");
  } catch (err) {
    console.error("회원정보 수정 중 오류:", err);

    res.status(500).send("회원정보 수정 중 오류");
  }
};

// 현재 위치 전송
exports.update_location = async (req, res) => {
try {
    const id = req.body.id;
    const x = req.body.x;
    const y = req.body.y;
    const timestamp = req.body.timestamp;

    if (!id && !x && !y) {
      return res.status(400).send("필수 항목 누락입니다.")
    }

    const result = await userService.update_location(id, x, y, timestamp);

    if (result.rowCount === 0) {
      return res.status(404).send("해당 id의 사용자가 없습니다.");
    }
    console.log("사용자 위치 공유 여부:" , result.rows[0].Is_location_public);

    if (result.rows[0].Is_location_public) {
      const friend_list = await friendService.getMyFriend(id);

      const friendIds = friend_list.rows.map(f => f.Id);
  
      // 내 위치 친구에게 전송
      notifyFriendsLocationUpdate(friendIds, id, x, y);
    }

    res.status(200).send("현재 위치 업데이트 완료");
  } catch (err) {
    console.error("현재 위치 업데이트 오류:", err);

    res.status(500).send("현재 위치 업데이트 오류");
  } 
};

// 내 위치 공유 함 안함 할래 말래 할래 말래 할래 말래 애매하긴 해
exports.update_share_location = async (req, res) => {
  try {
    const id = req.body.id;

    const result = await userService.update_share_location(id);
    
    // 위치 공유 상태가 변경되었으므로 친구들에게 웹소켓 알림
    const isLocationPublic = result.rows[0].Is_location_public;
    
    try {
      await notifyLocationShareStatusChange(id, isLocationPublic);
      console.log(`사용자 ${id}의 위치 공유 상태 변경 알림 전송 완료 (상태: ${isLocationPublic})`);
    } catch (notifyErr) {
      console.error('위치 공유 상태 변경 알림 전송 실패:', notifyErr);
      // 알림 실패해도 위치 공유 상태 변경은 성공으로 처리
    }

    res.status(200).send("내 위치 공유 함 안함 할래 말래 할래 말래 할래 말래 애매하긴 해 완료");
  } catch (err) {
    console.error("내 위치 공유 함 안함 할래 말래 할래 말래 할래 말래 애매하긴 해 오류:", err);
    res.status(500).send("위치 공유 상태 변경 실패");
  }
}

// 회원 삭제
exports.delete = async (req, res) => {
  try {

    const { id } = req.body;

    const result = await userService.delete(id);
    if (result.rowCount === 0) {
      // 삭제된 행이 없음 → 잘못된 id
      return res.status(404).send("존재하지 않는 사용자입니다.");
    }

    res.status(200).send("회원 삭제 성공");
  } catch (err) {
    console.error("회원 삭제 처리 중 오류:", err);

    res.status(500).send("회원 삭제 처리 중 오류");
  }
};

// 아이디 찾기
exports.find_id = async (req, res) => {
try { 

    const { email } = req.body.email;

    const result = await userService.find_id(email);
    if (result.rowCount === 0) {
      // 삭제된 행이 없음 → 잘못된 id
      return res.status(404).send("존재하지 않는 사용자입니다.");
    }

    const id = result.rows[0].Id;

  //   const transporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: 'jjy020815@gmail.com',
  //     pass: 'aa3125010'
  //   }
  // });

  // const mailOptions = {
  //   from: 'jjy020815@gmail.com',
  //   to: email,
  //   subject: '비밀번호 재설정 인증 코드',
  //   text: `인증 코드는 ${code} 입니다.`
  // };

    res.status(200).send(result.rows);
  } catch (err) {
    console.error("회원 삭제 처리 중 오류:", err);

    res.status(500).send("회원 삭제 처리 중 오류");
  }
}