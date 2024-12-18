const { Router } = require("express");

const creatorRoom = Router();

creatorRoom.get('/create-room', async (request, response) => {

    return { "name": "SalaDaPaula", "currentTask": "Task 1", "moderator": "Paula", "players": [ { "name": "Paula", "point": "?" } ] }
});