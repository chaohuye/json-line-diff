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
   [ { value: '{', line: 0, removed: false, path: 'root' },
     { value: '  "removed": true,',
       line: 1,
       removed: true,
       path: 'root' },
     null,
     { value: '  "num": 1,', line: 2, removed: true, path: 'root.num' },
     { value: '  "arr": [', line: 3, removed: false, path: 'root.arr' },
     { value: '    1,', line: 4, removed: true, path: 'root.arr' },
     { value: '    2,', line: 5, removed: false, path: 'root.arr' },
     { value: '    3', line: 6, removed: false, path: 'root.arr' },
     { value: '  ]', line: 7, removed: false, path: 'root.arr' },
     { value: '}', line: 8, removed: false, path: 'root' } ],
  newLines:
   [ { value: '{', line: 0, added: false, path: 'root' },
     null,
     { value: '  "added": true,', line: 1, added: true, path: 'root' },
     { value: '  "num": 2,', line: 2, added: true, path: 'root.num' },
     { value: '  "arr": [', line: 3, added: false, path: 'root.arr' },
     null,
     { value: '    2,', line: 4, added: false, path: 'root.arr' },
     { value: '    3', line: 5, added: false, path: 'root.arr' },
     { value: '  ]', line: 6, added: false, path: 'root.arr' },
     { value: '}', line: 7, added: false, path: 'root' } ] }
```

use options:

`diff(json1, json2, { indent, splitter })`

- indent: indent for line.value, defaults to 2

- splitter: splitter for line.path, defaults to "."
