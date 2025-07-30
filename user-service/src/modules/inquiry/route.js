// src/modules/inquiry/route.js

const express = require('express');
const router = express.Router();
const inquiryController = require('./controller');


// 문의하기 목록 조회 (관리자용)
router.get('/', inquiryController.getInquiries);

// 답글 달기(관리자용)
router.put('/answer', inquiryController.answerInquiry); 

// 문의하기 작성 (클라이언트용 - 이미지 파일 업로드 포함)
router.post('/:id', inquiryController.createInquiry);

// 내 문의 조회 (클라이언트용)
router.get('/:id', inquiryController.getInquiry);

// 내 문의 삭제(클라이언트용)
router.delete('/:id', inquiryController.deleteInquiry);



module.exports = router; 