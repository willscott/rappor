/*jslint node: true */
/*globals describe, it, beforeEach, afterEach */
/*globals Uint8Array,Uint16Array,Uint32Array */

describe("RAPPOR Analysis", function () {
  'use strict';
  var sum_bits = require('../analysis/sum_bits'),
    expect = require('chai').expect,
    typical_instance = {
      num_cohorts: 64,
      num_hashes: 2,
      num_bloombits: 16,
      prob_p: 0.4,
      prob_q: 0.7,
      prob_f: 0.3,
      flag_oneprr: false
    };

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

    sum_bits.update_rappor_sums(rappor_sum, report.buffer, cohort, typical_instance);

    expect(rappor_sum).to.deep.equal(expected_sum);
  });

  it("Sums bits from a file", function () {
    var input = [
        "5,1,0000111100001111",
        "5,1,0000000000111100"
      ],
      expected_output = [
        "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
        "2,0,0,0,0,1,1,1,1,0,0,1,1,2,2,1,1"
      ],
      params = {
        num_bloombits: 16,
        num_cohorts: 2
      },
      output;

    output = sum_bits.sum_bits(params, input);

    expect(output).to.deep.equal(expected_output);
  });
});
