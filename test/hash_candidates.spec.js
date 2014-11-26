/*jslint node: true */
/*globals describe, it, beforeEach, afterEach */
/*globals Uint8Array,Uint16Array,Uint32Array */

describe("RAPPOR Candidate Mapping", function () {
  'use strict';
  var hash_candidates = require('../analysis/hash_candidates'),
    expect = require('chai').expect,
    typical_instance = {
      num_cohorts: 4,
      num_hashes: 2,
      num_bloombits: 16
    };

  it("Maps candidates as expected", function () {
    var candidates = [
      "apple",
      "banana",
      "carrot"
    ],
      expected = [
        ["apple", 2, 16, 19, 32, 37, 47, 52, 55],
        ["banana", 4, 16, 26, 23, 45, 34, 56, 62],
        ["carrot", 16, 8, 24, 30, 42, 33, 64, 62]
      ],
      output;
    
    output = hash_candidates.hashCandidates(typical_instance, candidates);

    expect(output).to.deep.equal(expected);
  });
});