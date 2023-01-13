export async function captcha(timeoutMillis: number): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve('123'), timeoutMillis))
}
