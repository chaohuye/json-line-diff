const { diff } = require('../index.js');

const json1 = {
  num: 1,
  removed: true,
  arr: [1, 2, 3],
  obj: {
    key1: 'val1',
  },
};

const json2 = {
  num: 2,
  added: true,
  arr: [2, 3],
  obj: {
    key2: 'val2',
  },
};

console.log(diff(json1, json2));