/*jslint bitwise: true, node: true */
/*globals Uint8Array,DataView */

/**
 * This code attempts to be a functionally equivalent javascript translation of
 * The python implementation of RAPPOR at https://github.com/google/rappor.
 */

/**
 * RAPPOR encoding parameters.
 * These affect privacy / anonymity. See paper for details.
 */
var Params = {
  num_bloombits: 16,  // Number of bloom filter bits (k)
  num_hashes: 2,      // Number of bloom filter hashes (h)
  num_cohorts: 64,    // Number of cohorts (m)
  prob_p: 0.5,
  prob_q: 0.75,
  prob_f: 0.5
};

var SecureRandom = 0;

/**
 * Create a buffer of {num_bits} random bits, where each bit has probability 
 * {prob_one} of being 1.
 */
var simpleRandom = function (prob_one, num_bits, rand) {
  'use strict';
  var state = {
    p: prob_one,
    n: num_bits,
    r: rand
  };

  return function (state) {
    var r = new Uint8Array(Math.ceil(state.n / 8)),
      i = 0;

    for (i = 0; i < state.n; i += 1) {
      if (state.r.random() < state.p) {
        r[Math.floor(i / 8)] |= (1 << (i % 8));
      }
    }
    return r.buffer;
  }.bind({}, state);
};

/**
 * Random distribution provider.
 */
var SimpleRandomFunctions = function (params, rand) {
  'use strict';
  
  this.rand = rand || new SecureRandom();
  this.num_bits = params.num_bloombits;
  this.cohort_rand_fn = this.rand.randint.bind(this.rand);

  this.f_gen = simpleRandom(params.prob_f, this.num_bits, rand);
  this.p_gen = simpleRandom(params.prob_p, this.num_bits, rand);
  this.q_gen = simpleRandom(params.prob_q, this.num_bits, rand);
  this.uniform_gen = simpleRandom(0.5, this.num_bits, rand);
};

function get_bf_bit(input_word, cohort, hash_no, num_bloombits) {
  'use strict';

  // returns the bit to set in the bloom filter.
  var toHash = String(cohort) + String(hash_no) + String(input_word),
    sha1 = require('sha-1')(toHash),
    a = sha1.substr(0, 2),
    b = sha1.substr(2, 2);
  // Use last two bytes as the hash. We want to allow more than 2^8 = 256 bits,
  // but 2^16 = 65536 is more than enough. Default is 16 bits.
  return parseInt("0x" + b + a, 16) % num_bloombits;
}

/**
 * The encoder obfuscates values for a given user using the RAPPOR algorithm
 * @param {Params} RAPPOR Params Controlling privacy
 * @param {String} user_id user ID, for generating cohort.
 * @param {rand_funcs} Randomness, can be deterministic for testing.
 */
var Encoder = function (params, user_id, rand_funcs) {
  'use strict';
  this.params = params || Params;
  this.user_id = user_id;
  this.rand_funcs = rand_funcs || new SimpleRandomFunctions(this.params);
};

/**
 * Compute masks for rappor's Permanent Randomized Response
 * The i^th Bloom Filter bit B_i set to be B'_i equals
 * 1 with probability f/2 -- (*) -- f_bits
 * 0 with probaility f/2
 * B_i with probaility 1-f -- (&) -- mask_indices set to 0 here, i.e. no mask
 * Output bit indices corresponding to (&) and bits 0/1 corresponding to (*)
 */
Encoder.prototype.get_rappor_masks = function (word) {
  'use strict';
  var assigned_cohort,
    f_bits,
    mask_indices,
    stored_state;
    

  if (this.params.flag_oneprr) {
    stored_state = this.rand_funcs.rand.getstate();
    this.rand_funcs.rand.seed(this.user_id + word);
  }

  assigned_cohort = this.rand_funcs.cohort_rand_fn(0,
    this.params.num_cohorts - 1);
  // Uniform bits for (*)
  f_bits = this.rand_funcs.uniform_gen();
  // Mask indices are 1 with probability f.
  mask_indices = this.rand_funcs.f_gen();

  if (this.params.flag_oneprr) {
    this.rand_funcs.rand.setstate(stored_state);
  }

  return {
    assigned_cohort: assigned_cohort,
    f_bits: f_bits,
    mask_indices: mask_indices
  };
};

/**
 * Computer rappor (Instantaneous Randomized Response).
 */
Encoder.prototype.encode = function (word) {
  'use strict';
  var bitwise = require('./bufferUtil'),
    masks = this.get_rappor_masks(word),
    bloom_bits_array = new Uint8Array(Math.ceil(this.params.num_bloombits / 8)),
    i,
    bit_to_set,
    prr,
    p_bits,
    q_bits,
    irr;

  for (i = 0; i < this.params.num_hashes; i += 1) {
    bit_to_set = get_bf_bit(word, masks.assigned_cohort, i,
                            this.params.num_bloombits);
    bloom_bits_array[Math.floor(bit_to_set / 8)] |= (1 << (bit_to_set % 8));
  }

  prr = bitwise.or(
    bitwise.and(masks.f_bits, masks.mask_indices),
    bitwise.and(bloom_bits_array.buffer, bitwise.not(masks.mask_indices))
  );

  // Compute instantaneous randomized response:
  // If PRR bit is set, output 1 with probability q
  // if PRR bit is not set, output 1 with probability p
  p_bits = this.rand_funcs.p_gen();
  q_bits = this.rand_funcs.q_gen();

  irr = bitwise.or(
    bitwise.and(p_bits, bitwise.not(prr)),
    bitwise.and(q_bits, prr)
  );

  return {
    cohort: masks.assigned_cohort,
    irr: irr
  };
};

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

exports.Encoder = Encoder;
exports.Params = Params;
exports.SimpleRandomFunctions = SimpleRandomFunctions;
exports.get_bf_bit = get_bf_bit;
exports.update_rappor_sums = update_rappor_sums;
