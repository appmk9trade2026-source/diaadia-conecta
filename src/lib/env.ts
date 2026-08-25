const requiredPublicEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export type PublicEnvKey = (typeof requiredPublicEnv)[number];

export function getPublicEnv(key: PublicEnvKey): string {
  const value = import.meta.env[key];

  if (!value) {
    throw new Error(`Missing required public environment variable: ${key}`);
  }

  return value;
}
