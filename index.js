
"use strict";

const jsonDiff = require('./lib/json-diff');

const INDENT = 2;
const OBJ_SPLITTER = (key) => `.${key}`;
const ARR_SPLITTER = (key) => `[${key}]`;

Object.defineProperty(exports, "__esModule", { value: true });

exports.diff = function(oldJson, newJson, { indent, objSplitter, arrSplitter } = {}) {
  indent = indent === undefined ? INDENT : indent;
  objSplitter = typeof objSplitter === 'function' ? objSplitter : OBJ_SPLITTER;
  arrSplitter = typeof arrSplitter === 'function' ? arrSplitter : ARR_SPLITTER;

  const sourceDiff = jsonDiff.diff(oldJson, newJson);
  
  const oldLines = [];
  const newLines = [];

  function walkJson(val, key, path, level, isLast, type, preIsObject = true) {
    if (val instanceof Array) {
      addLine('', preIsObject ? key : '', path, level, false, '[', true, type);
      val.forEach((item, index) => {
        const subPath = path ? path + arrSplitter(index) : index;
        walkJson(item, key, subPath, level + 1, index === val.length - 1, type, false);
      });
      addLine('', '', path, level, !isLast, ']', true, type);
    } else if (val instanceof Object) {
      const keys = Object.keys(val);
      addLine('', preIsObject ? key : '', path, level, false, '{', true, type);
      keys.forEach((keyItem, index) => {
        const subPath = path ? path + objSplitter(keyItem) : keyItem;
        walkJson(val[keyItem], keyItem, subPath, level + 1, index === keys.length - 1, type);
      });
      addLine('', '', path, level, !isLast, '}', true, type);
    } else {
      addLine('', key, path, level, !isLast, val, true, type);
    }
  }

  function walkDiff(val, key = '', path = '', level = 0, isOldLast = true, isNewLast = true) {
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
          
          const subPath = path ? path + arrSplitter(i) : i;

          switch (type) {
          case ' ':
            addLine(data, '', subPath, level + 1, !isOldLast, '', false, 'old');
            addLine(data, '', subPath, level + 1, !isNewLast, '', false, 'new');
            break;
          case '+': {
            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach((str, i) => {
              addLine('', '', subPath, level + 1, i === strs.length - 1 ? !isNewLast : false, str, true, 'new');
              oldLines.push(null);
            });
            break;
          }
          case '-': {
            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach((str, i) => {
              addLine('', '', subPath, level + 1, i === strs.length - 1 ? !isOldLast : false, str, true, 'old');
              newLines.push(null);
            });
            break;
          }
          case '~':
            walkDiff(data, '', subPath, level + 1, isOldLast, isNewLast);
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
        walkJson(val.__old, key, path, level, isOldLast, 'old');
        walkJson(val.__new, key, path, level, isNewLast, 'new');

        const oldStrs = JSON.stringify(val.__old, null, indent).split('\n');
        const newStrs = JSON.stringify(val.__new, null, indent).split('\n');

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
            const subPath = path ? path + objSplitter(key) : key;

            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach((str, i) => {
              addLine('', i === 0 ? key : '', subPath, level + 1, i === strs.length - 1 ? !isOldLast : false, str, true, 'old');
              newLines.push(null);
            });
          } else if (/__added$/.test(key)) {
            const data = val[key];
            key = key.replace(/__added$/, '');
            const subPath = path ? path + objSplitter(key) : key;

            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach((str, i) => {
              addLine('', i === 0 ? key : '', subPath, level + 1, i === strs.length - 1 ? !isNewLast : false, str, true, 'new');
              oldLines.push(null);
            });
          } else {
            const subPath = path ? path + objSplitter(key) : key;
            walkDiff(val[key], key, subPath, level + 1, isOldLast, isNewLast);
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


