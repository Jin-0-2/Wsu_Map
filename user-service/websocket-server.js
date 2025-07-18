// websocket-server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// 웹소켓 서버 생성
const wss = new WebSocket.Server({
  server,
  path: '/friend/ws'
});

// 연결된 클라이언트 관리
const connectedUsers = new Map();

// 웹소켓 연결 처리
wss.on('connection', (ws, req) => {
  let userId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'register':
          userId = data.userId;
          connectedUsers.set(userId, ws);
          console.log(`✅ 웹소켓 등록: userId=${userId}`);
          console.log('현재 연결된 유저:', Array.from(connectedUsers.keys()));
  
          ws.send(JSON.stringify({
            type: 'registered',
            message: '웹소켓 연결 성공',
            timestamp: new Date().toISOString()
          }));
          broadcastOnlineUsers();
          break;
        case 'heartbeat':
          ws.send(JSON.stringify({
            type: 'heartbeat_response',
            timestamp: new Date().toISOString()
          }));
          break;
        default:
          // 기타 메시지 처리
      }
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  });

  ws.on('close', () => {
    if (userId) {
      connectedUsers.delete(userId);
      console.log(`❌ 웹소켓 해제: userId=${userId}`);
      console.log('현재 연결된 유저:', Array.from(connectedUsers.keys()));

      broadcastOnlineUsers();
    }
  });

  ws.on('error', (error) => {
    console.error('웹소켓 오류:', error);
  });
});

// 메시지 전송 함수들
function sendToUser(userId, message) {
  const userWs = connectedUsers.get(userId);
  if (userWs && userWs.readyState === WebSocket.OPEN) {
    userWs.send(JSON.stringify(message));
    return true;
  }
  return false;
}

function broadcast(message) {
  connectedUsers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function broadcastOnlineUsers() {
  const onlineUsers = Array.from(connectedUsers.keys());
  broadcast({
    type: 'online_users_update',
    onlineUsers,
    timestamp: new Date().toISOString()
  });
}

// 친구 알림 함수 예시 (REST API에서 호출될 함수임)
function notifyFriendRequest(fromUserId, fromUserName, toUserId) {
  sendToUser(toUserId, {
    type: 'new_friend_request',
    fromUserId,
    fromUserName,
    message: `${fromUserName}님이 친구 요청을 보냈습니다.`,
    timestamp: new Date().toISOString()
  });
  sendToUser(fromUserId, {
    type: 'friend_request_sent',
    toUserId,
    message: '친구 요청이 전송되었습니다.',
    timestamp: new Date().toISOString()
  });
}

// 테스트 및 REST 연동용 API 엔드포인트 등 필요한 부분만 남겨도 됨
app.get('/friend/ws/status', (req, res) => {
  res.json({
    totalConnections: connectedUsers.size,
    onlineUsers: Array.from(connectedUsers.keys()),
    serverTime: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`웹소켓 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`ws://localhost:${PORT}/friend/ws`);
});


module.exports = {
    notifyFriendRequest,
}