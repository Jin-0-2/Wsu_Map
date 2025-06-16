const indexService = require('../services/byeService');

exports.main = (req, res) => {
  const message = indexService.getByeMessage();
  res.json({ message });
};

exports.seeYou = (req, res) => {
    const message = indexService.getSeeYouMessage();
    res.json({ message });
}