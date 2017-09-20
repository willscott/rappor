/* jslint bitwise: true, node: true */
/* globals exports,Float64Array */
var qnorm = require('./qnorm');

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
 * Decodes summed RAPPOR'd values like Denoise, but also estimates the
 * expected relative deviation present at each position.
 * counts has 1 array per cohort. the first element is the number of responders
 * in the cohort and the remainder are the individual bits.
 */
exports.EstimateBloomCounts = function (counts, params) {
  var p = params.prob_p,
      q = params.prob_q,
      f = params.prob_f,
      p11 = q * (1 - f / 2) + p * f / 2,
      p01 = p * (1 - f / 2) + q * f / 2,
      p2 = p11 - p01,
      i;

  var estimates = counts.map(function (cohort) {
    var out = [];
    for (var j = 1; j < cohort.length; j++) {
      var est = (cohort[j] - p01 * cohort[0]) / p2 / cohort[0];
      if (est == Infinity) {
        est = 0;
      }
      out.push(est);
    }
    return out;
  });

  var stdevs = counts.map(function (cohort) {
    var total = cohort[0];
    var out = [];
    for (var j = 1; j < cohort.length; j++) {
      var itm = cohort[j];
      var phat = (itm - p01 * total) / (total * p2);
      phat = Math.max(0, Math.min(1, phat));
      var r = phat * p11 + (1 - phat) * p01;
      var variance = total * r * (1 - r) / (p2 * p2);
      var stdev = Math.sqrt(variance) / total;
      out.push(stdev);
    }
    return out;
  });
  return [estimates, stdevs];
};

/**
 * Lasso - a basic lasso calculation to attempt to find which of a set of
 * candidate strings are set given a set of observed counts (the output of
 * denoise above).
 * lambda is a fitting paramter - generally below 80% of count size for
 * sparseness, and capped to maintain better performance.
 */
exports.Lasso = function (candidates, counts, lambda) {
  // The coefficients we're generating
  var coefficients = new Float64Array(candidates.length);

  // nextDelta - figures out where the next step should be
  var nextDelta = function(candidate, counts, delt, innerProduct, lambda, sign) {
    var num = 0, i;
    for (i = 0; i < counts.length; i++) {
      num -= candidate[i] * counts[i] / (1 + Math.exp(innerProduct[i]));
    }
    num += lambda * sign;


    // normalize
    var denom = 0;
    for (i = 0; i < counts.length; i++) {
      var ip = delt * Math.abs(candidate[i]);

      if (Math.abs(innerProduct[i]) < ip) {
        denom += candidate[i] * candidate[i] * 0.25;
      } else {
        denom += candidate[i] * candidate[i] * 1.0 / (2.0 + Math.exp(Math.abs(innerProduct[i]) - ip) + Math.exp(ip - Math.abs(innerProduct[i])));
      }
    }
    return -(num / denom);
  };

  // move to the next step (where the next basis will become relevant)
  var step = function (candidate, counts, coeff, delt, innerProduct, l) {
    var howMuch, sign = 0.0;
    if (l > 0 && coeff == 0) {
      sign = 1.0;
      howMuch = nextDelta(candidate, counts, delt, innerProduct, l, sign);
      if (howMuch <= 0) {
        sign = -1.0;
        howMuch = nextDelta(candidate, counts, delt, innerProduct, l, sign);
        if (howMuch >= 0) {
          howMuch = 0;
        }
      }
    } else {
      sign = coeff / (Math.abs(coeff) + (coeff == 0));
      howMuch = nextDelta(candidate, counts, delt, innerProduct, l, sign);
      if (l > 0 && sign * (coeff + howMuch) < 0) {
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

  // we iterate up to 1000 times, or until converged()
  for(i = 0; i < 1000; i++) {
    var partialProduct = new Float64Array(counts.length);

    // for each candidate, determine how much to head towards that candidate.
    for (var j = 0; j < candidates.length; j++) {
      var candidate = candidates[j];
      var candidateDelta = step(candidate, counts, coefficients[j], delta[j], innerProduct, (j == 0) ? 0 : lambda);
      var boundedDelta = Math.min(Math.max(candidateDelta, -delta[j]), delta[j]);
      for (var c = 0; c < counts.length; c++) {
        deltaIP[c] = boundedDelta * candidate[c] * counts[c];
        innerProduct[c] += deltaIP[c];
        partialProduct[c] += deltaIP[c];
      }

      coefficients[j] += boundedDelta;
      delta[j] = Math.max(2 * Math.abs(boundedDelta), delta[j] / 2);
    }

    if (converged(innerProduct, partialProduct, 0.00001)) {
      break;
    }
  }
  return coefficients;
};

// Converged checks to see if we're still making progress.
var converged = function(innerProduct, innerProductDelta, threshold) {
  var productSum = innerProduct.reduce(function(a,b) {
    return Math.abs(a) + Math.abs(b);
  });
  var deltaSum = innerProductDelta.reduce(function(a,b) {
    return Math.abs(a) + Math.abs(b);
  });
  return deltaSum / (1.0 + productSum) <= threshold;
};

/*
 * ComputePrivacyGuarantees - given a set of rappor parameters, a population
 * size, and a underlying prevelance alpha, what are the actual privacy
 * expectations?
 * returns a map with:
 * effective p, q, detection frequency, and exponential parameters
 */
exports.ComputePrivacyGuarantees = function(params, alpha, N) {
  var p = params.prob_p,
    q = params.prob_q,
    f = params.prob_f,
    h = params.num_hashes;

  var q2 = 0.5 * f * (p + q) + (1 - f) * q;
  var p2 = 0.5 * f * (p + q) + (1 - f) * p;

  var exp_e_one = Math.exp((q2 * (1 - p2)) / (p2 * (1 - q2)), h);
  if (exp_e_one < 1) {
    exp_e_one = 1/ exp_e_one;
  }
  var e_one = Math.log(exp_e_one);

  var exp_e_inf = Math.exp((1 - 0.5 * f) / (0.5 * f), 2 * h);
  var e_inf = Math.log(exp_e_inf);

  var std_dev_counts = Math.sqrt(p2 * (1 - p2) * N) / (q2 - p2);
  var detection_freq = qnorm.qnorm(1 - alpha) * std_dev_counts / N;

  return {
    "effective_p": p2,
    "effective_q": q2,
    "exp_e_1": exp_e_one,
    "e_1": e_one,
    "exp_e_inf": exp_e_inf,
    "e_inf": e_inf,
    "detection_freq": detection_freq
  };
};
