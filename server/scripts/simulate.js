const crypto = require('crypto');
const fs = require('fs');
const { db } = require('../db/index');
const { sealBallot } = require('../../crypto-engine/envelope'); // wait, sealBallot is in client/src/crypto/seal.js!
