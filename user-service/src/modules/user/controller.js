// Eun
// userController.js
const userService = require("./service")
const generateApiKey = require("../apikey/service").createApiKey
const saveLog = require("../../core/savelogService");
const validateApiKey = require("../../core/validateApikey")

exports.getAll = async (req, res) => {
  try {
    const req_apikey = req.headers["x-apikey"] || req.body?.apikey || "";
    const validationMsg = await validateApiKey(req_apikey); // 반드시 await!
    if (validationMsg !== "API키가 유효합니다.") {
      return res.status(401).json({ error: validationMsg });
    }

    const result = await userService.getAll();
    // saveLog("", req.path, 200);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    // saveLog("", req.path, 500);
    res.status(500).send("DB 오류");
  }
};

exports.register = async (req, res) => {
  console.log(req.body);
  const { id, pw, name, stu_number, phone, email, type_id } = req.body
  if (!id || !pw || !name || !phone || !type_id) {
    // saveLog("", req.path, 400);
    return res.status(400).send("모든 항목을 입력하세요.")
  }

  try {
    const result = await userService.register(id, pw, name, stu_number, phone, email, type_id);

    if (result && result.duplicate) {
      // saveLog("", req.path, 409);
      return res.status(409).send("이미 존재하는 아이디입니다.");
    }

    const user_id = result.rows[0].user_id || result.rows[0].User_Id; // 컬럼명 대소문자 주의
    const apiKey = generateApiKey(user_id);

    // saveLog("", req.path, 201);
    res.status(201).json({
      message: "회원가입이 완료되었습니다",
      ApiKey: apiKey
    });
  } catch (err) {
    console.error("회원가입 처리 중 오류:", err);
    // saveLog("", req.path, 500);
    res.status(500).send("회원가입 처리 중 오류");
  }
};

exports.login = async (req, res) => {
  const { id, pw } = req.body
  if (!id || !pw) {
    // saveLog("", req.path, 400);
    return res.status(400).send("아이디와 비밀번호를 입력하세요.")
  }

  try {
    const result = await userService.login(id, pw);
    console.log(result)

    if (result && result.notfound) {
      // saveLog("", req.path, 401);
      return res.status(401).send("아이디 또는 비밀번호가 일치하지 않습니다.");
    }

    // saveLog("", req.path, 200);
    console.log(result.user_id, result.name, result.type_id, result.apikey)
    res.status(200).json({
      message: "로그인 성공",
      user_id: result.user_id,
      name: result.name,
      type_id: result.type_id,
      apikey: result.apikey
    });
  } catch (err) {
    console.error("로그인 처리 중 오류:", err);
    // saveLog("", req.path, 500);
    res.status(500).send("로그인 처리 중 오류");
  }
};

exports.logout = async (req, res) => {
  const req_apikey = req.headers["x-apikey"] || req.body?.apikey || "";
  const validationMsg = await validateApiKey(req_apikey); // 반드시 await!
  if (validationMsg !== "API키가 유효합니다.") {
    return res.status(401).json({ error: validationMsg });
  }

  const userId = req.body && req.body.id;
  if (!userId) {
    saveLog(apikey, req.path, 400);
    return res.status(400).send("로그인 상태가 아닙니다.");
  }

  try {
    await userService.logout(userId);
    // saveLog(apikey, req.path, 200);
    res.status(200).send("로그아웃 성공");
  } catch (err) {
    console.error("로그아웃 처리 중 오류:", err);
    // saveLog(apikey, req.path, 500);
    res.status(500).send("로그아웃 처리 중 오류");
  }
};

exports.update = async (req, res) => {
  const req_apikey = req.headers["x-apikey"] || req.body?.apikey || "";
  const validationMsg = await validateApiKey(req_apikey); // 반드시 await!
  if (validationMsg !== "API키가 유효합니다.") {
    return res.status(401).json({ error: validationMsg });
  }

  const { id, pw, phone, email } = req.body

  if (!id) {
    saveLog(apikey, req.path, 400);
    return res.status(400).send("id는 필수입니다.")
  }
  if (!pw && !phone && !email) {
    saveLog(apikey, req.path, 400);
    return res.status(400).send("수정할 항목이 없습니다.")
  }

  try {
    const result = await userService.update({ id, pw, phone, email });
    if (result.rowCount === 0) {
      saveLog(apikey, req.path, 404);
      return res.status(404).send("해당 id의 사용자가 없습니다.");
    }
    saveLog(apikey, req.path, 200);
    res.status(200).send("회원정보가 수정되었습니다.");
  } catch (err) {
    console.error("회원정보 수정 중 오류:", err);
    saveLog(apikey, req.path, 500);
    res.status(500).send("회원정보 수정 중 오류");
  }
};