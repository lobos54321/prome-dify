declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        credits: number;
      };
      apiKey?: {
        id: string;
        key: string;
        name: string;
        userId: string | null;
      };
    }
  }
}

export {};