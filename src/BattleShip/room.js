import Keyv from 'keyv';

const room = new Keyv();

const setRoom = async (id1, id2) => {
  await Promise
    .all([
      room.set(id1, id2),
    ]);
};

const getOpponent = (id) => room.get(id);

const removeRoom = async (id) => {
  room.delete(id)
};

export default {
  setRoom,
  getOpponent,
  removeRoom,
}