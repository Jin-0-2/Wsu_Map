// src/modules/inquiry/route.js

const express = require('express');
const router = express.Router();
const inquiryController = require('./controller');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');



// 관리자
// 문의하기 목록 조회 
router.get('/all', [authMiddleware, adminMiddleware], inquiryController.getInquiries);

// 답글 달기
router.put('/answer', [authMiddleware, adminMiddleware], inquiryController.answerInquiry); 


// 사용자
// 문의하기 작성 (클라이언트용 - 이미지 파일 업로드 포함)
router.post('/', authMiddleware, inquiryController.createInquiry);

// 내 문의 조회 (클라이언트용)
router.get('/', authMiddleware, inquiryController.getInquiry);

// 내 문의 삭제(클라이언트용)
router.delete('/', authMiddleware, inquiryController.deleteInquiry);



module.exports = router; 