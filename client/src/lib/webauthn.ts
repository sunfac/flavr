// WebAuthn utility functions for Face ID and biometric authentication

export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
  type: 'public-key';
}

export interface BiometricAuthOptions {
  challenge: Uint8Array;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: Uint8Array;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  authenticatorSelection: {
    authenticatorAttachment: 'platform';
    userVerification: 'required';
    requireResidentKey: false;
  };
  timeout: number;
  attestation: 'direct';
}

// Check if WebAuthn is supported
export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && navigator.credentials.create);
}

// Check if platform authenticator (Face ID/Touch ID) is available
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  
  try {
    // Enhanced detection for iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    // For iOS devices, assume Face ID/Touch ID is available if WebAuthn is supported
    if (isIOS) {
      console.log('iOS device detected - Face ID/Touch ID likely available');
      return true;
    }
    
    // For other platforms, use the standard detection
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    console.log('Platform authenticator available:', available);
    return available;
  } catch (error) {
    console.warn('Failed to check platform authenticator availability:', error);
    
    // Fallback: if we're on a modern device, assume it's available
    const isModernDevice = /iPhone|iPad|Android|Windows/.test(navigator.userAgent);
    return isModernDevice;
  }
}

// Create a new WebAuthn credential (registration)
export async function createWebAuthnCredential(options: BiometricAuthOptions): Promise<WebAuthnCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device');
  }

  try {
    const credential = await navigator.credentials.create({
      publicKey: options
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to create credential');
    }

    return {
      id: credential.id,
      rawId: credential.rawId,
      response: credential.response,
      type: credential.type as 'public-key'
    };
  } catch (error: any) {
    console.error('WebAuthn credential creation failed:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or not allowed');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Biometric authentication is not supported on this device');
    } else if (error.name === 'SecurityError') {
      throw new Error('Security error during biometric authentication');
    }
    
    throw new Error('Failed to set up biometric authentication');
  }
}

// Get existing WebAuthn credential (authentication)
export async function getWebAuthnCredential(challenge: Uint8Array, allowCredentials?: Array<{ id: ArrayBuffer; type: 'public-key' }>): Promise<WebAuthnCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device');
  }

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: 'required',
        timeout: 60000
      }
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to authenticate with biometrics');
    }

    return {
      id: credential.id,
      rawId: credential.rawId,
      response: credential.response,
      type: credential.type as 'public-key'
    };
  } catch (error: any) {
    console.error('WebAuthn authentication failed:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Biometric authentication is not supported');
    }
    
    throw new Error('Biometric authentication failed');
  }
}

// Convert ArrayBuffer to Base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate random challenge
export function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Convert string to Uint8Array
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}