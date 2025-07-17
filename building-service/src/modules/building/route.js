// src/modules/building/route.js

const express = require("express")
const router = express.Router()
const controller = require("./controller")

// 아직...
// 빌딩 전체 조회(메인화면)
router.get("/", controller.getAll)

// 빌딩 이름만 조회
router.get("/names", controller.getNames);


// 빌딩 위치 조회
router.get("/:name", controller.getBuilding_Location)


// 할필요 없기함. 근데 함. 성공!
// 빌딩 추가
router.post("/", controller.create)

// 빌딩 수정 (설명만 고치는 걸로)
router.put("/:name", controller.update)

// 삭제
router.delete("/:name", controller.delete)

module.exports = router
