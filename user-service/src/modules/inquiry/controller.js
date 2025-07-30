// src/modules/inquiry/controller.js

const inquiryService = require('./service');
const multer = require('multer');
const upload = multer();

// 문의하기 목록 조회(관리자용)
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await inquiryService.getAll();

    console.log(inquiries);

    res.status(200).json(inquiries);
  } catch (err) {
    console.error("문의하기 목록 조회 오류:", err);
    res.status(500).send("문의하기 목록 조회 실패");
  }
};

// 답글 달기(관리자용)
exports.answerInquiry = async (req, res) => {
  try {
    const { inquiry_code, answer } = req.body;

    console.log(inquiry_code, answer);

    const result = await inquiryService.answer(inquiry_code, answer);

    res.status(200).json(result);
  } catch (err) {
    console.error("답글 달기 오류:", err);
    res.status(500).send("답글 달기 실패");
  }
};

// 내 문의 조회(클라이언트용)
exports.getInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await inquiryService.getById(id);

    console.log(inquiry);
    
    if (!inquiry) {
      return res.status(404).send("문의를 찾을 수 없습니다.");
    }
    
    res.status(200).json(inquiry);
  } catch (err) {
    console.error("문의하기 상세 조회 오류:", err);
    res.status(500).send("문의하기 상세 조회 실패");
  }
};

// 문의하기 작성(클라이언트용 - 이미지 파일 업로드 포함)
exports.createInquiry = [
  upload.single('image'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { category, title, content } = req.body;
      
      if (!id || !title || !content) {
        return res.status(400).send("필수 정보가 누락되었습니다.");
      }

      // 문의 코드 생성
      const inquiry_code = inquiryService.createInquiryCode(category);

      console.log(inquiry_code);
      
      let fileUrl = null;
      if (req.file) {
        fileUrl = await inquiryService.uploadFile(inquiry_code, req.file);
      }
      
      const result = await inquiryService.create(id, title, content, category, inquiry_code, fileUrl);
      
      res.status(201).json(result);
    } catch (err) {
      console.error("문의하기 작성 오류:", err);
      res.status(500).send("문의하기 작성 실패");
    }
  }
];


// 내 문의 삭제(클라이언트용)
exports.deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { inquiry_code } = req.body;
    
    const result = await inquiryService.delete(id, inquiry_code);
    
    if (!result) {
      return res.status(404).send("문의를 찾을 수 없습니다.");
    }
    
    res.status(200).send("문의가 삭제되었습니다.");
  } catch (err) {
    console.error("문의하기 삭제 오류:", err);
    res.status(500).send("문의하기 삭제 실패");
  }
};
