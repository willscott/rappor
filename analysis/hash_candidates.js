/*jslint bitwise: true, node: true */

/**
 * Given a list of candidate strings, produces the 'map'
 * of what bits they hash to.
 */
exports.hashCandidates = function (params, candidates) {
  'use strict';
  var num_bloombits = params.num_bloombits,
    rappor = require('../rappor'),
    row,
    bit,
    out = [],
    i,
    j,
    k;

  for (i = 0; i < candidates.length; i += 1) {
    row = [candidates[i]];
    for (j = 0; j < params.num_cohorts; j += 1) {
      for (k = 0; k < params.num_hashes; k += 1) {
        bit = rappor.get_bf_bit(candidates[i], j, k, num_bloombits) + 1;
        row.push(j * num_bloombits + bit);
      }
    }
    out.push(row);
  }

  return out;
};
