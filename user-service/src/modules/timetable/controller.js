// src/modules/timetable/controller.js

const Service = require("./service")
const multer = require('multer');
const upload = multer();


// 내 시간표 불러오기
exports.getAll = async (req, res) => {
  try {
    const id = req.user.id;

    const result = await Service.getAll(id);

    const response = result.rows.map(row => ({
      title: row.title,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      building_name: row.building_name,
      floor_number: row.floor_number,
      room_name: row.room_name,
      professor: row.professor,
      color: row.color,
      memo: row.memo,
    }))   

    res.status(200).json({
      success: true,
      response: response,
    });

    } catch (err) {
      console.error("DB 오류:", err);

      res.status(500).json({
        success: false,
        message: "DB 오류"
      });
    }
};

// 시간표 추가
exports.add = async (req, res) => {
  try {
    const id  = req.user.id;

    const {
      title,
      day_of_week,
      start_time,
      end_time,
      building_name,
      floor_number,
      room_name,
      professor,
      color,
      memo,
    } = req.body;
    
    const result = await Service.add(
        id, title, day_of_week, 
        start_time, end_time, 
        building_name, floor_number, room_name,
        professor,
        color, memo
    );

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).json({ success: false, message: "DB 오류" });
  }
};

// 시간표 추가 at Excel
exports.addExcel = [
  upload.single('excelFile'),
  async (req, res) => {
    try {
      const id = req.user.id;

      const file = req.file;

      if (!file) {
        console.log("엑셀 파일이 업로드되지 않았습니다.");
        return res.status(400).json({ 
          success: false, 
          message: "엑셀 파일이 업로드되지 않았습니다." 
        });
      }

      // 파일 확장자 검증
      const allowedExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        console.log("엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.");
        return res.status(400).json({ 
          success: false, 
          message: "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다." 
        });
      }

      console.log('엑셀 파일 업로드 성공:', {
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });

      // 엑셀 파일 파싱
      const parsedData = await Service.parseExcelFile(file.buffer);
      
      if (!parsedData || parsedData.length === 0) {
        console.log("엑셀 파일에서 시간표 데이터를 찾을 수 없습니다.");
        return res.status(400).json({ 
          success: false, 
          message: "엑셀 파일에서 시간표 데이터를 찾을 수 없습니다." 
        });
      }

      // 일괄 저장 전 데이터 전부 삭제 씨빠끄~
      await Service.deleteAll(id);

      // DB에 일괄 저장
      const insertResults = await Service.bulkInsertTimetable(id, parsedData);
      
      const successCount = insertResults.filter(result => result.success).length;
      const failCount = insertResults.filter(result => !result.success).length;

      console.log("insertResults:", "엑셀 파일이 성공적으로 처리되었습니다");
      
      res.status(200).json({ 
        success: true, 
        message: "엑셀 파일이 성공적으로 처리되었습니다.",
        fileName: file.originalname,
        totalProcessed: parsedData.length,
        successCount,
        failCount,
        details: insertResults
      });

    } catch (err) {
      console.error("엑셀 파일 처리 오류:", err);
      res.status(500).json({ 
        success: false, 
        message: "엑셀 파일 처리 중 오류가 발생했습니다." 
      });
    }
  }
];

// 시간표 수정
exports.update = async (req, res) => {
  try {
    const id  = req.user.id;

    const {
      origin_title,
      origin_day_of_week,
      new_title,
      new_day_of_week,
      start_time,
      end_time,
      building_name,
      floor_number,
      room_name,
      professor,
      color,
      memo,
    } = req.body;

    const result = await Service.update(id, origin_title, origin_day_of_week, new_title, new_day_of_week, start_time, end_time, building_name, floor_number, room_name, professor, color, memo);
    
    res.status(200).json({ success: true, updated: result.rows });  
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).json({ success: false, message: "DB 오류" });
  }
};

// 시간표 삭제
exports.delete = async (req, res) => {
  try {   
    const id  = req.user.id;
    
    const title = req.body.title;
    const day_of_week = req.body.day_of_week;

    const result = await Service.delete(id, title, day_of_week);
    
    res.status(200).json({
        success: true
    });
  } catch (err) {
    console.error("DB 오류:", err);
    res.status(500).json({ success: false, message: "DB 오류" });
  }
};