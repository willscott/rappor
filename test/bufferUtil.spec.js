/*jslint node: true */
/*globals describe, it, beforeEach, afterEach */
/*globals Uint8Array,Uint16Array,Uint32Array */

describe("Buffer Utilities", function () {
  'use strict';
  var bufferUtil = require('../bufferUtil'),
    expect = require('chai').expect;

  it("Does binary Ands", function () {
    var a = new Uint8Array([255,0,128,1]),
        b = new Uint8Array([255,255,127,1]),
        expected = new Uint8Array([255, 0 , 0, 1]);

    expect(bufferUtil.toBinaryString(bufferUtil.and(a,b))).to.equal(
        bufferUtil.toBinaryString(expected));
  });

  it("Does binary Ors", function () {
    var a = new Uint8Array([255,0,128,1]),
        b = new Uint8Array([255,255,127,1]),
        expected = new Uint8Array([255, 255 , 255, 1]);

    expect(bufferUtil.toBinaryString(bufferUtil.or(a,b))).to.equal(
        bufferUtil.toBinaryString(expected));
  });

  it("Does binary Nots", function () {
    var a = new Uint8Array([255,0,128,1]),
        expected = new Uint8Array([0, 255 , 127, 254]);

    expect(bufferUtil.toBinaryString(bufferUtil.not(a))).to.equal(
        bufferUtil.toBinaryString(expected));
  });

  it("Calculates Binary Strings", function () {
    var a = new Uint8Array([255,0]),
        expected = "1111111100000000";

    expect(bufferUtil.toBinaryString(a)).to.equal(expected);
  });

  it("Calculates Hex Strings", function () {
    var a = new Uint8Array([255,0]),
        expected = "ff00";

    expect(bufferUtil.toHexString(a)).to.equal(expected);
  });

  it("Recreates buffers from Hex Strings", function () {
    var a = new Uint8Array([255, 128, 1, 4]),
        b = new Uint8Array([0, 0, 0, 0]),
        expected = "ff800104";
    expect(bufferUtil.toHexString(a)).to.equal(expected);

    bufferUtil.fromHexString(expected, b);
    expect(bufferUtil.toBinaryString(a)).to.equal(bufferUtil.toBinaryString(b));
  });
});
