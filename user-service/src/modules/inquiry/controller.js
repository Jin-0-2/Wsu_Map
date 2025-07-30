// src/modules/inquiry/controller.js

const inquiryService = require('./service');
const multer = require('multer');
const upload = multer();

// 문의하기 목록 조회
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await inquiryService.getAll();
    res.status(200).json(inquiries);
  } catch (err) {
    console.error("문의하기 목록 조회 오류:", err);
    res.status(500).send("문의하기 목록 조회 실패");
  }
};

// 문의하기 상세 조회
exports.getInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await inquiryService.getById(id);
    
    if (!inquiry) {
      return res.status(404).send("문의를 찾을 수 없습니다.");
    }
    
    res.status(200).json(inquiry);
  } catch (err) {
    console.error("문의하기 상세 조회 오류:", err);
    res.status(500).send("문의하기 상세 조회 실패");
  }
};

// 문의하기 작성
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
      
      let fileUrl = null;
      if (req.file) {
        fileUrl = await inquiryService.uploadFile(file);
      }
      
      const result = await inquiryService.create(id, title, content, category, inquiry_code, fileUrl);
      
      res.status(201).json(result);
    } catch (err) {
      console.error("문의하기 작성 오류:", err);
      res.status(500).send("문의하기 작성 실패");
    }
  }
];

// 문의하기 수정
exports.updateInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;
    
    const result = await inquiryService.update(id, title, content, category);
    
    if (!result) {
      return res.status(404).send("문의를 찾을 수 없습니다.");
    }
    
    res.status(200).json(result);
  } catch (err) {
    console.error("문의하기 수정 오류:", err);
    res.status(500).send("문의하기 수정 실패");
  }
};

// 문의하기 삭제
exports.deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await inquiryService.delete(id);
    
    if (!result) {
      return res.status(404).send("문의를 찾을 수 없습니다.");
    }
    
    res.status(200).send("문의가 삭제되었습니다.");
  } catch (err) {
    console.error("문의하기 삭제 오류:", err);
    res.status(500).send("문의하기 삭제 실패");
  }
};

// 내 문의하기 목록 조회
exports.getMyInquiries = async (req, res) => {
  try {
    const { userId } = req.params;
    const inquiries = await inquiryService.getByUserId(userId);
    res.status(200).json(inquiries);
  } catch (err) {
    console.error("내 문의하기 목록 조회 오류:", err);
    res.status(500).send("내 문의하기 목록 조회 실패");
  }
}; 