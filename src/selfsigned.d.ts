declare module 'selfsigned' {
  export function generate(
    attrs?: any[],
    options?: {
      keySize?: number;
      days?: number;
      algorithm?: string;
      extensions?: any[];
      pkcs7?: boolean;
      clientCertificates?: boolean;
      semiStatic?: boolean;
    },
    callback?: (err: Error | null, pem: { private: string; public: string; cert: string }) => void
  ): { private: string; public: string; cert: string };
}
