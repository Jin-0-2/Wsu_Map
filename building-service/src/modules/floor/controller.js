// src/modules/floor/controller.js

const Service = require("./service")
const roomService = require("../room/service")
const pathService = require("../path/service")
const categoryService = require("../category/service")
const client = require('../../core/db')
const multer = require('multer');
const upload = multer();

// 전체 조회
exports.getAll = async (req, res) => {
  try {
    const result = await Service.getAll();
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);
    
    res.status(500).send("DB 오류");
  }
};

// 건물 별 층 조회 (2d)
exports.getFloors = async (req, res) => {
  try {
    const building_name = req.params.building;

    const result = await Service.getFloors(building_name);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

exports.getFloorNames = async (req, res) => {
  try {
    const building_name = req.params.building;

    const result = await Service.getFloorNames(building_name);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
}

// 층 조회 (2d), 하나만
exports.getFloorNumber = async (req, res) => {
  try {
    const floor = req.params.floor;
    const building_name = req.params.building;

    const result = await Service.getFloorNumber(floor, building_name);

    const nodes = await pathService.getIndoorEdges(building_name, floor);

    if (!result.rows.length) {
      return res.status(404).send("해당 층 도면이 없습니다.");
    }

    const file = result.rows[0].File;

    res.status(200).json({
      File : file,
      nodes
    })
  } catch (err) {
    console.error("DB 오류:", err);

    res.status(500).send("DB 오류");
  }
};

// 층 추가
exports.create = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { building_name, floor_number } = req.body
      const file = req.file; // 전체 file 객체를 전달

      if (!floor_number || !building_name) {
        return res.status(400).send("floor_number와 building_name을 모두 입력하세요.");
      }

      let fileUrl = null;
      let parsedNodes = [];
      let categories = []

      if (file) {
        // SVG 파싱과 S3 업로드를 병렬로 처리하여 시간 단축
        const { nodes: parsedNodesResult, categories: categoriesResult } = await Service.parseNavigationNodes(file.buffer);
        parsedNodes = parsedNodesResult;
        categories = categoriesResult;
        fileUrl = await Service.uploadFile(building_name, floor_number, file);
      }


      // 1. 먼저 Floor 정보를 DB에 생성하고, 생성된 floor의 정보를 받아옵니다.
      // (반드시 새로 생성된 Floor의 ID를 반환하도록 floorService.create를 수정해야 합니다)
      const newFloor = await Service.create(building_name, floor_number, fileUrl);


      // 2. 파싱된 노드가 있다면, 각 노드를 DB에 저장합니다.
      if (parsedNodes.length > 0) {
        // 모든 노드 생성 작업을 Promise 배열로 만듭니다.
        const nodeCreationPromises = parsedNodes.map(node => {
          const { nodeId, x, y } = node;
          
          // 요청하신 파라미터 순서에 맞게 roomService.create 호출
          // newFloor.id는 새로 생성된 Floor의 Primary Key입니다.
          return roomService.create(building_name, floor_number, nodeId, "", x, y);
        });

        // 모든 노드 생성 작업이 끝날 때까지 기다립니다.
        await Promise.all(nodeCreationPromises);
      }

      // 3. 파싱된 카테고리가 있다면, 각 카테고리를 DB에 저장합니다.
      if (categories.length > 0) {
        const categoryPromises = categories.map(cat => {
          const { nodeId, x, y } = cat;
          return categoryService.create(building_name, floor_number, nodeId, x, y);
        });
        await Promise.all(categoryPromises);
      }

      await pathService.initIndoorGraph();

      res.status(201).json({
        message: "층 추가가 완료되었습니다",
      });
    } catch (err) {
      console.error("층 추가 처리 중 오류:", err);
      res.status(500).send("층 추가 처리 중 오류");
    }
  }
];

