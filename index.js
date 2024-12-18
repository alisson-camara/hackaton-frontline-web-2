const express = require("express");
const path = require("path");
const cors = require("cors");
// const routes = require("./views/routes");

const port = process.env.PORT || 5006;

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.render("pages/index");
});

app.post('/create-room', async (req, res) => {

  const query = req.query;
  
  console.log("req:", req);
  console.log("query:", query);

  res.send({ "name": "SalaDaPaula", "currentTask": "Task 1", "moderator": "Paula", "players": [ { "name": "Paula", "point": "?" } ] });
});



// app.get('/create-room', async (req, res) => {

//   res.send({ "name": "SalaDaPaula", "currentTask": "Task 1", "moderator": "Paula", "players": [ { "name": "Paula", "point": "?" } ] });
// });

app.use((err, req, resp) =>   {
  return resp.status(err?.statusCode || 500).json({
    status: "error",
    message: err?.message || "Erro desconhecido", 
  });
});

// app.use("", routes);

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
    client.end();
  }
);
