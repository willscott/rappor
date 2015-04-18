/*jslint node: true */
/*globals describe, it, beforeEach, afterEach */
/*globals Uint8Array,Uint16Array,Uint32Array */

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

    encoder = new rappor.Encoder('none', params, rand_funcs);
    masks = encoder.get_rappor_masks();

    expect(masks.assigned_cohort).to.equal(0);

    f_exp[0] = 0x000db6d;
    expect(masks.f_bits).to.deep.equal(f_exp.buffer);

    mask_exp[0] = 0x006db6;
    expect(masks.mask_indices).to.deep.equal(mask_exp.buffer);
  });

  it("Gets Bloom Filter Bits", function () {
    var cohort = 0,
      hash_no = 0,
      input_word = "abc",
      ti = typical_instance,
      expected_output = 3,
      actual_output;

    actual_output = rappor.get_bf_bit(input_word, cohort, hash_no,
                                      ti.num_bloombits);
    expect(expected_output).to.equal(actual_output);
  });

  it("Gets Rappor Masks With One PRR", function () {
    // Set randomness function to be used with sample 32 random bits
    // set randomness function that takes two integers and returns a
    // random integer cohort in [a, b]
    var params = JSON.parse(JSON.stringify(typical_instance)),
      num_words = params.num_bloombits,
      rand = new MockRandom(),
      rand_funcs,
      encoder,
      masks1,
      masks2,
      masks3;

    params.flag_oneprr = true;
    rand_funcs = new rappor.SimpleRandomFunctions(params, rand);

    encoder = new rappor.Encoder('0', params, rand_funcs);
    masks1 = encoder.get_rappor_masks("abc");
    masks2 = encoder.get_rappor_masks("abc");
    masks3 = encoder.get_rappor_masks("abcd");

    expect(masks1).to.deep.equal(masks2);
    expect(masks1).not.to.deep.equal(masks3);

    params.flag_oneprr = false;
    masks1 = encoder.get_rappor_masks("abc");
    masks2 = encoder.get_rappor_masks("abc");
    expect(masks1).not.to.deep.equal(masks2);
  });

  it("Memoizes as a strategy for One PRR", function () {
    // Set randomness function to be used with sample 32 random bits
    // set randomness function that takes two integers and returns a
    // random integer cohort in [a, b]
    var params = JSON.parse(JSON.stringify(typical_instance)),
      num_words = params.num_bloombits,
      state = {},
      rand_funcs,
      encoder,
      masks1,
      masks2,
      masks3;

    params.flag_oneprr = true;
    rand_funcs = new rappor.MemoizedRandomFunctions(params, state);

    encoder = new rappor.Encoder('0', params, rand_funcs);
    masks1 = encoder.get_rappor_masks("abc");
    masks2 = encoder.get_rappor_masks("abc");
    masks3 = encoder.get_rappor_masks("abcd");

    expect(masks1).to.deep.equal(masks2);
    expect(masks1).not.to.deep.equal(masks3);
  });

  it("Encodes", function () {
    // Expected bloom bits is computed as follows.
    // f_bits = 0xfff0000f and mask_indices = 0x0ffff000 from
    // testGetRapporMasksWithoutPRR()

    // q_bits = 0xfffff0ff from mock_rand.randomness[] and how get_rand_bits works
    // p_bits = 0x000ffff0 from -- do --

    // bloom_bits_array is 0x0000 0048 (3rd bit and 6th bit, from
    // testSetBloomArray, are set)

    // Bit arithmetic ends up computing
    // bloom_bits_prr = 0x0ff00048
    // bloom_bits_irr = 0x0ffffff8
    var params = JSON.parse(JSON.stringify(typical_instance)),
      rand = new MockRandom(),
      rand_funcs,
      encoder,
      output;

    params.prob_f = 0.5;
    params.prob_p = 0.5;
    params.prob_q = 0.75;

    rand_funcs = new rappor.SimpleRandomFunctions(params, rand);
    rand_funcs.cohort_rand_fn = function (x) { return x; };

    encoder = new rappor.Encoder(0, params, rand_funcs);
    output = encoder.encode("abc");

    expect(output.cohort).to.equal(0);
    expect(new Uint16Array(output.irr)[0]).to.equal(0x000ffff);
  });



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
    var sum = 0;
    seed.split("").map(function (c) {
      sum += c.charCodeAt(0);
    });
    this.counter = sum % this.n;
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
