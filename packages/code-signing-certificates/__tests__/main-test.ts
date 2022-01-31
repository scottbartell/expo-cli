import { md } from 'node-forge';

import {
  convertCertificatePEMToCertificate,
  convertCertificateToCertificatePEM,
  convertKeyPairPEMToKeyPair,
  convertKeyPairToPEM,
  generateKeyPair,
  generateSelfSignedCodeSigningCertificate,
  validateSelfSignedCertificate,
} from '../src';

describe(generateKeyPair, () => {
  it('generates a key pair', () => {
    const keyPair = generateKeyPair();
    expect(keyPair.privateKey).toBeTruthy();
    expect(keyPair.publicKey).toBeTruthy();

    const digest = md.sha256.create().update('hello');
    expect(
      keyPair.publicKey.verify(digest.digest().getBytes(), keyPair.privateKey.sign(digest))
    ).toBeTruthy();
  });
});

describe(convertKeyPairToPEM, () => {
  it('converts key pair to PEM', () => {
    const keyPair = generateKeyPair();
    const keyPairPEM = convertKeyPairToPEM(keyPair);
    expect(keyPairPEM.privateKeyPEM).toBeTruthy();
    expect(keyPairPEM.publicKeyPEM).toBeTruthy();
  });
});

describe(convertCertificateToCertificatePEM, () => {
  it('converts certificate to PEM', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'test',
    });
    expect(convertCertificateToCertificatePEM(certificate)).toBeTruthy();
  });
});

describe(convertKeyPairPEMToKeyPair, () => {
  it('converts key pair PEM to key pair', () => {
    const keyPair = generateKeyPair();
    const keyPairPEM = convertKeyPairToPEM(keyPair);
    expect(convertKeyPairPEMToKeyPair(keyPairPEM)).toBeTruthy();
  });
});

describe(convertCertificatePEMToCertificate, () => {
  it('converts certificate PEM to certificate', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'test',
    });
    expect(
      convertCertificatePEMToCertificate(convertCertificateToCertificatePEM(certificate))
    ).toBeTruthy();
  });
});

describe(generateSelfSignedCodeSigningCertificate, () => {
  it('generates certificate with correct data', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    // check self-signed
    expect(certificate.issuer.hash).toEqual(certificate.subject.hash);
    // check extensions
    expect(certificate.getExtension('keyUsage')).toMatchObject({
      critical: true,
      dataEncipherment: false,
      digitalSignature: true,
      id: '2.5.29.15',
      keyCertSign: false,
      keyEncipherment: false,
      name: 'keyUsage',
      nonRepudiation: false,
    });
    expect(certificate.getExtension('extKeyUsage')).toMatchObject({
      clientAuth: false,
      codeSigning: true,
      critical: true,
      emailProtection: false,
      id: '2.5.29.37',
      name: 'extKeyUsage',
      serverAuth: false,
      timeStamping: false,
    });
  });
});

describe(validateSelfSignedCertificate, () => {
  it('does not throw for certificate generated with generateSelfSignedCodeSigningCertificate', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    expect(() => validateSelfSignedCertificate(certificate, keyPair)).not.toThrow();
  });

  it('throws when certificate is expired', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    const validity = new Date();
    validity.setFullYear(validity.getFullYear() - 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: validity,
      commonName: 'Test',
    });
    expect(() => validateSelfSignedCertificate(certificate, keyPair)).toThrow(
      'Certificate validity expired'
    );
  });

  it('throws when missing keyUsage', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    certificate.setExtensions([
      {
        name: 'keyUsage',
        critical: true,
        keyCertSign: false,
        digitalSignature: false,
        nonRepudiation: false,
        keyEncipherment: false,
        dataEncipherment: false,
      },
    ]);
    expect(() => validateSelfSignedCertificate(certificate, keyPair)).toThrow(
      'X509v3 Key Usage: Digital Signature not present'
    );
  });

  it('throws when missing extKeyUsage', () => {
    const keyPair = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    certificate.setExtensions([
      {
        name: 'keyUsage',
        critical: true,
        keyCertSign: false,
        digitalSignature: true,
        nonRepudiation: false,
        keyEncipherment: false,
        dataEncipherment: false,
      },
      {
        name: 'extKeyUsage',
        critical: true,
        serverAuth: false,
        clientAuth: false,
        codeSigning: false,
        emailProtection: false,
        timeStamping: false,
      },
    ]);
    expect(() => validateSelfSignedCertificate(certificate, keyPair)).toThrow(
      'X509v3 Extended Key Usage: Code Signing not present'
    );
  });

  it('throws when certificate public key does not match key pair', () => {
    const keyPair = generateKeyPair();
    const keyPair2 = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    expect(() => validateSelfSignedCertificate(certificate, keyPair2)).toThrow(
      'Certificate pubic key does not match key pair public key'
    );
  });

  it('throws when private key does not match public key', () => {
    const keyPair = generateKeyPair();
    const keyPair2 = generateKeyPair();
    const validityNotAfter = new Date();
    validityNotAfter.setFullYear(validityNotAfter.getFullYear() + 1);
    const certificate = generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotAfter,
      validityNotBefore: new Date(),
      commonName: 'Test',
    });
    const keyPairManual = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair2.privateKey,
    };
    expect(() => validateSelfSignedCertificate(certificate, keyPairManual)).toThrow(
      'keyPair key mismatch'
    );
  });
});
