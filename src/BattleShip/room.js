import Keyv from 'keyv';

let roomList = [];

// get all rooms
const getAll = async () => {
  return roomList;
}

// set the room
const setRoom = async (challenger, opponent) => {
  await removeRoom(challenger); // remove the previous room that created

  roomList.push({
    challenger: challenger,
    opponent: opponent,
    accept: false,
  })
};

// get the room obj by challenger
const getRoomByChallenger = async (player) => {
  return roomList.find((elem) => elem.challenger == player);
}

// get the room obj by opponent
const getRoomByOpponent = async (player) => {
  return roomList.find((elem) => elem.opponent == player);
}

// join the game
const joinRoom = async (challenger, opponent) => {
  await removeRoom(opponent); // remove the previous room that created

  let room = roomList.find((elem) => elem.challenger == challenger && elem.opponent == opponent);
  if (!room) {
    return;
  }

  room.accept = true;
}

// remove the room
const removeRoom = async (player) => {
  let index = roomList.findIndex((elem) => elem.challenger == player);
  if (index == -1) {
    return;
  }

  roomList.splice(index, 1);
};

const checkIsPlaying = async (player) => {
  let room = await getRoomByChallenger(player);
  if (room && room.accept) {
    return true;
  }
  
  room = await getRoomByOpponent(player);
  if (room && room.accept) {
    return true;
  }

  return false;
}

// check the user can be able to accept the battle
const checkCanAccept = async (challenger, opponent) => {
  let room = await getRoomByOpponent(opponent);
  if (room && room.challenger == challenger) {
    return true;
  }

  return false;
}

export default {
  getAll,
  setRoom,
  getRoomByChallenger,
  getRoomByOpponent,
  joinRoom,
  removeRoom,
  checkIsPlaying,
  checkCanAccept,
}