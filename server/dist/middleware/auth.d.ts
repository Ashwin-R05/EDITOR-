import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id: string;
    email: string;
    role: 'ADMIN' | 'PARTICIPANT';
    displayName: string;
}
export interface AuthRequest extends Request {
    user?: AuthUser;
}
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireParticipant(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map