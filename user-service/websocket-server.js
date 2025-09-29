// websocket-server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const userService = require('./src/modules/user/service')
const friendService = require('./src/modules/friends/service')

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

// 중복 알림 방지를 위한 상태 관리
const notificationStatus = new Map(); // userId -> { lastLoginNotify, lastLogoutNotify }

// 웹소켓 연결 처리
wss.on('connection', (ws, req) => {
  let userId = null;

  // 메시지를 보낼 때
  ws.on('message', async (message) => {
    //원본 메시지 출력
    console.log(`[WS MESSAGE] from ${userId || 'unknown'}:`, message.toString());

    try {
      // JSON 파싱
      const data = JSON.parse(message);
      console.log(`[WS PARSED] type: ${data.type}, data:`, data);

      // 데이터 타입에 따라 할 일을 제공.
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

          console.log(`[WS SEND] To ${userId}, type: registered`);

          // 친구에게 내가 연결되었다는 것을 알려주는 함수.
          notifyUserLoggedIn(userId);

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


  // 연결이 끊겼을 때
  ws.on('close', async (code, reason) => {
    console.log(`[WS CLOSE] userId=${userId}, code=${code}, reason=${reason.toString()}, 시간=${new Date().toISOString()}`);

    if (userId) {
      try {
        // 1. 먼저 친구들에게 로그아웃 알림 전송
        await notifyUserLoggedOut(userId);
        
        // 2. DB에서 로그아웃 상태 업데이트
        await userService.logout(userId);
        
        // 3. 마지막에 연결 목록에서 제거
        connectedUsers.delete(userId);
        console.log(`❌ 웹소켓 해제: userId=${userId}`);
        console.log('현재 연결된 유저:', Array.from(connectedUsers.keys()));
        
      } catch (error) {
        console.error('로그아웃 처리 중 오류:', error);
        // 에러가 발생해도 연결은 정리
        connectedUsers.delete(userId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('웹소켓 오류:', error);
  });
});

// 메시지 전송 함수들
// 한명에게
function sendToUser(userId, message) {
  const userWs = connectedUsers.get(userId);
  console.log(`[WS SEND CHECK] user ${userId} exists: ${!!userWs}, readyState: ${userWs?.readyState}`);

  if (userWs && userWs.readyState === WebSocket.OPEN) {
    const messageStr = JSON.stringify(message);
    console.log(`[WS SEND] to ${userId}:`, messageStr);
    userWs.send(messageStr);
    console.log(`[WS SEND SUCCESS] message sent to ${userId}`);
    return true;
  }
  console.log(`[WS SEND FAIL] user ${userId} not connected or socket closed`);
  return false;
}

// 브로드캐스트
function broadcast(message) {
  connectedUsers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// 로그인 시 내 로그인 정보 친구에게 보냄냄
async function notifyUserLoggedIn(userId) {
  try {
    const now = Date.now();
    const userStatus = notificationStatus.get(userId) || { lastLoginNotify: 0, lastLogoutNotify: 0 };
    
    // 중복 알림 방지: 5초 이내 동일한 로그인 알림은 무시
    if (now - userStatus.lastLoginNotify < 5000) {
      console.log(`[Notification] Duplicate login notification ignored for user ${userId}`);
      return;
    }

    // 1. 친구 목록 조회
    const myfriends = await friendService.getMyFriend(userId);

    // 2. rows에서 Id값만 추출하여 새로운 배열 생성
    const myfriend_Ids = myfriends.rows.map(friend => friend.Id);

    const loginMessage = {
      type: 'Login_Status',
      userId: userId,
      status: true,
      message: '친구(Id: ' + userId + ')가 접속했습니다.',
      timestamp: new Date().toISOString()
    }

    // 3. 모든 친구에게 동기적으로 알림 전송
    const sendPromises = myfriend_Ids.map(friendId => {
      return new Promise((resolve) => {
        const success = sendToUser(friendId, loginMessage);
        resolve({ friendId, success });
      });
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    
    // 4. 알림 시간 업데이트
    userStatus.lastLoginNotify = now;
    notificationStatus.set(userId, userStatus);
    
    console.log(`[Notification] Login status sent to ${successCount}/${myfriend_Ids.length} friends`);

  } catch (error) {
    console.error('Error in notifyUserLoggedIn:', error);
  }
}

// 로그아웃 시 내 로그인 정보 친구에게 보냄냄
async function notifyUserLoggedOut(userId) {
  try {
    const now = Date.now();
    const userStatus = notificationStatus.get(userId) || { lastLoginNotify: 0, lastLogoutNotify: 0 };
    
    // 중복 알림 방지: 5초 이내 동일한 로그아웃 알림은 무시
    if (now - userStatus.lastLogoutNotify < 5000) {
      console.log(`[Notification] Duplicate logout notification ignored for user ${userId}`);
      return;
    }

    // 1. 친구 목록 조회
    const myfriends = await friendService.getMyFriend(userId);

    // 2. rows에서 Id값만 추출하여 새로운 배열 생성
    const myfriend_Ids = myfriends.rows.map(friend => friend.Id);

    const logOutMessage = {
      type: 'Login_Status',
      userId: userId,
      status: false,
      message: '친구(Id: ' + userId + ')가 연결을 종료했습니다.',
      timestamp: new Date().toISOString()
    }

    // 3. 모든 친구에게 동기적으로 알림 전송
    const sendPromises = myfriend_Ids.map(friendId => {
      return new Promise((resolve) => {
        const success = sendToUser(friendId, logOutMessage);
        resolve({ friendId, success });
      });
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    
    // 4. 알림 시간 업데이트
    userStatus.lastLogoutNotify = now;
    notificationStatus.set(userId, userStatus);
    
    console.log(`[Notification] Logout status sent to ${successCount}/${myfriend_Ids.length} friends`);

  } catch (error) {
    console.error('Error in notifyUserLoggedOut:', error);
  }
}


// 연결 끊기.
async function disconnectUserSocket(userId) {
  const ws = connectedUsers.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      // 1. 먼저 친구들에게 로그아웃 알림 전송
      await notifyUserLoggedOut(userId);
      
      // 2. DB에서 로그아웃 상태 업데이트
      await userService.logout(userId);
      
      // 3. 웹소켓 연결 종료
      ws.close(4001, '로그아웃 처리');
      connectedUsers.delete(userId);
      
      console.log("로그아웃 버튼으로 소켓 종료 완료", userId);
    } catch (error) {
      console.error('로그아웃 처리 중 오류:', error);
      // 에러가 발생해도 연결은 정리
      ws.close(4001, '로그아웃 처리');
      connectedUsers.delete(userId);
    }
  } else {
    console.log("웹소켓이 이미 연결되지 않음", userId);
  }
}

// 커넥트 되어있는지 확인 (T/F)
function isUserConnected(userId) {
  return connectedUsers.has(userId);
}

// 친구 추가 알림 함수 
function notifyFriendRequest(fromUserId, fromUserName, toUserId) {
  // fromUserId가 toUserId에게 요청을 했다고 toUserId에게 알림
  sendToUser(toUserId, {
    type: 'new_friend_request',
    fromUserId,
    fromUserName,
    message: `${fromUserName}님이 친구 요청을 보냈습니다.`,
    timestamp: new Date().toISOString()
  });

  // 나에게 확인
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
  });
}

// 친구들에게 위치 공유 상태 변경을 알려주는 함수
async function notifyLocationShareStatusChange(userId, isLocationPublic) {
  try {
    // 사용자의 친구 목록 조회
    const myFriends = await friendService.getMyFriend(userId);
    const friendIds = myFriends.rows.map(f => f.Id);
    
    const statusMessage = {
      type: 'friend_location_share_status_change',
      userId,
      isLocationPublic,
      message: `친구의 위치 공유 상태가 변경되었습니다.`,
      timestamp: new Date().toISOString()
    };

    // 나에게도 전송
    sendToUser(userId, statusMessage);
    
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
  disconnectUserSocket,
  isUserConnected,
  notifyFriendsLocationUpdate,
  notifyLocationShareStatusChange, // 위치 공유 상태 변경 알림
}