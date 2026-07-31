const {
  verifyValidatorTestShard,
} = require('./validate-site-tests/support');

require('./validate-site-tests/foundation');
require('./validate-site-tests/stats');
require('./validate-site-tests/assets');
require('./validate-site-tests/structured-data');

verifyValidatorTestShard();
