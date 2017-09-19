/*jslint bitwise: true, node: true */

/**
 * Read RAPPOR'd values and sum the bits to produce a counting bloom filter
 * by cohort.
 */

var update_rappor_sums = function (rappor_sum, rappor, cohort, params) {
  'use strict';
  var bit_num = params.num_bloombits,
    i,
    rapporView = new DataView(rappor);
  for (i = 0; i < bit_num; i += 1) {
    if (rapporView.getUint8(Math.floor(i / 8)) & (1 << (i % 8))) {
      rappor_sum[cohort][i + 1] += 1;
    }
  }

  rappor_sum[cohort][0] += 1;
};

var sum_bits = function (params, data) {
  'use strict';
  // Sum format is:
  // [#entries in cohort][sum of each bloom bit...]

  var sums = [],
    i,
    j,
    row,
    cohort,
    irr,
    bit_num;

  // Initialize sums.
  for (i = 0; i < params.num_cohorts; i += 1) {
    row = [0];
    for (j = 0; j < params.num_bloombits; j += 1) {
      row.push(0);
    }
    sums.push(row);
  }

  for (i = 0; i < data.length; i += 1) {
    // unput rows are a csv formatted as [user_id, cohort, irr);
    row = data[i].split(',');
    cohort = parseInt(row[1], 10);
    irr = row[2];
    sums[cohort][0] += 1;

    if (irr.length !== params.num_bloombits) {
      throw new Error("Expected " + params.num_bloombits + " bits, but got " +
                      irr.length);
    }
    for (j = 0; j < irr.length; j += 1) {
      bit_num = params.num_bloombits - j;
      if (irr[j] === '1') {
        sums[cohort][bit_num] += 1;
      }
    }
  }

  return sums.map(function (array) {
    return array.join(',');
  });
};

exports.update_rappor_sums = update_rappor_sums;
exports.sum_bits = sum_bits;
