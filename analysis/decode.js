/*jslint bitwise: true, node: true */
/*globals Uint8Array,Uint32Array, DataView, crypto */

/**
 * Decoding summed RAPPOR'd values to estimate original string frequencies
 * is done in 4 steps:
 * 1. Denoise - estimate the number of times each bit is truely set.
 * 2. Lasso model to match keys with coefficients.
 * 3. Regression on variable to estimate counts & p-values
 * 4. p-value analysis to determine frequencies.
 */

/**
 * Denoise - estimates the number of times each bit in each cohort was
 * originally set. Follows the algorithm at:
 * https://github.com/google/rappor/blob/761aa0bcd84/analysis/R/decode.R#L21
 */
exports.denoise = function (counts, params) {
  'use strict';
  var i, j,
    cohort, row,
    output = [],
    f = params.prob_f,
    q = params.prob_q,
    p = params.prob_p,
    numerator,
    denom = (1 - f) * (q - p);

  for (i = 0; i < counts.length; i += 1) {
    cohort = counts[i].split(',');
    row = [];
    numerator = parseInt(cohort[0], 10) * (p + 0.5 * f * q - 0.5 * f * p);
    for (j = 1; j < cohort.length; j += 1) {
      row.push((parseInt(cohort[j], 10) - numerator) / denom);
    }
    output.push(row);
  }

  return output;
};
