const EXPECTED_VALIDATOR_TEST_COUNT = 292;
const VALIDATOR_TEST_SHARD_COUNT = 4;

function parseValidatorTestShard(value) {
  if (value == null || value === '') return { index: 0, total: 1 };

  const match = /^([1-9][0-9]*)\/([1-9][0-9]*)$/.exec(value);
  if (!match) {
    throw new Error(
      'VALIDATOR_TEST_SHARD must use the one-based "index/total" format'
    );
  }

  const index = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(total) || index > total) {
    throw new Error('VALIDATOR_TEST_SHARD index must not exceed its total');
  }
  if (total !== VALIDATOR_TEST_SHARD_COUNT) {
    throw new Error(
      `VALIDATOR_TEST_SHARD must use exactly ${VALIDATOR_TEST_SHARD_COUNT} shards`
    );
  }

  return { index: index - 1, total };
}

function expectedTestsForShard(index) {
  return Math.ceil(
    (EXPECTED_VALIDATOR_TEST_COUNT - (index - 1)) /
      VALIDATOR_TEST_SHARD_COUNT
  );
}

module.exports = {
  EXPECTED_VALIDATOR_TEST_COUNT,
  VALIDATOR_TEST_SHARD_COUNT,
  expectedTestsForShard,
  parseValidatorTestShard
};
