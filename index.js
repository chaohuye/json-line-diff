
"use strict";

const jsonDiff = require('./lib/json-diff');

const INDENT = 2;
const SPLITTER = '.';

Object.defineProperty(exports, "__esModule", { value: true });

exports.diff = function(oldJson, newJson, { indent, splitter } = {}) {
  indent = indent === undefined ? INDENT : indent;
  splitter = splitter === undefined ? SPLITTER : splitter;

  const sourceDiff = jsonDiff.diff(oldJson, newJson);

  const oldLines = [];
  const newLines = [];

  function walkDiff(val, key = '', path = 'root', level = 0, isOldLast = true, isNewLast = true) {
    switch (true) {
    case val instanceof Array: {
      if (!val.length) {
        addLine('', key, path, level, !isOldLast, '[]', false, 'old');
        addLine('', key, path, level, !isNewLast, '[]', false, 'new');
      } else {
        addLine('', key, path, level, false, '[', false, 'old');
        addLine('', key, path, level, false, '[', false, 'new');

        const lastIndexForNew = val.length - 1 - val.slice().reverse().findIndex(([ type ]) => type !== '-');
        const lastIndexForOld = val.length - 1 - val.slice().reverse().findIndex(([ type ]) => type !== '+');

        val.forEach(([ type, data ], i) => {
          const isOldLast = i === lastIndexForOld;
          const isNewLast = i === lastIndexForNew;

          switch (type) {
          case ' ':
            addLine(data, '', path, level + 1, !isOldLast, '', false, 'old');
            addLine(data, '', path, level + 1, !isNewLast, '', false, 'new');
            break;
          case '+': {
            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach((str, i) => {
              addLine('', '', path, level + 1, i === strs.length - 1 ? !isNewLast : false, str, true, 'new');
              oldLines.push(null);
            });
            break;
          }
          case '-': {
            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach((str, i) => {
              addLine('', '', path, level + 1, i === strs.length - 1 ? !isOldLast : false, str, true, 'old');
              newLines.push(null);
            });
            break;
          }
          case '~':
            walkDiff(data, '', `${path}${splitter}${i}`, level + 1, isOldLast, isNewLast);
            break;
          }
        });

        addLine('', '', path, level, !isOldLast, ']', false, 'old');
        addLine('', '', path, level, !isNewLast, ']', false, 'new');
      }

      break;
    }
    case val instanceof Object: {
      const keys = Object.keys(val);

      if (!keys.length) {
        addLine('', key, path, level, !isOldLast, '{}', false, 'old');
        addLine('', key, path, level, !isNewLast, '{}', false, 'new');
      } else if ('__val' in val) {
        const strs = JSON.stringify(val.__val, null, indent).split('\n');
        strs.forEach((str, i) => {
          addLine('', i === 0 ? key : '', path, level, i === strs.length - 1 ? !isOldLast : false, str, false, 'old');
          addLine('', i === 0 ? key : '', path, level, i === strs.length - 1 ? !isNewLast : false, str, false, 'new');
        });
      } else if ('__old' in val && '__new' in val) {
        const oldStrs = JSON.stringify(val.__old, null, indent).split('\n');
        oldStrs.forEach((str, i) => {
          addLine('', i === 0 ? key : '', path, level, i === oldStrs.length - 1 ? !isOldLast : false, str, true, 'old');
        });

        const newStrs = JSON.stringify(val.__new, null, indent).split('\n');
        newStrs.forEach((str, i) => {
          addLine('', i === 0 ? key : '', path, level, i === newStrs.length - 1 ? !isNewLast : false, str, true, 'new');
        });

        if (oldStrs.length > newStrs.length) {
          newLines.push(...new Array(oldStrs.length - newStrs.length).fill(null));
        } else {
          oldLines.push(...new Array(newStrs.length - oldStrs.length).fill(null));
        }
      } else {
        addLine('', key, path, level, false, '{', false, 'old');
        addLine('', key, path, level, false, '{', false, 'new');

        const lastIndexForNew = keys.length - 1 - keys.slice().reverse().findIndex(key => !/__deleted$/.test(key));
        const lastIndexForOld = keys.length - 1 - keys.slice().reverse().findIndex(key => !/__added$/.test(key));

        keys.forEach((key, i) => {
          const isOldLast = i === lastIndexForOld;
          const isNewLast = i === lastIndexForNew;

          if (/__deleted$/.test(key)) {
            const data = val[key];
            key = key.replace(/__deleted$/, '');

            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach((str, i) => {
              addLine('', i === 0 ? key : '', path, level + 1, i === strs.length - 1 ? !isOldLast : false, str, true, 'old');
              newLines.push(null);
            });
          } else if (/__added$/.test(key)) {
            const data = val[key];
            key = key.replace(/__added$/, '');

            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach((str, i) => {
              addLine('', i === 0 ? key : '', path, level + 1, i === strs.length - 1 ? !isNewLast : false, str, true, 'new');
              oldLines.push(null);
            });
          } else {
            walkDiff(val[key], key, `${path}${splitter}${key}`, level + 1, isOldLast, isNewLast);
          }
        });

        addLine('', '', path, level, !isOldLast, '}', false, 'old');
        addLine('', '', path, level, !isNewLast, '}', false, 'new');
      }
      break;
    }

    default:
    }
  }

  let oldLine = 0;
  let newLine = 0;

  function addLine(val, key, path, level, comma, addition = '', modified = false, type = '') {
    const value = `${''.padStart(level * indent)}${key ? `"${key}": ` : ''}${addition || (typeof val === 'string' ? `"${val}"` : val)}${comma ? ',' : ''}`;

    switch (type) {
    case 'old': {
      oldLines.push({
        value,
        line: oldLine++,
        removed: modified,
        path,
      });
      break;
    }
    case 'new': {
      newLines.push({
        value,
        line: newLine++,
        added: modified,
        path,
      });
      break;
    }
    }
  }

  walkDiff(sourceDiff);

  const diffResult = {
    oldLines,
    newLines,
  };

  return diffResult;
}


