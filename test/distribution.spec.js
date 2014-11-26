/*jslint node: true */
/*globals describe, it, beforeEach, afterEach */
/*globals Uint8Array,Uint16Array,Uint32Array */

var uniform_random = function (values) {
  'use strict';
  return Math.floor(Math.random() * values);
};

var gausian_random = function (values) {
  'use strict';
  var mean = (values) / 2,
    variance = values / 6,
    gaussian = require('gaussian')(mean, variance),
    value;
  
  while (true) {
    value = Math.floor(gaussian.ppf(Math.random()));
    if (value >= 0 && value < values) {
      return value;
    }
  }
};

var generate_simulated_input = function (rand, params) {
  'use strict';
  var parameters = {
    NUM_UNIQUE_VALUES: 100,
    NUM_VALUES_PER_CLIENT: 7,
    NUM_CLIENTS: 10000
  },
    input = [],
    row,
    i,
    j;

  // Default parameters are overriden by those set by caller.
  for (row in params) {
    if (params.hasOwnProperty(row)) {
      parameters[row] = params[row];
    }
  }
  
  for (i = 0; i < parameters.NUM_CLIENTS; i += 1) {
    row = [];
    for (j = 0; j < parameters.NUM_VALUES_PER_CLIENT; j += 1) {
      row.push(rand(parameters.NUM_UNIQUE_VALUES));
    }
    input.push(row);
  }
  return input;
};

describe("RAPPOR Aggregate Statistics", function () {
  'use strict';
  var rappor = require('../rappor'),
    sum_bits = require('../analysis/sum_bits'),
    decode = require('../analysis/decode'),
    expect = require('chai').expect,
    typical_instance = {
      num_cohorts: 64,
      num_hashes: 2,
      num_bloombits: 16,
      prob_p: 0.01,
      prob_q: 0.99,
      prob_f: 0.01,
      flag_oneprr: false
    };

  it("Maintains a uniform distribution in aggregate", function () {
    var params = JSON.parse(JSON.stringify(typical_instance)),
      rappors = [],
      encoder,
      input,
      i = 0,
      j = 0,
      row,
      sum;

    params.num_cohorts = 2;

    input = generate_simulated_input(uniform_random, {
      NUM_CLIENTS: 100
    });
    
    for (i = 0; i < input.length; i += 1) {
      encoder = new rappor.Encoder('u' + i, params);
      for (j = 0; j < input[i].length; j += 1) {
        rappors.push(encoder.encode(input[i][j]).toString());
      }
    }

    sum = sum_bits.sum_bits(params, rappors);

    expect(parseInt(sum[0].split(',')[0], 10) +
           parseInt(sum[1].split(',')[0], 10)).to.equal(100 * 7);

    // There are ~350 entries per cohort, and each rappor should appear to have
    // 2 bits set, since there's minimal noise added here. As such, we expect
    // an average value of 44 for
    // each summed bit. stdev=~6 here, so we claim values should be w/i 30.
    for (i = 0; i < sum.length; i += 1) {
      row = sum[i].split(',');
      for (j = 1; j < row.length; j += 1) {
        expect(parseInt(row[j], 10)).to.be.within(44 - 30, 44 + 30);
      }
    }
  });

  it("Maintains a gaussian distribution in aggregate", function () {
    var params = JSON.parse(JSON.stringify(typical_instance)),
      rappors = [],
      encoder,
      input,
      i = 0,
      j = 0,
      row,
      sum,
      peaks,
      add = function (a, b) {
        return a + b;
      };

    params.num_cohorts = 2;

    input = generate_simulated_input(gausian_random, {
      NUM_CLIENTS: 100
    });
    
    for (i = 0; i < input.length; i += 1) {
      encoder = new rappor.Encoder('u' + i, params);
      for (j = 0; j < input[i].length; j += 1) {
        rappors.push(encoder.encode(input[i][j]).toString());
      }
    }

    sum = sum_bits.sum_bits(params, rappors);

    expect(parseInt(sum[0].split(',')[0], 10) +
           parseInt(sum[1].split(',')[0], 10)).to.equal(100 * 7);

    sum = decode.denoise(sum, params);
    // Here we look for a peak - namely that there is some item in each
    // cohort at mean + 4sigma. That presence indicates to us that this
    // is not just a uniform distribution, although it's just a sanity
    // check.
    for (i = 0; i < sum.length; i += 1) {
      row = sum[i].reduce(add, 0) / sum[i].length;
      peaks = 0;
      for (j = 0; j < sum[i].length; j += 1) {
        if (sum[i][j] > row + 4 * 6) {
          peaks += 1;
        }
      }
      expect(peaks).to.be.at.least(1);
    }
  });
});
