
"use strict";

const jsonDiff = require('./lib/json-diff');

const INDENT = 2;
const DEFAULT_OBJ_SPLITTER = (key) => `.${key}`;
const DEFAULT_ARR_SPLITTER = (key) => `[${key}]`;

Object.defineProperty(exports, "__esModule", { value: true });

const LINE_TYPE = {
  OLD: 'old',
  NEW: 'new',
};

exports.diff = function(oldJson, newJson, { indent, objSplitter, arrSplitter } = {}) {
  indent = indent === undefined ? INDENT : indent;
  objSplitter = typeof objSplitter === 'function' ? objSplitter : DEFAULT_OBJ_SPLITTER;
  arrSplitter = typeof arrSplitter === 'function' ? arrSplitter : DEFAULT_ARR_SPLITTER;

  const sourceDiff = jsonDiff.diff(oldJson, newJson);

  const oldLines = [];
  const newLines = [];

  function walkJSON(val, key = '', path = '', level = 0, isLast = true, type = LINE_TYPE.OLD, preIsObject = true) {
    if (val instanceof Array) {
      if (!val.length) {
        addLine('', preIsObject ? key : '', path, level, false, '[]', true, type);
        return;
      }
      addLine('', preIsObject ? key : '', path, level, false, '[', true, type);
      val.forEach((item, index) => {
        const subPath = path ? path + arrSplitter(index) : index;
        walkJSON(item, key, subPath, level + 1, index === val.length - 1, type, false);
      });
      addLine('', '', path, level, !isLast, ']', true, type);
    } else if (val instanceof Object) {
      const keys = Object.keys(val);
      if (!keys.length) {
        addLine('', preIsObject ? key : '', path, level, false, '{}', true, type);
        return;
      }
      addLine('', preIsObject ? key : '', path, level, false, '{', true, type);
      keys.forEach((keyItem, index) => {
        const subPath = path ? path + objSplitter(keyItem) : keyItem;
        walkJSON(val[keyItem], keyItem, subPath, level + 1, index === keys.length - 1, type);
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
        addLine('', key, path, level, !isOldLast, '[]', false, LINE_TYPE.OLD);
        addLine('', key, path, level, !isNewLast, '[]', false, LINE_TYPE.NEW);
      } else {
        addLine('', key, path, level, false, '[', false, LINE_TYPE.OLD);
        addLine('', key, path, level, false, '[', false, LINE_TYPE.NEW);

        const lastIndexForNew = val.length - 1 - val.slice().reverse().findIndex(([ type ]) => type !== '-');
        const lastIndexForOld = val.length - 1 - val.slice().reverse().findIndex(([ type ]) => type !== '+');
        
        val.forEach(([ type, data ], i) => {
          const isOldLast = i === lastIndexForOld;
          const isNewLast = i === lastIndexForNew;
          
          const subPath = path ? path + arrSplitter(i) : i;

          switch (type) {
          case ' ':
            addLine(data, '', subPath, level + 1, !isOldLast, '', false, LINE_TYPE.OLD);
            addLine(data, '', subPath, level + 1, !isNewLast, '', false, LINE_TYPE.NEW);
            break;
          case '+': {
            walkJSON(data, '', subPath, level + 1, isNewLast, LINE_TYPE.NEW, false);
            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach(() => {
              oldLines.push(null);
            });
            break;
          }
          case '-': {
            walkJSON(data, '', subPath, level + 1, isOldLast, LINE_TYPE.OLD, false);
            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach(() => {
              newLines.push(null);
            });
            break;
          }
          case '~':
            walkDiff(data, '', subPath, level + 1, isOldLast, isNewLast);
            break;
          }
        });

        addLine('', '', path, level, !isOldLast, ']', false, LINE_TYPE.OLD);
        addLine('', '', path, level, !isNewLast, ']', false, LINE_TYPE.NEW);
      }

      break;
    }
    case val instanceof Object: {
      const keys = Object.keys(val);

      if (!keys.length) {
        addLine('', key, path, level, !isOldLast, '{}', false, LINE_TYPE.OLD);
        addLine('', key, path, level, !isNewLast, '{}', false, LINE_TYPE.NEW);
      } else if ('__val' in val) {
        const strs = JSON.stringify(val.__val, null, indent).split('\n');
        strs.forEach((str, i) => {
          addLine('', i === 0 ? key : '', path, level, i === strs.length - 1 ? !isOldLast : false, str, false, LINE_TYPE.OLD);
          addLine('', i === 0 ? key : '', path, level, i === strs.length - 1 ? !isNewLast : false, str, false, LINE_TYPE.NEW);
        });
      } else if ('__old' in val && '__new' in val) {
        walkJSON(val.__old, key, path, level, isOldLast, LINE_TYPE.OLD);
        walkJSON(val.__new, key, path, level, isNewLast, LINE_TYPE.NEW);

        const oldStrs = JSON.stringify(val.__old, null, indent).split('\n');
        const newStrs = JSON.stringify(val.__new, null, indent).split('\n');

        if (oldStrs.length > newStrs.length) {
          newLines.push(...new Array(oldStrs.length - newStrs.length).fill(null));
        } else {
          oldLines.push(...new Array(newStrs.length - oldStrs.length).fill(null));
        }
      } else {
        addLine('', key, path, level, false, '{', false, LINE_TYPE.OLD);
        addLine('', key, path, level, false, '{', false, LINE_TYPE.NEW);

        const lastIndexForNew = keys.length - 1 - keys.slice().reverse().findIndex(key => !/__deleted$/.test(key));
        const lastIndexForOld = keys.length - 1 - keys.slice().reverse().findIndex(key => !/__added$/.test(key));

        keys.forEach((key, i) => {
          const isOldLast = i === lastIndexForOld;
          const isNewLast = i === lastIndexForNew;

          if (/__deleted$/.test(key)) {
            const data = val[key];
            key = key.replace(/__deleted$/, '');
            const subPath = path ? path + objSplitter(key) : key;

            walkJSON(data, key, subPath, level + 1, isOldLast, LINE_TYPE.OLD);
            
            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach(() => {
              newLines.push(null);
            });
          } else if (/__added$/.test(key)) {
            const data = val[key];
            key = key.replace(/__added$/, '');
            const subPath = path ? path + objSplitter(key) : key;

            walkJSON(data, key, subPath, level + 1, isNewLast, LINE_TYPE.NEW);

            const strs = JSON.stringify(data, null, indent).split('\n');
            strs.forEach(() => {
              oldLines.push(null);
            });
          } else {
            const subPath = path ? path + objSplitter(key) : key;
            walkDiff(val[key], key, subPath, level + 1, isOldLast, isNewLast);
          }
        });

        addLine('', '', path, level, !isOldLast, '}', false, LINE_TYPE.OLD);
        addLine('', '', path, level, !isNewLast, '}', false, LINE_TYPE.NEW);
      }
      break;
    }

    default:
    }
  }

  let oldLine = 0;
  let newLine = 0;

  function addLine(val, key, path, level, comma, addition = '', modified = false, type = LINE_TYPE.OLD) {
    const value = `${''.padStart(level * indent)}${key ? `"${key}": ` : ''}${addition || (typeof val === 'string' ? `"${val}"` : val)}${comma ? ',' : ''}`;

    switch (type) {
    case LINE_TYPE.OLD: {
      oldLines.push({
        value,
        line: oldLine++,
        removed: modified,
        path,
      });
      break;
    }
    case LINE_TYPE.NEW: {
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
