const { diff } = require('../index.js');

const json1 = {
  num: 1,
  removed: true,
  arr: [1, 2, 3],
};

const json2 = {
  num: 2,
  added: true,
  arr: [2, 3],
};

console.log(diff(json1, json2));