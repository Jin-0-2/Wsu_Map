// src/app.js

const express = require('express');
const session = require('express-session');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;


const userRouter = require('./routes/index');
const con = require('./core/db')

const IP = `54.252.240.31`;
const AWS_IP = `http://${IP}:`


const app = express();

const redisClient = createClient({
  socket: {
    host: 'redis.address',
    port: 6379,
  },
});


redisClient.connect().then(() => {

  const store = new RedisStore({ client: redisClient });

  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: 'YJB_20250711',
      resave: false,
      saveUninitialized: false,
      cookie: {
        // domain: 'your.domain.com', // 운영환경에서 필요시 세팅
        path: '/',
        maxAge: 30 * 60 * 1000,
      },
    }));

  app.use("/", userRouter);

  setInterval(async () => {
    const N_MIN = 1; // 1분
    const sql = `
    UPDATE "User"
    SET "Is_Login" = false
    WHERE "Is_Login" = true
    AND "Last_Location_Time" < NOW() - INTERVAL '${N_MIN} minutes'
  `;
    con.query(sql);
  }, 5 * 60 * 1000);

  app.use(express.json());


  const PORT = 3001;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${AWS_IP}${PORT}`);
  });
})
  .catch((error) => {
    console.error('Redis connection failed:', error);
    process.exit(1); // 연결안되면 서버 종료(운영에선 꼭 필요)
  });
