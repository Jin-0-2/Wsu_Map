// src/modules/floor/service.js

const con = require("../../core/db")

// 전체 조회
exports.getAll = () => {
  const query = 'select f."Building_Name", f."Floor_Number", r."Room_Name", r."Room_Description" from "Floor_R" r JOIN "Floor" f ON r."Floor_Id" = f."Floor_Id"'

  return new Promise((resolve, reject) => {
    con.query(query, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}