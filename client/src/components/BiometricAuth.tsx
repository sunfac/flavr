import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Fingerprint, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  isPlatformAuthenticatorAvailable, 
  createWebAuthnCredential, 
  getWebAuthnCredential,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from "@/lib/webauthn";

interface BiometricAuthProps {
  mode: 'register' | 'authenticate';
  email?: string;
  onSuccess?: (user?: any) => void;
  onError?: (error: string) => void;
}

export default function BiometricAuth({ mode, email, onSuccess, onError }: BiometricAuthProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
    if (mode === 'authenticate' && email) {
      checkBiometricStatus();
    }
  }, [mode, email]);

  const checkBiometricSupport = async () => {
    try {
      const supported = await isPlatformAuthenticatorAvailable();
      setIsSupported(supported);
    } catch (error) {
      setIsSupported(false);
    }
  };

  const checkBiometricStatus = async () => {
    if (!email) return;
    
    try {
      const response = await fetch(`/api/biometric/status/${encodeURIComponent(email)}`);
      const data = await response.json();
      setHasBiometric(data.hasBiometric);
    } catch (error) {
      console.error('Failed to check biometric status:', error);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Biometric authentication is not available on this device.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Start registration process
      const beginResponse = await fetch('/api/biometric/register/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!beginResponse.ok) {
        throw new Error('Failed to start biometric registration');
      }

      const { challengeId, options } = await beginResponse.json();

      // Convert challenge array to Uint8Array
      options.challenge = new Uint8Array(options.challenge);
      options.user.id = new Uint8Array(options.user.id);

      // Create credential
      const credential = await createWebAuthnCredential(options);

      // Complete registration
      const completeResponse = await fetch('/api/biometric/register/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId,
          credential: {
            id: credential.id,
            rawId: arrayBufferToBase64(credential.rawId),
            response: {
              clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
              attestationObject: arrayBufferToBase64((credential.response as AuthenticatorAttestationResponse).attestationObject),
            },
            type: credential.type,
          },
        }),
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete biometric registration');
      }

      toast({
        title: "Face ID Enabled",
        description: "You can now use Face ID to sign in to your account.",
      });

      onSuccess?.();

    } catch (error: any) {
      console.error('Biometric registration failed:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to set up biometric authentication.",
        variant: "destructive",
      });
      onError?.(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticateBiometric = async () => {
    if (!email || !isSupported) {
      toast({
        title: "Cannot Authenticate",
        description: "Email is required and biometric authentication must be supported.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Start authentication process
      const beginResponse = await fetch('/api/biometric/authenticate/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!beginResponse.ok) {
        throw new Error('Failed to start biometric authentication');
      }

      const { challengeId, options } = await beginResponse.json();

      // Convert arrays to proper types
      options.challenge = new Uint8Array(options.challenge);
      if (options.allowCredentials) {
        options.allowCredentials.forEach((cred: any) => {
          cred.id = new Uint8Array(cred.id);
        });
      }

      // Get credential
      const credential = await getWebAuthnCredential(options.challenge, options.allowCredentials);

      // Complete authentication
      const completeResponse = await fetch('/api/biometric/authenticate/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId,
          credential: {
            id: credential.id,
            rawId: arrayBufferToBase64(credential.rawId),
            response: {
              clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
              authenticatorData: arrayBufferToBase64((credential.response as AuthenticatorAssertionResponse).authenticatorData),
              signature: arrayBufferToBase64((credential.response as AuthenticatorAssertionResponse).signature),
              userHandle: (credential.response as AuthenticatorAssertionResponse).userHandle ? 
                arrayBufferToBase64((credential.response as AuthenticatorAssertionResponse).userHandle!) : null,
            },
            type: credential.type,
          },
        }),
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete biometric authentication');
      }

      const result = await completeResponse.json();

      toast({
        title: "Welcome Back!",
        description: "Successfully signed in with Face ID.",
      });

      onSuccess?.(result.user);

    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with biometrics.",
        variant: "destructive",
      });
      onError?.(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSupported === null) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isSupported) {
    return (
      <Card className="border-gray-600">
        <CardContent className="p-4 text-center">
          <X className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Biometric authentication is not available on this device.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (mode === 'authenticate' && !hasBiometric) {
    return null; // Don't show biometric option if user hasn't set it up
  }

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-orange-500" />
          {mode === 'register' ? 'Enable Face ID' : 'Sign in with Face ID'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-orange-500/10 rounded-full flex items-center justify-center">
            <Fingerprint className="w-8 h-8 text-orange-500" />
          </div>
          
          <p className="text-sm text-gray-600">
            {mode === 'register' 
              ? 'Use Face ID or Touch ID for quick and secure access to your account.'
              : 'Use your biometric authentication to sign in quickly and securely.'
            }
          </p>

          <Button
            onClick={mode === 'register' ? handleRegisterBiometric : handleAuthenticateBiometric}
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'register' ? 'Setting up...' : 'Authenticating...'}
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4 mr-2" />
                {mode === 'register' ? 'Enable Face ID' : 'Use Face ID'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}