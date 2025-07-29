// src/modules/inquiry/route.js

const express = require('express');
const router = express.Router();
const inquiryController = require('./controller');

// 문의하기 목록 조회 (관리자용)
router.get('/', inquiryController.getInquiries);

// 문의하기 상세 조회
router.get('/:id', inquiryController.getInquiry);

// 문의하기 작성
router.post('/', inquiryController.createInquiry);

// 문의하기 수정
router.put('/:id', inquiryController.updateInquiry);

// 문의하기 삭제
router.delete('/:id', inquiryController.deleteInquiry);

// 내 문의하기 목록 조회
router.get('/user/:userId', inquiryController.getMyInquiries);

module.exports = router; 