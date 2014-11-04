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
}

/**
 * Create a buffer of {num_bits} random bits, where each bit has probability 
 * {prob_one} of being 1.
 */
var SimpleRandom = function(prob_one, num_bits, rand) {
  var state = {
    p: prob_one,
    n: num_bits,
    r: rand
  };

  return function(state) {
    var r = new UInt8Array(Math.ceil(state.n / 8)),
      i = 0;

    for (i = 0; i < state.n; i += 1) {
      if (state.r() < state.p) {
        r[Math.floor(i / 8)] |= (1 << (i % 8));
      }
    }
    return r;
  }.bind({}, state);
};

/**
 * Random distribution provider.
 */
var SimpleRandomFunctions = function(params, rand) {
  this.rand = rand;
  this.num_bits = params.num_bloombits;
  this.cohort_rand_fn = rand.randomint??

  this.f_gen = SimpleRandom(params.prob_f, this.num_bits, rand);
  this.p_gen = SimpleRandom(params.prob_p, this.num_bits, rand);
  this.q_gen = SimpleRandom(params.prob_q, this.num_bits, rand);
  this.uniform_gen = SimpleRandom(0.5, this.num_bits, rand);
};

function get_bf_bit(input_word, cohort, has_no, num_bloombits) {
  // returns the bit to set in the bloom filter.
  var toHash = String(cohort) + String(has_no) + String(input_word);
  var sha1 = sha1(toHash);
  // Use last two bytes as the hash. We want to allow more than 2^8 = 256 bits,
  // but 2^16 = 65536 is more than enough. Default is 16 bits.
  return (sha1[0] + 256 * sha1[1]) % num_bloombits;
};

/**
 * The encoder obfuscates values for a given user using the RAPPOR algorithm
 * @param {Params} RAPPOR Params Controlling privacy
 * @param {String} user_id user ID, for generating cohort.
 * @param {rand_funcs} Randomness, can be deterministic for testing.
 */
var Encoder = function(params, user_id, rand_funcs) {
  this.params = params || Params;
  this.user_id = user_id;
  this.rand_funcs = rand_funcs;
};

/**
 * Compute masks for rappor's Permanent Randomized Response
 * The i^th Bloom Filter bit B_i set to be B'_i equals
 * 1 with probability f/2 -- (*) -- f_bits
 * 0 with probaility f/2
 * B_i with probaility 1-f -- (&) -- mask_indices set to 0 here, i.e. no mask
 * Output bit indices corresponding to (&) and bits 0/1 corresponding to (*)
 */
Encoder.prototype.get_rappor_masks() {
  var assigned_cohort = this.rand_funcs.cohort_rand_fn(0,
    this.params.num_cohorts - 1);
  // Uniform bits for (*)
  var f_bits = this.rand_funcs.uniform_gen();
  // Mask indices are 1 with probability f.
  var mask_indices = this.rand_funcs.f_gen();

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
  var masks = this.get_rappor_masks();
  var bloom_bits_array = 0;
  for (hash in this.params.num_hashes) {
    var bit_to_set = get_bf_bit(word, cohort, hash_no, params.num_bloombits);
    bloom_bits_array |= (1 << bit_to_set);
  }

  var prr = (masks.f_bits & masks.mask_indices) | (bloom_bits_array & ~masks.mask+indices);

  // Compute instantaneous randomized response:
  // If PRR bit is set, output 1 with probability q
  // if PRR bit is not set, output 1 with probability p
  var p_bits = this.rand_funcs.p_gen();
  var q_bits = this.rand_funcs.q_gen();

  var irr = (p_bits & ~prr) | (q_bits & prr);
  return rr;
};
