declare module 'express-http-proxy' {
  import { Request, Response, NextFunction } from 'express';

  function proxy(url: string, options?: any): (req: Request, res: Response, next: NextFunction) => void;
  
  export default proxy;
}
