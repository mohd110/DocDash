import { Card, CardContent } from '@/components/ui/card'
import { Wordmark } from '@/components/layout/logo'

/** Shown instead of a blank crash when the Supabase env vars are missing. */
export function SetupRequiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <Wordmark />
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6 sm:pt-8">
            <h1 className="font-display text-2xl font-semibold text-bottle-800">
              Almost there — connect Supabase
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Create a <code className="font-mono">.env</code> file in the project root (copy{' '}
              <code className="font-mono">.env.example</code>) and add your project credentials:
            </p>
            <pre className="overflow-x-auto rounded-xl bg-bottle-800 p-4 font-mono text-xs leading-relaxed text-cream-100">
              {`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}
            </pre>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                Run <code className="font-mono">supabase/schema.sql</code> in the Supabase SQL editor.
              </li>
              <li>Create the doctor's account under Authentication → Users.</li>
              <li>
                Restart the dev server (<code className="font-mono">npm run dev</code>).
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
