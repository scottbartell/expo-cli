import {
  convertCertificateToCertificatePEM,
  convertKeyPairToPEM,
  generateKeyPair,
  generateSelfSignedCodeSigningCertificate,
} from '@expo/code-signing-certificates';
import { getConfig } from '@expo/config';
import { vol } from 'memfs';

import { actionAsync as configureCodeSigningAsync } from '../configureCodeSigningAsync';

jest.mock('fs');

describe('codesigning:configure', () => {
  afterEach(() => {
    vol.reset();
  });

  it('configures a project with a certificate', async () => {
    const projectRoot = '/wat';

    const keyPair = generateKeyPair();
    const validityNotBefore = new Date();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotBefore,
      validityNotAfter,
      commonName: 'hello',
    });

    const keyPairPEM = convertKeyPairToPEM(keyPair);
    const certificatePEM = convertCertificateToCertificatePEM(certificate);

    const expoPackageJson = JSON.stringify({
      name: 'expo',
      version: '40.0.0',
    });

    vol.fromJSON(
      {
        'package.json': JSON.stringify({ dependencies: { expo: '40.0.0' } }),
        'app.json': JSON.stringify({ name: 'test', slug: 'wat' }),
        'keys/certificate.pem': certificatePEM,
        'keys/private-key.pem': keyPairPEM.privateKeyPEM,
        'keys/public-key.pem': keyPairPEM.publicKeyPEM,
        'node_modules/expo/package.json': expoPackageJson,
      },
      projectRoot
    );

    const configBefore = getConfig(projectRoot);
    expect(configBefore.exp.updates?.codeSigningCertificate).toBeUndefined();

    await configureCodeSigningAsync(projectRoot, { input: 'keys' });

    const config = getConfig(projectRoot);
    expect(config.exp.updates.codeSigningCertificate).toEqual('./keys/certificate.pem');
  });

  it('validates the certificate', async () => {
    const projectRoot = '/wat';

    const keyPair = generateKeyPair();
    const validityNotBefore = new Date();
    const validityNotAfter = new Date();
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotBefore,
      validityNotAfter,
      commonName: 'hello',
    });

    const keyPairPEM = convertKeyPairToPEM(keyPair);
    const certificatePEM = convertCertificateToCertificatePEM(certificate);

    const expoPackageJson = JSON.stringify({
      name: 'expo',
      version: '40.0.0',
    });

    vol.fromJSON(
      {
        'package.json': JSON.stringify({ dependencies: { expo: '40.0.0' } }),
        'app.json': JSON.stringify({ name: 'test', slug: 'wat' }),
        'keys/certificate.pem': certificatePEM,
        'keys/private-key.pem': keyPairPEM.privateKeyPEM,
        'keys/public-key.pem': keyPairPEM.publicKeyPEM,
        'node_modules/expo/package.json': expoPackageJson,
      },
      projectRoot
    );

    const configBefore = getConfig(projectRoot);
    expect(configBefore.exp.updates?.codeSigningCertificate).toBeUndefined();

    await expect(configureCodeSigningAsync(projectRoot, { input: 'keys' })).rejects.toThrow(
      'Certificate validity expired'
    );

    const config = getConfig(projectRoot);
    expect(config.exp.updates?.codeSigningCertificate).toBeUndefined();
  });
});
