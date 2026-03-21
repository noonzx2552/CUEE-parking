export {}

declare global {
  interface Window {
    liff: {
      init(o: object): Promise<void>
      isLoggedIn(): boolean
      getProfile(): Promise<{ userId: string; displayName: string; pictureUrl?: string }>
      login(o?: object): void
      logout(): void
    }
    QRCode: new (el: HTMLElement, opts: object) => void
    APP_CONFIG?: { LINE_LIFF_ID?: string }
  }
}
