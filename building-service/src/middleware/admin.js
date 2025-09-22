// auth 미들웨어가 선행되어 req.user가 존재해야 합니다.
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ success: false, message: '접근 권한이 없습니다. 관리자만 접근 가능합니다.' });
};

module.exports = adminMiddleware;


