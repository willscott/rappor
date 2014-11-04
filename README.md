RAPPOR
======

[![Build Status](https://travis-ci.org/willscott/rappor.svg?branch=master)](https://travis-ci.org/willscott/rappor)

Javascript implementation of the RAPPOR algorithm, described at https://github.com/google/rappor.

Installation
-----

```
  npm install rappor
```

Usage
-----

This is an implementation of the rappor algorithm, which allows one to infer statistics
about a population while preserving the privacy of individual users. Before using it,
you should understand what you do and do not get from this algorithm, by consulting the
[paper](http://arxiv.org/abs/1407.6981).

```javascript
var rappor = require('rappor');
var encoder = new rappor.Encoder('userId');
var output = encoder.encode(input);
```

