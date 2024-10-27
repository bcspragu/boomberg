import {randomBytes} from 'crypto'

const ID_LENGTH = 20
const CHARACTER_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const generateID = () => {
  let result = '';

  while (result.length < ID_LENGTH) {
    const rb = randomBytes(40); // Generate more bytes than needed
    const view = new Uint8Array(rb);

    for (let i = 0; i < view.length && result.length < ID_LENGTH; i++) {
      if (view[i] < CHARACTER_SET.length * Math.floor(256 / CHARACTER_SET.length)) {
        result += CHARACTER_SET[view[i] % CHARACTER_SET.length];
      }
    }
  }

  return result;
}
