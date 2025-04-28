import express from "express";
import { Client } from "pg";
const client = new Client({
  user: "admin",
  password: "admin",
  host: "localhost",
  port: 5432,
  database: "creature_feature",
});
await client.connect();

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/posts", (req, res) => {
  return res.send("Hello World!");
});

app.listen(4000);
