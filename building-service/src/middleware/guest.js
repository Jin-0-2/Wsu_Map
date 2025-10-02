const jwt = require('jsonwebtoken');

// 통합 인증 미들웨어 (일반 사용자 + 게스트 모두 접근 가능)
const flexibleAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[FLEXIBLE AUTH FAIL] ${req.method} ${req.originalUrl} - Missing or malformed Authorization header`);
    return res.status(401).json({ success: false, message: '인증 토큰이 필요하거나 형식이 올바르지 않습니다.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    if (!process.env.JWT_SECRET) {
      console.error(`[FLEXIBLE AUTH ERROR] ${req.method} ${req.originalUrl} - JWT_SECRET not configured`);
      return res.status(500).json({ success: false, message: 'JWT_SECRET 환경 변수가 설정되지 않았습니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 일반 사용자 또는 게스트 모두 허용
    req.user = decoded;
    req.isGuest = decoded.isGuest === true;
    req.isAdmin = decoded.isAdmin === true;

    const userType = req.isGuest ? 'guest' : (req.isAdmin ? 'admin' : 'user');
    console.info(`[FLEXIBLE AUTH OK] ${req.method} ${req.originalUrl} - ${userType}Id=${decoded?.id ?? 'unknown'}`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn(`[FLEXIBLE AUTH FAIL] ${req.method} ${req.originalUrl} - TokenExpiredError`);
      return res.status(419).json({ success: false, message: '토큰이 만료되었습니다. 다시 로그인해주세요.' });
    }
    console.warn(`[FLEXIBLE AUTH FAIL] ${req.method} ${req.originalUrl} - Invalid token (${error.name || 'UnknownError'})`);
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
};

module.exports = {
  guestAuthMiddleware,    // 게스트만 접근 가능
  flexibleAuthMiddleware  // 일반 사용자 + 게스트 모두 접근 가능
};


