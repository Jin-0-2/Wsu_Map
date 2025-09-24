const jwt = require('jsonwebtoken');

// 이 미들웨어는 반드시 authMiddleware 다음에 사용해야 합니다.
const adminMiddleware = (req, res, next) => {
  // authMiddleware가 req.user에 디코딩된 토큰 정보를 저장했습니다.
  // req.user 객체와 isAdmin 플래그의 존재 여부만 확인합니다.
  if (req.user && req.user.isAdmin) {
    console.log("관리자 확인 성공");
    next(); // 관리자 확인, 다음 단계로 진행
  } else {
    res.status(403).json({ success: false, message: '접근 권한이 없습니다. 관리자만 접근 가능합니다.' });
  }
};

module.exports = adminMiddleware;
