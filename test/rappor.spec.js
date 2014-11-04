/*jslint node: true */
/*globals describe, it, beforeEach, afterEach */
/*globals Uint8Array,Uint32Array */

describe("RAPPOR", function () {
  'use strict';
  var rappor = require('../rappor'),
    expect = require('chai').expect,
    typical_instance = {
      num_cohorts: 64,
      num_hashes: 2,
      num_bloombits: 16,
      prob_p: 0.4,
      prob_q: 0.7,
      prob_f: 0.3,
      flag_oneprr: false
    },
    MockRandom;
  
  it("Updates sums with less than a 32 bit bloom filter", function () {
    var report = new Uint32Array(1),
      rappor_sum,
      cohort = 42,
      expected_sum,
      i;
    
    report[0] = 0x1d; // from LSB, bits 1,3,4,5 set.

    // Empty sums.
    rappor_sum = [];
    expected_sum = [];
    for (i = 0; i < typical_instance.num_cohorts; i += 1) {
      rappor_sum.push(new Uint8Array(typical_instance.num_bloombits + 1));
      expected_sum.push(new Uint8Array(typical_instance.num_bloombits + 1));
    }

    // Set up expected value.
    expected_sum[42][0] = 1;
    expected_sum[42][1] = 1;
    expected_sum[42][3] = 1;
    expected_sum[42][4] = 1;
    expected_sum[42][5] = 1;

    rappor.update_rappor_sums(rappor_sum, report.buffer, cohort, typical_instance);

    expect(rappor_sum).to.deep.equal(expected_sum);
  });

  it("Gets Rappor Masks Without One PRR", function () {
    var params = JSON.parse(JSON.stringify(typical_instance)),
      num_words = params.num_bloombits,
      rand = new MockRandom(),
      rand_funcs,
      encoder,
      masks,
      f_exp = new Uint16Array(1),
      mask_exp = new Uint16Array(1);

    params.prob_f = 0.5; // For simplicity
    rand_funcs = new rappor.SimpleRandomFunctions(params, rand);
    rand_funcs.cohort_rand_fn = function (a, b) {return a; };

    encoder = new rappor.Encoder(params, 'none', rand_funcs);
    masks = encoder.get_rappor_masks();

    expect(masks.assigned_cohort).to.equal(0);

    f_exp[0] = 0x000db6d;
    expect(masks.f_bits).to.deep.equal(f_exp.buffer);

    mask_exp[0] = 0x006db6;
    expect(masks.mask_indices).to.deep.equal(mask_exp.buffer);
  });

  it("Gets Bloom Filter Bits");

  it("Gets Rappor Masks With One PRR");

  it("Encodes");

  /**
   * Return one of three random values in a cyclic manner.
   *
   * Mock random function that involves some state, as needed for tests
   * that call randomness several times. This makes it difficult to deal
   * exclusively with stubs for testing purposes.
   */
  MockRandom = function () {
    this.counter = 0;
    this.randomness = [0, 0.6, 0];
    this.n = this.randomness.length;
  };

  MockRandom.prototype.seed = function (seed) {
    this.counter = seed % this.n;
  };

  MockRandom.prototype.getstate = function () {
    return this.counter;
  };

  MockRandom.prototype.setstate = function (state) {
    this.counter = state;
  };

  MockRandom.prototype.randint = function (a, b) {
    return a + this.counter;
  };

  MockRandom.prototype.random = function () {
    var rand_val = this.randomness[this.counter];
    this.counter = (this.counter + 1) % this.n;
    return rand_val;
  };
  
});
