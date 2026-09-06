import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'dg_admin_session';

/**
 * Retrieve stable JWT secret.
 * In production, ADMIN_JWT_SECRET environment variable is strictly required.
 */
function getJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL CONFIG ERROR: ADMIN_JWT_SECRET environment variable is missing or too short in production. Please set ADMIN_JWT_SECRET (min 16 chars) in Vercel project settings.'
    );
  }

  // Development-only stable fallback (strictly disabled in production)
  return 'dev-local-only-dg-wholesale-secret-key-do-not-use-in-production';
}

const SESSION_DURATION_DAYS = 7;

export interface AdminSessionPayload {
  userId: number | string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare plain text password with stored hash
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false;
  try {
    return await bcrypt.compare(plainText, hash);
  } catch (err) {
    return false;
  }
}

/**
 * Generate a signed JWT token for admin session
 */
export function signAdminToken(payload: Omit<AdminSessionPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: `${SESSION_DURATION_DAYS}d`,
  });
}

/**
 * Verify JWT token and return session payload
 */
export function verifyAdminToken(token: string): AdminSessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AdminSessionPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Verify Admin credentials against environment variables or static admin credentials
 */
export async function verifyAdminCredentials(username: string, plainPassword: string): Promise<AdminSessionPayload | null> {
  const cleanUsername = username.trim();
  if (!cleanUsername || !plainPassword) return null;

  const envAdminUser = process.env.ADMIN_USER || 'Reginald';
  const envAdminPass = process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '12481248';

  if (
    cleanUsername.toLowerCase() === envAdminUser.toLowerCase() &&
    plainPassword === envAdminPass
  ) {
    return {
      userId: 1,
      username: envAdminUser,
      role: 'admin',
    };
  }

  return null;
}

/**
 * Get current admin session from server cookies (for Server Components / Route Handlers)
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;

    return verifyAdminToken(token);
  } catch (e) {
    return null;
  }
}

/**
 * Extract admin session from a NextRequest object
 */
export function getAdminSessionFromRequest(request: NextRequest): AdminSessionPayload | null {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    // Check Authorization Bearer header as fallback
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return verifyAdminToken(authHeader.substring(7));
    }
    return null;
  }
  return verifyAdminToken(token);
}

/**
 * Set the admin session cookie in a NextResponse
 */
export function setAdminSessionCookie(response: NextResponse, payload: Omit<AdminSessionPayload, 'iat' | 'exp'>): NextResponse {
  const token = signAdminToken(payload);
  const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60; // 7 days in seconds

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAge,
  });

  return response;
}

/**
 * Clear the admin session cookie from a NextResponse
 */
export function clearAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
