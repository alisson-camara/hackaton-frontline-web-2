const express = require("express");
const path = require("path");
const cors = require("cors");
const port = process.env.PORT || 5006;
const app = express();
const { Client } = require("pg");

const client = new Client({
  connectionString:
    "postgres://u77jeiqtv7et73:pd2019c6f01ba0ab35f6e444c04278f4ab1cb2e1e53873933d296c9a933619ef0@ccba8a0vn4fb2p.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d9bacstqoltq50",
  ssl: {
    rejectUnauthorized: false,
  },
});
client.connect();
client.query(
  "SELECT table_schema,table_name FROM information_schema.tables;",
  (err, res) => {
    if (err) throw err;
    for (let row of res.rows) {
      console.log(JSON.stringify(row));
    }
  }
);

const bodyParser = require("body-parser");
app.use(bodyParser.text());
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors());

app.get("/room", async (req, res) => {
  const query = req.query;
  const { room } = query || {};
  const checkRoomSql = `SELECT * FROM web2_rooms WHERE name = $1`;
  const checkPlayerRoomSql = `SELECT * FROM web2_players WHERE room_id = $1`;
  try {
    const rooms = await client.query(checkRoomSql, [room]);

    if (rooms.rows.length <= 0) {
      throw new Error("Room not exists");
    }
    const actualRoom = rooms.rows ? rooms.rows[0] : undefined;
    
    const players = await client.query(checkPlayerRoomSql, [actualRoom.id]);
    
    res.send({
      ...rooms.rows[0],
      players: players.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating room");
  }
});

app.post("/create-room", async (req, res) => {
  const query = req.query;
  const { room, moderator } = query || {};
  const checkPlayerSql = `SELECT * FROM web2_players WHERE name = $1`;
  const checkRoomSql = `SELECT * FROM web2_rooms WHERE name = $1`;
  const insertPlayerSql = `INSERT INTO web2_players (name, room_id, point) VALUES ($1, $2, $3)`;
  const sql = `INSERT INTO web2_rooms (name, moderator, current_task) VALUES ($1, $2, $3)`;
  const values = [room, moderator, "Task 1"];
  try {
    const rooms = await client.query(checkRoomSql, [room]);
    if (rooms.rows.length > 0) {
      throw new Error("Room already exists");
    }
    await client.query(sql, values);
    const newRoom = await client.query(checkRoomSql, [room]);
    const actualRoom = newRoom?.rows ? newRoom.rows[0] : undefined;
    const playerRow = await client.query(checkPlayerSql, [moderator]);
    const actualPlayer = playerRow?.rows ? playerRow.rows[0] : undefined;
    if (!actualPlayer) {
      await client.query(insertPlayerSql, [moderator, actualRoom.id, "?"]);
    }
    res.send({
      id: actualRoom.id,
      name: room,
      currentTask: "Task 1",
      moderator: moderator,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating room");
  }
});

app.post("/remove-player", async (req, res) => {
  const query = req.query;
  const { room, player } = query || {};
  const checkPlayerSql = `SELECT * FROM web2_players WHERE name = $1 AND room_id = $2`;
  const checkRoomSql = `SELECT * FROM web2_rooms WHERE name = $1`;
  const deletePlayerSql = `DELETE FROM web2_players WHERE id = $1`;
  const getAllPlayersSql = `SELECT * FROM web2_players WHERE room_id = $1`;
  try {
    const rooms = await client.query(checkRoomSql, [room]);
    if (rooms.rows.length < 0) {
      throw new Error("Room not exists");
    }
    const actualRoom = rooms.rows[0];
    const playerRows = await client.query(checkPlayerSql, [
      player,
      actualRoom.id,
    ]);
    const actualPlayer = playerRows?.rows ? playerRows.rows[0] : undefined;
    if (!actualPlayer) {
      throw new Error("Player not exists");
    }
    await client.query(deletePlayerSql, [actualPlayer.id]);
    const playersAll = await client.query(getAllPlayersSql, [actualRoom.id]);
    const actualPlayersAll = playersAll?.rows ? playersAll.rows : undefined;

    res.send({
      id: actualRoom.id,
      name: room,
      currentTask: "Task 1",
      moderator: actualRoom.moderator,
      players: actualPlayersAll,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating room");
  }
});

app.post("/reset-votes", async (req, res) => {
  const query = req.query;
  const { room, player } = query || {};
  const checkRoomSql = `SELECT * FROM web2_rooms WHERE name = $1`;
  const updatePlayerSQL = `UPDATE web2_players SET point=$3 WHERE name = $1 AND room_id = $2`;
  const getAllPlayersSql = `SELECT * FROM web2_players WHERE room_id = $1`;
  
  try {
    const rooms = await client.query(checkRoomSql, [room]);
    if (rooms.rows.length < 0) {
      throw new Error("Room not exists");
    }
    const actualRoom = rooms.rows ? rooms.rows[0] : undefined;
    const values = [player, actualRoom.id, "?"];
    await client.query(updatePlayerSQL, values);
    const playersAll = await client.query(getAllPlayersSql, [actualRoom.id]);
    const actualPlayersAll = playersAll?.rows ? playersAll.rows : undefined;
    res.send({
      id: actualRoom.id,
      currentTask: "Task 1",
      moderator: actualRoom.moderator,
      players: actualPlayersAll,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating player points");
  }
});
app.post("/sendvote", async (req, res) => {
  const query = req.query;
  const body = req.body;
  const { room, player } = query || {};
  const checkRoomSql = `SELECT * FROM web2_rooms WHERE name = $1`;
  const updatePlayerSQL = `UPDATE web2_players SET point=$1 WHERE name = $2 AND room_id = $3`;
  const getAllPlayersSql = `SELECT * FROM web2_players WHERE room_id = $1`;

  try {
    const rooms = await client.query(checkRoomSql, [room]);
    if (rooms.rows.length < 0) {
      throw new Error("Room not exists");
    }
    const actualRoom = rooms.rows ? rooms.rows[0] : undefined;
    const values = [body, player, actualRoom.id];
    await client.query(updatePlayerSQL, values);
    const playersAll = await client.query(getAllPlayersSql, [actualRoom.id]);
    const actualPlayersAll = playersAll?.rows ? playersAll.rows : undefined;

    res.send({
      id: actualRoom.id,
      name: room,
      currentTask: "Task 1",
      moderator: actualRoom.moderator,
      players: actualPlayersAll,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating player points");
  }
});
app.post("/join-room", async (req, res) => {
  const query = req.query;
  const { room, player } = query || {};
  const checkPlayerSql = `SELECT * FROM web2_players WHERE name = $1 AND room_id = $2`;
  const checkRoomSql = `SELECT * FROM web2_rooms WHERE name = $1`;
  const insertPlayerSql = `INSERT INTO web2_players (name, room_id, point) VALUES ($1, $2, $3)`;
  const getAllPlayersSql = `SELECT * FROM web2_players WHERE room_id = $1`;

  try {
    const rooms = await client.query(checkRoomSql, [room]);

    if (rooms.rows.length <= 0) {
      throw new Error("Room not exists");
    }
    const actualRoom = rooms.rows ? rooms.rows[0] : undefined;
    const playerRow = await client.query(checkPlayerSql, [
      player,
      actualRoom.id,
    ]);
    const actualPlayer = playerRow?.rows ? playerRow.rows[0] : undefined;

    if (!actualPlayer) {
      await client.query(insertPlayerSql, [player, actualRoom.id, "?"]);
    }
    const playersAll = await client.query(getAllPlayersSql, [actualRoom.id]);
    const actualPlayersAll = playersAll?.rows ? playersAll.rows : undefined;

    res.send({
      id: actualRoom.id,
      name: room,
      currentTask: "Task 1",
      moderator: actualRoom.moderator,
      players: actualPlayersAll,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating room");
  }
});

app.use((err, req, res, next) => {
  res.status(err?.statusCode || 500).send({
    status: "error",
    message: err?.message || "Erro desconhecido",
  });
});

const server = app.listen(port, () => {
  console.log(`Listening on ${port}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: gracefully shutting down");
  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
    });
  }
});
