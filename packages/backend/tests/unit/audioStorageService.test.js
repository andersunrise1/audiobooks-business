import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  isS3Configured,
  isAcceptedAudioType,
  uploadAudioFile,
} from '../../src/services/audioStorageService.js';
import { s3Client } from '../../src/config/s3.js';

function withEnv(vars, fn) {
  const originals = {};
  for (const key of Object.keys(vars)) {
    originals[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(originals)) {
        if (originals[key] === undefined) delete process.env[key];
        else process.env[key] = originals[key];
      }
    });
}

describe('audioStorageService.isS3Configured', () => {
  test('is false when any required env var is missing', async () => {
    await withEnv(
      {
        AWS_ACCESS_KEY_ID: undefined,
        AWS_SECRET_ACCESS_KEY: 'secret',
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'bucket',
      },
      () => {
        assert.equal(isS3Configured(), false);
      },
    );
  });

  test('is true when every required env var is set', async () => {
    await withEnv(
      {
        AWS_ACCESS_KEY_ID: 'key',
        AWS_SECRET_ACCESS_KEY: 'secret',
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'bucket',
      },
      () => {
        assert.equal(isS3Configured(), true);
      },
    );
  });
});

describe('audioStorageService.isAcceptedAudioType', () => {
  test('accepts common audio mime types', () => {
    assert.equal(isAcceptedAudioType('audio/mpeg'), true);
    assert.equal(isAcceptedAudioType('audio/wav'), true);
  });

  test('rejects non-audio mime types', () => {
    assert.equal(isAcceptedAudioType('image/png'), false);
    assert.equal(isAcceptedAudioType('application/pdf'), false);
  });
});

describe('audioStorageService.uploadAudioFile', () => {
  test('uploads to S3 and returns the public URL', async () => {
    const sendMock = mock.method(s3Client, 'send', async () => ({}));

    try {
      await withEnv({ AWS_S3_BUCKET: 'techspeak-audio', AWS_REGION: 'us-east-1' }, async () => {
        const url = await uploadAudioFile(Buffer.from('fake audio'), 'audio/mpeg');

        assert.equal(sendMock.mock.calls.length, 1);
        const command = sendMock.mock.calls[0].arguments[0];
        assert.equal(command.input.Bucket, 'techspeak-audio');
        assert.equal(command.input.ContentType, 'audio/mpeg');
        assert.match(command.input.Key, /^audiobooks\//);

        assert.match(
          url,
          /^https:\/\/techspeak-audio\.s3\.us-east-1\.amazonaws\.com\/audiobooks\//,
        );
      });
    } finally {
      sendMock.mock.restore();
    }
  });
});
