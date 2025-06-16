import { LoginButton } from "./login-button";

export function LoginForm() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Welcome to GAMGUI</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Sign in with Google to access your account
        </p>
      </div>
      <div className="grid gap-6">
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Continue with
          </span>
        </div>

        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </div>
  );
}
