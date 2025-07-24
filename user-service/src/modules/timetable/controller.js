// src/modules/user/controller.js

const Service = require("./service")

// 내 시간표 불러오기
exports.getAll = async (req, res) => {
    try {
        const id = req.params.id;

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

        res.status(200).json(response);
    } catch (err) {
        console.error("DB 오류:", err);

        res.status(500).send("DB 오류");
    }
};

// 시간표 추가
exports.add = async (req, res) => {
  try {
    const id  = req.params.id;
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

    res.status(201).json({ success: true, result });
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 시간표 수정
exports.update = async (req, res) => {
  try {
    const id  = req.params.id;

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
    
    res.status(500).send("DB 오류");
  }
};

// 시간표 삭제
exports.delete = async (req, res) => {
  try {   
    const id  = req.params.id;
    const title = req.body.title;
    const day_of_week = req.body.day_of_week;

    console.log(id, title, day_of_week)
    
    const result = await Service.delete(id, title, day_of_week);
    
    res.status(200).json({
        success: true
    });
  } catch (err) {
    console.error("DB 오류:", err);
    res.status(500).send("DB 오류");
  }
};