// src/modules/inquiry/controller.js

const inquiryService = require('./service');
const multer = require('multer');
const upload = multer();

// 문의하기 목록 조회(관리자용)
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await inquiryService.getAll();

    res.status(200).json({ success: true, data: inquiries });
  } catch (err) {
    console.error("문의하기 목록 조회 오류:", err);
    res.status(500).json({ success: false, message: "문의 목록 조회 중 오류가 발생했습니다." });
  }
};

// 답글 달기(관리자용)
exports.answerInquiry = async (req, res) => {
  try {
    const { inquiry_code, answer } = req.body;

    const result = await inquiryService.answer(inquiry_code, answer);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("답글 달기 오류:", err);
    res.status(500).json({ success: false, message: "답글 처리 중 오류가 발생했습니다." });
  }
};

// 내 문의 조회(클라이언트용)
exports.getInquiry = async (req, res) => {
  try {
    const id = req.user.id;
    const inquiry = await inquiryService.getById(id);

    if (!inquiry || inquiry.length === 0) {
      return res.status(404).json({ success: false, message: "작성한 문의를 찾을 수 없습니다." });
    }
    
    res.status(200).json({ success: true, data: inquiry });
  } catch (err) {
    console.error("문의하기 상세 조회 오류:", err);
    res.status(500).json({ success: false, message: "문의 조회 중 오류가 발생했습니다." });
  }
};

// 문의하기 작성(클라이언트용 - 이미지 파일 업로드 포함)
exports.createInquiry = [
  upload.single('image'),
  async (req, res) => {
    try {
      const id = req.user.id;
      const { category, title, content } = req.body;
      
      if (!title || !content || !category) {
        return res.status(400).json({ success: false, message: "필수 정보(카테고리, 제목, 내용)가 누락되었습니다." });
      }

      // 문의 코드 생성
      const inquiry_code = inquiryService.createInquiryCode(category);

      
      let fileUrl = null;
      if (req.file) {
        fileUrl = await inquiryService.uploadFile(inquiry_code, req.file);
      }
      
      const mapped_category = inquiryService.mapCategory(category);

      const result = await inquiryService.create(id, title, content, mapped_category, inquiry_code, fileUrl);
      
      console.log(result);

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error("문의하기 작성 오류:", err);
      res.status(500).json({ success: false, message: "문의 작성 중 오류가 발생했습니다." });
    }
  }
];


// 내 문의 삭제(클라이언트용)
exports.deleteInquiry = async (req, res) => {
  try {
    const id = req.user.id;
    const { inquiry_code } = req.body;

    if (!inquiry_code) {
      return res.status(400).json({ success: false, message: "문의 코드가 누락되었습니다." });
    }

    // S3에서 문의 사진 삭제
    const fileUrl = await inquiryService.getByInquiryCode(inquiry_code);

    console.log(fileUrl);

    if (fileUrl) {
      await inquiryService.deleteImageFromS3(fileUrl.Image_Path);
    }
    
    // DB에서 문의 내역 삭제
    const result = await inquiryService.delete(id, inquiry_code);
    
    if (!result) {
      return res.status(404).json({ success: false, message: "삭제할 문의를 찾을 수 없습니다." });
    }
    
    res.status(200).json({ success: true, message: "문의가 삭제되었습니다." });
  } catch (err) {
    console.error("문의하기 삭제 오류:", err);
    res.status(500).json({ success: false, message: "문의 삭제 중 오류가 발생했습니다." });
  }
};
