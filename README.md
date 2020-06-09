# json-line-diff

diff json side-by-side. (based on [json-diff](https://www.npmjs.com/package/json-diff))

usage:

```js
import { diff } from 'json-line-diff';

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
```

output: 

```
{ oldLines:
   [ { value: '{', line: 0, removed: false, path: '' },
     { value: '  "removed": true,',
       line: 1,
       removed: true,
       path: 'removed' },
     null,
     { value: '  "num": 1,', line: 2, removed: true, path: 'num' },
     { value: '  "arr": [', line: 3, removed: false, path: 'arr' },
     { value: '    1,', line: 4, removed: true, path: 'arr.0' },
     { value: '    2,', line: 5, removed: false, path: 'arr.1' },
     { value: '    3', line: 6, removed: false, path: 'arr.2' },
     { value: '  ],', line: 7, removed: false, path: 'arr' },
     { value: '  "obj": {', line: 8, removed: false, path: 'obj' },
     { value: '    "key1": "val1"',
       line: 9,
       removed: true,
       path: 'obj.key1' },
     null,
     { value: '  }', line: 10, removed: false, path: 'obj' },
     { value: '}', line: 11, removed: false, path: '' } ],
  newLines:
   [ { value: '{', line: 0, added: false, path: '' },
     null,
     { value: '  "added": true,', line: 1, added: true, path: 'added' },
     { value: '  "num": 2,', line: 2, added: true, path: 'num' },
     { value: '  "arr": [', line: 3, added: false, path: 'arr' },
     null,
     { value: '    2,', line: 4, added: false, path: 'arr.1' },
     { value: '    3', line: 5, added: false, path: 'arr.2' },
     { value: '  ],', line: 6, added: false, path: 'arr' },
     { value: '  "obj": {', line: 7, added: false, path: 'obj' },
     null,
     { value: '    "key2": "val2"',
       line: 8,
       added: true,
       path: 'obj.key2' },
     { value: '  }', line: 9, added: false, path: 'obj' },
     { value: '}', line: 10, added: false, path: '' } ] }
```

use options:

`diff(json1, json2, { indent, splitter })`

- indent: indent for line.value, defaults to 2

- splitter: splitter for line.path, defaults to "."