// 층 수정
exports.update = [
  upload.single('file'),
  async (req, res) => {
    try {
      await client.query('BEGIN')

      const { building_name, floor_number } = req.body;
      const file = req.file; // 전체 file 객체를 전달

      if (!floor_number || !building_name) {
        await client.query('ROLLBACK');
        return res.status(400).send("floor_number와 building_name을 모두 입력하세요.");
      }

      // 1. 기존 노드 '이름' 목록 조회
      // 모든 DB 작업에 client 객체를 직접 전달합니다.
      const existingNodeNames = await roomService.findAllByFloor(building_name, floor_number, { client });
      // 빠른 조회를 위해 Set으로 변환
      const existingNodeNameSet = new Set(existingNodeNames);

      await roomService.deleteAllNodeLinks(building_name, floor_number, { client });

      // 2. 새로운 파일 파싱 및 업로드
      const parseResult = await Service.parseNavigationNodes(file.buffer);
      console.log('파싱 결과:', parseResult);
      
      const newParsedNodes = parseResult.nodes || [];
      const newCategories = parseResult.categories || [];
      
      console.log('노드 개수:', newParsedNodes.length);
      console.log('카테고리 개수:', newCategories.length);
      
      const newFileUrl = await Service.uploadFile(building_name, floor_number, file);
      // const newFloor = await Service.updateFloorFile(building_name, floor_number, newFileUrl);

      const promises = [];

      // 4. 노드 정보 비교 및 처리
      // 새롭게 파싱된 노드를 기준으로 반복
      for (const newNode of newParsedNodes) {
        if (existingNodeNameSet.has(newNode.nodeId)) {
          // UPDATE
          promises.push(roomService.updateByName(
            building_name, floor_number, newNode.nodeId, 
            { x: newNode.x, y: newNode.y }, { client }
          ));
          existingNodeNameSet.delete(newNode.nodeId);
        } else {
          // CREATE
          promises.push(roomService.create_tran(
            building_name, floor_number, newNode.nodeId, 
            "", newNode.x, newNode.y, { client }
          ));
        }
      }

      // 5. 삭제될 노드 처리 (Set에 남아있는 이름들)
      for (const nameToDelete of existingNodeNameSet) {
        // DELETE
        promises.push(roomService.deleteByName(
          building_name, floor_number, nameToDelete, { client }
        ));
      }

      // 모든 DB 변경 작업을 한번에 실행
      await Promise.all(promises);

      // 6. 카테고리 정보 처리
      if (newCategories && newCategories.length > 0) {
        // 기존 카테고리 링크 삭제
        await categoryService.deleteAllCategoryLinks(building_name, floor_number, { client });

        // 새로 파싱된 카테고리들 추가
        const categoryPromises = newCategories.map(cat => {
          const { nodeId, x, y } = cat;
          return categoryService.create_tran(building_name, floor_number, nodeId, x, y, { client });
        });
        await Promise.all(categoryPromises);
      }

      // 모든 작업이 성공하면 트랜잭션 커밋
      await client.query('COMMIT');

      await pathService.initIndoorGraph();

      res.status(200).json({ message: "층 수정이 완료되었습니다." });

    } catch (err) {
      // 오류 발생 시 모든 변경 사항 롤백
      await client.query('ROLLBACK');
      console.error("층 수정 처리 중 오류:", err);
      res.status(500).send("층 수정 처리 중 오류가 발생했습니다.");
    }
  }
];

// 층 삭제
exports.delete = async (req, res) => {
  try {
    const floor_number = req.params.floor;
    const building_name  = req.params.building;

    const result = await Service.delete(building_name, floor_number);
    if (result.rowCount === 0) {
      // 삭제된 행이 없음 → 잘못된 id
      return res.status(404).send("존재하지 않는 층입니다.");
    }

    await pathService.initIndoorGraph();

    res.status(200).send("층 삭제 성공");
  } catch (err) {
    console.error("층 삭제 처리 중 오류:", err);

    res.status(500).send("층 삭제 처리 중 오류");
  }
};