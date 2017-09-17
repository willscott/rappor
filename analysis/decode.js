/* jslint bitwise: true, node: true */
/* globals exports,Float64Array */

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
 *
 * @param counts The aggregated rappor bloom filters.
 * @param params The rappor parameters of how much noise has been injected.
 * @returns Updated counts with expected noise removed.
 */
exports.Denoise = function (counts, params) {
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

/**
 * Fit - a basic lasso calculation to attempt to find which of a set of
 * candidate strings are set given a set of observed counts (the output of
 * denoise above).
 */
exports.fit = function (candidates, counts, lambda) {
  var coefficients = new Float64Array(candidates.length);
  // recompute delta for where to stop.
  var update = function(candidate, counts, delt, innerProduct, lambda, sign) {
    var num = 0, i;
    for (i = 0; i < counts.length; i++) {
      num -= (candidate[i] * counts[i]) / (1 + Math.exp(innerProduct[i]))
    }
    num += lambda * sign;


    // normalize
    var denom = 0;
    for (i = 0; i < counts.length; i++) {
      var ip = delt * Math.abs(candidate[i]);

      if (Math.abs(innerProduct[i]) < ip) {
        denom += candidate[i] * candidate[i] * 0.25
      } else {
        denom += candidate[i] * candidate[i] * 1.0 / (2.0 + Math.exp(Math.abs(innerProduct[i]) - ip) + Math.exp(ip - Math.abs(innerProduct[i])));
      }
    }
    return -(num / denom);
  };

  // move to the next step
  var step = function (candidate, counts, coeff, delt, innerProduct, l) {
    var howMuch, sign = 0.0;
    if ((l > 0) && coeff == 0) {
      sign = 1.0;
      howMuch = update(candidate, counts, delt, innerProduct, l, sign);
      if (howMuch <= 0) {
        sign = -1.0;
        howMuch = update(candidate, counts, delt, innerProduct, l, sign);
        if (howMuch >= 0) {
          howMuch = 0;
        }
      }
    } else {
      sign = coeff / (Math.abs(coeff) + (coeff == 0));
      howMuch = update(candidate, counts, delt, innerProduct, l, sign);
      if ((l > 0) && (sign * (coeff + howMuch) < 0)) {
        howMuch = -coeff;
      }
    }

    return howMuch;
  };


  var delta = new Float64Array(candidates.length);
  var i;
  for (i = 0; i < candidates.length; i++) {
    delta[i] = 1.0;
  }
  var innerProduct = new Float64Array(counts.length);
  var deltaIP = new Float64Array(counts.length);

  var perCandidate = function(candidate, num, partial) {
    var candidateDelta = step(candidate, counts, coefficients[num], delta[num], innerProduct, (num==0)?0:lambda);
    var boundedDelta = Math.min(Math.max(candidateDelta, -delta[num]), delta[num]);
    for (var j = 0; j < counts.length; j++) {
      deltaIP[j] = boundedDelta * candidate[j] * counts[j];
      innerProduct[j] += deltaIP[j];
      partial[j] += deltaIP[j];
    }

    coefficients[num] += boundedDelta;
    delta[num] = Math.max(2 * Math.abs(boundedDelta), delta[num] / 2);
  };

  for(i = 0; i < 1000; i++) {
    var partialProduct = new Float64Array(counts.length);

    var candidateNum = 0;
    for (var j = 0; j < candidates.length; j++) {
      perCandidate(candidates[j], j, partialProduct);
    }

    if (converged(innerProduct, partialProduct, 0.00001)) {
      break;
    }
  }
  return coefficients;
}

// Converged checks to see if we're still making progress.
var converged = function(innerProduct, innerProductDelta, threshold) {
  var productSum = innerProduct.reduce(function(a,b) {return Math.abs(a) + Math.abs(b);});
  var deltaSum = innerProductDelta.reduce(function(a,b) {return Math.abs(a) + Math.abs(b);});
  return (deltaSum/(1.0 + productSum)) <= threshold;
}
