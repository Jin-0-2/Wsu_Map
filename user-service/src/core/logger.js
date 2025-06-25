function logRequestInfo(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const method = req.method;
  const url = req.originalUrl || req.url;
  const now = new Date().toISOString();
  const body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "(empty)";
  console.log(`[${now}] [요청] IP: ${ip}, Method: ${method}, URL: ${url}, Body: ${body}`);
}


module.exports = { logRequestInfo };