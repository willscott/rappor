/*jslint bitwise: true, node: true */
/*globals ArrayBuffer,Uint8Array,DataView */

exports.and = function (a, b) {
  'use strict';
  var out = new Uint8Array(a.byteLength),
    i,
    a_byte_view = new Uint8Array(a),
    b_byte_view = new Uint8Array(b);
  for (i = 0; i < a.byteLength; i += 1) {
    out[i] = a_byte_view[i] & b_byte_view[i];
  }
  return out.buffer;
};

exports.or = function (a, b) {
  'use strict';
  var out = new Uint8Array(a.byteLength),
    i,
    a_byte_view = new Uint8Array(a),
    b_byte_view = new Uint8Array(b);
  for (i = 0; i < a.byteLength; i += 1) {
    out[i] = a_byte_view[i] | b_byte_view[i];
  }
  return out.buffer;
};

exports.not = function (a) {
  'use strict';
  var out = new Uint8Array(a.byteLength),
    i,
    a_byte_view = new Uint8Array(a);
  for (i = 0; i < a.byteLength; i += 1) {
    out[i] = ~a_byte_view[i];
  }
  return out.buffer;
};

exports.toBinaryString = function (a) {
  'use strict';
  var view = new Uint8Array(a),
    out = '',
    i,
    j;
  for (i = 0; i < a.byteLength; i += 1) {
    for (j = 0; j < 8; j += 1) {
      if ((view[i] & (1 << j)) > 0) {
        out += '1';
      } else {
        out += '0';
      }
    }
  }
  return out;
};

exports.toHexString = function (a) {
  'use strict';
  var view = new Uint8Array(a),
    out = '',
    i,
    encodingArr = '0123456789abcdef'.split('');
  for (i = 0; i < a.bytelengh; i += 1) {
    out += encodingArr[view[i] >>> 4];
    out += encodingArr[view[i] & 0x0F];
  }

  return out;
};
