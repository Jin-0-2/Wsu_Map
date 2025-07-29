// websocket-server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const userService = require('./src/modules/user/service')
const firendService = require('./src/modules/friends/service')

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

  ws.on('close', async () => {
    if (userId) {
      connectedUsers.delete(userId);
      console.log(`❌ 웹소켓 해제: userId=${userId}`);
      console.log('현재 연결된 유저:', Array.from(connectedUsers.keys()));

      userService.logout(userId);

      await notifyLogoutToFriends(userId);

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

async function notifyLogoutToFriends(userId) {
  // userService.getFriends(userId)로 친구 목록 조회 (Id만 필요)
  let myFriends = [];
  try {
    myFriends = await firendService.getMyFriend(userId);
  } catch (err) {
    console.error('친구목록 조회 실패:', err);
  }
  console.log(myFriends.rows);

  const friendIds = myFriends.rows.map(f => f.Id);
  console.log(friendIds);

  friendIds.forEach(friendId => {
    sendToUser(friendId, {
      type: 'friend_logged_out',
      userId,
      message: `${userId}님이 로그아웃하셨습니다.`,
      timestamp: new Date().toISOString()
    });
  });

  console.log("친구들에게 전송 완려!")
}

// 연결 끊기.
function disconnectUserSocket(userId) {
  const ws = connectedUsers.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(4001, '로그아웃 처리'); // 실제 네트워크 연결 종료 및 클라에 종료 이벤트 전달
    connectedUsers.delete(userId);    // 관리목록에서도 제거
  }
  console.log("로그아웃 버튼으로 소켓 종료", userId)
}

// 커넥트 되어있는지 확인
function isUserConnected(userId) {
  return connectedUsers.has(userId);
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

// 친구들에게 내 위치를 전송하는 함수
function notifyFriendsLocationUpdate(friendIds, userId, x, y) {
  const locationMessage = {
    type: 'friend_location_update',
    userId,
    x,
    y,
  };
  friendIds.forEach(friendId => {
    sendToUser(friendId, locationMessage);
    console.log("친구에게 내 위치 전송 완료", friendId)
  });
}

// 친구들에게 위치 공유 상태 변경을 알려주는 함수
async function notifyLocationShareStatusChange(userId, isLocationPublic) {
  try {
    // 사용자의 친구 목록 조회
    const myFriends = await firendService.getMyFriend(userId);
    const friendIds = myFriends.rows.map(f => f.Id);
    
    const statusMessage = {
      type: 'friend_location_share_status_change',
      userId,
      isLocationPublic,
      message: `친구의 위치 공유 상태가 변경되었습니다.`,
      timestamp: new Date().toISOString()
    };
    
    friendIds.forEach(friendId => {
      sendToUser(friendId, statusMessage);
      console.log(`친구 ${friendId}에게 위치 공유 상태 변경 알림 전송 완료`);
    });
    
    console.log(`친구 ${friendIds.length}명에게 위치 공유 상태 변경 알림 전송 완료`);
  } catch (err) {
    console.error('위치 공유 상태 변경 알림 전송 실패:', err);
  }
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
  notifyLogoutToFriends,
  disconnectUserSocket,
  isUserConnected,
  notifyFriendsLocationUpdate,
  notifyLocationShareStatusChange, // 위치 공유 상태 변경 알림
}