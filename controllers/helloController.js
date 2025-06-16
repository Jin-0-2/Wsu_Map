const indexService = require('../services/helloService');

exports.main = (req, res) => {
  const message = indexService.getHelloMessage();
  // DB
  res.json({ message });
};
