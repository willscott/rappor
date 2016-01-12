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
        ["apple",   5,  1, 26, 26, 38, 34, 63, 62],
        ["banana", 12, 14, 28, 24, 37, 34, 62, 49],
        ["carrot",  4, 12, 25, 21, 48, 38, 61, 54]
      ],
      output;
    
    output = hash_candidates.hashCandidates(typical_instance, candidates);

    expect(output).to.deep.equal(expected);
  });
});
