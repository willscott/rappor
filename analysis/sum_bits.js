/*jslint bitwise: true, node: true */

/**
 * Read RAPPOR'd values and sum the bits to produce a counting bloom filter
 * by cohort.
 */

var update_rappor_sums = function (rappor_sum, rappor, cohort, params) {
  'use strict';
  var bit_num = params.num_bloombits,
    i,
    rapporView = new DataView(rappor);
  for (i = 0; i < bit_num; i += 1) {
    if (rapporView.getUint8(Math.floor(i / 8)) & (1 << (i % 8))) {
      rappor_sum[cohort][i + 1] += 1;
    }
  }

  rappor_sum[cohort][0] += 1;
};

/**
 * Parse rappors from a collection of individual reports into the counts format
 * used in the rest of decode.
 * @param rappors Array of strings of format "userid,cohort,bloombits"
 * @param decodeFunction a function(str, buf) that converts encoded bits into a typed array
 * @param params the rappor parameters
 * @returns counts - an array organized by cohort of [#in cohort, typed array of bit counts]
 */
var parse_rappors = function (rappors, decodeFunction, params) {
  var counts = new Array(params.num_cohorts),
    bufferBits = params.num_bloombits / 8 + (params.num_bloombits % 8 > 0 ? 1 : 0);
  for (var i = 0; i < counts.length; i++) {
    //TODO: flexibility in count storage type.
    counts[i] = [0, new Uint32Array(params.num_bloombits)];
  }
  rappors.map(function (rappor) {
    var buffer = new Uint8Array(bufferBits);
    var parts = rappor.split(",");
    var cohort = parseInt(parts[1], 10);
    decodeFunction(parts[2], buffer.buffer);
    for (var j = 0; j < params.num_bloombits; j++) {
      if ((buffer[j >> 3] & (1 << (j % 8))) !== 0) {
        counts[cohort][1][j] += 1;
      }
    }
    counts[cohort][0] += 1;
  });
  return counts;
};

/**
 * sum_bits outputs a disk-format used for storing aggregate rappor's, essentially
 * the CSV serialization of the in-memory array used in decoding.
 */
var sum_bits = function (params, data) {
  'use strict';
  // Sum format is:
  // [#entries in cohort][sum of each bloom bit...]
  var bu = require("../bufferUtil");
  var counts = parse_rappors(data, bu.fromBinaryString, params);

  return counts.map(function (cohort) {
    var arr = [cohort[0]];
    for (var i = 0; i < params.num_bloombits; i++) {
      arr.push(cohort[1][i]);
    }
    return arr.join(",");
  });
};

exports.update_rappor_sums = update_rappor_sums;
exports.parse_rappors = parse_rappors;
exports.sum_bits = sum_bits;
