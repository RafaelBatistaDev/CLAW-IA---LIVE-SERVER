declare module 'express-http-proxy' {
  import { Request, Response, NextFunction } from 'express';

  interface ProxyOptions {
    filter?: (req: Request, res: Response) => boolean | Promise<boolean>;
    proxyReqPathResolver?: (req: Request) => string | Promise<string>;
    proxyReqOptDecorator?: (proxyReqOpts: any, srcReq: Request) => any | Promise<any>;
    userResDecorator?: (proxyRes: any, proxyResData: any, userReq: Request, userRes: Response) => any | Promise<any>;
    proxyErrorHandler?: (err: Error, res: Response, next: NextFunction) => void;
    timeout?: number;
    limit?: string;
    https?: boolean;
    preserveHostHdr?: boolean;
    parseReqBody?: boolean;
    memoizeHost?: boolean;
  }

  function proxy(url: string, options?: ProxyOptions): (req: Request, res: Response, next: NextFunction) => void;

  export default proxy;
}