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

exports.fromBinaryString = function (str, buf) {
  'use strict';
  var view = new Uint8Array(buf),
    i;
  for (i = 0; i < str.length; i++) {
    if (str[i] === '1') {
      view[(i >> 3)] |= (1 << (i % 8));
    }
  }
};

exports.toHexString = function (a) {
  'use strict';
  var view = new Uint8Array(a),
    out = '',
    i,
    encodingArr = '0123456789abcdef'.split('');
  for (i = 0; i < a.byteLength; i += 1) {
    out += encodingArr[view[i] >>> 4];
    out += encodingArr[view[i] & 0x0F];
  }

  return out;
};

exports.fromHexString = function (str, buf) {
  'use strict';
  var view = new Uint8Array(buf),
    i,
    encodingArr = '0123456789abcdef'.split('');

  if (str.length % 2 !== 0 || str.length !== 2 * view.byteLength) {
    console.error('Invalid Parameters to fromHexString.');
    return;
  }

  for (i = 0; i < str.length; i += 2) {
    buf[i>>1] = (encodingArr.indexOf(str[i]) << 4) + encodingArr.indexOf(str[i + 1]);
  }
};
