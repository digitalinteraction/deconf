#!/usr/bin/env node

import express from "express";

import cors from "cors";
import jsonwebtoken from "jsonwebtoken";

const jwtPayload = {
  kind: "auth",
  iss: "deconf-dev",
  sub: 1,
  user_lang: "en",
  user_roles: ["attendee", "admin"],
};

function file(file) {
  const url = new URL(file, import.meta.url);
  return (req, res) => {
    res.sendFile(url.pathname);
  };
}
function redirect(url) {
  return (req, res) => {
    res.redirect(url);
  };
}
function login() {
  return (req, res) => {
    const token = jsonwebtoken.sign(jwtPayload, "top_secret");
    const url = new URL("http://localhost:8080/_token#token=" + token);
    console.log("Log in at:\n  " + url);
    res.send({ message: "ok" });
  };
}

function main() {
  const app = express()
    .use(express.json())
    .use(cors({ origin: ["http://localhost:8080"] }));
  app.set("trust proxy", true);

  app.get("/", (req, res) => res.send("ok"));

  // Attendance
  app.get("/attendance/me", file("attendance-me.json"));
  app.get("/attendance/:sessionId", file("attendance-session.json"));
  app.post("/attendance/:sessionId/attend", file("void.json"));
  app.post("/attendance/:sessionId/unattend", file("void.json"));

  // Calendar
  app.get("/calendar/ical/:sessionId", file("session.ics"));
  app.get(
    "/calendar/google/:sessionId",
    redirect("https://calendar.google.com?todo")
  );
  app.get("/calendar/me", file("calendar-me.json"));
  app.get("/calendar/me/:token", file("user.ics"));

  // Conference
  app.get("/schedule", file("conf-schedule.json"));
  app.get("/schedule/:sessionId/links", file("conf-links.json"));

  // Registration
  app.get("/auth/me", file("auth-me.json"));
  app.post("/auth/login", login());
  app.delete("/auth/me", file("void.json"));

  app.listen(3000, () => console.log("Listening on :3000"));
}

main();
