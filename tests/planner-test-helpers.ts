import { POST as login } from "../src/app/api/auth/login/route";
export async function plannerCookie(): Promise<string> {
  const response = await login(
    new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "aarav@example.com",
        password: process.env.MOCK_USER_PASSWORD,
      }),
    }),
  );
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}
