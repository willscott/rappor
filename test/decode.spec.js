/*jslint node: true */
/*globals describe, it, beforeEach, afterEach */
/*globals Uint8Array,Uint16Array,Uint32Array */

describe("Statistical Analysis", function() {
  'use strict';

  var qnorm = require('../analysis/qnorm'),
      expect = require('chai').expect;

  it("Uses qnorm to invert normal Distributions", function() {
    expect(qnorm.qnorm(0.85, 70, 3)).to.be.greaterThan(70);
    expect(qnorm.qnorm(0.5)).to.equal(0);
  });
});
