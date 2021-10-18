import Keyv from 'keyv';

const room = new Keyv();

const setRoom = async (id1, id2) => {
  await Promise
    .all([
      room.set(id1, id2),
    ]);
};

const getOpponent = (id) => room.get(id);

const getAll = async () => {
  return room;
}

const removeRoom = async (id) => {
  room.delete(await getOpponent(id))
  room.delete(id)
};

export default {
  getAll,
  setRoom,
  getOpponent,
  removeRoom,
}