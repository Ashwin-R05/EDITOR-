import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerParticipantSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
    participantId: z.ZodString;
    college: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
    participantId: string;
    college?: string | undefined;
    department?: string | undefined;
    year?: number | undefined;
    phone?: string | undefined;
}, {
    email: string;
    password: string;
    displayName: string;
    participantId: string;
    college?: string | undefined;
    department?: string | undefined;
    year?: number | undefined;
    phone?: string | undefined;
}>;
export declare function login(req: AuthRequest, res: Response): Promise<void>;
export declare function getMe(req: AuthRequest, res: Response): Promise<void>;
export declare function registerParticipant(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=authController.d.ts.map