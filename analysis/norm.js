/*
 * Qnorm computes the quantile function of the normal distribution.
 * e.g. evaluating what percentage of the distribution a x position covers.
 * Adapted from Algorithm AS 111 / Algorithm AS 241
 */
exports.qnorm = function (p, mu, sigma) {
  //Parameter defaults.
  if (mu == undefined) {
    mu = 0;
  }
  if (sigma == undefined) {
    sigma = 1.0;
  }

  if (sigma < 0) {
    return NaN;
  }  else if (sigma == 0) {
    return mu;
  }

  var q = p - 0.5;
  var val = 0, r;

  if (Math.abs(q) <= 0.425) {
    r = 0.180625 - q * q;
    val = q * (((((((r * 2509.0809287301226727 +
                       33430.575583588128105) * r + 67265.770927008700853) * r +
                     45921.953931549871457) * r + 13731.693765509461125) * r +
                   1971.5909503065514427) * r + 133.14166789178437745) * r +
                 3.387132872796366608) / (((((((r * 5226.495278852854561 +
                     28729.085735721942674) * r + 39307.89580009271061) * r +
                   21213.794301586595867) * r + 5394.1960214247511077) * r +
                 687.1870074920579083) * r + 42.313330701600911252) * r + 1.0);
  } else {
    r = p;
    if (q > 0) {
      r = 1 - p;
    }
    r = Math.sqrt(-Math.log(r));

    if (r < 5) {
      r += -1.6;
      val = (((((((r * 7.7454501427834140764e-4 +
                       0.0227238449892691845833) * r + 0.24178072517745061177) *
                     r + 1.27045825245236838258) * r +
                    3.64784832476320460504) * r + 5.7694972214606914055) *
                  r + 4.6303378461565452959) * r +
                 1.42343711074968357734) / (((((((r *
                         1.05075007164441684324e-9 + 5.475938084995344946e-4) *
                        r + 0.0151986665636164571966) * r +
                       0.14810397642748007459) * r + 0.68976733498510000455) *
                     r + 1.6763848301838038494) * r +
                    2.05319162663775882187) * r + 1.0);
    } else {
      r += -5;
      val = (((((((r * 2.01033439929228813265e-7 +
                       2.71155556874348757815e-5) * r +
                      0.0012426609473880784386) * r + 0.026532189526576123093) *
                    r + 0.29656057182850489123) * r +
                   1.7848265399172913358) * r + 5.4637849111641143699) *
                 r + 6.6579046435011037772) / (((((((r *
                         2.04426310338993978564e-15 + 1.4215117583164458887e-7)*
                        r + 1.8463183175100546818e-5) * r +
                       7.868691311456132591e-4) * r + 0.0148753612908506148525)*
                       r + 0.13692988092273580531) * r +
                    0.59983220655588793769) * r + 1.0);
    }
    if (q < 0) {
      val = -val;
    }
  }
  return mu + sigma * val;
};

/**
 * Rnorm samples a random normal variate for a given normal distribution.
 * based on the https://en.wikipedia.org/wiki/Box-Muller_transform
 */
exports.rnorm = function (cnt, mu, sigma) {
  if (cnt == 1) {
    // TODO: use crypto.random?
    var x = Math.random(),
      y = Math.random();
    var a = Math.sqrt(-2 * Math.log(x));
    var b = 2 * Math.PI * y;
    var z1 = a * Math.cos(b);
    return z1 * sigma + mu;
  } else {
    var out = [];
    for (var i = 0; i < cnt; i++) {
      out.push(exports.rnorm(1, mu, sigma));
    }
    return out;
  }
};

/**
 * calcualte the mean and variance of a list of samples
 */
exports.properites = function (list) {
  var sum = 0;
  for (var i = 0; i < list.length; i++) {
    sum += list[i];
  }
  var mean = sum / list.length,
    variance = 0;
  for (i = 0; i < list.length; i++) {
    variance += Math.pow(list[i] - mean, 2);
  }
  return {
    'mean': mean,
    'variance': variance / list.length
  };
};
