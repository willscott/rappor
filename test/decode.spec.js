/*jslint node: true */
/*globals describe, it, beforeEach, afterEach */
/*globals Uint8Array,Uint16Array,Uint32Array */

describe("Statistical Analysis", function() {
  'use strict';

  var qnorm = require('../analysis/norm'),
      expect = require('chai').expect;

  it("Uses qnorm to invert normal Distributions", function() {
    expect(qnorm.qnorm(0.85, 70, 3)).to.be.greaterThan(70);
    expect(qnorm.qnorm(0.5)).to.equal(0);
  });
  it("Uses rnorm to sample normal Distributions", function() {
    var samples = qnorm.rnorm(100, 0, 1);

    // calculate mean and variance:
    var s = qnorm.properites(samples);
    expect(Math.abs(s.mean)).to.be.lessThan(0.5);
    expect(Math.abs(Math.pow(s.variance, 0.5) - 1)).to.be.lessThan(0.5);
    for (var i = 0; i < samples.length; i ++) {
      expect(samples[i]).not.to.equal(0);
    }
  });
});

describe("Rappor Decoding", function() {
  'use strict';

  var decoder = require('../analysis/decode'),
    expect = require('chai').expect,
    params = {
      num_cohorts: 64,
      num_hashes: 2,
      num_bloombits: 16,
      prob_p: 0.4,
      prob_q: 0.7,
      prob_f: 0.3,
      flag_oneprr: false
    };

  it("Estimates Bloom Counts", function() {
    var sampleRappor = [];
    for (var i = 0; i < params.num_cohorts; i++) {
      var cohort = [100];
      for (var j = 0; j < params.num_bloombits; j++) {
        cohort.push(50);
      }
      sampleRappor.push(cohort);
    }

    var estimates = decoder.EstimateBloomCounts(sampleRappor, params);
    for (i = 0; i < params.num_cohorts; i++) {
      expect(estimates[0][i][0]).to.equal(estimates[0][i][1]);
      expect(estimates[0][i][0]).to.be.greaterThan(0);
      expect(estimates[0][i][0]).to.be.lessThan(1);
    }
  });
});
