const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 1. 요청 헤더에서 토큰 가져오기
  // 클라이언트는 요청 헤더의 Authorization 필드에 'Bearer <JWT_TOKEN>' 형식으로 토큰을 보내야 합니다.
  const authHeader = req.headers.authorization;

  // 2. 헤더 및 토큰 형식 검사
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '인증 토큰이 필요하거나 형식이 올바르지 않습니다.' });
  }

  // 'Bearer ' 부분을 잘라내고 실제 토큰 값만 추출
  const token = authHeader.split(' ')[1];

  try {
    // 3. 토큰 검증 (비밀 키 사용)
    // 검증에 성공하면, 토큰 생성 시 넣었던 payload가 반환됩니다.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. 검증 성공 시, 요청 객체(req)에 사용자 정보 추가
    // 이제 이 미들웨어를 거치는 모든 API 컨트롤러에서 req.user.id 로 사용자 ID를 참조할 수 있습니다.
    req.user = { id: decoded.id };
    next(); // 다음 미들웨어 또는 컨트롤러로 제어를 넘깁니다.
  } catch (error) {
    // 5. 검증 실패 시 (만료, 위조 등)
    if (error.name === 'TokenExpiredError') {
      return res.status(419).json({ success: false, message: '토큰이 만료되었습니다. 다시 로그인해주세요.' });
    }
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
};

module.exports = authMiddleware;

ddddd